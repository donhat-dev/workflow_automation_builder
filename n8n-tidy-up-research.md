# Phân Tích Cơ Chế Tidy Up của n8n

## 1. Tổng Quan

n8n sử dụng thư viện **Dagre.js** (`@dagrejs/dagre`) để thực hiện tính năng "Tidy Up" (sắp xếp tự động các nút trên canvas). Dagre là một triển khai JavaScript của **thuật toán Sugiyama** (còn gọi là Layered Graph Drawing), một trong những thuật toán phổ biến nhất cho việc vẽ đồ thị có hướng (directed graphs).

### File nguồn chính
```
packages/frontend/editor-ui/src/features/workflows/canvas/composables/useCanvasLayout.ts
```

### Thư viện sử dụng
- **Dagre.js** v1.1.4+
- **Vue Flow** (để quản lý canvas)

---

## 2. Thuật toán Sugiyama (Layered Graph Drawing)

### 2.1. Nguyên lý cơ bản

Thuật toán Sugiyama gồm 4 bước chính:

1. **Cycle Removal (Loại bỏ chu trình)**: Đảo ngược một số cạnh để đồ thị trở thành DAG (Directed Acyclic Graph).

2. **Layer Assignment (Gán layer)**: Gán mỗi nút vào một layer (cột hoặc hàng tùy theo hướng).
   - Nút gốc (không có đầu vào) ở layer 0.
   - Nút kế tiếp ở layer = max(layer của các nút cha) + 1.

3. **Crossing Reduction (Giảm giao cắt)**: Sắp xếp lại thứ tự các nút trong mỗi layer để giảm thiểu số đường nối bị giao nhau.

4. **Coordinate Assignment (Gán tọa độ)**: Tính toán vị trí X, Y chính xác cho từng nút.

### 2.2. Cấu hình Dagre trong n8n

```typescript
graph.setGraph({
    rankdir: 'LR',           // Hướng: Left-to-Right (trái sang phải)
    edgesep: NODE_Y_SPACING, // Khoảng cách giữa các cạnh
    nodesep: NODE_Y_SPACING, // Khoảng cách dọc giữa các nút cùng rank
    ranksep: NODE_X_SPACING, // Khoảng cách ngang giữa các rank (layer)
});
```

**Các hằng số spacing:**
```typescript
const NODE_X_SPACING = GRID_SIZE * 8;   // 160px (nếu GRID_SIZE = 20)
const NODE_Y_SPACING = GRID_SIZE * 6;   // 120px
const SUBGRAPH_SPACING = GRID_SIZE * 8; // 160px
const AI_X_SPACING = GRID_SIZE * 3;     // 60px
const AI_Y_SPACING = GRID_SIZE * 8;     // 160px
```

---

## 3. Luồng xử lý Layout trong n8n

n8n không chỉ đơn thuần gọi `dagre.layout()` một lần mà thực hiện một quy trình phức tạp hơn:

### Bước 1: Phân loại nút
```typescript
const nonStickyNodes = nodes.filter(node => node.data.type !== STICKY_NODE_TYPE);
const stickies = nodes.filter(node => node.data.type === STICKY_NODE_TYPE);
```
- **Sticky notes** (ghi chú) được xử lý riêng biệt.

### Bước 2: Tách thành các Subgraph độc lập
```typescript
const subgraphs = dagre.graphlib.alg.components(parentGraph).map(nodeIds => {
    return createDagreSubGraph({ nodeIds, parent: parentGraph });
});
```
- Sử dụng `dagre.graphlib.alg.components()` để tìm các **connected components** (nhóm nút liên thông).
- Mỗi nhóm được xử lý layout riêng.

### Bước 3: Xử lý đặc biệt cho AI Nodes
n8n có các nút AI đặc biệt (LLM, Agent) có cấu trúc cha-con:

```typescript
// Với mỗi AI Parent Node (có configurable=true)
const aiGraph = createAiSubGraph({ parent: subgraph, nodeIds: allAiNodeIds });

// Layout theo hướng Top-Bottom (TB) thay vì LR
subGraph.setGraph({ rankdir: 'TB', ... });
dagre.layout(aiGraph, { disableOptimalOrderHeuristic: true });
```

**Lý do**: Các nút cấu hình AI được hiển thị **phía dưới** nút AI chính, tạo thành một "cluster" riêng.

### Bước 4: Layout từng Subgraph
```typescript
dagre.layout(subgraph, { disableOptimalOrderHeuristic: true });
```
- Option `disableOptimalOrderHeuristic: true` giúp tăng tốc độ tính toán.

### Bước 5: Ghép các Subgraph theo chiều dọc
```typescript
const compositeGraph = createDagreVerticalGraph({
    nodes: subgraphs.map(({ boundingBox }, index) => ({
        box: boundingBox,
        id: index.toString(),
    })),
});
subGraph.setGraph({ rankdir: 'TB', ... }); // Top-to-Bottom
dagre.layout(compositeGraph, ...);
```
- Các subgraph (đã được layout) được xếp chồng theo chiều dọc với spacing `SUBGRAPH_SPACING`.

### Bước 6: Tính offset cuối cùng
```typescript
const anchor = {
    x: boundingBoxAfter.x - boundingBoxBefore.x,
    y: boundingBoxAfter.y - boundingBoxBefore.y,
};
```
- Giữ anchor (vị trí gốc) để workflow không bị dịch chuyển quá xa sau khi tidy up.

### Bước 7: Xử lý Sticky Notes
```typescript
const coveredNodes = nonStickyNodes.filter(node =>
    isCoveredBy(stickyBox, nodeBox)
);
// Di chuyển sticky note để bao phủ các nút đã được layout
```
- Sticky notes được di chuyển sao cho vẫn bao phủ các nút mà chúng đang bao phủ trước đó.

---

## 4. Sơ đồ Luồng Xử Lý

```
┌─────────────────────────────────────────────────────────────┐
│                    INPUT: All Nodes & Edges                 │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  1. Tách Sticky Notes ra khỏi danh sách    │
        └─────────────────────────┬───────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  2. Tạo Dagre Graph với nút & cạnh         │
        │     (createDagreGraph)                      │
        └─────────────────────────┬───────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  3. Tách thành Connected Components        │
        │     (dagre.graphlib.alg.components)         │
        └─────────────────────────┬───────────────────┘
                                  │
               ┌──────────────────┼──────────────────┐
               │                  │                  │
               ▼                  ▼                  ▼
        ┌───────────┐      ┌───────────┐      ┌───────────┐
        │ Subgraph 1│      │ Subgraph 2│      │ Subgraph N│
        └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
              │                  │                  │
              ▼                  ▼                  ▼
        ┌─────────────────────────────────────────────┐
        │  4. Với mỗi Subgraph:                      │
        │     a. Tách AI Nodes → Layout TB           │
        │     b. Layout còn lại → dagre.layout(LR)   │
        └─────────────────────────┬───────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  5. Ghép subgraphs theo chiều dọc (TB)     │
        │     (createDagreVerticalGraph)              │
        └─────────────────────────┬───────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  6. Tính offset để giữ anchor              │
        └─────────────────────────┬───────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────┐
        │  7. Xử lý & đặt lại Sticky Notes           │
        └─────────────────────────┬───────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│           OUTPUT: { boundingBox, nodes: [{id, x, y}] }      │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. So sánh với Implementation Hiện Tại (Workflow Pilot)

| Khía cạnh              | n8n (Dagre)       | Workflow Pilot (BFS đơn giản) |
| ---------------------- | ----------------- | ----------------------------- |
| **Thuật toán**         | Sugiyama (4 bước) | BFS-based layer assignment    |
| **Thư viện**           | Dagre.js          | Custom implementation         |
| **Crossing Reduction** | ✅ Có              | ❌ Không                       |
| **Xử lý Subgraph**     | ✅ Tách & ghép     | ❌ Xử lý cùng lúc              |
| **Hỗ trợ AI Nodes**    | ✅ TB layout riêng | ❌ Chưa có                     |
| **Sticky Notes**       | ✅ Bao phủ tự động | ❌ Chưa có                     |

---

## 6. Đề Xuất Cải Tiến cho Workflow Pilot

### 6.1. Tích hợp Dagre.js
```bash
npm install @dagrejs/dagre
```

### 6.2. Thay thế thuật toán BFS hiện tại
```javascript
import dagre from '@dagrejs/dagre';

tidyUp() {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120 });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes
    this.nodes.forEach(node => {
        g.setNode(node.id, { width: 180, height: 80 });
    });

    // Add edges
    this.connections.forEach(conn => {
        g.setEdge(conn.sourceNodeId, conn.targetNodeId);
    });

    // Run layout
    dagre.layout(g);

    // Apply positions
    this.nodes.forEach(node => {
        const pos = g.node(node.id);
        node.x = pos.x - pos.width / 2;
        node.y = pos.y - pos.height / 2;
    });
}
```

### 6.3. Xử lý Subgraphs (tùy chọn nâng cao)
- Sử dụng `dagre.graphlib.alg.components()` để tách các nhóm nút không liên kết.
- Layout mỗi nhóm riêng, sau đó xếp chồng theo chiều dọc.

---

## 7. Kết Luận

n8n sử dụng một pipeline layout phức tạp dựa trên Dagre.js với nhiều giai đoạn xử lý đặc biệt cho AI nodes và sticky notes. Thuật toán Sugiyama đảm bảo kết quả bố cục đẹp với số đường giao nhau tối thiểu. Để cải thiện tính năng Tidy Up của Workflow Pilot, nên cân nhắc tích hợp Dagre.js thay vì triển khai thủ công.
