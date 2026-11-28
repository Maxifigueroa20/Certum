use anchor_lang::prelude::*;
use solana_attestation_service_client::{
    accounts::{Attestation, Credential, Schema},
    instructions::{CreateAttestationCpi, CreateAttestationCpiAccounts, CreateAttestationInstructionArgs},
    programs::SOLANA_ATTESTATION_SERVICE_ID,
};

declare_id!("GtMjSpMXc7oopkBu3HwUXdJfeRKcS3cAEU7WRB7jxsSY");

#[program]
pub mod certum_attest {
    use super::*;

    /// Issues an attestation through Solana Attestation Service (CPI) and records an issuance receipt PDA.
    pub fn issue_attestation_via_sas(
        ctx: Context<IssueAttestationViaSas>,
        nonce: Pubkey,
        data: Vec<u8>,
        expiry: i64,
        category: u8,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.sas_program.key(),
            SOLANA_ATTESTATION_SERVICE_ID,
            CertumError::InvalidSasProgram
        );

        let cpi_accounts = CreateAttestationCpiAccounts {
            payer: &ctx.accounts.payer.to_account_info(),
            authority: &ctx.accounts.authority.to_account_info(),
            credential: &ctx.accounts.credential.to_account_info(),
            schema: &ctx.accounts.schema.to_account_info(),
            attestation: &ctx.accounts.attestation.to_account_info(),
            system_program: &ctx.accounts.system_program.to_account_info(),
        };

        let cpi_args = CreateAttestationInstructionArgs {
            nonce,
            data,
            expiry,
        };

        CreateAttestationCpi::new(&ctx.accounts.sas_program.to_account_info(), cpi_accounts, cpi_args)
            .invoke()?;

        let clock = Clock::get()?;
        let receipt = &mut ctx.accounts.receipt;
        receipt.version = 1;
        receipt.issuer = ctx.accounts.authority.key();
        receipt.attestation = ctx.accounts.attestation.key();
        receipt.credential = ctx.accounts.credential.key();
        receipt.schema = ctx.accounts.schema.key();
        receipt.issued_at = clock.unix_timestamp;
        receipt.issued_slot = clock.slot;
        receipt.category = category;

        Ok(())
    }

    /// Verifies SAS Credential, Schema, and Attestation accounts on-chain.
    pub fn verify_sas_attestation(ctx: Context<VerifySasAttestation>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let credential_info = &ctx.accounts.credential;
        let schema_info = &ctx.accounts.schema;
        let attestation_info = &ctx.accounts.attestation;

        require_keys_eq!(
            *credential_info.owner,
            SOLANA_ATTESTATION_SERVICE_ID,
            CertumError::InvalidSasProgram
        );
        require_keys_eq!(
            *schema_info.owner,
            SOLANA_ATTESTATION_SERVICE_ID,
            CertumError::InvalidSasProgram
        );
        require_keys_eq!(
            *attestation_info.owner,
            SOLANA_ATTESTATION_SERVICE_ID,
            CertumError::InvalidSasProgram
        );

        let credential = Credential::from_bytes(&credential_info.try_borrow_data()?)
            .map_err(|_| error!(CertumError::InvalidSasAccountData))?;
        let schema = Schema::from_bytes(&schema_info.try_borrow_data()?)
            .map_err(|_| error!(CertumError::InvalidSasAccountData))?;
        let attestation = Attestation::from_bytes(&attestation_info.try_borrow_data()?)
            .map_err(|_| error!(CertumError::InvalidSasAccountData))?;

        validate_sas_links(
            &credential_info.key(),
            &schema_info.key(),
            &credential,
            &schema,
            &attestation,
            now,
        )
    }
}

/// Validates links, authorized signer membership, schema pause state, and expiry for SAS accounts.
pub fn validate_sas_links(
    credential_key: &Pubkey,
    schema_key: &Pubkey,
    credential: &Credential,
    schema: &Schema,
    attestation: &Attestation,
    now_unix_seconds: i64,
) -> Result<()> {
    require_keys_eq!(
        attestation.credential,
        *credential_key,
        CertumError::CredentialMismatch
    );
    require_keys_eq!(
        attestation.schema,
        *schema_key,
        CertumError::SchemaMismatch
    );
    require_keys_eq!(
        schema.credential,
        *credential_key,
        CertumError::CredentialMismatch
    );
    require!(!schema.is_paused, CertumError::SchemaPaused);
    require!(
        credential.authorized_signers.contains(&attestation.signer),
        CertumError::UnauthorizedSigner
    );
    if attestation.expiry != 0 {
        require!(
            now_unix_seconds < attestation.expiry,
            CertumError::AttestationExpired
        );
    }

    Ok(())
}

#[derive(Accounts)]
pub struct IssueAttestationViaSas<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    /// CHECK: Validated by the Solana Attestation Service program during CPI.
    pub credential: UncheckedAccount<'info>,
    /// CHECK: Validated by the Solana Attestation Service program during CPI.
    pub schema: UncheckedAccount<'info>,
    /// CHECK: Created and initialized by the Solana Attestation Service program during CPI.
    #[account(mut)]
    pub attestation: UncheckedAccount<'info>,
    /// CHECK: Verified against SOLANA_ATTESTATION_SERVICE_ID in instruction logic.
    pub sas_program: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + CertumIssuanceReceipt::INIT_SPACE,
        seeds = [b"receipt", attestation.key().as_ref()],
        bump
    )]
    pub receipt: Account<'info, CertumIssuanceReceipt>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifySasAttestation<'info> {
    /// CHECK: Program ownership and Borsh deserialization are checked in handler.
    pub credential: UncheckedAccount<'info>,
    /// CHECK: Program ownership and Borsh deserialization are checked in handler.
    pub schema: UncheckedAccount<'info>,
    /// CHECK: Program ownership and Borsh deserialization are checked in handler.
    pub attestation: UncheckedAccount<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct CertumIssuanceReceipt {
    pub version: u8,
    pub issuer: Pubkey,
    pub attestation: Pubkey,
    pub credential: Pubkey,
    pub schema: Pubkey,
    pub issued_at: i64,
    pub issued_slot: u64,
    pub category: u8,
}

#[error_code]
pub enum CertumError {
    #[msg("Account is not owned by the Solana Attestation Service program.")]
    InvalidSasProgram,
    #[msg("Unable to deserialize Solana Attestation Service account data.")]
    InvalidSasAccountData,
    #[msg("Attestation or schema does not match the expected SAS credential.")]
    CredentialMismatch,
    #[msg("Attestation does not match the expected SAS schema.")]
    SchemaMismatch,
    #[msg("The referenced SAS schema is currently paused.")]
    SchemaPaused,
    #[msg("Attestation signer is not an authorized signer of the credential.")]
    UnauthorizedSigner,
    #[msg("This SAS attestation has expired.")]
    AttestationExpired,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_accounts() -> (Pubkey, Pubkey, Credential, Schema, Attestation) {
        let authority = Pubkey::new_unique();
        let credential_key = Pubkey::new_unique();
        let schema_key = Pubkey::new_unique();
        let nonce = Pubkey::new_unique();

        let credential = Credential {
            discriminator: 0,
            authority,
            name: b"Certum Public Credentials".to_vec(),
            authorized_signers: vec![authority],
        };
        let schema = Schema {
            discriminator: 1,
            credential: credential_key,
            name: b"Public Credential".to_vec(),
            description: b"Academic and professional credential fields".to_vec(),
            layout: vec![12; 6],
            field_names: b"title,issuerDisplayName,recipientDisplayName,issueDate,expiryDate,description".to_vec(),
            is_paused: false,
            version: 1,
        };
        let attestation = Attestation {
            discriminator: 2,
            nonce,
            credential: credential_key,
            schema: schema_key,
            data: vec![1, 2, 3, 4],
            signer: authority,
            expiry: 2_000_000_000,
            token_account: Pubkey::default(),
        };

        (credential_key, schema_key, credential, schema, attestation)
    }

    #[test]
    fn sas_program_id_matches_official_deployment() {
        assert_eq!(
            SOLANA_ATTESTATION_SERVICE_ID.to_string(),
            "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG"
        );
    }

    #[test]
    fn sas_accounts_round_trip_borsh_and_validate() {
        let (credential_key, schema_key, credential, schema, attestation) = sample_accounts();

        let cred_bytes = ::borsh::to_vec(&credential).expect("serialize credential");
        let schema_bytes = ::borsh::to_vec(&schema).expect("serialize schema");
        let att_bytes = ::borsh::to_vec(&attestation).expect("serialize attestation");

        let decoded_cred = Credential::from_bytes(&cred_bytes).expect("decode credential");
        let decoded_schema = Schema::from_bytes(&schema_bytes).expect("decode schema");
        let decoded_att = Attestation::from_bytes(&att_bytes).expect("decode attestation");

        assert_eq!(decoded_cred, credential);
        assert_eq!(decoded_schema, schema);
        assert_eq!(decoded_att, attestation);

        validate_sas_links(
            &credential_key,
            &schema_key,
            &decoded_cred,
            &decoded_schema,
            &decoded_att,
            1_750_000_000,
        )
        .expect("valid SAS links and active expiry should pass");
    }

    #[test]
    fn validation_rejects_unauthorized_signer_and_expired_attestation() {
        let (credential_key, schema_key, credential, schema, mut attestation) = sample_accounts();

        attestation.signer = Pubkey::new_unique();
        assert!(validate_sas_links(
            &credential_key,
            &schema_key,
            &credential,
            &schema,
            &attestation,
            1_750_000_000,
        )
        .is_err());

        attestation.signer = credential.authority;
        assert!(validate_sas_links(
            &credential_key,
            &schema_key,
            &credential,
            &schema,
            &attestation,
            2_000_000_001,
        )
        .is_err());
    }
}
