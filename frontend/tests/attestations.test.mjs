import assert from "node:assert/strict";
import { test } from "node:test";
import { address } from "@solana/kit";
import {
  findAttestationPda,
  findCredentialPda,
  findSchemaPda,
  SchemaDataType,
  SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
} from "@solana/attestation";
import {
  CREDENTIAL_NAME,
  LEGACY_PUBLIC_CREDENTIAL_FIELDS,
  LEGACY_PUBLIC_CREDENTIAL_LAYOUT,
  PUBLIC_CREDENTIAL_FIELDS,
  PUBLIC_CREDENTIAL_LAYOUT,
  SCHEMA_NAME,
  SCHEMA_VERSION,
  deserializePublicCredential,
  evaluateVerificationFacts,
  expiryToUnixSeconds,
  serializePublicCredential,
  validatePublicCredentialData,
} from "../src/services/attestations.ts";
import { serializeAttestationData } from "@solana/attestation";

const issuer = address("11111111111111111111111111111111");
const nonce = address("SysvarC1ock11111111111111111111111111111111");
const credentialData = {
  category: "Academic Degree",
  title: "Bachelor of Science in Computer Engineering",
  issuerDisplayName: "Universidad Nacional de Cordoba",
  recipientDisplayName: "Elena Navarro",
  issueDate: "2026-11-28",
  expiryDate: "",
  description: "Completed the computer engineering curriculum.",
};

async function createVerificationFacts(overrides = {}) {
  const [credentialAddress] = await findCredentialPda({
    authority: issuer,
    name: CREDENTIAL_NAME,
  });
  const [schemaAddress] = await findSchemaPda({
    credential: credentialAddress,
    name: SCHEMA_NAME,
    version: SCHEMA_VERSION,
  });
  const schema = {
    discriminator: 0,
    credential: credentialAddress,
    name: SCHEMA_NAME,
    description: "Public credential fields",
    layout: [...PUBLIC_CREDENTIAL_LAYOUT],
    fieldNames: [...PUBLIC_CREDENTIAL_FIELDS],
    isPaused: false,
    version: SCHEMA_VERSION,
  };
  const attestation = {
    discriminator: 0,
    nonce,
    credential: credentialAddress,
    schema: schemaAddress,
    data: serializePublicCredential(schema, credentialData),
    signer: issuer,
    expiry: 0n,
    tokenAccount: address("11111111111111111111111111111111"),
  };
  const [attestationAddress] = await findAttestationPda({
    credential: credentialAddress,
    schema: schemaAddress,
    nonce,
  });
  return {
    attestationAddress,
    attestationOwner: SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
    attestation,
    credentialAddress,
    credentialOwner: SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
    credential: {
      discriminator: 0,
      authority: issuer,
      name: new TextEncoder().encode(CREDENTIAL_NAME),
      authorizedSigners: [issuer],
    },
    schemaAddress,
    schemaOwner: SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
    schema,
    ...overrides,
  };
}

test("credential data round-trips through the expected public SAS schema", () => {
  const schema = {
    discriminator: 0,
    credential: issuer,
    name: SCHEMA_NAME,
    description: "Public credential fields",
    layout: [...PUBLIC_CREDENTIAL_LAYOUT],
    fieldNames: [...PUBLIC_CREDENTIAL_FIELDS],
    isPaused: false,
    version: SCHEMA_VERSION,
  };

  assert.deepEqual(
    deserializePublicCredential(
      schema,
      serializePublicCredential(schema, credentialData),
    ),
    credentialData,
  );
  assert.ok(PUBLIC_CREDENTIAL_LAYOUT.every((field) => field === SchemaDataType.String));
});

test("credential input validates dates and expiry timestamps", () => {
  assert.throws(
    () => validatePublicCredentialData({ ...credentialData, issueDate: "2026-02-31" }),
    /valid calendar date/,
  );
  assert.throws(
    () =>
      validatePublicCredentialData({
        ...credentialData,
        expiryDate: "2026-11-27",
      }),
    /cannot be before the issue date/,
  );
  assert.throws(
    () => expiryToUnixSeconds("2026-11-27", Date.parse("2026-11-28T12:00:00Z")),
    /must be in the future/,
  );
  assert.equal(expiryToUnixSeconds("", Date.parse("2026-11-28T12:00:00Z")), 0n);
});

test("verification passes only when SAS owners, credential links, signer, and schema match", async () => {
  const facts = await createVerificationFacts();
  const result = await evaluateVerificationFacts(facts, 1_798_000_000n);

  assert.equal(result.status, "valid");
  assert.equal(result.signerAddress, issuer);
  assert.deepEqual(result.credential, credentialData);
  assert.equal(result.metadata?.schemaName, SCHEMA_NAME);

  const wrongOwner = await evaluateVerificationFacts(
    {
      ...facts,
      schemaOwner: address("11111111111111111111111111111111"),
    },
    1_798_000_000n,
  );
  assert.equal(wrongOwner.status, "invalid");

  const wrongSigner = await evaluateVerificationFacts(
    {
      ...facts,
      attestation: {
        ...facts.attestation,
        signer: address("SysvarRent111111111111111111111111111111111"),
      },
    },
    1_798_000_000n,
  );
  assert.equal(wrongSigner.status, "invalid");
});

test("expired attestations retain their decoded details but fail expiry validation", async () => {
  const facts = await createVerificationFacts();
  const expiredData = {
    ...credentialData,
    issueDate: "2023-11-10",
    expiryDate: "2023-11-14",
  };
  facts.attestation.data = serializePublicCredential(facts.schema, expiredData);
  facts.attestation.expiry = 1_700_006_399n;
  const result = await evaluateVerificationFacts(facts, 1_800_000_000n);

  assert.equal(result.status, "expired");
  assert.deepEqual(result.credential, expiredData);
});

test("verification rejects expiry text that disagrees with the SAS timestamp", async () => {
  const facts = await createVerificationFacts();
  facts.attestation.data = serializePublicCredential(facts.schema, {
    ...credentialData,
    expiryDate: "2026-12-01",
  });
  const result = await evaluateVerificationFacts(facts, 1_798_000_000n);

  assert.equal(result.status, "invalid");
  assert.match(result.reason, /expiry date does not match/i);
});

test("verification rejects tokenized SAS attestations", async () => {
  const facts = await createVerificationFacts();
  facts.attestation.tokenAccount = address(
    "SysvarRent111111111111111111111111111111111",
  );
  const result = await evaluateVerificationFacts(facts, 1_798_000_000n);

  assert.equal(result.status, "invalid");
  assert.match(result.reason, /tokenized/i);
});

test("legacy 6-field v1 schema round-trips with default category", async () => {
  const [credentialAddress] = await findCredentialPda({
    authority: issuer,
    name: CREDENTIAL_NAME,
  });
  const [legacySchemaAddress] = await findSchemaPda({
    credential: credentialAddress,
    name: SCHEMA_NAME,
    version: SCHEMA_VERSION,
  });
  const legacySchema = {
    discriminator: 0,
    credential: credentialAddress,
    name: SCHEMA_NAME,
    description: "Legacy 6-field schema",
    layout: [...LEGACY_PUBLIC_CREDENTIAL_LAYOUT],
    fieldNames: [...LEGACY_PUBLIC_CREDENTIAL_FIELDS],
    isPaused: false,
    version: SCHEMA_VERSION,
  };
  const bytes = serializePublicCredential(legacySchema, credentialData);
  const decoded = deserializePublicCredential(legacySchema, bytes);
  assert.equal(decoded.category, "Academic Degree");
  assert.equal(decoded.title, credentialData.title);
  assert.ok(legacySchemaAddress);
});
