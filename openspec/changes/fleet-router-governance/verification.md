# Architecture survey verification

Inspected 2026-10-31, repository HEAD `325190b`, application manifest 0.5.166.
The working tree has pre-existing dependency changes; installed Vitest reports
4.1.11. Existing application files were not modified for the survey. Tests used
isolated temporary DATA_DIR values, with individual tests also using their own
fixtures. No live provider test or production rebuild/restart was requested/run.

## Results

| Run | Files | Tests | Outcome |
| --- | --- | --- | --- |
| Routing, execution, completion and attribution | 21 | 210 | Passed |
| Processing, background and additional provider paths | 11 | 152 | Passed |
| Total | 32 | 362 | Passed |

These results establish pre-plugin regression evidence. No plugin hook or fleet
conformance case is implemented yet. Scope limits:

- Emergency fallback wiring cases exercise helpers/simulated state, not the full handler.
- Search/fetch lock-scope cases include source assertions and account-lock helpers.
- Auto-ping configuration cases verify configuration rather than actual scheduler inference admission.
- Cache tests exercise cache behavior without fleet scope/E2EE provenance.
- Existing session/usage tests do not prove durable fleet identities or hard-cap reservations.
- Existing crypto-free response/stream tests do not establish E2EE support.
- Remaining provider adapters, MITM passthrough and standalone readiness require later implementation-specific evidence.

## Reproduce targeted groups

Run from repository root. Each invocation starts with its own temporary data directory.

```sh
survey_data_dir=$(mktemp -d /private/tmp/krouter-architecture-survey.XXXXXX)
DATA_DIR="$survey_data_dir" ./node_modules/.bin/vitest run \
  tests/unit/combo-routing.test.js \
  tests/unit/capacity-adapter.test.js \
  tests/unit/quota-preflight.test.js \
  tests/unit/session-management.test.js \
  tests/unit/emergency-fallback.test.js \
  tests/unit/emergency-fallback-wiring.test.js \
  tests/unit/response-cache-guards.test.js \
  tests/unit/usage-api-key-attribution.test.js \
  tests/unit/compatible-provider-connections.test.js \
  tests/unit/strict-proxy-reaches-executor-proxy-options.test.js \
  tests/unit/rewrite-prefix-coverage.test.js \
  tests/unit/responses-abort-terminal.test.js \
  tests/unit/stream-abort-reports-error-in-band.test.js \
  tests/unit/embeddingsCore.test.js \
  tests/unit/search-lock-scope.test.js \
  tests/unit/web-fetch-lock-scope.test.js \
  tests/unit/xai-video-core.test.js \
  tests/unit/xai-video-handler.test.js \
  tests/unit/kiro-repair-retry-no-top-level-system-prompt.test.js \
  tests/unit/model-strip-reactive-retry.test.js \
  tests/unit/forced-stream-client-shapes.test.js
```

```sh
survey_data_dir=$(mktemp -d /private/tmp/krouter-architecture-survey.XXXXXX)
DATA_DIR="$survey_data_dir" ./node_modules/.bin/vitest run \
  tests/unit/presidio-settings-cache.test.js \
  tests/unit/presidio-coverage.test.js \
  tests/unit/presidio-v1beta-failclosed.test.js \
  tests/unit/quota-auto-ping-config.test.js \
  tests/unit/token-warmer-refresh.test.js \
  tests/unit/provider-validation.test.js \
  tests/unit/image-generation.test.js \
  tests/unit/antigravity-long-retry.test.js \
  tests/unit/antigravity-fast-fail-retry.test.js \
  tests/unit/kiro-terminal-integrity.test.js \
  tests/unit/response-cache.test.js
```

Temporary output captured during this run:
`/private/tmp/krouter-architecture-survey-tests.log` and
`/private/tmp/krouter-architecture-survey-extra-tests.log`. Those are ephemeral;
the commands and summarized outcomes here are the durable record.

## Documentation checks

- Strict OpenSpec validation for baseline specs and the fleet change.
- Attachment IDs are unique; every declared source/regression path exists.
- Every referenced source symbol occurs in an attachment source file (navigation check only).
- Local Markdown link targets resolve; modified requirement titles match baseline titles.
- All proposed attachments remain `planned`; implementation tasks remain unchecked
  except the three explicitly completed survey tasks.

Path/symbol checks do not establish AST coverage, actual hook installation or
runtime enforcement. Future CI/conformance requirements are specified in
`specs/router-plugin-host/spec.md` and the maintenance plan.
