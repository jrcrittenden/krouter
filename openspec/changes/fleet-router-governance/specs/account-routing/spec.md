## MODIFIED Requirements

### Requirement: Account selection and quota preflight
The router SHALL retain account strategies, cooldowns and supported quota preflight as routing inputs. Missing/stale quota MAY permit legacy preflight but MUST NOT bypass fleet hard funding admission. Every account retry, including refreshed credentials, MUST revalidate effective policy and funding before dispatch.

#### Scenario: Cold cache under hard cap
- **WHEN** a quota snapshot is unavailable for a governed request
- **THEN** the account cannot dispatch without valid independent hard funding admission.
