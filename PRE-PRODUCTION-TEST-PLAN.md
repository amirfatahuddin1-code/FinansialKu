# Pre-Production Testing Plan — Karsafin

> **Application:** Personal Finance Manager (Mobile + Web + Supabase Backend)
> **Document Version:** 1.0
> **Target Audience:** QA Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Scope](#2-scope)
3. [Test Strategy](#3-test-strategy)
4. [Test Categories & Detailed Cases](#4-test-categories--detailed-cases)
5. [Testing Timeline](#5-testing-timeline)
6. [Risk Analysis & Fallback Strategies](#6-risk-analysis--fallback-strategies)
7. [Release Readiness Checklist](#7-release-readiness-checklist)

---

## 1. Overview

Karsafin is a full-stack personal finance management application delivered as an npm monorepo with three packages:

| Package | Platform | Technology |
|---------|----------|------------|
| `packages/mobile` | Android / iOS | React Native 0.81 + Expo SDK 54 |
| `packages/web` | Web / PWA | Next.js 16 + React 19 + Tailwind CSS 4 |
| `packages/shared` | Shared logic | TypeScript — Supabase client, types, sync engine |

**Backend:** Supabase (PostgreSQL, Auth, Edge Functions/Deno, Storage, Realtime)

**Key integrations:** Groq AI (Llama 3.3), Midtrans, Mayar, RevenueCat, Telegram Bot, WhatsApp Evolution API, Google Sign-In, Google AdMob.

### Testing Scope Summary

| Dimension | Coverage |
|-----------|----------|
| Functional | All modules (auth, transactions, budgets, savings, debts, events, AI chat, receipt OCR, Telegram/WhatsApp bots, payments, workspaces, user features, settings) |
| Integration | Supabase APIs, Edge Functions, 3rd-party integrations, cross-package shared logic |
| Performance | API latency, list rendering (1K+ transactions), offline sync, PWA startup |
| Security | RLS policies, auth flows, payment webhook validation, API key exposure |
| Usability | Cross-platform consistency, onboarding, error states, empty states, dark/light theme |
| Regression | Full suite for every release candidate |

---

## 2. Scope

### 2.1 In Scope

- **Authentication:** Email/password sign-up, sign-in, sign-out, Google Sign-In, session persistence, token refresh, password reset.
- **User Management:** Profile CRUD, workspace membership, role-based access.
- **Financial Accounts:** CRUD operations, balance tracking, multi-account support, account types (bank, e-wallet, cash, investment).
- **Transactions:** CRUD with category/account/date/amount, filters, search, bulk operations, recurring transactions, AI-assisted logging.
- **Categories:** Default categories, custom categories, income/expense/savings classification.
- **Budgets:** Monthly budget allocation, progress tracking, overspend alerts.
- **Savings Goals:** Goal creation, progress tracking, auto-allocation.
- **Debt Tracking:** Debt/receivable management, payment schedule, payoff progress.
- **Event Planning:** Event creation, cost items, income sources, budget tracking.
- **AI Chat:** Natural language transaction logging, financial insights, quota management.
- **Receipt OCR:** Image capture → Groq vision → transaction creation.
- **Telegram Bot:** Link account, log transactions via chat, group support.
- **WhatsApp Bot:** Link account, log transactions via chat.
- **Payments / Subscriptions:** Midtrans Snap, Mayar, RevenueCat webhook, plan management.
- **Workspaces:** Create/join/switch workspace, member management, shared data isolation.
- **User Features ("Kreasi User"):** Feature DSL creation, AI code generation, validation, execution.
- **Offline Sync:** Local SQLite (mobile) / IndexedDB (web) → sync queue → conflict resolution → remote reconciliation.
- **UI/UX:** Dashboard, charts, navigation (tabs/sidebar), empty states, error boundaries, loading skeletons, themes.
- **Analytics & Reporting:** Charts (pie, bar, line), cashflow analysis, category breakdowns, period comparison.
- **Calculator:** Financial calculator with basic operations.
- **PWA:** Service worker caching, offline fallback, manifest, install prompt.

### 2.2 Out of Scope

- Load testing at >10K concurrent users (not applicable at current scale).
- Native OS-level penetration testing (network-level attacks, device rooting).
- Third-party platform reliability (Supabase, Groq, Midtrans uptime).
- Translations / i18n beyond the existing Indonesian UI.

---

## 3. Test Strategy

### 3.1 Testing Levels

| Level | Responsibility | Tools / Frameworks |
|-------|---------------|-------------------|
| **Unit Tests** | Developers + QA | Jest, React Native Testing Library, Vitest (shared) |
| **Integration Tests** | QA | Jest + MSW (mock Supabase), Supabase Local Emulator |
| **E2E Tests** | QA | Detox (mobile), Playwright (web) |
| **Manual / Exploratory** | QA | Physical devices (Android/iOS), Browser DevTools |
| **Performance** | QA | Lighthouse (web), React DevTools Profiler, Flipper (mobile) |
| **Security** | QA + Dev | Manual review of RLS policies, webhook signature validation |
| **Regression** | QA | Automated smoke suite + manual checklist |

### 3.2 Environments

| Environment | URL / Build | Database | Notes |
|-------------|-------------|----------|-------|
| **Local Dev** | `npm run dev` (web), `npx expo start` (mobile) | Local Supabase emulator or staging | Developer + QA day-to-day |
| **Staging** | Vercel preview deploy + EAS internal build | Staging Supabase project | Pre-prod validation |
| **Production** | `karsafin.com` + Google Play / App Store | Production Supabase | Release candidate only |

### 3.3 Test Data Strategy

- **Seed script:** `scripts/seed-transactions.js` generates 5 months of realistic data (Jan–May 2026).
- **Test users:** `scripts/seed-testuser.js` creates predefined test accounts with known states.
- **Edge cases:** QA creates accounts with: 0 transactions, 10K+ transactions, mixed currencies, deleted categories, expired subscriptions, maxed budgets.
- **Cleanup:** After every E2E test run, reset the staging database from a clean snapshot.

---

## 4. Test Categories & Detailed Cases

### 4.1 Functional Testing

#### 4.1.1 Authentication Module

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| AUTH-01 | Email sign-up with valid data | Fill registration form with valid email/password → submit | Account created, logged in, redirected to dashboard | P0 |
| AUTH-02 | Email sign-up with existing email | Register with already-used email | Error: "Email already registered" | P1 |
| AUTH-03 | Sign-in with correct credentials | Enter valid email/password | Redirected to dashboard, session token stored | P0 |
| AUTH-04 | Sign-in with wrong password | Enter valid email + wrong password | Error: "Invalid login credentials" | P1 |
| AUTH-05 | Google Sign-In | Tap "Sign in with Google" → select account | OAuth flow completes, user created/logged in | P0 |
| AUTH-06 | Session persistence | Sign in → kill app → reopen | Session restored, no login screen | P0 |
| AUTH-07 | Token refresh | Wait 1 hour (or mock expiry) | Silent token refresh, no interruption | P0 |
| AUTH-08 | Password reset | Request reset → open email → set new password | New password works for sign-in | P1 |
| AUTH-09 | Sign-out | Tap sign-out → confirm | Session cleared, login screen shown | P1 |
| AUTH-10 | Protected route redirect | Access `/dashboard` while unauthenticated | Redirected to `/login` | P0 |

#### 4.1.2 Transaction Module

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| TXN-01 | Add income transaction | Fill form: type=income, amount, category, account, date | Transaction created, balance updated, listed in transactions | P0 |
| TXN-02 | Add expense transaction | Fill form: type=expense, amount, category, account, date | Transaction created, balance updated, listed | P0 |
| TXN-03 | Add transfer between accounts | Select from_account, to_account, amount | Both account balances adjusted, transfer record created | P0 |
| TXN-04 | Edit transaction | Tap existing → modify amount/category/date → save | Changes reflected everywhere (dashboard, list, budgets) | P0 |
| TXN-05 | Delete transaction | Swipe to delete / tap delete → confirm | Transaction removed, balances and budgets recalculated | P0 |
| TXN-06 | Filter by date range | Select start/end date | Only transactions in range shown | P1 |
| TXN-07 | Filter by category | Select one or more categories | Only matching category transactions shown | P1 |
| TXN-08 | Filter by account | Select specific account | Only transactions for that account shown | P1 |
| TXN-09 | Search by description | Type partial description text | Matching transactions returned | P1 |
| TXN-10 | Add transaction with future date | Set date to tomorrow | Transaction created, visible in list | P2 |
| TXN-11 | AI-assisted add (text) | "beli nasi goreng 25rb" in AI chat | Transaction parsed and created | P0 |
| TXN-12 | Receipt scan → transaction | Upload receipt image → OCR processes → confirm | Transaction created from scanned data | P0 |
| TXN-13 | Bulk delete multiple transactions | Select multiple → delete | All selected removed, balances updated | P1 |
| TXN-14 | Transaction with 0 amount | Submit with amount = 0 | Either accepted or validation error shown | P2 |
| TXN-15 | Transaction with very large amount | Submit amount = 999,999,999,999 | Accepted, correctly formatted | P2 |

#### 4.1.3 Budget Module

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| BGT-01 | Create monthly budget | Select category, amount, month | Budget created, visible in planning | P0 |
| BGT-02 | Budget progress tracking | Add expense in budgeted category | Progress bar updates, remaining amount calculated | P0 |
| BGT-03 | Budget overspend indicator | Spend more than budgeted amount | Visual warning (red), negative remaining shown | P1 |
| BGT-04 | Edit budget amount | Change budget mid-month | Progress recalculated, no errors | P1 |
| BGT-05 | Delete budget | Remove a budget | Category spending tracked normally, no budget display | P1 |
| BGT-06 | Multiple budgets for same category | Attempt to create second budget for same period | Either merge or error | P1 |
| BGT-07 | Budget carries over to next month | Verify carryover logic | Unslept budget rolls over (or not, per config) | P2 |
| BGT-08 | Budget for zero amount | Set budget = 0 | Accepted but shows overspend for any expense | P2 |

#### 4.1.4 Savings Module

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| SAV-01 | Create savings goal | Name, target amount, deadline, icon | Goal created, visible on planning + dashboard | P0 |
| SAV-02 | Allocate funds to savings | Transfer amount from account to goal | Goal progress updated, account balance reduced | P0 |
| SAV-03 | Withdraw from savings | Remove amount from goal back to account | Goal progress reduced, account balance increased | P1 |
| SAV-04 | Mark savings as completed | Reach target amount | Goal marked as completed, celebration shown | P1 |
| SAV-05 | Delete savings goal | Remove goal with existing balance | Confirmation prompt, balance returned to account | P1 |
| SAV-06 | Savings with zero target | Set target = 0 | System handles gracefully (progress = 100%) | P2 |
| SAV-07 | Over-allocate savings | Transfer more than 100% of target | Limited to 100%, extra returned or rejected | P2 |

#### 4.1.5 Debt Module

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| DBT-01 | Create debt (owed to me) | Name, amount, due date, notes | Debt created, listed in hutang-piutang | P0 |
| DBT-02 | Create debt (I owe) | Type = "hutang", contact, amount | Created and tracked as payable | P0 |
| DBT-03 | Record debt payment | Add partial payment to debt | Remaining amount decreases, payment history updated | P0 |
| DBT-04 | Mark debt as settled | Pay full amount → mark completed | Debt moves to "completed" section | P0 |
| DBT-05 | Edit debt details | Change amount, due date, notes | Updates reflected everywhere | P1 |
| DBT-06 | Delete debt with payments | Remove debt that has payment history | Confirmation required, all related records removed | P1 |
| DBT-07 | Overpayment on debt | Pay more than remaining amount | System rejects or adjusts | P2 |
| DBT-08 | Debt past due date notification | Due date passes | Visual indicator / notification shown | P1 |

#### 4.1.6 Event Module

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| EVT-01 | Create event | Name, date, estimated budget | Event created, shown in planning | P0 |
| EVT-02 | Add cost items to event | Name, amount, category | Total event cost updated | P0 |
| EVT-03 | Add income sources to event | Name, amount, contributor | Total event income calculated | P1 |
| EVT-04 | Calculate event balance | Add costs + incomes | Net balance (surplus/deficit) displayed | P1 |
| EVT-05 | Link transactions to event | Create expense and tag to event | Event cost updated automatically | P0 |
| EVT-06 | Duplicate event | Copy existing event with all items | New event created with same structure | P2 |
| EVT-07 | Delete event with linked items | Remove event with costs + incomes | All related items removed, no orphaned data | P1 |

#### 4.1.7 AI Chat Module

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| AI-01 | Natural language add transaction | "jajan 20rb" or "gaji 5jt hari ini" | Transaction parsed, preview shown, user confirms | P0 |
| AI-02 | Ask financial question | "berapa pengeluaran bulan ini?" | AI responds with aggregated data | P1 |
| AI-03 | AI quota limit — free tier | Exceed daily free quota | "Quota exhausted" message, upsell shown | P0 |
| AI-04 | AI quota — premium tier | Premium user sends many messages | No quota limit applied | P0 |
| AI-05 | Ambiguous input handling | "makan 50" (no category context) | AI asks clarifying question | P1 |
| AI-06 | Non-financial input | "siapa presiden indonesia?" | AI declines to answer (out of scope) | P2 |

#### 4.1.8 Telegram Bot

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| TEL-01 | Link Telegram account | Generate code → send to bot → confirm | Account linked, confirmation on both ends | P0 |
| TEL-02 | Log transaction via Telegram | Send "belanja 150rb" to bot | Transaction created, confirmation reply | P0 |
| TEL-03 | Unlink Telegram account | Remove link from settings | Bot no longer responds to user | P1 |
| TEL-04 | Invalid link code | Send expired/wrong code to bot | "Code invalid or expired" error | P1 |
| TEL-05 | Group chat linking | Add bot to group → link workspace | Group members can log to shared workspace | P1 |

#### 4.1.9 WhatsApp Bot

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| WA-01 | Link WhatsApp via Evolution API | Send pairing request | Account linked | P0 |
| WA-02 | Log transaction via WhatsApp | "gaji 8jt" sent to bot number | Transaction created | P0 |
| WA-03 | Unlink WhatsApp | Remove from settings | Bot stops responding | P1 |

#### 4.1.10 Workspace Module

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| WKS-01 | Create new workspace | Name, type (personal/family) | Workspace created, switched to it | P0 |
| WKS-02 | Switch workspace | Tap another workspace | All data scoped to selected workspace | P0 |
| WKS-03 | Invite member to workspace | Enter email/username → send invite | Invite sent, pending status shown | P0 |
| WKS-04 | Accept workspace invitation | Open invite → accept | Added to workspace, shared data visible | P0 |
| WKS-05 | Remove member from workspace | Owner removes member | Member loses access, data remains | P1 |
| WKS-06 | Workspace-level data isolation | Create transactions in workspace A → switch to B | No cross-contamination of data | P0 |
| WKS-07 | Leave workspace | Member leaves | Removed, own data preserved | P1 |
| WKS-08 | Delete workspace | Owner deletes workspace | All workspace data deleted, confirmation required | P1 |

#### 4.1.11 Subscription / Payment Module

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| SUB-01 | Midtrans payment flow | Select premium plan → Midtrans Snap → pay | Payment processed, subscription activated | P0 |
| SUB-02 | Mayar payment flow | Select plan → Mayar → pay | Payment processed, subscription activated | P0 |
| SUB-03 | RevenueCat purchase (mobile) | In-app purchase → confirm | Subscription activated across platforms | P0 |
| SUB-04 | Midtrans webhook — success | Simulate `settlement` status webhook | Subscription activated in DB | P0 |
| SUB-05 | Midtrans webhook — failure | Simulate `deny`/`expire` status | Subscription not activated, user notified | P1 |
| SUB-06 | Subscription expiry | Premium expires → features locked | Premium features show upsell, free tier active | P0 |
| SUB-07 | Subscription renewal | Auto-renewal triggered | Subscription extended without interruption | P0 |
| SUB-08 | Cancel subscription | Cancel via RevenueCat / Midtrans | Premium until period end, then revert to free | P1 |

#### 4.1.12 User Features ("Kreasi User")

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| KRE-01 | Create simple feature via DSL | Define filter + display widget | Feature created, added to dashboard | P0 |
| KRE-02 | AI-generate feature | Describe desired feature → AI generates code | Feature created ready for use | P0 |
| KRE-03 | Validate malformed feature | Submit invalid DSL | Validation errors shown | P1 |
| KRE-04 | Run feature with data | Execute feature on real transactions | Correct output (filtered data, widget rendered) | P1 |
| KRE-05 | Delete feature | Remove created feature | Feature removed from dashboard | P1 |
| KRE-06 | Feature with infinite loop | Craft DSL that recurses infinitely | Interpreter terminates, error shown | P2 |

#### 4.1.13 Settings & Profile Module

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| SET-01 | Update display name | Change name in profile | Updated everywhere | P1 |
| SET-02 | Change theme | Select dark theme | UI switches to dark mode, persisted | P1 |
| SET-03 | Custom color picker | Pick accent color | Theme updates with chosen color | P1 |
| SET-04 | Income date setting | Set monthly income date | Dashboard shows income for that date range | P1 |
| SET-05 | Manage categories | Add/edit/delete custom category | Category list updates, usable in transactions | P1 |
| SET-06 | Export data | Download financial data | Valid CSV/JSON file produced | P2 |
| SET-07 | Delete account | Account deletion flow | All data purged, confirmation email sent | P1 |

#### 4.1.14 Dashboard Module

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| DSH-01 | Dashboard loads with data | Login with seeded data | Balance, cashflow, recent transactions, charts shown | P0 |
| DSH-02 | Dashboard — empty state | Login with new account (no data) | Skeleton/empty state, prompts to add first transaction | P0 |
| DSH-03 | Balance calculation correctness | Add transactions → verify total | Balance = sum of income - expense (per account) | P0 |
| DSH-04 | Recent transactions widget | Add 10+ transactions | Last 5 shown, "see all" link works | P1 |
| DSH-05 | Cashflow chart rendering | View monthly cashflow | Bar chart shows income vs expense by month | P1 |

---

### 4.2 Integration Testing

| ID | Test Case | Steps | Expected Outcome | Priority |
|----|-----------|-------|------------------|----------|
| INT-01 | Shared package API → Supabase | Call `createTransaction()` from shared | Data written correctly to Supabase | P0 |
| INT-02 | MLM: Mobile → Shared → Supabase | Mobile app calls shared API | End-to-end data flow works | P0 |
| INT-03 | MLM: Web → Shared → Supabase | Web app calls shared API | Same result as mobile | P0 |
| INT-04 | Edge function → Database | Call `ai-chat` → it reads/writes transactions | Function executes, DB updated | P0 |
| INT-05 | Edge function → Groq API | Send NLP input to `ai-chat` | Groq responds, result processed | P0 |
| INT-06 | Midtrans webhook → DB | Hit `midtrans-webhook` with test payload | Payment record created, subscription updated | P0 |
| INT-07 | RevenueCat webhook → DB | Simulate RevenueCat webhook | Subscription state updated | P0 |
| INT-08 | Telegram webhook → Transaction | Send message to Telegram bot | Transaction created via edge function | P0 |
| INT-09 | WhatsApp webhook → Transaction | Send message to WhatsApp bot | Transaction created via edge function | P0 |
| INT-10 | Receipt scan function → Groq vision | Upload test receipt | Groq returns parsed data → transaction created | P0 |
| INT-11 | Sync engine: offline → online | Create transactions offline → come online | Sync queue processed, server reconciled | P0 |
| INT-12 | Sync engine: conflict resolution | Edit same record on two devices offline → sync | Conflict resolved (last-write-wins or merge) | P0 |
| INT-13 | Auth → RLS policy verification | User A tries to read User B's data via direct Supabase query | RLS blocks, empty result returned | P0 |
| INT-14 | Payment callback → redirect | Complete Midtrans payment → callback to `payment-callback` | User redirected to success page, subscription active | P1 |
| INT-15 | AI chat → quota check | Free user hits daily limit | Function returns quota exhausted, no Groq call made | P1 |

---

### 4.3 Performance Testing

| ID | Test Case | Scenario | Success Criteria | Tool / Method |
|----|-----------|----------|------------------|--------------|
| PERF-01 | App cold start (mobile) | Fresh launch on low-end device | < 3s to interactive | Flipper / ADB logs |
| PERF-02 | App cold start (web/PWA) | First load on slow 3G | < 5s LCP, < 2s TTI | Lighthouse |
| PERF-03 | Transaction list — 1K items | Render 1000 transactions | Scroll at 60fps, no jank | React DevTools Profiler |
| PERF-04 | Transaction list — 10K items | Render 10,000 transactions | Virtualized, no crash | React DevTools Profiler |
| PERF-05 | Dashboard load with 6 months data | Seed heavy data | First contentful paint < 2s | Lighthouse / Flipper |
| PERF-06 | API response time — list transactions | 95th percentile response | < 500ms | k6 / curl timings |
| PERF-07 | API response time — AI chat | End-to-end NLP processing | < 5s (Groq response time) | Custom timing |
| PERF-08 | Offline sync — 200 queued transactions | Go online after offline batch | Sync completes < 10s | Manual + timing |
| PERF-09 | Receipt OCR — image upload + parse | 5MB receipt image | < 10s end-to-end | Manual + timing |
| PERF-10 | Chart rendering — 24 months data | Dashboard charts with 24 data points | Render < 500ms | React DevTools Profiler |
| PERF-11 | Memory — long session | Navigate all screens, back/forth | No memory leak, < 200MB | Flipper / Chrome Memory |
| PERF-12 | Bundle size (web) | Production JS bundle | < 250KB initial JS | `next build` analyzer |
| PERF-13 | Bundle size (mobile) | APK/AAB size | < 100MB | EAS build output |

---

### 4.4 Security Testing

| ID | Test Case | Steps / Scenario | Expected Outcome | Priority |
|----|-----------|------------------|------------------|----------|
| SEC-01 | RLS — data isolation | User A queries User B's ID via API | Empty array, no data leak | P0 |
| SEC-02 | RLS — workspace isolation | Member A queries workspace B's data | Empty array, no cross-workspace leak | P0 |
| SEC-03 | Auth — token expiry | Use expired JWT for API call | 401 Unauthorized, no data returned | P0 |
| SEC-04 | Auth — no token | Anonymous API call | 401 / 403, authentication required | P0 |
| SEC-05 | Edge function — unauthenticated | Call `ai-chat` without auth header | 401 Unauthorized | P0 |
| SEC-06 | Edge function — invalid auth | Call with malformed token | 401 Unauthorized | P0 |
| SEC-07 | Webhook — Midtrans signature | Send webhook without valid signature | 400 Bad Request, ignored | P0 |
| SEC-08 | Webhook — RevenueCat signature | Send webhook without valid signature | 400 Bad Request, ignored | P0 |
| SEC-09 | API key exposure | Check source for hardcoded keys | No keys in client bundle or source | P0 |
| SEC-10 | SQL injection attempt | Send malicious SQL in transaction description | Stored as literal text, no injection | P1 |
| SEC-11 | XSS in transaction notes | Add `<script>alert('xss')</script>` in note | Rendered as text, not executed | P1 |
| SEC-12 | Rate limiting — auth endpoints | Rapid-fire login attempts | Blocked after N attempts, rate limit enforced | P1 |
| SEC-13 | Rate limiting — AI chat | Excessive AI requests | Quota enforced, 429 after exhaustion | P1 |
| SEC-14 | Deep link validation | Malformed deep link to reset password | Rejected, no action taken | P1 |
| SEC-15 | Payment manipulation | Tamper with payment amount client-side | Server re-validates price, rejects mismatch | P0 |

---

### 4.5 Usability Testing

| ID | Test Case | Scenario | Success Criteria | Priority |
|----|-----------|----------|------------------|----------|
| USR-01 | First-time user onboarding | New user goes through login → empty dashboard | Clear next steps visible, not overwhelming | P1 |
| USR-02 | Add transaction — happy path | Tap FAB → fill → save | Takes < 30s for experienced user | P1 |
| USR-03 | Navigation consistency | Same flow on mobile and web | Same number of taps/clicks, similar layout | P1 |
| USR-04 | Error message clarity | Submit invalid data | Clear, actionable error message | P1 |
| USR-05 | Empty state everywhere | View each module with no data | Helpful illustration + CTA to add data | P1 |
| USR-06 | Dark mode consistency | Switch to dark mode across all screens | No unreadable text, all components themed | P1 |
| USR-07 | Offline indicator | Disconnect network | Clear banner/icon shows offline state | P1 |
| USR-08 | Loading states | Navigate to slow-loading screens | Skeleton/spinner shown, no blank screen | P1 |
| USR-09 | Keyboard navigation (web) | Tab through forms | All form elements focusable, logical order | P2 |
| USR-10 | Touch target size (mobile) | Tap all interactive elements | No element smaller than 44x44px | P1 |
| USR-11 | Guided tour functionality | First time on dashboard | Tour explains key features, can be dismissed | P2 |

---

### 4.6 Cross-Platform & Device Testing

| ID | Test Case | Scenario | Devices / Browsers | Priority |
|----|-----------|----------|--------------------|----------|
| CPT-01 | Mobile — Android | Full functional smoke test | Pixel 7 (Android 14), Samsung A12 (Android 12) | P0 |
| CPT-02 | Mobile — iOS | Full functional smoke test | iPhone 15 (iOS 18), iPhone SE (iOS 17) | P0 |
| CPT-03 | Web — Chrome | Full functional smoke test | Chrome 125+ | P0 |
| CPT-04 | Web — Firefox | Core functional test | Firefox 125+ | P1 |
| CPT-05 | Web — Safari | Core functional test | Safari 17+ | P1 |
| CPT-06 | Web — Edge | Core functional test | Edge 125+ | P1 |
| CPT-07 | Web — Mobile browser | Responsive layout test | Chrome on Pixel 7, Safari on iPhone | P1 |
| CPT-08 | Web — Tablet viewport | Layout at 768px / 1024px | No layout breakage, usable | P1 |
| CPT-09 | PWA — install prompt | Meet PWA criteria | Install banner shows, app installs | P1 |
| CPT-10 | PWA — offline mode | Install → disconnect → browse cached pages | Cached pages load, uncached shows fallback | P1 |

---

### 4.7 Regression Testing

**Regression suite should cover all P0 cases from every module.** This suite is executed as a full run before every release candidate.

| Module | P0 Test Cases (IDs) |
|--------|---------------------|
| Authentication | AUTH-01, AUTH-03, AUTH-05, AUTH-06, AUTH-07, AUTH-10 |
| Transactions | TXN-01, TXN-02, TXN-03, TXN-04, TXN-05, TXN-11, TXN-12 |
| Budgets | BGT-01, BGT-02 |
| Savings | SAV-01, SAV-02 |
| Debts | DBT-01, DBT-02, DBT-03, DBT-04 |
| Events | EVT-01, EVT-02, EVT-05 |
| AI Chat | AI-01, AI-03, AI-04 |
| Telegram | TEL-01, TEL-02 |
| WhatsApp | WA-01, WA-02 |
| Workspaces | WKS-01, WKS-02, WKS-04, WKS-06 |
| Subscriptions | SUB-01, SUB-04, SUB-06 |
| User Features | KRE-01, KRE-02 |
| Dashboard | DSH-01, DSH-02, DSH-03 |
| Integration | INT-01, INT-02, INT-03, INT-04, INT-05, INT-11, INT-13 |
| Security | SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-07, SEC-09, SEC-15 |

---

## 5. Testing Timeline

```
Phase 0: Preparation          Phase 1: Core Functional    Phase 2: Integration
  Days 1-3                      Days 4-8                    Days 9-12
┌──────────────────────┐      ┌──────────────────────┐    ┌──────────────────────┐
│ Environment setup    │      │ Auth tests           │    │ Supabase API tests   │
│ Test data seeding    │      │ Transaction tests    │    │ Edge function tests  │
│ Test device prep     │      │ Budget tests         │    │ Payment integration  │
│ Tool installation    │      │ Savings tests        │    │ Bot integration      │
│ Shared API stubs     │      │ Debt tests           │    │ Sync engine tests    │
│                      │      │ Event tests          │    │ AI/receipt tests     │
│                      │      │ Dashboard tests      │    │                      │
│                      │      │ Workspace tests      │    │                      │
└──────────────────────┘      └──────────────────────┘    └──────────────────────┘

Phase 3: Non-Functional     Phase 4: Regression        Phase 5: Release Candidate
  Days 13-15                   Days 16-18                 Days 19-21
┌──────────────────────┐      ┌──────────────────────┐  ┌──────────────────────┐
│ Performance tests    │      │ Full regression run  │  │ Bug fix validation   │
│ Security tests       │      │ Cross-platform tests │  │ Final smoke test     │
│ Usability tests      │      │ Edge case retest     │  │ Sign-off meeting      │
│ Device/browser tests │      │ Bug regression       │  │ Release checklist    │
│ Offline/Sync perf    │      │                      │  │                      │
└──────────────────────┘      └──────────────────────┘  └──────────────────────┘
```

### 5.1 Daily Workflow

1. **Morning (30 min):** QA sync — review bugs found previous day, assign priorities, triage.
2. **Execute (4-5 hrs):** Run test cases for current phase. Log results in test management tool.
3. **Bug reporting (1 hr):** File detailed bug reports with steps, expected vs actual, screenshots/logs.
4. **Dev fix validation (1 hr):** Retest fixed bugs from previous days.
5. **End of day (30 min):** Update status dashboard, flag blockers.

### 5.2 Bug Severity Classification

| Severity | Definition | Action |
|----------|------------|--------|
| **P0 — Critical** | Core feature broken, data loss, security breach | Stop testing — immediate fix required |
| **P1 — Major** | Feature unusable, incorrect results | Fix before next phase |
| **P2 — Minor** | Feature works but with inconvenience | Fix before release |
| **P3 — Cosmetic** | UI alignment, typo, low-impact visual | Fix if time permits |

### 5.3 Bug Report Template

```
Title: [Module] Brief description
Environment: [Mobile Android/iOS / Web Chrome/Firefox/...]
Build/Version: [commit hash / build number]
Severity: P0/P1/P2/P3
Steps to Reproduce:
  1. ...
  2. ...
Expected Result:
Actual Result:
Attachments: [screenshot / video / log]
```

---

## 6. Risk Analysis & Fallback Strategies

### 6.1 Risk Matrix

| Risk | Likelihood | Impact | Mitigation | Fallback |
|------|-----------|--------|------------|----------|
| **Critical P0 bug found in Phase 5 (late stage)** | Medium | Very High | Prioritize P0 testing early; automated smoke suite runs daily | Fix + full regression on the fixed area only; if unfixable in 24h, delay release |
| **Supabase outage during testing** | Low | High | Use Supabase local emulator for all integration tests | Retry after 1h; if persistent, proceed with emulator-only testing, document limitation |
| **3rd-party API breaking change (Groq, Midtrans, etc.)** | Medium | High | Pin API versions; use sandbox/test keys for all third parties | Switch to mock/stub; report to provider; evaluate if feature can ship with degraded mode |
| **Offline sync data loss** | Low | Critical | Automated sync tests with conflict scenarios; manual test with 200+ items | Add logging to diagnose; if reproducible, block release — data integrity is P0 |
| **Mobile app crashes on specific device** | High | Medium | Test on top 5 devices (Pixel, Samsung, iPhone) + emulator | Add device to exclusion list if isolated; investigate root cause as P1 |
| **Web app PWA install fails on some browsers** | Medium | Low | Test PWA on Chrome, Edge, Safari | Accept as known limitation; document supported browsers |
| **Incomplete test coverage due to time** | Medium | Medium | Focus all P0/P1 tests; defer P3 to post-release | Ship with known minor issues documented in release notes |
| **Environment configuration drift (staging ≠ production)** | Medium | High | Use identical Supabase config (plan, region); IaC for infra | Full dry-run on production staging 48h before release; snapshot comparison |

### 6.2 Fallback Decision Flow

```
P0 Bug Found?
    ├── Yes → Can fix in < 8h?
    │           ├── Yes → Fix immediately, verify, continue
    │           └── No  → Can we disable the feature?
    │                       ├── Yes → Feature-flag off, ship without it, document
    │                       └── No  → HOLD RELEASE. Reschedule for next cycle.
    └── No  → P1 Bug Found?
                ├── Yes → Log, fix before release, verify
                └── No  → P2/P3 → Log, defer to next release

Decision Gate: End of Phase 5 Day 2
    - P0 count == 0?           → Proceed to release
    - P0 count > 0, fixable?   → Extend by 1 day
    - P0 count > 0, unfixable? → HOLD
```

---

## 7. Release Readiness Checklist

This checklist must be fully completed before any production release is approved.

### 7.1 Testing Completion

| # | Item | Status | Verified By |
|---|------|--------|-------------|
| 1 | All P0 test cases passed | ☐ | |
| 2 | All P1 test cases passed | ☐ | |
| 3 | P2/P3 items reviewed and triaged | ☐ | |
| 4 | Regression suite passed on both platforms | ☐ | |
| 5 | Cross-browser testing complete (Chrome, Firefox, Safari, Edge) | ☐ | |
| 6 | Cross-device testing complete (Android, iOS) | ☐ | |
| 7 | Offline sync tested (create offline → sync → verify) | ☐ | |
| 8 | Payment flow tested in sandbox (Midtrans, Mayar, RevenueCat) | ☐ | |
| 9 | RLS policy audit passed — no data leak | ☐ | |
| 10 | No hardcoded secrets / API keys in client bundle | ☐ | |

### 7.2 Build & Deploy

| # | Item | Status | Verified By |
|---|------|--------|-------------|
| 11 | Mobile: EAS production build succeeds (Android AAB + iOS IPA) | ☐ | |
| 12 | Web: `npm run build` succeeds with 0 errors | ☐ | |
| 13 | Web: Vercel preview deploy passes all checks | ☐ | |
| 14 | Web: Lighthouse scores ≥ 85 (Performance, Accessibility, Best Practices) | ☐ | |
| 15 | Supabase migrations applied to production (no conflicts) | ☐ | |
| 16 | Environment variables configured in production (Supabase, Groq, Midtrans, etc.) | ☐ | |

### 7.3 Data & Compliance

| # | Item | Status | Verified By |
|---|------|--------|-------------|
| 17 | Privacy policy and terms of service accessible | ☐ | |
| 18 | Production database backed up | ☐ | |
| 19 | Rollback plan documented and tested | ☐ | |
| 20 | Analytics / crash reporting configured (if applicable) | ☐ | |

### 7.4 Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | ☐ |
| Tech Lead | | | ☐ |
| Product Owner | | | ☐ |

### 7.5 Post-Release Monitoring

| Item | Duration | Action |
|------|----------|--------|
| Crash rate monitoring | 48h post-release | Alert if > 0.1% crash rate |
| Payment success rate | 24h post-release | Verify > 95% success rate |
| Sync error rate | 48h post-release | Verify < 1% sync failures |
| Support ticket volume | 1 week post-release | Compare to baseline |
| Rollback threshold | Immediate | If P0 bug found in production → rollback within 1h |

---

## Appendix A: Test Environment Setup

### A.1 Local Development Testing

```bash
# 1. Install dependencies
npm ci

# 2. Build shared package
npm run shared:build

# 3. Start Supabase local emulator
cd supabase
npx supabase start

# 4. Seed test data
node scripts/seed-testuser.js
node scripts/seed-transactions.js

# 5a. Start web app
cd packages/web && npm run dev

# 5b. Start mobile app
cd packages/mobile && npx expo start
```

### A.2 Staging Environment

- **Supabase staging project:** Separate from production. Reset from clean migration daily.
- **Web:** Vercel preview deployment linked to staging branch.
- **Mobile:** EAS Build internal distribution build.
- **3rd-party sandbox keys:** Midtrans sandbox, RevenueCat test environment, Groq test quota.

### A.3 Required Test Devices

| Device | OS Version | Type |
|--------|-----------|------|
| Pixel 7 | Android 14 | Primary Android device |
| Samsung Galaxy A12 | Android 12 | Low-end Android |
| iPhone 15 | iOS 18 | Primary iOS device |
| iPhone SE (3rd gen) | iOS 17 | Small-screen iOS |
| Desktop (Windows) | Chrome 125+ | Primary web target |
| Desktop (macOS) | Safari 17+ | Secondary web target |

### A.4 Recommended QA Tools

| Tool | Purpose |
|------|---------|
| Supabase Local Emulator | Offline integration testing |
| Supabase Studio (staging) | DB inspection, RLS verification |
| Postman / Bruno | Edge function API testing |
| Lighthouse (Chrome) | Web performance auditing |
| Flipper / React DevTools | Mobile performance / profiling |
| ADB logcat | Android crash log capture |
| Detox | Mobile E2E automation (future) |
| Playwright | Web E2E automation (future) |
| k6 | API load testing (future) |

---

## Appendix B: Quick Reference — Module-to-Priority Mapping

| Module | P0 Cases | P1 Cases | P2/P3 Cases |
|--------|----------|----------|-------------|
| Authentication | 5 | 3 | 2 |
| Transactions | 6 | 6 | 3 |
| Budgets | 2 | 3 | 3 |
| Savings | 2 | 3 | 2 |
| Debts | 4 | 3 | 1 |
| Events | 3 | 3 | 1 |
| AI Chat | 4 | 2 | 1 |
| Telegram | 2 | 1 | 2 |
| WhatsApp | 2 | 1 | 0 |
| Workspaces | 4 | 3 | 1 |
| Subscription | 4 | 3 | 1 |
| User Features | 2 | 3 | 1 |
| Dashboard | 3 | 2 | 0 |
| Settings | 0 | 6 | 1 |

---

*End of Testing Plan*
