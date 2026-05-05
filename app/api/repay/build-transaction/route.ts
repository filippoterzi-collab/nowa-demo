import { NextRequest, NextResponse } from "next/server";
import { buildRepayTransaction } from "@/lib/repay";

// TODO: production — add rate limiting (per IP and per user address) to prevent brute-force/spam.
// TODO: production — sanitize error messages, do not leak raw err.message to the client.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, userAddress } = body;

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount >= 500
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "amount must be a finite number > 0 and < 500",
        },
        { status: 400 }
      );
    }

    if (typeof userAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "userAddress must be a string" },
        { status: 400 }
      );
    }

    const { transactionBase64, lastValidBlockHeight } =
      await buildRepayTransaction(userAddress, amount);

    return NextResponse.json({
      success: true,
      transactionBase64,
      lastValidBlockHeight,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.startsWith("INSUFFICIENT_BALANCE:")) {
      const reason = message.replace("INSUFFICIENT_BALANCE:", "");
      return NextResponse.json(
        { success: false, error: `Insufficient USDC balance: ${reason}` },
        { status: 400 }
      );
    }
    if (message.startsWith("VALIDATION:")) {
      // TODO: remove or guard with NODE_ENV check before production
      console.log(`[repay/build] validation failed: ${message}`);
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
