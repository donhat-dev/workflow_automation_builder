/** @odoo-module **/

import { Component, target, useRef, xml } from "@odoo/owl";
import { on } from '@web/lib/hoot-dom/helpers/events';

export class EditorCanvas extends Component {
    static template = xml`
        <div class="workflow-editor-canvas"
            t-ref="root"
            t-on-dragover="onDragOver"
            t-on-drop="onDrop">

            <div class="workflow-editor-canvas__hint" t-if="(props.nodes || []).length === 0">
                Drop nodes here (or click in the palette)
            </div>

            <t t-foreach="(props.nodes || [])" t-as="node" t-key="node.id">
                <div class="workflow-editor-canvas__node"
                    t-att-data-node-id="node.id"
                    t-att-style="nodeStyle(node)">
                    <div class="workflow-editor-canvas__node-title">
                        <t t-esc="node.title || node.type"/>
                    </div>
                    <div class="workflow-editor-canvas__node-meta">
                        <t t-esc="node.id"/>
                    </div>
                </div>
            </t>
        </div>
    `;

    static props = {
        nodes: { type: Array, optional: true },
        onDropNode: { type: Function, optional: true },
    };

    setup() {
        this.rootRef = useRef("root");
    }

    onDragOver(ev) {
        ev.preventDefault();
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = "copy";
    }

    onDrop(ev) {
        ev.preventDefault();
        const type = ev.dataTransfer?.getData("application/x-workflow-node");
        if (!type) return;

        const rect = this.rootRef.el.getBoundingClientRect();
        const position = {
            x: Math.max(0, Math.round(ev.clientX - rect.left)),
            y: Math.max(0, Math.round(ev.clientY - rect.top)),
        };

        this.props.onDropNode?.({ type, position });
    }

    nodeStyle(node) {
        const x = Number.isFinite(node.x) ? node.x : 0;
        const y = Number.isFinite(node.y) ? node.y : 0;
        return `left:${x}px;top:${y}px;`;
    }

}
