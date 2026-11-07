# kRouter specification adoption

First adoption: 2026-10-31, krouter-app 0.5.166. Source of fleet requirements:
[Fleet router design](../docs/FLEET_ROUTER_DESIGN.md).

`specs/` records source-inspected existing behavior, including limitations. It is
not a claim that the existing regression suite passes or that fleet governance is
already implemented. Each baseline includes source paths and regression candidates.
Normative baseline wording captures intended compatibility for the observed behavior;
it does not certify every provider/protocol combination.

Architecture survey and delivery guidance:
[host attachments and plugin contract](../docs/FLEET_PLUGIN_ARCHITECTURE.md),
[integration and maintenance](../docs/FLEET_PLUGIN_MAINTENANCE.md), and
[targeted regression evidence](changes/fleet-router-governance/verification.md).

`changes/fleet-router-governance/` contains proposed requirements, architecture
decisions and implementation work. Its new guarantees must not be advertised or
merged into the baseline until implemented and verified. All implementation tasks
are initially unchecked. Artifact completeness is distinct from implementation completion.

The first run uses the CLI's `spec-driven` schema to keep the adoption reviewable.
The installed CLI also provides SDS schemas; this is not a claim of completed SDS
governed-tier controls, risk assessment, traceability or certification.

## Working commands

```sh
openspec list
openspec list --specs
openspec status --change fleet-router-governance
openspec validate --all --strict --no-interactive
```

Set `OPENSPEC_TELEMETRY=0` for offline local CLI runs if telemetry delays exit.

## Evidence boundaries

- Protocols: implemented routes/translator paths; full protocol/modality coverage remains to inventory.
- Connections: API-key/OAuth and standard Venice HTTPS integration; no verified Venice E2EE adapter found.
- Routing: existing combos, adapters, rotation and fallback; no shared fleet constraint guard found.
- Quotas/accounting: cached quota routing and estimated usage; no transactional hard-budget ledger found.
- Sessions: fingerprint/affinity mechanisms; no authenticated durable fleet identity found.
- Processing: local advisory classifiers already run in the chat handler; the comment mentions an opt-in setting, but the inspected block has no setting/permission guard.
- Persistence: adapter transaction methods exist; sql.js persists through a debounced exported file. A transaction API alone does not establish crash-safe or cross-process financial admission.
- Privacy: optional redaction has route/modality limits; compression and cache need separate policy integration.

These observations guide implementation discovery; absence findings are based on
the inspected paths and searches, not an exhaustive application certification.
