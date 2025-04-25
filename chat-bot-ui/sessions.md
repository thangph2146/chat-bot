# Quản lý Phiên Chat (Frontend)

Tài liệu này mô tả chi tiết cách giao diện người dùng Chat Bot quản lý các phiên (cuộc trò chuyện) của người dùng, dựa trên mã nguồn JavaScript (`js/`) và các tài liệu liên quan (`api.md`, `config.md`, `actions.md`, `auth.md`).

## 1. Tổng Quan

Quản lý phiên chat là chức năng cốt lõi cho phép người dùng có nhiều cuộc trò chuyện riêng biệt với AI và xem lại lịch sử của chúng. Các chức năng chính được xử lý trong `js/chat/session.js`.

## 2. Cấu Trúc Dữ liệu Phiên (Client-Side)

Một mảng `chatSessions` trong `js/chat/session.js` lưu trữ trạng thái của tất cả các phiên đã tải về phía client. Mỗi đối tượng phiên trong mảng này thường có cấu trúc như sau (dựa trên hàm `loadChatSessions`):

```javascript
{
  id: "string",              // ID duy nhất của phiên (từ backend)
  userId: "string",          // ID của người dùng sở hữu phiên
  title: "string",           // Tiêu đề của phiên (có thể tự động tạo/cập nhật)
  createdAt: "string (ISO 8601)", // Thời gian tạo phiên (từ backend)
  lastUpdatedAt: "string (ISO 8601)",// Thời gian cập nhật cuối cùng (dùng để sắp xếp)
  messages: [
    // Mảng chứa các đối tượng tin nhắn đã tải cho phiên này
    {
      id: "string",          // ID tin nhắn (từ backend hoặc Dify)
      sessionId: "string",      // ID phiên chứa tin nhắn
      userId: "string",          // ID người dùng liên quan
      isUser: boolean,         // True nếu là tin nhắn người dùng, false nếu là AI
      content: "string",       // Nội dung tin nhắn
      timestamp: "string (ISO 8601)", // Thời gian tin nhắn (client-side hoặc backend)
      createdAt: "string (ISO 8601)" // Thời gian tạo (từ backend)
    },
    // ...
  ],
  conversationId: "string | null", // ID cuộc trò chuyện tương ứng trên Dify
  // Trạng thái cho infinite scroll
  isLoadingOlder: boolean,     // Cờ báo đang tải tin nhắn cũ hơn
  hasMoreOlder: boolean,       // Cờ báo còn tin nhắn cũ hơn để tải
  oldestMessageId: "string | null" // ID của tin nhắn cũ nhất đã tải
}
```

Một biến `currentSessionId` lưu ID của phiên đang được người dùng chọn và hiển thị trên màn hình chính.

## 3. Luồng Hoạt Động Chính

### 3.1. Tải Lịch sử Phiên Ban đầu

- **Trigger:** Khi trang `index.html` tải xong và người dùng đã được xác thực (`js/chat/main.js`).
- **Action:** Gọi hàm `loadChatSessions` (`js/chat/session.js`).
- **API Call:** `GET /api/ChatSessions/user/{userId}` (Xem `api.md`).
- **Logic:**
    1. Lấy `userId` từ thông tin người dùng đã lưu (`js/auth.js`).
    2. Gọi API để lấy danh sách các phiên.
    3. Chuyển đổi dữ liệu trả về thành cấu trúc client-side (như mô tả ở mục 2).
    4. Sắp xếp các phiên theo `lastUpdatedAt` (mới nhất lên đầu).
    5. Lưu kết quả vào mảng `chatSessions`.
    6. Nếu có phiên, đặt `currentSessionId` là ID của phiên đầu tiên (mới nhất).
    7. Cập nhật giao diện sidebar lịch sử (`js/chat/ui.js` -> `updateHistorySidebar`).
    8. **Nếu không có phiên nào:** Tự động gọi `startNewChat` để tạo phiên mới.
    9. **Sau khi tải xong:** `main.js` sẽ gọi `loadSessionMessages` cho `currentSessionId` (nếu có).

### 3.2. Bắt đầu Phiên Chat Mới

- **Trigger:** Người dùng nhấn nút "New Chat" (`js/chat/main.js`).
- **Action:** Gọi hàm `startNewChat` (`js/chat/session.js`).
- **API Call:** `POST /api/ChatSessions` (Xem `api.md`).
- **Logic:**
    1. Hiển thị trạng thái chờ trên UI.
    2. Gọi API để tạo phiên mới trên backend.
    3. Nhận về thông tin phiên mới tạo.
    4. Tạo đối tượng phiên mới theo cấu trúc client-side.
    5. Thêm phiên mới vào đầu mảng `chatSessions`.
    6. Đặt `currentSessionId` là ID của phiên mới.
    7. Xóa nội dung khu vực chat hiện tại.
    8. Gọi hàm hiển thị tin nhắn chào mừng động (nếu có, ví dụ: `showWelcomeMessage` từ `js/chat/chat.js`).
    9. Cập nhật sidebar lịch sử.

### 3.3. Chọn Một Phiên Từ Lịch sử

- **Trigger:** Người dùng nhấp vào một phiên trong sidebar lịch sử (`js/chat/ui.js` -> listener trong `updateHistorySidebar`).
- **Action:** Gọi hàm `handleSelectSession` (`js/chat/session.js`).
- **Logic:**
    1. Lấy `sessionId` từ phần tử được nhấp.
    2. Nếu `sessionId` khác với `currentSessionId`:
        - Đặt `currentSessionId` thành `sessionId` mới.
        - Cập nhật giao diện sidebar để làm nổi bật phiên được chọn.
        - Gọi `loadSessionMessages` để tải và hiển thị tin nhắn cho phiên mới này.

### 3.4. Tải Tin Nhắn Cho Phiên Được Chọn

- **Trigger:** Sau khi tải phiên ban đầu, chọn một phiên mới, hoặc cuộn lên đầu để tải thêm.
- **Action:** Gọi hàm `loadSessionMessages` hoặc `loadOlderMessages` (`js/chat/session.js`).
- **API Call:** `GET /api/ChatMessages/session/{sessionId}` hoặc `GET /api/ChatMessages/session/{sessionId}?beforeMessageId=...` (Xem `api.md`).
- **Logic (`loadSessionMessages`):**
    1. Lấy phiên hiện tại từ `chatSessions` dựa trên `currentSessionId`.
    2. Xóa nội dung khu vực chat hiện tại.
    3. Hiển thị trạng thái đang tải.
    4. Gọi API để lấy trang tin nhắn đầu tiên (hoặc tất cả nếu không phân trang).
    5. Render các tin nhắn nhận được vào khu vực chat (`js/chat/ui.js` -> `addMessageToChat`).
    6. Lưu các tin nhắn vào thuộc tính `messages` của đối tượng phiên trong `chatSessions`.
    7. Cập nhật trạng thái infinite scroll (`hasMoreOlder`, `oldestMessageId`).
    8. Thiết lập scroll listener để gọi `loadOlderMessages` khi người dùng cuộn lên đầu.
- **Logic (`loadOlderMessages` - Infinite Scroll):**
    1. Kiểm tra cờ `isLoadingOlder` và `hasMoreOlder` để tránh tải trùng lặp hoặc không cần thiết.
    2. Đặt `isLoadingOlder` thành `true`.
    3. Gọi API với tham số `beforeMessageId` (lấy từ `oldestMessageId` của phiên).
    4. Nếu có tin nhắn trả về:
        - Render các tin nhắn mới tải vào *đầu* khu vực chat.
        - Thêm các tin nhắn vào *đầu* mảng `messages` của phiên.
        - Cập nhật lại `oldestMessageId`.
        - Giữ nguyên vị trí cuộn tương đối.
    5. Nếu không có tin nhắn trả về, đặt `hasMoreOlder` thành `false`.
    6. Đặt `isLoadingOlder` thành `false`.

### 3.5. Thêm Tin Nhắn Mới Vào Phiên Hiện Tại

- **Trigger:** Sau khi người dùng gửi tin nhắn hoặc AI trả lời xong (`js/chat/chat.js` -> `handleSendMessage`).
- **Action:** Gọi hàm `addMessageToCurrentSession` (`js/chat/session.js`).
- **Logic:**
    1. Tìm phiên hiện tại trong `chatSessions`.
    2. Thêm đối tượng tin nhắn mới vào cuối mảng `messages` của phiên đó.
    3. Cập nhật `lastUpdatedAt` của phiên.
    4. Nếu là tin nhắn đầu tiên của người dùng, có thể cập nhật `title` của phiên (logic trong `updateCurrentSessionTitle`).
    5. Cập nhật lại sidebar lịch sử để phản ánh thời gian cập nhật mới nhất và có thể cả tiêu đề mới (`js/chat/ui.js` -> `updateHistorySidebar`).

### 3.6. Xóa Phiên Chat

- **Trigger:** Người dùng nhấn nút xóa trên một mục trong sidebar lịch sử (`js/chat/ui.js`), xác nhận qua dialog.
- **Action:** Gọi hàm `deleteSession` (`js/chat/session.js`).
- **API Call:** `DELETE /api/ChatSessions/{sessionId}` (Xem `api.md`).
- **Logic:**
    1. Gọi API để xóa phiên trên backend.
    2. Nếu thành công:
        - Xóa phiên khỏi mảng `chatSessions` phía client.
        - Nếu phiên bị xóa là phiên hiện tại (`currentSessionId`):
            - Chọn phiên tiếp theo (thường là phiên đầu tiên trong danh sách còn lại).
            - Nếu không còn phiên nào, gọi `startNewChat` để tạo phiên mới.
            - Tải tin nhắn cho phiên mới được chọn.
        - Cập nhật sidebar lịch sử.

## 4. Liên kết với Dify Conversation ID

- **Mục đích:** Để duy trì ngữ cảnh cuộc trò chuyện với Dify qua nhiều lượt hỏi đáp trong cùng một phiên Chat Bot.
- **Lưu trữ:** `conversation_id` nhận được từ Dify API được lưu trong thuộc tính `conversationId` của đối tượng phiên chat client-side (`js/chat/session.js`).
- **Sử dụng:** Khi gửi yêu cầu mới đến Dify (`js/chat/chat.js` -> `handleSendMessage`), `conversation_id` hiện tại của phiên được lấy ra và gửi kèm trong request body tới Dify API (`POST https://trolyai.hub.edu.vn/v1/chat-messages`).
- **Cập nhật:** Hàm `updateCurrentSessionConversationId` (`js/chat/session.js`) được gọi để cập nhật `conversationId` trong state nếu Dify trả về một ID mới hoặc khác.
