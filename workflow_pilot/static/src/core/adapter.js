/** @odoo-module **/

/**
 * WorkflowAdapter - Bridge between Core WorkflowEditor and OWL UI
 * 
 * This adapter converts between:
 * - Core: BaseNode instances with typed sockets
 * - UI: Plain objects expected by current OWL components
 * 
 * Allows gradual migration without breaking existing UI.
 */

import { reactive, markRaw } from "@odoo/owl";
import { WorkflowEditor } from '../core/editor';
import { NodeRegistry } from '../nodes/index';

export class WorkflowAdapter {
    constructor() {
        this.editor = new WorkflowEditor({ nodeRegistry: NodeRegistry });

        // Reactive Store Pattern
        this.state = reactive({
            nodes: [],
            connections: [],
        });

        // Sync editor events to reactive state
        this.editor.on('onChange', () => this._syncState());
    }

    /**
     * Internal sync from Core Editor to Reactive State
     */
    _syncState() {
        this.state.nodes = this.getNodesForUI();
        this.state.connections = this.getConnectionsForUI();
    }

    /**
     * Get nodes logic (now used for syncing to state)
     */
    getNodesForUI() {
        return this.editor.getNodes().map(node => ({
            id: node.id,
            type: node.type,
            title: node.label,
            x: node.position.x,
            y: node.position.y,
            icon: node.icon,
            inputs: this._socketsToUI(node.inputs),
            outputs: this._socketsToUI(node.outputs),
            // Keep reference to original node for control access
            _node: markRaw(node),
        }));
    }

    /**
     * Get connections as plain objects
     */
    getConnectionsForUI() {
        return this.editor.getConnections().map(conn => ({
            id: conn.id,
            source: conn.source,
            sourceHandle: conn.sourceHandle,
            target: conn.target,
            targetHandle: conn.targetHandle,
        }));
    }

    /**
     * Convert socket definitions to UI format
     */
    _socketsToUI(sockets) {
        const result = {};
        Object.entries(sockets).forEach(([key, socket]) => {
            result[key] = { label: socket.label };
        });
        return result;
    }

    /**
     * Add node by type
     */
    addNode(type, position) {
        const NodeClass = NodeRegistry[type];
        if (!NodeClass) {
            console.warn(`Unknown node type: ${type}`);
            return null;
        }
        const node = this.editor.addNode(NodeClass, position);
        if (node) {
            // Apply markRaw to config if it exists at creation (optimization)
            if (node.config) {
                node.config = markRaw(node.config);
            }
        }
        return node;
    }

    /**
     * Remove node
     */
    removeNode(nodeId) {
        return this.editor.removeNode(nodeId);
    }

    /**
     * Update node position
     */
    updatePosition(nodeId, position) {
        const result = this.editor.updateNodePosition(nodeId, position);
        // Direct reactive update for smooth dragging (bypasses full refresh)
        const node = this.state.nodes.find(n => n.id === nodeId);
        if (node) {
            node.x = position.x;
            node.y = position.y;
        }
        return result;
    }

    /**
     * Add connection
     */
    addConnection(sourceId, sourceHandle, targetId, targetHandle) {
        return this.editor.addConnection(sourceId, sourceHandle, targetId, targetHandle);
    }

    /**
     * Remove connection
     */
    removeConnection(connectionId) {
        return this.editor.removeConnection(connectionId);
    }

    /**
     * Get node instance by ID
     */
    getNode(nodeId) {
        return this.editor.getNode(nodeId);
    }

    /**
     * Clear all
     */
    clear() {
        this.editor.clear();
    }

    /**
     * Export to JSON
     */
    toJSON() {
        return this.editor.toJSON();
    }

    /**
     * Import from JSON
     */
    fromJSON(data) {
        this.editor.fromJSON(data);
    }

    /**
     * Load from legacy format (current localStorage format)
     */
    fromLegacyFormat(data) {
        this.clear();

        // Convert legacy nodes to new format
        (data.nodes || []).forEach(legacyNode => {
            const node = this.addNode(legacyNode.type, {
                x: legacyNode.x,
                y: legacyNode.y,
            });
            if (node) {
                // Override auto-generated ID with legacy ID
                this.editor.nodes.delete(node.id);
                node.id = legacyNode.id;
                this.editor.nodes.set(node.id, node);
            }
        });

        // Restore connections
        (data.connections || []).forEach(conn => {
            this.editor.addConnection(
                conn.source,
                conn.sourceHandle,
                conn.target,
                conn.targetHandle
            );
        });

        // Update ID counter
        const maxId = Math.max(
            ...Array.from(this.editor.nodes.keys())
                .map(id => parseInt(id.replace(/\D/g, ''), 10) || 0),
            0
        );
        this.editor._idCounter = maxId;
    }
}
