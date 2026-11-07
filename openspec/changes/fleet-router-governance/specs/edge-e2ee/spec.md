## ADDED Requirements

### Requirement: Verified upstream encryption
When E2EE is required, the edge MUST verify the configured upstream identity/key and attestation trust policy and establish the supported provider protocol before disclosing sensitive content. Unsupported models, expired/invalid attestation, or key exchange/encryption failure MUST fail closed. HTTPS, model discovery and TEE labels MUST NOT constitute E2EE evidence.

#### Scenario: Unsupported or invalid S-01
- **WHEN** the target lacks E2EE support or attestation fails
- **THEN** no plaintext payload reaches upstream.

#### Scenario: No downgrade S-02
- **WHEN** E2EE fails and only an ordinary HTTPS fallback remains
- **THEN** the fallback is excluded and the request fails.

### Requirement: Encrypted lifecycle and streaming
Every retry MUST independently satisfy E2EE. The router MUST protect all protocol-supported sensitive fields, authenticate/decrypt stream events before releasing plaintext, and explicitly reject unsupported system/tool/multimodal/stream payloads unless a compliant alternative is authorized. Invalid events after partial output MUST terminate explicitly without splicing another completion.

#### Scenario: Authenticated stream S-03
- **WHEN** an encrypted stream event fails authentication after valid output
- **THEN** unverified content is not released and the stream terminates explicitly.

### Requirement: Edge plaintext boundaries
The router MUST define key isolation/lifetime and prohibit private keys or plaintext in ordinary diagnostics. Analysis, compression sidecars, cache, observability and crash handling MUST obey applicable privacy and retention permissions. Client-to-edge transport MUST be assessed separately from upstream E2EE.

#### Scenario: Unauthorized sidecar
- **WHEN** E2EE is required and a compression destination lacks plaintext processing permission
- **THEN** content is not sent to that sidecar.
