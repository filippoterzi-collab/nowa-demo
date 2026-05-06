"use client";

import Image from "next/image";

export function SetupPhantomModal({ onDone }: { onDone: () => void }) {
  const steps = [
    "Open Phantom extension",
    "Click the ⚙️ gear (top corner)",
    "Tap “Developer settings” → Toggle “Testnet mode” ON",
    "Select “Devnet” from the network dropdown",
  ];

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
          Hey! Let&apos;s set up Phantom 👋
        </h2>

        <p className="mt-3 text-sm text-gray-700 mb-6">
          GioGio runs on Solana devnet — a test network with fake money for
          trying things out. Just 4 quick steps:
        </p>

        <ol className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm text-gray-800 pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        <button
          onClick={onDone}
          className="mt-6 w-full rounded-full bg-emerald-500 hover:bg-emerald-700 text-white font-semibold py-3 transition-colors"
        >
          I&apos;m on Devnet ✓
        </button>
      </div>
    </div>
  );
}
