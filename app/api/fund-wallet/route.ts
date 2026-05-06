import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { HELIUS_DEVNET_RPC } from "@/lib/constants";

const FUND_AMOUNT_SOL = 0.1;
const MIN_BALANCE_SOL_FOR_FUNDING = 0.05;
const TREASURY_MIN_RESERVE_SOL = 1;

// Simple per-IP rate limit. Module-scoped Map persists across requests in the
// same Node process; resets on cold start. Good enough for hackathon demo.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const ipHits = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const hits = (ipHits.get(ip) ?? []).filter((t) => t > cutoff);
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return true;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Try again in an hour." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { walletAddress } = body;

    if (typeof walletAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "walletAddress must be a string" },
        { status: 400 }
      );
    }

    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(walletAddress);
    } catch {
      return NextResponse.json(
        { success: false, error: "walletAddress is not a valid Solana address" },
        { status: 400 }
      );
    }

    const secretKeyJson = process.env.TREASURY_PRIVATE_KEY;
    if (!secretKeyJson) {
      return NextResponse.json(
        { success: false, error: "Treasury not configured" },
        { status: 500 }
      );
    }
    const treasury = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(secretKeyJson))
    );

    const connection = new Connection(HELIUS_DEVNET_RPC, "confirmed");

    const userBalanceLamports = await connection.getBalance(recipientPubkey);
    if (userBalanceLamports >= MIN_BALANCE_SOL_FOR_FUNDING * LAMPORTS_PER_SOL) {
      return NextResponse.json(
        { success: false, error: "Wallet already has funds" },
        { status: 400 }
      );
    }

    const treasuryBalanceLamports = await connection.getBalance(
      treasury.publicKey
    );
    if (treasuryBalanceLamports < TREASURY_MIN_RESERVE_SOL * LAMPORTS_PER_SOL) {
      return NextResponse.json(
        { success: false, error: "Treasury low on funds. Try again later." },
        { status: 503 }
      );
    }

    const lamports = Math.round(FUND_AMOUNT_SOL * LAMPORTS_PER_SOL);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: recipientPubkey,
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [treasury],
      { commitment: "confirmed" }
    );

    return NextResponse.json({ success: true, signature });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
