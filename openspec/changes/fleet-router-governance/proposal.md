## Why

kRouter already provides useful protocol translation, routing, quotas and reporting, but those mechanisms do not enforce fleet model intent, analysis permission, upstream E2EE or hard spending limits. This change adds shared enforcement while preserving routing flexibility inside the permitted envelope.

## What Changes

- Adopt source-backed baseline specs separately from new guarantees.
- Integrate through a versioned trusted plugin host with explicit ingress, processing, routing, concrete transport and completion hooks; maintain attachment/coverage registers and behavioral conformance evidence.
- Add effective inherited policy, canonical model/family identity and shared admission/final dispatch enforcement.
- Add separate allotment/direct-spend accounting, atomic reservations and restart-safe reconciliation.
- Add verified edge E2EE for an explicitly supported provider/model/payload matrix.
- Add authenticated logical sessions and permission-controlled analysis/capability selection.
- Add scoped cache provenance, processing permissions and content-free decision records.
- **BREAKING** for governed requests: substitutions, semantic classifiers, sidecars, caches and paid spillover that lack authorization will be rejected or skipped. Legacy defaults require an explicit compatibility contract; missing analysis permission is never consent.

## Capabilities

### New Capabilities
- `router-plugin-host`: Plugin lifecycle, trusted context, concrete-send coverage, compatibility and maintained conformance boundaries.
- `fleet-policy`: Effective policy, canonical intent and per-attempt dispatch enforcement.
- `fleet-funding`: Allotments, spend caps, reservations and reconciliation.
- `edge-e2ee`: Verified encryption, decryption and protected streaming.
- `fleet-selection`: Permitted analysis and eligible capability selection.
- `fleet-sessions`: Authenticated durable logical identity and continuity.
- `fleet-decision-records`: Content-free attribution and explainable constraint failures.

### Modified Capabilities
- `model-routing`: Constrain aliases, combos, adapters and fallback to effective policy.
- `account-routing`: Add mandatory policy/funding admission around quota-guided selection and retries.
- `request-processing`: Gate analysis/transformations and enforce scoped cache provenance.

## Impact

Primary integration points: `src/sse/handlers/chat.js`, `open-sse/handlers/chatCore.js`, all other modality executors/handlers, combo/fusion and fallback services, account auth, quota preflight, classifiers, cache, redaction/compression, database schema/adapters, usage/pricing, management APIs and dashboard. Requires protocol-reviewed crypto dependencies and a ledger storage durability decision before implementation. No runtime behavior is implemented by this proposal.

Source: `docs/FLEET_ROUTER_DESIGN.md` (G-01..03, P-01..02, A-01..02, F-01..03; S-01..16).
