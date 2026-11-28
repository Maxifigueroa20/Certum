import type { ReactNode } from "react";
import { createClient } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { walletSigner } from "@solana/kit-plugin-wallet";
import { ClientProvider } from "@solana/react";

export const DEVNET_RPC_URL = "https://api.devnet.solana.com";

export type SupportedTransactionVersion = "legacy" | 0 | 1;

const baseWalletClient = createClient().use(
  walletSigner({ chain: "solana:devnet" }),
);

export const solanaV1Client = baseWalletClient.use(
  solanaRpc({ rpcUrl: DEVNET_RPC_URL, transactionConfig: { version: 1 } }),
);

export const solanaV0Client = baseWalletClient.use(
  solanaRpc({ rpcUrl: DEVNET_RPC_URL, transactionConfig: { version: 0 } }),
);

export const solanaLegacyClient = baseWalletClient.use(
  solanaRpc({ rpcUrl: DEVNET_RPC_URL, transactionConfig: { version: "legacy" } }),
);

export type AppClient = typeof solanaV1Client;

export function getTransactionClient(version: SupportedTransactionVersion) {
  switch (version) {
    case 1:
      return solanaV1Client;
    case 0:
      return solanaV0Client;
    case "legacy":
      return solanaLegacyClient;
  }
}

export function getPreferredTransactionVersion(
  supportedVersions: ReadonlySet<SupportedTransactionVersion>,
): SupportedTransactionVersion | null {
  if (supportedVersions.has(1)) return 1;
  if (supportedVersions.has(0)) return 0;
  if (supportedVersions.has("legacy")) return "legacy";
  return null;
}

export function SolanaProvider({ children }: { children: ReactNode }) {
  return <ClientProvider client={solanaV1Client}>{children}</ClientProvider>;
}
