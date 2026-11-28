import { useMemo, useState } from "react";
import { toast } from "sonner";
import { address, isAddress, type Address } from "@solana/kit";
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useIsWalletReady,
  useWalletStatus,
  useWallets,
} from "@solana/kit-plugin-wallet/react";
import {
  getPreferredTransactionVersion,
  solanaV1Client,
  type SupportedTransactionVersion,
} from "../providers/SolanaProvider";

export type WalletOption = ReturnType<typeof useWallets>[number];

function formatWalletError(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return "Could not connect to Phantom. Unlock the extension and try again.";
}

export function useWalletConnection() {
  const wallets = useWallets(solanaV1Client);
  const connected = useConnectedWallet(solanaV1Client);
  const status = useWalletStatus(solanaV1Client);
  const isReady = useIsWalletReady(solanaV1Client);
  const connectAction = useConnect(solanaV1Client);
  const disconnectAction = useDisconnect(solanaV1Client);
  const [localError, setLocalError] = useState<string | null>(null);

  const walletAddress: Address | null = useMemo(() => {
    if (!connected || !isAddress(connected.account.address)) return null;
    return address(connected.account.address);
  }, [connected]);

  const transactionVersion: SupportedTransactionVersion | null = useMemo(() => {
    if (!connected) return null;
    return getPreferredTransactionVersion(connected.supportedTransactionVersions);
  }, [connected]);

  const shortAddress = useMemo(() => {
    if (!walletAddress) return null;
    return `${walletAddress.slice(0, 5)}...${walletAddress.slice(-5)}`;
  }, [walletAddress]);

  async function connectWallet(wallet: WalletOption) {
    setLocalError(null);
    try {
      await connectAction.dispatchAsync(wallet);
      toast.success(`Connected ${wallet.name}.`);
    } catch (cause) {
      const message = formatWalletError(cause);
      setLocalError(message);
      toast.error(message);
    }
  }

  async function connectPreferred() {
    if (wallets.length === 0) {
      const message =
        "No Wallet Standard extension detected. Open or unlock Phantom and reload this page.";
      setLocalError(message);
      toast.error(message);
      return;
    }
    const phantom = wallets.find((w) =>
      w.name.toLowerCase().includes("phantom"),
    );
    await connectWallet(phantom ?? wallets[0]);
  }

  const rawError = localError ?? connectAction.error ?? disconnectAction.error;
  const walletError = rawError ? formatWalletError(rawError) : null;

  return {
    wallets,
    connected,
    status,
    isReady,
    walletAddress,
    shortAddress,
    transactionVersion,
    connect: (wallet: WalletOption) => {
      void connectWallet(wallet);
    },
    connectPreferred: () => {
      void connectPreferred();
    },
    disconnect: disconnectAction.dispatch,
    isConnecting: connectAction.isRunning,
    isDisconnecting: disconnectAction.isRunning,
    walletError,
    clearWalletError: () => {
      setLocalError(null);
      connectAction.reset();
      disconnectAction.reset();
    },
  };
}
