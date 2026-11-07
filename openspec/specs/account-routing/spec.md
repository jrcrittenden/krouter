# account-routing

## Purpose
Source-inspected baseline for krouter-app 0.5.166. Adoption records observable behavior and its limits, not new fleet guarantees.

## Requirements

### Requirement: Account selection and quota preflight
The router SHALL select accounts using configured strategies and cooldowns and consult supported cached quota information. Missing or stale quota information SHALL permit legacy preflight rather than establish a guaranteed spending reservation.

#### Scenario: Cold quota cache
- **WHEN** a selected account has no usable quota snapshot
- **THEN** legacy preflight permits the account; no hard financial guarantee is implied.

#### Scenario: Known exhausted account
- **WHEN** a usable quota snapshot is at or below the configured remaining threshold
- **THEN** preflight excludes that account for the affected model.

## Evidence

Status: source inspected on 2026-10-31; listed regression candidates were not run during adoption.

Sources:
- `src/sse/services/auth.js`
- `open-sse/services/quotaPreflight.js`
- `open-sse/config/providerStrategy.js`

Regression candidates:
- `tests/unit/quota-preflight.test.js`
