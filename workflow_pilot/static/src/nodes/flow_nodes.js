/** @odoo-module **/

import { BaseNode, DataSocket } from '../core/node';

/**
 * LoopNode - Iterates over array items
 * 
 * n8n-style loop: processes items one at a time,
 * outputs "Loop" for each iteration, "Done" when complete.
 * 
 * Inputs: data (array to iterate)
 * Outputs: loop (current item), done (completion signal)
 */
export class LoopNode extends BaseNode {
    static nodeType = 'loop';
    static label = 'Loop Over Items';
    static icon = 'fa-repeat';
    static category = 'flow';

    constructor() {
        super();

        // Inputs
        this.addInput('data', DataSocket, 'Data');

        // Outputs - n8n style dual output
        this.addOutput('done', DataSocket, 'Done');
        this.addOutput('loop', DataSocket, 'Loop');
    }
}

/**
 * IfNode - Conditional branching
 * 
 * Routes data to "true" or "false" output based on condition.
 * 
 * Inputs: data
 * Outputs: true, false
 */
export class IfNode extends BaseNode {
    static nodeType = 'if';
    static label = 'If';
    static icon = 'fa-code-branch';
    static category = 'flow';

    constructor() {
        super();

        // Inputs
        this.addInput('data', DataSocket, 'Data');

        // Outputs - conditional routing
        this.addOutput('true', DataSocket, 'True');
        this.addOutput('false', DataSocket, 'False');
    }
}

/**
 * CodeNode - Custom code execution
 * 
 * Allows users to write custom transformation logic.
 * Execution happens in Python backend.
 */
export class CodeNode extends BaseNode {
    static nodeType = 'code';
    static label = 'Code';
    static icon = 'fa-code';
    static category = 'transform';

    constructor() {
        super();

        // Inputs
        this.addInput('data', DataSocket, 'Input');

        // Outputs
        this.addOutput('result', DataSocket, 'Result');
    }
}

/**
 * NoOpNode - Placeholder / pass-through node
 * Used for debugging or as placeholder in auto-creation
 */
export class NoOpNode extends BaseNode {
    static nodeType = 'noop';
    static label = 'Replace Me';
    static icon = 'fa-circle-o';
    static category = 'general';

    constructor() {
        super();

        this.addInput('data', DataSocket, 'Data');
        this.addOutput('result', DataSocket, 'Result');
    }
}
