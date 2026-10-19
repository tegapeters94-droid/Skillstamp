# Firestore rules — makeshift backend (no Cloud Functions needed)

Cloud Functions need the Blaze plan, so the protection now lives in `firestore.rules`.
Rules run on Google's servers, so they cannot be bypassed from the browser.

## What users can no longer do
| Attack | Now |
|---|---|
| Edit own balance / earned in the browser console | Blocked. Wallet can only: spend/escrow/withdraw (never grows), top-up ≤ $50 with a "Top Up" transaction, the one-time $1,000 demo credit on an empty history, or collect a payout for a gig that is `completed`, assigned to them, ≤ 90% of its escrow |
| Create an account that starts with money / reputation | Blocked (`startsClean`) |
| Give themselves SkillID / verified skills | Blocked (admin only) |
| Jump `repPoints` (max +30 per save), `gigsCount` (+1), rating outside 0–5 | Blocked |
| Hired freelancer changing a gig's pay, escrow, hiredUid or status | Blocked (only delivery fields, plus raising a dispute) |
| Client changing pay / escrow / hiredUid after hiring | Blocked |
| Client marking a gig "completed" before anyone is hired | Blocked |
| Adding a third person to a conversation | Blocked |

## One small JavaScript change
`js/10-gig-workflow.js` → `reconcileFreelancerGigState`: each payout is now saved on its own
(`await saveUser(ME)` per gig) because the rules check one gig per write. Amounts, fees and the
"never credit twice" guard (`pay_<gigId>`) are unchanged. Tested: 2 completed gigs → credited
$900 + $450 once, second run credits nothing.

## Fixed along the way
The old rule blocked the poster from ever completing a gig (so "Release Payment" could not save).
Completion is now allowed once someone is hired.

## NOT covered (needs a real server later)
1. A determined user can still loop small writes: unlimited $50 test top-ups, and repeated payout
   claims for the same completed gig (the "once only" guard is client-side). Fine for test money,
   **not for real money.**
2. Escrow is not verified server-side: a client could mark a gig completed that was never funded.
3. Any signed-in user can still read every user document (email, wallet). Splitting private data
   into its own collection is a bigger refactor.
4. `notifications` can still be created for anyone (spam / fake notices).
5. Real payments must go through a server (Stripe/Paystack + Cloud Functions) — keep on hold.

## Deploy safely
1. Run the tests first (free, local): `cd rules-tests && npm install && npm test`
   (needs Node + Java; uses the Firebase emulator, no Blaze plan, no live data).
2. Firebase Console → Firestore → Rules → paste `firestore.rules` → **Publish**.
   Old versions are kept under the rules history tab — one click to roll back.
3. Then use the app as a freelancer and a client: edit profile, top up, post a gig,
   hire, deliver, release payment, check the freelancer's wallet.
Writes that the rules reject fail **silently** in this app (they only log a console warning),
so if "nothing saves" after publishing, roll back and tell me what you were doing.
