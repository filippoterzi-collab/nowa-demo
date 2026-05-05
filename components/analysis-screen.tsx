"use client";

import { useEffect, useRef, useState } from "react";
import {
  Award,
  Calendar,
  Hourglass,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_USER } from "@/lib/mock-data";

type Status = "analyzing" | "analysis_complete";

const REVEAL_INTERVAL_MS = 600;
const TOTAL_METRICS = 5;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type Metric = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function AnalysisScreen({
  user,
  status,
  onContinue,
}: {
  user: typeof MOCK_USER;
  status: Status;
  onContinue: () => void;
}) {
  const [revealedCount, setRevealedCount] = useState(
    status === "analysis_complete" ? TOTAL_METRICS : 0
  );
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (status !== "analyzing") {
      setRevealedCount(TOTAL_METRICS);
      return;
    }
    setRevealedCount(0);
    for (let i = 1; i <= TOTAL_METRICS; i++) {
      const id = window.setTimeout(() => {
        setRevealedCount(i);
      }, (i - 1) * REVEAL_INTERVAL_MS);
      timersRef.current.push(id);
    }
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [status]);

  const smallMetrics: Metric[] = [
    {
      icon: TrendingUp,
      label: "Avg monthly",
      value: currencyFormatter.format(user.avgMonthlyEarnings),
    },
    {
      icon: Award,
      label: "Completion",
      value: `${Math.round(user.completionRate * 100)}%`,
    },
    {
      icon: Calendar,
      label: "Months active",
      value: String(user.monthsActive),
    },
    {
      icon: Hourglass,
      label: "Pending payouts",
      value: currencyFormatter.format(user.pendingPayouts),
    },
  ];

  return (
    <div className="w-full flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900 text-center">
        Analyzing your earnings
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {smallMetrics.map((metric, i) => {
          const Icon = metric.icon;
          const revealed = revealedCount >= i + 1;
          return (
            <div
              key={metric.label}
              className={`border border-neutral-200 rounded-xl p-3 flex flex-col gap-1 transition-all duration-300 ${
                revealed
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              }`}
            >
              <Icon className="size-4 text-neutral-500" />
              <div className="text-xs text-neutral-500">{metric.label}</div>
              <div className="text-base font-semibold text-neutral-900 tabular-nums">
                {metric.value}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 flex flex-col items-center gap-1 transition-all duration-300 ${
          revealedCount >= TOTAL_METRICS
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        }`}
      >
        <Sparkles className="size-6 text-emerald-600" />
        <div className="text-sm text-neutral-600">You can cash out up to</div>
        <div className="text-3xl font-semibold text-emerald-700 tabular-nums">
          {currencyFormatter.format(user.maxAdvance)}
        </div>
        <div className="text-xs text-neutral-500">(80% of pending)</div>
      </div>

      {status === "analysis_complete" && (
        <Button
          variant="default"
          size="lg"
          className="w-full"
          onClick={onContinue}
        >
          Continue
        </Button>
      )}
    </div>
  );
}
