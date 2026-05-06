"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

export function FundWalletModal({
  walletAddress,
  onDone,
}: {
  walletAddress: string;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "success") return;
    const t = window.setTimeout(onDone, 1500);
    return () => window.clearTimeout(t);
  }, [status, onDone]);

  const handleFund = async () => {
    setStatus("loading");
    setError(null);

    let res: Response;
    try {
      res = await fetch("/api/fund-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
    } catch {
      setError("Connection issue. Check your internet and retry.");
      setStatus("error");
      return;
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      setError("Unexpected response from server.");
      setStatus("error");
      return;
    }

    if (!res.ok) {
      const message =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : "Funding failed.";
      setError(message);
      setStatus("error");
      return;
    }

    setStatus("success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-[480px] rounded-2xl bg-[#F5F1E8] p-8 shadow-xl">
        <div className="flex justify-center">
          <Image
            src="/capybara-waving.png"
            alt=""
            width={120}
            height={120}
            className="w-[120px] h-auto"
            priority
          />
        </div>

        <h2 className="mt-4 text-2xl font-bold text-emerald-900 text-center">
          Last step: free demo SOL ⚡
        </h2>

        <div className="mt-3 text-sm text-gray-700 mb-6 space-y-2">
          <p>I&apos;ll send you a tiny bit of SOL for transaction fees.</p>
          <p>Don&apos;t worry about USDC — you&apos;ll borrow that from the app!</p>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <CheckCircle2 className="size-10 text-emerald-600" />
            <div className="text-base font-medium text-emerald-900">
              Done! 0.1 SOL ready ✓
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={handleFund}
              disabled={status === "loading"}
              className="w-full rounded-full bg-emerald-500 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 transition-colors flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : status === "error" ? (
                "Retry"
              ) : (
                "Get demo SOL"
              )}
            </button>
            {error && (
              <div className="mt-3 text-sm text-red-600">{error}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
