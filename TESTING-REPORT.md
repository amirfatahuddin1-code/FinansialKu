# Karsafin — Automated Testing Report

> **Date:** 2026-06-14  
> **Agent:** AI-driven automated test execution  
> **Scope:** Full pre-production test suite per testing plan

---

## Executive Summary

| Metric | Result |
|--------|--------|
| **Total test categories executed** | 7 |
| **Tests passed** | 1 of 2 executable |
| **Build failures** | 2 (web lint, web build) |
| **Security findings** | 6 |
| **TypeScript errors found** | 304 lint errors, 1 type error blocking build |
| **npm vulnerabilities** | 22 (16 moderate, 5 high, 1 critical) |

**Verdict:** ⚠️ **NOT RELEASE READY** — 2 blocking issues + 6 security findings.

---

## 1. Build Verification

### 1.1 Shared Package (`@karsafin/shared`)

| Check | Status | Details |
|-------|--------|---------|
| TypeScript compilation | ✅ PASS | `tsc` completed with zero errors (33 source files → dist/) |

### 1.2 Web App (Next.js)

| Check | Status | Details |
|-------|--------|---------|
| ESLint | ❌ **FAIL** | 304 errors, 156 warnings |
| `next build` | ❌ **FAIL** | TypeScript error blocks compilation |

**Critical build error** — `packages/web/src/utils/offlineApi.ts:187`:
```
Type error: Expected 2 arguments, but got 3.
```
The `getOrCreateByName` function in `packages/shared/src/supabase/categories.ts:56` accepts 2 parameters:
```typescript
getOrCreateByName(userId: string, categoryInput: { name: string; type: ...; icon: string; color: string })
```
But `offlineApi.ts:187` calls it with 3:
```typescript
originalGetOrCreate(userId, name, type)  // 3 args instead of 2
```

**301 of 304 lint errors** are `@typescript-eslint/no-explicit-any` — suggesting disabling this rule or refactoring.

### 1.3 Mobile App (React Native / Expo)

| Check | Status | Details |
|-------|--------|---------|
| Snapshot test | ❌ **FAIL** | Jest cannot parse JSX/React Native without proper transform config |
| TypeScript check | ✅ (via Expo) | TypeScript config extends `expo/tsconfig.base` |

---

## 2. Existing Test Execution

| Test | Status | Issue |
|------|--------|-------|
| `StyledText-test.js` (snapshot) | ❌ **FAIL** | Jest missing Babel transform for React Native; no `jest.config.js` configured |
| Unit test coverage | ❌ **NONE** | Only 1 test file exists for the entire codebase |

**Root cause:** No Jest config, no `transformIgnorePatterns` for `react-native`, no `moduleNameMapper` for Expo aliases.

---

## 3. Security Audit

### 3.1 Findings

| # | Severity | Finding | File | Recommendation |
|---|----------|---------|------|----------------|
| S-01 | ⚠️ **HIGH** | `REVENUECAT_ANDROID_API_KEY` committed in `.env` (tracked) | `.env` | Add `.env` to `.gitignore` immediately; rotate key |
| S-02 | ⚠️ **HIGH** | `generate-feature` edge function has `verify_jwt = false` in config AND no auth check in function body | `supabase/config.toml:26` | Enable `verify_jwt = true` or add explicit auth check |
| S-03 | ⚠️ **HIGH** | `SUPABASE_ANON_KEY` hardcoded in source code | `packages/shared/src/utils/constants.ts:2-3` | Move Supabase URL and anon key to env vars |
| S-04 | ⚠️ **MEDIUM** | `MIDTRANS_CLIENT_KEY` hardcoded with comment "move to env vars" | `packages/shared/src/utils/constants.ts:69` | Address the TODO — move to env vars |
| S-05 | ⚠️ **MEDIUM** | RevenueCat webhook: `verify_jwt = false` (mitigated by optional token check) | `supabase/config.toml:15` | Ensure `REVENUECAT_WEBHOOK_SECRET` is set in production |
| S-06 | ⚠️ **LOW** | RLS policies found for `user_features` + `feature_errors` tables only; other tables not verified in these migrations | `supabase/migrations/` | Audit ALL tables for RLS enablement |

### 3.2 npm Audit

| Severity | Count | Notable |
|----------|-------|---------|
| Critical | 1 | `shell-quote` — RCE vulnerability |
| High | 5 | `serialize-javascript` — RCE risk |
| Moderate | 16 | `postcss` XSS, `uuid` buffer bounds |

---

## 4. Edge Function Review

| Function | `verify_jwt` | Auth in Code | Status |
|----------|-------------|-------------|--------|
| `test-query` | `true` | N/A (JWT) | ⚠️ Referenced in config but function directory missing |
| `ai-chat` | Not specified (default true) | JWT | ✅ |
| `create-payment` | Not specified (default true) | JWT | ✅ |
| `midtrans-webhook` | Not specified (default true) | JWT | ✅ |
| `payment-callback` | Not specified (default true) | JWT | ✅ |
| `revenuecat-webhook` | `false` | Optional Bearer token | ⚠️ Has own auth check |
| `scan-receipt` | Not specified (default true) | JWT | ✅ |
| `telegram-webhook` | Not specified (default true) | JWT | ✅ |
| `whatsapp-webhook` | Not specified (default true) | JWT | ✅ |
| `whatsapp-evo` | Not specified (default true) | JWT | ✅ |
| `seed-transactions` | Not specified (default true) | JWT | ✅ |
| **`generate-feature`** | **`false`** | **NONE** | ❌ **NO AUTH** — uses GROQ_API_KEY directly |

---

## 5. Code Quality Summary

| Metric | Value |
|--------|-------|
| Total `any` type usage (shared) | 42 occurrences |
| Unused variables/vars | 5 (found by ESLint) |
| React Hook violations | 15+ (`set-state-in-effect`, `refs`, `exhaustive-deps`) |
| `useMemo` misuse (refs accessed during render) | `SyncProvider.tsx:46-51` |
| Performance concern: `<img>` instead of `next/image` | 10 instances across components |

---

## 6. Recommendations (Priority Order)

### 🔴 BLOCKING — Fix Before Release

1. **Fix `getOrCreateByName` call** (`offlineApi.ts:187`) — change `originalGetOrCreate(userId, name, type)` to `originalGetOrCreate(userId, { name, type, icon: 'help-circle', color: '#64748b' })`
2. **Secure `generate-feature` edge function** — add JWT verification or explicit auth check
3. **Remove .env from git tracking** — add to `.gitignore`, rotate leaked keys
4. **Move hardcoded keys to env vars** — `SUPABASE_ANON_KEY`, `MIDTRANS_CLIENT_KEY` in `constants.ts`

### 🟡 HIGH — Fix Before Release

5. **Address all `no-explicit-any` violations** (301 errors) or configure ESLint to allow with documentation
6. **Fix React Hook violations** (`set-state-in-effect`) in: `EditTransactionModal`, `GlobalSearch`, `QuickAddAccountModal`, `SyncPopup`, `TagSelector`, `ThemeProvider`, `WorkspaceProvider`, `FeatureProvider`, `SyncProvider`
7. **Replace `<img>` with `next/image`** in 10 components for web performance
8. **Set up Jest config** for mobile package with proper Babel transforms

### 🟢 MEDIUM — Before Release

9. **Audit ALL Supabase tables for RLS** — confirm every table has `ENABLE ROW LEVEL SECURITY` and appropriate policies
10. **Fix `test-query` function** — either create it or remove from config
11. **Address npm vulnerabilities** — especially `shell-quote` (critical) and `serialize-javascript` (high)
12. **Add `Missing dependency` fixes** for `useEffect`/`useMemo` hooks

---

## 7. Test Coverage Gaps

| Area | Current State | Needed |
|------|--------------|--------|
| Unit tests (shared) | ❌ None | Jest + MSW for Supabase API mocking |
| Unit tests (web) | ❌ None | React Testing Library for components |
| Unit tests (mobile) | ❌ 1 snapshot test only | React Native Testing Library |
| E2E tests | ❌ None | Playwright (web) + Detox (mobile) |
| Edge function tests | ❌ None | Supabase Local Emulator + integration tests |
| RLS policy tests | ❌ None | Supabase Local Emulator with multi-user scenarios |
| Performance tests | ❌ None | Lighthouse CI, React Profiler snapshots |
| Accessibility tests | ❌ None | axe-core / jest-axe |

---

## 8. Immediate Next Steps

```bash
# 1. Fix the blocking build error
# Edit packages/web/src/utils/offlineApi.ts:187
# Change 3-arg call to 2-arg object

# 2. Secure the environment
echo ".env" >> .gitignore
git rm --cached .env

# 3. Move hardcoded keys to env vars

# 4. Set up Jest for mobile
npm install --save-dev jest jest-expo @testing-library/react-native
# Create jest.config.js with react-native transforms

# 5. Re-run verification
cd packages/web && npm run lint && npm run build
```

---

*Report generated by AI testing agent — full detailed log available upon request.*
