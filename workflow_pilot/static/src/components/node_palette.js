/** @odoo-module **/
import { _t } from "@web/core/l10n/translation";

import { Component, xml } from "@odoo/owl";

export class NodePaletteItem extends Component {
    static template = xml`
        <div class="node-palette__item"
            t-att-class="props.className"
            t-on-click="onClick"
            t-on-dragstart="onDragStart"
            draggable="true">
            <div class="node-palette__icon"><t t-esc="props.icon"/></div>
            <div class="node-palette__label"><t t-esc="props.title || ('Node')"/></div>
        </div>
    `;

    static props = {
        name: String,
        title: { type: String, optional: true },
        icon: { type: String, optional: true },
        className: { type: String, optional: true },
        onAddNode: { type: Function, optional: true },
    };

    setup() {
        // Make _t available in template scope as ctx._t
        this._t = _t;
    }

    onClick() {
        this.props.onAddNode?.(this.props.name);
    }

    onDragStart(ev) {
        // Contract cho editor-canvas (sẽ implement ở component khác)
        ev.dataTransfer.effectAllowed = "copy";
        ev.dataTransfer.setData("application/x-workflow-node", this.props.name);
    }
}

class NodePalette extends Component {
    static template = xml`
        <div class="sidebar">
            <h3 class="sidebar__title"><t t-esc="('Nodes')"/></h3>
            <div class="node-palette">
                <t t-foreach="items" t-as="item" t-key="item.name">
                    <NodePaletteItem
                        name="item.name"
                        title="item.title"
                        icon="item.icon"
                        className="item.className"
                        onAddNode="props.onAddNode"/>
                </t>
            </div>
        </div>
    `;

    static components = { NodePaletteItem };
    static props = { onAddNode: { type: Function, optional: true } };

    setup() {
        // Make _t available in template scope as ctx._t
        this._t = _t;
    }

    get items() {
        // Tạm hardcode; bước kế tiếp: lấy từ registry.category('workflow_builder.nodes')
        return [
            { name: "http", title: ("HTTP Request"), icon: "🌐", className: "node-palette__item--http" },
            { name: "validation", title: ("Data Validation"), icon: "✓", className: "node-palette__item--validation" },
            { name: "mapping", title: ("Data Mapping"), icon: "⇄", className: "node-palette__item--mapping" },
        ];
    }
}

export { NodePalette };