/** @odoo-module **/

import { Component, useState, xml, onPatched, onMounted } from "@odoo/owl";

import { NodePalette } from "./components/node_palette";
import { EditorCanvas } from "./components/editor_canvas";
import { WorkflowAdapter } from "./core/adapter";
import { NodeRegistry, LoopNode, NoOpNode } from "./nodes/index";
import { HistoryManager, createAddNodeAction, createRemoveNodeAction, createAddConnectionAction, createRemoveConnectionAction } from "./core/history";
import { runStressTest } from "./utils/benchmark";

const STORAGE_KEY = 'workflow_pilot_state';

/**
 * WorkflowPilotDevApp - Development Demo Application
 * 
 * Now uses WorkflowAdapter (Core layer) as single source of truth.
 * UI state is derived from adapter on each change.
 */
export class WorkflowPilotDevApp extends Component {
    static template = xml`
        <div class="workflow-pilot-dev">
            <div class="workflow-pilot-dev__sidebar">
                <NodePalette onAddNode="onAddNode"/>
            </div>

            <div class="workflow-pilot-dev__main">
                <div class="workflow-pilot-dev__topbar">
                    <div class="workflow-pilot-dev__title">Workflow Pilot - Dev Playground</div>
                    <button class="workflow-pilot-dev__btn" t-on-click="saveToStorage">💾 Save</button>
                    <button class="workflow-pilot-dev__btn" t-on-click="exportJSON">📤 Export</button>
                    <button class="workflow-pilot-dev__btn" t-on-click="runBenchmark">🚀 Benchmark</button>
                    <button class="workflow-pilot-dev__btn" t-on-click="clear">Clear All</button>
                </div>

                <EditorCanvas 
                    nodes="state.nodes"
                    connections="state.connections"
                    dimensionConfig="dimensionConfig"
                    onDropNode="onDropNode"
                    onSelectNode="onSelectNode"
                    removeNode.bind="removeNode"
                    removeConnection.bind="removeConnection"
                    onNodePositionChange="onNodePositionChange"
                    onConnectionCreate="onConnectionCreate"
                    onPasteNode="onPasteNode"
                    undo.bind="undo"
                    redo.bind="redo"
                    onBeginBatch.bind="onBeginBatch"
                    onEndBatch.bind="onEndBatch"/>
            </div>
        </div>
    `;

    static components = { NodePalette, EditorCanvas };

    setup() {
        // Initialize adapter (Core layer)
        this.adapter = new WorkflowAdapter();

        // Initialize history manager for undo/redo
        this.history = new HistoryManager();

        // UI state: Use adapter's reactive state directly
        // The adapter is now the single source of truth using a reactive Store
        this.state = useState(this.adapter.state);

        // Local UI state
        this.uiState = useState({
            selectedNode: null,
        });

        // Dimension configuration (can be customized here)
        // Available options: nodeWidth, nodeHeaderHeight, nodeBodyPadding,
        //                    socketRadius, socketSpacing, socketOffsetY, gridSize
        this.dimensionConfig = {
            nodeWidth: 220,          // 90 (small), 180 (normal), 360 (large)
            nodeHeaderHeight: 34,
            nodeBodyPadding: 4,
            socketSpacing: 28,
            socketRadius: 5,
            socketOffsetY: 15,
            gridSize: 20,
        };

        // Load from localStorage
        this._loadFromStorage();

        // Initial load
        this._loadFromStorage();

        // No need to manually sync or listen to changes
        // useState(adapter.state) handles reactivity automatically

        // Auto-save on state changes
        onPatched(() => this._autoSave());

        this._offset = { x: 40, y: 40 };
    }

    /**
     * Sync UI state from adapter
     */
    /**
     * Sync UI state - Deprecated/Removed
     * Adapter state is now used directly via useState
     */
    _syncState() {
        // No-op, kept briefly for compatibility if needed during strict refactor
    }

    // =========================================
    // LocalStorage Persistence
    // =========================================

    _loadFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return;

            const parsed = JSON.parse(data);

            // Check if it's new format (has version) or legacy
            if (parsed.version) {
                this.adapter.fromJSON(parsed);
            } else {
                // Legacy format - migrate
                this.adapter.fromLegacyFormat(parsed);
            }
        } catch (e) {
            console.warn('Failed to load workflow from localStorage:', e);
        }
    }

    saveToStorage = () => {
        try {
            const data = this.adapter.toJSON();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('Workflow saved to localStorage');
        } catch (e) {
            console.error('Failed to save workflow:', e);
        }
    };

    exportJSON = () => {
        const json = this.adapter.toJSON();
        console.log('Workflow JSON (for Python):');
        console.log(JSON.stringify(json, null, 2));

        // Copy to clipboard
        navigator.clipboard?.writeText(JSON.stringify(json, null, 2));
        alert('Workflow JSON copied to clipboard!');
    };

    _autoSave() {
        clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => this.saveToStorage(), 500);
    }

    // =========================================
    // Node Management
    // =========================================

    onAddNode = (type) => {
        const x = 80 + (this._offset.x % 240);
        const y = 80 + (this._offset.y % 240);
        this._offset.x += 30;
        this._offset.y += 30;

        return this._createNode(type, { x, y });
    };

    onDropNode = ({ type, position }) => {
        return this._createNode(type, position);
    };

    onSelectNode = (node) => {
        this.uiState.selectedNode = node;
    };

    onNodePositionChange = ({ nodeId, x, y }) => {
        // Validate parameters - skip if missing required fields
        if (!nodeId || typeof x !== 'number' || typeof y !== 'number') {
            return;
        }

        // Ensure positions are valid (non-negative)
        const validX = Math.max(0, x);
        const validY = Math.max(0, y);

        // Sync with Core layer
        this.adapter.updatePosition(nodeId, { x: validX, y: validY });

        // Sync with Core layer - reactive state updates automatically
        this.adapter.updatePosition(nodeId, { x: validX, y: validY });
        // No need to manually update local UI state arrays, they are references to adapter state
    };

    onConnectionCreate = ({ source, sourceHandle, target, targetHandle }) => {
        const conn = this.adapter.addConnection(source, sourceHandle, target, targetHandle);
        if (conn) {
            // Record for undo
            this.history.push(createAddConnectionAction(this.adapter, conn));
        }
    };

    _createNode(type, position) {
        const node = this.adapter.addNode(type, position);
        if (!node) return null;

        // Record for undo
        this.history.push(createAddNodeAction(this.adapter, node.toJSON()));

        // n8n-style Loop Auto-Creation Pattern
        if (type === 'loop') {
            const LOOP_OFFSET_Y = 160;
            const noopNode = this.adapter.addNode('noop', {
                x: position.x + 80,
                y: position.y + LOOP_OFFSET_Y,
            });

            if (noopNode) {
                // Record NoOp for undo
                this.history.push(createAddNodeAction(this.adapter, noopNode.toJSON()));

                // Loop.loop → NoOp.data
                const conn1 = this.adapter.addConnection(node.id, 'loop', noopNode.id, 'data');
                if (conn1) this.history.push(createAddConnectionAction(this.adapter, conn1));

                // NoOp.result → Loop.data (back-edge)
                const conn2 = this.adapter.addConnection(noopNode.id, 'result', node.id, 'data');
                if (conn2) this.history.push(createAddConnectionAction(this.adapter, conn2));
            }
        }

        this._syncState();
        return node.id;
    }

    clear = () => {
        this.adapter.clear();
        this.uiState.selectedNode = null;
        this._offset = { x: 40, y: 40 };
        localStorage.removeItem(STORAGE_KEY);
        // this._syncState(); // Not needed with reactive store
    };

    /**
     * Run performance benchmark
     */
    runBenchmark = async () => {
        if (!confirm("This will clear current workflow and generate 500 nodes. Continue?")) return;

        await runStressTest(this.adapter, 500);
        // Reactive store updates automatically
        console.log("Benchmark complete. Check console for metrics.");
        alert("Benchmark complete! Check console for timing details.\n\nTry zooming and panning now to test fps.");
    };

    // =========================================
    // Connection Management
    // =========================================

    removeNode(nodeId) {
        // Record for undo before removing
        const node = this.adapter.getNode(nodeId);
        if (node) {
            const nodeData = node.toJSON();
            const relatedConnections = this.adapter.getConnectionsForUI().filter(
                c => c.source === nodeId || c.target === nodeId
            );
            this.history.push(createRemoveNodeAction(this.adapter, nodeData, relatedConnections));
        }

        this.adapter.removeNode(nodeId);

        if (this.uiState.selectedNode?.id === nodeId) {
            this.uiState.selectedNode = null;
        }

        this._syncState();
    }

    removeConnection(connId) {
        // Record for undo before removing
        const conn = this.adapter.getConnectionsForUI().find(c => c.id === connId);
        if (conn) {
            this.history.push(createRemoveConnectionAction(this.adapter, conn));
        }

        this.adapter.removeConnection(connId);
        this._syncState();
    }

    // =========================================
    // Paste Handler (for Ctrl+V from EditorCanvas)
    // =========================================

    onPasteNode = ({ type, position, config }) => {
        const node = this.adapter.addNode(type, position);
        if (node) {
            if (config) {
                node.setConfig(config);
            }
            // Record for undo
            this.history.push(createAddNodeAction(this.adapter, node.toJSON()));
        }
        this._syncState();
        return node?.id;
    };

    // =========================================
    // Undo/Redo
    // =========================================

    undo() {
        console.log('[DevApp] undo called');
        if (this.history.undo()) {
            this._syncState();
        } else {
            console.log('[DevApp] nothing to undo');
        }
    }

    redo() {
        console.log('[DevApp] redo called');
        if (this.history.redo()) {
            this._syncState();
        } else {
            console.log('[DevApp] nothing to redo');
        }
    }

    onBeginBatch(description) {
        this.history.startBatch();
    }

    onEndBatch(description) {
        this.history.commitBatch(description);
    }
}
