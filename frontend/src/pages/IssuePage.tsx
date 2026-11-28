import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MotionSurface } from "../components/MotionSurface";
import { SasAccountPipeline } from "../components/SasAccountPipeline";
import {
  CREDENTIAL_CATEGORIES,
  validatePublicCredentialData,
} from "../services/attestations";
import { formatLamports, type IssueReceipt } from "../hooks/useIssuance";
import { useIssuance } from "../hooks/useIssuance";
import type { WalletOption } from "../hooks/useWalletConnection";
import type { Address } from "@solana/kit";
import type { SupportedTransactionVersion } from "../providers/SolanaProvider";

type IssuePageProps = {
  walletAddress: Address | null;
  transactionVersion: SupportedTransactionVersion | null;
  isConnected: boolean;
  isConnecting: boolean;
  isWalletReady: boolean;
  wallets: readonly WalletOption[];
  onConnectPreferred: () => void;
  onInspectAttestation: (attestationAddress: string) => void;
};

export function IssuePage({
  walletAddress,
  transactionVersion,
  isConnected,
  isConnecting,
  isWalletReady,
  wallets,
  onConnectPreferred,
  onInspectAttestation,
}: IssuePageProps) {
  const issuance = useIssuance(walletAddress, transactionVersion);
  const [showDevnetModal, setShowDevnetModal] = useState(false);
  const activeCategory =
    CREDENTIAL_CATEGORIES.find((item) => item.label === issuance.form.category) ??
    CREDENTIAL_CATEGORIES[0];

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      validatePublicCredentialData(issuance.form);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Complete all required credential fields.",
      );
      return;
    }
    void issuance.refreshDevnetBalance();
    setShowDevnetModal(true);
  }

  async function handleConfirmDevnet() {
    setShowDevnetModal(false);
    await issuance.prepareReview();
  }

  return (
    <MotionSurface className="container py-5">
      <div className="row g-4 mb-4 align-items-end">
        <div className="col-lg-8">
          <h1 className="mb-2">Institutional Issuance Console</h1>
          <p className="text-secondary mb-0" style={{ maxWidth: "60ch" }}>
            Select a credential category, enter the public record fields, and
            sign directly with Phantom to anchor a categorized SAS Attestation
            on Solana Devnet.
          </p>
        </div>
        <div className="col-lg-4 text-lg-end">
          {!isConnected &&
            (isWalletReady && wallets.length === 0 ? (
              <a
                className="certum-btn certum-btn-amber"
                href="https://phantom.app/download"
                target="_blank"
                rel="noreferrer"
              >
                <i className="bi bi-wallet2" aria-hidden="true" />
                Install Phantom Extension
              </a>
            ) : (
              <button
                type="button"
                className="certum-btn certum-btn-amber"
                disabled={!isWalletReady || isConnecting}
                onClick={onConnectPreferred}
              >
                <i className="bi bi-wallet2" aria-hidden="true" />
                {isConnecting
                  ? "Connecting Phantom..."
                  : isWalletReady
                    ? "Connect Phantom to Issue"
                    : "Checking Wallets..."}
              </button>
            ))}
        </div>
      </div>

      {issuance.busy && (
        <div className="certum-box-royal p-3 mb-4 d-flex align-items-center gap-3" role="status">
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          <span className="fw-semibold">
            {issuance.busy === "preparing"
              ? "Deriving SAS PDAs and checking existing Credential/Schema accounts..."
              : issuance.busy === "simulating"
                ? "Estimating transaction resources on Solana Devnet..."
                : "Waiting for Phantom signature and Devnet confirmation..."}
          </span>
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="certum-box-line">
            <div className="mb-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <h2 className="fw-bold fs-4 mb-0">Credential Definition</h2>
                <span className="small text-secondary fw-semibold">
                  Category stored on-chain
                </span>
              </div>
              <div
                className="d-flex flex-wrap gap-2"
                role="group"
                aria-label="Credential category"
              >
                {CREDENTIAL_CATEGORIES.map((category) => {
                  const isSelected = issuance.form.category === category.label;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={isSelected}
                      className={`certum-chip ${
                        isSelected
                          ? "certum-chip-royal border-0"
                          : "certum-chip-soft border"
                      }`}
                      style={{ minHeight: "36px" }}
                      onClick={() => issuance.selectCategory(category.label)}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleFormSubmit}>
              <fieldset disabled={issuance.busy !== null}>
                <div className="row g-3">
                  <div className="col-12">
                    <label htmlFor="cred-title" className="form-label fw-bold">
                      Credential Title
                    </label>
                    <input
                      id="cred-title"
                      type="text"
                      className="form-control certum-input"
                      maxLength={120}
                      required
                      value={issuance.form.title}
                      onChange={(event) =>
                        issuance.updateField("title", event.currentTarget.value)
                      }
                      placeholder={activeCategory.titleHint}
                    />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="cred-issuer" className="form-label fw-bold">
                      Institution / Organization Name
                    </label>
                    <input
                      id="cred-issuer"
                      type="text"
                      className="form-control certum-input"
                      maxLength={120}
                      required
                      value={issuance.form.issuerDisplayName}
                      onChange={(event) =>
                        issuance.updateField(
                          "issuerDisplayName",
                          event.currentTarget.value,
                        )
                      }
                      placeholder={activeCategory.issuerHint}
                    />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="cred-recipient" className="form-label fw-bold">
                      Recipient Name
                    </label>
                    <input
                      id="cred-recipient"
                      type="text"
                      className="form-control certum-input"
                      maxLength={120}
                      required
                      value={issuance.form.recipientDisplayName}
                      onChange={(event) =>
                        issuance.updateField(
                          "recipientDisplayName",
                          event.currentTarget.value,
                        )
                      }
                      placeholder="e.g. Elena Navarro"
                    />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="cred-issue-date" className="form-label fw-bold">
                      Issue Date
                    </label>
                    <input
                      id="cred-issue-date"
                      type="date"
                      className="form-control certum-input"
                      required
                      value={issuance.form.issueDate}
                      onChange={(event) =>
                        issuance.updateField("issueDate", event.currentTarget.value)
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="cred-expiry-date" className="form-label fw-bold">
                      Expiry Date (Optional)
                    </label>
                    <input
                      id="cred-expiry-date"
                      type="date"
                      className="form-control certum-input"
                      min={issuance.form.issueDate}
                      value={issuance.form.expiryDate}
                      onChange={(event) =>
                        issuance.updateField("expiryDate", event.currentTarget.value)
                      }
                    />
                  </div>

                  <div className="col-12">
                    <label htmlFor="cred-description" className="form-label fw-bold">
                      Public Credential Summary
                    </label>
                    <textarea
                      id="cred-description"
                      className="form-control certum-input"
                      rows={3}
                      maxLength={280}
                      required
                      value={issuance.form.description}
                      onChange={(event) =>
                        issuance.updateField("description", event.currentTarget.value)
                      }
                      placeholder={activeCategory.summaryHint}
                    />
                    <div className="form-text text-end num">
                      {issuance.form.description.length}/280 characters
                    </div>
                  </div>
                </div>

                {!isConnected && (
                  <div className="certum-box p-3 mt-3" role="status">
                    <i className="bi bi-info-circle me-2" aria-hidden="true" />
                    {isWalletReady && wallets.length === 0 ? (
                      <>
                        No Solana browser wallet extension was detected. Install{" "}
                        <a
                          href="https://phantom.app/download"
                          target="_blank"
                          rel="noreferrer"
                          className="fw-bold"
                          style={{ color: "var(--royal-text)" }}
                        >
                          Phantom for your browser
                        </a>{" "}
                        (and switch it to Devnet in Settings) to sign and issue
                        credentials.
                      </>
                    ) : (
                      "Connect Phantom in the top bar or above to sign as the issuing institution."
                    )}
                  </div>
                )}

                {isConnected && transactionVersion === null && (
                  <div className="certum-box p-3 mt-3" role="status">
                    Connected wallet does not advertise a supported Solana
                    transaction format.
                  </div>
                )}

                <div className="d-flex flex-wrap gap-2 mt-4">
                  <button
                    type="submit"
                    className="certum-btn certum-btn-primary"
                    disabled={
                      !walletAddress ||
                      transactionVersion === null ||
                      issuance.busy !== null
                    }
                  >
                    <i className="bi bi-check2-circle" aria-hidden="true" />
                    Prepare & Review SAS Transaction
                  </button>
                  <button
                    type="button"
                    className="certum-btn certum-btn-ghost"
                    onClick={issuance.fillCategorySample}
                  >
                    Fill Sample
                  </button>
                  <button
                    type="button"
                    className="certum-btn certum-btn-ghost"
                    onClick={issuance.resetForm}
                  >
                    Clear Form
                  </button>
                </div>
              </fieldset>
            </form>
          </div>

          {issuance.preview && (
            <section className="certum-box-ink mt-4" aria-label="Transaction review">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="fw-bold fs-4 text-white mb-0">
                  Transaction Review
                </h2>
                <span className="certum-chip certum-chip-amber">
                  Ready to Sign
                </span>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-sm-6">
                  <div className="small certum-ink-muted fw-semibold">Fee Payer & Signer</div>
                  <div className="certum-mono text-white">{issuance.preview.feePayer}</div>
                </div>
                <div className="col-sm-3">
                  <div className="small certum-ink-muted fw-semibold">Estimated Rent</div>
                  <div className="fw-bold num text-white">
                    {formatLamports(issuance.preview.estimatedRentLamports)}
                  </div>
                </div>
                <div className="col-sm-3">
                  <div className="small certum-ink-muted fw-semibold">Compute Units</div>
                  <div className="fw-bold num text-white">
                    {issuance.preview.computeUnits.toLocaleString()} CU
                  </div>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="certum-btn certum-btn-amber"
                  disabled={issuance.busy !== null}
                  onClick={issuance.submitIssuance}
                >
                  <i className="bi bi-shield-lock" aria-hidden="true" />
                  Approve & Publish On-Chain
                </button>
                <button
                  type="button"
                  className="certum-btn certum-btn-ghost text-white border-secondary"
                  disabled={issuance.busy !== null}
                  onClick={issuance.cancelPreview}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          {issuance.receipt && (
            <section className="certum-box-royal mt-4" aria-label="Published attestation receipt" role="status">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="fw-bold fs-4 text-white mb-0">
                  Attestation Published On-Chain
                </h2>
                <span className="certum-chip certum-chip-amber">Confirmed</span>
              </div>

              <div className="p-3 rounded-4 mb-3" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
                <div className="small certum-royal-muted fw-semibold mb-1">
                  Derived Attestation PDA
                </div>
                <div className="certum-mono fw-bold text-white">
                  {issuance.receipt.attestationAddress}
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="certum-btn certum-btn-amber"
                  onClick={() =>
                    onInspectAttestation(issuance.receipt!.attestationAddress)
                  }
                >
                  Open in Public Verifier
                </button>
                <a
                  className="certum-btn certum-btn-ghost text-white border-light"
                  href={`https://explorer.solana.com/tx/${issuance.receipt.transactionSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Solana Explorer <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                </a>
              </div>
            </section>
          )}
        </div>

        <div className="col-lg-5 d-flex flex-column gap-4">
          <SasAccountPipeline
            credentialAddress={
              issuance.preview?.plan.credentialAddress ??
              issuance.receipt?.credentialAddress
            }
            schemaAddress={
              issuance.preview?.plan.schemaAddress ??
              issuance.receipt?.schemaAddress
            }
            attestationAddress={
              issuance.preview?.plan.attestationAddress ??
              issuance.receipt?.attestationAddress
            }
            createsCredential={issuance.preview?.plan.createsCredential}
            createsSchema={issuance.preview?.plan.createsSchema}
          />

          <section className="certum-box" aria-label="Recent issued attestations">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <h3 className="fw-bold fs-5 mb-0">Recent Issued Attestations</h3>
              {walletAddress && (
                <span className="certum-chip certum-chip-soft">
                  {issuance.isSyncingHistory
                    ? "Syncing Devnet..."
                    : issuance.onChainSynced
                      ? "Synced with Devnet"
                      : "Local History"}
                </span>
              )}
            </div>
            {issuance.history.length === 0 ? (
              <p className="text-secondary small mb-0">
                No attestations found for this browser or connected issuer
                wallet yet. Published SAS Attestation PDAs appear here for quick
                inspection.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Credential</th>
                      <th scope="col">PDA</th>
                      <th scope="col" className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuance.history.map((item: IssueReceipt) => (
                      <tr key={item.attestationAddress}>
                        <td>
                          {item.category && (
                            <div className="small fw-semibold" style={{ color: "var(--royal-text)" }}>
                              {item.category}
                            </div>
                          )}
                          <div className="fw-bold small">{item.title}</div>
                          <div className="text-secondary small">
                            {item.recipientDisplayName}
                          </div>
                        </td>
                        <td className="certum-mono small">
                          {item.attestationAddress.slice(0, 6)}...
                          {item.attestationAddress.slice(-6)}
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="certum-chip certum-chip-royal border-0"
                            onClick={() =>
                              onInspectAttestation(item.attestationAddress)
                            }
                          >
                            Verify
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {showDevnetModal && (
        <>
          <div className="modal-backdrop fade show" />
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="devnetModalTitle"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div
                className="modal-content border-0 p-2"
                style={{
                  backgroundColor: "var(--canvas)",
                  color: "var(--text)",
                  borderRadius: "24px",
                  border: "1px solid var(--line)",
                }}
              >
                <div className="modal-header border-0 pb-2">
                  <div>
                    <span className="certum-chip certum-chip-amber mb-2">
                      Solana Devnet Pre-Flight
                    </span>
                    <h2 id="devnetModalTitle" className="fw-bold fs-4 mb-0">
                      Confirm Solana Devnet Network
                    </h2>
                  </div>
                </div>

                <div className="modal-body pt-2">
                  <p className="text-secondary mb-3">
                    Before continuing and signing, verify that your Phantom
                    extension is switched to <strong>Solana Devnet</strong>{" "}
                    (Settings &rarr; Developer Settings &rarr; Testnet Mode).
                  </p>

                  <div className="certum-box p-3 mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small text-secondary fw-semibold">
                        Devnet Wallet Balance
                      </span>
                      <span className="fw-bold num">
                        {issuance.devnetBalanceLamports !== null
                          ? formatLamports(issuance.devnetBalanceLamports)
                          : "Checking..."}
                      </span>
                    </div>
                    {walletAddress && (
                      <div className="certum-mono small text-secondary">
                        {walletAddress}
                      </div>
                    )}
                    {issuance.devnetBalanceLamports === 0n && (
                      <div className="small mt-2">
                        Need test SOL? Request Devnet funds at{" "}
                        <a
                          href="https://faucet.solana.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="fw-bold"
                          style={{ color: "var(--royal-text)" }}
                        >
                          faucet.solana.com
                        </a>
                        .
                      </div>
                    )}
                  </div>

                  <p className="small text-secondary mb-0">
                    Certum builds transactions exclusively with{" "}
                    <code>solana:devnet</code> blockhashes. Real Mainnet funds
                    cannot be spent.
                  </p>
                </div>

                <div className="modal-footer border-0 pt-2">
                  <button
                    type="button"
                    className="certum-btn certum-btn-ghost"
                    onClick={() => setShowDevnetModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="certum-btn certum-btn-amber"
                    onClick={handleConfirmDevnet}
                  >
                    Continue on Solana Devnet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </MotionSurface>
  );
}
