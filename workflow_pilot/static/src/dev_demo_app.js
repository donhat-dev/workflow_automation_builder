/** @odoo-module **/

import { Component, useState, xml } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";

import { NodePalette } from "./components/node_palette";
import { EditorCanvas } from "./components/editor_canvas";

export class WorkflowPilotDevApp extends Component {
    static template = xml`
        <div class="workflow-pilot-dev">
            <div class="workflow-pilot-dev__sidebar">
                <NodePalette onAddNode="onAddNode"/>
            </div>

            <div class="workflow-pilot-dev__main">
                <div class="workflow-pilot-dev__topbar">
                    <div class="workflow-pilot-dev__title">Workflow Pilot - Dev Playground</div>
                    <button class="workflow-pilot-dev__btn" t-on-click="clear">Clear</button>
                </div>

                <EditorCanvas nodes="state.nodes" onDropNode="onDropNode"/>
            </div>
        </div>
    `;

    static components = { NodePalette, EditorCanvas };

    setup() {
        this.state = useState({
            nextId: 1,
            nodes: [],
        });
        this._offset = { x: 40, y: 40 };
    }

    onAddNode = (type) => {
        // When clicking palette item (no cursor position), stagger placement.
        const x = 80 + (this._offset.x % 240);
        const y = 80 + (this._offset.y % 240);
        this._offset.x += 30;
        this._offset.y += 30;

        this._createNode(type, { x, y });
    };

    onDropNode = ({ type, position }) => {
        this._createNode(type, position);
    };

    _createNode(type, position) {
        const id = `n_${this.state.nextId++}`;
        const titleByType = {
            http: ("HTTP Request"),
            validation: ("Data Validation"),
            mapping: ("Data Mapping"),
        };

        this.state.nodes.push({
            id,
            type,
            title: titleByType[type] || type,
            x: position.x,
            y: position.y,
        });
    }

    clear() {
        this.state.nodes.splice(0, this.state.nodes.length);
        this.state.nextId = 1;
        this._offset = { x: 40, y: 40 };
    }
}
