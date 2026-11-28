import type { VerificationResult } from "./attestations";

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
  ctx.closePath();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fillStyle: string,
  borderStyle?: string,
) {
  drawRoundedRect(ctx, x, y, width, height, height / 2);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (borderStyle) {
    ctx.strokeStyle = borderStyle;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export async function renderCredentialCardBlob(
  result: VerificationResult,
): Promise<Blob> {
  if (!result.credential) {
    throw new Error("Credential details are required to render a snapshot.");
  }

  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with fallback fonts if FontLoadingSet fails
    }
  }

  const logicalWidth = 1200;
  const logicalHeight = 675;
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas rendering is unavailable in this browser.");
  }
  ctx.scale(scale, scale);

  const sansFont = '"Onest Variable", system-ui, -apple-system, sans-serif';
  const monoFont = '"JetBrains Mono Variable", Consolas, Menlo, monospace';
  const isValid = result.status === "valid";

  // Outer Obsidian Ink frame
  ctx.fillStyle = "#10141D";
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // Subtle structural grid accents on outer frame
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, logicalWidth - 36, logicalHeight - 36);

  // Main raised card surface
  drawRoundedRect(ctx, 36, 36, 1128, 603, 24);
  ctx.fillStyle = "#181E2A";
  ctx.fill();
  ctx.strokeStyle = "#2A3346";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Clip inner header band to top rounded corners
  ctx.save();
  drawRoundedRect(ctx, 36, 36, 1128, 603, 24);
  ctx.clip();

  // Top Royal Blue architectural header band
  ctx.fillStyle = "#1B3B8B";
  ctx.fillRect(36, 36, 1128, 84);
  ctx.fillStyle = "#F5B731";
  ctx.fillRect(36, 118, 1128, 3);
  ctx.restore();

  // Brand mark inside header
  drawRoundedRect(ctx, 68, 57, 42, 42, 11);
  ctx.fillStyle = "#F5B731";
  ctx.fill();
  ctx.fillStyle = "#10141D";
  ctx.font = `800 22px ${sansFont}`;
  ctx.textAlign = "center";
  ctx.fillText("C", 89, 86);
  ctx.textAlign = "left";

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 22px ${sansFont}`;
  ctx.fillText("Certum", 124, 77);
  ctx.fillStyle = "#DBE4FF";
  ctx.font = `600 11px ${monoFont}`;
  ctx.fillText("SOLANA ATTESTATION SERVICE · DEVNET", 124, 96);

  // Verification status pill badge
  const badgeText = isValid
    ? "VERIFIED ON SOLANA SAS"
    : result.status.toUpperCase();
  const badgeBg = isValid ? "#F5B731" : "#FBEAEA";
  const badgeTextColor = isValid ? "#10141D" : "#8B1E1E";
  drawPill(ctx, 856, 59, 274, 38, badgeBg);
  ctx.fillStyle = badgeTextColor;
  ctx.font = `800 13px ${sansFont}`;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, 993, 83);
  ctx.textAlign = "left";

  // Category pill + Issuer uppercase label
  const categoryText = (result.credential.category || "Academic Degree").toUpperCase();
  ctx.font = `700 12px ${sansFont}`;
  const catWidth = Math.min(230, Math.max(130, ctx.measureText(categoryText).width + 28));
  drawPill(ctx, 68, 146, catWidth, 28, "rgba(27, 59, 139, 0.42)", "rgba(138, 180, 255, 0.35)");
  ctx.fillStyle = "#DBE4FF";
  ctx.textAlign = "center";
  ctx.fillText(categoryText, 68 + catWidth / 2, 164);
  ctx.textAlign = "left";

  ctx.fillStyle = "#F5B731";
  ctx.font = `800 15px ${sansFont}`;
  ctx.fillText(result.credential.issuerDisplayName.toUpperCase(), 68 + catWidth + 16, 165);

  // Credential Title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 35px ${sansFont}`;
  const titleLines = wrapCanvasText(ctx, result.credential.title, 1050, 2);
  let y = 216;
  for (const line of titleLines) {
    ctx.fillText(line, 68, y);
    y += 42;
  }

  // Description
  y += 6;
  ctx.fillStyle = "#CBD5E1";
  ctx.font = `500 16px ${sansFont}`;
  const descLines = wrapCanvasText(ctx, result.credential.description, 1050, 2);
  for (const line of descLines) {
    ctx.fillText(line, 68, y);
    y += 24;
  }

  // Two-column Bento Metadata Row
  const bentoY = 342;
  const bentoH = 104;

  // Left Bento: Recipient
  drawRoundedRect(ctx, 68, bentoY, 540, bentoH, 16);
  ctx.fillStyle = "#10141D";
  ctx.fill();
  ctx.strokeStyle = "#2A3346";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#9DA8BC";
  ctx.font = `700 11px ${monoFont}`;
  ctx.fillText("ISSUED TO RECIPIENT", 90, bentoY + 30);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 26px ${sansFont}`;
  ctx.fillText(result.credential.recipientDisplayName, 90, bentoY + 70);

  // Right Bento: Issue Date / Expiry / Schema
  drawRoundedRect(ctx, 624, bentoY, 506, bentoH, 16);
  ctx.fillStyle = "#10141D";
  ctx.fill();
  ctx.strokeStyle = "#2A3346";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#9DA8BC";
  ctx.font = `700 11px ${monoFont}`;
  ctx.fillText("ISSUE DATE", 648, bentoY + 32);
  ctx.fillText("EXPIRY", 812, bentoY + 32);
  ctx.fillText("SCHEMA", 974, bentoY + 32);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 17px ${sansFont}`;
  ctx.fillText(result.credential.issueDate, 648, bentoY + 66);
  ctx.fillText(result.credential.expiryDate || "No expiry", 812, bentoY + 66);
  const schemaLabel = result.metadata
    ? `SAS v${result.metadata.schemaVersion}`
    : "SAS v1";
  ctx.fillStyle = "#F5B731";
  ctx.fillText(schemaLabel, 974, bentoY + 66);

  // Bottom On-Chain Proof Panel
  const proofY = 466;
  const proofH = 144;
  drawRoundedRect(ctx, 68, proofY, 804, proofH, 16);
  ctx.fillStyle = "#10141D";
  ctx.fill();
  ctx.strokeStyle = "#2A3346";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Proof rows
  const drawProofRow = (
    rowY: number,
    label: string,
    value: string,
    accent: string,
  ) => {
    drawPill(ctx, 88, rowY - 16, 152, 24, "#181E2A", "#2A3346");
    ctx.fillStyle = "#9DA8BC";
    ctx.font = `700 10px ${monoFont}`;
    ctx.textAlign = "center";
    ctx.fillText(label, 164, rowY);
    ctx.textAlign = "left";

    ctx.fillStyle = accent;
    ctx.font = `500 13px ${monoFont}`;
    ctx.fillText(value, 256, rowY);
  };

  drawProofRow(proofY + 36, "ATTESTATION PDA", result.attestationAddress, "#F5B731");
  drawProofRow(
    proofY + 76,
    "AUTHORIZED SIGNER",
    result.signerAddress ?? "N/A",
    "#FFFFFF",
  );
  drawProofRow(
    proofY + 116,
    "SCHEMA PDA",
    result.schemaAddress ?? "N/A",
    "#9DA8BC",
  );

  // Right-side Royal Verification Seal Box
  drawRoundedRect(ctx, 890, proofY, 240, proofH, 16);
  ctx.fillStyle = "#1B3B8B";
  ctx.fill();
  ctx.strokeStyle = "#F5B731";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#F5B731";
  ctx.font = `800 11px ${monoFont}`;
  ctx.textAlign = "center";
  ctx.fillText("CRYPTOGRAPHIC PROOF", 1010, proofY + 38);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 20px ${sansFont}`;
  ctx.fillText(isValid ? "Authentic" : "Flagged", 1010, proofY + 74);

  ctx.fillStyle = "#DBE4FF";
  ctx.font = `500 12px ${sansFont}`;
  ctx.fillText("Verified via Solana", 1010, proofY + 102);
  ctx.fillText("Attestation Service", 1010, proofY + 120);
  ctx.textAlign = "left";

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not encode credential snapshot as PNG."));
      }
    }, "image/png");
  });
}

export async function downloadCredentialSnapshotPng(
  result: VerificationResult,
): Promise<void> {
  const blob = await renderCredentialCardBlob(result);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `certum-attestation-${result.attestationAddress.slice(0, 8)}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildVerificationShareUrl(attestationAddress: string): string {
  return `${window.location.origin}/verify/${encodeURIComponent(attestationAddress)}`;
}

export async function shareCredentialSnapshot(
  result: VerificationResult,
): Promise<"shared" | "downloaded"> {
  const shareUrl = buildVerificationShareUrl(result.attestationAddress);
  const title = result.credential?.title ?? "Certum SAS Credential";
  const text = `Verified Solana Attestation Service credential (${result.attestationAddress})`;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const blob = await renderCredentialCardBlob(result);
      const file = new File(
        [blob],
        `certum-attestation-${result.attestationAddress.slice(0, 8)}.png`,
        { type: "image/png" },
      );
      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ title, text, url: shareUrl, files: [file] });
        return "shared";
      }
      await navigator.share({ title, text, url: shareUrl });
      return "shared";
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") {
        return "shared";
      }
    }
  }

  await downloadCredentialSnapshotPng(result);
  return "downloaded";
}

export function getSocialShareUrls(result: VerificationResult) {
  const shareUrl = buildVerificationShareUrl(result.attestationAddress);
  const title = result.credential?.title ?? "Solana Attestation";
  const issuer = result.credential?.issuerDisplayName ?? "Certum";
  const summary = `Verified "${title}" issued by ${issuer} on Solana Attestation Service (PDA: ${result.attestationAddress})`;

  return {
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(summary)}&url=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    shareUrl,
  };
}
