## 0. Architecture and attachment survey

- [x] 0.1 Survey existing ingress, processing, routing, executor/internal retry, alternate transport, modality, system probe and completion families; record H01–H20 source attachments and known process boundaries.
- [x] 0.2 Define proposed versioned plugin/host contracts, conformance case families, incremental coverage and integration/maintenance responsibilities.
- [x] 0.3 Run targeted existing regression groups in isolated temporary storage and record 32-file / 362-test passing evidence, distinguishing helper/source checks from enforcement proof.

## 1. Baseline characterization and contracts

- [ ] 1.1 Extend the survey evidence into the selected implementation scope's complete baseline suite and source-to-requirement review; preserve noted limitations.
- [ ] 1.2 Refine H01–H20 into per-provider/per-transport concrete-send and processing coverage; inventory new paths as code changes and define the initial enabled coverage allowlist.
- [ ] 1.3 Finalize authenticated principal/task/session metadata, legacy-client defaults, effective policy shape, error mapping and dispatch authorization/revocation semantics.
- [ ] 1.4 Choose initial deployment topology and ledger durability model; settle currencies, cap periods, pricing authority, conservative charge bounds and shared-credential limitations.
- [ ] 1.5 Agree canonical identity/family registry ownership, hosted-model equivalence and versioning; define supported routes/modalities and unsupported-governed-request behavior.
- [ ] 1.6 Implement the versioned host kernel, narrow injected ports, trusted RequestContext, explicit plugin registration/readiness and fake-plugin conformance harness without importing fleet rules into host modules.
- [ ] 1.7 Prove API-first initialization, required-plugin failure, incompatible versions, unmanaged parity, concurrent principal isolation and Request reconstruction/cancellation preservation.

## 2. Policy and deterministic constrained dispatch

- [ ] 2.1 Implement effective inherited policy and authenticated request context before optional processing; reject widening/conflicts and missing required scope.
- [ ] 2.2 Add canonical registry and preserve original exact/family intent through aliases, nested combos and candidates; reject ambiguity.
- [ ] 2.3 Filter account/provider/model/capability candidates and integrate shared admission/final guard across every inventoried inference path, including refreshed-credential retries and fusion/judge calls.
- [ ] 2.4 Gate existing local classifiers, remote analysis and sidecars on explicit applicable permissions; keep deterministic routing when authorized analysis is unavailable.
- [ ] 2.5 Add cache identity/privacy/scope provenance and enforce policy on hits; gate redaction, compression, diagnostics and retention.
- [ ] 2.6 Add content-free attempt/decision records and client-protocol constraint errors.
- [ ] 2.7 Prove S-04, S-06, S-07, S-08, S-14 and S-15, including zero forbidden executor calls and no bypass on non-chat/auxiliary routes.
- [ ] 2.8 Migrate every enabled concrete transport to the attempt runner, including base URL/repair/internal retries, extra-key rotation, H2/direct fetch/proxy/relay paths; bind actual effective identity, payload and destinations to one-use permits.
- [ ] 2.9 Classify auto-ping/admin inference versus credential/catalog/quota control traffic; add system principal/funding and self-HTTP deduplication; keep uncovered MITM passthrough outside governed coverage.
- [ ] 2.10 Integrate JSON/SSE/forced-SSE and async-job outcome hooks independently of account-health callbacks; add terminal/cancel/usage race tests.

## 3. Allotments, hard admission and recovery

- [ ] 3.1 Add additive schema/repositories for funding sources, native allotment units, caps/periods, pricing versions, attempts, reservations and reconciliation events.
- [ ] 3.2 Implement atomic durable admission across all applicable caps with bounded output/charges; include retries and analysis; reject unsupported durability or unbounded hard-cap requests.
- [ ] 3.3 Integrate quota freshness and funding eligibility without converting percentages to money; require explicit funded paid spillover.
- [ ] 3.4 Implement idempotent settlement, safe hold release, uncertain-outcome retention and startup recovery; separate estimated/list-price/confirmed incremental charges.
- [ ] 3.5 Add coordinated shared admission or bounded partitions if required by the selected topology; document exclusive/shared credential ceiling limits.
- [ ] 3.6 Prove S-09, S-10, S-11, S-12 and S-16 with concurrency, crash/restart, disconnect, unknown-price/stale-balance and duplicate-event cases.

## 4. Verified edge E2EE

- [ ] 4.1 Review and pin current Venice protocol, attestation roots, freshness, supported model/payload matrix and crypto-library choices; define edge key isolation/lifetime.
- [ ] 4.2 Implement verified key acquisition/attestation and encrypt all supported sensitive request fields before disclosure; reject unsupported payloads explicitly.
- [ ] 4.3 Implement authenticated response/stream decryption, tamper rejection, explicit partial-stream termination and compliant per-retry crypto setup.
- [ ] 4.4 Integrate privacy/funding/final guard sequencing and prohibit plaintext downgrade, unapproved sidecars/cache/logging and leaked crypto material.
- [ ] 4.5 Prove S-01, S-02 and S-03 with invalid/expired attestation, key rotation, tampered events, tool/system/multimodal fixtures and zero plaintext upstream disclosure; perform authorized live verification before advertising support.

## 5. Durable sessions and permitted selection

- [ ] 5.1 Persist authenticated logical task/session scope, policy/selection versions, assessment provenance, funding attribution and continuity constraints; retain existing affinity beneath it.
- [ ] 5.2 Define reassessment/switch permissions and preserve conversation/tool state across eligible switches; reject unsupported continuity.
- [ ] 5.3 Extend existing intent/complexity/capability helpers behind explicit permission and add any authorized remote analysis with separate privacy/funding admission.
- [ ] 5.4 Rank only policy-eligible candidates; handle disabled/unavailable/inconclusive analysis using an authorized deterministic default or explicit failure.
- [ ] 5.5 Prove S-05 and S-13, principal isolation, restart recovery, funded analysis and no semantic invocation when analysis is prohibited.

## 6. Administration, acceptance and rollout

- [ ] 6.1 Extend management APIs/dashboard for policy, funding, session and content-free decision views with appropriate authorization and masked references.
- [ ] 6.2 Assemble evidence for S-01..16 and the supported protocol/provider/modality matrix; rerun affected baseline regressions.
- [ ] 6.3 Verify migrations, policy distribution/revocation, privacy defaults, unsupported-mode rejection and rollback with outstanding reservations retained.
- [ ] 6.4 Update operator/client documentation and publish only verified guarantees; validate OpenSpec and archive/merge deltas only after implementation acceptance.
- [ ] 6.5 Implement attachment/import/coverage drift checks and affected-baseline plus host/plugin conformance CI gates; require actual-path tests before enabling new routes/providers/transports.
- [ ] 6.6 Assign maintenance owners, publish host/plugin/schema/policy/registry/pricing compatibility and enabled coverage, and rehearse upgrade/backup/restore/rollback with unresolved exposure.
- [ ] 6.7 Add content-free readiness/denial/exposure/reconciliation/crypto signals and operator recovery workflows; verify report retention, usage resets and manual adjustments cannot erase unsettled ledger state.
