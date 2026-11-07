## MODIFIED Requirements

### Requirement: Aliases combos and substitution
The router SHALL resolve configured aliases and combos and retain capability adapters, account rotation and emergency fallback only within effective fleet policy. Original exact-model/family intent MUST survive all resolution and substitution. Emergency fallback SHALL remain disabled by default, and the default vision adapter SHALL have no implicit fallback model.

#### Scenario: Governed substitution
- **WHEN** an adapter or emergency model violates an explicit exact/family selection
- **THEN** it is excluded and the request fails if no eligible candidate remains.

#### Scenario: Permitted legacy routing
- **WHEN** effective policy permits a configured combo substitution
- **THEN** the existing routing strategy remains available within that envelope.
