# Stamply — 24-Week Roadmap

| Phase | Weeks | Goal |
|-------|-------|------|
| **0. Foundation** | 1–2 | Laravel API + React SPA deployed with auth |
| **1. Stamp Card MVP** | 3–6 | Create card → register customer → give stamps → redeem (no wallet) |
| **2. Apple + Google Wallet** | 7–10 | Pass generation + live updates on real devices |
| **3. Other Card Types** | 11–13 | All 8 card types (points, membership, discount, cashback, coupon, multipass, gift) |
| **4. Engagement** | 14–17 | Push, geofence, birthday rewards, UTM, email/SMS |
| **5. CRM + Automation** | 18–21 | RFM segments + visual automation builder (React Flow) |
| **6. Go-to-Market** | 22–24 | Stripe billing, white-label basics, webhooks, onboarding wizard |

See the approved plan at `~/.claude/plans/piped-enchanting-leaf.md` for full detail.

## Current status

**Phase 0 — Foundation** (in progress)

### Done
- [x] Repo scaffold: `Stamply/{api,web,docs}` + git init + README + .gitignore

### In progress
- [ ] React SPA init (Vite + TS + Tailwind + shadcn/ui)
- [ ] Arabic/RTL i18n setup
- [ ] Placeholder login + empty dashboard shell

### Blocked
- [ ] Laravel API init — waiting on Laravel Herd installation
- [ ] Multi-tenant middleware + DB schema (`tenants`, `users`)
- [ ] Sanctum auth end-to-end
- [ ] Deploy to Laravel Cloud + Vercel
