# API Endpoints Sử Dụng

Tài liệu này mô tả các API endpoint mà giao diện người dùng Chat Bot gọi đến.

## 1. Xác thực & Người dùng

### `POST /api/auth/google/verify`

- **Mô tả:** Gửi Google ID Token nhận được từ Google Sign-In về backend để xác thực và tạo/trả về thông tin phiên người dùng (bao gồm JWT token của ứng dụng).
- **Request Body:**
  ```json
  {
    "idToken": "string" // Google ID Token
  }
  ```
- **Response Body (Thành công):**
  ```json
  {
    "data": {
      "userId": "string",
      "token": "string", // JWT token của ứng dụng
      "fullName": "string",
      "email": "string"
      // ... các thông tin khác
    },
    "message": "string"
  }
  ```
- **Response Body (Thất bại):**
  ```json
  {
    "message": "string", // Mô tả lỗi
    "error": "string" // (Tùy chọn)
  }
  ```
- **Gọi từ:** `js/login/login.js` (hàm `handleGoogleVerifyToken`) thông qua `js/chat/api.js` (hàm `fetchWithAuth`).

## 2. Chat & Phiên

### `GET /api/ChatSessions/user/{userId}`

- **Mô tả:** Lấy danh sách các phiên chat đã có của một người dùng cụ thể.
- **Parameters:**
    - `userId` (path): ID của người dùng.
- **Response Body (Thành công):** Mảng các đối tượng phiên chat.
  ```json
  [
    {
      "id": "string",
      "userId": "string",
      "title": "string",
      "createdAt": "string (ISO 8601)",
      "lastUpdatedAt": "string (ISO 8601)",
      "conversationId": "string | null" // Dify conversation ID
      // ... các trường khác
    }
    // ...
  ]
  ```
- **Gọi từ:** `js/chat/session.js` (hàm `loadChatSessions`) thông qua `js/chat/api.js` (hàm `fetchWithAuth`).

### `GET /api/ChatMessages/session/{sessionId}`

- **Mô tả:** Lấy danh sách tin nhắn của một phiên chat cụ thể, hỗ trợ phân trang.
- **Parameters:**
    - `sessionId` (path): ID của phiên chat.
    - `beforeMessageId` (query, optional): Lấy các tin nhắn *trước* ID tin nhắn này (cho infinite scroll).
    - `limit` (query, optional): Số lượng tin nhắn tối đa trả về (mặc định có thể là 20 hoặc 50).
- **Response Body (Thành công):** Mảng các đối tượng tin nhắn.
  ```json
  [
    {
      "id": "string",
      "sessionId": "string",
      "userId": "string",
      "isUser": boolean,
      "content": "string",
      "timestamp": "string (ISO 8601)",
      "createdAt": "string (ISO 8601)"
      // ... các trường khác
    }
    // ...
  ]
  ```
- **Gọi từ:** `js/chat/session.js` (hàm `loadSessionMessages`, `loadOlderMessages`) thông qua `js/chat/api.js` (hàm `fetchWithAuth`).

### `POST /api/ChatSessions`

- **Mô tả:** Tạo một phiên chat mới cho người dùng hiện tại.
- **Request Body:** Có thể rỗng hoặc chứa thông tin ban đầu (phụ thuộc vào backend). Thường chỉ cần token trong header.
- **Response Body (Thành công):** Đối tượng phiên chat vừa được tạo.
  ```json
  {
    "id": "string",
    "userId": "string",
    "title": "string", // Thường là tiêu đề mặc định
    "createdAt": "string (ISO 8601)",
    "lastUpdatedAt": "string (ISO 8601)",
    "conversationId": null
    // ... các trường khác
  }
  ```
- **Gọi từ:** `js/chat/session.js` (hàm `startNewChat`) thông qua `js/chat/api.js` (hàm `fetchWithAuth`).

### `POST /api/ChatMessages`

- **Mô tả:** Lưu một tin nhắn mới (của người dùng hoặc AI) vào một phiên chat cụ thể.
- **Request Body:**
  ```json
  {
    "sessionId": "string",
    "userId": number, // Backend có thể yêu cầu number
    "isUser": boolean,
    "content": "string"
  }
  ```
- **Response Body (Thành công):** Thường chỉ trả về status 2xx (ví dụ: 201 Created hoặc 204 No Content) hoặc đối tượng tin nhắn vừa tạo. Giao diện hiện tại không xử lý response body.
- **Gọi từ:** `js/chat/chat.js` (hàm `handleSendMessage`) thông qua `js/chat/api.js` (hàm `fetchWithAuth`).

### `DELETE /api/ChatSessions/{sessionId}`

- **Mô tả:** Xóa một phiên chat và tất cả tin nhắn liên quan.
- **Parameters:**
    - `sessionId` (path): ID của phiên chat cần xóa.
- **Response Body (Thành công):** Thường chỉ trả về status 2xx (ví dụ: 204 No Content).
- **Gọi từ:** `js/chat/session.js` (hàm `deleteSession`) thông qua `js/chat/api.js` (hàm `fetchWithAuth`).

## 3. Dify API (AI)

### `POST https://trolyai.hub.edu.vn/v1/chat-messages`

- **Mô tả:** Gửi yêu cầu chat đến Dify và nhận phản hồi dưới dạng Server-Sent Events (SSE) để hiển thị streaming.
- **Headers:**
    - `Authorization: Bearer <DIFY_API_KEY>`
    - `Content-Type: application/json`
    - `Accept: text/event-stream`
- **Request Body:**
  ```json
  {
    "inputs": {}, // Có thể chứa các biến input cho Dify flow
    "query": "string", // Câu hỏi/tin nhắn của người dùng
    "response_mode": "streaming",
    "user": "string", // ID người dùng (duy nhất cho Dify)
    "conversation_id": "string | null" // ID cuộc trò chuyện Dify trước đó (nếu có)
  }
  ```
- **Response:** Dữ liệu Server-Sent Events (SSE). Mỗi event chứa một phần của phản hồi AI.
  ```
  event: message
  data: {"event": "agent_message", "conversation_id": "...", "message_id": "...", "created_at": ..., "answer": "...", "metadata": {...}}

  event: message_end
  data: {"event": "message_end", "conversation_id": "...", "message_id": "...", "metadata": {...}}
  ```
  *(Lưu ý: Cấu trúc `data` có thể khác nhau, giao diện hiện tại xử lý các trường như `chunk`, `answer`, `text`, `conversation_id`, `message_id`)*
- **Gọi từ:** `js/chat/chat.js` (hàm `handleSendMessage`) thông qua `js/chat/api.js` (hàm `handleSseStream`).
