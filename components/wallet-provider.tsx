"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { ReactNode, useMemo } from "react";

// Phantom must be set to devnet in the extension settings
// (Settings → Developer Settings → Testnet Mode). The adapter trusts the
// wallet's selected network, so a mainnet-set Phantom would silently broadcast
// real-money transactions if we ever pointed at mainnet — we don't.
export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => {
    const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    if (!apiKey) {
      throw new Error(
        "NEXT_PUBLIC_HELIUS_API_KEY is not set in .env.local. Restart the dev server after adding it."
      );
    }
    return `https://devnet.helius-rpc.com/?api-key=${apiKey}`;
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network: WalletAdapterNetwork.Devnet }),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
