# Actions Chính Của Dự Án Chat Bot UI

Tài liệu này mô tả các hành động (chức năng) cốt lõi của giao diện người dùng Chat Bot, dựa trên phân tích mã nguồn JavaScript (`js/`) và tài liệu API (`api.md`, `config.md`).

## 1. Xác thực Người dùng (Authentication)

- **Kiểm tra đăng nhập trước khi tải trang (Pre-Auth Check):**
    - **Mô tả:** Kiểm tra xem thông tin đăng nhập (token) có tồn tại và hợp lệ trong `localStorage` hay không trước khi tải trang chính (`index.html`). Nếu không hợp lệ, chuyển hướng người dùng đến trang đăng nhập (`login.html`).
    - **File:** `js/pre-auth-check.js`.
    - **Logic:** Đọc `localStorage` (key `hub_user_data`), kiểm tra cấu trúc và sự tồn tại của `data.token`.

- **Xử lý Đăng nhập Google (Handle Google Sign-In):**
    - **Mô tả:** Khởi tạo thư viện Google Sign-In, render nút đăng nhập, và xử lý callback khi người dùng đăng nhập thành công qua Google.
    - **File:** `js/login/login-page.js`.
    - **Logic:** Sử dụng `GOOGLE_CLIENT_ID` từ `config.js` để khởi tạo. Gọi `handleGoogleCredentialResponse` khi có callback.

- **Xác thực Google ID Token với Backend (Verify Google Token):**
    - **Mô tả:** Gửi `idToken` nhận được từ Google Sign-In về backend để xác thực.
    - **File:** `js/login/login.js` (hàm `handleGoogleVerifyToken`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint:** `POST /api/auth/google/verify` (Xem `api.md`).

- **Lưu/Truy xuất Thông tin Người dùng (Store/Retrieve User Info):**
    - **Mô tả:** Lưu thông tin người dùng (nhận được sau khi xác thực thành công) vào `localStorage` và cung cấp hàm để truy xuất thông tin này.
    - **File:** `js/auth.js` (hàm `getUserInfo`), `js/login/login.js`.
    - **Logic:** Sử dụng `localStorage` với key `hub_user_data`.

- **Kiểm tra Trạng thái Đăng nhập (Check Authentication Status):**
    - **Mô tả:** Kiểm tra xem người dùng hiện tại có được coi là đã đăng nhập hay không (dựa trên thông tin trong `localStorage`).
    - **File:** `js/auth.js` (hàm `checkAuthentication`).

- **Hiển thị Thông tin Người dùng (Display User Info):**
    - **Mô tả:** Hiển thị tên người dùng trên giao diện.
    - **File:** `js/auth.js` (hàm `displayUserInfo`).

- **Đăng xuất (Logout):**
    - **Mô tả:** Xóa thông tin người dùng khỏi `localStorage` và chuyển hướng về trang đăng nhập.
    - **File:** `js/auth.js` (hàm `handleUserLogout`).

## 2. Quản lý Phiên Chat (Session Management)

- **Tải Lịch sử Phiên Chat (Load Sessions):**
    - **Mô tả:** Gọi API để lấy danh sách các phiên chat của người dùng hiện tại và hiển thị chúng trên sidebar lịch sử.
    - **File:** `js/chat/session.js` (hàm `loadChatSessions`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint:** `GET /api/ChatSessions/user/{userId}` (Xem `api.md`).

- **Bắt đầu Phiên Chat Mới (Start New Chat):**
    - **Mô tả:** Gửi yêu cầu tạo phiên chat mới đến backend, cập nhật trạng thái và giao diện người dùng.
    - **File:** `js/chat/session.js` (hàm `startNewChat`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint:** `POST /api/ChatSessions` (Xem `api.md`).

- **Chọn Phiên Chat (Select Session):**
    - **Mô tả:** Xử lý khi người dùng chọn một phiên chat từ sidebar lịch sử. Tải và hiển thị các tin nhắn của phiên đó.
    - **File:** `js/chat/session.js` (hàm `handleSelectSession`).
    - **Logic:** Gọi `loadSessionMessages`.

- **Xóa Phiên Chat (Delete Session):**
    - **Mô tả:** Gửi yêu cầu xóa một phiên chat đến backend và cập nhật giao diện.
    - **File:** `js/chat/session.js` (hàm `deleteSession`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint:** `DELETE /api/ChatSessions/{sessionId}` (Xem `api.md`).

- **Cập nhật Tiêu đề Phiên (Update Session Title):**
    - **Mô tả:** Tự động cập nhật tiêu đề của phiên chat dựa trên tin nhắn đầu tiên của người dùng (chỉ cập nhật phía client-side state và UI trong phiên bản hiện tại).
    - **File:** `js/chat/session.js` (hàm `addMessageToCurrentSession`, `updateCurrentSessionTitle`).
    - *Lưu ý: Việc cập nhật title lên backend chưa được triển khai rõ ràng trong code đã phân tích.*

## 3. Gửi/Nhận Tin Nhắn (Messaging)

- **Tải Tin nhắn của Phiên (Load Messages):**
    - **Mô tả:** Lấy danh sách các tin nhắn thuộc về một phiên chat cụ thể từ backend.
    - **File:** `js/chat/session.js` (hàm `loadSessionMessages`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint:** `GET /api/ChatMessages/session/{sessionId}` (Xem `api.md`).

- **Tải Tin nhắn Cũ hơn (Infinite Scroll):**
    - **Mô tả:** Khi người dùng cuộn lên đầu khu vực chat, tải thêm các tin nhắn cũ hơn của phiên hiện tại.
    - **File:** `js/chat/session.js` (hàm `loadOlderMessages`, listener trong `loadSessionMessages`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint:** `GET /api/ChatMessages/session/{sessionId}?beforeMessageId=...` (Xem `api.md`).

- **Gửi Tin nhắn Người dùng (Send User Message):**
    - **Mô tả:** Hiển thị tin nhắn của người dùng trên UI, lưu tin nhắn đó vào backend, và sau đó kích hoạt yêu cầu đến AI.
    - **File:** `js/chat/chat.js` (hàm `handleSendMessage`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint (Lưu tin nhắn):** `POST /api/ChatMessages` (Xem `api.md`).

- **Yêu cầu Phản hồi từ AI (Request AI Response):**
    - **Mô tả:** Gửi tin nhắn của người dùng đến Dify API để nhận phản hồi.
    - **File:** `js/chat/chat.js` (hàm `handleSendMessage`) -> `js/chat/api.js` (hàm `handleSseStream`).
    - **API Endpoint (Dify):** `POST https://trolyai.hub.edu.vn/v1/chat-messages` (Xem `api.md`, `config.md`).

- **Xử lý Phản hồi Streaming (Handle SSE):**
    - **Mô tả:** Nhận và xử lý dữ liệu Server-Sent Events (SSE) từ Dify, cập nhật giao diện người dùng một cách liên tục (incremental updates) khi AI đang "gõ".
    - **File:** `js/chat/api.js` (hàm `handleSseStream`).

- **Lưu Tin nhắn AI (Save AI Message):**
    - **Mô tả:** Sau khi nhận được toàn bộ phản hồi từ AI (kết thúc streaming), lưu tin nhắn đó vào backend.
    - **File:** `js/chat/chat.js` (callback trong `handleSseStream`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint (Lưu tin nhắn):** `POST /api/ChatMessages` (Xem `api.md`).

- **Hiển thị Tin nhắn trên UI (Display Messages):**
    - **Mô tả:** Render các tin nhắn (của người dùng và AI) thành các phần tử HTML và thêm vào khu vực chat. Hỗ trợ định dạng Markdown và highlight code.
    - **File:** `js/chat/ui.js` (hàm `addMessageToChat`), `js/chat/utils.js` (hàm `renderMessageElement`, `renderMarkdown`, `highlightCodeBlocks`).

## 4. Tương tác Giao diện (UI Interactions)

- **Xử lý Màn hình Chào mừng (Handle Welcome Screen):**
    - **Mô tả:** Hiển thị màn hình chào mừng ban đầu và xử lý khi người dùng nhấn nút "Bắt đầu trò chuyện".
    - **File:** `js/welcome-screen.js`, `js/chat/chat.js` (hàm `showWelcomeMessage`), `js/chat/ui.js` (hàm `showWelcomeScreen`, `hideWelcomeScreen`).

- **Quản lý Sidebar Lịch sử (Mobile/Desktop):**
    - **Mô tả:** Điều khiển việc hiển thị/ẩn sidebar lịch sử trên các kích thước màn hình khác nhau, bao gồm cả lớp phủ (overlay) trên mobile.
    - **File:** `js/ui-interactions.js`.

- **Hiệu ứng Nút (Ripple Effect):**
    - **Mô tả:** Thêm hiệu ứng gợn sóng khi người dùng nhấp vào các nút chính.
    - **File:** `js/ui-interactions.js`.

## 5. Nhận dạng Giọng nói (Speech Recognition)

- **Khởi tạo (Initialize):**
    - **Mô tả:** Kiểm tra khả năng tương thích của trình duyệt và thiết lập đối tượng `SpeechRecognition`.
    - **File:** `js/speech.js` (hàm `initSpeechRecognition`).

- **Bắt đầu/Dừng Ghi âm (Toggle Recording):**
    - **Mô tả:** Xử lý khi người dùng nhấn nút ghi âm để bắt đầu hoặc dừng quá trình nhận dạng giọng nói. Cập nhật UI tương ứng.
    - **File:** `js/speech.js` (hàm `toggleRecording`, `startRecording`, `stopRecording`), `js/chat/ui.js` (hàm `updateRecordingUI`).

- **Xử lý Kết quả (Process Results):**
    - **Mô tả:** Nhận dạng văn bản từ giọng nói (cả kết quả tạm thời và cuối cùng) và điền vào ô nhập tin nhắn.
    - **File:** `js/speech.js` (listener `onresult`). 