/** @odoo-module **/
import { Component, xml, useState, useRef, onMounted, onWillUnmount } from "@odoo/owl";

/**
 * NodeMenu Component
 * 
 * A floating context menu for adding nodes to the workflow canvas.
 * Styled like n8n's node selector with search and categories.
 * 
 * Features:
 * - Search bar with auto-focus
 * - Categorized node list
 * - Keyboard navigation (Escape to close)
 * - Click outside to close
 * - Absolute positioning at spawn location
 */
export class NodeMenu extends Component {
    static template = xml`
        <div class="node-menu" 
             t-att-style="menuStyle"
             t-ref="menuRoot"
             t-on-keydown="onKeyDown">
            <!-- Search Bar -->
            <div class="node-menu__search">
                <input type="text" 
                       class="node-menu__search-input"
                       t-ref="searchInput"
                       t-model="state.searchQuery"
                       placeholder="Search for blocks or requests"
                       t-on-input="onSearchInput"/>
            </div>
            
            <!-- Node Categories -->
            <div class="node-menu__content">
                <t t-foreach="filteredCategories" t-as="category" t-key="category.name">
                    <div class="node-menu__category">
                        <div class="node-menu__category-title">
                            <t t-esc="category.name"/>
                        </div>
                        <t t-foreach="category.items" t-as="item" t-key="item.name">
                            <div class="node-menu__item" 
                                 t-att-data-node-type="item.name"
                                 t-on-click="onItemClick">
                                <div class="node-menu__item-icon">
                                    <t t-esc="item.icon"/>
                                </div>
                                <div class="node-menu__item-info">
                                    <div class="node-menu__item-title">
                                        <t t-esc="item.title"/>
                                    </div>
                                    <div class="node-menu__item-description" t-if="item.description">
                                        <t t-esc="item.description"/>
                                    </div>
                                </div>
                            </div>
                        </t>
                    </div>
                </t>
                
                <!-- Empty State -->
                <div class="node-menu__empty" t-if="filteredCategories.length === 0">
                    No nodes found
                </div>
            </div>
        </div>
    `;

    static props = {
        position: { type: Object },  // { x, y } - canvas coordinates
        onSelect: { type: Function }, // (nodeType) => void
        onClose: { type: Function },  // () => void
        // Optional: for inserting node into a connection (can be null)
        connectionContext: { type: [Object, { value: null }], optional: true },
    };

    setup() {
        this.menuRef = useRef("menuRoot");
        this.searchInputRef = useRef("searchInput");

        this.state = useState({
            searchQuery: "",
        });

        // Auto-focus search input on mount
        onMounted(() => {
            this.searchInputRef.el?.focus();
            document.addEventListener("mousedown", this._onClickOutside);
        });

        onWillUnmount(() => {
            document.removeEventListener("mousedown", this._onClickOutside);
        });

        this._onClickOutside = this._onClickOutside.bind(this);
    }

    /**
     * Node categories and items
     */
    get categories() {
        return [
            {
                name: "Actions",
                items: [
                    { name: "http", title: "HTTP Request", icon: "🌐", description: "Create and send an HTTP request" },
                    { name: "code", title: "Code", icon: "🐍", description: "Run custom Python/JS code" },
                ],
            },
            {
                name: "Flow Control",
                items: [
                    { name: "if", title: "If", icon: "⬖", description: "Conditional branching" },
                    { name: "loop", title: "Loop", icon: "🔄", description: "Loop over items" },
                ],
            },
            {
                name: "Data",
                items: [
                    { name: "mapping", title: "Data Mapping", icon: "⇄", description: "Transform and map data" },
                    { name: "validation", title: "Validation", icon: "✓", description: "Validate data format" },
                ],
            },
        ];
    }

    /**
     * Filter categories based on search query
     */
    get filteredCategories() {
        const query = this.state.searchQuery.toLowerCase().trim();
        if (!query) return this.categories;

        return this.categories
            .map(cat => ({
                ...cat,
                items: cat.items.filter(item =>
                    item.title.toLowerCase().includes(query) ||
                    item.description?.toLowerCase().includes(query)
                ),
            }))
            .filter(cat => cat.items.length > 0);
    }

    /**
     * Menu positioning style
     */
    get menuStyle() {
        const { x, y } = this.props.position || { x: 100, y: 100 };
        return `left: ${x}px; top: ${y}px;`;
    }

    /**
     * Handle item click - extract nodeType from data attribute
     */
    onItemClick(ev) {
        const nodeType = ev.currentTarget.dataset.nodeType;
        this.onSelectNode(nodeType);
    }

    /**
     * Handle node selection
     */
    onSelectNode(nodeType) {
        this.props.onSelect(nodeType, this.props.connectionContext);
        this.props.onClose();
    }

    /**
     * Handle keyboard events
     */
    onKeyDown(ev) {
        if (ev.key === "Escape") {
            ev.preventDefault();
            this.props.onClose();
        }
    }

    /**
     * Handle search input
     */
    onSearchInput(ev) {
        this.state.searchQuery = ev.target.value;
    }

    /**
     * Close menu when clicking outside
     */
    _onClickOutside(ev) {
        if (this.menuRef.el && !this.menuRef.el.contains(ev.target)) {
            this.props.onClose();
        }
    }
}
