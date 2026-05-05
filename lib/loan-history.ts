import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { TREASURY_ADDRESS, USDC_DECIMALS, USDC_MINT } from "@/lib/constants";

const HISTORY_LIMIT = 10;
const CHECK_TIMEOUT_MS = 8000;
const CHUNK_SIZE = 5;

export type ActiveLoan = {
  amount: number;
  borrowedAt: number; // unix milliseconds
  cashOutSignature: string;
  cashOutSolscanUrl: string;
};

export async function checkActiveLoan(
  userPubkey: PublicKey
): Promise<ActiveLoan | null> {
  try {
    return await Promise.race([
      runCheck(userPubkey),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), CHECK_TIMEOUT_MS)
      ),
    ]);
  } catch {
    return null;
  }
}

async function runCheck(
  userPubkey: PublicKey
): Promise<ActiveLoan | null> {
  // Read-only history query: use public devnet RPC. Helius free tier rejects
  // getParsedTransactions on this account (HTTP 413 / "Too many requests").
  // The rest of the app continues using HELIUS_DEVNET_RPC for writes,
  // confirmations, and balance reads.
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  // Reconstruct to a proper @solana/web3.js PublicKey instance. Wallet-adapter
  // may pass a Wallet Standard pubkey object that lacks .toBuffer(), which
  // getAssociatedTokenAddress requires.
  const userKey = new PublicKey(userPubkey.toBase58());

  const userAta = await getAssociatedTokenAddress(USDC_MINT, userKey);
  const treasuryAta = await getAssociatedTokenAddress(
    USDC_MINT,
    TREASURY_ADDRESS
  );

  const sigInfos = await connection.getSignaturesForAddress(
    userAta,
    { limit: HISTORY_LIMIT },
    "confirmed"
  );
  if (sigInfos.length === 0) return null;

  const signatures = sigInfos.map((s) => s.signature);
  const txs: Array<
    Awaited<ReturnType<typeof connection.getParsedTransaction>>
  > = [];
  for (let i = 0; i < signatures.length; i += CHUNK_SIZE) {
    const chunk = signatures.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map((sig) =>
        connection.getParsedTransaction(sig, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        })
      )
    );
    for (const r of results) {
      txs.push(r.status === "fulfilled" ? r.value : null);
    }
  }

  // Walk chronologically (oldest first; RPC returns newest first).
  const ordered = sigInfos
    .map((info, i) => ({ info, tx: txs[i] }))
    .reverse();

  const treasuryAtaStr = treasuryAta.toBase58();
  const userAtaStr = userAta.toBase58();

  let lastCashOut: ActiveLoan | null = null;
  let lastRepayTime: number | null = null; // unix seconds

  for (const { info, tx } of ordered) {
    if (!tx || info.blockTime == null) continue;
    if (tx.meta?.err) continue;

    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
      if (!("parsed" in ix)) continue;
      if (ix.program !== "spl-token") continue;
      const parsed = ix.parsed as { type?: string; info?: unknown };
      if (parsed.type !== "transfer") continue;

      const xferInfo = parsed.info as {
        source?: string;
        destination?: string;
        amount?: string;
      };
      const source = xferInfo.source;
      const destination = xferInfo.destination;
      const amountBaseUnits = xferInfo.amount;
      if (!source || !destination || !amountBaseUnits) continue;

      // Querying user's USDC ATA: any transfer touching that account is a
      // USDC transfer by construction (ATA is mint-specific). No additional
      // mint check needed.
      const treasuryToUser =
        source === treasuryAtaStr && destination === userAtaStr;
      const userToTreasury =
        source === userAtaStr && destination === treasuryAtaStr;

      if (!treasuryToUser && !userToTreasury) continue;

      const amountUsdc =
        Number(BigInt(amountBaseUnits)) / 10 ** USDC_DECIMALS;
      const blockTime = info.blockTime;

      if (treasuryToUser) {
        lastCashOut = {
          amount: amountUsdc,
          borrowedAt: blockTime * 1000,
          cashOutSignature: info.signature,
          cashOutSolscanUrl: `https://solscan.io/tx/${info.signature}?cluster=devnet`,
        };
      } else {
        // user → treasury repay event (lenient: amount not matched)
        lastRepayTime = blockTime;
      }
    }
  }

  if (lastCashOut) {
    const cashOutTimeSec = lastCashOut.borrowedAt / 1000;
    if (lastRepayTime === null || cashOutTimeSec > lastRepayTime) {
      return lastCashOut;
    }
  }
  return null;
}
