## ADDED Requirements

### Requirement: Permitted capability selection
Semantic task/session analysis, including existing local classifiers, MUST require explicit applicable permission. Remote analysis MUST obey destination/privacy policy and have separate funding admission. Selection MUST filter hard identity, provider, modality, context, tools, privacy, continuity and funding constraints before cost/latency ranking.

#### Scenario: No analysis S-04
- **WHEN** analysis is prohibited
- **THEN** neither local nor remote semantic analysis is invoked and the router uses only an authorized deterministic route or fails.

#### Scenario: Capability selection S-05
- **WHEN** authorized analysis identifies tool and vision needs
- **THEN** selection chooses an eligible capable candidate and accounts for analysis cost.

#### Scenario: Inconclusive analysis
- **WHEN** permitted analysis fails or yields no reliable assessment
- **THEN** the router uses an authorized deterministic route or fails without broadening permission.
