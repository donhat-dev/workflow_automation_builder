/** @odoo-module **/

/**
 * Workflow Node Service
 * 
 * Service for managing workflow node types and search.
 * Uses registries for extensibility.
 * 
 * @odoo-dependency - Uses Odoo registry and service pattern
 */

import { registry } from "@web/core/registry";
// @core - fuzzyLookup is portable, could be replaced with custom impl
import { fuzzyLookup } from "@web/core/utils/search";

const nodeTypeRegistry = registry.category("workflow_node_types");
const nodeCategoryRegistry = registry.category("workflow_node_categories");

export const workflowNodeService = {
    dependencies: [],

    start(env) {
        // Track recently used nodes (session-based)
        let recentNodeKeys = [];
        const MAX_RECENT = 10;

        return {
            /**
             * Get all registered node types
             * Supports both patterns:
             * - Raw Class: registry.add("http", HttpRequestNode)
             * - Definition object: registry.add("http", { class: HttpRequestNode, ... })
             * @returns {Array<{key: string, class: Function, name: string, icon: string, category: string}>}
             */
            getAllNodeTypes() {
                return nodeTypeRegistry.getEntries().map(([key, value]) => {
                    // Support both: raw Class or definition object
                    const NodeClass = value.class || value;
                    const isClass = typeof NodeClass === 'function';

                    if (!isClass) {
                        console.warn(`[workflowNode] Invalid node type "${key}":`, value);
                        return null;
                    }

                    return {
                        key,
                        class: NodeClass,
                        // Extract from static properties, fallback to definition object, then defaults
                        name: NodeClass.label || value.name || key,
                        icon: NodeClass.icon || value.icon || "fa-cube",
                        category: NodeClass.category || value.category || "action",
                        description: NodeClass.description || value.description || "",
                    };
                }).filter(Boolean);
            },

            /**
             * Get node type definition by key
             * @param {string} key - Node type key (e.g., "http")
             * @returns {Object|null}
             */
            getNodeType(key) {
                if (!nodeTypeRegistry.contains(key)) {
                    return null;
                }
                const value = nodeTypeRegistry.get(key);
                const NodeClass = value.class || value;

                return {
                    key,
                    class: NodeClass,
                    name: NodeClass.label || value.name || key,
                    icon: NodeClass.icon || value.icon || "fa-cube",
                    category: NodeClass.category || value.category || "action",
                    description: NodeClass.description || value.description || "",
                };
            },

            /**
             * Get node class by key (for instantiation)
             * @param {string} key
             * @returns {Function|null}
             */
            getNodeClass(key) {
                if (!nodeTypeRegistry.contains(key)) {
                    return null;
                }
                const value = nodeTypeRegistry.get(key);
                return value.class || value;
            },

            /**
             * Get all categories sorted by sequence
             * @returns {Array<{key: string, name: string, icon: string}>}
             */
            getCategories() {
                const entries = nodeCategoryRegistry.getEntries();
                // Sort by sequence (from registry options)
                return entries
                    .map(([key, value]) => ({ key, ...value }))
                    .sort((a, b) => {
                        const seqA = nodeCategoryRegistry.get(a.key, { sequence: 100 }).sequence || 100;
                        const seqB = nodeCategoryRegistry.get(b.key, { sequence: 100 }).sequence || 100;
                        return seqA - seqB;
                    });
            },

            /**
             * Search nodes with optional fuzzy matching
             * @param {string} searchValue - Search query
             * @param {Object} options - { category?: string }
             * @returns {Array<{key: string, name: string, nodes: Array}>} Grouped by category
             */
            searchNodes(searchValue = "", options = {}) {
                let nodes = this.getAllNodeTypes();

                // Filter by category if specified
                if (options.category) {
                    nodes = nodes.filter(n => n.category === options.category);
                }

                // Apply fuzzy search if query provided
                if (searchValue?.trim()) {
                    nodes = fuzzyLookup(searchValue, nodes, (n) => n.name);
                }

                // Group by category
                return this._groupByCategory(nodes);
            },

            /**
             * Group nodes by their category
             * @private
             */
            _groupByCategory(nodes) {
                const categories = this.getCategories();
                const grouped = [];

                for (const cat of categories) {
                    const catNodes = nodes.filter(n => n.category === cat.key);
                    if (catNodes.length) {
                        grouped.push({
                            key: cat.key,
                            name: cat.name,
                            icon: cat.icon,
                            nodes: catNodes,
                        });
                    }
                }

                // Add uncategorized nodes to "default" group
                const categorized = new Set(categories.map(c => c.key));
                const uncategorized = nodes.filter(n => !categorized.has(n.category));
                if (uncategorized.length) {
                    grouped.push({
                        key: "default",
                        name: "Other",
                        icon: "📦",
                        nodes: uncategorized,
                    });
                }

                return grouped;
            },

            /**
             * Track node usage for "recent" feature
             * @param {string} nodeKey
             */
            trackUsage(nodeKey) {
                // Remove if already exists, then add to front
                recentNodeKeys = recentNodeKeys.filter(k => k !== nodeKey);
                recentNodeKeys.unshift(nodeKey);
                // Keep only MAX_RECENT
                recentNodeKeys = recentNodeKeys.slice(0, MAX_RECENT);
            },

            /**
             * Get recently used nodes
             * @param {number} limit
             * @returns {Array}
             */
            getRecentNodes(limit = 5) {
                return recentNodeKeys
                    .slice(0, limit)
                    .map(key => this.getNodeType(key))
                    .filter(Boolean);
            },

            /**
             * Clear recent nodes history
             */
            clearRecentNodes() {
                recentNodeKeys = [];
            },
        };
    },
};

registry.category("services").add("workflowNode", workflowNodeService);
