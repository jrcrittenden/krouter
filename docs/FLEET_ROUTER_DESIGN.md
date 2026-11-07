# Fleet router: governance, privacy, selection, and funding

Status: proposed design. This document does not implement runtime behavior or initialize SDS-Spec.

Baseline assessed: krouter-app 0.5.166, inspected 2026-10-28. Findings are based on source inspection and existing test inventory; tests were not run for this documentation change. This is an initial baseline inventory, not a complete application certification.

## Purpose and agreed requirements

Extend krouter as the foundation for the fleet's edge inference router while preserving useful routing behavior wherever governance permits it.

1. Apply requested E2EE at the edge or fail explicitly.
2. Analyze task/session needs only when permitted, then select an appropriately capable model.
3. Enforce configurable budget limits, distinguishing allotments from direct per-token spending.
4. Treat explicit family or exact-model selections as hard constraints throughout retries and fallback.
5. Apply governance per request and inherited scope. Keep adapters, account rotation, and fallback available within the permitted envelope.

The edge router is trusted with plaintext. It encrypts requests before upstream forwarding and decrypts responses at the edge. Client-to-router transport protection is a separate responsibility; upstream E2EE does not hide content from the router or secure an insecure client connection.

MUST/SHALL statements below describe target requirements. Baseline observations describe existing implementation, not proof that it meets the proposed fleet guarantees. Suggested mechanisms and unresolved decisions are identified separately.

## Existing baseline and adoption candidates

Adopt source-backed requirements for existing behavior before recording new guarantees. The older [architecture document](ARCHITECTURE.md) provides orientation, but its persistence descriptions need reconciliation with current database adapters.

| ID | Existing capability to preserve | Evidence | Limits |
| --- | --- | --- | --- |
| B-01 | Supported client protocols, provider translation, and streaming. | `src/app/api/v1/`, `src/app/api/v1beta/`, `open-sse/translator/`, `open-sse/handlers/chatCore.js` | Inventory protocol/provider/modality coverage; do not assume universal equivalence. |
| B-02 | API-key/OAuth connections, compatible provider nodes, and token refresh. | `src/app/api/providers/route.js`, `src/lib/oauth/`, `open-sse/services/oauthCredentialManager.js` | Authentication support does not establish E2EE or fleet authorization. |
| B-03 | Venice AI API-key chat inference and live model discovery. | `src/shared/constants/providers.js`, `src/shared/constants/liveFetch.js`, `open-sse/config/providers.js`, `open-sse/executors/base.js` | Standard HTTPS/Bearer integration exists. No Venice E2EE implementation was found. Discovering an E2EE-capable model does not enable encryption. |
| B-04 | Account selection/rotation, cooldowns, and provider quota preflight. | `src/sse/services/auth.js`, `open-sse/services/quotaPreflight.js`, `open-sse/config/providerStrategy.js` | Preflight uses cached reports and permits a request on a cold cache; it is not a hard financial reservation. |
| B-05 | Aliases, model combos, modality adapters, and optional emergency fallback. | `src/sse/services/model.js`, `open-sse/services/model.js`, `open-sse/services/combo.js`, `open-sse/services/capacityAdapter.js`, `open-sse/services/emergencyFallback.js` | Configured adapters and emergency fallback can replace a single requested model. No complete family constraint was identified. Emergency fallback defaults off; the vision pool defaults enabled but empty. |
| B-06 | Usage normalization, estimated pricing, and attribution by model/provider/account/API key. | `open-sse/utils/usageTracking.js`, `src/lib/db/repos/usageRepo.js`, `src/lib/db/repos/pricingRepo.js` | Reporting does not establish router-configurable monetary caps or transactional enforcement. |
| B-07 | Session fingerprints, affinity, and active-session tracking. | `open-sse/services/sessionManager.js`, `open-sse/utils/sessionManager.js` | Fingerprints can include model/provider/connection; active-session state is in memory. These are not durable logical fleet session identities. |
| B-08 | Optional Presidio redaction, failing closed on covered routes. | `src/middleware/redaction/`, `docs/REDACTION_SETUP.md`, `README.md` | Off by default; coverage excludes some modalities. Other transformations have different failure semantics. |
| B-09 | Management APIs/dashboard, configuration persistence, optional compression and response cache. | `src/app/api/`, `src/lib/db/`, `src/lib/db/repos/settingsRepo.js` | Fleet isolation, retention, transformation permissions, and cache governance require review. |

Existing regression candidates include `tests/unit/compatible-provider-connections.test.js`, `combo-routing.test.js`, `capacity-adapter.test.js`, `quota-preflight.test.js`, `session-management.test.js`, `emergency-fallback.test.js`, `usage-api-key-attribution.test.js`, `response-cache-guards.test.js`, and the redaction tests. Test presence is not evidence of a passing run or coverage of the new contracts.

## Governance and explicit model intent

### G-01: Effective policy

The router MUST resolve effective policy before optional semantic analysis or upstream execution. Administrative governance establishes the allowed envelope. A caller or session MAY narrow it but MUST NOT relax it. Conflicting hard requirements MUST fail explicitly. Policy tightening applies to subsequent attempts, including within existing sessions.

The proposed conceptual policy carries:

| Dimension | Meaning |
| --- | --- |
| Selection | Automatic, canonical family constraint, or exact canonical model; provider/account restrictions are independent. |
| Analysis | Whether task/session analysis is permitted, the content it may inspect, and permitted analysis destinations. |
| Privacy | Required E2EE, permitted processing destinations, transformations, retention, and cache use. |
| Funding | Applicable allotments, direct-spend limits, and explicit paid-spillover permission. |
| Continuity | Authenticated logical task/session identity and permitted reassessment/switching behavior. |

These are conceptual fields, not a finalized API. Authentication, parsing, and policy validation are distinct from optional semantic task analysis. Missing analysis permission MUST NOT imply consent. Use a caller selection or explicitly configured deterministic default when analysis is not authorized.

### G-02: Selection constraints

An explicit family selection MUST restrict every inference candidate to that family. An exact selection MUST restrict every inference candidate to that model. Rotation between accounts or hosting providers MAY remain available if verified model identity and all other constraints permit it. A provider constraint remains independently binding.

Canonical family membership and hosted-model equivalence MUST use an explicit, versioned registry rather than substring matching. Alias and combo resolution MUST preserve original intent. Ambiguous governed identity MUST fail rather than broaden eligibility.

Capacity adapters, account retries, quota recovery, emergency fallback, fusion participants, and judge/analyzer calls MUST obey their applicable effective policy. Explicit inference selection does not authorize a separate judge or analyzer model: that requires separately permitted scope. If no eligible route remains, return the unmet constraint instead of selecting elsewhere.

### G-03: Shared enforcement

Every inference path MUST use shared admission and a final dispatch guard. Global membership in a fallback pool is not authorization. Revalidate current policy, credentials, model identity, privacy support, funding, and reservation before every attempt.

Cache hits MUST also satisfy effective policy. Entries need sufficient provenance to establish model identity, privacy mode, and authorized scope. Ordinary inference cache entries MUST NOT satisfy requests requiring E2EE provenance.

## Edge E2EE

### P-01: Encrypt or reject

When requested or mandated, the router MUST establish the upstream E2EE protocol and verify the required identity/key and attestation against configured trust policy before disclosing content. Unsupported models, invalid/expired attestation, and key exchange or encryption failures MUST fail closed.

Venice needs a dedicated implementation beyond its existing API-key executor. Implement the provider's documented protocol with approved cryptographic libraries: model key retrieval, attestation verification, request encryption, authenticated response decryption, and streaming. Model names, flags, TEE capability alone, and HTTPS are not proof of active E2EE.

Implementation reference: [Venice TEE and E2EE documentation](https://github.com/veniceai/api-docs/blob/main/guides/features/tee-e2ee-models.mdx). Pin the reviewed protocol and trust assumptions during implementation; this external protocol can evolve.

### P-02: Entire attempt lifecycle

All sensitive fields MUST be protected according to the protocol. Unsupported tool, system, multimodal, or stream payloads MUST fail or use an explicitly authorized alternative. Text-only success does not establish coverage for other payload types.

Each retry/failover MUST independently establish compliant E2EE. No plaintext upstream downgrade is permitted. Authenticate/decrypt streamed content before releasing it; invalid encrypted events terminate the stream explicitly. A failure after partial output MUST NOT silently splice a different completion into the response.

The edge holds plaintext and cryptographic state. Define key isolation and lifetime. Private keys and plaintext MUST NOT enter ordinary diagnostics. Remote analysis, compression sidecars, caches, observability, and crash handling require explicit privacy coverage; E2EE is not permission to disclose plaintext to intermediaries.

## Task/session analysis and capability selection

### A-01: Permission and selection

When permitted, the router SHALL assess task/session needs and select an appropriately capable model from the policy-eligible set. Relevant capabilities include context capacity, tools, modalities, and task demands. Cost/latency ranking MUST NOT override hard constraints.

Both local semantic analysis and remote model analysis require applicable permission. Remote analysis MUST obey destination and privacy policy, including E2EE when required. Auxiliary analysis consumes authorized task funding. If analysis is disallowed, unavailable, or inconclusive, use only an authorized deterministic route/default or fail; analysis failure does not broaden routing permission.

### A-02: Session continuity

Introduce an authenticated logical fleet task/session identity independent of provider, connection, and model. Scope caller-supplied identities to the authenticated principal. Existing upstream fingerprints may remain subordinate affinity mechanisms.

Track policy version, selected model, assessment provenance, funding attribution, and continuity constraints. Specify reassessment triggers and switching permissions: a new modality, context limit, or authorized escalation may trigger reassessment. Preserve conversation/tool state across switches or fail when continuity cannot be maintained. Restart/lost state MUST NOT silently discard governance or budget constraints.

## Allotments and direct spending

### F-01: Separate funding types

The router MUST distinguish included/subscription/prepaid allotments from direct metered spending. Record allotment native units, scope, eligible models, remaining capacity, freshness, reset/expiration rules, and overage behavior. Units can be tokens, requests, credits, or provider quota windows; percentages are not monetary balances.

Monetary prepaid credit retains monetary valuation and drawdown accounting even when classified as an allotment. Subscription access MUST NOT be assumed unlimited or costless. Report estimated list-price consumption separately from actual incremental charges without charging the same usage twice.

Direct-spend accounting records currency, input/output/cache/reasoning rates and other billable dimensions, pricing version, and estimated versus reconciled costs. Allotment exhaustion MUST NOT automatically authorize paid usage. Paid spillover requires explicit permission and available direct-spend allowance.

### F-02: Limits and admission

Limits MUST be configurable with explicit scopes and periods. Proposed scopes are fleet, principal/API key, task, and session, with optional provider/account sublimits; final administrative names remain open. Every applicable cap MUST be satisfied. Specify reset boundaries/time zone, currency, and hard versus advisory behavior.

Hard limits require atomic pre-dispatch reservations for conservative input cost, bounded output, and other possible charges. Include concurrent requests and analysis calls. Retries/fallbacks require funded admission. Unknown prices, stale balances, and unbounded output MUST NOT be treated as free: obtain a defensible bound or reject under hard-limit policy.

A guaranteed cap requires an enforceable upper bound on provider charges. If that is unavailable, reject hard-cap execution rather than describe an estimate as guaranteed. A router cannot constrain out-of-band spending on shared provider credentials; use exclusive credentials or authoritative coordination for shared ceilings.

### F-03: Reconciliation and recovery

Persist reservations and reconcile usage using idempotent attempt identifiers. Release unused holds only when safe. Disconnects, uncertain provider failures, missing usage, and restarts MUST retain conservative exposure until reconciliation resolves possible charges. Replayed usage events MUST NOT debit twice. Keep estimated and confirmed amounts distinguishable.

Existing usage reports and quota polling are inputs, not substitutes for a transactional ledger. Multiple edges sharing a budget MUST coordinate admission or use explicit partitions whose sum cannot exceed the parent limit.

## Proposed execution flow

1. Authenticate and bind logical task/session scope.
2. Resolve effective policy and preserve model intent through alias resolution.
3. Check preprocessing/cache permissions. Run permitted analysis with its own admission, privacy, and accounting controls when it invokes a model.
4. Build candidates from selections, aliases, combos, and adapters. Filter by identity, destination, capabilities, privacy, continuity, and funding before ranking.
5. Select account/funding source; reserve atomically. Establish required E2EE and perform the final dispatch check. Safely release reservations if setup fails before chargeable execution.
6. Execute and translate; verify/decrypt at the edge; reconcile usage and record the decision.
7. Retry only within the allowed set, repeating admission, or fail explicitly.

Suggested components: policy resolver, canonical identity/capability registry, task/session selector, transactional funding ledger, provider E2EE adapter, and shared dispatch guard. Constrain and reuse existing routing instead of replacing every mechanism.

Decision records MUST include request/task/session and attempt IDs, policy version, requested and actual model, provider/account references, funding class, privacy verification result, reason, and estimated/confirmed usage. Do not log secrets or prompt content to explain decisions. Errors identify constraint categories without exposing unauthorized infrastructure details. Proposed categories include `model_constraint_unsatisfied`, `analysis_not_permitted`, `e2ee_unavailable`, `e2ee_verification_failed`, `allotment_exhausted`, and `spend_limit_exceeded`; protocol-specific mappings remain open.

## Acceptance scenarios

| ID | Given / when | Required outcome |
| --- | --- | --- |
| S-01 | E2EE required; endpoint lacks support or attestation fails. | Reject before any plaintext payload reaches upstream. |
| S-02 | E2EE fails; healthy fallback supports only ordinary HTTPS. | Exclude it; fail unless a compliant E2EE route exists. |
| S-03 | Encrypted stream succeeds or an event fails authentication. | Release verified plaintext only; terminate invalid streams without silently replacing the completion. |
| S-04 | Analysis is disallowed by request or inherited governance. | No semantic classifier/analyzer invocation; authorized deterministic route or failure. |
| S-05 | Permitted analysis identifies tool and vision requirements. | Select a capable eligible model and account for analysis cost. |
| S-06 | Family is explicit; adapter/emergency candidates belong elsewhere. | Fail the model constraint; no family expansion. |
| S-07 | Exact model pinned; another account hosts the verified same model. | Rotation allowed only if every other constraint permits it. |
| S-08 | Automatic selection permits fallback and compliant alternatives exist. | Preserve routing flexibility within effective policy. |
| S-09 | Allotment exhausted; paid spillover prohibited. | Exclude paid routes even with remaining spending allowance. |
| S-10 | Spillover permitted but an applicable cap would be exceeded. | Reject before dispatch; no fallback bypass. |
| S-11 | Concurrent requests compete for the last allowance. | Atomic reservations prevent oversubscription. |
| S-12 | Disconnect/restart leaves usage unknown, or usage is replayed. | Preserve exposure and reconcile once; no reset or duplicate debit. |
| S-13 | Session changes model/account or process restarts. | Recover logical policy/funding attribution before more execution. |
| S-14 | Ordinary or differently scoped cache entry matches the payload. | Do not serve it when effective privacy/scope requirements differ. |
| S-15 | Governance tightens during a session or fallback chain. | Subsequent attempts obey the change or fail. |
| S-16 | Quota cache is cold or pricing unknown. | Optimistic quota handling never bypasses hard funding admission. |

Implement verification with policy/ledger unit tests, E2EE protocol fixtures, concurrency/restart integration tests, and dispatch tests proving forbidden content was never transmitted. Retain baseline regressions. Live E2EE verification is a later implementation check, not established here.

## Baseline adoption using SDS-Spec

Use the local SDS-Spec/Canon framework (`@shadowdynamicsystems/spec`, inspected at `~/spec`) for subsequent adoption. No initialization or agent instruction changes are part of this document.

Proposed baseline domains: client protocols; provider connections; account routing/quota; aliases/combos; sessions; usage/pricing; redaction/transformations. For each, capture observable current behavior in `openspec/specs/<domain>/spec.md`, assign stable IDs, add Given/When/Then scenarios, and link source/test evidence. Distinguish observed implementation, passing test evidence, and unverified assumptions. Record limitations/defaults without making incidental implementation details permanent requirements.

Keep new requirements under a proposed `openspec/changes/fleet-router-governance/` change with proposal, delta specs, design, and implementation tasks once tooling is adopted. Do not merge unimplemented E2EE, hard budgets, family enforcement, or analysis into the baseline as existing behavior. Baseline specs must acknowledge current substitution paths that the governance change will constrain.

Suggested sequence:

1. Adopt source-backed baseline specs and characterize dispatch/fallback paths.
2. Establish effective policy, canonical identities, dispatch enforcement, and model/family constraints.
3. Add separate funding accounting, atomic admission, and recovery.
4. Add verified edge E2EE and stream/payload coverage.
5. Add permitted analysis and session-aware selection using those boundaries.

Each phase preserves existing behavior where permitted and rejects unsupported governed requests. Do not advertise a policy as enforced before all relevant paths implement it.

## Open implementation decisions

- Public request metadata and authenticated task/session contract, including legacy-client defaults.
- Canonical family registry, hosting equivalence, reassessment triggers, and switching rules.
- Budget scope names, currencies, reset windows, pricing authority, conservative reservations, and reconciliation.
- Initial E2EE providers/models, attestation roots, key lifetime, and supported payload types.
- Authorized analysis engines/content scope and edge retention/cache/preprocessing rules.
- Single-edge versus shared ledger and policy distribution/revocation across instances.

These refine implementation without relaxing the agreed invariants: privacy, selection, permissions, and funding constraints survive every route or execution fails explicitly.
