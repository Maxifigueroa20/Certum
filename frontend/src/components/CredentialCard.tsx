import * as m from "motion/react-m";
import type { VerificationResult } from "../services/attestations";

type CredentialCardProps = {
  result: VerificationResult;
  isSample?: boolean;
};

function formatExpiry(expiry?: bigint): string {
  if (expiry === undefined || expiry === 0n) return "No expiry";
  const maxDateSeconds = 8_640_000_000_000n;
  if (expiry > maxDateSeconds || expiry < -maxDateSeconds) {
    return `${expiry.toString()} Unix seconds`;
  }
  return new Date(Number(expiry * 1000n)).toISOString().slice(0, 10);
}

export function CredentialCard({ result, isSample = false }: CredentialCardProps) {
  const isValid = result.status === "valid";

  const statusChipClass = isValid
    ? "certum-chip-amber"
    : "certum-chip-soft";

  const statusIcon = isValid
    ? "bi-patch-check-fill"
    : result.status === "expired"
      ? "bi-clock-history"
      : "bi-exclamation-triangle-fill";

  const statusLabel = isValid
    ? "Verified on Solana SAS"
    : result.status === "expired"
      ? "Expired SAS Attestation"
      : result.status === "not-found"
        ? "Account Not Found"
        : "Verification Failed";

  return (
    <m.article
      className="certum-box-ink"
      aria-label="On-chain credential record"
      initial={{ opacity: 0.15, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pb-3 certum-ink-row">
        <div className="d-flex align-items-center gap-2">
          <span className="fw-bold">Certum Attestation Record</span>
          {isSample && (
            <span className="badge text-bg-secondary">Sample</span>
          )}
        </div>
        <span className={`certum-chip ${statusChipClass}`} role="status">
          <i className={`bi ${statusIcon}`} aria-hidden="true" />
          {statusLabel}
        </span>
      </div>

      {result.credential ? (
        <div className="py-4">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span className="certum-chip certum-chip-royal">
              {result.credential.category}
            </span>
            <span
              className="small fw-bold text-uppercase"
              style={{ color: "var(--amber)", letterSpacing: "0.06em" }}
            >
              {result.credential.issuerDisplayName}
            </span>
          </div>
          <h2 className="fw-bold fs-2 text-white mb-3">
            {result.credential.title}
          </h2>

          <div className="mb-3">
            <div className="small certum-ink-muted text-uppercase fw-semibold">
              Issued To Recipient
            </div>
            <div className="fs-4 fw-bold text-white">
              {result.credential.recipientDisplayName}
            </div>
          </div>

          <p className="mb-0 certum-ink-muted">
            {result.credential.description}
          </p>
        </div>
      ) : (
        <div className="py-4">
          <h2 className="fw-bold fs-4 text-white mb-2">Record Inspection</h2>
          <p className="mb-0 certum-ink-muted">{result.reason}</p>
        </div>
      )}

      <dl className="mb-0 pt-2">
        <div className="d-flex justify-content-between gap-3 py-2 certum-ink-row">
          <dt className="certum-ink-muted fw-medium">Issue Date</dt>
          <dd className="mb-0 fw-bold num text-end text-white">
            {result.credential?.issueDate ?? "Unavailable"}
          </dd>
        </div>
        <div className="d-flex justify-content-between gap-3 py-2 certum-ink-row">
          <dt className="certum-ink-muted fw-medium">Expiry</dt>
          <dd className="mb-0 fw-bold num text-end text-white">
            {result.credential?.expiryDate || formatExpiry(result.expiry)}
          </dd>
        </div>
        <div className="d-flex justify-content-between gap-3 py-2 certum-ink-row">
          <dt className="certum-ink-muted fw-medium">Schema</dt>
          <dd className="mb-0 fw-bold text-end text-white">
            {result.metadata
              ? `${result.metadata.schemaName} v${result.metadata.schemaVersion}`
              : "SAS Schema"}
          </dd>
        </div>
        <div className="py-2 certum-ink-row">
          <dt className="certum-ink-muted fw-medium mb-1">Attestation PDA</dt>
          <dd className="mb-0 certum-mono" style={{ color: "var(--amber)" }}>
            {result.attestationAddress}
          </dd>
        </div>
        {result.signerAddress && (
          <div className="py-2 certum-ink-row">
            <dt className="certum-ink-muted fw-medium mb-1">
              Authorized Signer (Institution)
            </dt>
            <dd className="mb-0 certum-mono text-white">
              {result.signerAddress}
            </dd>
          </div>
        )}
        {result.schemaAddress && (
          <div className="pt-2">
            <dt className="certum-ink-muted fw-medium mb-1">Schema PDA</dt>
            <dd className="mb-0 certum-mono certum-ink-muted">
              {result.schemaAddress}
            </dd>
          </div>
        )}
      </dl>
    </m.article>
  );
}
