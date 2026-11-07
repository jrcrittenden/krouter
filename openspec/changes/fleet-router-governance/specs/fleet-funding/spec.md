## ADDED Requirements

### Requirement: Separate allotment and spend accounting
The router MUST represent included/subscription/prepaid allotments separately from direct metered spending, recording native units, eligibility, freshness, resets, and overage behavior. Monetary prepaid credits MUST retain monetary valuation. Estimated list-price consumption and incremental charges MUST remain distinct without double debit. Paid spillover MUST require explicit permission.

#### Scenario: No paid spillover S-09
- **WHEN** an allotment is exhausted and spillover is forbidden
- **THEN** paid candidates are excluded even if a direct-spend allowance remains.

### Requirement: Atomic bounded admission
The router MUST enforce every applicable configured scope/period cap through atomic durable reservations before chargeable execution, including concurrent requests, analysis, retries, and fallback. Limits MUST declare currency, period boundaries/time zone, and hard/advisory status. Hard admission MUST reject unknown pricing, stale balances, unbounded output or charges unless a defensible enforceable upper bound is established.

#### Scenario: Concurrent last allowance S-11
- **WHEN** two requests compete for the final allowance
- **THEN** atomic admission prevents their combined reserved exposure from exceeding any applicable cap.

#### Scenario: Cap blocks spillover S-10
- **WHEN** paid spillover is permitted but would exceed an applicable cap
- **THEN** the router rejects before dispatch.

#### Scenario: Unknown funding S-16
- **WHEN** quota cache is cold or pricing is unknown
- **THEN** legacy optimistic preflight cannot bypass hard funding admission.

### Requirement: Idempotent reconciliation and recovery
The router MUST persist attempt identifiers and reservations and reconcile usage idempotently. Disconnects, missing usage, uncertain upstream outcomes, and restarts MUST retain conservative exposure until safe reconciliation. Multiple edges MUST coordinate admission or use bounded partitions; shared-credential out-of-band charges MUST NOT be represented as controlled by the router.

#### Scenario: Restart and replay S-12
- **WHEN** a request has an uncertain outcome across restart and its usage event is delivered twice
- **THEN** the hold survives recovery and confirmed usage is debited once.
