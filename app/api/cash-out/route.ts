import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { transferUSDC } from "@/lib/solana";

// TODO: production — require signed message from user wallet to prevent unauthorized treasury drains.
// TODO: production — sanitize error messages, do not leak raw err.message to the client.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, recipientAddress } = body;

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount >= 500
    ) {
      return NextResponse.json(
        { success: false, error: "amount must be a finite number > 0 and < 500" },
        { status: 400 }
      );
    }

    if (typeof recipientAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "recipientAddress must be a string" },
        { status: 400 }
      );
    }

    try {
      new PublicKey(recipientAddress);
    } catch {
      return NextResponse.json(
        { success: false, error: "recipientAddress is not a valid Solana address" },
        { status: 400 }
      );
    }

    const { signature, explorerUrl } = await transferUSDC(
      amount,
      recipientAddress
    );

    return NextResponse.json({ success: true, signature, explorerUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
