# Goal: Create Rete.js Plugin & Workflow Builder Guide

The goal is to create a detailed document `workflow_automation_builder/rete_workflow_builder_guide.md` explaining how to build a custom Rete.js plugin and integrate Rete.js to create a UI Workflow Builder, strictly following the provided `llms-full.txt` documentation.

## User Review Required
> [!IMPORTANT]
> This guide focuses on **Lit** as the integration framework, as implied by your open files. If you prefer another framework (React, Vue, Angular), please let me know.

## Proposed Document Structure

The document will cover:

1.  **Core Concepts**: Brief overview of `NodeEditor`, `AreaPlugin`, `DataflowEngine`/`ControlFlowEngine`.

2.  **Building a Custom Render Plugin**:
    *   **Concept**: How Rete.js delegates rendering to plugins.
    *   **Native JS Approach**: Using `document.createElement` (referencing `DomRenderer` in `app.js`).
    *   **Odoo OWL Approach**: creating a `OdooPlugin` class.
        *   **Registration**: `plugin.addPreset(...)` pattern.
        *   **Mounting**: Using `mount(Component, target)` for nodes/controls.
    *   **Comparison (Native vs OWL)**:
        *   **Nodes**: `div` manipulation vs `xml` templates + `Component`.
        *   **Sockets**: Manual event binding vs `t-on-click`.
        *   **Controls**: Input listeners vs `useState`/`t-model`.
3.  **UI Responsibility Guide**:
    *   **Rete.js Renders**: Nodes, Connections, Sockets, Controls (via the render plugin).
    *   **You Build**: Editor container, Sidebars (Palette), Overlays (Minimap host), Property Panels.
    *   **Styling**: What comes "free" vs what needs `index.css`/`styles.css` (referencing `workflow_automation_builder/styles.css` concept).

4.  **Complete Code Example**: A cohesive example combining all the above into a "WorkflowEditor" class.


## Verification Plan

### Manual Verification
- I will verify the generated code snippets against `llms-full.txt` (Rete architecture) and `app.js` (User's prototype logic).
- I will ensure the "Difference" table accurately reflects the move from `DomRenderer` (Native) to an OWL Component-based approach.
