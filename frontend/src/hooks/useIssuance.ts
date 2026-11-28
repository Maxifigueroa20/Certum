import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  estimateResourceLimitsFactory,
  formatDecimalFixedPoint,
  lamports,
  lamportsToSol,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Lamports,
} from "@solana/kit";
import {
  CREDENTIAL_CATEGORIES,
  fetchIssuerAttestations,
  prepareIssuance,
  validatePublicCredentialData,
  type IssuancePlan,
  type PublicCredentialData,
} from "../services/attestations";
import { buildVerificationShareUrl } from "../services/snapshotExport";
import {
  DEVNET_RPC_URL,
  getTransactionClient,
  solanaV1Client,
  type SupportedTransactionVersion,
} from "../providers/SolanaProvider";

export type IssuanceBusyState = "preparing" | "simulating" | "submitting" | null;

export type IssuePreview = {
  plan: IssuancePlan;
  data: PublicCredentialData;
  feePayer: Address;
  transactionVersion: SupportedTransactionVersion;
  computeUnits: number;
  loadedAccountsDataSize?: number;
  estimatedRentLamports: Lamports;
};

export type IssueReceipt = {
  attestationAddress: Address;
  credentialAddress: Address;
  schemaAddress: Address;
  shareUrl: string;
  transactionSignature?: string;
  category?: string;
  title: string;
  issuerDisplayName: string;
  recipientDisplayName: string;
  issuedAt: string;
};

const STORAGE_KEY = "certum_issued_history_v1";

function formatIssuanceError(cause: unknown): string {
  if (!(cause instanceof Error)) return "Unable to prepare SAS issuance.";
  const nested = (cause as { cause?: unknown }).cause;
  if (nested instanceof Error && nested.message) {
    return `${cause.message.split("Inspect the `cause`")[0].trim()} (${nested.message})`;
  }
  if (nested && typeof nested === "object" && "message" in nested) {
    return `${cause.message.split("Inspect the `cause`")[0].trim()} (${String(
      (nested as { message: unknown }).message,
    )})`;
  }
  return cause.message;
}

const solFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 6,
});

function loadHistory(): IssueReceipt[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(items: IssueReceipt[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 10)));
  } catch {
    // Ignore storage quota errors
  }
}

export function formatLamports(amount: Lamports): string {
  return `${formatDecimalFixedPoint(solFormatter, lamportsToSol(amount))} SOL`;
}

const initialForm: PublicCredentialData = {
  category: CREDENTIAL_CATEGORIES[0].label,
  title: "",
  issuerDisplayName: "",
  recipientDisplayName: "",
  issueDate: new Date().toISOString().slice(0, 10),
  expiryDate: "",
  description: "",
};

export function useIssuance(
  walletAddress: Address | null,
  transactionVersion: SupportedTransactionVersion | null,
) {
  const [form, setForm] = useState<PublicCredentialData>(initialForm);
  const [busy, setBusy] = useState<IssuanceBusyState>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<IssuePreview | null>(null);
  const [receipt, setReceipt] = useState<IssueReceipt | null>(null);
  const [history, setHistory] = useState<IssueReceipt[]>(() => loadHistory());
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);
  const [onChainSynced, setOnChainSynced] = useState(false);
  const [devnetBalanceLamports, setDevnetBalanceLamports] = useState<Lamports | null>(
    null,
  );

  async function refreshDevnetBalance(targetAddress: Address) {
    try {
      const { value } = await solanaV1Client.rpc.getBalance(targetAddress).send();
      setDevnetBalanceLamports(value);
    } catch {
      setDevnetBalanceLamports(null);
    }
  }

  useEffect(() => {
    if (!walletAddress) {
      setOnChainSynced(false);
      setDevnetBalanceLamports(null);
      return;
    }

    let cancelled = false;
    setIsSyncingHistory(true);
    void refreshDevnetBalance(walletAddress);

    fetchIssuerAttestations(DEVNET_RPC_URL, solanaV1Client.rpc, walletAddress)
      .then((discovered) => {
        if (cancelled) return;
        setOnChainSynced(true);
        if (discovered.length === 0) return;

        setHistory((current) => {
          const merged = new Map<string, IssueReceipt>();
          for (const item of current) {
            merged.set(item.attestationAddress, item);
          }
          for (const item of discovered) {
            if (!merged.has(item.attestationAddress)) {
              merged.set(item.attestationAddress, {
                attestationAddress: item.attestationAddress,
                credentialAddress: item.credentialAddress,
                schemaAddress: item.schemaAddress,
                shareUrl: buildVerificationShareUrl(item.attestationAddress),
                category: item.category,
                title: item.title,
                issuerDisplayName: item.issuerDisplayName,
                recipientDisplayName: item.recipientDisplayName,
                issuedAt: item.issuedAt,
              });
            }
          }
          const next = Array.from(merged.values()).slice(0, 15);
          saveHistory(next);
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) setOnChainSynced(false);
      })
      .finally(() => {
        if (!cancelled) setIsSyncingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  function updateField<K extends keyof PublicCredentialData>(
    field: K,
    value: PublicCredentialData[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectCategory(categoryLabel: string) {
    setForm((current) => ({ ...current, category: categoryLabel }));
    setError(null);
    setPreview(null);
  }

  function fillCategorySample() {
    const found =
      CREDENTIAL_CATEGORIES.find((item) => item.label === form.category) ??
      CREDENTIAL_CATEGORIES[0];
    setForm({ ...found.sample });
    setError(null);
    setPreview(null);
  }

  function resetForm() {
    setForm((current) => ({
      ...initialForm,
      category: current.category,
    }));
    setPreview(null);
    setError(null);
  }

  async function prepareReview() {
    if (!walletAddress || transactionVersion === null) {
      const msg = "Connect Phantom or a Wallet Standard wallet to issue an attestation.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setError(null);
    setPreview(null);
    setBusy("preparing");
    try {
      const data = validatePublicCredentialData(form);
      const client = getTransactionClient(transactionVersion);
      const { value: currentBalance } = await client.rpc
        .getBalance(walletAddress)
        .send();
      setDevnetBalanceLamports(currentBalance);
      if (currentBalance === 0n) {
        throw new Error(
          "Connected wallet has 0 Devnet SOL. Switch Phantom to Devnet and request test SOL at faucet.solana.com.",
        );
      }
      const plan = await prepareIssuance(
        client.rpc,
        client.payer,
        client.identity,
        data,
      );
      const message = await client.planTransaction(plan.instructions);
      const { value: latestBlockhash } = await client.rpc
        .getLatestBlockhash()
        .send();
      const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(
        latestBlockhash,
        message,
      );

      setBusy("simulating");
      const resources = await estimateResourceLimitsFactory({
        rpc: client.rpc,
      })(messageWithLifetime);

      const accountSpaces = [
        plan.accountSpaces.credential,
        plan.accountSpaces.schema,
        plan.accountSpaces.attestation,
      ].filter((space): space is number => space !== null);

      let estimatedRentLamports = lamports(0n);
      for (const space of accountSpaces) {
        const rent = await client.rpc
          .getMinimumBalanceForRentExemption(BigInt(space))
          .send();
        estimatedRentLamports = lamports(estimatedRentLamports + BigInt(rent));
      }

      setPreview({
        plan,
        data,
        feePayer: walletAddress,
        transactionVersion,
        computeUnits: resources.computeUnitLimit,
        loadedAccountsDataSize: resources.loadedAccountsDataSizeLimit,
        estimatedRentLamports,
      });
    } catch (cause) {
      const msg = formatIssuanceError(cause);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  async function submitIssuance() {
    if (!preview || !walletAddress) return;
    if (walletAddress !== preview.feePayer) {
      setPreview(null);
      const msg = "The connected wallet changed. Review the SAS transaction again.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setError(null);
    setBusy("submitting");
    try {
      const client = getTransactionClient(preview.transactionVersion);
      const result = await client.sendTransaction(preview.plan.instructions);
      if (result.status !== "successful") {
        throw new Error("The wallet transaction did not complete successfully.");
      }

      const shareUrl = buildVerificationShareUrl(preview.plan.attestationAddress);
      const nextReceipt: IssueReceipt = {
        attestationAddress: preview.plan.attestationAddress,
        credentialAddress: preview.plan.credentialAddress,
        schemaAddress: preview.plan.schemaAddress,
        shareUrl,
        transactionSignature: result.context.signature,
        category: preview.data.category,
        title: preview.data.title,
        issuerDisplayName: preview.data.issuerDisplayName,
        recipientDisplayName: preview.data.recipientDisplayName,
        issuedAt: new Date().toISOString(),
      };

      const nextHistory = [
        nextReceipt,
        ...history.filter(
          (item) => item.attestationAddress !== nextReceipt.attestationAddress,
        ),
      ].slice(0, 10);

      setReceipt(nextReceipt);
      setHistory(nextHistory);
      saveHistory(nextHistory);
      setPreview(null);
      toast.success("Attestation published on Solana Devnet.");
    } catch (cause) {
      const msg =
        cause instanceof Error ? cause.message : "Transaction submission failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  return {
    form,
    busy,
    error,
    preview,
    receipt,
    history,
    isSyncingHistory,
    onChainSynced,
    devnetBalanceLamports,
    refreshDevnetBalance: () =>
      walletAddress ? refreshDevnetBalance(walletAddress) : Promise.resolve(),
    updateField,
    selectCategory,
    fillCategorySample,
    resetForm,
    prepareReview,
    submitIssuance,
    cancelPreview: () => setPreview(null),
    clearError: () => setError(null),
  };
}
