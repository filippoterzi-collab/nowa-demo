import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { USDC_MINT } from "@/lib/constants";

export async function getUSDCBalance(
  connection: Connection,
  walletPublicKey: PublicKey
): Promise<number> {
  const ata = await getAssociatedTokenAddress(USDC_MINT, walletPublicKey);
  try {
    const result = await connection.getTokenAccountBalance(ata);
    return result.value.uiAmount ?? 0;
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.toLowerCase().includes("could not find account")
    ) {
      return 0;
    }
    throw err;
  }
}
