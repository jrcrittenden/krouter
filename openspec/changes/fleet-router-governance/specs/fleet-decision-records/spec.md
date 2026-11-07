## ADDED Requirements

### Requirement: Content-free decision records
The router MUST record request/task/session and attempt IDs, policy version, requested/actual canonical model, provider/account references, funding class, privacy verification, decision reason and estimated/confirmed usage without secrets or prompt content. Errors MUST identify unmet constraint categories without exposing unauthorized infrastructure details.

#### Scenario: Rejected attempt
- **WHEN** a final dispatch guard denies an attempt
- **THEN** the decision record identifies the failed constraint and attempt without prompt content or credentials.
