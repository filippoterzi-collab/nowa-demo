"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { getUSDCBalance } from "@/lib/usdc-balance";
import { MOCK_USER, PLATFORMS, type PlatformId } from "@/lib/mock-data";
import { PlatformPicker } from "@/components/platform-picker";
import { AnalysisScreen } from "@/components/analysis-screen";
import { ChooseAmountScreen } from "@/components/choose-amount-screen";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CashOutStatus = "idle" | "loading" | "success" | "error";
type PlatformStatus =
  | "not_selected"
  | "connecting"
  | "connected"
  | "analyzing"
  | "analysis_complete"
  | "ready";

const CASH_OUT_MIN = 10;
const CASH_OUT_MAX = MOCK_USER.maxAdvance;
const CASH_OUT_STEP = 1;
const CASH_OUT_DEFAULT = 50;
const BALANCE_REFETCH_DELAY_MS = 1500;
const OAUTH_CONNECTING_MS = 2000;
const OAUTH_SUCCESS_MS = 1500;
const ANALYSIS_DURATION_MS = 3000;

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

function formatConfirmAmount(amount: number): string {
  if (typeof amount !== "number" || isNaN(amount)) return "0";
  return Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
}

export default function Home() {
  const { publicKey, disconnect, signMessage } = useWallet();
  const { connection } = useConnection();
  const [mounted, setMounted] = useState(false);
  const [cashOutStatus, setCashOutStatus] = useState<CashOutStatus>("idle");
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [lastSolscanUrl, setLastSolscanUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [platformStatus, setPlatformStatus] =
    useState<PlatformStatus>("not_selected");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | null>(
    null
  );
  const [showConnectedSuccess, setShowConnectedSuccess] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState<number>(CASH_OUT_DEFAULT);

  const safeCashOutAmount =
    typeof cashOutAmount === "number" && !isNaN(cashOutAmount)
      ? cashOutAmount
      : CASH_OUT_DEFAULT;

  const oauthTimers = useRef<{
    connecting?: number;
    success?: number;
    analysis?: number;
  }>({});

  const clearOauthTimers = useCallback(() => {
    if (oauthTimers.current.connecting !== undefined) {
      window.clearTimeout(oauthTimers.current.connecting);
      oauthTimers.current.connecting = undefined;
    }
    if (oauthTimers.current.success !== undefined) {
      window.clearTimeout(oauthTimers.current.success);
      oauthTimers.current.success = undefined;
    }
    if (oauthTimers.current.analysis !== undefined) {
      window.clearTimeout(oauthTimers.current.analysis);
      oauthTimers.current.analysis = undefined;
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    return () => {
      clearOauthTimers();
    };
  }, [clearOauthTimers]);

  useEffect(() => {
    if (!publicKey) {
      setErrorMessage(null);
      setUsdcBalance(null);
      clearOauthTimers();
      setPlatformStatus("not_selected");
      setSelectedPlatform(null);
      setShowConnectedSuccess(false);
      setCashOutAmount(CASH_OUT_DEFAULT);
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
  }, [publicKey, connection, clearOauthTimers]);

  const handleCashOut = useCallback(async () => {
    if (!publicKey) return;
    setCashOutStatus("loading");
    setErrorMessage(null);

    if (!signMessage) {
      setErrorMessage(
        "Your wallet doesn't support message signing. Try Phantom."
      );
      setCashOutStatus("error");
      return;
    }

    const messageString = `NOWA cash-out request: $${safeCashOutAmount} to ${publicKey.toBase58()} at ${Date.now()}`;
    const messageBytes = new TextEncoder().encode(messageString);

    let signatureBytes: Uint8Array;
    try {
      signatureBytes = await signMessage(messageBytes);
    } catch {
      setErrorMessage("You declined to sign. Cash-out cancelled.");
      setCashOutStatus("idle");
      return;
    }

    const signatureBase64 = btoa(String.fromCharCode(...signatureBytes));

    let res: Response;
    try {
      res = await fetch("/api/cash-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: safeCashOutAmount,
          recipientAddress: publicKey.toBase58(),
          signature: signatureBase64,
          signedMessage: messageString,
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
  }, [publicKey, connection, signMessage, safeCashOutAmount]);

  const handleReset = useCallback(() => {
    setCashOutStatus("idle");
    setLastSignature(null);
    setLastSolscanUrl(null);
    setErrorMessage(null);
  }, []);

  const handleConfirm = useCallback(() => {
    setShowConfirmDialog(false);
    handleCashOut();
  }, [handleCashOut]);

  const handlePlatformSelect = useCallback(
    (id: PlatformId) => {
      clearOauthTimers();
      setSelectedPlatform(id);
      setPlatformStatus("connecting");
      setShowConnectedSuccess(false);

      oauthTimers.current.connecting = window.setTimeout(() => {
        if (!publicKey) return;
        setPlatformStatus("connected");
        setShowConnectedSuccess(true);

        oauthTimers.current.success = window.setTimeout(() => {
          if (!publicKey) return;
          setShowConnectedSuccess(false);
          setPlatformStatus("analyzing");

          oauthTimers.current.analysis = window.setTimeout(() => {
            if (!publicKey) return;
            setPlatformStatus("analysis_complete");
          }, ANALYSIS_DURATION_MS);
        }, OAUTH_SUCCESS_MS);
      }, OAUTH_CONNECTING_MS);
    },
    [publicKey, clearOauthTimers]
  );

  const handleSwitchPlatform = useCallback(() => {
    clearOauthTimers();
    setPlatformStatus("not_selected");
    setSelectedPlatform(null);
    setShowConnectedSuccess(false);
    handleReset();
  }, [clearOauthTimers, handleReset]);

  const handleAnalysisContinue = useCallback(() => {
    setPlatformStatus("ready");
  }, []);

  const address = publicKey?.toBase58();
  const truncated = address
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : null;
  const selectedPlatformObj = selectedPlatform
    ? PLATFORMS.find((p) => p.id === selectedPlatform) ?? null
    : null;
  const oauthModalOpen =
    platformStatus === "connecting" ||
    (platformStatus === "connected" && showConnectedSuccess);
  const isPostOauth =
    platformStatus === "analyzing" ||
    platformStatus === "analysis_complete" ||
    platformStatus === "ready";
  const chooseAmountStatus: "idle" | "loading" | "error" =
    cashOutStatus === "success" ? "idle" : cashOutStatus;

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
              <div className="flex items-center gap-2">
                <div
                  className="font-mono text-xs text-neutral-600 px-3 py-1.5 rounded-full border border-neutral-200 bg-neutral-50"
                  title={address}
                >
                  {truncated}
                </div>
                {isPostOauth && selectedPlatformObj && (
                  <div className="text-xs text-neutral-700 px-3 py-1.5 rounded-full border border-neutral-200 bg-neutral-50">
                    {selectedPlatformObj.name}
                  </div>
                )}
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => disconnect()}
                  className="text-xs text-neutral-500 hover:text-neutral-700 underline underline-offset-2"
                >
                  Disconnect
                </button>
                {isPostOauth && (
                  <button
                    onClick={handleSwitchPlatform}
                    className="text-xs text-neutral-500 hover:text-neutral-700 underline underline-offset-2"
                  >
                    Switch platform
                  </button>
                )}
              </div>
            </div>

            {platformStatus === "ready" ? (
              cashOutStatus === "success" ? (
                <div className="w-full rounded-2xl border border-neutral-200 p-5 flex flex-col gap-4">
                  <div className="text-base font-semibold text-neutral-900">
                    ✓ ${safeCashOutAmount} USDC received
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
                </div>
              ) : (
                <ChooseAmountScreen
                  value={safeCashOutAmount}
                  onChange={setCashOutAmount}
                  min={CASH_OUT_MIN}
                  max={CASH_OUT_MAX}
                  step={CASH_OUT_STEP}
                  onCashOut={() => setShowConfirmDialog(true)}
                  status={chooseAmountStatus}
                  errorMessage={errorMessage}
                />
              )
            ) : platformStatus === "analyzing" ||
              platformStatus === "analysis_complete" ? (
              <AnalysisScreen
                user={MOCK_USER}
                status={platformStatus}
                onContinue={handleAnalysisContinue}
              />
            ) : (
              <PlatformPicker onSelect={handlePlatformSelect} />
            )}
          </>
        )}
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm cash-out</DialogTitle>
            <DialogDescription>
              Network: Solana devnet · Fee: $0 (demo)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            <span className="text-4xl font-semibold text-emerald-600 tabular-nums">
              + ${formatConfirmAmount(safeCashOutAmount)} USDC
            </span>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={oauthModalOpen}
        onOpenChange={() => {
          // Controlled, non-dismissible: ignore user-initiated close attempts
          // (Esc, backdrop click). Modal closes only when state flips oauthModalOpen → false.
        }}
      >
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {platformStatus === "connecting"
                ? `Connecting to ${selectedPlatformObj?.name ?? "..."}…`
                : "Successfully connected"}
            </DialogTitle>
            <DialogDescription>
              {platformStatus === "connecting"
                ? "One moment please."
                : `Linked to ${selectedPlatformObj?.name ?? "..."}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-3">
            {platformStatus === "connecting" ? (
              <span className="inline-block w-10 h-10 border-3 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="size-10 text-emerald-600" />
                <span className="text-base font-medium text-neutral-900">
                  Connected as {MOCK_USER.name}
                </span>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
