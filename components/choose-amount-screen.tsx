"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { FEE_PERCENTAGE, REPAYMENT_DAYS } from "@/lib/mock-data";

type Status = "idle" | "loading" | "error";

const CLAMP_MESSAGE_MS = 2000;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ChooseAmountScreen({
  value,
  onChange,
  min,
  max,
  step,
  onCashOut,
  status,
  errorMessage,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  onCashOut: () => void;
  status: Status;
  errorMessage: string | null;
}) {
  const fee = Math.round(value * FEE_PERCENTAGE * 100) / 100;
  const total = Math.round((value + fee) * 100) / 100;
  const repayDateFormatted = useMemo(
    () => dateFormatter.format(Date.now() + REPAYMENT_DAYS * 86_400_000),
    []
  );

  const [inputText, setInputText] = useState(value.toString());
  const [clampMessage, setClampMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const clampTimerRef = useRef<number | null>(null);

  // Sync input text when value changes externally (slider drag) — but ONLY
  // when the input is unfocused. While focused, the user is typing and
  // their text is the source of truth (deleting "50" → "5" must not be
  // overwritten back to "50" just because parseInt("5") !== value).
  useEffect(() => {
    if (!isFocused && parseInt(inputText, 10) !== value) {
      setInputText(value.toString());
    }
  }, [value, inputText, isFocused]);

  // Cleanup the clamp-message timer on unmount.
  useEffect(() => {
    return () => {
      if (clampTimerRef.current !== null) {
        window.clearTimeout(clampTimerRef.current);
      }
    };
  }, []);

  const triggerClampMessage = useCallback((msg: string) => {
    setClampMessage(msg);
    if (clampTimerRef.current !== null) {
      window.clearTimeout(clampTimerRef.current);
    }
    clampTimerRef.current = window.setTimeout(() => {
      setClampMessage(null);
      clampTimerRef.current = null;
    }, CLAMP_MESSAGE_MS);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
    // Out-of-range or invalid: parent state untouched, input shows raw text.
    // Clamping applied on blur via handleInputBlur.
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const parsed = parseInt(inputText, 10);
    if (isNaN(parsed)) {
      // Empty / non-numeric → snap back to last valid value.
      setInputText(value.toString());
      return;
    }
    if (parsed < min) {
      onChange(min);
      setInputText(min.toString());
      triggerClampMessage(`Min $${min}`);
    } else if (parsed > max) {
      onChange(max);
      setInputText(max.toString());
      triggerClampMessage(`Max $${max}`);
    }
    // In-range: parent state was already set by handleInputChange; nothing to do.
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900 text-center">
        Choose amount
      </h2>

      <div className="flex flex-col items-center gap-1">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-semibold text-neutral-900 tabular-nums">
            $
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={inputText}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={(e) => {
              setIsFocused(true);
              e.target.select();
            }}
            onKeyDown={handleInputKeyDown}
            disabled={status === "loading"}
            aria-label="Cash-out amount in USDC"
            className="text-5xl font-semibold text-neutral-900 tabular-nums text-center w-32 bg-transparent border-0 border-b-2 border-b-transparent hover:border-b-neutral-200 focus-visible:border-b-neutral-900 focus-visible:outline-none disabled:opacity-60 disabled:cursor-not-allowed appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:m-0"
          />
        </div>
        <div
          className="h-4 text-xs text-amber-600 transition-opacity duration-200"
          style={{ opacity: clampMessage ? 1 : 0 }}
        >
          {clampMessage ?? ""}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Slider
          value={[value]}
          onValueChange={(next) => {
            const v = Array.isArray(next) ? next[0] : next;
            if (typeof v === "number" && !isNaN(v)) onChange(v);
          }}
          min={min}
          max={max}
          step={step}
          disabled={status === "loading"}
        />
        <div className="flex justify-between text-xs text-neutral-500 tabular-nums">
          <span>${min}</span>
          <span>${max}</span>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">Amount</span>
          <span className="text-neutral-900 tabular-nums">${value}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Fee (2%)</span>
          <span className="text-neutral-900 tabular-nums">
            {currencyFormatter.format(fee)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Total to repay</span>
          <span className="font-semibold text-neutral-900 tabular-nums">
            {currencyFormatter.format(total)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Repay by</span>
          <span className="text-neutral-900">{repayDateFormatted}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          size="lg"
          className="w-full"
          disabled={status === "loading"}
          onClick={onCashOut}
        >
          {status === "loading" ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending…
            </>
          ) : (
            `Cash out $${value}`
          )}
        </Button>
        {errorMessage && (
          <div
            className={`text-sm ${
              status === "error" ? "text-red-600" : "text-neutral-600"
            }`}
          >
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
