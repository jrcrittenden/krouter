# model-routing

## Purpose
Source-inspected baseline for krouter-app 0.5.166. Adoption records observable behavior and its limits, not new fleet guarantees.

## Requirements

### Requirement: Aliases combos and substitution
The router SHALL resolve configured model aliases and combos and support configured capability adapters and emergency fallback. Legacy routing MAY substitute a configured model; this baseline does not guarantee exact-model or family preservation. Emergency fallback SHALL be disabled by default, and the default enabled vision adapter SHALL have no implicit fallback model.

#### Scenario: Configured modality adapter
- **WHEN** a request lacks a capable combo member and a suitable adapter model is configured
- **THEN** routing may add the adapter model according to the configured strategy.

#### Scenario: Default emergency fallback
- **WHEN** a request fails with an exhaustion error and emergency fallback has not been enabled
- **THEN** the router does not select an emergency model.

## Evidence

Status: source inspected on 2026-10-31; listed regression candidates were not run during adoption.

Sources:
- `src/sse/handlers/chat.js`
- `src/sse/services/model.js`
- `open-sse/services/combo.js`
- `open-sse/services/capacityAdapter.js`
- `open-sse/services/emergencyFallback.js`
- `src/lib/db/repos/settingsRepo.js`

Regression candidates:
- `tests/unit/combo-routing.test.js`
- `tests/unit/capacity-adapter.test.js`
- `tests/unit/emergency-fallback.test.js`
