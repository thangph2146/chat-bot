# Quản lý Tin nhắn Chat (Frontend)

Tài liệu này mô tả chi tiết cách giao diện người dùng Chat Bot xử lý các tin nhắn trong một cuộc trò chuyện, bao gồm việc gửi, nhận, hiển thị và lưu trữ. Thông tin được tổng hợp từ mã nguồn JavaScript (`js/`) và các tài liệu liên quan (`api.md`, `config.md`, `actions.md`, `auth.md`, `sessions.md`).

## 1. Cấu Trúc Dữ liệu Tin nhắn (Client-Side)

Như mô tả trong `sessions.md`, các tin nhắn được lưu trong mảng `messages` của mỗi đối tượng phiên chat (`js/chat/session.js`). Mỗi đối tượng tin nhắn thường có cấu trúc:

```javascript
{
  id: "string",          // ID tin nhắn (từ backend hoặc Dify, hoặc tạm thời)
  sessionId: "string",      // ID phiên chứa tin nhắn (được thêm khi lưu/tải)
  userId: "string",          // ID người dùng liên quan
  isUser: boolean,         // True nếu là tin nhắn người dùng, false nếu là AI
  content: "string",       // Nội dung tin nhắn
  timestamp: "string (ISO 8601)", // Thời gian tin nhắn (client-side hoặc backend)
  createdAt: "string (ISO 8601)", // Thời gian tạo (thường từ backend khi tải)
  isStreaming: boolean    // Cờ (không lưu trữ, dùng khi render) báo hiệu AI đang trả lời
}
```

## 2. Hiển thị Tin nhắn trên Giao diện

- **Chức năng chính:** Render đối tượng dữ liệu tin nhắn thành phần tử HTML trong khu vực chat.
- **File:** `js/chat/ui.js` (hàm `addMessageToChat`), `js/chat/utils.js` (hàm `renderMessageElement`).
- **Logic `renderMessageElement`:**
    - Tạo cấu trúc HTML cơ bản cho một hàng tin nhắn (`message-row`).
    - Phân biệt tin nhắn người dùng (`isUser: true`) và AI (`isUser: false`) để:
        - Căn chỉnh (phải/trái).
        - Áp dụng style CSS khác nhau cho bong bóng chat (`message-bubble`).
        - Hiển thị avatar (chữ cái đầu cho người dùng, logo cho AI).
        - Hiển thị tên người gửi (chỉ cho AI).
    - Render nội dung (`content`):
        - **Người dùng:** Hiển thị text thuần (`textContent`).
        - **AI (Hoàn thành):** Sử dụng `renderMarkdown` (`js/chat/utils.js`) để chuyển đổi Markdown sang HTML (đã được sanitize bởi `DOMPurify` nếu có), sau đó nhúng vào `.markdown-content`.
        - **AI (Đang streaming):** Hiển thị hiệu ứng dấu chấm lửng (`.ellipsis-animation`) và một `div.markdown-content` trống ban đầu để `handleSseStream` cập nhật.
    - Hiển thị timestamp đã định dạng (`formatTime` từ `js/chat/utils.js`).
- **Logic `addMessageToChat`:**
    - Gọi `renderMessageElement` để tạo phần tử DOM.
    - Thêm phần tử vào cuối khu vực chat (`chatContainerElement`).
    - Tự động cuộn xuống dưới cùng.
    - Nếu là tin nhắn AI đã hoàn thành, gọi `highlightCodeBlocks` (`js/chat/utils.js`) để tô sáng cú pháp code (sử dụng `Highlight.js` nếu có).
    - Trả về phần tử `div.markdown-content` nếu là tin nhắn AI đang streaming để `handleSseStream` có thể cập nhật trực tiếp `innerHTML`.

## 3. Gửi Tin nhắn của Người dùng

- **Trigger:** Người dùng nhập tin nhắn và nhấn nút Gửi hoặc Enter (`js/chat/main.js`).
- **Action:** Gọi hàm `handleSendMessage` (`js/chat/chat.js`).
- **Logic:**
    1.  Lấy nội dung từ ô nhập liệu.
    2.  Lấy thông tin cần thiết (userId, token, sessionId, Dify key, Dify conversationId).
    3.  **Lưu tin nhắn User vào Backend:**
        - Tạo payload: `{ sessionId, userId, isUser: true, content }`.
        - Gọi `fetchWithAuth` (`js/chat/api.js`) để gửi yêu cầu `POST /api/ChatMessages` (Xem `api.md`). Backend chịu trách nhiệm lưu trữ.
    4.  **Hiển thị tin nhắn User trên UI:**
        - Gọi `addMessageToChat` (`js/chat/ui.js`) để ngay lập tức hiển thị tin nhắn người dùng.
    5.  **Thêm tin nhắn User vào State:**
        - Gọi `addMessageToCurrentSession` (`js/chat/session.js`) để cập nhật mảng `messages` của phiên hiện tại.
    6.  Xóa nội dung ô nhập liệu.
    7.  **Kích hoạt yêu cầu AI:** Chuẩn bị và gọi `handleSseStream` để gửi yêu cầu đến Dify.

## 4. Nhận và Xử lý Phản hồi AI (Streaming)

- **Chức năng chính:** Nhận dữ liệu SSE từ Dify và cập nhật UI theo thời gian thực.
- **File:** `js/chat/api.js` (hàm `handleSseStream`).
- **Logic:**
    1.  **Hiển thị Placeholder:** Trước khi gọi `handleSseStream`, hàm `handleSendMessage` (`js/chat/chat.js`) đã gọi `addMessageToChat` với `isStreaming: true` để tạo một bong bóng chat AI trống với hiệu ứng dấu chấm lửng.
    2.  **Thực hiện Fetch SSE:** Gọi `fetch` đến `DIFY_CHAT_API_ENDPOINT` với header `Accept: text/event-stream` và `Authorization: Bearer <DIFY_API_KEY>`.
    3.  **Đọc Stream:** Đọc dữ liệu từ `response.body` bằng `ReadableStreamDefaultReader`.
    4.  **Parse Events:** Tách các event SSE (dựa trên `\n\n`).
    5.  **Xử lý `data:`:** Lấy dữ liệu JSON từ `data: {...}`.
    6.  **Trích xuất Nội dung:** Lấy nội dung text từ các trường như `chunk`, `answer`, hoặc `text` trong JSON.
    7.  **Cập nhật UI:** Nối nội dung mới vào biến `fullMessage`. Cập nhật `innerHTML` của phần tử `div.markdown-content` (được trả về từ `addMessageToChat` trước đó) bằng kết quả của `renderMarkdown(fullMessage)`. Gọi `highlightCodeBlocks` sau mỗi lần cập nhật để tô sáng code mới.
    8.  **Cuộn:** Đảm bảo khu vực chat cuộn xuống dưới cùng sau mỗi cập nhật.
    9.  **Lấy Metadata:** Lưu lại `conversation_id` và `message_id` mới nhất từ Dify.
    10. **Kết thúc Stream:**
        - Xóa hiệu ứng dấu chấm lửng.
        - Nếu `fullMessage` rỗng, hiển thị thông báo "(Không có nội dung phản hồi)".
        - Gọi callback `onComplete` (được truyền từ `handleSendMessage`).
- **Callback `onComplete` (trong `handleSendMessage`):**
    1.  **Lưu tin nhắn AI vào Backend:**
        - Nếu `fullMessage` không rỗng, tạo payload: `{ sessionId, userId, isUser: false, content: fullMessage }`.
        - Gọi `fetchWithAuth` để gửi yêu cầu `POST /api/ChatMessages`.
    2.  **Thêm tin nhắn AI vào State:**
        - Nếu `fullMessage` không rỗng, gọi `addMessageToCurrentSession` với dữ liệu tin nhắn AI (bao gồm `id` từ Dify).
    3.  **Cập nhật Dify Conversation ID:** Nếu `conversationId` từ Dify khác với ID hiện tại của phiên, gọi `updateCurrentSessionConversationId` (`js/chat/session.js`).

## 5. Tải Lịch sử Tin nhắn

- **Chức năng chính:** Lấy các tin nhắn đã lưu từ backend cho một phiên.
- **File:** `js/chat/session.js` (hàm `loadSessionMessages`, `loadOlderMessages`).
- **API Call:** `GET /api/ChatMessages/session/{sessionId}` (có thể kèm `?beforeMessageId=...`).
- **Logic:**
    1.  Gọi API bằng `fetchWithAuth`.
    2.  Nhận về mảng các đối tượng tin nhắn từ backend.
    3.  Sử dụng `addMessageToChat` để render từng tin nhắn lên UI.
    4.  Lưu các tin nhắn vào mảng `messages` của phiên trong state.
    5.  Quản lý trạng thái cho infinite scroll (`hasMoreOlder`, `oldestMessageId`).

## 6. Các Vấn đề Liên quan

- **Bảo mật:** Việc render nội dung từ AI (Markdown) cần được sanitize cẩn thận bằng `DOMPurify` để tránh tấn công XSS (Xem `auth.md`).
- **Định dạng:** Sử dụng `MarkedJS` để hiển thị Markdown và `Highlight.js` để tô sáng code. 