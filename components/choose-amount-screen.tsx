"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { FEE_PERCENTAGE, REPAYMENT_DAYS } from "@/lib/mock-data";

type Status = "idle" | "loading" | "error";

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

  return (
    <div className="w-full flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900 text-center">
        Choose amount
      </h2>

      <div className="text-5xl font-semibold text-neutral-900 tabular-nums text-center">
        ${value}
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
