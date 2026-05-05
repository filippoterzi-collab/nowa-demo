import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  HELIUS_DEVNET_RPC,
  TREASURY_ADDRESS,
  USDC_DECIMALS,
  USDC_MINT,
} from "@/lib/constants";

export async function buildRepayTransaction(
  userAddress: string,
  amount: number
): Promise<{
  transactionBase64: string;
  lastValidBlockHeight: number;
}> {
  let userPubkey: PublicKey;
  try {
    userPubkey = new PublicKey(userAddress);
  } catch {
    throw new Error("VALIDATION:invalid_user_address");
  }

  const connection = new Connection(HELIUS_DEVNET_RPC, "confirmed");
  const userAta = await getAssociatedTokenAddress(USDC_MINT, userPubkey);
  const treasuryAta = await getAssociatedTokenAddress(
    USDC_MINT,
    TREASURY_ADDRESS
  );

  let userBalance = 0;
  try {
    const result = await connection.getTokenAccountBalance(userAta);
    userBalance = result.value.uiAmount ?? 0;
  } catch {
    throw new Error(`INSUFFICIENT_BALANCE:have $0, need $${amount}`);
  }

  if (userBalance < amount) {
    throw new Error(
      `INSUFFICIENT_BALANCE:have $${userBalance}, need $${amount}`
    );
  }

  const baseUnits = BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
  const ix = createTransferInstruction(
    userAta,
    treasuryAta,
    userPubkey,
    baseUnits
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: userPubkey,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  const transactionBase64 = Buffer.from(tx.serialize()).toString("base64");

  return { transactionBase64, lastValidBlockHeight };
}

export async function submitRepayTransaction(
  signedTransactionBase64: string,
  expectedUserAddress: string,
  expectedAmount: number,
  lastValidBlockHeight: number
): Promise<{ signature: string; solscanUrl: string }> {
  let tx: VersionedTransaction;
  try {
    const bytes = Buffer.from(signedTransactionBase64, "base64");
    tx = VersionedTransaction.deserialize(bytes);
  } catch {
    throw new Error("VALIDATION:deserialize_failed");
  }

  let expectedUserPubkey: PublicKey;
  try {
    expectedUserPubkey = new PublicKey(expectedUserAddress);
  } catch {
    throw new Error("VALIDATION:invalid_expected_user");
  }

  const feePayer = tx.message.staticAccountKeys[0];
  if (!feePayer.equals(expectedUserPubkey)) {
    throw new Error("VALIDATION:fee_payer_mismatch");
  }

  if (tx.signatures.length === 0 || tx.signatures[0].every((b) => b === 0)) {
    throw new Error("VALIDATION:signature_missing_or_empty");
  }

  const splInstructions = tx.message.compiledInstructions.filter((ci) => {
    const programId = tx.message.staticAccountKeys[ci.programIdIndex];
    return programId.equals(TOKEN_PROGRAM_ID);
  });

  if (splInstructions.length !== 1) {
    throw new Error(
      `VALIDATION:expected_1_spl_instruction_got_${splInstructions.length}`
    );
  }

  const transferIx = splInstructions[0];

  // SPL Token transfer instruction data layout:
  //   byte 0: discriminator (3 = Transfer)
  //   bytes 1-8: amount as u64 little-endian
  if (transferIx.data.length !== 9) {
    throw new Error(
      `VALIDATION:transfer_data_length_${transferIx.data.length}`
    );
  }
  if (transferIx.data[0] !== 3) {
    throw new Error(
      `VALIDATION:not_transfer_discriminator_${transferIx.data[0]}`
    );
  }

  const amountBigInt = readUInt64LE(transferIx.data.slice(1, 9));
  const expectedBaseUnits = BigInt(
    Math.round(expectedAmount * 10 ** USDC_DECIMALS)
  );
  if (amountBigInt !== expectedBaseUnits) {
    throw new Error(
      `VALIDATION:amount_mismatch_got_${amountBigInt}_expected_${expectedBaseUnits}`
    );
  }

  if (transferIx.accountKeyIndexes.length < 3) {
    throw new Error("VALIDATION:transfer_account_count");
  }
  const [sourceIdx, destIdx, authorityIdx] = transferIx.accountKeyIndexes;
  const sourceAccount = tx.message.staticAccountKeys[sourceIdx];
  const destAccount = tx.message.staticAccountKeys[destIdx];
  const authorityAccount = tx.message.staticAccountKeys[authorityIdx];

  const expectedUserAta = await getAssociatedTokenAddress(
    USDC_MINT,
    expectedUserPubkey
  );
  const expectedTreasuryAta = await getAssociatedTokenAddress(
    USDC_MINT,
    TREASURY_ADDRESS
  );

  if (!sourceAccount.equals(expectedUserAta)) {
    throw new Error("VALIDATION:source_not_user_ata");
  }
  if (!destAccount.equals(expectedTreasuryAta)) {
    throw new Error("VALIDATION:destination_not_treasury_ata");
  }
  if (!authorityAccount.equals(expectedUserPubkey)) {
    throw new Error("VALIDATION:authority_not_user");
  }

  const connection = new Connection(HELIUS_DEVNET_RPC, "confirmed");
  const rawTx = tx.serialize();
  const signature = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
  });

  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash: tx.message.recentBlockhash,
      lastValidBlockHeight,
    },
    "confirmed"
  );

  if (confirmation.value.err) {
    throw new Error(`CHAIN:${JSON.stringify(confirmation.value.err)}`);
  }

  return {
    signature,
    solscanUrl: `https://solscan.io/tx/${signature}?cluster=devnet`,
  };
}

function readUInt64LE(bytes: Uint8Array): bigint {
  let value = 0n;
  for (let i = 7; i >= 0; i--) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return value;
}
