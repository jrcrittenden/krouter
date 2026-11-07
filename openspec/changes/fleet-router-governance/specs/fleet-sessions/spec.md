## ADDED Requirements

### Requirement: Authenticated durable logical sessions
The router MUST scope logical task/session identities to the authenticated principal and persist policy version, selection, assessment provenance, funding attribution and continuity constraints independently of provider/model/account fingerprints. State loss or restart MUST NOT discard restrictions or reset funding.

#### Scenario: Scoped identity
- **WHEN** two principals submit the same caller-provided session identifier
- **THEN** their logical sessions and funding/policy state remain isolated.

#### Scenario: Recovery S-13
- **WHEN** a session changes provider/model or the router restarts
- **THEN** logical identity and governing funding/policy state are recovered before another execution.

### Requirement: Controlled reassessment and switching
Reassessment triggers and switching permissions MUST be explicit. New modality/context needs MAY trigger authorized reassessment, but a switch MUST preserve conversation and tool state or fail explicitly.

#### Scenario: Incompatible tool continuity
- **WHEN** a proposed model switch cannot preserve outstanding tool state
- **THEN** the router rejects the switch rather than silently dropping that state.
