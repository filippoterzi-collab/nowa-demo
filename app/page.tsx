"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useCallback, useEffect, useState } from "react";
import { getUSDCBalance } from "@/lib/usdc-balance";

type CashOutStatus = "idle" | "loading" | "success" | "error";

const CASH_OUT_AMOUNT = 5;
const BALANCE_REFETCH_DELAY_MS = 1500;

function matchSolanaError(message: string): string | null {
  const lc = message.toLowerCase();
  if (
    lc.includes("insufficient funds") ||
    lc.includes("insufficientfundsforrent")
  ) {
    return "We couldn't process your cash-out. Please try again in a moment.";
  }
  if (
    lc.includes("transaction simulation failed") ||
    lc.includes("blockhash not found")
  ) {
    return "Network is busy. Please try again.";
  }
  if (
    lc.includes("account does not exist") ||
    lc.includes("token account not found") ||
    lc.includes("could not find account")
  ) {
    return "We need to set up your account first. Please try again.";
  }
  return null;
}

function getDisplayError(rawError: unknown): string {
  if (rawError instanceof TypeError) {
    return "Connection issue. Check your internet and retry.";
  }

  if (
    typeof rawError === "object" &&
    rawError !== null &&
    "status" in rawError
  ) {
    const tagged = rawError as { status: number; message?: string };
    const text = tagged.message ?? "";

    const matched = matchSolanaError(text);
    if (matched) return matched;

    if (tagged.status >= 400 && tagged.status < 500) {
      return text || "Invalid request.";
    }
    if (tagged.status >= 500) {
      return "Something went wrong on our end. Please try again.";
    }
  }

  const message =
    rawError instanceof Error ? rawError.message : String(rawError);
  const matched = matchSolanaError(message);
  if (matched) return matched;

  return "Something went wrong. Please try again.";
}

export default function Home() {
  const { publicKey, disconnect } = useWallet();
  const { connection } = useConnection();
  const [mounted, setMounted] = useState(false);
  const [cashOutStatus, setCashOutStatus] = useState<CashOutStatus>("idle");
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [lastSolscanUrl, setLastSolscanUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!publicKey) {
      setUsdcBalance(null);
      return;
    }
    let cancelled = false;
    setUsdcBalance(null);
    getUSDCBalance(connection, publicKey)
      .then((bal) => {
        if (!cancelled) setUsdcBalance(bal);
      })
      .catch(() => {
        if (!cancelled) setUsdcBalance(0);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey, connection]);

  const handleCashOut = useCallback(async () => {
    if (!publicKey) return;
    setCashOutStatus("loading");
    setErrorMessage(null);

    let res: Response;
    try {
      res = await fetch("/api/cash-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: CASH_OUT_AMOUNT,
          recipientAddress: publicKey.toBase58(),
        }),
      });
    } catch (err) {
      setErrorMessage(getDisplayError(err));
      setCashOutStatus("error");
      return;
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch (err) {
      setErrorMessage(getDisplayError(err));
      setCashOutStatus("error");
      return;
    }

    if (!res.ok) {
      const message =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : "";
      setErrorMessage(getDisplayError({ status: res.status, message }));
      setCashOutStatus("error");
      return;
    }

    if (
      data &&
      typeof data === "object" &&
      "signature" in data &&
      "solscanUrl" in data
    ) {
      const d = data as { signature: string; solscanUrl: string };
      setLastSignature(d.signature);
      setLastSolscanUrl(d.solscanUrl);
      setCashOutStatus("success");

      window.setTimeout(() => {
        getUSDCBalance(connection, publicKey)
          .then((bal) => setUsdcBalance(bal))
          .catch(() => {
            // Keep stale balance rather than reset to skeleton on a transient RPC error.
          });
      }, BALANCE_REFETCH_DELAY_MS);
    } else {
      setErrorMessage(getDisplayError(new Error("Unexpected response")));
      setCashOutStatus("error");
    }
  }, [publicKey, connection]);

  const handleReset = useCallback(() => {
    setCashOutStatus("idle");
    setLastSignature(null);
    setLastSolscanUrl(null);
    setErrorMessage(null);
  }, []);

  const address = publicKey?.toBase58();
  const truncated = address
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {!mounted ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center">
              Connect your wallet
            </h1>
            <div className="h-12 w-44 rounded-md bg-neutral-100" />
          </>
        ) : !publicKey ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center">
              Connect your wallet
            </h1>
            <WalletMultiButton />
          </>
        ) : (
          <>
            <div className="w-full flex flex-col items-center gap-2">
              <div
                className="font-mono text-xs text-neutral-600 px-3 py-1.5 rounded-full border border-neutral-200 bg-neutral-50"
                title={address}
              >
                {truncated}
              </div>
              <div className="text-sm text-neutral-500">
                Balance:{" "}
                {usdcBalance === null ? (
                  <span className="inline-block h-4 w-20 rounded bg-neutral-100 animate-pulse align-middle" />
                ) : (
                  <span className="text-neutral-900 font-medium">
                    {usdcBalance.toFixed(2)} USDC
                  </span>
                )}
              </div>
              <button
                onClick={() => disconnect()}
                className="text-xs text-neutral-500 hover:text-neutral-700 underline underline-offset-2"
              >
                Disconnect
              </button>
            </div>

            <div className="w-full rounded-2xl border border-neutral-200 p-5 flex flex-col gap-4">
              {cashOutStatus === "success" ? (
                <>
                  <div className="text-base font-semibold text-neutral-900">
                    ✓ ${CASH_OUT_AMOUNT} USDC received
                  </div>
                  {lastSolscanUrl && (
                    <a
                      href={lastSolscanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
                    >
                      View on Solscan
                    </a>
                  )}
                  {lastSignature && (
                    <div
                      className="font-mono text-xs text-neutral-400 truncate"
                      title={lastSignature}
                    >
                      {lastSignature.slice(0, 8)}…{lastSignature.slice(-8)}
                    </div>
                  )}
                  <button
                    onClick={handleReset}
                    className="w-full h-11 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition-colors"
                  >
                    Try again
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <div className="text-base font-semibold text-neutral-900">
                      Upwork
                    </div>
                    <div className="text-sm text-neutral-500">
                      ${CASH_OUT_AMOUNT.toFixed(2)} pending
                    </div>
                  </div>
                  <button
                    onClick={handleCashOut}
                    disabled={cashOutStatus === "loading"}
                    className="w-full h-11 rounded-lg bg-black text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    {cashOutStatus === "loading" ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      `Cash out $${CASH_OUT_AMOUNT}`
                    )}
                  </button>
                  {cashOutStatus === "error" && errorMessage && (
                    <div className="text-sm text-red-600">{errorMessage}</div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
