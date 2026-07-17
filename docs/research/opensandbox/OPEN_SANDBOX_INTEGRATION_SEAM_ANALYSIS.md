# OpenSandbox — Integration Seam Analysis (Phase 1, DOCUMENTATION-ONLY)

**Evaluated commit:** `192b5bf54a5fd01c7050ba4de9aba48939776cef`. Seams available (VERIFIED-DOCUMENTED from `sdks/`, `cli/`, `specs/`): Python/JS/Kotlin/C#/Go sandbox SDKs (`sdks/sandbox/*`), the `osb` CLI (`cli/`), the MCP server (`sdks/mcp/sandbox`), and direct **REST/OpenAPI** (`specs/{sandbox-lifecycle.yml, execd-api.yaml, egress-api.yaml, diagnostic-api.yml}`).

## Scoring (H=high/good, M=medium, L=low/poor; for burden/lock-in L=low is *good*)
| Criterion | REST/OpenAPI | Python SDK | TypeScript SDK | osb CLI | MCP server |
|---|---|---|---|---|---|
| Deterministic structured output | **H** (raw JSON contract) | H | H | M (text/JSON CLI) | M (agent-shaped) |
| Lifecycle control | H | H | H | H | M |
| File operations | H | H | H | H | M |
| Command operations | H | H | H | H | M |
| Egress policy control | H (`egress-api.yaml`) | M | M | M | L |
| Error handling | H (HTTP codes + body) | H | H | M | M |
| Timeout / cancellation | H | H | H | M | M |
| Machine-readable evidence | **H** | H | H | M | M |
| API stability | M (young, versioned specs) | **L** (pre-1.0 `v0.1.14`) | L (pre-1.0) | M | L (evolving) |
| Testability (no extra runtime) | **H** (HTTP only) | M (pip dep) | M (node dep) | M (binary) | L (server + agent) |
| Least authority | **H** (only the calls you make) | M | M | M | **L** (broad agent tool surface) |
| Dependency burden | **L=good** (an HTTP client) | M (opensandbox pkg) | M | M | H=bad (MCP runtime) |
| Vendor lock-in | **L=good** (contract, adaptable) | M | M | M | H=bad (protocol coupling) |
| FounderGate-orchestration suitability | **H** | H | M | M | L |

## Recommendation
- **Primary seam: direct REST / OpenAPI** — thinnest surface (an HTTP client), the raw structured contract (best machine-readable evidence), least authority (only the exact calls made), easiest to place behind a **FounderGate-owned adapter interface** so OpenSandbox stays replaceable, and testable with no extra runtime. Pin to the exact `specs/*.yaml` version evaluated.
- **Fallback seam: Python SDK (`sdks/sandbox/python`)** — ergonomic and matches FounderGate's Python tooling, but it is **pre-1.0 (`v0.1.14`)** so the API may break; acceptable behind the same adapter, with the REST contract as the stable ground truth.
- **MCP is explicitly NOT recommended** for FounderGate orchestration. MCP is agent-friendly, but FounderGate's builder/checker/rehearsal lanes are **scripted and deterministic** — they do not need an agent tool surface. Introducing MCP would add an **unnecessary authority surface** (a broad, model-invokable toolset) with no orchestration benefit; least-authority favors REST. [Reasoning recorded per the audit's explicit caution.]

## Adapter principle
FounderGate should define its own lifecycle + exec + egress + evidence interface and implement it **once** against the REST contract. No OpenSandbox type or assumption should leak into FounderGate product code beyond that adapter, preserving replaceability (Section G, LOW lock-in *if* the adapter is used).
