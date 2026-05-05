// TODO: when deploying to Vercel, set these env vars in the Vercel project's settings:
//   - NEXT_PUBLIC_HELIUS_API_KEY
//   - NEXT_PUBLIC_TREASURY_ADDRESS
//   - NEXT_PUBLIC_USDC_MINT_ADDRESS  (renamed from USDC_MINT_ADDRESS in Day 2 step 3 — old configs will break the client bundle)
//   - TREASURY_PRIVATE_KEY  (server-side only, no NEXT_PUBLIC_ prefix)

import { PublicKey } from "@solana/web3.js";

const usdcMintAddress = process.env.NEXT_PUBLIC_USDC_MINT_ADDRESS;
if (!usdcMintAddress) {
  throw new Error("NEXT_PUBLIC_USDC_MINT_ADDRESS is not set in .env.local");
}

const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
if (!treasuryAddress) {
  throw new Error("NEXT_PUBLIC_TREASURY_ADDRESS is not set in .env.local");
}

const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
if (!heliusApiKey) {
  throw new Error("NEXT_PUBLIC_HELIUS_API_KEY is not set in .env.local");
}

export const USDC_MINT = new PublicKey(usdcMintAddress);
export const TREASURY_ADDRESS = new PublicKey(treasuryAddress);
export const USDC_DECIMALS = 6;
export const HELIUS_DEVNET_RPC = `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`;
