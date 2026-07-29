# 0006 - Multi-Token Campaign Design

## Context

Campaigns in the MVP initially supported a single accepted token (`assetCode`). Contributors could only pledge one type of asset per campaign, limiting flexibility for campaigns that wanted to accept multiple Stellar assets (e.g., USDC and XLM).

Three approaches were considered:

1. **Multi-token support (extend contract model)** — Modify the `Campaign` struct to hold `accepted_tokens: Vec<Address>`. Track pledges per token. Claim iterates over all accepted tokens and transfers each balance. Refund returns the specific token contributed.

2. **Single token per campaign (status quo)** — Each campaign accepts exactly one token. Simple contract logic and clear valuation, but contributors must hold the specific token, which may reduce participation.

3. **Token conversion at contribution time** — Campaign specifies a primary token and secondary tokens. Secondary contributions are automatically swapped to the primary token via an oracle integration at contribution time. All accounting is in the primary token.

## Decision

Adopt **Option 1: Multi-token support**.

The Soroban contract stores `accepted_tokens: Vec<Address>` on each campaign (Soroban-native address type identifying each token's on-chain contract). The `contribute` function validates that the pledged asset address is in the accepted list before recording the pledge. Pledged amounts are tracked per token using `Contribution(u64, Address, Address)` and `CampaignTokenBalance(u64, Address)` storage keys.

**Canonical token identity**: On-chain, tokens are identified by their Soroban `Address` (the contract address). Off-chain (backend), `accepted_tokens` are stored as uppercase string codes in `accepted_tokens_json`. Classic Stellar assets require both the asset code and issuer to uniquely identify a token (e.g., `USDC:GA...`), while Soroban-native tokens use their contract address. A formal canonical token-identity specification that unifies these representations across the contract, backend, and frontend is a known gap tracked for future refinement.

Valuation uses a simple 1:1 unit sum — `pledged_amount` is the raw sum of all token amounts. Creators should only accept tokens of similar value (e.g., stablecoins) or understand that the target is a sum of units. This avoids oracle complexity for the MVP while leaving room for price-feed integration later.

The full design rationale, including storage schema, API contracts, and trade-offs, is documented in `MULTI_TOKEN_DESIGN_DECISION.md`.

## Consequences

- **Flexibility for creators** — campaigns can accept any combination of Stellar assets, increasing the likelihood of reaching funding targets.
- **Consistent contract behavior** — multi-token support is enforced at the Soroban contract level, so all frontends behave the same way.
- **UI complexity** — the frontend renders a token selector when `acceptedTokens.length > 1` and displays per-token progress bars (`CampaignCard` shows individual `<div class="progress-bar">` elements).
- **Valuation caveat** — the 1:1 unit sum means a campaign accepting both USDC and XLM would count 1 USDC == 1 XLM toward the target. Integrators must understand this limitation.
- **Backend tracking** — `getCampaignTokenBalances(campaignId)` queries the `pledges` table grouped by `asset_code` (the uppercase string representation). The `tokenBalances` map is returned on every campaign read. The backend does not currently normalize token identity across code+issuer or contract address, which may cause merging or splitting of balances when multiple representations of the same token exist.

## References

- `MULTI_TOKEN_DESIGN_DECISION.md` — full design document with alternatives, storage schema, and API payloads
- `contracts/` — Soroban contract with multi-token campaign creation and contribution validation
- `frontend/src/components/CampaignCard.tsx` — per-token progress bars
- `frontend/src/components/CampaignDetailPanel.tsx` — token selector in pledge form
- `backend/src/services/campaignStore.ts` — `getCampaignTokenBalances` implementation
- `adr/0001-sqlite-off-chain-mvp.md` — off-chain state tracking for pledges
- `adr/0005-soroban-smart-contract-platform.md` — platform context for contract decisions
