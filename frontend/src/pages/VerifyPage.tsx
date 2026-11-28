import type { FormEvent } from "react";
import { useParams, useSearchParams } from "react-router";
import { CredentialCard } from "../components/CredentialCard";
import { MotionSurface } from "../components/MotionSurface";
import { ShareSnapshotBar } from "../components/ShareSnapshotBar";
import { useVerification } from "../hooks/useVerification";

export function VerifyPage() {
  const { attestationAddress } = useParams<{ attestationAddress?: string }>();
  const [searchParams] = useSearchParams();
  const initialAddress =
    attestationAddress ?? searchParams.get("attestation") ?? "";
  const verification = useVerification(initialAddress);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void verification.runVerification();
  }

  return (
    <MotionSurface className="container py-5">
      <div className="row g-4 mb-4 align-items-end">
        <div className="col-lg-8">
          <h1 className="mb-2">Public Attestation Verifier</h1>
          <p className="text-secondary mb-0" style={{ maxWidth: "56ch" }}>
            Audit any Solana Attestation Service PDA or share URL without a
            wallet login.
          </p>
        </div>
        <div className="col-lg-4 text-lg-end">
          <button
            type="button"
            className="certum-btn certum-btn-ghost"
            onClick={verification.loadSamplePreview}
          >
            <i className="bi bi-card-heading" aria-hidden="true" />
            Load Sample Credential Card
          </button>
        </div>
      </div>

      <form className="certum-box mb-4" onSubmit={handleSubmit}>
        <label htmlFor="verify-pda-input" className="form-label fw-bold">
          Attestation PDA or Certum Verification URL
        </label>
        <div className="row g-2">
          <div className="col-md-9">
            <input
              id="verify-pda-input"
              type="text"
              className="form-control certum-input certum-mono"
              placeholder="Paste a Solana SAS Attestation PDA address or share URL"
              value={verification.lookup}
              onChange={(event) => {
                verification.setLookup(event.currentTarget.value);
                if (verification.result) verification.clearVerification();
              }}
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>
          <div className="col-md-3 d-grid">
            <button
              type="submit"
              className="certum-btn certum-btn-primary"
              disabled={verification.isVerifying}
            >
              <i className="bi bi-search" aria-hidden="true" />
              {verification.isVerifying ? "Verifying..." : "Verify On-Chain"}
            </button>
          </div>
        </div>
      </form>

      {verification.isVerifying && (
        <div className="certum-box text-center" role="status">
          <div className="spinner-border mb-2" style={{ color: "var(--royal-text)" }} aria-hidden="true" />
          <div className="fw-bold">
            Fetching SAS Attestation, Credential, and Schema accounts from Devnet...
          </div>
        </div>
      )}

      {!verification.isVerifying && !verification.result && (
        <div className="certum-box-line text-center">
          <h2 className="fw-bold fs-4 mb-2">
            Enter a Solana Attestation PDA to begin
          </h2>
          <p className="text-secondary mb-4 mx-auto" style={{ maxWidth: "56ch" }}>
            Certum fetches the on-chain Attestation, Credential, and Schema
            accounts directly from Solana Devnet and validates program ownership,
            authorized signers, and expiration.
          </p>
          <button
            type="button"
            className="certum-btn certum-btn-amber"
            onClick={verification.loadSamplePreview}
          >
            Preview Sample Verified Card
          </button>
        </div>
      )}

      {verification.result && (
        <div className="row g-4">
          <div className="col-lg-8">
            <CredentialCard
              result={verification.result}
              isSample={verification.isSamplePreview}
            />
            <ShareSnapshotBar result={verification.result} />
          </div>

          <div className="col-lg-4">
            <aside className="certum-box" aria-label="On-chain validation checks">
              <div className="d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-shield-check fs-5" style={{ color: "var(--royal-text)" }} aria-hidden="true" />
                <h2 className="fw-bold fs-5 mb-0">On-Chain Validation Checks</h2>
              </div>
              <p className="small text-secondary mb-3">
                {verification.result.reason}
              </p>

              <ul className="list-unstyled d-flex flex-column gap-2 mb-4">
                <li className="d-flex justify-content-between py-2 border-bottom">
                  <span>SAS Program Ownership</span>
                  <strong>
                    {verification.result.status === "valid" ||
                    verification.result.status === "expired"
                      ? "Verified"
                      : "Check Failed"}
                  </strong>
                </li>
                <li className="d-flex justify-content-between py-2 border-bottom">
                  <span>PDA Seed Derivation</span>
                  <strong>
                    {verification.result.status === "valid" ||
                    verification.result.status === "expired"
                      ? "Matched"
                      : "Unverified"}
                  </strong>
                </li>
                <li className="d-flex justify-content-between py-2 border-bottom">
                  <span>Authorized Signer</span>
                  <strong>
                    {verification.result.status === "valid" ||
                    verification.result.status === "expired"
                      ? "Confirmed"
                      : "Unverified"}
                  </strong>
                </li>
                <li className="d-flex justify-content-between py-2 border-bottom">
                  <span>Schema Status</span>
                  <strong>
                    {verification.result.metadata?.isPaused ? "Paused" : "Active"}
                  </strong>
                </li>
                <li className="d-flex justify-content-between py-2">
                  <span>Tokenized Asset</span>
                  <strong>
                    {verification.result.metadata?.isTokenized
                      ? "Yes"
                      : "No (Standard SAS)"}
                  </strong>
                </li>
              </ul>

              {!verification.isSamplePreview && (
                <a
                  className="certum-btn certum-btn-ghost w-100"
                  href={`https://explorer.solana.com/address/${verification.result.attestationAddress}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Inspect PDA on Explorer
                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                </a>
              )}
            </aside>
          </div>
        </div>
      )}
    </MotionSurface>
  );
}
