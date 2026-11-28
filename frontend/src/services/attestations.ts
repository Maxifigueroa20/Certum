import {
  decodeAttestation,
  decodeCredential,
  decodeSchema,
  getAttestationEncoder,
  getCredentialEncoder,
  getSchemaEncoder,
  findAttestationPda,
  findCredentialPda,
  findSchemaPda,
  getCreateAttestationInstruction,
  getCreateCredentialInstruction,
  getCreateSchemaInstruction,
  SchemaDataType,
  deserializeAttestationData,
  serializeAttestationData,
  SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS,
  type Attestation,
  type Credential,
  type Schema,
} from "@solana/attestation";
import {
  address,
  fetchEncodedAccount,
  generateKeyPairSigner,
  isAddress,
  type Address,
  type Account,
  type Instruction,
} from "@solana/kit";

export const CREDENTIAL_NAME = "Certum Public Credentials";
export const SCHEMA_NAME = "Public Credential";
export const SCHEMA_VERSION = 1;
export const SAS_PROGRAM_ID = SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS;
const NO_TOKEN_ACCOUNT = address("11111111111111111111111111111111");

export const PUBLIC_CREDENTIAL_FIELDS = [
  "category",
  "title",
  "issuerDisplayName",
  "recipientDisplayName",
  "issueDate",
  "expiryDate",
  "description",
] as const;

export const LEGACY_PUBLIC_CREDENTIAL_FIELDS = [
  "title",
  "issuerDisplayName",
  "recipientDisplayName",
  "issueDate",
  "expiryDate",
  "description",
] as const;

export const PUBLIC_CREDENTIAL_LAYOUT = PUBLIC_CREDENTIAL_FIELDS.map(
  () => SchemaDataType.String,
);

export const LEGACY_PUBLIC_CREDENTIAL_LAYOUT = LEGACY_PUBLIC_CREDENTIAL_FIELDS.map(
  () => SchemaDataType.String,
);

export type PublicCredentialData = {
  category: string;
  title: string;
  issuerDisplayName: string;
  recipientDisplayName: string;
  issueDate: string;
  expiryDate: string;
  description: string;
};

export type CredentialCategory = {
  id: string;
  label: string;
  issuerHint: string;
  titleHint: string;
  summaryHint: string;
  sample: PublicCredentialData;
};

export const CREDENTIAL_CATEGORIES: CredentialCategory[] = [
  {
    id: "academic-degree",
    label: "Academic Degree",
    issuerHint: "e.g. National University or Faculty of Engineering",
    titleHint: "e.g. Bachelor of Science in Computer Engineering",
    summaryHint:
      "Academic credits completed, thesis distinction, or faculty board review.",
    sample: {
      category: "Academic Degree",
      title: "Bachelor of Science in Computer Engineering",
      issuerDisplayName: "Universidad Nacional de Cordoba",
      recipientDisplayName: "Elena Navarro",
      issueDate: "2026-11-28",
      expiryDate: "",
      description:
        "Awarded upon completion of 240 academic credits, distributed systems capstone, and faculty board review.",
    },
  },
  {
    id: "bootcamp-cohort",
    label: "Bootcamp & Cohort",
    issuerHint: "e.g. Solana Labs Fellowship or Private Academy",
    titleHint: "e.g. Rust & Solana Protocol Engineering Cohort",
    summaryHint:
      "Intensive technical cohort, capstone project, or organization training track.",
    sample: {
      category: "Bootcamp & Cohort",
      title: "Solana Protocol Engineering Fellowship",
      issuerDisplayName: "Andes Web3 Bootcamp",
      recipientDisplayName: "Mateo Silva",
      issueDate: "2026-11-28",
      expiryDate: "2029-11-28",
      description:
        "Completed 12-week technical cohort covering Anchor security, PDA derivation, and production dApp deployment.",
    },
  },
  {
    id: "professional-license",
    label: "Professional License",
    issuerHint: "e.g. Certum Accreditation Board or Security Guild",
    titleHint: "e.g. Certified Solana Protocol Auditor",
    summaryHint:
      "Competency exam, peer audit standards, or industry accreditation scope.",
    sample: {
      category: "Professional License",
      title: "Certified Solana Protocol Auditor",
      issuerDisplayName: "Certum Accreditation Board",
      recipientDisplayName: "Liam O'Connor",
      issueDate: "2026-11-28",
      expiryDate: "2028-11-28",
      description:
        "Verified competency in Anchor program verification, PDA seed validation, and CPI access control patterns.",
    },
  },
  {
    id: "public-civic",
    label: "Public & Civic Record",
    issuerHint: "e.g. Ministry of Digital Innovation or Municipal Registry",
    titleHint: "e.g. Authorized Digital Notary Accreditation",
    summaryHint:
      "Public agency mandate, municipal registry scope, or civic program authorization.",
    sample: {
      category: "Public & Civic Record",
      title: "Municipal Open-Data & Digital Registry Delegate",
      issuerDisplayName: "Secretariat of Digital Modernization",
      recipientDisplayName: "Sofia Alvarez",
      issueDate: "2026-11-28",
      expiryDate: "2030-11-28",
      description:
        "Authorized public-sector delegate for verifiable municipal records and inter-agency credential audits.",
    },
  },
];

export type CredentialPreset = {
  id: string;
  label: string;
  data: PublicCredentialData;
};

export const CREDENTIAL_PRESETS: CredentialPreset[] = CREDENTIAL_CATEGORIES.map(
  (item) => ({
    id: item.id,
    label: item.label,
    data: item.sample,
  }),
);

export type IssuancePlan = {
  instructions: Instruction[];
  accountSpaces: {
    credential: number | null;
    schema: number | null;
    attestation: number;
  };
  attestationAddress: Address;
  credentialAddress: Address;
  schemaAddress: Address;
  signerAddress: Address;
  createsCredential: boolean;
  createsSchema: boolean;
};

export type VerificationStatus = "valid" | "expired" | "invalid" | "not-found";

export type VerificationMetadata = {
  programOwner: Address;
  credentialName: string;
  credentialAuthority: Address;
  authorizedSignersCount: number;
  schemaName: string;
  schemaVersion: number;
  schemaDescription: string;
  isPaused: boolean;
  isTokenized: boolean;
  nonce: Address;
};

export type VerificationResult = {
  status: VerificationStatus;
  reason: string;
  attestationAddress: Address;
  signerAddress?: Address;
  credentialAddress?: Address;
  schemaAddress?: Address;
  expiry?: bigint;
  credential?: PublicCredentialData;
  metadata?: VerificationMetadata;
};

export const SAMPLE_VERIFICATION_RESULT: VerificationResult = {
  status: "valid",
  reason: "SAS account ownership, credential, schema, signer, and expiry checks passed.",
  attestationAddress: address("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"),
  signerAddress: address("4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T"),
  credentialAddress: address("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm"),
  schemaAddress: address("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"),
  expiry: 0n,
  credential: {
    category: "Academic Degree",
    title: "Bachelor of Science in Computer Engineering",
    issuerDisplayName: "Universidad Nacional de Cordoba",
    recipientDisplayName: "Elena Navarro",
    issueDate: "2026-11-28",
    expiryDate: "",
    description:
      "Awarded upon completion of 240 academic credits, distributed systems capstone, and faculty board review.",
  },
  metadata: {
    programOwner: SAS_PROGRAM_ID,
    credentialName: CREDENTIAL_NAME,
    credentialAuthority: address("4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T"),
    authorizedSignersCount: 1,
    schemaName: SCHEMA_NAME,
    schemaVersion: SCHEMA_VERSION,
    schemaDescription: "Public fields for a Certum credential attestation.",
    isPaused: false,
    isTokenized: false,
    nonce: address("SysvarC1ock11111111111111111111111111111111"),
  },
};

type SasRpc = Parameters<typeof fetchEncodedAccount>[0];

export function validatePublicCredentialData(
  input: PublicCredentialData,
): PublicCredentialData {
  const fields: Array<keyof PublicCredentialData> = [
    "category",
    "title",
    "issuerDisplayName",
    "recipientDisplayName",
    "issueDate",
    "expiryDate",
    "description",
  ];
  const limits: Record<keyof PublicCredentialData, number> = {
    category: 60,
    title: 120,
    issuerDisplayName: 120,
    recipientDisplayName: 120,
    issueDate: 10,
    expiryDate: 10,
    description: 280,
  };
  const normalized = {} as PublicCredentialData;

  for (const field of fields) {
    const value = input[field].trim();
    if (field !== "expiryDate" && value.length === 0) {
      throw new Error(`${fieldLabel(field)} is required.`);
    }
    if (value.length > limits[field]) {
      throw new Error(`${fieldLabel(field)} must be ${limits[field]} characters or fewer.`);
    }
    normalized[field] = value;
  }

  if (!isCalendarDate(normalized.issueDate)) {
    throw new Error("Issue date must be a valid calendar date.");
  }
  if (normalized.expiryDate && !isCalendarDate(normalized.expiryDate)) {
    throw new Error("Expiry date must be a valid calendar date.");
  }
  if (
    normalized.expiryDate &&
    normalized.expiryDate < normalized.issueDate
  ) {
    throw new Error("Expiry date cannot be before the issue date.");
  }

  return normalized;
}

export function expiryToUnixSeconds(
  expiryDate: string,
  nowMilliseconds = Date.now(),
): bigint {
  const expiresAt = expiryDateToUnixSeconds(expiryDate);
  if (expiresAt === 0n) return expiresAt;
  if (expiresAt <= BigInt(Math.floor(nowMilliseconds / 1000))) {
    throw new Error("Expiry date must be in the future.");
  }
  return expiresAt;
}

export function serializePublicCredential(
  schema: Schema,
  input: PublicCredentialData,
): Uint8Array {
  assertExpectedSchema(schema);
  const data = validatePublicCredentialData(input);
  if (schema.fieldNames.length === LEGACY_PUBLIC_CREDENTIAL_FIELDS.length) {
    const { category: _ignored, ...legacyData } = data;
    return serializeAttestationData(schema, legacyData);
  }
  return serializeAttestationData(schema, data);
}

export function deserializePublicCredential(
  schema: Schema,
  bytes: Uint8Array,
): PublicCredentialData {
  assertExpectedSchema(schema);
  if (schema.fieldNames.length === LEGACY_PUBLIC_CREDENTIAL_FIELDS.length) {
    const legacy = deserializeAttestationData<Omit<PublicCredentialData, "category">>(
      schema,
      bytes,
    );
    return validatePublicCredentialData({
      category: CREDENTIAL_CATEGORIES[0].label,
      ...legacy,
    });
  }
  const decoded = deserializeAttestationData<PublicCredentialData>(schema, bytes);
  return validatePublicCredentialData(decoded);
}

export async function prepareIssuance(
  rpc: SasRpc,
  payer: Parameters<typeof getCreateCredentialInstruction>[0]["payer"],
  authority: Parameters<typeof getCreateCredentialInstruction>[0]["authority"],
  input: PublicCredentialData,
  nowMilliseconds = Date.now(),
): Promise<IssuancePlan> {
  const data = validatePublicCredentialData(input);
  const expiry = expiryToUnixSeconds(data.expiryDate, nowMilliseconds);
  const credentialAddress = (
    await findCredentialPda({
      authority: authority.address,
      name: CREDENTIAL_NAME,
    })
  )[0];
  const schemaAddress = (
    await findSchemaPda({
      credential: credentialAddress,
      name: SCHEMA_NAME,
      version: SCHEMA_VERSION,
    })
  )[0];

  const credentialAccount = await fetchEncodedAccount(rpc, credentialAddress);
  if (
    credentialAccount.exists &&
    credentialAccount.programAddress !== SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS
  ) {
    throw new Error("The issuer credential address is owned by an unexpected program.");
  }
  const credential = credentialAccount.exists
    ? decodeCredential(credentialAccount)
    : null;

  if (credential) {
    assertIssuerCredential(credential.data, authority.address);
  }

  const schemaAccount = await fetchEncodedAccount(rpc, schemaAddress);
  if (
    schemaAccount.exists &&
    schemaAccount.programAddress !== SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS
  ) {
    throw new Error("The credential schema address is owned by an unexpected program.");
  }
  const schema = schemaAccount.exists ? decodeSchema(schemaAccount) : null;

  if (schema) {
    assertExpectedSchema(schema.data);
    if (schema.data.credential !== credentialAddress) {
      throw new Error("The existing schema is linked to a different credential.");
    }
    if (schema.data.isPaused) {
      throw new Error("This issuer schema is paused and cannot receive attestations.");
    }
  }

  const schemaData =
    schema?.data ??
    ({
      discriminator: 0,
      credential: credentialAddress,
      name: SCHEMA_NAME,
      description: "Public fields for a Certum credential attestation.",
      layout: PUBLIC_CREDENTIAL_LAYOUT,
      fieldNames: [...PUBLIC_CREDENTIAL_FIELDS],
      isPaused: false,
      version: SCHEMA_VERSION,
    } satisfies Schema);

  const nonce = (await generateKeyPairSigner()).address;
  const attestationAddress = (
    await findAttestationPda({
      credential: credentialAddress,
      schema: schemaAddress,
      nonce,
    })
  )[0];
  const instructions: Instruction[] = [];
  const attestationData = serializePublicCredential(schemaData, data);

  if (!credential) {
    instructions.push(
      getCreateCredentialInstruction({
        payer,
        credential: credentialAddress,
        authority,
        name: CREDENTIAL_NAME,
        signers: [authority.address],
      }),
    );
  }
  if (!schema) {
    instructions.push(
      getCreateSchemaInstruction({
        payer,
        authority,
        credential: credentialAddress,
        schema: schemaAddress,
        name: SCHEMA_NAME,
        description: schemaData.description,
        layout: [...PUBLIC_CREDENTIAL_LAYOUT],
        fieldNames: [...PUBLIC_CREDENTIAL_FIELDS],
      }),
    );
  }
  instructions.push(
    getCreateAttestationInstruction({
      payer,
      authority,
      credential: credentialAddress,
      schema: schemaAddress,
      attestation: attestationAddress,
      nonce,
      expiry,
      data: attestationData,
    }),
  );

  return {
    instructions,
    accountSpaces: {
      credential: credential
        ? null
        : getCredentialEncoder().encode({
            discriminator: 0,
            authority: authority.address,
            name: new TextEncoder().encode(CREDENTIAL_NAME),
            authorizedSigners: [authority.address],
          }).length,
      schema: schema
        ? null
        : getSchemaEncoder().encode(schemaData).length,
      attestation: getAttestationEncoder().encode({
        discriminator: 0,
        nonce,
        credential: credentialAddress,
        schema: schemaAddress,
        data: attestationData,
        signer: authority.address,
        expiry,
        tokenAccount: NO_TOKEN_ACCOUNT,
      }).length,
    },
    attestationAddress,
    credentialAddress,
    schemaAddress,
    signerAddress: authority.address,
    createsCredential: credential === null,
    createsSchema: schema === null,
  };
}

export async function verifyAttestation(
  rpc: SasRpc,
  input: string,
  nowSeconds = BigInt(Math.floor(Date.now() / 1000)),
): Promise<VerificationResult> {
  const attestationAddress = parseAddress(input);
  const attestationAccount = await fetchEncodedAccount(rpc, attestationAddress);
  if (!attestationAccount.exists) {
    return {
      status: "not-found",
      reason: "No account exists at this attestation address on Solana Devnet.",
      attestationAddress,
    };
  }
  if (
    attestationAccount.programAddress !== SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS
  ) {
    return invalidResult(
      attestationAddress,
      "The attestation account is not owned by the Solana Attestation Service program.",
    );
  }

  let attestation: Account<Attestation>;
  try {
    attestation = decodeAttestation(attestationAccount);
  } catch (cause) {
    return invalidResult(
      attestationAddress,
      `The SAS attestation account could not be decoded: ${errorMessage(cause)}`,
    );
  }

  const [expectedAttestationAddress] = await findAttestationPda({
    credential: attestation.data.credential,
    schema: attestation.data.schema,
    nonce: attestation.data.nonce,
  });
  if (expectedAttestationAddress !== attestationAddress) {
    return invalidResult(
      attestationAddress,
      "The account address does not match the SAS attestation seeds.",
      attestation.data.signer,
      attestation.data.credential,
      attestation.data.schema,
    );
  }

  const credentialAccount = await fetchEncodedAccount(
    rpc,
    attestation.data.credential,
  );
  if (!credentialAccount.exists) {
    return invalidResult(
      attestationAddress,
      "The linked SAS credential account does not exist.",
      attestation.data.signer,
      attestation.data.credential,
      attestation.data.schema,
    );
  }
  if (
    credentialAccount.programAddress !== SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS
  ) {
    return invalidResult(
      attestationAddress,
      "The linked credential is not owned by the Solana Attestation Service program.",
      attestation.data.signer,
      attestation.data.credential,
      attestation.data.schema,
    );
  }

  const schemaAccount = await fetchEncodedAccount(rpc, attestation.data.schema);
  if (!schemaAccount.exists) {
    return invalidResult(
      attestationAddress,
      "The linked SAS schema account does not exist.",
      attestation.data.signer,
      attestation.data.credential,
      attestation.data.schema,
    );
  }
  if (schemaAccount.programAddress !== SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS) {
    return invalidResult(
      attestationAddress,
      "The linked schema is not owned by the Solana Attestation Service program.",
      attestation.data.signer,
      attestation.data.credential,
      attestation.data.schema,
    );
  }

  let credential: Account<Credential>;
  let schema: Account<Schema>;
  try {
    credential = decodeCredential(credentialAccount);
    schema = decodeSchema(schemaAccount);
  } catch (cause) {
    return invalidResult(
      attestationAddress,
      `A linked SAS account could not be decoded: ${errorMessage(cause)}`,
      attestation.data.signer,
      attestation.data.credential,
      attestation.data.schema,
    );
  }

  return evaluateVerificationFacts(
    {
      attestationAddress,
      attestationOwner: attestationAccount.programAddress,
      attestation: attestation.data,
      credentialAddress: credential.address,
      credentialOwner: credentialAccount.programAddress,
      credential: credential.data,
      schemaAddress: schema.address,
      schemaOwner: schemaAccount.programAddress,
      schema: schema.data,
    },
    nowSeconds,
  );
}

export async function evaluateVerificationFacts(
  facts: {
    attestationAddress: Address;
    attestationOwner: Address;
    attestation: Attestation;
    credentialAddress: Address;
    credentialOwner: Address;
    credential: Credential;
    schemaAddress: Address;
    schemaOwner: Address;
    schema: Schema;
  },
  nowSeconds: bigint,
): Promise<VerificationResult> {
  const { attestation, credential, schema } = facts;
  const invalid = (reason: string) =>
    invalidResult(
      facts.attestationAddress,
      reason,
      attestation.signer,
      attestation.credential,
      attestation.schema,
    );

  if (
    facts.attestationOwner !== SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS ||
    facts.credentialOwner !== SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS ||
    facts.schemaOwner !== SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS
  ) {
    return invalid("One or more linked accounts have an unexpected program owner.");
  }

  const [expectedAttestationAddress] = await findAttestationPda({
    credential: attestation.credential,
    schema: attestation.schema,
    nonce: attestation.nonce,
  });
  if (expectedAttestationAddress !== facts.attestationAddress) {
    return invalid("The account address does not match the SAS attestation seeds.");
  }

  if (
    facts.credentialAddress !== attestation.credential ||
    facts.schemaAddress !== attestation.schema ||
    schema.credential !== attestation.credential
  ) {
    return invalid("The attestation, credential, and schema links do not match.");
  }
  if (attestation.tokenAccount !== NO_TOKEN_ACCOUNT) {
    return invalid("Tokenized SAS attestations are not supported.");
  }

  let credentialName: string;
  try {
    credentialName = new TextDecoder("utf-8", { fatal: true }).decode(
      credential.name,
    );
  } catch {
    return invalid("The credential name is not valid UTF-8 data.");
  }
  if (credentialName !== CREDENTIAL_NAME) {
    return invalid("The credential is not a Certum public credential.");
  }
  const [expectedCredentialAddress] = await findCredentialPda({
    authority: credential.authority,
    name: credentialName,
  });
  if (expectedCredentialAddress !== facts.credentialAddress) {
    return invalid("The credential address does not match its authority and name.");
  }
  if (!credential.authorizedSigners.includes(attestation.signer)) {
    return invalid("The attestation signer is not authorized by this credential.");
  }

  if (schema.name !== SCHEMA_NAME || schema.version !== SCHEMA_VERSION) {
    return invalid("The schema is not the expected Certum public credential schema.");
  }
  const [expectedSchemaAddress] = await findSchemaPda({
    credential: facts.credentialAddress,
    name: schema.name,
    version: schema.version,
  });
  if (expectedSchemaAddress !== facts.schemaAddress) {
    return invalid("The schema address does not match its credential, name, and version.");
  }
  if (schema.isPaused) {
    return invalid("This credential schema is paused.");
  }

  let data: PublicCredentialData;
  try {
    data = deserializePublicCredential(schema, new Uint8Array(attestation.data));
  } catch (cause) {
    return invalid(`Credential data does not match its schema: ${errorMessage(cause)}`);
  }
  if (expiryDateToUnixSeconds(data.expiryDate) !== attestation.expiry) {
    return invalid("The displayed expiry date does not match the SAS expiry timestamp.");
  }

  const expired = attestation.expiry !== 0n && nowSeconds >= attestation.expiry;

  return {
    status: expired ? "expired" : "valid",
    reason: expired
      ? "This SAS attestation has expired."
      : "SAS account ownership, credential, schema, signer, and expiry checks passed.",
    attestationAddress: facts.attestationAddress,
    signerAddress: attestation.signer,
    credentialAddress: facts.credentialAddress,
    schemaAddress: facts.schemaAddress,
    expiry: attestation.expiry,
    credential: data,
    metadata: {
      programOwner: facts.attestationOwner,
      credentialName,
      credentialAuthority: credential.authority,
      authorizedSignersCount: credential.authorizedSigners.length,
      schemaName: schema.name,
      schemaVersion: schema.version,
      schemaDescription: schema.description,
      isPaused: schema.isPaused,
      isTokenized: false,
      nonce: attestation.nonce,
    },
  };
}

export function parseAddress(input: string): Address {
  const value = input.trim();
  if (!isAddress(value)) {
    throw new Error("Enter a valid Solana attestation address.");
  }
  return address(value);
}

function assertIssuerCredential(
  credential: Credential,
  connectedAddress: Address,
): void {
  if (
    credential.authority !== connectedAddress ||
    new TextDecoder("utf-8", { fatal: true }).decode(credential.name) !==
      CREDENTIAL_NAME ||
    !credential.authorizedSigners.includes(connectedAddress)
  ) {
    throw new Error(
      "The existing credential is not controlled by this wallet as an authorized signer.",
    );
  }
}

function matchesSchemaLayout(
  schema: Schema,
  version: number,
  layout: readonly SchemaDataType[],
  fieldNames: readonly string[],
): boolean {
  return (
    schema.name === SCHEMA_NAME &&
    schema.version === version &&
    schema.layout.length === layout.length &&
    schema.layout.some((fieldType, index) => fieldType !== layout[index]) === false &&
    schema.fieldNames.length === fieldNames.length &&
    schema.fieldNames.some((fieldName, index) => fieldName !== fieldNames[index]) === false
  );
}

function assertExpectedSchema(schema: Schema): void {
  const isCurrent = matchesSchemaLayout(
    schema,
    SCHEMA_VERSION,
    PUBLIC_CREDENTIAL_LAYOUT,
    PUBLIC_CREDENTIAL_FIELDS,
  );
  const isLegacy = matchesSchemaLayout(
    schema,
    SCHEMA_VERSION,
    LEGACY_PUBLIC_CREDENTIAL_LAYOUT,
    LEGACY_PUBLIC_CREDENTIAL_FIELDS,
  );

  if (!isCurrent && !isLegacy) {
    throw new Error(
      "The existing schema does not match the expected public credential fields.",
    );
  }
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const milliseconds = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString().slice(0, 10) === value
  );
}

function expiryDateToUnixSeconds(expiryDate: string): bigint {
  if (!expiryDate) return 0n;
  if (!isCalendarDate(expiryDate)) {
    throw new Error("Expiry date must be a valid calendar date.");
  }
  const dayStart = Date.parse(`${expiryDate}T00:00:00.000Z`);
  return BigInt(Math.floor(dayStart / 1000) + 86_399);
}

function fieldLabel(field: keyof PublicCredentialData): string {
  const labels: Record<keyof PublicCredentialData, string> = {
    category: "Credential category",
    title: "Credential title",
    issuerDisplayName: "Issuer display name",
    recipientDisplayName: "Recipient display name",
    issueDate: "Issue date",
    expiryDate: "Expiry date",
    description: "Description",
  };
  return labels[field];
}

export type DiscoveredAttestation = {
  attestationAddress: Address;
  credentialAddress: Address;
  schemaAddress: Address;
  category: string;
  title: string;
  issuerDisplayName: string;
  recipientDisplayName: string;
  issuedAt: string;
};

function decodeBase64Bytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function fetchIssuerAttestations(
  rpcUrl: string,
  rpc: SasRpc,
  authorityAddress: Address,
): Promise<DiscoveredAttestation[]> {
  const [credentialAddress] = await findCredentialPda({
    authority: authorityAddress,
    name: CREDENTIAL_NAME,
  });
  const [schemaAddress] = await findSchemaPda({
    credential: credentialAddress,
    name: SCHEMA_NAME,
    version: SCHEMA_VERSION,
  });

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getProgramAccounts",
      params: [
        SAS_PROGRAM_ID,
        {
          encoding: "base64",
          filters: [
            {
              memcmp: {
                offset: 33,
                bytes: credentialAddress,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC getProgramAccounts failed (${response.status}).`);
  }

  const payload = (await response.json()) as {
    result?: Array<{ pubkey: string; account: { data: [string, string] } }>;
    error?: { message?: string };
  };
  if (payload.error) {
    throw new Error(payload.error.message ?? "Unable to query Devnet attestations.");
  }

  const rawAccounts = payload.result ?? [];
  if (rawAccounts.length === 0) return [];

  const schemaMap = new Map<Address, Schema>();
  const encodedSchema = await fetchEncodedAccount(rpc, schemaAddress);
  if (
    encodedSchema.exists &&
    encodedSchema.programAddress === SOLANA_ATTESTATION_SERVICE_PROGRAM_ADDRESS
  ) {
    try {
      const decodedSchema = decodeSchema(encodedSchema);
      assertExpectedSchema(decodedSchema.data);
      schemaMap.set(schemaAddress, decodedSchema.data);
    } catch {
      // Ignore mismatched schemas
    }
  }

  const discovered: DiscoveredAttestation[] = [];
  for (const entry of rawAccounts) {
    try {
      const bytes = decodeBase64Bytes(entry.account.data[0]);
      if (bytes[0] !== 2) continue; // SAS Attestation discriminator
      const attAddress = address(entry.pubkey);
      const decodedAtt = decodeAttestation({
        address: attAddress,
        programAddress: SAS_PROGRAM_ID,
        data: bytes,
        executable: false,
        lamports: 0n as never,
        space: BigInt(bytes.length),
      });
      const schemaData = schemaMap.get(decodedAtt.data.schema);
      if (!schemaData) continue;
      const data = deserializePublicCredential(
        schemaData,
        new Uint8Array(decodedAtt.data.data),
      );
      discovered.push({
        attestationAddress: attAddress,
        credentialAddress: decodedAtt.data.credential,
        schemaAddress: decodedAtt.data.schema,
        category: data.category,
        title: data.title,
        issuerDisplayName: data.issuerDisplayName,
        recipientDisplayName: data.recipientDisplayName,
        issuedAt: data.issueDate,
      });
    } catch {
      // Skip non-attestation or malformed accounts
    }
  }

  return discovered.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

function invalidResult(
  attestationAddress: Address,
  reason: string,
  signerAddress?: Address,
  credentialAddress?: Address,
  schemaAddress?: Address,
): VerificationResult {
  return {
    status: "invalid",
    reason,
    attestationAddress,
    signerAddress,
    credentialAddress,
    schemaAddress,
  };
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Unknown account data error.";
}
