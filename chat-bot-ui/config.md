# Cấu Hình Frontend

Tài liệu này mô tả các hằng số cấu hình được sử dụng trong mã nguồn JavaScript frontend (`js/chat/config.js`).

## 1. Cấu Hình API Backend

Các endpoint này trỏ đến API backend của ứng dụng Chat Bot.

- **`API_BASE_URL`**: URL cơ sở cho tất cả các lệnh gọi API backend.
  - Giá trị: `https://chatbotapi.hub.edu.vn/api`

- **`AUTH_GOOGLE_VERIFY_ENDPOINT`**: Endpoint để backend xác thực Google ID Token.
  - Giá trị: `${API_BASE_URL}/auth/google/verify`
  - Sử dụng trong: Xác thực đăng nhập Google (`js/login/login.js`).

- **`CHAT_MESSAGE_API_ENDPOINT`**: Endpoint cơ sở cho các hoạt động liên quan đến tin nhắn chat (lấy danh sách, lưu tin nhắn).
  - Giá trị: `${API_BASE_URL}/ChatMessages`
  - Đường dẫn cụ thể sử dụng:
    - `GET /ChatMessages/session/{sessionId}`: Lấy tin nhắn (`js/chat/session.js`).
    - `POST /ChatMessages`: Lưu tin nhắn (`js/chat/chat.js`).

- **`SESSIONS_API_ENDPOINT`**: Endpoint cơ sở cho các hoạt động liên quan đến phiên chat (lấy danh sách, tạo mới, xóa).
  - Giá trị: `${API_BASE_URL}/ChatSessions`
  - Đường dẫn cụ thể sử dụng:
    - `GET /ChatSessions/user/{userId}`: Lấy danh sách phiên (`js/chat/session.js`).
    - `POST /ChatSessions`: Tạo phiên mới (`js/chat/session.js`).
    - `DELETE /ChatSessions/{sessionId}`: Xóa phiên (`js/chat/session.js`).

*Lưu ý: Các endpoint khác như `AUTH_LOGIN_ENDPOINT`, `AUTH_REGISTER_ENDPOINT`, `AUTH_GOOGLE_LOGIN_ENDPOINT` được định nghĩa trong `config.js` nhưng không được sử dụng trực tiếp trong luồng xử lý đã phân tích (luồng đăng nhập Google và chat).* 

## 2. Cấu Hình Google Client ID

- **`GOOGLE_CLIENT_ID`**: Client ID từ Google Cloud Console để sử dụng Google Sign-In API.
  - Giá trị: `197433305936-sffe02eu5jecf94m1oh1rn6igrosv6f3.apps.googleusercontent.com`
  - Sử dụng trong: Khởi tạo Google Sign-In (`js/login/login-page.js`).

## 3. Cấu Hình Dify (AI Service)

Các cấu hình này dùng để tương tác trực tiếp với Dify API.

- **`DIFY_API_BASE_URL`**: URL cơ sở của Dify API.
  - Giá trị: `https://trolyai.hub.edu.vn`

- **`DIFY_CHAT_API_ENDPOINT`**: Endpoint cụ thể của Dify để gửi/nhận tin nhắn chat streaming.
  - Giá trị: `${DIFY_API_BASE_URL}/v1/chat-messages`
  - Sử dụng trong: Gửi tin nhắn đến AI và nhận phản hồi (`js/chat/chat.js`).

- **`DIFY_API_KEY`**: Khóa API để xác thực với Dify.
  - Giá trị: `app-kyJ4IsXr0BvdaSuYBpdPISXH`
  - **Quan trọng:** Đây là thông tin nhạy cảm. Trong môi trường production, không nên để lộ khóa API trực tiếp trong mã nguồn frontend. Cân nhắc sử dụng một proxy backend hoặc các phương pháp bảo mật khác.
  - Sử dụng trong: Header `Authorization` khi gọi Dify API (`js/chat/api.js` -> `handleSseStream`).
