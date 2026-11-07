# client-protocols

## Purpose
Source-inspected baseline for krouter-app 0.5.166. Adoption records observable behavior and its limits, not new fleet guarantees.

## Requirements

### Requirement: Client protocols and translation
The router SHALL expose its implemented OpenAI-compatible chat/Responses, Anthropic messages, and Gemini model routes and translate supported requests and responses for the selected provider. Streaming support SHALL remain specific to the implemented protocol/provider combination; this baseline does not assert universal modality or feature equivalence.

#### Scenario: Supported chat request
- **WHEN** a supported chat request targets a configured compatible provider
- **THEN** the router dispatches through the corresponding executor and returns the supported client response shape.

## Evidence

Status: source inspected on 2026-10-31; listed regression candidates were not run during adoption.

Sources:
- `src/app/api/v1/`
- `src/app/api/v1beta/`
- `open-sse/translator/`
- `open-sse/handlers/chatCore.js`

Regression candidates:
- `tests/unit/forced-stream-client-shapes.test.js`
