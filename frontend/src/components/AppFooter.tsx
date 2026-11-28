import { SAS_PROGRAM_ID } from "../services/attestations";
import { CertumLogo } from "./CertumLogo";

export function AppFooter() {
  return (
    <footer className="certum-band-ink py-4 mt-auto">
      <div className="container py-2">
        <div className="row gy-3 align-items-center">
          <div className="col-md-6">
            <div className="d-flex align-items-center gap-2 fw-bold fs-5 mb-1">
              <CertumLogo size={26} />
              <span>Certum</span>
            </div>
            <div className="small certum-ink-muted">
              &copy; 2026 Certum. Released under GNU GPLv3.
            </div>
          </div>
          <div className="col-md-6 text-md-end">
            <div className="small certum-ink-muted mb-1">
              Solana Attestation Service (Devnet)
            </div>
            <a
              className="certum-mono small text-decoration-underline"
              style={{ color: "var(--amber)" }}
              href={`https://explorer.solana.com/address/${SAS_PROGRAM_ID}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
            >
              {SAS_PROGRAM_ID} <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
