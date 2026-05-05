"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FEE_PERCENTAGE, REPAYMENT_DAYS } from "@/lib/mock-data";

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

export function ActiveLoanCard({
  borrowedAmount,
  loanStartTimestamp,
  signature,
  solscanUrl,
  onRepayClick,
}: {
  borrowedAmount: number;
  loanStartTimestamp: number | null;
  signature: string | null;
  solscanUrl: string | null;
  onRepayClick: () => void;
}) {
  if (!loanStartTimestamp) return null;

  const fee = Math.round(borrowedAmount * FEE_PERCENTAGE * 100) / 100;
  const repaymentAmount = Math.round((borrowedAmount + fee) * 100) / 100;
  const dueDate = dateFormatter.format(
    loanStartTimestamp + REPAYMENT_DAYS * 86_400_000
  );
  const daysElapsed = Math.floor(
    (Date.now() - loanStartTimestamp) / 86_400_000
  );
  const progressPct = Math.min(100, (daysElapsed / REPAYMENT_DAYS) * 100);

  return (
    <div className="w-full rounded-2xl border border-neutral-200 p-5 flex flex-col gap-4">
      <div className="text-base font-semibold text-neutral-900">
        Active Loan
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">Borrowed</span>
          <span className="text-neutral-900 tabular-nums">
            ${borrowedAmount}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Repayment (incl. 2% fee)</span>
          <span className="text-neutral-900 tabular-nums">
            {currencyFormatter.format(repaymentAmount)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Due</span>
          <span className="text-neutral-900">{dueDate}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Progress value={progressPct} />
        <div className="text-xs text-neutral-500">
          Day {daysElapsed} of {REPAYMENT_DAYS}
        </div>
      </div>

      <Button
        variant="default"
        size="lg"
        className="w-full"
        onClick={onRepayClick}
      >
        Repay ${borrowedAmount}
      </Button>

      <div className="text-xs text-neutral-500">
        Demo: fee waived for testing. In production, repayment includes the 2%
        fee.
      </div>

      <div className="border-t border-neutral-200 pt-3 flex flex-col gap-1">
        <div className="text-xs text-neutral-500">✓ Funded</div>
        {solscanUrl && (
          <a
            href={solscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
          >
            View on Solscan
          </a>
        )}
        {signature && (
          <div
            className="font-mono text-xs text-neutral-400 truncate"
            title={signature}
          >
            {signature.slice(0, 8)}…{signature.slice(-8)}
          </div>
        )}
      </div>
    </div>
  );
}
