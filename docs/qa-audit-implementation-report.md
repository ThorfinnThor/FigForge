# FigForge QA audit implementation review

Review date: 2026-10-08  
Audit input: `figforge-audit-report.md`  
Audited base commit: `348891bf05f729475529917d2aa85c69c2fea638`

This document records the repository-backed decision for every meaningful finding before implementation. The audit is treated as a hypothesis, not as a specification.

## Audit Review

### A01 — Failed draft restoration enables destructive autosave

Verdict: ⚠️ YES, BUT MODIFY  
Risk: MEDIUM

Why: The `finally` branch currently enables autosave even when draft restoration fails, so default React state can replace a valid stored document. The broad recovery-export proposal is larger than necessary because the parsed stored document remains in IndexedDB when dependency restoration fails.

Audit recommendation: Model explicit hydration outcomes, preserve recoverable data, add retry/recovery, and guard overlapping restores.

Implementation decision: Replace the Boolean hydration gate with explicit loading/ready/recovery-required state; only autosave after a successful restore or confirmed empty store; add retry; invalidate superseded restore operations. Do not add a raw-data export format in this change.

Potential impact: Draft initialization, autosave status, imports, collection loads, and transient catalog/color failures.

### A02 — Incoming share and collection links replay over edited drafts

Verdict: ⚠️ YES, BUT MODIFY  
Risk: MEDIUM

Why: Share fragments and `figureId` remain in the address after successful import, so their immutable snapshot wins again on refresh. Creating a second backup/history system is not justified by the current single-draft product model.

Safer approach: Commit the successfully validated imported snapshot as the current draft, then consume only the relevant hash/query parameter with `history.replaceState`. Keep an invalid or failed import URL intact for diagnosis/retry.

Potential impact: Share links, collection “open in builder”, browser refresh, URL handling, and draft precedence.

### A03 — Mobile tabs are not reachable through ordinary keyboard navigation

Verdict: ✅ YES — Makes Sense  
Risk: LOW

Why: The component uses a roving tab stop but has no Arrow/Home/End handler. This is incomplete tab semantics and makes inactive tabs unreachable in the expected keyboard model.

Audit recommendation: Implement the WAI-ARIA tabs keyboard contract.

Implementation decision: Add automatic-activation Left/Right/Home/End navigation, focus movement, and regression coverage for tab ordering.

Potential impact: Narrow-layout tab focus and selected panel only.

### A04 — IndexedDB mutations resolve before transaction commit

Verdict: ✅ YES — Makes Sense  
Risk: MEDIUM

Why: Mutation methods await request success, which can precede a later transaction abort. UI success therefore does not prove durable commit.

Audit recommendation: Await transaction completion and test commit/abort behavior.

Implementation decision: Add a shared transaction-completion primitive registered before requests; resolve mutation methods only after `complete`; reject on `abort`/`error`; add real IndexedDB integration tests if the test runtime can support them without production dependencies.

Potential impact: Draft, collection, playground-layout, delete, and atomic clear mutations.

### A05 — Debounced autosave is not coordinated with navigation or clear

Verdict: ⚠️ YES, BUT MODIFY  
Risk: MEDIUM

Why: Dirty state appears only when the timer fires, normal anchor navigation can cancel the timer, and clear does not invalidate a queued save. A large new persistence controller is not required for the immediate defects.

Safer approach: Mark dirty immediately, revision-guard status updates, invalidate/cancel queued writes during clear, pause persistence after clear until the next edit, and commit before ordinary same-tab internal navigation.

Potential impact: Builder navigation, save feedback, clear-local-data semantics, and asynchronous write ordering.

### A06 — Rejected catalog loads remain cached

Verdict: ✅ YES — Makes Sense  
Risk: LOW

Why: The Promise cache retains rejected entries for the page lifetime. A transient failure cannot be retried.

Audit recommendation: Evict rejected cache entries and expose retry.

Implementation decision: Delete only the matching rejected Promise from the cache and add a catalog retry control.

Potential impact: Lazy category packages and document restoration dependencies.

### A07 — Failed model replacement can diverge from selected/exported parts

Verdict: ⚠️ YES, BUT MODIFY  
Risk: MEDIUM

Why: Selection/export state is committed before the scene load succeeds, while the controller can retain the previous object. Rolling the whole builder state back from inside the viewport would couple independent layers and risks losing the user’s intended selection.

Safer approach: Keep selection as the requested truth, represent preview synchronization failure separately, keep the warning across camera changes, and provide a retry that reapplies the current selection. Clearly state that the preview may be stale.

Potential impact: 3D status/recovery and user trust; no document/export contract change.

### A08 — Loaded documents lose their names

Verdict: ✅ YES — Makes Sense  
Risk: LOW

Why: The document schema owns a name, but editable workspace state does not. Every new serialization substitutes the localized default.

Audit recommendation: Preserve the name throughout restore/save/export/share.

Implementation decision: Add document-name state, restore it only after full validation, and serialize the preserved name. A rename UI is outside this audit fix.

Potential impact: Import, share, autosave, collection labels, and export metadata.

### A09 — Repeated collection saves create duplicate records

Verdict: ✅ YES — Makes Sense  
Risk: LOW

Why: Each activation creates a new UUID and there is no synchronous in-flight guard.

Audit recommendation: Guard re-entry and expose busy state without silently deduplicating later deliberate saves.

Implementation decision: Add a ref-backed in-flight guard and disable/show loading on the collection-save control until completion. Later saves remain explicit new copies.

Potential impact: Collection creation UI only.

### A10 — Fatal semantic-worker failures can remain pending indefinitely

Verdict: ⚠️ YES, BUT MODIFY  
Risk: MEDIUM

Why: Worker `error`/`messageerror` and timeouts are absent. Rebuilding a client in place is simpler and safer than introducing a new worker-management framework.

Safer approach: Reject and clear all pending operations on fatal errors, add bounded request timeouts, terminate the failed worker, retain lexical search, and expose a retry that creates a fresh client.

Potential impact: Semantic initialization/search status and worker lifecycle; lexical search remains available.

### I01 — Add behavioral persistence and browser regression coverage

Verdict: ⚠️ YES, BUT MODIFY  
Risk: MEDIUM

Why: The storage tests currently inspect schemas/source strings rather than transaction behavior. A complete Playwright release gate would add substantial infrastructure and deployment assumptions not present in the repository.

Safer approach: Add real IndexedDB integration coverage for CRUD, commit, clear, and migration plus focused logic tests for restored behavior. Record mounted/deployed browser coverage as remaining work instead of adding an unconfigured E2E stack in this patch.

Potential impact: Development dependencies and CI test time only.

### I02 — Set and measure a semantic startup budget

Verdict: ❌ NO — Do Not Implement automatically

Why: The audit explicitly did not measure a performance defect. Automatic semantic loading is current intentional product behavior, and the user previously requested it. Representative-device measurement is valid future product work, but changing loading behavior or inventing a budget without evidence would be speculative.

### I03 — Keep camera state consistent after scene recreation

Verdict: ✅ YES — Makes Sense  
Risk: LOW

Why: A new controller starts at three-quarter while React retains the previously pressed preset.

Audit recommendation: Reapply or reset the camera preset after recreation.

Implementation decision: Reapply the latest preset to each newly loaded controller and test the source/logic boundary.

Potential impact: Full 3D-scene recovery only.

### I04 — Add a compact current-version summary

Verdict: ✅ YES — Makes Sense  
Risk: LOW

Why: Current document schema 2 and database schema 3 are easy to confuse with historical milestone notes.

Audit recommendation: Add a compact current-state summary while retaining history.

Implementation decision: Add the summary to README without changing existing historical notes.

Potential impact: Documentation only.

## Decision groups before implementation

### Safe to implement

- A03, A04, A06, A08, A09, I03, I04.

### Implement with modification

- A01, A02, A05, A07, A10, I01, using the narrower approaches above.

### Do not implement

- I02 as a code change; no measured defect or approved budget exists.

### Dangerous

- None of the reviewed recommendations is inherently dangerous after narrowing scope. A storage-schema rewrite, automatic snapshot deduplication, or rollback of selected parts from viewport code would be high-risk alternatives and will not be introduced.

### Requires human decision

- Drawer semantics: modal dialog with focus containment versus deliberately non-modal drawer.
- Collection save semantics: update an opened saved record versus always create a new copy.
- Performance budget and representative device/network targets for the 42.45 MB semantic package.

These product decisions are not guessed in this implementation.

## Baseline verification

Before implementation, `npm run verify` passed on commit `348891bf`: 47 test files and 283 tests passed; TypeScript, ESLint, production build, data/asset validators, and Cloudflare dry-run passed. The build emitted the existing large-chunk advisory. No mounted browser E2E suite exists in the repository.

## Implementation report

### Outcome

- Findings reviewed: 14
- Implemented as proposed: 7 (`A03`, `A04`, `A06`, `A08`, `A09`, `I03`, `I04`)
- Implemented with a narrower solution: 6 (`A01`, `A02`, `A05`, `A07`, `A10`, `I01`)
- Not implemented: 1 (`I02`)
- Dangerous automatic changes: 0
- Production deployments: 0
- Dependency changes: 0

The implementation keeps the existing local-first architecture, document schema 2, IndexedDB schema 3, public routes, Rebrickable CSV-only source policy, and Cloudflare deployment model unchanged. The repository has no authentication, authorization, payment, backend API, or cloud-database surface that these changes could affect.

### Implemented findings

#### A01 — Safe hydration failure handling

Changes:

- Replaced the single hydration Boolean with `loading`, `ready`, and `recovery-required` states.
- Autosave is enabled only after a successful restoration or a confirmed empty draft store.
- A failed restoration leaves the existing IndexedDB record untouched and exposes a retry action.
- Restore operations use a monotonically increasing operation token; an edit or newer restore invalidates stale asynchronous completion.

Files: `src/components/CatalogWorkspace.tsx`, `src/i18n.tsx`, `src/styles/base.css`, `tests/unit/catalog-workspace.test.ts`.

#### A02 — One-time share and collection imports

Changes:

- A successfully validated share or `figureId` import is committed as the current draft before its URL identifier is consumed.
- `history.replaceState` removes only the FigForge share fragment or `figureId`; unrelated query parameters and ordinary fragments are preserved.
- Invalid or failed imports retain their URL so they can be diagnosed or retried.

Files: `src/components/CatalogWorkspace.tsx`, `src/figure/import-location.ts`, `tests/unit/import-location.test.ts`, `tests/unit/catalog-workspace.test.ts`.

#### A03 — Complete mobile tab keyboard movement

Changes:

- Added automatic activation for ArrowLeft, ArrowRight, Home, and End.
- Focus wraps at the ends and follows the selected panel.
- Non-tab keys remain untouched.

Files: `src/components/CatalogWorkspace.tsx`, `src/components/mobile-tab-navigation.ts`, `tests/unit/mobile-tab-navigation.test.ts`, `tests/unit/catalog-workspace.test.ts`.

#### A04 — Transaction-level IndexedDB success

Changes:

- Added a shared transaction-completion promise registered before mutation requests.
- Draft save, collection save/delete, playground save, and three-store clear now resolve only after `complete` and reject on `abort` or `error`.
- Existing database version, stores, keys, schemas, and migration behavior were not changed.

Files: `src/storage/figure-draft-store.ts`, `tests/unit/figure-storage.test.ts`.

#### A05 — Autosave lifecycle and navigation

Changes:

- User edits mark persistence as pending immediately.
- Debounced writes and status updates are revision-guarded.
- Clearing local data invalidates queued work and pauses persistence until the next explicit edit.
- Ordinary same-tab navigation to Builder, Collection, or Methodology commits the latest draft first; modified clicks retain normal browser behavior.
- A failed navigation commit keeps the user on the Builder and reports the persistence error.

Files: `src/components/CatalogWorkspace.tsx`, `tests/unit/catalog-workspace.test.ts`.

#### A06 — Retryable catalog packages

Changes:

- Only the matching rejected Promise is evicted from the category cache.
- The load-error state now offers a retry that creates a fresh package attempt.

Files: `src/components/catalog-workspace-data.ts`, `src/components/CatalogWorkspace.tsx`, `src/i18n.tsx`, `src/styles/base.css`, `tests/unit/catalog-workspace.test.ts`.

#### A07 — Explicit stale-preview state

Changes:

- The viewport reports whether the rendered scene matches the requested selection.
- Model replacement errors persist across camera changes, explicitly warn that older parts may still be visible, and provide a retry for the current selection.
- The figure/export panel also warns while synchronization is unconfirmed.
- Selection/export remain the requested document truth; viewport code does not roll back user state.

Files: `src/components/FigureViewport.tsx`, `src/components/FigurePartsPanel.tsx`, `src/components/CatalogWorkspace.tsx`, `src/i18n.tsx`, `tests/unit/catalog-workspace.test.ts`.

#### A08 — Figure-name preservation

Changes:

- Figure name is now workspace state.
- A fully validated restored document supplies the name used by autosave, collection save, JSON export, and share links.
- No rename UI was added because it was outside the finding.

Files: `src/components/CatalogWorkspace.tsx`, `tests/unit/catalog-workspace.test.ts`.

#### A09 — Collection-save re-entry guard

Changes:

- A synchronous ref guard prevents repeated activation while a write is pending.
- The button is disabled and shows its loading state until the transaction and collection refresh complete.
- A later deliberate activation still creates a new copy, preserving current product semantics.

Files: `src/components/CatalogWorkspace.tsx`, `src/components/FigurePartsPanel.tsx`, `tests/unit/catalog-workspace.test.ts`.

#### A10 — Bounded semantic-worker failures

Changes:

- Added runtime response validation, request timeouts, fatal `error` and `messageerror` handling, and synchronous `postMessage` failure handling.
- Fatal failure terminates the worker and rejects/clears every pending operation.
- The UI retains lexical search and offers a retry that constructs a fresh worker client.

Files: `src/search/semantic-search-client.ts`, `src/components/CatalogWorkspace.tsx`, `src/i18n.tsx`, `tests/unit/semantic-search-client.test.ts`.

#### I01 — Focused persistence and browser regression coverage

Changes:

- Added transaction completion/abort tests, URL-consumption tests, mobile-tab behavior tests, semantic-worker lifecycle tests, and source-boundary regressions for component wiring.
- Performed mounted local-browser checks against real browser IndexedDB for ordinary commits, collection persistence, navigation persistence, and collection-link consumption.

Limitation: `fake-indexeddb@6.2.4` could not be installed because npm TLS verification failed with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`. TLS verification was not disabled. Therefore the suite does not yet inject an abort into a real IndexedDB implementation or provide a full Playwright CI gate; transaction abort behavior is tested with a deterministic transaction double, while normal commits were exercised in the browser.

Files: `tests/unit/figure-storage.test.ts`, `tests/unit/import-location.test.ts`, `tests/unit/mobile-tab-navigation.test.ts`, `tests/unit/semantic-search-client.test.ts`, `tests/unit/catalog-workspace.test.ts`.

#### I03 — Camera state after scene recreation

Changes:

- The current camera preset is stored in a ref and applied to every newly loaded scene controller.
- Scene/model errors are no longer overwritten by an unrelated camera-status message.

Files: `src/components/FigureViewport.tsx`, `tests/unit/catalog-workspace.test.ts`.

#### I04 — Current technical summary

Changes:

- Added a compact README summary of routes, document/storage schema versions, slots, source policy, and release limitations without rewriting the historical milestone notes.

File: `README.md`.

### Rejected finding

`I02` was not implemented. The audit supplied no measurement, target device, network profile, or approved startup budget. The 42.45 MB semantic release is still automatically initialized because that is current intentional product behavior. A future change should begin with measurements on agreed representative devices and networks, then make a product decision about eager, idle, or user-triggered loading.

### Verification actually executed

1. Baseline before changes: `npm run verify` — passed with 47 test files and 283 tests.
2. Targeted during implementation:
   - `npm run typecheck` — passed.
   - `npm run lint` — passed.
   - `npx vitest run tests/unit/figure-storage.test.ts tests/unit/catalog-workspace.test.ts tests/unit/import-location.test.ts tests/unit/mobile-tab-navigation.test.ts tests/unit/semantic-search-client.test.ts` — 5 files, 40 tests passed.
3. Final repository verification: `npm run verify` — passed:
   - Python local-catalog pipeline tests: 6 passed.
   - All catalog, source-policy, mapping, asset, license, semantic-search, and Cloudflare validators passed.
   - TypeScript and ESLint passed.
   - Vitest: 50 files, 295 tests passed.
   - Vite production build passed.
   - Cloudflare Wrangler dry-run passed; no deployment was performed.
4. `git diff --check` — passed.
5. Mounted local browser at `http://localhost:5174/`:
   - Builder and three-part 3D preview reached ready state.
   - Saving to the local collection produced a committed collection entry and success status.
   - A head change followed immediately by Collection navigation survived the return to Builder, confirming the pre-navigation commit path.
   - Opening a collection entry through `?figureId=...` restored it and replaced the address with `/` only after success.

The production build retains the pre-existing Vite advisory for chunks larger than 500 kB. It is a performance advisory, not a build failure.

### Second-pass regression review

- Navigation: internal same-tab links are guarded; modified/new-tab clicks remain native.
- Persistence: no schema/version migration was introduced; mutation success now follows transaction completion.
- Restore races: user edits and newer restores invalidate older asynchronous restore results.
- Clear behavior: queued status/writes are invalidated and persistence stays paused until a new edit.
- Error handling: catalog and semantic failures are retryable; lexical search remains available.
- Mobile: tab focus order is explicit and independent of catalog state.
- 3D: selection errors remain visible through camera changes; scene recovery reapplies the active preset.
- Integrations: Rebrickable Catalog Downloads/CSV-only policy, no-MOC rule, GitHub/Actions, and Cloudflare assumptions are unchanged.
- Deployment: no workflow, environment, binding, or production target was changed.

### Remaining risks and human decisions

1. A real IndexedDB abort-after-request-success integration test remains desirable once the npm certificate chain is fixed or an approved existing browser test harness is available.
2. A mounted narrow-viewport keyboard E2E test is still missing; the navigation algorithm and component wiring are covered separately.
3. Model-request failure and WebGL context-loss paths are covered by state/source regressions but were not fault-injected in a live WebGL browser session.
4. The semantic package still has no measured startup budget; this is intentionally unresolved under `I02`.
5. The figure drawer remains deliberately non-modal. Converting it to a focus-trapped modal requires a product/accessibility decision.
6. Saving an opened collection record still creates a new copy rather than updating it. Changing that identity model requires a product decision.

### Changed files

- `README.md`
- `docs/qa-audit-implementation-report.md`
- `src/components/CatalogWorkspace.tsx`
- `src/components/FigurePartsPanel.tsx`
- `src/components/FigureViewport.tsx`
- `src/components/catalog-workspace-data.ts`
- `src/components/mobile-tab-navigation.ts`
- `src/figure/import-location.ts`
- `src/i18n.tsx`
- `src/search/semantic-search-client.ts`
- `src/storage/figure-draft-store.ts`
- `src/styles/base.css`
- `tests/unit/catalog-workspace.test.ts`
- `tests/unit/figure-storage.test.ts`
- `tests/unit/import-location.test.ts`
- `tests/unit/mobile-tab-navigation.test.ts`
- `tests/unit/semantic-search-client.test.ts`
