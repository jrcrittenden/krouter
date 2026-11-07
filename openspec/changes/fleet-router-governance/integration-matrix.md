# Requirement, attachment and acceptance map

Status: planning traceability. Attachment IDs and case identifiers refer to
`attachment-points.json`; future conformance cases are not claimed as passing.
Existing passing evidence and its limits are in `verification.md`.

## Capability ownership

| Delta capability | Plugin responsibility | Host attachments | Delivery packages |
| --- | --- | --- | --- |
| `router-plugin-host` | Version negotiation and declared requirements | H01–H20: context, awaited hooks, coverage and lifecycle | P1–P8 |
| `fleet-policy` | Policy, canonical registry, constraints and revocation | H02–H12, H14–H18: ingress, candidates and actual send guards | P2, P3, P7 |
| `fleet-funding` | Funding classes, caps, reservations and reconciliation | H07–H19: children, billable transmissions, outcomes and storage | P4, P7 |
| `edge-e2ee` | Trust verification, key lifetime, encryption/decryption | H03, H09–H18: processing, final payload, transports and response bytes | P5, P7 |
| `fleet-selection` | Permitted analysis and eligible capability ranking | H04–H09: classifier permission, candidates and auxiliary roles | P2, P6 |
| `fleet-sessions` | Authenticated durable identity and continuity | H02, H05–H08, H13, H16, H19: principal, transitions, jobs and recovery | P4, P6, P7 |
| `fleet-decision-records` | Content-free attribution, reasons and versions | H01–H20: denial/admission/terminal events and management | P2, P4, P8 |
| `model-routing` (modified) | Identity and fallback envelope | H05–H07, H10–H12: original intent through every substitution | P2, P3 |
| `account-routing` (modified) | Account/funding intersection | H08, H10–H12, H14–H18: actual account/key and refreshed retry | P2–P4, P7 |
| `request-processing` (modified) | Analysis/privacy/retention/cache permissions | H02–H04, H09, H13–H18, H20: content processors and sinks | P2, P5–P8 |

P0 is the completed survey. P1–P8 refer to
[the delivery plan](../../../docs/FLEET_PLUGIN_MAINTENANCE.md).
Plugin ownership does not replace the host's authentication, strict-proxy, SSRF
or client-protocol responsibilities.

## Fleet acceptance scenarios

| Scenario | Attachments | Required behavioral evidence |
| --- | --- | --- |
| S-01 Unsupported/invalid E2EE | H09–H12, H14–H17 | CRYPTO-01; unsupported/expired attestation; zero plaintext send. |
| S-02 No plaintext downgrade | H06, H10–H12 | ROUTE-01/02, CRYPTO-01 across ordinary HTTPS fallback and internal retry. |
| S-03 Authenticated stream | H12, H13 | CRYPTO-01, DONE-01/02; tamper yields client-protocol failure, no unverified bytes. |
| S-04 Analysis disabled | H02–H04, H07, H09 | EARLY-01, PROC-01/04; no unauthorized local/remote analysis or judge invocation. |
| S-05 Capable permitted selection | H05–H09, H19 | IDENT-01/02, FUSION-02, STATE-01; tools/vision eligible and analysis funded. |
| S-06 Family remains binding | H05–H07, H10–H12 | IDENT-02, ROUTE-01/02 through nested adapters/emergency/repairs. |
| S-07 Exact-model rotation | H05, H08, H11, H12 | IDENT-03, ACCOUNT-01/03, SEND-03; verified equivalent identity only. |
| S-08 Allowed fallback | H06, H08, H10–H12 | ROUTE-03; permitted strategy and account rotation work with plugin active. |
| S-09 No paid spillover | H08, H10–H12, H19 | ACCOUNT-02, STATE-01; exhausted allotment excludes unauthorized paid candidates. |
| S-10 Every cap binds | H07–H12, H14–H19 | SEND-01, SYSTEM-01, STATE-01; no retry/auxiliary/workflow cap bypass. |
| S-11 Concurrent last allowance | H10–H12, H19 | STATE-01 with real durable transactions and concurrent requests/processes in supported topology. |
| S-12 Restart/replay/uncertainty | H01, H13, H16, H19 | LIFE-03/04, DONE-02/03, JOB-02, STATE-01 crash/replay fixtures. |
| S-13 Session recovery | H02, H05–H08, H16, H19 | ING-03, STATE-02, JOB-01; recover scope and continuity before execution. |
| S-14 Scoped cache | H02, H04, H13 | EARLY-02/03; actual-model/E2EE/scope provenance before hit or synthetic response. |
| S-15 Policy tightening | H02, H08, H10–H12 | ATTEMPT-02, SEND-01/04; subsequent sends use current restrictions. |
| S-16 Unknown quota/price | H08, H14–H19 | ACCOUNT-02, MEDIA-06, STATE-01/03; no hard-cap admission without a bound. |

Additional integration cases cover LIFE-01/02 (API-first readiness/incompatibility),
ING-02/03 (spoofing/isolation), PROC-02 (Request reconstruction), SYSTEM-01/02
(funded probes/self-calls), ADMIN-01 (management) and PROCESS-01/02 (MITM boundary).
Each enabled provider/transport runs applicable cases against its actual branch;
sharing a helper or case name is insufficient.

## Remaining implementation precision

The register identifies stable seams and known bypass families, not an exhaustive
AST call graph or finished per-provider coverage manifest. Task 1.2 retains concrete
adapter enumeration before enablement. In particular, enumerate image secondary
requests, TTS formats, STT uploads/polls, search redirects and async video assets.

Metadata names, package exports, durable engine settings, canonical authority,
charge bounds and E2EE trust roots have implementation gates in the maintenance
plan. All conformance cases remain pending until implementation evidence exists.
