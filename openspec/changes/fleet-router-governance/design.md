## Context

The router has client protocol routes in `src/app/api/v1/` and `v1beta/`, orchestration
in `src/sse/handlers/`, and shared provider execution in `open-sse/`. Chat routing
already combines aliases, combos/fusion, capacity adapters, account rotation,
credential-refresh retries and emergency fallback. Existing usage/pricing and
quota polling supply inputs, not hard financial guarantees.

`src/sse/handlers/chat.js` currently attempts local intent/complexity classification
before cache lookup and candidate generation, without checking semantic-analysis
permission. `open-sse/handlers/chatCore.js` invokes executors for both initial and
refreshed-credential attempts. Non-chat paths and direct fetches need a complete
dispatch inventory before choosing a final guard insertion point.

The edge is trusted with plaintext. Upstream E2EE and client-to-edge transport are
separate protections. Source-inspected baseline specs live in `openspec/specs/`.

## Goals / Non-Goals

**Goals:** Preserve useful routing within effective governance; enforce explicit
intent, privacy and funded admission on every attempt; retain attribution and
conservative exposure across failures/restarts; support permitted task-aware selection.

**Non-Goals:** Replace all existing executors, certify every provider, implement
custom cryptographic primitives, guarantee charges made outside controlled provider
credentials, or claim these guarantees from documentation/CLI validation alone.

## Decisions

0. **Plugin with explicit host hooks.** Keep fleet rules in a trusted repository-local
   plugin behind versioned ports. Host hooks cover ingress/processing, candidate
   generation, every concrete transmission, response verification and durable
   outcomes. Outer chatCore/executor wrapping alone misses internal retries,
   native HTTP/2, media/search and background probes. Attachment IDs H01–H20 and
   required conformance cases are recorded in `attachment-points.json`. Governed
   combinations remain unavailable until verified. See
   [the surveyed architecture](../../../docs/FLEET_PLUGIN_ARCHITECTURE.md) and
   [integration/maintenance plan](../../../docs/FLEET_PLUGIN_MAINTENANCE.md).

1. **One policy context, checked at dispatch.** Bind authenticated principal and
   logical task/session IDs at ingress. Resolve inherited restrictions before any
   optional content processing. Carry original selection, canonical identity and
   policy version through recursion. Re-read/revalidate current authoritative policy
   immediately before each attempt. Candidates and global fallback membership never
   confer authorization. No governed route may use a legacy unguarded executor path.
2. **Explicit identity registry.** Version canonical family membership, aliases and
   verified hosted-model equivalence. Preserve the caller's original constraint as
   well as resolved candidates. Unknown/ambiguous governed identity fails closed.
3. **Funding separated from reports.** Introduce funding sources, scoped period
   limits, reservations, attempts and immutable/idempotent reconciliation events.
   Reserve conservative bounded exposure atomically across every applicable cap.
   Keep native allotment consumption, estimated list-price value and incremental
   monetary charges distinct. Every retry/auxiliary call requires funded admission.
   Release holds only when chargeable execution is ruled out or reconciled safely.
4. **Durability is a prerequisite.** Existing SQLite adapters can be evaluated for
   a single-edge ledger; their transaction APIs alone are insufficient evidence.
   sql.js exports after a debounce and must not be assumed crash-safe or safe for
   independent processes. Select a proven durable mode or reject hard-cap operation
   on unsupported storage. Multiple edges require coordinated admission or bounded
   partitions; do not share an ordinary local file as a distributed ledger.
5. **Dedicated E2EE adapter.** Begin with Venice only after reviewing and pinning
   its current protocol and trust roots. Implement verified key/attestation handling,
   encryption and authenticated response/stream processing with approved libraries.
   Publish a tested payload/model matrix. Reject unsupported combinations. Establish
   E2EE before any sensitive content disclosure; never downgrade retries to plaintext.
6. **Processing and cache are policy boundaries.** Gate existing local classifiers,
   remote analyzers, sidecars, redaction, compression, cache and diagnostics. Cache
   provenance includes actual identity, scope and privacy mode; legacy cache entries
   cannot satisfy governed E2EE requests. Authentication and structural capability
   parsing do not imply permission for semantic analysis.
7. **Durable session identity above affinity.** Scope caller IDs to the principal,
   retain governance/funding/provenance and continuity independently of upstream
   fingerprints. Recover required state before dispatch. Define permitted switching
   and reassessment before enabling automatic semantic selection.
8. **Content-free decisions.** Record IDs, versions, allowed decision metadata,
   estimates and confirmed usage. Do not add prompt/credential logging. Map typed
   constraint failures to each supported client protocol, including stream errors.

Proposed flow: authenticate/bind scope → resolve policy and original intent → gate
processing/cache → optionally admit analysis → filter candidates → choose account
and funding → reserve → establish required E2EE → final guard → execute/decrypt →
reconcile. A retry repeats admission and verification. No replacement completion is
silently spliced after partial output.

## Delivery and migration

1. Characterize baseline/dispatch coverage and settle public contracts.
2. Deliver policy context, registry and dispatch guard with deterministic selection.
3. Deliver allotment/spend ledger, bounded admission and recovery.
4. Deliver the first verified E2EE support matrix.
5. Deliver durable sessions and permitted analysis/selection.
6. Expose administration/decision views and validate protocol/modality coverage.

Use additive schema migrations and preserve existing settings/connections. Define
an explicit legacy-client policy; absence of an analysis permission is never consent.
Unsupported governed requests fail explicitly during incremental rollout. Disable
new traffic before rollback; preserve reservations and reconciliation workers until
outstanding exposure is resolved. Rollback must not restore an unguarded governed path.

## Risks / Trade-offs

- Hidden dispatch/retry paths can bypass controls → inventory every executor/direct
  provider fetch and test forbidden dispatch, including non-chat and auxiliary calls.
- Conservative reservations reduce utilization → show estimated versus confirmed
  exposure; never advertise an estimate as a guaranteed cap.
- Distributed consistency and storage durability add complexity → choose initial
  deployment topology before implementation and reject unsupported hard-limit modes.
- E2EE protocol and model support evolve → pin reviewed protocol/trust assumptions
  and verify with fixtures plus authorized live checks during implementation.
- Existing semantic classification runs without a permission gate → account for
  the deliberate behavior change and audit diagnostics before rollout.
- Policy revocation can race execution → define the final authorization linearization
  point and its relationship to credential/crypto setup and dispatch.

## Open questions to settle during Phase 1

- Request metadata, principal authentication, legacy defaults and task/session API.
- Canonical registry authority and hosted-model equivalence review/update process.
- Scope names, supported currencies, reset windows, price authority and provider
  charge bounds; first durable storage engine and single-edge/shared deployment.
- E2EE model/payload coverage, trust roots, attestation freshness and key lifetime.
- Permitted analysis engines/content scopes, retention, cache and sidecar policies.
- Reassessment triggers, tool/conversation continuity and policy revocation semantics.

## Validation strategy

Trace requirements to `docs/FLEET_ROUTER_DESIGN.md` S-01..16. Use policy/registry
unit tests, negative executor spies, funding concurrency/crash/replay integration
tests, E2EE protocol/tamper fixtures, scoped-cache tests and protocol-specific stream
tests. Run existing targeted regressions first and expand across supported modalities
as guards are integrated. CLI validation proves document structure only.

Initial survey results: 32 targeted files / 362 tests passed; see `verification.md`
for commands and limitations. These are pre-plugin regression results. Required
host conformance, concrete-send negatives and funding/E2EE verification remain
implementation work; no hooks are installed by this design.
