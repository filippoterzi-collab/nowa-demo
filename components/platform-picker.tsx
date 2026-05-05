"use client";

import { PLATFORMS, type PlatformId } from "@/lib/mock-data";

export function PlatformPicker({
  onSelect,
}: {
  onSelect: (id: PlatformId) => void;
}) {
  return (
    <div className="w-full flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900 text-center">
        Choose a platform
      </h2>
      <div className="flex flex-col gap-3">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          return (
            <button
              key={platform.id}
              onClick={() => onSelect(platform.id)}
              className="flex items-center gap-4 p-4 w-full rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors text-left"
            >
              <Icon className="size-6 text-neutral-700" />
              <span className="text-base font-medium text-neutral-900">
                {platform.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
