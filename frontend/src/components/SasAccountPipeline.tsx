import { SAS_PROGRAM_ID } from "../services/attestations";

type SasAccountPipelineProps = {
  credentialAddress?: string;
  schemaAddress?: string;
  attestationAddress?: string;
  createsCredential?: boolean;
  createsSchema?: boolean;
};

export function SasAccountPipeline({
  credentialAddress,
  schemaAddress,
  attestationAddress,
  createsCredential,
  createsSchema,
}: SasAccountPipelineProps) {
  return (
    <aside className="certum-box" aria-label="Solana Attestation Service account architecture">
      <div className="d-flex align-items-center gap-2 mb-2">
        <i className="bi bi-diagram-3 fs-5" style={{ color: "var(--royal-text)" }} aria-hidden="true" />
        <h3 className="fw-bold fs-5 mb-0">Solana Attestation Service Pipeline</h3>
      </div>
      <p className="text-secondary small mb-3">
        Certum derives and links standard SAS PDAs under program:
        <br />
        <code className="certum-mono" style={{ color: "var(--royal-text)" }}>
          {SAS_PROGRAM_ID}
        </code>
      </p>

      <div className="d-flex flex-column gap-3">
        <div className="certum-pda-box">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <strong>Credential PDA</strong>
            {createsCredential !== undefined && (
              <span className="certum-chip certum-chip-soft">
                {createsCredential ? "Create" : "Reuse"}
              </span>
            )}
          </div>
          <div className="small text-secondary mb-1">
            Authority and authorized signers registry
          </div>
          {credentialAddress && (
            <div className="certum-mono">{credentialAddress}</div>
          )}
        </div>

        <div className="certum-pda-box">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <strong>Schema PDA</strong>
            {createsSchema !== undefined && (
              <span className="certum-chip certum-chip-soft">
                {createsSchema ? "Create" : "Reuse"}
              </span>
            )}
          </div>
          <div className="small text-secondary mb-1">
            Typed 7-field categorized credential layout (v1)
          </div>
          {schemaAddress && (
            <div className="certum-mono">{schemaAddress}</div>
          )}
        </div>

        <div className="certum-pda-box">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <strong>Attestation PDA</strong>
            {attestationAddress && (
              <span className="certum-chip certum-chip-amber">Derived</span>
            )}
          </div>
          <div className="small text-secondary mb-1">
            Signed, immutable claim record with optional expiry
          </div>
          {attestationAddress && (
            <div className="certum-mono">{attestationAddress}</div>
          )}
        </div>
      </div>
    </aside>
  );
}
