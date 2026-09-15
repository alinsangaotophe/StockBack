use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{self, Mint, Token, TokenAccount, TransferChecked}};

declare_id!("8Jtn1EsbdEoPizw7rnSr6wAfefy8rJ2hkiJjftYXRfp5");
// Demo initializer is pinned to the deployment wallet, preventing first-caller takeover.
pub const INITIALIZER: Pubkey = pubkey!("7Pb5enShxV2gMePs9onjK59UsTRU3eLcZfQmhr7o1zoc");

#[program]
pub mod reward_vault {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>, operator: Pubkey) -> Result<()> {
        require!(operator != Pubkey::default(), RewardError::InvalidOperator);
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.operator = operator;
        config.mint = ctx.accounts.mint.key();
        config.paused = false;
        config.bump = ctx.bumps.config;
        config.version = 1;
        Ok(())
    }

    pub fn initialize_asset_config(ctx: Context<InitializeAssetConfig>, operator: Pubkey) -> Result<()> {
        require!(operator != Pubkey::default(), RewardError::InvalidOperator);
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.operator = operator;
        config.mint = ctx.accounts.mint.key();
        config.paused = false;
        config.bump = ctx.bumps.config;
        config.version = 2;
        Ok(())
    }

    pub fn allocate_reward(ctx: Context<AllocateReward>, order_hash: [u8; 32], amount: u64) -> Result<()> {
        require!(!ctx.accounts.config.paused, RewardError::Paused);
        require!(amount > 0, RewardError::ZeroAmount);
        require!(ctx.accounts.recipient.key() != Pubkey::default(), RewardError::InvalidRecipient);
        require!(ctx.accounts.recipient.key() != ctx.accounts.reward.key(), RewardError::InvalidRecipient);
        // Account creation, escrow funding, and the entitlement commit in one Solana transaction.
        token::transfer_checked(CpiContext::new(ctx.accounts.token_program.to_account_info(), TransferChecked {
            from: ctx.accounts.source.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.escrow.to_account_info(),
            authority: ctx.accounts.operator.to_account_info(),
        }), amount, ctx.accounts.mint.decimals)?;
        let reward = &mut ctx.accounts.reward;
        reward.config = ctx.accounts.config.key();
        reward.order_hash = order_hash;
        reward.recipient = ctx.accounts.recipient.key();
        reward.mint = ctx.accounts.mint.key();
        reward.amount = amount;
        reward.claimed = false;
        reward.bump = ctx.bumps.reward;
        reward.allocated_at = Clock::get()?.unix_timestamp;
        reward.claimed_at = 0;
        emit!(RewardAllocated { reward: reward.key(), order_hash, recipient: reward.recipient, mint: reward.mint, amount });
        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        require!(!ctx.accounts.reward.claimed, RewardError::AlreadyClaimed);
        let reward = &ctx.accounts.reward;
        let config_key = reward.config;
        let order_hash = reward.order_hash;
        let bump = [reward.bump];
        let seeds: &[&[u8]] = &[b"reward", config_key.as_ref(), order_hash.as_ref(), &bump];
        let signer = &[seeds];
        token::transfer_checked(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), TransferChecked {
            from: ctx.accounts.escrow.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.reward.to_account_info(),
        }, signer), reward.amount, ctx.accounts.mint.decimals)?;
        let reward = &mut ctx.accounts.reward;
        reward.claimed = true;
        reward.claimed_at = Clock::get()?.unix_timestamp;
        emit!(RewardClaimed { reward: reward.key(), order_hash: reward.order_hash, recipient: reward.recipient, mint: reward.mint, amount: reward.amount });
        Ok(())
    }

    // Public Devnet faucet: local shopping receipts are illustrative, not proof of purchase.
    pub fn initialize_demo_pool(ctx: Context<InitializeDemoPool>, amount: u64) -> Result<()> {
        require!(amount > 0, RewardError::ZeroAmount);
        let pool = &mut ctx.accounts.pool;
        pool.mint = ctx.accounts.mint.key();
        pool.amount = amount;
        pool.claims = 0;
        pool.bump = ctx.bumps.pool;
        Ok(())
    }

    pub fn claim_demo(ctx: Context<ClaimDemo>, _order_hash: [u8; 32]) -> Result<()> {
        require!(ctx.accounts.usage.claims < 5 && ctx.accounts.pool.claims < 1000, RewardError::DemoLimit);
        let mint = ctx.accounts.pool.mint;
        let bump = [ctx.accounts.pool.bump];
        let seeds: &[&[u8]] = &[b"demo-pool", mint.as_ref(), &bump];
        token::transfer_checked(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), TransferChecked {
            from: ctx.accounts.source.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        }, &[seeds]), ctx.accounts.pool.amount, ctx.accounts.mint.decimals)?;
        ctx.accounts.pool.claims += 1;
        ctx.accounts.usage.claims += 1;
        ctx.accounts.receipt.recipient = ctx.accounts.recipient.key();
        ctx.accounts.receipt.mint = mint;
        ctx.accounts.receipt.amount = ctx.accounts.pool.amount;
        Ok(())
    }

    pub fn set_paused(ctx: Context<AdminConfig>, paused: bool) -> Result<()> {
        ctx.accounts.config.paused = paused;
        Ok(())
    }

    pub fn set_operator(ctx: Context<AdminConfig>, operator: Pubkey) -> Result<()> {
        require!(operator != Pubkey::default(), RewardError::InvalidOperator);
        ctx.accounts.config.operator = operator;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut, address = INITIALIZER @ RewardError::Unauthorized)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + Config::INIT_SPACE, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    pub mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeAssetConfig<'info> {
    #[account(mut, address = INITIALIZER @ RewardError::Unauthorized)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + Config::INIT_SPACE, seeds = [b"config", mint.key().as_ref()], bump)]
    pub config: Account<'info, Config>,
    pub mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_hash: [u8; 32], amount: u64)]
pub struct AllocateReward<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    #[account(constraint = config.key() == config.canonical_address() @ RewardError::Unauthorized, has_one = operator @ RewardError::Unauthorized, has_one = mint)]
    pub config: Account<'info, Config>,
    pub mint: Account<'info, Mint>,
    /// CHECK: Recipient is stored as the immutable beneficiary. Their signature is required when claiming.
    pub recipient: UncheckedAccount<'info>,
    #[account(init, payer = operator, space = 8 + Reward::INIT_SPACE, seeds = [b"reward", config.key().as_ref(), order_hash.as_ref()], bump)]
    pub reward: Account<'info, Reward>,
    #[account(mut, token::mint = mint, token::authority = operator)]
    pub source: Account<'info, TokenAccount>,
    // init_if_needed permits a third party to pre-create the canonical ATA without blocking allocation.
    #[account(init_if_needed, payer = operator, associated_token::mint = mint, associated_token::authority = reward)]
    pub escrow: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    pub recipient: Signer<'info>,
    // An optional sponsor pays for ATA creation; the recipient still must authorize the claim.
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(constraint = config.key() == config.canonical_address() @ RewardError::Unauthorized, has_one = mint)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"reward", config.key().as_ref(), reward.order_hash.as_ref()], bump = reward.bump,
        has_one = config, has_one = recipient @ RewardError::WrongRecipient, has_one = mint)]
    pub reward: Account<'info, Reward>,
    pub mint: Account<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = reward)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(init_if_needed, payer = payer, associated_token::mint = mint, associated_token::authority = recipient)]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminConfig<'info> {
    pub admin: Signer<'info>,
    #[account(mut, constraint = config.key() == config.canonical_address() @ RewardError::Unauthorized, has_one = admin @ RewardError::Unauthorized)]
    pub config: Account<'info, Config>,
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub operator: Pubkey,
    pub mint: Pubkey,
    pub paused: bool,
    pub bump: u8,
    pub version: u8,
}

impl Config {
    pub fn canonical_address(&self) -> Pubkey {
        if self.version == 1 { Pubkey::find_program_address(&[b"config"], &crate::ID).0 }
        else { Pubkey::find_program_address(&[b"config", self.mint.as_ref()], &crate::ID).0 }
    }
}

#[account]
#[derive(InitSpace)]
pub struct Reward {
    pub config: Pubkey,
    pub order_hash: [u8; 32],
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
    pub allocated_at: i64,
    pub claimed_at: i64,
}

#[event]
pub struct RewardAllocated { pub reward: Pubkey, pub order_hash: [u8; 32], pub recipient: Pubkey, pub mint: Pubkey, pub amount: u64 }
#[event]
pub struct RewardClaimed { pub reward: Pubkey, pub order_hash: [u8; 32], pub recipient: Pubkey, pub mint: Pubkey, pub amount: u64 }

#[error_code]
pub enum RewardError {
    #[msg("Demo claim limit reached")]
    DemoLimit,
    #[msg("Only the configured authority can perform this action")]
    Unauthorized,
    #[msg("New reward allocations are paused")]
    Paused,
    #[msg("A reward must contain a positive token amount")]
    ZeroAmount,
    #[msg("The recipient is invalid")]
    InvalidRecipient,
    #[msg("The operator is invalid")]
    InvalidOperator,
    #[msg("Only the recorded recipient can claim")]
    WrongRecipient,
    #[msg("This reward has already been claimed")]
    AlreadyClaimed,
}

#[derive(Accounts)]
pub struct InitializeDemoPool<'info> {
    #[account(mut, address = INITIALIZER @ RewardError::Unauthorized)]
    pub admin: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(init, payer = admin, space = 8 + DemoPool::INIT_SPACE, seeds = [b"demo-pool", mint.key().as_ref()], bump)]
    pub pool: Account<'info, DemoPool>,
    #[account(init_if_needed, payer = admin, associated_token::mint = mint, associated_token::authority = pool)]
    pub source: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
#[instruction(order_hash: [u8; 32])]
pub struct ClaimDemo<'info> {
    #[account(mut)]
    pub recipient: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut, seeds = [b"demo-pool", mint.key().as_ref()], bump = pool.bump, has_one = mint)]
    pub pool: Account<'info, DemoPool>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = pool)]
    pub source: Account<'info, TokenAccount>,
    #[account(init_if_needed, payer = recipient, space = 8 + DemoUsage::INIT_SPACE, seeds = [b"demo-usage", pool.key().as_ref(), recipient.key().as_ref()], bump)]
    pub usage: Account<'info, DemoUsage>,
    #[account(init, payer = recipient, space = 8 + DemoReceipt::INIT_SPACE, seeds = [b"demo-receipt", pool.key().as_ref(), recipient.key().as_ref(), order_hash.as_ref()], bump)]
    pub receipt: Account<'info, DemoReceipt>,
    #[account(init_if_needed, payer = recipient, associated_token::mint = mint, associated_token::authority = recipient)]
    pub destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
#[account]
#[derive(InitSpace)]
pub struct DemoPool { pub mint: Pubkey, pub amount: u64, pub claims: u16, pub bump: u8 }
#[account]
#[derive(InitSpace)]
pub struct DemoUsage { pub claims: u8 }
#[account]
#[derive(InitSpace)]
pub struct DemoReceipt { pub recipient: Pubkey, pub mint: Pubkey, pub amount: u64 }
