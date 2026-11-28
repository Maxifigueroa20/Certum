import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { solanaV1Client } from "../providers/SolanaProvider";
import {
  SAMPLE_VERIFICATION_RESULT,
  verifyAttestation,
  type VerificationResult,
} from "../services/attestations";

export function extractAddressFromLookup(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const queryParam = url.searchParams.get("attestation");
    if (queryParam) return queryParam;
    const match = url.pathname.match(/\/verify\/([^/]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
    return trimmed;
  } catch {
    return trimmed;
  }
}

export function useVerification(initialQueryAddress = "") {
  const navigate = useNavigate();
  const [lookup, setLookup] = useState(initialQueryAddress);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isSamplePreview, setIsSamplePreview] = useState(false);
  const requestIdRef = useRef(0);

  async function runVerification(rawInput = lookup) {
    const candidate = extractAddressFromLookup(rawInput);
    if (!candidate) {
      const msg = "Enter a Solana Attestation Service PDA or paste a Certum link.";
      setError(msg);
      toast.error(msg);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setError(null);
    setIsSamplePreview(false);
    setResult(null);
    setIsVerifying(true);
    try {
      const verified = await verifyAttestation(solanaV1Client.rpc, candidate);
      if (currentRequestId !== requestIdRef.current) return;
      setResult(verified);
      navigate(`/verify/${encodeURIComponent(verified.attestationAddress)}`, {
        replace: true,
      });
    } catch (cause) {
      if (currentRequestId !== requestIdRef.current) return;
      const msg =
        cause instanceof Error ? cause.message : "Could not verify SAS address.";
      setError(msg);
      toast.error(msg);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsVerifying(false);
      }
    }
  }

  function loadSamplePreview() {
    requestIdRef.current += 1;
    setIsVerifying(false);
    setError(null);
    setIsSamplePreview(true);
    setLookup(SAMPLE_VERIFICATION_RESULT.attestationAddress);
    setResult({ ...SAMPLE_VERIFICATION_RESULT });
  }

  function clearVerification() {
    setError(null);
    setResult(null);
    setIsSamplePreview(false);
  }

  useEffect(() => {
    if (!initialQueryAddress) return;
    setLookup(initialQueryAddress);
    void runVerification(initialQueryAddress);
  }, [initialQueryAddress]);

  return {
    lookup,
    setLookup,
    isVerifying,
    error,
    result,
    isSamplePreview,
    runVerification,
    loadSamplePreview,
    clearVerification,
    clearError: () => setError(null),
  };
}
