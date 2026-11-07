## ADDED Requirements

### Requirement: Effective inherited policy
The router MUST resolve effective policy before semantic analysis, cache serving, transformations, or upstream content disclosure. Administrative policy defines the maximum envelope; caller and session restrictions MUST only narrow it. Conflicts MUST fail explicitly. The policy MUST cover model intent, provider/account destinations, analysis, privacy, funding, and continuity.

#### Scenario: Conflicting scopes
- **WHEN** a caller requests a destination forbidden by inherited policy
- **THEN** the request fails without an upstream invocation.

#### Scenario: Missing analysis consent
- **WHEN** no applicable policy explicitly permits semantic analysis
- **THEN** the router invokes no local or remote semantic classifier and uses an authorized deterministic route or rejects.

### Requirement: Canonical model constraints
Exact and family selections MUST bind every inference candidate through alias resolution, combos, adapters, retries, account rotation, and emergency fallback. Canonical family membership and cross-provider model equivalence MUST use an explicit versioned registry; ambiguity MUST fail rather than broaden eligibility. Separate judge/analyzer calls MUST have separately authorized scope.

#### Scenario: Family escape S-06
- **WHEN** a family-pinned request has only out-of-family fallback candidates
- **THEN** the router returns model_constraint_unsatisfied without dispatching those candidates.

#### Scenario: Equivalent account S-07
- **WHEN** another account serves the verified same canonical exact model
- **THEN** rotation is allowed only if all other policy constraints remain satisfied.

### Requirement: Final attempt enforcement
Every inference path MUST share admission and a final dispatch guard that revalidates current policy, credentials, identity, capabilities, privacy, and funding reservation before each chargeable attempt. Credential-refresh retries and auxiliary inference MUST pass the same applicable controls.

#### Scenario: Tightened policy S-15
- **WHEN** policy tightens after the first attempt and before a retry
- **THEN** the retry uses the tightened policy or fails.

#### Scenario: Allowed flexibility S-08
- **WHEN** automatic selection permits fallback and an eligible candidate remains
- **THEN** existing routing flexibility is preserved within the permitted envelope.
