# Dependency review: October 7, 2026

## Exact audit evidence

The adjacent npm audit JSON files record this review's before/after snapshots (Node 24.19.0, npm 11.9.0). Counts are affected packages, including propagated findings, not unique vulnerabilities.

| Scope | Before | After |
| --- | --- | --- |
| Full dependency tree | 27: 2 critical, 22 high, 3 moderate | 5 high, all from one development-only advisory |
| Production (`--omit=dev`) | 7: 4 high, 3 moderate | 0 |

The full scan is **not clean**. No audit suppression, severity threshold, lint-rule removal, or unmaintained package fork is used. Release review must explicitly consider the residual risk below.

## Changes

- Lockfile patch updates: sharp 0.35.4 → 0.35.5 (including corresponding platform/libvips binaries); source-map-js 1.2.1 → 1.2.2; brace-expansion 1.1.18 → 1.1.21 and 5.0.9 → 5.0.12
- The normal npm lockfile refresh pruned unused optional AJV 8 peer packages (`ajv`, `fast-uri`, `json-schema-traverse`, `require-from-string`) from the resolver dependency tree. The application uses `@hookform/resolvers/zod`; no application imports depend on AJV. ESLint retains its own AJV 6 dependency
- Vitest 3.2.7 → 4.1.11 fixes GHSA-82fw-gwwq-j7x9 and removes the vulnerable tinypool dependency (GHSA-5gmw-xhrv-c9v3 / GHSA-85c8-ppgw-ccpr). Vite is pinned at the existing 7.3.6, within Vitest 4's supported peer range. The newly resolved Vite 8 default preserved JSX and failed six existing UI suites; retaining Vite 7 avoids an unrelated transform migration
- No application framework major upgrade, database migration, notification change, or production configuration change

## Residual development-tool finding

[GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects braces ≤3.0.3. Deeply nested brace patterns can exhaust recursive AST walkers and crash the Node process. The advisory lists no patched version.

Exact installed path:

`eslint-config-next@16.2.4 → @next/eslint-plugin-next@16.2.4 → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3`

Registry checks during review found latest braces 3.0.3; latest micromatch 4.0.8 still requires braces ^3.0.3; latest fast-glob 3.3.3 still requires micromatch ^4.0.8; the latest Next lint plugin still requires fast-glob 3.3.1. A compatible parent update therefore does not remove this advisory.

Inspection of the installed plugin's `dist/utils/get-root-dirs.js` shows its fast-glob call receives `settings.next.rootDir`. This repository does not configure that setting. The default uses `context.cwd` directly without globbing. No resident request input reaches this lint-only path in the inspected application. This limits the identified exposure to developer/CI tooling and attacker-controlled lint configuration, rather than an identified production request path; it is not a claim that the dependency is fixed.

Keep linting enabled, review configuration changes before running them, and re-evaluate when a maintained patch or parent replacement is available. Production scan cleanliness does not replace exact-head CI or independent release review.

## Verification of this update

After a fresh `npm ci`: ESLint, TypeScript, all 383 Vitest tests across 43 files, 31 Python publisher tests, and the standalone production build passed. The Vitest full-suite run used `--pool=threads --maxWorkers=1 --no-file-parallelism`; the new editor-focused suite also passed with the default pool. Repeated audit after that clean install preserved the counts above. The generated standalone dependency directory contains none of braces, fast-glob or micromatch.

A local production-server HTTP smoke check returned 200 for `/` and `/notifications`, 404 for an unknown route, `{"accepting":false}` from the intake availability endpoint, and 403 for unauthenticated admin access. No external account, database or notification was used.

Local Playwright attempts failed at Chromium launch before assertions (`process_singleton_posix` socket EPERM). Browser acceptance therefore remains gated on the existing desktop/mobile CI workflow for the final pushed commit. No restriction was bypassed and these failed launch attempts are not reported as browser test passes.
