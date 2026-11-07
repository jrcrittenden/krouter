## ADDED Requirements

### Requirement: Versioned plugin host boundary
The router MUST expose an explicit versioned in-process host interface for trusted fleet governance. Fleet policy, selection, sessions, funding, E2EE and decision logic MUST remain behind that interface. The host MUST retain protocol translation, existing permitted routing and transport behavior. Plugin loading MUST be explicit trusted configuration, not caller-supplied module execution. Required hooks MUST be awaited decisions with specified failure semantics, not best-effort observer events.

#### Scenario: Incompatible required plugin
- **WHEN** the configured required plugin cannot initialize or cannot satisfy the host contract
- **THEN** governed execution is unavailable before content processing or upstream disclosure.

#### Scenario: Explicit unmanaged operation
- **WHEN** the plugin is disabled for explicitly unmanaged traffic
- **THEN** existing permitted host behavior remains available without claiming fleet guarantees.

### Requirement: Trusted request context and early authorization
The host MUST create authenticated request context before optional semantic analysis, sidecar processing, payload diagnostics, cache serving or synthetic responses. Context MUST preserve original intent, principal/task/session scope, policy version, trusted operation role and cancellation across format conversion, recursion and stream lifetime. Untrusted body/header metadata MUST NOT assert internal or system authority. Next Proxy globals MUST NOT be the sole means of passing authorization to handlers.

#### Scenario: Unauthorized preprocessing
- **WHEN** a chat route would invoke Presidio or another content processor without applicable permission
- **THEN** that processor receives no content and the route follows policy-directed rejection or permitted processing behavior.

#### Scenario: Reconstructed request and parallel callers
- **WHEN** Gemini or compact handling reconstructs a Request while another principal is executing concurrently
- **THEN** the original trusted context and cancellation remain correctly scoped without cross-principal leakage.

### Requirement: Concrete transmission enforcement
Every actual governed inference transmission MUST pass a shared attempt runner with current policy, bounded funded admission, actual canonical model, effective credential reference and destination/privacy verification. Executor-internal retry, base-URL failover, extra-key rotation, credential refresh, repair, native HTTP/2 and proxy/relay paths MUST NOT reuse a prior transmission permit or bypass enforcement. Auxiliary panel/judge/analyzer calls MUST have trusted roles and separately applicable admission. Response verification/decryption MUST precede translation, plaintext release and ordinary content sinks.

#### Scenario: Hidden executor retry
- **WHEN** an executor retries with a repaired body, rotated key or alternate endpoint after an initial transmission
- **THEN** a new attempt is admitted against the actual effective identity and request before another send, retaining uncertain prior exposure.

#### Scenario: Alternate transport denial
- **WHEN** a denied inference candidate would otherwise send over native HTTP/2 or a relay fallback
- **THEN** no concrete inference transmission occurs on either path.

### Requirement: Coverage negotiation and process boundaries
The host MUST declare verified coverage by ingress, protocol, operation, provider, transport, payload and guarantee. Unsupported governed combinations MUST fail explicitly. Same-process hooks MUST NOT be represented as controlling independent MITM passthrough or external shared-credential spending. Inference probes/background jobs MUST use explicit system identity/policy/funding; credential/catalog/quota control traffic MUST be classified separately. Self-HTTP inference MUST preserve authorization without double-reserving one transmission.

#### Scenario: New unintegrated provider
- **WHEN** a catalog or executor update adds a provider with no passing governed transport coverage
- **THEN** that provider is unavailable for governed execution until coverage is verified and explicitly enabled.

#### Scenario: System inference probe
- **WHEN** a quota auto-ping or administrator validation performs inference
- **THEN** its system principal, applicable policy and funding are admitted before disclosure and spending.

### Requirement: Durable lifecycle and settlement separation
Plugin readiness and recovery MUST be awaited before governed ingress or background inference independently of dashboard rendering. Response availability and account-health success MUST NOT be treated as completed financial settlement. JSON, streaming, forced-SSE and asynchronous jobs MUST supply idempotent attempt outcomes; cancellation/restart MUST preserve uncertain exposure. Shutdown and rollback MUST stop new admissions without deleting unresolved holds.

#### Scenario: API-first startup
- **WHEN** the first request after startup is an inference API call without any dashboard render
- **THEN** plugin readiness and reservation recovery complete before governed execution is admitted.

#### Scenario: Streaming health success followed by cancellation
- **WHEN** a streaming request is marked healthy and subsequently cancelled before authoritative usage arrives
- **THEN** settlement retains possible charges rather than releasing exposure based on the health callback.

### Requirement: Maintained attachment and conformance evidence
Host integrations MUST maintain stable attachment IDs, source references, negotiated coverage and behavioral conformance cases. Upstream changes to ingress, retry, transport, processing or completion MUST trigger an attachment review and affected regressions. Source checks and helper simulations MUST NOT substitute for actual-path deny-before-disclosure tests. Versioned upgrades, migrations and rollback MUST retain policy and financial invariants and record evidence before enabling coverage.

#### Scenario: Upstream adds a send path
- **WHEN** an upstream update introduces a new direct inference send or retry branch
- **THEN** the attachment/coverage register is reviewed and actual-path conformance passes before governed traffic uses that branch.

#### Scenario: Safe rollback with pending exposure
- **WHEN** an upgrade must roll back while attempts have uncertain outcomes
- **THEN** new governed admission stops and recovery/reconciliation preserves those holds using compatible state.
