# Hướng dẫn Cài đặt và Cấu trúc Dự án Chat Bot UI (Frontend)

Tài liệu này cung cấp hướng dẫn cài đặt, cấu hình và hiểu cấu trúc của dự án frontend Chat Bot. Nó tổng hợp thông tin từ mã nguồn (`js/`, `*.html`, `css/`) và các tài liệu chi tiết khác (`api.md`, `config.md`, `actions.md`, `auth.md`, `sessions.md`, `chat-message.md`, `ux-ui-login.md`, `ux-ui-chat.md`).

## 1. Tổng Quan Dự Án

Đây là phần giao diện người dùng (frontend) cho ứng dụng Trợ lý AI Tuyển Sinh, cho phép người dùng đăng nhập bằng Google, trò chuyện với AI (thông qua Dify), xem lại lịch sử và quản lý các cuộc trò chuyện.

## 2. Yêu Cầu Hệ Thống

-   Trình duyệt web hiện đại (Chrome, Firefox, Edge, Safari).
-   Một máy chủ web cục bộ để phục vụ các tệp HTML, CSS, JS (do sử dụng JavaScript Modules). Ví dụ: `http-server` (Node.js), `python -m http.server`, hoặc tiện ích Live Server trong VS Code.
-   Kiến thức cơ bản về HTML, CSS, JavaScript.

## 3. Cấu Trúc Thư Mục và Tệp Chính

```
chat-bot/
├── css/
│   ├── chat-styles.css         # Styles cho khu vực chat
│   ├── dify-custom.css         # Styles tùy chỉnh liên quan đến Dify (nếu có)
│   ├── login.css             # Styles riêng cho trang đăng nhập
│   ├── markdown-styles.css     # Styles cho nội dung Markdown render
│   └── tailwind.config.js    # Cấu hình Tailwind (màu sắc, fonts...)
├── js/
│   ├── chat/
│   │   ├── api.js              # Xử lý gọi API backend và Dify (fetchWithAuth, handleSseStream)
│   │   ├── auth.js             # Quản lý trạng thái đăng nhập, thông tin user (localStorage)
│   │   ├── chat.js             # Logic xử lý gửi/nhận tin nhắn chính
│   │   ├── config.js           # Chứa các hằng số cấu hình (API endpoints, keys)
│   │   ├── main.js             # Điểm vào chính của ứng dụng chat (sau đăng nhập)
│   │   ├── session.js          # Quản lý state phiên chat (tải, tạo, xóa, chọn, lưu tin nhắn vào state)
│   │   ├── speech.js           # Xử lý Web Speech API (ghi âm)
│   │   ├── ui.js               # Cập nhật các thành phần UI chat (tin nhắn, lịch sử, loading...)
│   │   └── utils.js            # Các hàm tiện ích (render Markdown, highlight code, format time...)
│   ├── login/
│   │   ├── login-page.js       # Logic xử lý trang đăng nhập (Google Sign-In init, callback)
│   │   └── login.js            # Gửi token Google về backend để xác thực
│   ├── pre-auth-check.js     # Script chạy đầu tiên kiểm tra đăng nhập trước khi vào chat
│   ├── ui-interactions.js    # Xử lý các tương tác UI chung (sidebar mobile, ripple effect)
│   └── welcome-screen.js     # Logic cho màn hình chào mừng ban đầu
├── logo/
│   └── logo.png              # Logo HUB
├── chat-bot-ui/              # Thư mục chứa tài liệu dự án (các file .md)
│   ├── api.md
│   ├── config.md
│   ├── actions.md
│   ├── auth.md
│   ├── sessions.md
│   ├── chat-message.md
│   ├── ux-ui-login.md
│   ├── ux-ui-chat.md
│   └── setup.md              # Chính là file này
├── index.html                # Trang giao diện chat chính
├── login.html                # Trang đăng nhập
└── README.md                 # (Nên có) Mô tả dự án tổng quan
```

-   **Clean Code:** Dự án áp dụng cấu trúc module hóa trong thư mục `js/`, tách biệt các mối quan tâm (API, Auth, Session, UI, Utils). Sử dụng `import`/`export` giúp quản lý phụ thuộc rõ ràng.

## 4. Cấu Hình (`js/chat/config.js`)

-   Tệp này tập trung các giá trị cấu hình quan trọng. Xem chi tiết tại `chat-bot-ui/config.md`.
-   **Các cấu hình chính cần xem xét/thay đổi khi triển khai:**
    -   `API_BASE_URL`: URL của backend API thực tế.
    -   `GOOGLE_CLIENT_ID`: Phải được tạo từ Google Cloud Console cho domain triển khai của bạn.
    -   `DIFY_API_BASE_URL`: URL của Dify instance (nếu tự host hoặc khác).
    -   `DIFY_API_KEY`: **KHÔNG BAO GIỜ giữ khóa này trong code frontend ở môi trường production.**
        -   **Giải pháp đề xuất:** Tạo một endpoint proxy trên backend. Frontend sẽ gọi đến endpoint proxy này mà không cần gửi kèm `DIFY_API_KEY`. Backend sẽ nhận yêu cầu, thêm khóa API vào header một cách an toàn, rồi mới chuyển tiếp yêu cầu đến Dify.
        -   *Cách thực hiện (ví dụ):* Sửa hàm `handleSseStream` trong `js/chat/api.js` để gọi đến endpoint proxy của bạn (ví dụ: `/api/dify-proxy`) thay vì `DIFY_CHAT_API_ENDPOINT` trực tiếp, và loại bỏ việc thêm header `Authorization` chứa `DIFY_API_KEY` ở frontend.

## 5. Phụ Thuộc Bên Ngoài (CDN)

-   Dự án sử dụng các thư viện được tải qua CDN trong `index.html` và `login.html`:
    -   **Tailwind CSS:** Framework CSS chính.
    -   **Google Fonts (Inter):** Font chữ sử dụng.
    -   **Highlight.js:** Tô sáng cú pháp code trong tin nhắn AI.
    -   **MarkedJS:** Phân tích và chuyển đổi Markdown sang HTML.
    -   **DOMPurify:** Làm sạch (sanitize) HTML được tạo từ Markdown để chống XSS.
    -   **Google Identity Services:** Thư viện cho Google Sign-In.

## 6. Các Bước Cài Đặt và Chạy

1.  **Lấy mã nguồn:** Clone repository hoặc tải về các tệp dự án.
2.  **Cấu hình (Nếu cần):** Chỉnh sửa các giá trị trong `js/chat/config.js` nếu bạn đang kết nối đến backend hoặc Dify instance khác (lưu ý vấn đề bảo mật `DIFY_API_KEY`). Đảm bảo `GOOGLE_CLIENT_ID` đúng với môi trường của bạn.
3.  **Chạy Web Server:** Mở terminal trong thư mục gốc của dự án và chạy một máy chủ web cục bộ. Ví dụ:
    -   Nếu có Python: `python -m http.server 8000` (hoặc một port khác).
    -   Nếu có Node.js và `http-server` cài đặt (`npm install -g http-server`): `http-server -p 8000`.
    -   Hoặc sử dụng tiện ích "Live Server" trong VS Code.
4.  **Truy cập Ứng dụng:** Mở trình duyệt và truy cập vào địa chỉ máy chủ cục bộ, bắt đầu từ trang đăng nhập. Ví dụ: `http://localhost:8000/login.html`.

## 7. Luồng Hoạt Động và Đồng Bộ Logic

-   **Khởi động:**
    -   `login.html`: Kiểm tra (`checkAuthentication`) -> Nếu đã đăng nhập, chuyển hướng sang `index.html`. Nếu chưa, khởi tạo Google Sign-In (`login-page.js`).
    -   `index.html`: Chạy `pre-auth-check.js` -> Nếu chưa đăng nhập, chuyển hướng về `login.html`. Nếu đã đăng nhập, `main.js` chạy.
-   **Đăng nhập Google:** `login-page.js` nhận callback -> Gọi `login.js` (`handleGoogleVerifyToken`) -> Gọi `api.js` (`fetchWithAuth`) để gửi token về backend -> Lưu token ứng dụng vào `localStorage` -> Chuyển hướng sang `index.html`.
-   **Tải Chat (`main.js`):**
    -   Gọi `loadChatSessions` (`session.js`) -> Gọi `api.js` (`fetchWithAuth` đến `/api/ChatSessions/user/{userId}`).
    -   `session.js` cập nhật state `chatSessions`, đặt `currentSessionId`.
    -   `session.js` gọi `updateHistorySidebar` (`ui.js`) để vẽ sidebar.
    -   `main.js` gọi `loadSessionMessages` (`session.js`) cho phiên hiện tại -> Gọi `api.js` (`fetchWithAuth` đến `/api/ChatMessages/session/{sessionId}`).
    -   `session.js` gọi `addMessageToChat` (`ui.js`) để render tin nhắn.
-   **Gửi Tin Nhắn (`main.js` -> `chat.js` -> `handleSendMessage`):**
    1.  Gọi `api.js` (`fetchWithAuth`) để lưu tin nhắn người dùng (`POST /api/ChatMessages`).
    2.  Gọi `ui.js` (`addMessageToChat`) để hiển thị tin nhắn người dùng.
    3.  Gọi `session.js` (`addMessageToCurrentSession`) để cập nhật state phiên.
    4.  Gọi `ui.js` (`addMessageToChat` với `isStreaming: true`) để hiển thị placeholder AI.
    5.  Gọi `api.js` (`handleSseStream`) để gọi Dify.
-   **Nhận Tin Nhắn AI (`api.js` -> `handleSseStream`):**
    -   Cập nhật `innerHTML` của placeholder AI (đã được `addMessageToChat` trả về) bằng `renderMarkdown`.
    -   Gọi `highlightCodeBlocks`.
    -   Khi kết thúc stream, gọi callback trong `handleSendMessage`:
        -   Gọi `api.js` (`fetchWithAuth`) để lưu tin nhắn AI (`POST /api/ChatMessages`).
        -   Gọi `session.js` (`addMessageToCurrentSession`) để cập nhật state phiên.
        -   Gọi `session.js` (`updateCurrentSessionConversationId`) nếu cần.
-   **Chọn/Xóa Phiên:** Tương tác trên sidebar (`ui.js`) -> Gọi `handleSelectSession`/`handleDeleteRequest` (`session.js`) -> Gọi `loadSessionMessages` hoặc `deleteSession` (`session.js`) -> Gọi `api.js` nếu cần -> Cập nhật UI qua `ui.js`.

-   **Đồng bộ:** State chính của các phiên và tin nhắn được quản lý trong `session.js`. Các module khác (chat, ui, main) tương tác với state này thông qua các hàm export từ `session.js`. Việc gọi API được tập trung trong `api.js`. Cập nhật UI được tập trung trong `ui.js` và `utils.js`.

## 8. Lưu ý Quan trọng

-   **Backend API:** Dự án frontend này yêu cầu một backend API hoạt động đúng như mô tả trong `api.md` để có thể chạy đầy đủ chức năng.
-   **Bảo mật Dify Key:** Vấn đề lộ `DIFY_API_KEY` là nghiêm trọng nhất cần giải quyết trước khi đưa vào môi trường thực tế.
-   **Sanitize HTML:** Đảm bảo `DOMPurify` được tích hợp và hoạt động đúng để chống XSS từ nội dung Markdown.
-   **Môi trường:** Cấu hình (đặc biệt là Google Client ID và API URLs) cần được điều chỉnh cho phù hợp với môi trường triển khai (development, staging, production).
