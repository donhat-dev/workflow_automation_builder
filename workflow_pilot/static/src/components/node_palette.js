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
        onAddNode: { type: Function },
    };

    setup() {
        this._t = _t;
    }

    onClick() {
        this.props.onAddNode(this.props.name);
    }

    onDragStart(ev) {
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
    static props = { onAddNode: { type: Function } };

    setup() {
        this._t = _t;
    }

    get items() {
        return [
            { name: "http", title: ("HTTP Request"), icon: "🌐", className: "node-palette__item--http" },
            { name: "validation", title: ("Data Validation"), icon: "✓", className: "node-palette__item--validation" },
            { name: "mapping", title: ("Data Mapping"), icon: "⇄", className: "node-palette__item--mapping" },
            { name: "loop", title: ("Loop Over Items"), icon: "🔄", className: "node-palette__item--loop" },
            { name: "if", title: ("If"), icon: "⬖", className: "node-palette__item--if" },
            { name: "code", title: ("Code"), icon: "🐍", className: "node-palette__item--code" },
        ];
    }
}

export { NodePalette };