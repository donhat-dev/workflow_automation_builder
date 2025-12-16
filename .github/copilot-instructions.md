# Copilot instructions (workflow_automation_builder)

## Big picture (what we’re building)
- A **workflow + integration builder** that will become an **Odoo-native module** (future “native iPaaS”).
- Target use case: **SMB retail/e-commerce** (Shopee/TikTok + carriers), **near real-time**, **\>15k orders/day** (+ stock/picking transactions).
- Key differentiator vs generic tools: production-grade **throughput**, **rate-limit/backpressure**, **idempotency/dedupe**, **observability** (accept Redis/queue/OTel/etc.).

## Repo reality (important)
- This repo is a **browser-only playground** (CDN globals). It contains **working prototypes**, not production-ready Odoo architecture.
- Two tracks:
  - **Working UI prototype**: `index.html` → `app.js` + `nodes.js` + `styles.css` (manual graph; smooth connect; can execute).
  - **Rete v2 spike**: `rete-owl-test.html` (real `Rete.NodeEditor` + `AreaPlugin` + `ConnectionPlugin` + custom OWL render plugin).
- Rete docs are vendored as reference: `llms-full.txt`.
- For “real Rete” work, use patterns from official render plugins (React/Lit/Vue) and mirror them for OWL/native.

## How the working prototype is wired
- `nodes.js`: node models (`Rete.ClassicPreset.Node`) exposed as `window.WorkflowNodes`; execution is `async data(inputs)`.
- `app.js`: OWL UI shell + `SimpleEditor` (custom graph) + `DomRenderer` (manual DOM + SVG `<path>` connections).

## Overall plan (roadmap)
1) **Keep the prototype usable** for UX/learning (don’t break `index.html`).
2) **Migrate graph core to real Rete v2**: replace `SimpleEditor` with `NodeEditor` + plugins (use `rete-owl-test.html` as the reference).
3) **Renderer strategy**: prefer OWL component rendering via a render plugin; minimize manual DOM.
4) **Odoo module shape (future)**: split into many OWL components (node/socket/connection/panels) + server-side runtime (queue workers) + connectors.
5) **Throughput features (must-have)**: per-connector rate-limit, retries/backoff, idempotency keys, dedupe, DLQ/replay, tracing/metrics.

## Developer workflow
- Serve over HTTP (avoids `file://` quirks): `python3 -m http.server` → open `http://localhost:8000/index.html`.
- Debug handles: `window.app`, `window.app.editor`, `window.WorkflowNodes`.
  - Add node: `window.app.editor.addNode(window.WorkflowNodes.HttpRequestNode, { x: 300, y: 300 })`
  - Export: `window.app.editor.getWorkflow()`

## Project conventions (avoid footguns)
- **Non-module JS (globals)**: don’t add `import ...` in `app.js`/`nodes.js` unless also migrating HTML to modules.
- Avoid “already declared”: `ClassicPreset` is declared in `nodes.js`; elsewhere use `Rete.ClassicPreset` or `window.WorkflowNodes.*`.
- When adding a node type (prototype track): update `nodes.js` + `app.js` (palette/properties) + `styles.css`.

## Non-goals (for this repo)
- Don’t attempt to fully implement Odoo add-on packaging here; this workspace is for UI/renderer experiments and Rete learning.
