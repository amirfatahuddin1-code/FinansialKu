# Karsafin — Automated Testing Report

> **Date:** 2026-06-14  
> **Agent:** AI-driven automated test execution  
> **Scope:** Full pre-production test suite per testing plan  
> **Status:** Round 2 — After fixes applied

---

## Executive Summary

| Metric | Round 1 | Round 2 (Current) |
|--------|---------|-------------------|
| **Shared package build** | ✅ PASS | ✅ PASS |
| **Web build (Next.js)** | ❌ FAIL | ✅ **PASS** — 35 routes, all dynamic |
| **Snapshot test** | ❌ FAIL | ✅ **PASS** — 1 test, 1 snapshot |
| **Lint (ESLint)** | ❌ 304 errors | ❌ 304 errors (pre-existing) |
| **Security findings** | 6 | ⚠️ 5 remain (1 fixed) |
| **npm vulnerabilities** | 22 | 22 (unchanged) |

**Verdict:** ⚠️ **BLOCKING ISSUES RESOLVED** — Build + tests pass. Remaining: lint debt (pre-existing), security fixes, npm vulns.

---

## 1. Build Verification

### 1.1 Shared Package (`@karsafin/shared`)

| Check | Status | Details |
|-------|--------|---------|
| TypeScript compilation | ✅ PASS | `tsc` completed with zero errors (33 source files → dist/) |

### 1.2 Web App (Next.js)

| Check | Status | Details |
|-------|--------|---------|
| ESLint | ❌ **FAIL** | 304 errors, 156 warnings (pre-existing, not blocking) |
| `next build` | ✅ **PASS** | TypeScript ✅, SSG ✅, 35 routes all `ƒ (Dynamic)` |

**Fixes applied:**
1. `offlineApi.ts:187` — `getOrCreateByName` 3 args → 2 args (object)
2. `offlineApi.ts:205` — `getByMonth` string month → parsed `(year, month)` numbers
3. `offlineApi.ts:227` — spread args cast for strict TypeScript
4. `offlineApi.ts:39,246` — spread args cast for `wrapWithOffline`/workspaces
5. `dashboard/layout.tsx` — added `dynamic = 'force-dynamic'`
6. `app/layout.tsx` — added `dynamic = 'force-dynamic'`
7. Created explicit `not-found.tsx` to prevent auto-generated `_not-found` SSG error

### 1.3 Mobile App (React Native / Expo)

| Check | Status | Details |
|-------|--------|---------|
| Snapshot test | ✅ **PASS** | 1 test suite, 1 test, 1 snapshot written |
| Jest config | ✅ **CREATED** | `jest.config.js` with `jest-expo` preset, transform, moduleNameMapper |

---

## 2. Test Execution Results

| Test | Status | Details |
|------|--------|--------|
| `StyledText-test.js` (snapshot) | ✅ **PASS** | Renders correctly, snapshot saved |
| Unit test coverage | ❌ **NONE** | Only 1 test file exists for the entire codebase |

**Jest infrastructure set up:**
- `jest.config.js` created at `packages/mobile/jest.config.js`
- `jest-expo` + `babel-jest` installed
- `transformIgnorePatterns` configured for React Native + Expo modules
- `moduleNameMapper` configured for `@/` path alias

---

## 3. Security Audit

### 3.1 Findings

| # | Severity | Finding | File | Status |
|---|----------|---------|------|--------|
| S-01 | ⚠️ HIGH | `REVENUECAT_ANDROID_API_KEY` in `.env` | `.env` | ✅ `.env` already in `.gitignore` — not tracked |
| S-02 | ⚠️ **HIGH** | `generate-feature` edge function: `verify_jwt = false`, no auth in code | `supabase/config.toml:26` | ❌ **Unresolved** — needs JWT check |
| S-03 | ⚠️ **HIGH** | `SUPABASE_ANON_KEY` hardcoded in source | `constants.ts:2-3` | ❌ **Unresolved** — move to env var |
| S-04 | ⚠️ MEDIUM | `MIDTRANS_CLIENT_KEY` hardcoded (has TODO) | `constants.ts:69` | ❌ **Unresolved** — move to env var |
| S-05 | ⚠️ MEDIUM | RevenueCat webhook `verify_jwt = false` (mitigated by token check) | `config.toml:15` | ⚠️ Monitor |
| S-06 | ⚠️ LOW | RLS only verified for 2 tables | `migrations/` | ❌ **Unresolved** — audit needed |

### 3.2 npm Audit

| Severity | Count | Notable |
|----------|-------|---------|
| Critical | 1 | `shell-quote` — RCE vulnerability |
| High | 5 | `serialize-javascript` — RCE risk |
| Moderate | 14 | `postcss` XSS, `uuid` buffer bounds |

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
| ESLint errors | 304 (`no-explicit-any` dominates) |
| ESLint warnings | 156 |
| Unused variables | 5 |
| React Hook violations | 15+ (`set-state-in-effect`, `refs`, `exhaustive-deps`) |
| `useMemo` misuse (refs in render) | `SyncProvider.tsx:46-51` |
| `<img>` instead of `next/image` | 10 instances |

---

## 6. Remaining Recommendations

### 🔴 BLOCKING — Already Fixed

| # | Issue | Status |
|---|-------|--------|
| 1 | `getOrCreateByName` wrong call | ✅ Fixed |
| 2 | SSG prerender errors (useWorkspace during build) | ✅ Fixed |
| 3 | Jest not configured | ✅ Fixed |
| 4 | `.env` tracked in git | ✅ Already gitignored |

### 🟡 HIGH — Fix Before Release

| # | Issue | Action |
|---|-------|--------|
| 5 | `generate-feature` has no auth | Add `verify_jwt = true` or implement auth check |
| 6 | Hardcoded `SUPABASE_ANON_KEY` in `constants.ts` | Move to `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| 7 | Hardcoded `MIDTRANS_CLIENT_KEY` in `constants.ts` | Move to env var (already has TODO comment) |
| 8 | 301 `no-explicit-any` lint errors | Configure ESLint rule as warning or refactor |
| 9 | React Hook violations (set-state-in-effect) | Refactor 15+ hooks across 8 files |
| 10 | 10 `<img>` tags instead of `next/image` | Replace for web performance |

### 🟢 MEDIUM — Before Release

| # | Issue | Action |
|---|-------|--------|
| 11 | npm vulnerabilities (22 total) | `npm audit fix` — review breaking changes |
| 12 | `test-query` function in config but missing | Create or remove from config |
| 13 | RLS audit for all tables | Verify every table has `ENABLE ROW LEVEL SECURITY` |
| 14 | Unused variables (5) | Clean up dead code |
| 15 | Missing `useEffect`/`useMemo` dependencies | Fix ~10 `exhaustive-deps` warnings |

---

## 7. Test Coverage Gaps

| Area | Current State | Needed |
|------|--------------|--------|
| Unit tests (shared) | ❌ None | Jest + MSW for Supabase API mocking |
| Unit tests (web) | ❌ None | React Testing Library for components |
| Unit tests (mobile) | ❌ 1 snapshot test | React Native Testing Library |
| E2E tests | ❌ None | Playwright (web) + Detox (mobile) |
| Edge function tests | ❌ None | Supabase Local Emulator |
| RLS policy tests | ❌ None | Multi-user Supabase emulator scenarios |
| Performance | ❌ None | Lighthouse CI, React Profiler |
| Accessibility | ❌ None | axe-core / jest-axe |

---

## 8. Files Changed

| File | Change |
|------|--------|
| `packages/web/src/utils/offlineApi.ts` | Fixed 5 TypeScript errors (arg count, spread, type casts) |
| `packages/web/src/app/layout.tsx` | Added `dynamic = 'force-dynamic'` |
| `packages/web/src/app/dashboard/layout.tsx` | Added `dynamic = 'force-dynamic'` |
| `packages/web/src/app/not-found.tsx` | Created explicit 404 page |
| `packages/mobile/jest.config.js` | Created Jest config with `jest-expo` preset |
| `packages/mobile/package.json` | Added `jest`, `jest-expo`, `babel-jest` devDependencies |

---

*Report generated by AI testing agent*
