import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519";
import { transferUSDC } from "@/lib/solana";

// TODO: production — add rate limiting (per IP and per recipient address) to prevent brute-force replay/spam.
// TODO: production — server-side nonce store (single-use) to fully prevent replay within the 60s window.
// TODO: production — sanitize error messages, do not leak raw err.message to the client.

const MESSAGE_REGEX =
  /^NOWA cash-out request: \$(\d+(?:\.\d+)?) to ([1-9A-HJ-NP-Za-km-z]{32,44}) at (\d+)$/;
const TIMESTAMP_PAST_TOLERANCE_MS = 60_000;
const TIMESTAMP_FUTURE_TOLERANCE_MS = 5_000;

function rejectInvalidSignature(reason: string) {
  // TODO: remove or guard with NODE_ENV check before production
  console.log(`[cash-out] signature check failed: ${reason}`);
  return NextResponse.json(
    { success: false, error: "Invalid signature — request rejected" },
    { status: 401 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      amount,
      recipientAddress,
      signature: clientSignature,
      signedMessage,
    } = body;

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

    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipientAddress);
    } catch {
      return NextResponse.json(
        { success: false, error: "recipientAddress is not a valid Solana address" },
        { status: 400 }
      );
    }

    // --- Auth: signature verification ---

    if (typeof clientSignature !== "string") {
      return rejectInvalidSignature("signature missing or not a string");
    }

    if (typeof signedMessage !== "string") {
      return rejectInvalidSignature("signedMessage missing or not a string");
    }

    const match = MESSAGE_REGEX.exec(signedMessage);
    if (!match) {
      return rejectInvalidSignature(
        "signedMessage format does not match expected pattern"
      );
    }

    const [, amountStr, addrStr, tsStr] = match;
    const messageAmount = parseFloat(amountStr);
    const messageTimestamp = parseInt(tsStr, 10);

    if (messageAmount !== amount) {
      return rejectInvalidSignature(
        `amount mismatch: message=${messageAmount}, body=${amount}`
      );
    }

    if (addrStr !== recipientAddress) {
      return rejectInvalidSignature(
        "recipientAddress in message does not match body"
      );
    }

    const now = Date.now();
    if (messageTimestamp < now - TIMESTAMP_PAST_TOLERANCE_MS) {
      return rejectInvalidSignature(
        `timestamp too old: ${now - messageTimestamp}ms past`
      );
    }
    if (messageTimestamp > now + TIMESTAMP_FUTURE_TOLERANCE_MS) {
      return rejectInvalidSignature(
        `timestamp too far in future: ${messageTimestamp - now}ms ahead`
      );
    }

    // Buffer.from returns Buffer (a Uint8Array subclass), but @noble/curves can
    // be picky about subclasses — wrap in Uint8Array.from() to get a plain one.
    const signatureBytes = Uint8Array.from(
      Buffer.from(clientSignature, "base64")
    );
    if (signatureBytes.length !== 64) {
      return rejectInvalidSignature(
        `signature wrong length: got ${signatureBytes.length}, expected 64`
      );
    }

    const messageBytes = new TextEncoder().encode(signedMessage);
    const pubkeyBytes = recipientPubkey.toBytes();

    // ed25519.verify takes (signature, message, publicKey) — different from
    // tweetnacl's (message, signature, publicKey). Don't reorder.
    let verified: boolean;
    try {
      verified = ed25519.verify(signatureBytes, messageBytes, pubkeyBytes);
    } catch {
      return rejectInvalidSignature(
        "ed25519.verify threw (malformed signature/key)"
      );
    }
    if (!verified) {
      return rejectInvalidSignature("ed25519.verify returned false");
    }

    // --- All checks passed — perform the on-chain transfer ---

    const { signature: txSignature, solscanUrl } = await transferUSDC(
      amount,
      recipientAddress
    );

    return NextResponse.json({
      success: true,
      signature: txSignature,
      solscanUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
