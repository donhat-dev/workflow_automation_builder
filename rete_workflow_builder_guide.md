# Hướng dẫn Xây dựng Rete.js Plugin & UI Workflow Builder (Native JS vs Odoo OWL)

Tài liệu này hướng dẫn chi tiết cách xây dựng một Plugin tùy chỉnh cho Rete.js v2, so sánh cách triển khai giữa **Native JS** (như trong prototype hiện tại) và **Odoo OWL**, đồng thời cung cấp lộ trình từng bước để tích hợp các tính năng nâng cao cho Workflow Builder.

## 1. Kiến trúc Plugin trong Rete.js v2

Trong Rete.js v2, mọi thứ đều xoay quanh hệ thống **Scope** và **Signals**. Hiểu rõ cơ chế này là chìa khóa để viết custom renderer.

### Cơ chế hoạt động
*   **Scope (Phạm vi)**: Là một container chứa các event handlers (pipes). Editor chính là một Scope cha.
*   **Signals (Tín hiệu)**: Là các sự kiện được bắn ra (emit) từ Scope. Ví dụ: `nodecreated`, `connectioncreated`, `render`.
*   **Pipes (Ống dẫn)**: Là các hàm trung gian (middleware) chặn và xử lý signals. Plugin hoạt động bằng cách "lắng nghe" signal từ Editor thông qua Pipes.

### Cấu trúc cơ bản của một Render Plugin
Một Render Plugin sẽ lắng nghe signal `render` và quyết định xem nó có hiển thị UI cho phần tử đó hay không (Node, Connection, Socket, Control).

```typescript
// Cấu trúc giả định
class MyRenderPlugin {
    constructor() {
        this.name = 'my-render-plugin';
    }

    setParent(scope) {
        // Đăng ký pipe để lắng nghe signal 'render'
        scope.addPipe((context) => {
            if (context.type === 'render') {
                // context.data chứa thông tin: { type: 'node', payload: NodeInstance }
                this.renderInfo(context.data);
            }
            return context; // Trả về context để signal tiếp tục đi qua các plugin khác
        });
    }

    renderInfo(data) {
        if (data.type === 'node') {
            // Logic vẽ Node
        } else if (data.type === 'connection') {
            // Logic vẽ Connection
        }
    }
}
```

---

## 2. Xây dựng Custom Render Plugin: Native JS vs Odoo OWL

Phần này sẽ hướng dẫn cách "hiện thực hóa" Node và Component trong hai môi trường khác nhau.

### 2.1. Utils & Helpers Cần Thiết
Trước khi xây dựng rendering, bạn cần các thư viện bổ trợ từ `rete-render-utils`. Đây là bộ công cụ giúp đồng bộ vị trí giữa logic (Rete) và giao diện (DOM).

*   **Binders**: Giúp quản lý sự kiện DOM mà không gây rò rỉ bộ nhớ.
*   **Position Helpers**: `getDOMSocketPosition` - cực kỳ quan trọng để tính toán điểm đầu/cuối của dây nối (connection) dựa trên vị trí thực tế của DOM Element.

### 2.2. Native JS Implementation (Tham chiếu `app.js`)
Trong `app.js` hiện tại của bạn, lớp `DomRenderer` đang thực hiện vai trò của một Render Plugin thủ công.

*   **Khởi tạo Node**: Sử dụng `document.createElement('div')`.
*   **Quản lý State**: Trực tiếp thao tác DOM (`element.textContent = ...`).
*   **Sockets**: Gán `dataset` vào thẻ div và dùng `getBoundingClientRect` để tính vị trí.
*   **Hạn chế**: C Code trở nên cồng kềnh khi UI phức tạp (nhiều controls, logic ẩn/hiện).

### 2.3. Odoo OWL Implementation (Đề xuất)
OWL sử dụng cơ chế Component-based, giúp code gọn gàng và dễ bảo trì hơn. Thay vì tạo div thủ công, ta sẽ **mount** một OWL Component vào container của Rete.

#### Bước 1: Định nghĩa OWL Nodes
Tạo một Component chung cho Node (ví dụ `WorkflowNode`) thay vì hardcode HTML string.

```javascript
// owl_components.js
const { Component, xml } = owl;

class WorkflowNode extends Component {
    static template = xml`
        <div class="rete-node" t-att-class="getClass()" t-att-style="getStyle()">
            <div class="rete-node__header">
                <t t-esc="props.data.label"/>
            </div>
            <div class="rete-node__body">
                <!-- Render Inputs -->
                <t t-foreach="inputs" t-as="input" t-key="input.key">
                    <div class="rete-socket input" 
                         t-att-data-key="input.key" 
                         t-ref="socket"> <!-- OWL Ref để lấy element thực -->
                    </div>
                </t>
                <!-- Controls & Outputs... -->
            </div>
        </div>
    `;

    // Logic xử lý class, style, và tương tác
    getClass() { return \`rete-node--\${this.props.data.label.toLowerCase()}\`; }
}
```

#### Bước 2: Tạo `OdooPlugin`
Plugin này sẽ chịu trách nhiệm "cầu nối": Nhận signal từ Rete -> Mount OWL Component.

```javascript
// odoo_render_plugin.js
class OdooPlugin {
    constructor() {
        this.owners = new Map(); // Lưu trữ mối quan hệ giữa Rete ID và OWL Component App
    }

    setParent(scope) {
        scope.addPipe((context) => {
            if (context.type === 'render' && context.data.type === 'node') {
                this.mountNode(context.data.element, context.data.payload);
            } else if (context.type === 'unmount') {
                this.unmountNode(context.data.element);
            }
            return context;
        });
    }

    async mountNode(container, nodeData) {
        // container: là HTML element mà Rete tạo ra để chứa node này
        
        // Khởi tạo một sub-app OWL nhỏ cho mỗi Node (hoặc dùng Portal nếu kiến trúc cho phép)
        // Lưu ý: Trong Odoo thực tế, ta thường dùng Component con của một App lớn,
        // nhưng với Rete, mỗi node là một thực thể DOM độc lập.
        
        const env = owl.useEnv(); // Hoặc lấy env từ App chính
        const app = new owl.App(WorkflowNode, { 
            props: { data: nodeData },
            env: env 
        });
        
        const root = await app.mount(container);
        this.owners.set(nodeData.id, app);
    }

    unmountNode(nodeData) {
        const app = this.owners.get(nodeData.id);
        if (app) {
            app.destroy();
            this.owners.delete(nodeData.id);
        }
    }
}
```

### 2.4. So sánh Native JS vs OWL

| Đặc điểm           | Native JS (Prototype `app.js`)               | Odoo OWL Plugin                                 |
| :----------------- | :------------------------------------------- | :---------------------------------------------- |
| **Tạo DOM**        | `document.createElement` thủ công            | `xml` template declaritive                      |
| **Cập nhật UI**    | `el.innerHTML = ...` (dễ lỗi)                | Reactive State (`useState`) tự động render lại  |
| **Event Handling** | `addEventListener` thủ công, phải nhớ remove | `t-on-click`, tự động cleanup                   |
| **Tái sử dụng**    | Khó (Copy-paste code render)                 | Dễ (Import Component `KeyValueEditor` vào Node) |
| **Hiệu năng**      | Nhanh (ít layer) nhưng khó quản lý           | Tốt (Virtual DOM), code sauber                  |

---

## 3. Step-by-Step: Xây dựng Workflow Builder Hoàn chỉnh

Dưới đây là các bước để lắp ráp các mảnh ghép thành ứng dụng hoàn chỉnh.

### Bước 1: Chuẩn bị Môi Trường
Cài đặt các gói cần thiết (hoặc dùng CDN như trong `index.html`).
*   Core: `rete`, `rete-area-plugin`, `rete-engine`.
*   Plugins "Đồ chơi": `rete-connection-plugin`, `rete-context-menu-plugin`, `rete-history-plugin`.
*   Helper: `rete-render-utils`.

### Bước 2: Khởi tạo Editor (Logic cốt lõi)
Tách biệt logic Editor ra khỏi UI. Class `WorkflowEditor` nên quản lý Rete Instance.

```javascript
/* workflow_editor.js */
const { NodeEditor } = Rete;
const { AreaPlugin, AreaExtensions } = ReteAreaPlugin;
const { ConnectionPlugin, Presets: ConnectionPresets } = ReteConnectionPlugin;
const { HistoryPlugin, HistoryExtensions } = ReteHistoryPlugin;

export async function createEditor(container) {
    const editor = new NodeEditor();
    const area = new AreaPlugin(container);
    
    // 1. Kết nối Area (Layer hiển thị cơ bản)
    editor.use(area);
    
    // 2. Kết nối Render Plugin (Chọn Native hoặc OWL ở bước này)
    // area.use(new OdooPlugin()); <--- Custom Plugin của chúng ta
    
    // 3. Kết nối Connection Plugin (Tương tác dây nối)
    const connection = new ConnectionPlugin();
    connection.addPreset(ConnectionPresets.classic.setup());
    area.use(connection);

    // 4. Kết nối Utils & Extensions
    // Chọn Node (Selection)
    AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
        accumulating: AreaExtensions.accumulateOnCtrl()
    });
    // Kéo thả Node (Drag)
    // Lưu ý: AreaPlugin v2 tự hỗ trợ drag cơ bản, nhưng cần plugin render xử lý event pointerdown trên node
    
    // 5. Kết nối History (Undo/Redo) -> QUAN TRỌNG cho trải nghiệm UX
    const history = new HistoryPlugin();
    history.addPreset(HistoryExtensions.keyboard()); // Ctrl+Z / Ctrl+Y
    area.use(history);

    return {
        editor,
        area,
        destroy: () => area.destroy()
    };
}
```

### Bước 3: Tích hợp Custom UI (Phần bạn phải tự xây)
Rete.js chỉ lo phần **Graph Area** (Nodes, Connections). Các phần sau bạn phải tự xây bằng OWL/HTML thông thường:

1.  **Toolbar (Top)**: Nút Run, Export JSON, Undo/Redo.
    *   *Gợi ý*: Bind sự kiện click vào `editor.trigger('undo')` cho History.
2.  **Dock/Palette (Left)**: Danh sách Node để kéo thả.
    *   *Logic*: Sự kiện `dragstart` lưu `nodeType`. Sự kiện `drop` trên Editor Area lấy tọa độ mouse, chuyển đổi sang tọa độ Graph (thông qua `area.area.pointer`) và gọi `editor.addNode`.
3.  **Property Panel (Right)**:
    *   *Logic*: Lắng nghe sự kiện `nodepicked` từ Area. Khi user chọn node, hiển thị form edit thông tin node đó. Khi form thay đổi -> cập nhật `node.data` -> gọi `area.update('node', id)` để render lại node.

### Bước 4: Tích hợp Engine (Chạy Workflow)
Sử dụng `DataflowEngine` để xử lý dữ liệu.

```javascript
const { DataflowEngine } = ReteEngine;

// Trong hàm createEditor:
const engine = new DataflowEngine();
editor.use(engine);

// Hàm chạy workflow:
async function runWorkflow() {
    // Tìm node không có output (thường là node kết thúc hoặc debug)
    const outputNodes = editor.getNodes().filter(n => n.label === 'Output');
    
    for (const node of outputNodes) {
        // fetch đầu vào của node này sẽ kích hoạt tính toán của toàn bộ chuỗi trước đó
        await engine.fetch(node.id);
    }
}
```

## Tổng kết Lộ trình Hiện thực

1.  **Refactor `nodes.js`**: Giữ nguyên logic `Class` và `data()` (vì nó độc lập với UI).
2.  **Tạo `OdooPlugin`**: Thay thế `DomRenderer` trong `app.js` bằng Plugin tuân thủ chuẩn Rete v2. Sử dụng `rete-render-utils` để tính vị trí socket chính xác.
3.  **Thay thế `SimpleEditor`**: Sử dụng `NodeEditor` chuẩn của Rete + các plugin chính hãng (`rete-connection-plugin`, `rete-history-plugin`).
4.  **Xây dựng UI Wrapper**: Dùng OWL Component `WorkflowApp` để bao bọc Area container và các panel phụ trợ.

Bằng cách này, bạn tận dụng được sức mạnh của hệ sinh thái Rete (Undo/Redo, Auto Arrange, Minimap) mà vẫn giữ được sự linh hoạt của Odoo OWL trong việc render giao diện Nodes.
