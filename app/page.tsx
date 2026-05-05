"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

export default function Home() {
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const address = publicKey?.toBase58();
  const truncated = address
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : null;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center">
          Connect your wallet
        </h1>

        {mounted ? (
          <WalletMultiButton />
        ) : (
          <div className="h-12 w-44 rounded-md bg-neutral-100" />
        )}

        {mounted && address && (
          <div
            className="font-mono text-sm text-neutral-600 px-4 py-2 rounded-md border border-neutral-200 bg-neutral-50"
            title={address}
          >
            Connected: {truncated}
          </div>
        )}
      </div>
    </main>
  );
}
