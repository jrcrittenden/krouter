# usage-accounting

## Purpose
Source-inspected baseline for krouter-app 0.5.166. Adoption records observable behavior and its limits, not new fleet guarantees.

## Requirements

### Requirement: Usage and estimated pricing
The router SHALL normalize supported usage and record available model, provider, account, and API-key attribution with configured pricing estimates. Reported consumption SHALL NOT be represented as atomic budget admission or proof of actual incremental provider charges.

#### Scenario: Usage attribution
- **WHEN** a completed supported request supplies usage and API-key attribution
- **THEN** usage reporting attributes the available consumption and estimated cost to the request dimensions.

## Evidence

Status: source inspected on 2026-10-31; listed regression candidates were not run during adoption.

Sources:
- `open-sse/utils/usageTracking.js`
- `src/lib/db/repos/usageRepo.js`
- `src/lib/db/repos/pricingRepo.js`

Regression candidates:
- `tests/unit/usage-api-key-attribution.test.js`
