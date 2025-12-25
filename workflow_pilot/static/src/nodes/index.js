/** @odoo-module **/

/**
 * Node Registry - Central registry of all available node types
 * 
 * Used by WorkflowEditor for deserialization and by NodePalette for display.
 */

import { HttpRequestNode } from './http_request';
import { LoopNode, IfNode, CodeNode, NoOpNode } from './flow_nodes';
import { DataValidationNode, DataMappingNode } from './data_nodes';

// All available node classes
export const NodeClasses = [
    HttpRequestNode,
    DataValidationNode,
    DataMappingNode,
    LoopNode,
    IfNode,
    CodeNode,
    NoOpNode,
];

// Registry: type -> class
export const NodeRegistry = {};
NodeClasses.forEach(NodeClass => {
    NodeRegistry[NodeClass.nodeType] = NodeClass;
});

// Grouped by category for palette
export const NodesByCategory = {};
NodeClasses.forEach(NodeClass => {
    const cat = NodeClass.category || 'general';
    if (!NodesByCategory[cat]) {
        NodesByCategory[cat] = [];
    }
    NodesByCategory[cat].push(NodeClass);
});

// Export individual nodes for direct import
export {
    HttpRequestNode,
    DataValidationNode,
    DataMappingNode,
    LoopNode,
    IfNode,
    CodeNode,
    NoOpNode,
};
