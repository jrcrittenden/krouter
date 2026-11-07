## MODIFIED Requirements

### Requirement: Legacy analysis transformations and cache
The router SHALL apply effective fleet policy before semantic classification, cache serving, redaction, compression or other optional processing. Local and remote semantic analysis MUST require permission. Cache entries MUST carry sufficient canonical identity, privacy and authorized-scope provenance; ordinary cache entries MUST NOT satisfy E2EE requests. Enabled covered redaction SHALL continue to fail closed.

#### Scenario: Foreign cache provenance S-14
- **WHEN** matching cached content lacks the required principal/scope, model or E2EE provenance
- **THEN** the cached response is not served.

#### Scenario: Classifier disabled by policy
- **WHEN** analysis is not permitted
- **THEN** existing local intent and complexity classifiers are not invoked.

#### Scenario: Covered redaction failure
- **WHEN** a request requires enabled redaction and that service fails
- **THEN** the route rejects before forwarding unredacted content.
