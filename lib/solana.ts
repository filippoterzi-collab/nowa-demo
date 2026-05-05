import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { HELIUS_DEVNET_RPC, USDC_DECIMALS, USDC_MINT } from "@/lib/constants";

export async function transferUSDC(
  amount: number,
  recipientAddress: string
): Promise<{ signature: string; solscanUrl: string }> {
  const secretKeyJson = process.env.TREASURY_PRIVATE_KEY;
  if (!secretKeyJson) {
    throw new Error("TREASURY_PRIVATE_KEY is not set in .env.local");
  }
  const treasury = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(secretKeyJson))
  );

  const connection = new Connection(HELIUS_DEVNET_RPC, "confirmed");
  const recipient = new PublicKey(recipientAddress);

  const sourceAta = await getAssociatedTokenAddress(
    USDC_MINT,
    treasury.publicKey
  );

  const destAta = await getOrCreateAssociatedTokenAccount(
    connection,
    treasury,
    USDC_MINT,
    recipient
  );

  const baseUnits = BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
  const instruction = createTransferInstruction(
    sourceAta,
    destAta.address,
    treasury.publicKey,
    baseUnits
  );

  const transaction = new Transaction().add(instruction);
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [treasury],
    { commitment: "confirmed" }
  );

  return {
    signature,
    solscanUrl: `https://solscan.io/tx/${signature}?cluster=devnet`,
  };
}
