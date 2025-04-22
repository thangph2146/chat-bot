# Tài liệu Chatbot Tuyển Sinh HUB

## 1. Tổng quan

Chatbot này là một giao diện web cho phép người dùng tương tác với một trợ lý AI, chủ yếu tập trung vào các câu hỏi liên quan đến tuyển sinh của Trường Đại học Ngân hàng TP.HCM (HUB). Nó cung cấp các chức năng:

- Gửi và nhận tin nhắn với AI thông qua Server-Sent Events (SSE) để hiển thị phản hồi dạng streaming.
- Quản lý lịch sử các cuộc trò chuyện (tạo, xem, xóa).
- Hỗ trợ nhập liệu bằng giọng nói (tiếng Việt).
- Xác thực người dùng (thông qua `js/login.js`).
- Tải và quản lý lịch sử chat từ backend.

## 2. Cấu trúc tệp

Các tệp chính liên quan đến chức năng chatbot:

- `index.html`: Định nghĩa cấu trúc giao diện người dùng (HTML) và nhúng các tài nguyên CSS, JS.
- `script.js`: Chứa logic chính phía client, xử lý sự kiện người dùng, quản lý trạng thái, cập nhật UI và gọi API backend.
- `js/login.js`: (Không được cung cấp nhưng được tham chiếu) Chứa các hàm liên quan đến xác thực người dùng, lấy thông tin người dùng và xử lý đăng xuất. Hàm `getUserInfo()` trả về object lấy từ `localStorage` (key `apiUserInfo`) có cấu trúc:
  ```json
  {
      "success": true,
      "statusCode": 200,
      "message": "Đăng nhập thành công",
      "data": {
          "userId": 4, // ID người dùng
          "username": "...",
          "email": "...",
          "fullName": "...",
          "token": "eyJhbGciOi...", // Token xác thực
          "expiresIn": 86400
      }
  }
  ```
- `tailwind.config.js`: Cấu hình cho framework Tailwind CSS.
- `logo/logo.png`: Tệp logo hiển thị trên giao diện.
- `chat-bot.md`: Tài liệu này.

*(Lưu ý: Tệp `js/chat.js` dường như không còn được sử dụng cho các chức năng chính như gửi/lưu tin nhắn sau các cập nhật gần đây)*

## 3. Giao diện người dùng (`index.html`)

Giao diện được xây dựng bằng HTML và Tailwind CSS, bao gồm các thành phần chính:

- **Header:** Logo, tiêu đề, thông tin người dùng (`#userInfoDisplay`), nút Đăng xuất (`#logoutButton`), nút bật/tắt lịch sử, nút Xóa toàn bộ lịch sử (`#clearHistoryButton`), nút Chat mới (`#newChatButton`).
- **Main Content:**
    - **History Sidebar (`#chatHistorySidebar`):** Danh sách cuộc trò chuyện (`#historySessions`), nút Chat mới (`#newChatButtonSidebar`), nút đóng sidebar.
    - **Chat Area (`#chatContainerWrapper`):** Vùng hiển thị tin nhắn (`#chatContainer`), thông điệp chào mừng (`#welcomeMessage`), khu vực chứa tin nhắn động.
    - **Input Area:** Ô nhập liệu (`#messageInput`), nút Ghi âm (`#recordButton`), nút Gửi (`#sendButton`).
- **Footer:** Thông tin bản quyền.

**Thư viện/Styling:** Tailwind CSS, Highlight.js (tô sáng code), Custom CSS, Google Fonts (`Inter`).

## 4. Logic Client-Side (`script.js`)

`script.js` điều khiển hoạt động của chatbot phía client:

- **Khởi tạo (`DOMContentLoaded`):** Kiểm tra đăng nhập, hiển thị thông tin user, tải lịch sử chat, khởi tạo ghi âm, gắn event listeners.
- **Quản lý trạng thái:**
    - `chatSessions`: Mảng lưu các phiên chat. Cấu trúc mỗi session (dựa trên API response):
      ```json
      {
          "id": "session-guid",
          "userId": 4,
          "title": "Tiêu đề cuộc trò chuyện",
          "createdAt": "iso-datetime",
          "lastUpdatedAt": "iso-datetime", // Dùng để sắp xếp
          "messages": [ /* Mảng các tin nhắn, cấu trúc xem dưới */ ]
          // "conversationId": ... // Có thể được thêm/cập nhật bởi client
      }
      ```
    - `currentSessionId`: ID phiên chat đang hiển thị.
    - Các biến liên quan đến ghi âm (`recognition`, `isRecording`, etc.).
- **Quản lý Phiên chat (Session Management):**
    - `loadChatSessions`: Gọi API (`GET /api/ChatSessions`) để lấy danh sách phiên. Cập nhật UI sidebar và tải tin nhắn phiên mới nhất.
    - `loadSessionMessages`: Gọi API (`GET /api/ChatSessions/{sessionId}`) để lấy tin nhắn của phiên. Cập nhật `chatSessions` và hiển thị qua `loadSessionUI`.
    - `loadSessionUI`: Hiển thị tin nhắn từ `chatSessions` lên UI. Cập nhật `currentSessionId`.
    - `startNewChat`: Gọi API (`POST /api/ChatSessions`) để tạo phiên mới trên server, sử dụng `userId` lấy từ `getUserInfo().data.userId`. Cập nhật `chatSessions` và UI.
    - `deleteSession`: Gọi API (`DELETE /api/ChatSessions/{sessionId}`) để xóa một phiên chat và tất cả tin nhắn liên quan khỏi server.
    - `clearChatHistory`: Xóa lịch sử ở client (localStorage/sessionStorage), **không tương tác với server**. Có chức năng hoàn tác tạm thời.
    - `saveChatSessions`: Lưu `chatSessions` vào `localStorage`/`sessionStorage` (có thể dùng làm cache/fallback).
- **Xử lý Tin nhắn:**
    - `handleSendMessage`:
        - Lấy text, user info (`userId`, `token` từ `apiUserInfo.data`), session info (`currentSessionId`, `conversationId`).
        - Hiển thị tin nhắn user (`addMessageToChat`, lưu vào session client).
        - Tạo placeholder AI (`addMessageToChat`).
        - Gọi API `POST /api/ChatMessages/v1/chat` (streaming) với `Authorization`, `query`, `conversation_id`, `user`.
        - Xử lý stream SSE: Parse JSON, nối `answer`, cập nhật UI placeholder, lấy `conversation_id` cuối.
        - Lưu tin nhắn AI hoàn chỉnh và `conversationId` vào `chatSessions` (client-side) khi stream kết thúc.
        - Xử lý lỗi.
    - `addMessageToChat`: Thêm tin nhắn vào UI. Hỗ trợ streaming placeholder. Sử dụng `content`, `isUser`, `timestamp` từ object message. Trả về element nội dung.
    - `showWelcomeMessage`: Hiển thị lời chào (hiện đang gọi API riêng, cần chuẩn hóa).
- **Nhận dạng giọng nói:** Các hàm `initSpeechRecognition`, `startRecording`, `stopRecording`, etc.
- **Cập nhật UI & Tiện ích:** `updateHistorySidebar`, `showLoading`, `showNotification`, `formatTime`, `renderMarkdown`, `highlightCodeBlocks`, `isLocalStorageAvailable`, `handleNoLocalStorage`.
- **Xác thực:** Phụ thuộc vào `js/login.js` (`checkAuthentication`, `getUserInfo`, `handleUserLogout`).

## 5. Tương tác API

Mô tả các API endpoints chính được sử dụng.

**API Base URL (Chính):** `http://172.20.10.44:8055`

---

**1. Lấy danh sách các phiên chat:**

-   **Method:** `GET`
-   **Endpoint:** `/api/ChatSessions`
-   **Mục đích:** Tải danh sách các cuộc trò chuyện của người dùng.
-   **Authentication:** Không gửi trong code hiện tại (`loadChatSessions`).
-   **Response (Success - ví dụ):**
    ```json
    {
        "sessions": [
            {
                "id": "302b4511-...",
                "userId": 4,
                "title": "Cuộc trò chuyện mới",
                "createdAt": "2025-04-22T...",
                "lastUpdatedAt": "2025-04-22T...",
                "messages": [] // Mảng messages có thể có hoặc rỗng
            },
            // ... other sessions
        ],
        "totalCount": 2,
        "status": "success",
        "statusCode": 200,
        "message": "Lấy danh sách phiên chat thành công"
    }
    ```
    *(Lưu ý: Client hiện tại chỉ sử dụng mảng `sessions`, bỏ qua `messages` trong response này và fetch lại sau)*
-   **Sử dụng:** `loadChatSessions()`.

---

**2. Lấy chi tiết một phiên chat (bao gồm tin nhắn):**

-   **Method:** `GET`
-   **Endpoint:** `/api/ChatSessions/{sessionId}`
-   **Mục đích:** Tải thông tin và tin nhắn của một phiên cụ thể.
-   **Authentication:** Không gửi trong code hiện tại (`loadSessionMessages`).
-   **Response (Success - ví dụ):**
    ```json
    {
        "id": "302b4511-2905-43f4-be89-e9bd6a40f5ea", // ID của session
        "userId": 4, // ID của người dùng sở hữu
        "title": "Cuộc trò chuyện mới", // Tiêu đề session
        "createdAt": "2025-04-22T09:20:26.3913875", // Thời gian tạo
        "lastUpdatedAt": "2025-04-22T09:20:26.391389", // Thời gian cập nhật cuối
        "messages": [ // Mảng chứa các tin nhắn của session
            // {
            //     "id": 10,
            //     "sessionId": "...",
            //     "userId": null,
            //     "senderName": "Người dùng",
            //     "isUser": true,
            //     "content": "hi",
            //     "timestamp": "2025-04-22T..."
            // }, ...
        ]
    }
    ```
-   **Sử dụng:** `loadSessionMessages()`.

---

**3. Tạo phiên chat mới:**

-   **Method:** `POST`
-   **Endpoint:** `/api/ChatSessions`
-   **Mục đích:** Tạo bản ghi phiên chat mới trên server.
-   **Authentication:** Không gửi trong code hiện tại (`startNewChat`), nên yêu cầu để liên kết user.
-   **Request Body:**
    ```json
    {
        "userId": 4, // Lấy từ apiUserInfo.data.userId
        "title": "Cuộc trò chuyện mới"
    }
    ```
-   **Response (Success - ví dụ):**
    ```json
    {
        "id": "11d5235a-a1df-4b07-a2e0-7a1da49a50c6", // ID session mới
        "userId": 4,
        "title": "Cuộc trò chuyện mới",
        "createdAt": "2025-04-22T09:35:01.2682925Z",
        "lastUpdatedAt": "2025-04-22T09:35:01.268294Z",
        "messages": [] // Session mới chưa có message
        // "conversationId" có thể null hoặc không có ban đầu
    }
    ```
-   **Sử dụng:** `startNewChat()`.

---

**4. Xóa phiên chat:**

-   **Method:** `DELETE`
-   **Endpoint:** `/api/ChatSessions/{sessionId}`
-   **Mục đích:** Xóa một phiên chat và tất cả tin nhắn liên quan khỏi server.
-   **Authentication:** `Authorization: Bearer {token}` (Bắt buộc, lấy token từ `getUserInfo().data.token`).
-   **Response (Success):** Status `200 OK` hoặc `204 No Content`.
-   **Sử dụng:** `deleteSession()`.

---

**5. Gửi tin nhắn và nhận phản hồi AI (Streaming):**

-   **Method:** `POST`
-   **Endpoint:** `/api/ChatMessages/v1/chat`
-   **Mục đích:** Gửi tin nhắn người dùng, nhận phản hồi AI dạng stream.
-   **Authentication:** `Authorization: Bearer {token}` (Bắt buộc, lấy token từ `getUserInfo().data.token`).
-   **Request Body:**
    ```json
    {
        "query": "Nội dung tin nhắn người dùng",
        "conversation_id": "current_conv_id" | null, // Luôn gửi
        "response_mode": "streaming",
        "inputs": {},
        "user": "string_user_id" // ID người dùng dạng string, từ getUserInfo().data.userId
    }
    ```
-   **Response:** `Content-Type: text/event-stream`. Dữ liệu dạng Server-Sent Events (SSE) chứa các chunk JSON.
-   **Sử dụng trong:** `script.js` -> `handleSendMessage()` (gọi trực tiếp bằng `fetch`).

---

**6. Lưu tin nhắn vào lịch sử (Endpoint riêng - Có thể đã lỗi thời):**

-   **Method:** `POST`
-   **Endpoint:** `/api/ChatMessages`
-   **Mục đích:** Lưu một tin nhắn vào DB (có thể không còn cần thiết).
-   **Authentication:** `Authorization: Bearer {token}` (Lấy từ `getUserInfo().data.token`).
-   **Request Body:** `{ "sessionId": ..., "userId": ..., "isUser": ..., "content": "..." }` (Lấy `userId` từ `getUserInfo().data.userId`).
-   **Sử dụng trong:** `js/chat.js` -> `saveMessageToSession()` (**Hiện không được gọi bởi `handleSendMessage` để lưu tin nhắn bot**).

---

**7. Lấy tin nhắn chào mừng (API Riêng/Tạm thời):**

-   **Method:** `POST`
-   **Endpoint:** `http://trolyai.hub.edu.vn/v1/chat-messages`
-   **Mục đích:** Lấy tin nhắn chào mừng ban đầu.
-   **Authentication:** `Authorization: Bearer {apiKey}` (Sử dụng API Key cố định).
-   **Request Body:** Query đặc biệt `###__get_welcome_message__###`.
-   **Response (Streaming):** SSE.
-   **Sử dụng trong:** `script.js` -> `callChatbotAPI_forWelcomeOnly()`.

---

**Lưu ý chung:**
- Cần xử lý lỗi (token hết hạn, lỗi mạng, lỗi API).
- Cấu trúc Response/SSE có thể thay đổi.

## 6. Luồng hoạt động chính (Ví dụ)

**Gửi tin nhắn:**

1.  Người dùng nhập tin nhắn, nhấn Gửi/Enter.
2.  `script.js` -> `handleSendMessage()`:
    - Lấy text, user info (`userId`, `token` từ `apiUserInfo.data`), session info (`currentSessionId`, `conversationId`).
    - Hiển thị tin nhắn user lên UI.
    - Tạo placeholder AI.
    - Hiển thị loading.
    - Gọi API `POST /api/ChatMessages/v1/chat` (streaming).
    - Xử lý stream SSE: Cập nhật UI, lấy `conversation_id`.
    - Lưu kết quả vào `chatSessions` (client-side).
    - Ẩn loading.
    - Xử lý lỗi.

**Bắt đầu Chat mới:**

1.  Nhấn nút "Chat mới".
2.  `script.js` -> `startNewChat()`:
    - Lấy `userId` từ `getUserInfo().data.userId`.
    - Gọi API `POST /api/ChatSessions`.
    - Xử lý response, cập nhật `chatSessions`, `currentSessionId`, UI.

## 7. Phụ thuộc

- **JavaScript:** `js/login.js` (Xác thực).
- **CSS/UI:** Tailwind CSS, Highlight.js.
- **API Backend:** Endpoint tại `http://172.20.10.44:8055` và `http://trolyai.hub.edu.vn`.

## 8. Lưu ý và Điểm cần cải thiện

- **URL API:** Hardcoded URL. Nên cấu hình. Endpoint xóa session (`DELETE /api/ChatMessages/v1/chat`) **rất có thể là sai, cần xác minh lại với backend.**
- **Xử lý lỗi:** Cần cải thiện.
- **API Welcome:** Cần chuẩn hóa.
- **Lưu trữ:**
    - `saveChatSessions` (localStorage) chỉ nên dùng làm cache/fallback.
    - Cần làm rõ vai trò của `/api/ChatMessages` (POST) có còn cần thiết.
- **Xóa Lịch sử:** Chỉ xóa ở client. Cần xem xét xóa phía server.
- **Bảo mật:** Xử lý token an toàn.
- **SSE Handling:** Đảm bảo xử lý đúng các loại event và lỗi stream.
- **ID Người dùng:** Đã làm rõ việc lấy ID từ `apiUserInfo.data.userId`. Code JS cần đảm bảo tính nhất quán này.
