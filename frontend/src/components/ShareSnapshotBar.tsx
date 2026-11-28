import { useState } from "react";
import { toast } from "sonner";
import type { VerificationResult } from "../services/attestations";
import {
  downloadCredentialSnapshotPng,
  getSocialShareUrls,
  shareCredentialSnapshot,
} from "../services/snapshotExport";

type ShareSnapshotBarProps = {
  result: VerificationResult;
};

export function ShareSnapshotBar({ result }: ShareSnapshotBarProps) {
  const [busyAction, setBusyAction] = useState<"png" | "share" | null>(null);

  if (!result.credential) return null;

  const social = getSocialShareUrls(result);

  async function handleDownloadPng() {
    setBusyAction("png");
    try {
      await downloadCredentialSnapshotPng(result);
      toast.success("PNG snapshot downloaded.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Failed to generate PNG.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleNativeShare() {
    setBusyAction("share");
    try {
      const outcome = await shareCredentialSnapshot(result);
      toast.success(
        outcome === "shared"
          ? "Credential snapshot shared."
          : "Browser share unavailable; PNG snapshot downloaded instead.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Unable to share snapshot.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(social.shareUrl);
      toast.success("Verification link copied to clipboard.");
    } catch {
      toast.error("Clipboard access denied. Copy the URL from your address bar.");
    }
  }

  return (
    <div className="certum-box mt-3 p-3 p-sm-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="fw-bold">Export & Share Verified Card</div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="certum-btn certum-btn-primary"
            style={{ minHeight: "44px", padding: "0 1.15rem" }}
            disabled={busyAction !== null}
            onClick={handleDownloadPng}
          >
            <i className="bi bi-download" aria-hidden="true" />
            {busyAction === "png" ? "Rendering..." : "Download PNG"}
          </button>
          <button
            type="button"
            className="certum-btn certum-btn-amber"
            style={{ minHeight: "44px", padding: "0 1.15rem" }}
            disabled={busyAction !== null}
            onClick={handleNativeShare}
          >
            <i className="bi bi-share" aria-hidden="true" />
            {busyAction === "share" ? "Sharing..." : "Share Image"}
          </button>
          <button
            type="button"
            className="certum-btn certum-btn-ghost"
            style={{ minHeight: "44px", padding: "0 1.15rem" }}
            onClick={handleCopyLink}
          >
            <i className="bi bi-copy" aria-hidden="true" />
            Copy Link
          </button>
          <a
            className="certum-btn certum-btn-ghost"
            style={{ minHeight: "44px", padding: "0 1.15rem" }}
            href={social.x}
            target="_blank"
            rel="noreferrer"
          >
            <i className="bi bi-twitter-x" aria-hidden="true" />
            Post
          </a>
          <a
            className="certum-btn certum-btn-ghost"
            style={{ minHeight: "44px", padding: "0 1.15rem" }}
            href={social.linkedin}
            target="_blank"
            rel="noreferrer"
          >
            <i className="bi bi-linkedin" aria-hidden="true" />
            LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}
