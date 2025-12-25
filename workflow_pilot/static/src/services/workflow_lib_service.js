/** @odoo-module **/

/**
 * Workflow Library Service
 * 
 * Service for accessing external libraries (dagre, motion, etc.)
 * Abstracts window globals while maintaining backward compatibility.
 * 
 * @odoo-dependency - Uses Odoo registry and service pattern
 */

import { registry } from "@web/core/registry";

const libRegistry = registry.category("workflow_libs");

export const workflowLibService = {
    dependencies: [],

    start(env) {
        return {
            /**
             * Get library instance by name
             * @param {string} libName - Library name (e.g., "dagre", "motion")
             * @returns {Object|null} Library instance or null if not available
             */
            get(libName) {
                if (!libRegistry.contains(libName)) {
                    console.warn(`[WorkflowLib] Library "${libName}" not registered`);
                    return null;
                }

                const lib = libRegistry.get(libName);
                const instance = lib.get();

                if (!instance) {
                    console.warn(`[WorkflowLib] Library "${libName}" registered but not loaded (window.${lib.globalName} is undefined)`);
                }

                return instance;
            },

            /**
             * Check if library is available
             * @param {string} libName
             * @returns {boolean}
             */
            has(libName) {
                if (!libRegistry.contains(libName)) {
                    return false;
                }
                return !!this.get(libName);
            },

            /**
             * Get library definition (metadata)
             * @param {string} libName
             * @returns {Object|null}
             */
            getDefinition(libName) {
                if (!libRegistry.contains(libName)) {
                    return null;
                }
                return libRegistry.get(libName);
            },

            /**
             * Get all registered library names
             * @returns {string[]}
             */
            getRegisteredLibs() {
                return libRegistry.getEntries().map(([key]) => key);
            },
        };
    },
};

registry.category("services").add("workflowLib", workflowLibService);
