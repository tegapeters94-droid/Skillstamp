# SkillStamp — Verified African Digital Talent

A verified African freelance marketplace built by Tega Technologies.

## File Structure

```
skillstamp/
├── index.html          — App shell & HTML markup
├── styles.css          — All styles
├── firebase.js         — Firebase init (ES module)
└── js/
    ├── 01-constants.js       — Shared constants & helpers
    ├── 02-db.js              — Firebase DB layer & cache
    ├── 03-data-init.js       — Seed data generators
    ├── 04-getters.js         — State vars, theme, notifications
    ├── 05-auth.js            — Login, signup, logout
    ├── 06-app-shell.js       — App entry, navigation, portfolio, onboarding, gig workspace
    ├── 07-home.js            — Home / timeline
    ├── 08-talent.js          — Talent browse page
    ├── 09-gigs.js            — Gigs listing & post a gig
    ├── 10-gig-workflow.js    — Hire, complete, dispute, rate
    ├── 11-wallet.js          — Wallet & top-up
    ├── 12-messages.js        — Inbox & conversations
    ├── 13-endorsements.js    — Endorse a freelancer
    ├── 14-ai-validation.js   — AI skill validation
    ├── 15-profile.js         — Profile, edit, verification, QR
    ├── 16-notifications.js   — Notification panel
    ├── 17-mobile.js          — Mobile / iOS functions
    ├── 18-learn.js           — SkillStamp Learn
    ├── 19-centers.js         — Training centers
    ├── 20-share-badge.js     — Shareable badge
    ├── 21-admin.js           — Admin portal
    ├── 22-bootstrap.js       — One-time admin bootstrap
    ├── 23-search.js          — Global search
    ├── 24-rate-limit.js      — Client-side rate limiting
    ├── 25-password.js        — Password change
    ├── 26-rehire.js          — Re-hire a freelancer
    └── 27-legal.js           — Terms of Service & Privacy Policy
```

## Deploy
All files must be served from the same directory. Upload the full folder to any static host (GitHub Pages, Vercel, Netlify, Firebase Hosting).
