/** @odoo-module **/

/**
 * Control - Base class for node configuration UI elements
 * Inspired by Rete.js ClassicPreset.Control
 * 
 * Controls represent configurable parameters within a node
 * (text inputs, selects, key-value pairs, etc.)
 */
export class Control {
    /**
     * @param {string} key - Unique identifier within the node
     * @param {Object} options
     * @param {string} options.label - Display label
     * @param {*} options.default - Default value
     */
    constructor(key, options = {}) {
        this.key = key;
        this.type = 'base';
        this.label = options.label || key;
        this.value = options.default !== undefined ? options.default : null;
    }

    setValue(value) {
        this.value = value;
    }

    getValue() {
        return this.value;
    }

    /**
     * Serialize control to JSON
     */
    toJSON() {
        return {
            key: this.key,
            type: this.type,
            value: this.value,
        };
    }

    /**
     * Restore control value from JSON
     */
    fromJSON(data) {
        if (data.value !== undefined) {
            this.value = data.value;
        }
    }
}

// ============================================
// CONTROL IMPLEMENTATIONS
// ============================================

/**
 * TextInputControl - Single/multi-line text input
 */
export class TextInputControl extends Control {
    constructor(key, options = {}) {
        super(key, options);
        this.type = 'text';
        this.placeholder = options.placeholder || '';
        this.multiline = options.multiline || false;
    }
}

/**
 * SelectControl - Dropdown select
 */
export class SelectControl extends Control {
    /**
     * @param {string} key
     * @param {Object} options
     * @param {Array<{value: string, label: string}>} options.options - Select options
     */
    constructor(key, options = {}) {
        super(key, options);
        this.type = 'select';
        this.options = options.options || [];
        // Set default to first option if not provided
        if (this.value === null && this.options.length > 0) {
            this.value = this.options[0].value;
        }
    }
}

/**
 * KeyValueControl - Dynamic key-value pair list
 * Used for headers, mappings, custom fields
 */
export class KeyValueControl extends Control {
    constructor(key, options = {}) {
        super(key, options);
        this.type = 'keyvalue';
        this.keyPlaceholder = options.keyPlaceholder || 'Key';
        this.valuePlaceholder = options.valuePlaceholder || 'Value';
        // Default to one empty pair
        if (!this.value || !Array.isArray(this.value)) {
            this.value = [{ key: '', value: '' }];
        }
    }

    addPair() {
        this.value.push({ key: '', value: '' });
    }

    removePair(index) {
        if (this.value.length > 1) {
            this.value.splice(index, 1);
        }
    }

    setPair(index, key, value) {
        if (this.value[index]) {
            this.value[index] = { key, value };
        }
    }

    /**
     * Get non-empty pairs for processing
     */
    getPairs() {
        return this.value.filter(p => p.key);
    }
}

/**
 * NumberControl - Numeric input
 */
export class NumberControl extends Control {
    constructor(key, options = {}) {
        super(key, options);
        this.type = 'number';
        this.min = options.min;
        this.max = options.max;
        this.step = options.step || 1;
        if (this.value === null) {
            this.value = options.default || 0;
        }
    }
}

/**
 * CheckboxControl - Boolean toggle
 */
export class CheckboxControl extends Control {
    constructor(key, options = {}) {
        super(key, options);
        this.type = 'checkbox';
        if (this.value === null) {
            this.value = options.default || false;
        }
    }
}

// Export control registry
export const ControlRegistry = {
    text: TextInputControl,
    select: SelectControl,
    keyvalue: KeyValueControl,
    number: NumberControl,
    checkbox: CheckboxControl,
};
