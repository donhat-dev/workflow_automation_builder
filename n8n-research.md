# Nghiên cứu & Phân tích Cơ chế hoạt động của n8n

## 1. Tổng quan Kiến trúc Cốt lõi
n8n hoạt động dựa trên kiến trúc đồ thị **Node-Link**, trong đó các quy trình công việc (workflows) được định nghĩa dưới dạng các đối tượng JSON chứa `nodes` (nút) và `connections` (kết nối). Không giống như việc thực thi từ trên xuống dưới đơn giản, n8n sử dụng một **Engine thực thi dựa trên Stack (Stack-Based Execution Engine)** tinh vi, có khả năng xử lý các luồng điều khiển phức tạp, phân nhánh và các vòng lặp có trạng thái.

### Các Thành phần Chính
- **WorkflowExecute** (`packages/core/src/execution-engine/workflow-execute.ts`): Bộ điều phối chính.
- **Node Execution Stack**: Một hàng đợi các nút đang chờ được thực thi.
- **Node Types**: Các triển khai cụ thể (ví dụ: `If`, `SplitInBatches`) quy định hành vi lúc runtime.

---

## 2. Logic của Engine Thực thi

### 2.1. Stack Thực thi (Execution Stack)
Thay vì sử dụng sắp xếp topo đơn giản (vốn không thể xử lý các chu trình/vòng lặp), n8n sử dụng một stack các tác vụ được cập nhật liên tục.

1.  **Khởi tạo**: Stack được khởi tạo với Nút Bắt đầu (Start Node) hoặc Nút Kích hoạt (Trigger).
2.  **Vòng lặp Thực thi**:
    ```typescript
    while (nodeExecutionStack.length !== 0) {
        // 1. Lấy nút tiếp theo ra khỏi stack
        const executionData = nodeExecutionStack.shift();
        
        // 2. Thực thi logic của Nút
        const results = await executeNode(workflow, executionData.node, ...);
        
        // 3. Xử lý Kết quả & Lên lịch cho các nút con
        for (const outputData of results) {
            // Tìm các nút con được kết nối
            const children = workflow.getChildNodes(executionData.node);
            for (const child of children) {
                // Thêm vào stack nếu đã sẵn sàng (tất cả đầu vào đã hiện diện)
                addNodeToBeExecuted(child, outputData);
            }
        }
    }
    ```

### 2.2. Chờ dữ liệu đầu vào (Waiting for Inputs)
Trước khi một nút được thêm vào stack thực thi, engine sẽ kiểm tra xem tất cả các đầu vào bắt buộc đã hiện diện hay chưa (`prepareWaitingToExecution`).
- Nếu một nút có 2 đầu vào (ví dụ: nút Merge), nó sẽ đợi cho đến khi dữ liệu đến ở cả hai đầu vào trước khi chạy.
- **Ngoại lệ**: Các đầu vào "Trigger" hoặc đầu vào tùy chọn có thể hành xử khác nhau dựa trên cấu hình.

---

## 3. Cơ chế Luồng Điều khiển (Control Flow)

### 3.1. Phân nhánh (If / Switch)
Việc phân nhánh được xử lý hoàn toàn thông qua các **Đầu ra (Outputs)**.
- Một lần thực thi nút trả về một mảng của các mảng: `INodeExecutionData[][]`.
- **Cấu trúc**: `[ [Các mục ở Đầu ra 0], [Các mục ở Đầu ra 1], ... ]`
- **Logic**:
    - Nút `If` đánh giá các điều kiện cho từng mục đầu vào.
    - Nếu `đúng (true)`, mục đó được đẩy vào mảng `Đầu ra 0`.
    - Nếu `sai (false)`, mục đó được đẩy vào mảng `Đầu ra 1`.
- **Hiệu ứng thực thi**:
    - Nếu một mảng đầu ra **trống** (ví dụ: tất cả các mục đều sai), engine sẽ **không lên lịch** cho bất kỳ nút nào được kết nối với đầu ra đó (hoặc lên lịch với dữ liệu trống, về cơ bản là dừng nhánh đó).

### 3.2. Vòng lặp (SplitInBatches)
n8n xử lý các chu trình (vòng lặp) không phải bằng logic engine đặc biệt, mà bằng các **Nút có Trạng thái (Stateful Nodes)**. Nút `SplitInBatches` là cách tiêu chuẩn để lặp lại.

#### Cơ chế:
1.  **Lưu trữ Trạng thái**: Nút sử dụng `this.getContext('node')` để duy trì trạng thái *giữa các lần chạy* của cùng một lần thực thi.
    -   `currentRunIndex`: Theo dõi số lần vòng lặp đã chạy.
    -   `items`: Lưu trữ danh sách đầy đủ các mục đang chờ xử lý.
    
2.  **Logic Lặp**:
    -   **Lần chạy đầu tiên**:
        -   Lưu trữ tất cả các mục đầu vào vào ngữ cảnh (context).
        -   Cắt lấy lô (batch) đầu tiên.
        -   Trả về dữ liệu cho **Đầu ra Vòng lặp (Loop Output)** (index 1).
    -   **Các lần chạy tiếp theo** (được kích hoạt khi vòng lặp hoàn thành và kết nối ngược lại Đầu vào):
        -   Lấy các mục từ ngữ cảnh.
        -   Cắt lấy lô tiếp theo.
        -   Trả về dữ liệu cho **Đầu ra Vòng lặp**.
    -   **Hoàn tất**:
        -   Khi không còn mục nào.
        -   Trả về dữ liệu cho **Đầu ra Hoàn tất (Done Output)** (index 0).
        -   Trả về mảng rỗng `[]` cho Đầu ra Vòng lặp.

3.  **Engine xử lý Chu trình**:
    -   Đồ thị về mặt vật lý chứa một chu trình (Nút Cuối -> SplitInBatches).
    -   Engine chỉ đơn giản thực thi Nút Cuối, thấy một kết nối đến SplitInBatches, và lên lịch cho SplitInBatches chạy *lần nữa*.
    -   Vòng lặp chỉ bị phá vỡ khi SplitInBatches trả về **dữ liệu trống** cho Đầu ra Vòng lặp.

### 3.3. Phát hiện Chu trình (Cycle Detection)
n8n có một tiện ích `handleCycles` (`partial-execution-utils`).
- Nó phát hiện các vòng lặp vô tận nơi không có "Nút Vòng lặp" nào phá vỡ chu trình để tránh làm treo hệ thống.
- Nó thường kiểm tra các dấu hiệu thực thi lặp lại mà không có sự tiến triển về trạng thái.

---

## 4. Bố cục Dữ liệu & Ngữ cảnh

### 4.1. Cấu trúc Dữ liệu Nút
```typescript
interface INodeExecutionData {
  json: { [key: string]: any };  // Nội dung dữ liệu thực tế
  binary?: { ... };              // Các tệp tin nhị phân
  pairedItem?: {                 // Theo dõi nguồn gốc (lineage)
    item: number;                // Chỉ số của mục trong nút cha
  }
}
```

### 4.2. Paired Item (Lineage)
Điều này rất quan trọng cho các luồng phức tạp. Nó cho phép n8n truy vết một mục ngược lại nguồn gốc của nó, cho phép các biểu thức như `$('NodeName').item.json.field` hoạt động chính xác ngay cả bên trong vòng lặp hoặc sau khi hợp nhất (merge).

---

## 5. Áp dụng cho Bộ xây dựng Workflow trong Odoo

Để đạt được khả năng tương đương với n8n trong module Odoo của chúng ta:

1.  **Engine Thực thi**:
    -   Chuyển từ Sắp xếp Topo sang **Bộ chạy Queue/Stack (Queue/Stack Runner)**.
    -   Triển khai logic "Chờ đầu vào" cho các nút Merge/Join.

2.  **Các nút Điều khiển**:
    -   Triển khai `If` / `Switch` bằng cách trả về nhiều danh sách đầu ra.
    -   **Quan trọng**: Triển khai cơ chế `Context` cho các nút.
        -   Trong Odoo, đây có thể là một `TransientModel` hoặc một Python Dictionary được truyền cụ thể vào trạng thái của bộ chạy.

3.  **Vòng lặp**:
    -   Tạo một nút tương đương với `SplitInBatches`.
    -   Yêu cầu Runner hỗ trợ việc "thăm lại" một nút (tăng `run_index`).

4.  **Thể hiện trên UI**:
    -   Cần thể hiện các "Cạnh ngược" (Back-Edges - các đường chạy từ phải sang trái) một cách khác biệt cho các vòng lặp.
    -   Hỗ trợ các socket đa đầu ra (Hoàn tất/Vòng lặp, Đúng/Sai).
