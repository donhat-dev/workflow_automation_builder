/** @odoo-module **/

import { BaseNode, DataSocket, ErrorSocket } from '../core/node';
import { TextInputControl, SelectControl, KeyValueControl } from '../core/control';

/**
 * DataValidationNode - Validates incoming data against rules
 */
export class DataValidationNode extends BaseNode {
    static nodeType = 'validation';
    static label = 'Data Validation';
    static icon = 'fa-check-circle';
    static category = 'transform';

    constructor() {
        super();

        // Inputs
        this.addInput('data', DataSocket, 'Input Data');

        // Outputs
        this.addOutput('valid', DataSocket, 'Valid Data');
        this.addOutput('invalid', ErrorSocket, 'Validation Errors');

        // Controls
        this.addControl('requiredFields', new TextInputControl('requiredFields', {
            label: 'Required Fields',
            placeholder: 'field1, field2, field3',
        }));

        this.addControl('schema', new TextInputControl('schema', {
            label: 'Validation Schema (JSON)',
            placeholder: '{"field": {"type": "string", "minLength": 1}}',
            multiline: true,
        }));

        this.addControl('customRules', new KeyValueControl('customRules', {
            label: 'Custom Rules',
            keyPlaceholder: 'Field path',
            valuePlaceholder: 'Regex pattern',
        }));
    }
}

/**
 * DataMappingNode - Maps and transforms data fields
 */
export class DataMappingNode extends BaseNode {
    static nodeType = 'mapping';
    static label = 'Data Mapping';
    static icon = 'fa-exchange';
    static category = 'transform';

    constructor() {
        super();

        // Inputs
        this.addInput('data', DataSocket, 'Input Data');

        // Outputs
        this.addOutput('mapped', DataSocket, 'Mapped Data');

        // Controls
        this.addControl('mappings', new KeyValueControl('mappings', {
            label: 'Field Mappings',
            keyPlaceholder: 'Source path (e.g., user.name)',
            valuePlaceholder: 'Target path',
        }));

        this.addControl('transform', new SelectControl('transform', {
            label: 'Transform Function',
            options: [
                { value: 'none', label: 'None' },
                { value: 'uppercase', label: 'Uppercase' },
                { value: 'lowercase', label: 'Lowercase' },
                { value: 'trim', label: 'Trim Whitespace' },
                { value: 'number', label: 'To Number' },
                { value: 'string', label: 'To String' },
                { value: 'boolean', label: 'To Boolean' },
                { value: 'json_parse', label: 'JSON Parse' },
                { value: 'json_stringify', label: 'JSON Stringify' },
            ],
            default: 'none',
        }));

        this.addControl('defaultValue', new TextInputControl('defaultValue', {
            label: 'Default Value',
            placeholder: 'Value if source is empty',
        }));
    }
}
