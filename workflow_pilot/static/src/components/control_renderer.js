/** @odoo-module **/

import { Component } from "@odoo/owl";

/**
 * ControlRenderer Component
 * 
 * Dynamically renders control UI based on control type.
 * Bridges Core Control classes with OWL UI.
 */
export class ControlRenderer extends Component {
    static template = "workflow_pilot.control_renderer";

    static props = {
        control: Object,
        onChange: { type: Function, optional: true },
    };

    get controlType() {
        return this.props.control?.type || 'text';
    }

    get value() {
        return this.props.control?.getValue() || '';
    }

    get label() {
        return this.props.control?.label || '';
    }

    get placeholder() {
        return this.props.control?.placeholder || '';
    }

    get isMultiline() {
        return this.props.control?.multiline || false;
    }

    get options() {
        return this.props.control?.options || [];
    }

    get pairs() {
        return this.props.control?.value || [];
    }

    /**
     * Handle text/number input change
     */
    onInput(ev) {
        const value = ev.target.value;
        this.props.control.setValue(value);
        this.props.onChange?.(this.props.control.key, value);
    }

    /**
     * Handle select change
     */
    onSelectChange(ev) {
        const value = ev.target.value;
        this.props.control.setValue(value);
        this.props.onChange?.(this.props.control.key, value);
    }

    /**
     * Handle checkbox toggle
     */
    onCheckboxChange(ev) {
        const value = ev.target.checked;
        this.props.control.setValue(value);
        this.props.onChange?.(this.props.control.key, value);
    }

    // ============================================
    // KEY-VALUE CONTROL HANDLERS
    // ============================================

    onKeyChange(index, ev) {
        const pairs = this.props.control.value;
        if (pairs[index]) {
            pairs[index].key = ev.target.value;
            this.props.onChange?.(this.props.control.key, pairs);
        }
    }

    onValueChange(index, ev) {
        const pairs = this.props.control.value;
        if (pairs[index]) {
            pairs[index].value = ev.target.value;
            this.props.onChange?.(this.props.control.key, pairs);
        }
    }

    addPair() {
        this.props.control.addPair();
        this.props.onChange?.(this.props.control.key, this.props.control.value);
    }

    removePair(index) {
        this.props.control.removePair(index);
        this.props.onChange?.(this.props.control.key, this.props.control.value);
    }
}
