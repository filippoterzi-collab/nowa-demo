import { NextRequest, NextResponse } from "next/server";
import { submitRepayTransaction } from "@/lib/repay";

// TODO: production — add rate limiting and idempotency keys.
// TODO: production — sanitize error messages, do not leak raw err.message to the client.

function rejectInvalidTransaction(reason: string) {
  // TODO: remove or guard with NODE_ENV check before production
  console.log(`[repay/submit] validation failed: ${reason}`);
  return NextResponse.json(
    { success: false, error: "Invalid transaction — request rejected" },
    { status: 401 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      signedTransactionBase64,
      userAddress,
      amount,
      lastValidBlockHeight,
    } = body;

    if (typeof signedTransactionBase64 !== "string") {
      return rejectInvalidTransaction(
        "signedTransactionBase64 missing or not a string"
      );
    }
    if (typeof userAddress !== "string") {
      return rejectInvalidTransaction("userAddress missing or not a string");
    }
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount >= 500
    ) {
      return rejectInvalidTransaction("amount invalid");
    }
    if (
      typeof lastValidBlockHeight !== "number" ||
      !Number.isFinite(lastValidBlockHeight)
    ) {
      return rejectInvalidTransaction(
        "lastValidBlockHeight missing or not a number"
      );
    }

    const { signature, solscanUrl } = await submitRepayTransaction(
      signedTransactionBase64,
      userAddress,
      amount,
      lastValidBlockHeight
    );

    return NextResponse.json({ success: true, signature, solscanUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.startsWith("VALIDATION:")) {
      return rejectInvalidTransaction(message);
    }
    if (message.startsWith("CHAIN:")) {
      console.log(`[repay/submit] chain error: ${message}`);
      return NextResponse.json(
        { success: false, error: message.replace("CHAIN:", "") },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
