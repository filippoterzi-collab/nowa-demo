"use client";

import { Button } from "@/components/ui/button";

export function ActiveLoanBlock({
  borrowedAmount,
  onResume,
}: {
  borrowedAmount: number;
  onResume: () => void;
}) {
  return (
    <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-amber-900 text-center">
        You have an active loan
      </h2>
      <div className="text-sm text-amber-800 text-center">
        You borrowed ${borrowedAmount} and haven&apos;t repaid yet. Repay
        before starting a new cycle.
      </div>
      <Button
        variant="default"
        size="lg"
        className="w-full"
        onClick={onResume}
      >
        Repay it now
      </Button>
    </div>
  );
}
