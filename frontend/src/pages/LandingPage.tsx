import { useState, type FormEvent } from "react";
import { CredentialCard } from "../components/CredentialCard";
import { MotionSurface } from "../components/MotionSurface";
import { SAMPLE_VERIFICATION_RESULT } from "../services/attestations";

type LandingPageProps = {
  onNavigate: (path: "/" | "/issue" | "/verify") => void;
  onQuickVerify: (addressOrUrl: string) => void;
};

export function LandingPage({ onNavigate, onQuickVerify }: LandingPageProps) {
  const [quickAddress, setQuickAddress] = useState("");

  function handleQuickSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickAddress.trim()) return;
    onQuickVerify(quickAddress.trim());
  }

  return (
    <MotionSurface>
      <div className="container pt-4 pb-5">
        <section className="row g-4 g-lg-5 align-items-center pb-5">
          <div className="col-lg-6">
            <span className="certum-chip certum-chip-soft mb-3">
              <span className="certum-chip certum-chip-amber py-1 px-2">SAS</span>
              Live on Solana Devnet
            </span>

            <h1 className="mb-3">
              Verifiable <span className="hl">institutional</span> credentials on Solana.
            </h1>

            <p className="lead text-secondary mb-5" style={{ maxWidth: "50ch" }}>
              Universities, private bootcamps, and public agencies anchor
              tamper-proof diplomas, licenses, and civic records on the Solana
              Attestation Service.
            </p>

            <div className="d-flex flex-wrap gap-3 mb-4">
              <button
                type="button"
                className="certum-btn certum-btn-primary"
                onClick={() => onNavigate("/issue")}
              >
                <i className="bi bi-pen" aria-hidden="true" />
                Open Issuance Console
              </button>
              <button
                type="button"
                className="certum-btn certum-btn-ghost"
                onClick={() => onNavigate("/verify")}
              >
                <i className="bi bi-search" aria-hidden="true" />
                Verify an Attestation PDA
              </button>
            </div>

            <form
              className="certum-box p-3 p-sm-4"
              onSubmit={handleQuickSearch}
              aria-label="Quick attestation lookup"
            >
              <label
                htmlFor="landing-pda-input"
                className="form-label fw-bold mb-2"
              >
                Inspect an attestation immediately
              </label>
              <div className="d-flex flex-column flex-sm-row gap-2">
                <input
                  id="landing-pda-input"
                  type="text"
                  className="form-control certum-input certum-mono"
                  placeholder="Paste a Solana SAS Attestation PDA or share link"
                  value={quickAddress}
                  onChange={(event) => setQuickAddress(event.currentTarget.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="certum-btn certum-btn-amber"
                  disabled={!quickAddress.trim()}
                >
                  Verify PDA
                </button>
              </div>
            </form>
          </div>

          <div className="col-lg-6">
            <CredentialCard result={SAMPLE_VERIFICATION_RESULT} isSample />
          </div>
        </section>

        <section className="row g-4 pt-3 pb-4" aria-label="Institutional scope and verification">
          <div className="col-md-6">
            <div className="certum-box h-100 d-flex flex-column justify-content-between gap-4">
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-building-check fs-4" style={{ color: "var(--royal-text)" }} aria-hidden="true" />
                  <h2 className="fw-bold fs-4 mb-0">Public & Private Issuers</h2>
                </div>
                <p className="text-secondary mb-0">
                  Built for universities, technical bootcamps, accreditation
                  boards, and government registries. Your institution signs
                  directly with Phantom, keeping full authority over every
                  credential schema with zero custodial intermediaries.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  className="certum-btn certum-btn-primary"
                  onClick={() => onNavigate("/issue")}
                >
                  Open Issuance Console
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="certum-box-royal h-100 d-flex flex-column justify-content-between gap-4">
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-patch-check fs-4" style={{ color: "var(--amber)" }} aria-hidden="true" />
                  <h2 className="fw-bold fs-4 text-white mb-0">
                    Zero-Friction Auditability
                  </h2>
                </div>
                <p className="certum-royal-muted mb-0">
                  Graduates, hiring teams, and regulators validate any record
                  without a wallet login. Each lookup checks SAS program
                  ownership, authorized signer membership, and expiration, then
                  exports a portable PNG certificate card.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  className="certum-btn certum-btn-amber"
                  onClick={() => onNavigate("/verify")}
                >
                  Open Public Verifier
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="certum-band py-5 mt-3" aria-label="Attestation lifecycle">
        <div className="container py-3">
          <div className="mb-4">
            <h2 className="fw-bold mb-2 text-white">
              Three steps from wallet signature to public proof
            </h2>
            <p className="certum-royal-muted mb-0" style={{ maxWidth: "60ch" }}>
              Every record follows the native Solana Attestation Service account
              hierarchy.
            </p>
          </div>

          <ol className="row g-4 list-unstyled mb-0">
            <li className="col-md-4">
              <div className="pe-md-3">
                <div className="certum-step-visual" aria-hidden="true">
                  <i className="bi bi-pen certum-step-icon" />
                  <span className="certum-step-num">01</span>
                </div>
                <h3 className="fw-bold fs-5 text-white mb-2">
                  Authorize & Categorize
                </h3>
                <p className="certum-royal-muted small mb-0">
                  Connect your issuer wallet, choose the credential category, and
                  define the recipient, dates, and public summary.
                </p>
              </div>
            </li>

            <li className="col-md-4">
              <div className="pe-md-3">
                <div className="certum-step-visual" aria-hidden="true">
                  <i className="bi bi-shield-check certum-step-icon" />
                  <span className="certum-step-num">02</span>
                </div>
                <h3 className="fw-bold fs-5 text-white mb-2">
                  Anchor SAS Accounts
                </h3>
                <p className="certum-royal-muted small mb-0">
                  Certum derives the deterministic Credential, Schema, and
                  Attestation PDAs and publishes the signed payload on-chain.
                </p>
              </div>
            </li>

            <li className="col-md-4">
              <div className="pe-md-3">
                <div className="certum-step-visual" aria-hidden="true">
                  <i className="bi bi-patch-check certum-step-icon" />
                  <span className="certum-step-num">03</span>
                </div>
                <h3 className="fw-bold fs-5 text-white mb-2">
                  Share & Verify Anywhere
                </h3>
                <p className="certum-royal-muted small mb-0">
                  Share the verification URL or download the rendered PNG
                  certificate card for instant third-party inspection.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </MotionSurface>
  );
}
