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

## Key Decisions

| Decision | Choice |
|---|---|
| Player app | PWA (Next.js) |
| QR token format | Compact base64url JSON |
| AI assist | Claude via OpenRouter API |
| API style | REST |
| Database | PostgreSQL + Prisma |
