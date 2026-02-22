# QClue

A QR-code-driven treasure hunt game — mobile player app + desktop admin console.

Players scan physical QR codes placed around a house to progress through clues. Difficulty is assigned automatically by age and locked. The fastest completions appear on leaderboards.

## Docs

| Document | Description |
|---|---|
| [Product Spec](docs/product-spec.md) | Requirements, player experience, admin console, edge cases, acceptance criteria |
| [Architecture](docs/architecture.md) | System design, tech stack, open decisions |
| [Data Model](docs/data-model.md) | Database schema, entities, enums, indexes |
| [API Reference](docs/api.md) | REST endpoints, request/response shapes, error codes |
| [UX Flows](docs/ux-flows.md) | Screen-by-screen player and admin flows |
| [Security](docs/security.md) | QR token signing, credential lifecycle, auth, rate limiting |

## Open Decisions (resolve before implementation)

- **Mobile platform:** PWA (recommended) vs. React Native — see [architecture.md](docs/architecture.md#21-player-app-pwa-vs-react-native)
- **QR token format:** Option B (compact base64url, recommended) vs. Option A (URL scheme) — see [security.md](docs/security.md#1-qr-token-format)
- **LLM provider** for AI assist — see [architecture.md](docs/architecture.md#24-llm-provider-for-ai-assist)
