# Trợ lý AI HUB - Ứng dụng Chatbot

## 1. Mô tả Tổng quan

Dự án này cung cấp giao diện người dùng (frontend) và logic xử lý phía client cho **Ứng dụng Trợ lý AI HUB**. Chức năng chính bao gồm:

*   **Xác thực Người dùng:** Cho phép người dùng đăng nhập an toàn bằng email và mật khẩu để truy cập vào hệ thống (chi tiết trong các mục dưới).
*   **Tương tác Chatbot:** Cung cấp giao diện để người dùng gửi tin nhắn và nhận phản hồi từ Trợ lý AI, mô phỏng một cuộc hội thoại tự nhiên và hữu ích.
*   **Quản lý Hội thoại:** Cho phép người dùng xem lại, quản lý và có thể chuyển đổi giữa các phiên trò chuyện khác nhau.

## 2. Tính năng Chính

### 2.1. Xác thực (Đăng nhập)

*   **Giao diện Đăng nhập:** Form rõ ràng (`login.html`) với ô nhập email, mật khẩu.
*   **Validate Phía Client:** Kiểm tra rỗng, chuẩn hóa đầu vào.
*   **Xử lý Gửi Yêu cầu:** Gọi API Backend (`AUTH_LOGIN_ENDPOINT`), hiển thị trạng thái chờ.
*   **Xử lý Kết quả Đăng nhập:**
    *   **Thành công:** Lưu token/userId vào `localStorage`, chuyển hướng đến trang chat chính (`index.html`).
    *   **Thất bại:** Hiển thị lỗi, xóa mật khẩu, focus lại email, rung lắc form.
*   **Quản lý Trạng thái Xác thực:** Lưu trữ phiên đăng nhập, kiểm tra xác thực tự động trên các trang được bảo vệ.

### 2.2. Giao diện và Tương tác Chat (Trên `index.html`)

*   **Khu vực Hiển thị Tin nhắn:**
    *   Vùng chứa cuộn (`#messageList` hoặc tương tự) hiển thị danh sách tin nhắn.
    *   **Phân biệt Tin nhắn:** Tin nhắn người dùng và bot được phân biệt rõ ràng qua giao diện (ví dụ: màu nền khác nhau, căn lề trái/phải, hiển thị avatar mặc định hoặc của người dùng/bot).
    *   **Hiển thị Dấu thời gian:** (Tùy chọn) Hiển thị thời gian gửi cho mỗi tin nhắn.
*   **Ô Nhập Tin nhắn:**
    *   Trường nhập liệu đa dòng (`<textarea>`) `#messageInput` cho phép nhập tin nhắn dài, có thể tự động điều chỉnh chiều cao.
    *   Nút gửi `#sendButton` rõ ràng, có thể kèm icon.
    *   Hỗ trợ gửi bằng phím Enter (có thể cấu hình Shift+Enter để xuống dòng).
*   **Phản hồi Trạng thái Tương tác:**
    *   **Chỉ báo đang nhập:** Khi người dùng gửi tin nhắn và đang chờ phản hồi, hiển thị một chỉ báo trực quan (ví dụ: "Bot đang soạn..." hoặc hoạt ảnh dấu chấm lửng) gần ô nhập hoặc cuối danh sách tin nhắn.
    *   **Vô hiệu hóa Input/Button:** Trong khi chờ phản hồi từ bot, ô nhập và nút gửi có thể bị vô hiệu hóa để tránh gửi nhiều tin nhắn liên tiếp.
*   **Định dạng Tin nhắn (Phản hồi từ Bot):**
    *   Hỗ trợ hiển thị các định dạng Markdown cơ bản được trả về từ bot, ví dụ:
        *   **In đậm** (`**text**`)
        *   *In nghiêng* (`*text*` hoặc `_text_`)
        *   `Code nội tuyến` (`` `code` ``)
        *   Khối mã (```python ... ```)
        *   Danh sách (có thứ tự và không có thứ tự).
        *   Liên kết (`[text](url)`).
*   **Quản lý Cuộc hội thoại (Sidebar - Tùy chọn):**
    *   Hiển thị danh sách các cuộc hội thoại trước đó (có thể là tiêu đề tóm tắt).
    *   Nút để tạo một cuộc trò chuyện mới.
    *   Khả năng chọn để chuyển đổi giữa các cuộc hội thoại.
    *   (Nâng cao) Tùy chọn đổi tên hoặc xóa cuộc hội thoại.

## 3. Luồng Hoạt động Kỹ thuật Chi tiết

### 3.1. Luồng Đăng nhập (Xem Mục 5 để biết chi tiết API)

1.  **Tải Trang (`login.html`):** Hiển thị form.
2.  **Khởi tạo Script (`js/login/login-page.js`):** Lấy elements, gắn listener `submit`.
3.  **Người dùng Gửi Form:** Nhập thông tin, nhấn Đăng nhập.
4.  **Xử lý Submit (`js/login/login-page.js`):** Validate, hiển thị chờ, gọi `handleLogin`.
5.  **Gửi Yêu cầu API (`js/login/login.js`):** Gọi `fetchWithAuth` đến `AUTH_LOGIN_ENDPOINT`.
6.  **Xử lý Phản hồi API (`js/login/login.js`):**
    *   Thành công: Kiểm tra dữ liệu, lưu vào `localStorage` (`USER_DATA_KEY`), trả về `success: true`.
    *   Thất bại: Xóa `localStorage`, trả về `success: false` với message.
7.  **Cập nhật UI Cuối cùng (`js/login/login-page.js`):**
    *   Thành công: Chuyển hướng đến `index.html`.
    *   Thất bại: Hiển thị lỗi, khôi phục form.

### 3.2. Luồng Chat

1.  **Tải Trang Chat (`index.html`):**
    *   **Kiểm tra Xác thực (Ưu tiên cao nhất):** Ngay khi script chính (`main.js`) chạy, nó gọi `checkAuthentication()` từ `auth.js`. Nếu hàm này trả về `null` (do không có dữ liệu hoặc chuyển hướng về `login.html`), các bước khởi tạo chat tiếp theo sẽ bị dừng.
    *   **Khởi tạo Giao diện:** Nếu xác thực thành công, `main.js` lấy tham chiếu đến các elements (`#messageList`, `#messageInput`, `#sendButton`, `#typingIndicator`...). Có thể gọi các hàm từ `ui.js` để thiết lập trạng thái ban đầu.
    *   **Thiết lập Listeners:** Gắn các trình nghe sự kiện cần thiết (ví dụ: `submit` cho form chat, `click` cho nút gửi, `input` cho textarea).
    *   **(Tùy chọn) Tải Lịch sử/Danh sách Hội thoại:** Gửi yêu cầu API (ví dụ: `GET /api/chat/conversations`) để lấy danh sách hội thoại và hiển thị lên sidebar. Chọn hội thoại gần nhất hoặc mặc định, sau đó gửi yêu cầu API khác (ví dụ: `GET /api/chat/history/{conversationId}`) để tải và hiển thị tin nhắn của hội thoại đó bằng cách gọi hàm trong `ui.js`.
2.  **Người dùng Gửi Tin nhắn:**
    *   Nhập vào `#messageInput`, nhấn `#sendButton` hoặc Enter.
3.  **Xử lý Gửi Tin nhắn Phía Client (`chat-page.js` hoặc `chat.js` xử lý sự kiện):
    *   Ngăn chặn hành vi mặc định (nếu dùng form submit).
    *   Lấy nội dung: `const userMessage = messageInput.value.trim();`
    *   **Validate:** `if (!userMessage) return;`
    *   **Cập nhật UI Lạc quan (Optimistic Update):**
        *   Gọi hàm từ `ui.js` để thêm ngay tin nhắn người dùng vào `#messageList` (ví dụ: `ui.appendUserMessage(userMessage)`). Điều này tạo cảm giác phản hồi nhanh chóng.
        *   Xóa ô nhập: `messageInput.value = ''`; Có thể điều chỉnh lại chiều cao textarea nếu cần.
        *   Cuộn xuống dưới cùng: `ui.scrollToBottom('#messageList');`
        *   Hiển thị chỉ báo đang nhập: `ui.showTypingIndicator(true);`
        *   Vô hiệu hóa input/button: `ui.setChatInputEnabled(false);`
    *   Gọi hàm xử lý logic: `await handleSendMessage(userMessage);`
4.  **Gửi Yêu cầu API Chat (`chat.js` - bên trong `handleSendMessage`):
    *   Xác định endpoint (`CHAT_SEND_ENDPOINT`) và `conversationId` hiện tại.
    *   Tạo `requestBody`.
    *   **Gọi `fetchWithAuth`:** Đặt trong `try...catch`. `fetchWithAuth` sẽ tự động thêm header `Authorization: Bearer <token>`.
5.  **Backend Xử lý:** (Như mô tả trước, nhưng cần xử lý cả lỗi từ LLM và trả về lỗi 5xx nếu có).
6.  **Xử lý Phản hồi API Chat (`chat.js` - bên trong `handleSendMessage`):
    *   **Trong `try` (Nếu `fetchWithAuth` thành công):**
        *   Nhận `responseData`.
        *   Kiểm tra cấu trúc (ví dụ: `responseData?.data?.reply`). Nếu không hợp lệ, ném lỗi hoặc trả về lỗi.
        *   Trả về `responseData.data.reply` (và có thể cả `conversationId` mới nếu là tin nhắn đầu tiên).
    *   **Trong `catch (error)`:**
        *   Log lỗi chi tiết: `console.error("Error sending message:", error);`
        *   Trả về một đối tượng lỗi hoặc `null` để báo hiệu thất bại cho lớp gọi.
7.  **Hiển thị Phản hồi Bot / Xử lý Lỗi (`chat-page.js` hoặc `chat.js` sau khi `await handleSendMessage`):
    *   Nhận kết quả (`botReplyOrError`) từ `handleSendMessage`.
    *   Ẩn chỉ báo đang nhập: `ui.showTypingIndicator(false);`
    *   Kích hoạt lại input/button: `ui.setChatInputEnabled(true);`
    *   **Nếu thành công (`botReplyOrError` chứa tin nhắn):**
        *   Gọi hàm từ `ui.js` để hiển thị tin nhắn bot (ví dụ: `ui.appendBotMessage(botReplyOrError)`). Hàm này có thể cần xử lý Markdown thành HTML trước khi thêm vào DOM.
        *   Cuộn xuống dưới cùng: `ui.scrollToBottom('#messageList');`
    *   **Nếu thất bại (`botReplyOrError` là lỗi hoặc null):**
        *   Hiển thị thông báo lỗi cho người dùng (ví dụ: gọi `ui.appendErrorMessage("Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.")` hoặc hiển thị toast).
8.  **Xử lý Lỗi Chung:** Cần có cơ chế xử lý lỗi ở nhiều cấp (trong `fetchWithAuth`, trong `handleSendMessage`, và trong hàm gọi `handleSendMessage`) để đảm bảo ứng dụng không bị "sập" và người dùng nhận được phản hồi phù hợp.

## 4. Cấu trúc File và Module (Chi tiết hơn)

```
.
├── login.html
├── index.html
├── css/
│   └── style.css
└── js/
    ├── login/               # ... (như trước)
    │   ├── login-page.js
    │   └── login.js
    ├── chat/                # Module chức năng chat và chung
    │   ├── chat-page.js     # *Xử lý sự kiện* từ giao diện chat (index.html), gọi các hàm logic từ chat.js và hàm cập nhật UI từ ui.js.
    │   ├── chat.js          # *Logic cốt lõi* của chat: chứa hàm `handleSendMessage`, xử lý gọi API chat, quản lý `conversationId`.
    │   ├── ui.js            # *Tiện ích giao diện:* Chứa các hàm để thao tác DOM của chat (appendUserMessage, appendBotMessage, showTypingIndicator, setChatInputEnabled, scrollToBottom, renderMarkdown...). Độc lập với logic gọi API.
    │   ├── api.js           # *Gọi API:* Hàm `fetchWithAuth` chung.
    │   ├── auth.js          # *Xác thực:* `USER_DATA_KEY`, `checkAuthentication`, `logout`, `getUserData`.
    │   └── config.js        # *Cấu hình:* Các hằng số endpoint.
    └── main.js              # *Điểm khởi đầu* cho index.html: Gọi `checkAuthentication`, khởi tạo các thành phần UI ban đầu (có thể gọi hàm từ `ui.js`), thiết lập các event listeners chính (gắn hàm xử lý từ `chat-page.js`).
```

## 5. Yêu cầu API Backend (Chi tiết hơn)

*   **`AUTH_LOGIN_ENDPOINT`:** (Như trước)
*   **`CHAT_SEND_ENDPOINT` (Ví dụ: `/api/v1/chat/send`):**
    *   Phương thức: `POST`
    *   Headers: `Content-Type: application/json`, `Authorization: Bearer <token>`
    *   Body:
        ```json
        {
          "message": "Nội dung tin nhắn người dùng",
          "conversationId": "existing_id_or_null_for_new"
          // "metadata": { ... } // Tùy chọn: gửi thêm ngữ cảnh
        }
        ```
    *   Phản hồi Thành công (200 OK):
        ```json
        {
          "success": true,
          "data": {
            "reply": "Phản hồi từ AI Bot (có thể chứa Markdown).",
            "messageId": "bot_message_id_123", // ID của tin nhắn bot vừa tạo
            "conversationId": "updated_or_new_conversation_id" // ID của hội thoại
          }
        }
        ```
    *   **(Nâng cao - Streaming):** Backend có thể hỗ trợ Server-Sent Events (SSE) hoặc WebSockets để gửi phản hồi từng phần (token by token) thay vì chờ toàn bộ phản hồi từ LLM. Client sẽ cần xử lý luồng dữ liệu này để cập nhật UI liên tục.

*   **`CHAT_HISTORY_ENDPOINT` (Ví dụ: `/api/v1/chat/history/{conversationId}?limit=50&before={messageId}`):**
    *   Phương thức: `GET`
    *   Headers: `Authorization: Bearer <token>`
    *   Params: `conversationId` (bắt buộc), `limit` (tùy chọn), `before` (tùy chọn - để tải thêm tin nhắn cũ hơn).
    *   Phản hồi Thành công (200 OK):
        ```json
        {
          "success": true,
          "data": {
            "messages": [
              { "id": "msg_abc", "sender": "user", "text": "...", "timestamp": "..." },
              { "id": "msg_def", "sender": "bot", "text": "...", "timestamp": "..." }
              // ... sắp xếp từ cũ đến mới hoặc ngược lại ...
            ],
            "hasMore": true // Cho biết còn tin nhắn cũ hơn để tải không
          }
        }
        ```

*   **`CHAT_CONVERSATIONS_ENDPOINT` (Ví dụ: `/api/v1/chat/conversations?limit=20`):**
    *   Phương thức: `GET`
    *   Headers: `Authorization: Bearer <token>`
    *   Params: `limit` (tùy chọn).
    *   Phản hồi Thành công (200 OK):
        ```json
        {
          "success": true,
          "data": {
            "conversations": [
              { "id": "conv_1", "title": "Tóm tắt ngắn gọn...", "lastUpdated": "..." },
              { "id": "conv_2", "title": "Chủ đề khác...", "lastUpdated": "..." }
            ]
          }
        }
        ```
*   **API Xác thực Token:** (Như trước)

## 6. Thiết lập và Sử dụng

(Giữ nguyên chi tiết từ phiên bản trước, đảm bảo cập nhật đủ các endpoint trong `config.js`)

## 7. Khắc phục sự cố (Troubleshooting) (Chi tiết hơn)

*   **Lỗi Đăng nhập:** Xem các mục trước. Kiểm tra Console lỗi 401 (Unauthorized), 400 (Bad Request).
*   **Không gửi/nhận được tin nhắn chat:**
    *   Đảm bảo đã đăng nhập (Kiểm tra `localStorage` và Console xem có lỗi 401/403 khi gọi API chat không).
    *   Kiểm tra endpoint `CHAT_SEND_ENDPOINT`.
    *   Kiểm tra Network tab xem request có body đúng không, header `Authorization` có token không.
    *   Kiểm tra response từ API (có thể backend trả về lỗi 500 Internal Server Error nếu LLM gặp sự cố).
    *   Kiểm tra Console xem có lỗi JavaScript nào trong hàm `handleSendMessage` hoặc các hàm `ui.js` không.
*   **Lịch sử chat không hiển thị / Danh sách hội thoại trống:**
    *   Kiểm tra các endpoint `CHAT_HISTORY_ENDPOINT`, `CHAT_CONVERSATIONS_ENDPOINT`.
    *   Kiểm tra Network tab xem request có được gửi với token đúng không, response có dữ liệu không hay là lỗi (404 Not Found nếu `conversationId` không tồn tại?).
*   **Bị chuyển về trang login khi đang chat:**
    *   Đây gần như chắc chắn là lỗi 401 Unauthorized trả về từ một API (send, history, conversations). Hàm `fetchWithAuth` hoặc logic xử lý response cần bắt lỗi này, gọi `logout()` (xóa `localStorage`) và chuyển hướng.
    *   Kiểm tra Network tab để xác định API nào trả về 401.
*   **Lỗi CORS:** Nếu frontend và backend chạy trên các domain/port khác nhau, đảm bảo backend đã cấu hình CORS header (vd: `Access-Control-Allow-Origin`) để cho phép yêu cầu từ domain của frontend. Lỗi CORS thường hiển thị rõ trong Console.

## 8. Quản lý Trạng thái Xác thực Sau Đăng nhập

(Giữ nguyên chi tiết từ phiên bản trước)

## 9. Tương tác giữa các Module JavaScript (Luồng Chat)

Mục này mô tả chi tiết cách các file JavaScript chính tương tác với nhau để thực hiện chức năng chat, tập trung vào hai luồng chính: Khởi tạo trang và Gửi tin nhắn.

### 9.1. Luồng Khởi tạo Trang Chat (`index.html`)

1.  **`index.html` -> `main.js`:**
    *   Trình duyệt tải `index.html` và thực thi script được liên kết, giả sử là `main.js` (có thể được đánh dấu là `type="module"`).
2.  **`main.js` -> `auth.js` (`checkAuthentication`):**
    *   `main.js` import hàm `checkAuthentication` từ `auth.js`.
    *   `main.js` gọi `checkAuthentication()`.
    *   `auth.js` đọc `USER_DATA_KEY` từ `localStorage`, kiểm tra tính hợp lệ (như mô tả ở Mục 8). Nếu không hợp lệ, nó sẽ tự động chuyển hướng sang `login.html`. Nếu hợp lệ, nó trả về dữ liệu người dùng (ví dụ: `{ token, userId }`).
3.  **`main.js` -> `ui.js` (Thiết lập Giao diện Ban đầu):**
    *   Nếu `checkAuthentication` trả về dữ liệu hợp lệ, `main.js` tiếp tục.
    *   `main.js` có thể import và gọi các hàm từ `ui.js` để thiết lập trạng thái ban đầu của giao diện chat (ví dụ: `ui.initializeChatLayout()`, `ui.clearMessageList()`).
4.  **`main.js` -> `chat-page.js` (Gắn Event Listeners):**
    *   `main.js` import các hàm xử lý sự kiện từ `chat-page.js` (ví dụ: `handleFormSubmit`, `handleTextInput`).
    *   `main.js` lấy tham chiếu đến các phần tử DOM (form chat, ô nhập, nút gửi) và gắn các hàm từ `chat-page.js` làm trình xử lý cho các sự kiện tương ứng (`submit`, `input`, `click`).
5.  **`main.js` -> `chat.js` (Tải Dữ liệu Ban đầu - Tùy chọn):**
    *   `main.js` có thể import và gọi một hàm khởi tạo từ `chat.js` (ví dụ: `loadInitialChatData()`).
    *   **`chat.js` -> `api.js` (`fetchWithAuth`):** Bên trong `loadInitialChatData`, `chat.js` import `fetchWithAuth` từ `api.js` và các endpoint (ví dụ: `CHAT_CONVERSATIONS_ENDPOINT`, `CHAT_HISTORY_ENDPOINT`) từ `config.js`.
    *   `chat.js` gọi `fetchWithAuth` để lấy danh sách hội thoại và/hoặc lịch sử của hội thoại mặc định.
    *   **`api.js` -> `auth.js` (`getUserData`):** `fetchWithAuth` gọi một hàm từ `auth.js` (ví dụ: `getUserData`) để lấy token từ `localStorage` trước khi thực hiện `fetch`.
    *   **`chat.js` -> `ui.js` (Hiển thị Dữ liệu):** Sau khi nhận dữ liệu từ `api.js`, `chat.js` gọi các hàm trong `ui.js` (ví dụ: `ui.renderConversationList`, `ui.renderMessageHistory`) để cập nhật giao diện người dùng.

### 9.2. Luồng Gửi Tin nhắn (Mô tả Tương tác Siêu Chi tiết)

Mục này đi sâu vào từng bước tương tác giữa các module khi người dùng gửi một tin nhắn, bao gồm cả logic bên trong các hàm quan trọng.

```text
-- Bước 1: Hành động Người dùng & Bắt Sự kiện --

Người Dùng ---[Nhập "Xin chào" & Nhấn Gửi/Enter]---> DOM (index.html: #messageInput, #sendButton)
    |
    V
DOM (index.html) ---[Trigger 'submit'/'click' event]---> main.js (Event Listener được gắn lúc khởi tạo)
    |
    V
main.js ---[Calls event handler: handleFormSubmit(event)]---> chat-page.js

-- Bước 2: Xử lý Sự kiện & Cập nhật UI Lạc quan --

chat-page.js (handleFormSubmit):
    | 1. `event.preventDefault()`: Ngăn trình duyệt tải lại trang (nếu là form submit).
    | 2. Đọc & Chuẩn hóa Input: Lấy `value` từ `#messageInput`, gọi `.trim()` -> `userMessage = "Xin chào"`
    | 3. Validate Input: Kiểm tra `userMessage` không phải là chuỗi rỗng. Nếu rỗng, thoát hàm.
    | 4. Gọi UI để cập nhật giao diện *ngay lập tức* (lạc quan):
    V
    `chat-page.js` ---[Calls: ui.appendUserMessage("Xin chào")]---> ui.js
        `ui.js (appendUserMessage)`:
            | a. Tạo phần tử `div` mới (ví dụ: `const msgDiv = document.createElement('div')`).
            | b. Thêm các lớp CSS cần thiết (ví dụ: `msgDiv.classList.add('message', 'message-user')`).
            | c. Tạo cấu trúc con bên trong (ví dụ: `div` cho nội dung, `span` cho timestamp).
            | d. **An toàn hóa HTML:** Đặt nội dung tin nhắn bằng `textContent` (không phải `innerHTML`) để tránh XSS -> `contentDiv.textContent = "Xin chào"`
            | e. Append `msgDiv` vào phần tử chứa tin nhắn (`#messageList`).
    `chat-page.js` ---[Calls: ui.clearInput()]---> ui.js
        `ui.js (clearInput)`:
            | a. Lấy tham chiếu đến `#messageInput`.
            | b. Đặt `messageInput.value = ''`.
    `chat-page.js` ---[Calls: ui.scrollToBottom()]---> ui.js
        `ui.js (scrollToBottom)`:
            | a. Lấy tham chiếu đến `#messageList`.
            | b. Đặt `messageList.scrollTop = messageList.scrollHeight` để cuộn xuống cuối.
    `chat-page.js` ---[Calls: ui.showTypingIndicator(true)]---> ui.js
        `ui.js (showTypingIndicator)`:
            | a. Lấy tham chiếu đến `#typingIndicator`.
            | b. Nếu `show` là true, xóa class `hidden`; ngược lại, thêm class `hidden`.
    `chat-page.js` ---[Calls: ui.setChatInputEnabled(false)]---> ui.js
        `ui.js (setChatInputEnabled)`:
            | a. Lấy tham chiếu đến `#messageInput`, `#sendButton`.
            | b. Đặt thuộc tính `disabled` thành `!isEnabled` (tức là `true` trong trường hợp này).
    V

-- Bước 3: Gọi Logic Nghiệp vụ để Gửi Tin nhắn --

chat-page.js ---[Calls: await handleSendMessage("Xin chào")]---> chat.js

-- Bước 4: Xử lý Logic Nghiệp vụ & Chuẩn bị Gọi API --

chat.js (handleSendMessage):
    | 1. Quản lý State: Xác định `conversationId` hiện tại. Có thể đọc từ một biến toàn cục trong module `chat.js` hoặc từ một đối tượng state được quản lý.
    | 2. Lấy Cấu hình Endpoint:
    |    `chat.js` ---[Reads constant: CHAT_SEND_ENDPOINT]---> config.js (Returns `/api/v1/chat/send`)
    | 3. Tạo Body Yêu cầu: `requestBody = { message: "Xin chào", conversationId: "conv_123" }`.
    | 4. Gọi hàm thực hiện API (đặt trong try-catch để xử lý lỗi):
    V

-- Bước 5: Thực hiện Lệnh Gọi API --

chat.js ---[Calls: await fetchWithAuth("/api/v1/chat/send", { method: 'POST', body: requestBody })]---> api.js

    `api.js (fetchWithAuth)`
        | 1. Lấy Dữ liệu Xác thực:
        |    `api.js` ---[Calls: getUserData()]---> auth.js
        |        `auth.js (getUserData)`
        |            | a. Đọc chuỗi JSON từ `localStorage.getItem(USER_DATA_KEY)`.
        |            | b. Nếu có chuỗi, `JSON.parse()` nó.
        |            | c. Kiểm tra cấu trúc và trả về object chứa `token` (ví dụ: `{ token: "jwt_token...", ... }`) hoặc `null` nếu không hợp lệ/không có.
        | 2. Kiểm tra Token: Nếu `getUserData()` trả về `null` hoặc không có token, `fetchWithAuth` *nên* ném lỗi ngay lập tức (ví dụ: `throw new Error("User not authenticated")`) mà không cần gọi `fetch`.
        | 3. Chuẩn bị Fetch Options:
        |    - `method: 'POST'`
        |    - `headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer jwt_token...' }` (Lấy token từ bước 1)
        |    - `body: JSON.stringify(requestBody)`
        | 4. Thực hiện Lệnh Fetch: `const response = await fetch(apiUrl, options);`
        | 5. Chờ Backend Phản hồi.
        | 6. Backend Xử lý: Xác thực token, gọi LLM, lưu DB, trả về Response (ví dụ: 200 OK với JSON body).
        | 7. `api.js` Nhận Response Object.
        | 8. Xử lý Response:
        |    - **Kiểm tra `response.ok`:** Nếu `false` (ví dụ: 401, 404, 500):
        |        - Cố gắng đọc body lỗi: `const errorData = await response.json().catch(() => ({ message: response.statusText }));` (Dự phòng nếu body không phải JSON).
        |        - Tạo đối tượng Lỗi: `const error = new Error(errorData.message || "Unknown API error");`
        |        - (Tùy chọn) Gắn thêm thông tin: `error.status = response.status;`
        |        - **Ném Lỗi:** `throw error;` -> Lỗi này sẽ được bắt bởi `catch` trong `chat.js`.
        |    - **Nếu `response.ok` là `true`:**
        |        - Parse body thành công: `const responseData = await response.json();` -> `{ success: true, data: { reply: "Chào bạn!", ... } }`
        |        - **Trả về Dữ liệu:** `return responseData;`
        V

-- Bước 6: Nhận và Xử lý Kết quả API trong Logic Nghiệp vụ --

api.js ---[Returns: responseData (`{ success: true, data: {...} }`)]---> chat.js (sau await trong `try` block)

    `chat.js (handleSendMessage)`
        | 1. Nhận `responseData`.
        | 2. Kiểm tra cấu trúc dữ liệu thành công: `if (responseData?.success && responseData?.data?.reply)`
        | 3. Trích xuất dữ liệu cần thiết: `const botReply = responseData.data.reply;` (="Chào bạn!")
        | 4. (Tùy chọn) Cập nhật State: Nếu có `conversationId` mới trả về, cập nhật biến `currentConversationId`
        | 5. Trả về kết quả thành công cho lớp gọi: `return botReply;`
        V

-- Bước 7: Nhận Kết quả và Cập nhật UI Cuối cùng --

chat.js ---[Returns: "Chào bạn!"]---> chat-page.js (sau await handleSendMessage)

    `chat-page.js (handleFormSubmit)`
        | 1. Nhận kết quả thành công: `botReply = "Chào bạn!"`
        | 2. Gọi UI để hoàn tất cập nhật:
        V
        `chat-page.js` ---[Calls: ui.showTypingIndicator(false)]---> ui.js
            `ui.js (showTypingIndicator)`: Thêm class `hidden` vào `#typingIndicator`
        `chat-page.js` ---[Calls: ui.setChatInputEnabled(true)]---> ui.js
            `ui.js (setChatInputEnabled)`: Đặt `disabled=false` cho `#messageInput`, `#sendButton`
        `chat-page.js` ---[Calls: ui.appendBotMessage("Chào bạn!")]---> ui.js
            `ui.js (appendBotMessage)`:
                | a. Tạo `div` mới với class `message message-bot`
                | b. **Render Markdown (Tùy chọn):** Có thể gọi một hàm `renderMarkdown("Chào bạn!")` trả về chuỗi HTML an toàn
                | c. Đặt nội dung bằng `innerHTML` nếu có Markdown đã được render an toàn, hoặc `textContent` nếu chỉ là text thường
                | d. Append vào `#messageList`
        `chat-page.js` ---[Calls: ui.scrollToBottom()]---> ui.js
            `ui.js (scrollToBottom)`: Cuộn `#messageList` xuống dưới
        V

chat-page.js ---[Hoàn thành xử lý sự kiện thành công]---> (Idle)

-- Luồng Xử lý Lỗi (Ví dụ: API trả về 401 Unauthorized) --

```text
... (Các bước 1-4 giống luồng thành công) ...

-- Bước 5 (Lỗi): Thực hiện Lệnh Gọi API --

chat.js ---[Calls: await fetchWithAuth(...)]---> api.js

    `api.js (fetchWithAuth)`
        | ... (Lấy token, chuẩn bị fetch)
        | 4. Thực hiện `fetch`.
        | 5. Backend trả về Response (401 Unauthorized, body: `{ message: "Token không hợp lệ" }`).
        | 6. `api.js` nhận Response.
        | 7. `response.ok` là `false`.
        | 8. Đọc body lỗi: `errorData = { message: "Token không hợp lệ" }`.
        | 9. Tạo `error = new Error("Token không hợp lệ")`, `error.status = 401`.
        | 10. **Ném Lỗi:** `throw error;`
        V

-- Bước 6 (Lỗi): Bắt Lỗi trong Logic Nghiệp vụ --

api.js ---[Throws Error("Token không hợp lệ")]---> chat.js (trong `catch (error)` block của `handleSendMessage`)

    `chat.js (handleSendMessage)`
        | 1. Bắt được `error` (với `message` và `status`).
        | 2. Log lỗi chi tiết: `console.error("API Error:", error.status, error.message)`.
        | 3. Quyết định cách báo lỗi: Trả về `error` object hoặc `null` hoặc một message lỗi cụ thể. Giả sử trả về `error`.
        V

-- Bước 7 (Lỗi): Nhận Lỗi và Cập nhật UI Thông báo Lỗi --

chat.js ---[Returns: Error("Token không hợp lệ")]---> chat-page.js (sau await handleSendMessage)

    `chat-page.js (handleFormSubmit)`
        | 1. Nhận `result = Error(...)`.
        | 2. Kiểm tra xem `result` có phải là lỗi không (ví dụ: `result instanceof Error`).
        | 3. Gọi UI để cập nhật trạng thái và hiển thị lỗi:
        V
        `chat-page.js` ---[Calls: ui.showTypingIndicator(false)]---> ui.js
        `chat-page.js` ---[Calls: ui.setChatInputEnabled(true)]---> ui.js
        `chat-page.js` ---[Calls: ui.appendErrorMessage("Lỗi: " + result.message)]---> ui.js
            `ui.js (appendErrorMessage)`
                | a. Tạo `div` mới với class `message message-error`.
                | b. Đặt `textContent` là thông báo lỗi.
                | c. Append vào `#messageList`.
        `chat-page.js` ---[Calls: ui.scrollToBottom()]---> ui.js
        | 4. **Xử lý Lỗi Xác thực Cụ thể:** Nếu `result.status === 401`:
        V
        `chat-page.js` ---[Calls: logout()]---> auth.js
            `auth.js (logout)`
                | a. `localStorage.removeItem(USER_DATA_KEY)`.
                | b. `window.location.href = 'login.html';` (Chuyển hướng)
        V

chat-page.js ---[Hoàn thành xử lý lỗi (có thể đã chuyển hướng)]---> ...

```

**Tóm tắt Vai trò:** (Giữ nguyên như phiên bản trước)

## 10. Thiết lập và Sử dụng

(Giữ nguyên chi tiết từ phiên bản trước, đảm bảo cập nhật đủ các endpoint trong `config.js`)

## 11. Khắc phục sự cố (Troubleshooting) (Chi tiết hơn)

*   **Lỗi Đăng nhập:** Xem các mục trước. Kiểm tra Console lỗi 401 (Unauthorized), 400 (Bad Request).
*   **Không gửi/nhận được tin nhắn chat:**
    *   Đảm bảo đã đăng nhập (Kiểm tra `localStorage` và Console xem có lỗi 401/403 khi gọi API chat không).
    *   Kiểm tra endpoint `CHAT_SEND_ENDPOINT`.
    *   Kiểm tra Network tab xem request có body đúng không, header `Authorization` có token không.
    *   Kiểm tra response từ API (có thể backend trả về lỗi 500 Internal Server Error nếu LLM gặp sự cố).
    *   Kiểm tra Console xem có lỗi JavaScript nào trong hàm `handleSendMessage` hoặc các hàm `ui.js` không.
*   **Lịch sử chat không hiển thị / Danh sách hội thoại trống:**
    *   Kiểm tra các endpoint `CHAT_HISTORY_ENDPOINT`, `CHAT_CONVERSATIONS_ENDPOINT`.
    *   Kiểm tra Network tab xem request có được gửi với token đúng không, response có dữ liệu không hay là lỗi (404 Not Found nếu `conversationId` không tồn tại?).
*   **Bị chuyển về trang login khi đang chat:**
    *   Đây gần như chắc chắn là lỗi 401 Unauthorized trả về từ một API (send, history, conversations). Hàm `fetchWithAuth` hoặc logic xử lý response cần bắt lỗi này, gọi `logout()` (xóa `localStorage`) và chuyển hướng.
    *   Kiểm tra Network tab để xác định API nào trả về 401.
*   **Lỗi CORS:** Nếu frontend và backend chạy trên các domain/port khác nhau, đảm bảo backend đã cấu hình CORS header (vd: `Access-Control-Allow-Origin`) để cho phép yêu cầu từ domain của frontend. Lỗi CORS thường hiển thị rõ trong Console.

## 12. Quản lý Trạng thái Xác thực Sau Đăng nhập

(Giữ nguyên chi tiết từ phiên bản trước) 