# SkillStamp v11 — Business Model Update

## Files Changed (11 JS files)

### 04-getters.js — NEW TIER SYSTEM
- `getUserTier(u)` → returns: discoverer | hustler | elite | whale
- `getTierLabel(u)` → emoji label for display
- `getBidLimit(u)` → monthly bid limit by tier (7 / 35 / 7 / 40)
- `getCommissionRate(u)` → 0% for Pro, 10% for free
- `getPayoutHoldDays(u)` → 10 / 5 / 0 days by tier
- `userIsPro(u)`, `userIsVerified(u)`, `userIsBusiness(u)` helpers

### 05-auth.js — NEW USER FIELDS
- New accounts now include: `isPro`, `isBusiness`, `proSince`, `proposalBoosts`, `shadowGuardUntil`

### 07-home.js — TIER STRIP
- Freelancer hero now shows tier label, Pro status, and bids remaining this month

### 08-talent.js — SMART-SORT
- Talent browse uses new Smart-Sort: Verified+Boosted > Verified > Unverified+Boosted > Standard
- Pro users rank above free within same tier
- Replaced hardcoded isVerified check with `userIsVerified()`

### 09-gigs.js — BID SYSTEM OVERHAUL + VETTED VAULT + SHADOW GUARD + SMART BOOST
- Bid limits: Discoverer=7, Hustler=35, Elite=7, Whale=40 (was 3 free hardcoded)
- Extra bids: $2.50/5 or $10/20 (was $3/5 or $8/15 — now correctly $0.50 each)
- Shadow Guard: 48h cooldown on copy-paste/low-effort bids
- Vetted Vault: unverified freelancers filtered out of Vault gigs
- Smart Boost: $1 to boost a gig to top for 24h
- Post Gig wizard Step 5: Business clients see "Post to Vetted Vault" toggle
- Proposal credits modal updated with Pro upgrade CTA

### 10-gig-workflow.js — COMMISSION + PAYOUT HOLD + SMART-SORT HIRE MODAL
- Commission respects `getCommissionRate()` — 0% for Pro freelancers
- Payout hold: Whale=instant, Elite=5d, Discoverer/Hustler=10d
- Hire modal applicants sorted by Smart-Sort (Verified+Boosted first)
- Verified and Boosted badges shown on each applicant card

### 11-wallet.js — WITHDRAWAL FEE + PRO SUBSCRIPTION + PRO UPGRADE CARD
- Withdrawal fee: flat $2 (was 2.5%)
- Minimum withdrawal: $10 (was $50)
- Pro upgrade card shown on wallet page for non-Pro users
- `openProSubscribe()`: full Pro subscription modal, $15/month from wallet

### 15-profile.js — PROFILE BOOST
- `openProfileBoost()`: $1 per 24h profile visibility boost
- Pro users: 3 free boosts/month before paying
- Boost button shown on own profile page

### 21-admin.js — BUSINESS VERIFICATION + PRO/BIZ STATS
- New "Business" tab in admin panel
- Business verification queue: approve/reject buttons
- `adminApproveBiz()` / `adminRejectBiz()` — updates Firestore + notifies user
- Overview stats now include Pro Subscribers and Business Clients count

### 28-settings.js — TIER DISPLAY + PRO ITEM + BUSINESS MODE
- Settings profile card shows tier label (Discoverer/Hustler/Elite/Whale)
- Account section: Pro status item (subscribe or "Pro Active")
- Account section: Business Mode item (activate or "Business Active")
- `openBusinessModeSetup()`: CAC/website/email form → writes to `business_verifications`

### 29-proposals.js — MINOR UPDATES
- Direct proposal limit: 2/month for free, 10/month for Pro clients
- Replaced hardcoded `badgeStatus` checks with `userIsVerified()`

## New Firestore Collections
- `business_verifications`: Business Mode applications (uid, bizName, cac, website, status)

## Business Model Mapping
| Feature | Business Doc | Implementation |
|---|---|---|
| Discoverer: 7 bids/mo | §1 | `getBidLimit()` in 04-getters.js |
| Hustler (Pro): 35 bids/mo | §1 | `getBidLimit()` in 04-getters.js |
| Elite (Verified): 7 bids/mo | §1 | `getBidLimit()` in 04-getters.js |
| Whale (Verified+Pro): 40 bids/mo | §1 | `getBidLimit()` in 04-getters.js |
| 10% fee on free users | §3 | `getCommissionRate()` |
| 0% fee on Pro users | §3 | `getCommissionRate()` |
| $15/mo Pro subscription | §3 | `openProSubscribe()` in 11-wallet.js |
| Extra bids $0.50 each | §3 | `purchaseProposalPack()` in 09-gigs.js |
| Smart Boost $1/boost | §3 | `boostGig()`, `openProfileBoost()` |
| Flat $2 withdrawal fee | §3 | `processWithdraw()` in 11-wallet.js |
| Payout hold 10d unverified | §5 | `getPayoutHoldDays()` |
| Payout hold 5d verified | §5 | `getPayoutHoldDays()` |
| Instant payout (Whale) | §5 | `getPayoutHoldDays()` |
| Shadow Guard 48h | §5 | `triggerShadowGuard()` in 09-gigs.js |
| Smart-Sort ranking | §4 | 08-talent.js + 10-gig-workflow.js |
| Vetted Vault (Business clients) | §2 | `isVaultGig` in 09-gigs.js |
| Business Mode activation | §2 | `openBusinessModeSetup()` in 28-settings.js |
| Business verification queue | §2 | Admin "Business" tab in 21-admin.js |
