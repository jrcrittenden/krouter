# Fleet plugin integration, release and maintenance plan

Status: proposed delivery/operating plan, accompanying the
[architecture and attachment register](FLEET_PLUGIN_ARCHITECTURE.md).
Ownership below names responsibilities, not assigned people. No scheduled jobs,
CI workflows, plugin loader or production controls are installed by these documents.

## Initial deployment decisions

Recommended first implementation: one server instance, one authoritative durable
ledger, trusted repository-local plugin, deterministic governed chat routing, and
an explicit supported-provider/transport/payload allowlist. Keep media/search and
background inference unavailable for governed operation until their hooks pass
conformance. Explicitly unmanaged operation retains legacy behavior.

Require a durable SQLite mode proven by crash tests for hard limits; reject the
sql.js fallback for that mode. Prefer plugin-owned tables/migrations in a dedicated
ledger database so ordinary usage-history resets, report retention, and upstream
schema changes cannot erase exposure. Reusing the main DB remains an alternative
only after equivalent durability, backup and reset protections are demonstrated.
Backups must cover policy/session/ledger consistency, not only historical reports.

Multi-edge shared caps, additional E2EE providers and dynamic third-party plugin
installation are later extensions. A deployment configured for an unsupported
topology must reject hard-cap operation rather than emulate a distributed guarantee.

## Delivery packages and gates

Each package is independently reviewable. Cross-cutting host changes should land
with their fake-plugin conformance tests; fleet business rules remain in the plugin.

| Package | Depends on | Deliverable | Merge/enable gate |
| --- | --- | --- | --- |
| P0 Discovery | None | H01–H20 inventory, baseline evidence, host spec and maintenance plan | Source references resolve; OpenSpec valid; evidence distinguishes baseline/helpers from fleet enforcement. Completed by this survey. |
| P1 Host kernel | P0 | Versioned ports, registry, RequestContext, readiness, fake/no-op plugins, typed errors | API-first startup; required-plugin failure denies; unmanaged parity; two-principal isolation; version/coverage mismatch rejected. |
| P2 Ingress and routing | P1 | Policy resolver, registry, original intent, processing/cache/early-response hooks, candidate filtering and child roles | Negative tests across all chat aliases; sidecar/classifier/log denial precedes disclosure; exact/family cannot escape combo/adapter/emergency/fusion. |
| P3 Concrete attempt boundary | P1, P2 | Common attempt runner, base and selected specialized transports, explicit coverage declaration | Every selected concrete send/retry has a unique attempt/permit; effective key and destinations verified; unintegrated providers denied. Passing outer-executor tests alone is insufficient. |
| P4 Durable funding | P3 | Funding sources/caps, durable reservations, settlement/recovery and session scope persistence needed for attribution | Concurrency, uncertain outcomes, replay, process-kill/restart, stale prices, cap periods and storage rejection proven before hard-cap traffic. |
| P5 E2EE | P3, P4 | Pinned reviewed protocol, trust/key lifecycle, restricted Venice adapter and verified stream handling | Tampered/expired attestation and stream events fail closed; no plaintext downgrade; payload matrix and authorized live proof reviewed. |
| P6 Session-aware selection | P2, P4; P5 when privacy requires it | Durable continuity and permitted local/remote analysis | No-analysis zero invocations; analyzer funding/privacy enforced; restart and outstanding-tool continuity proven. |
| P7 Additional workflows | P3, P4; P5 for advertised E2EE | Embeddings, image/audio/video jobs, search/fetch, system/admin inference | Native-unit bounds, secondary destinations, job ownership and all provider-adapter branches verified before each coverage expansion. |
| P8 Administration and release | P2–P7 for the selected release scope | Authorized management views, decision records, operator/client documentation and release manifest | Scope reflects actual coverage; rollout/rollback rehearsal passes; outstanding reservations survive rollback; acceptance scenarios traced. |

P3 can migrate providers incrementally. P7 can proceed per modality after the common
attempt/ledger contracts stabilize. A partial rollout is safe only when its
unsupported governed combinations are rejected explicitly. P8 does not require
advertising every P7 workflow in the first release.

Before P1 merges, settle the public metadata/authenticated principal contract,
dispatch authorization linearization point, initial ledger engine/durability settings,
and ownership of canonical identity and pricing updates. Before P5, pin external
protocol/trust assumptions and supported payloads. These are implementation decision
gates with named outputs, not reasons to leave ordinary discovery unfinished.

## Responsibilities

| Responsibility | Accountable role | Required review |
| --- | --- | --- |
| Versioned host contract, RequestContext and coverage register | Router integration maintainer | Plugin maintainer for changes in hook order, semantics or context. |
| Policies, canonical registry, session/selection semantics | Fleet plugin maintainer | Integration maintainer and identity/domain reviewer for equivalence changes. |
| Funding bounds, pricing versions, reservations and recovery | Ledger maintainer | Financial-accounting/domain reviewer for units, caps and uncertainty handling. |
| E2EE protocol, trust roots, key lifecycle and fixtures | Privacy/crypto maintainer | Independent protocol review before new providers/payloads are enabled. |
| Provider adapters and concrete send inventory | Provider integration maintainer | Host conformance and relevant plugin feature maintainer. |
| Deployment, backup, policy rollout, incident and reconciliation | Operator | Integration/ledger maintainer for upgrades, rollback and recovered exposure. |

Roles may be held by the same team; record actual owners before first production
release. Do not route every routine provider edit through a broad governance process:
review the affected contract and attach the relevant evidence.

## Host and plugin compatibility policy

- Publish separate host API, plugin, storage schema, canonical registry, policy and
  pricing versions. Records retain the versions used to authorize each attempt.
- A host major version changes hook semantics/order, required data or failure
  behavior. A minor version adds explicitly negotiated optional capabilities;
  required enforcement is never silently replaced by a no-op. Patch releases retain
  contract semantics and pass conformance.
- Plugin registration declares supported host versions and required ports/hooks.
  Readiness verifies the intersection with enabled governed coverage. Old host plus
  new plugin, and new host plus supported old plugin, require explicit compatibility
  test cases; unsupported pairs fail readiness for governed execution.
- Coverage is a tuple of ingress, protocol, operation, provider, transport, payload
  class and required guarantees. A new model catalog entry does not automatically
  inherit E2EE, family equivalence or hard-funding coverage.
- Policy and registry updates invalidate eligibility as appropriate; cache entries
  keep provenance, and every subsequent attempt revalidates current restrictions.
  Expired price/attestation authority cannot be hidden by a long-lived context.

## Upstream synchronization and drift control

For each upstream merge or dependency/runtime upgrade:

1. Diff changed files against H01–H20's source list and include additions/renames,
   not just modifications. Inspect new route exports, executors, direct network
   calls, retry/repair loops, sidecars, logs and background inference.
2. Update `attachment-points.json` and the implementation coverage manifest together.
   New/unclassified inference paths stay disabled for governed traffic.
3. Run the affected baseline group and actual host/plugin conformance group. When
   lifecycle, auth, transport, storage, translation or streaming changes, run the
   complete conformance suite and cross-protocol regression group.
4. Reconcile the OpenSpec requirement/delta if observable behavior changes. Keep
   deliberate baseline limitations visible; do not convert proposed guarantees into
   current behavior by editing documentation alone.
5. Review the resolved dependency changes against the recorded environment. Next
   upgrades require reading its installed guides and API-first standalone smoke
   tests; DB/crypto/transport upgrades require their specialized recovery/protocol
   fixtures. Preserve existing strict-proxy and SSRF protections.

A future CI inventory check should detect newly introduced unregistered network
and lifecycle paths using AST/module analysis, with a reviewed classification for
control traffic. A path-existence check catches stale references but does not prove
that every network call was registered. Neither replaces negative dispatch tests.

## Continuous integration plan

The following gates are to be implemented with the corresponding delivery package:

| Change class | Required automated evidence |
| --- | --- |
| Any spec/attachment change | Strict OpenSpec validation, unique attachment/case IDs, reference existence, proposal/spec consistency. |
| Host/plugin change | Boundary import checks; fake-plugin lifecycle/order/isolation; plugin-disabled parity and required-plugin denial; affected baseline group. |
| Routing/provider/transport change | Actual ingress-to-transport negative tests, effective-key/URL binding, refresh/internal retry paths, denied send count zero. |
| Streaming change | OpenAI/Responses/Anthropic/Gemini supported client fixtures, early cancellation/terminal races, once-only completion, no unverified plaintext bytes. |
| Ledger/schema change | Real durable DB concurrency, crash/restart/replay, cap reset boundaries, migration/backup/restore and unsupported-storage rejection. |
| E2EE change | Pinned protocol fixtures, tamper/expiry/key-rotation negatives and approved model/payload support matrix. Live provider checks are separate explicitly authorized evidence. |
| Release | Complete conformance for enabled coverage, baseline regression groups, production build and packaged standalone API-first startup, upgrade/rollback rehearsal. |

No production provider credentials or production data belong in these fixtures.
The suite uses isolated temporary storage, deterministic clocks where appropriate,
fake transports, and opaque secret/content sentinels. Tests must not infer hard-cap
correctness from estimated reporting or a helper returning `allowed: false`.

## Release and rollback procedure

1. Record host/plugin/schema/policy/registry/pricing versions and enabled coverage.
   Back up authoritative policy/session/ledger state and record outstanding exposure.
2. Stop new governed admission for migration. Apply additive migrations and recover
   holds before readiness; run health/conformance smoke checks without provider spend.
3. Enable a bounded initial principal/provider/payload cohort. Verify decision IDs,
   cap exposure, completion and unsupported-mode rejection. Expand coverage only
   with the corresponding evidence and explicit configuration change.
4. For rollback, stop new admissions first. Drain known work and retain uncertain
   holds. Restore only a compatible application/plugin version; keep reconciliation
   available. Do not downgrade schema or restore an old ledger snapshot over newer
   unresolved exposure. A failed safe rollback leaves governed traffic unavailable.
5. Record the release and acceptance evidence. Archive the OpenSpec change only
   when the selected requirements are actually implemented; use a scoped follow-up
   change for deferred modalities rather than marking unfinished tasks complete.

## Operating signals and response

Required signals are content-free and carry request/attempt IDs and versions:
readiness/coverage mismatch, denied constraint category, admitted/reserved/confirmed
exposure, uncertain holds and age, reconciliation backlog, rejected/expired pricing
or attestation, terminal stream failure and unexpected direct-send classification.
Choose operational thresholds using measured workload and cap periods during rollout;
no fixed threshold is a substitute for correctness.

| Condition | Operator action and required invariant |
| --- | --- |
| Plugin unavailable or incompatible | Keep governed admissions closed; repair version/config/ports and verify readiness. Do not disable the guard to restore traffic. |
| Unregistered inference path found | Remove that combination from coverage immediately; preserve attempts and account for possible exposure; add actual-path tests before re-enabling. |
| Ledger unavailable or uncertain outcomes accumulating | Close affected hard-cap admission; keep conservative holds; reconcile using authoritative provider evidence and idempotent events. Manual adjustments require reason/actor/audit, never direct balance edits. |
| E2EE attestation/key validation failure | Exclude affected routes; refresh reviewed trust/protocol state as appropriate; never switch the request to plaintext. |
| Stream fails after content | Emit protocol-appropriate failure, retain possible charges, avoid replacing/splicing the completion. |
| Price/registry/policy authority is stale | Reject the guarantees that cannot be established; refresh/version authority and revalidate. |
| Backup restore or process loss | Recover authoritative reservations and sessions before execution; prevent an older snapshot from resetting available spend. |

Review retained unknown exposure through a reconciliation workflow, not a timeout
that assumes charges disappeared. Routine report retention must exclude unsettled
ledger records. Key rotation and attestation changes require versioned provenance;
private keys and content must not enter incident logs or decision views.

## Adding a route, provider or transformation

An extension is complete only when its maintainer has:

1. Classified ingress identity, original model intent, payload classes, billable
   operations, all destinations and any retained/derived content.
2. Mapped every send, retry, refresh, repair, upload, poll, redirect and secondary
   asset fetch to a host attachment and trusted operation role.
3. Implemented declared policy, capability, funding bounds and privacy behavior;
   rejected unsupported guarantees explicitly.
4. Connected JSON/stream/job outcomes and uncertain failure handling to the ledger
   without using health callbacks as settlement.
5. Added behavior tests that run the real route/handler/adapter and assert denied
   transmissions/content sinks remain untouched, plus relevant baseline regressions.
6. Updated the coverage manifest, attachment register, supported matrix, operations
   notes and OpenSpec evidence before enabling the extension.

## Acceptance and handoff

P0 is complete when the surveyed source references and existing regression evidence
are recorded. Production readiness additionally requires each enabled tuple's
conformance case results, resolved implementation decisions, assigned owners,
restore/rollback evidence, and documentation of unsupported paths. The current
survey completes P0; P1–P8 remain implementation work.
