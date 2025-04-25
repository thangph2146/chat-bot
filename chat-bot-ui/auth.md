# Tài Liệu Cấu Hình Bảo Mật (Frontend)

Tài liệu này mô tả các khía cạnh bảo mật của giao diện người dùng Chat Bot, dựa trên mã nguồn JavaScript (`js/`) và các tài liệu liên quan (`api.md`, `config.md`, `actions.md`).

## 1. Cơ Chế Xác thực (Authentication Mechanism)

- **Phương thức chính:** Đăng nhập thông qua Google Sign-In.
- **Luồng hoạt động:**
    1.  **Client-Side (Google):** Người dùng nhấn nút đăng nhập Google. Thư viện Google Sign-In (`js/login/login-page.js`) xử lý việc hiển thị cửa sổ popup/chuyển hướng của Google và nhận về một `idToken` sau khi người dùng xác thực thành công với Google.
    2.  **Client-Side (Backend Verification):** `idToken` này được gửi từ client (`js/login/login.js` -> `handleGoogleVerifyToken`) đến backend API (`POST /api/auth/google/verify` - xem `api.md`).
    3.  **Backend:** Backend chịu trách nhiệm xác thực `idToken` này với Google. Nếu hợp lệ, backend tạo hoặc xác thực người dùng trong hệ thống của mình và trả về một JSON Web Token (JWT) dành riêng cho ứng dụng Chat Bot.
    4.  **Client-Side (Session Storage):** JWT token và thông tin người dùng (userId, fullName, email) nhận được từ backend được lưu vào `localStorage` dưới key `hub_user_data` (`js/login/login.js`, `js/auth.js`).
- **Kiểm tra trước khi tải (Pre-Auth Check):** Script `js/pre-auth-check.js` chạy trước khi tải trang chính, kiểm tra sự tồn tại và tính hợp lệ cơ bản của token trong `localStorage`. Nếu không có token hợp lệ, người dùng bị chuyển hướng đến trang đăng nhập.

## 2. Phân quyền (Authorization)

- **Cơ chế:** Việc phân quyền (quyết định người dùng được phép làm gì) chủ yếu được **xử lý bởi Backend API**.
- **Vai trò Frontend:** Frontend gửi JWT token (lấy từ `localStorage`) trong header `Authorization: Bearer <token>` của mỗi yêu cầu API đến backend (thông qua hàm `fetchWithAuth` trong `js/chat/api.js`).
- **Giới hạn Frontend:** Không có logic phân quyền phức tạp (ví dụ: dựa trên vai trò) được thực hiện rõ ràng ở phía frontend dựa trên phân tích code hiện tại. Frontend giả định rằng nếu người dùng có token hợp lệ, họ có quyền truy cập các chức năng chat cơ bản.

## 3. Quản lý Phiên (Session Management)

- **Đại diện Phiên:** Phiên đăng nhập của người dùng được đại diện bởi JWT token lưu trong `localStorage`.
- **Thời hạn Phiên:** Thời hạn của phiên được quyết định bởi thời gian hết hạn (expiration) của JWT token, do backend cấp phát. Frontend không tự quản lý thời gian hết hạn một cách chủ động.
- **Xử lý Hết hạn/Token không hợp lệ:** Hàm `fetchWithAuth` (`js/chat/api.js`) tự động kiểm tra response status `401 Unauthorized` từ backend. Khi nhận được lỗi này, nó sẽ:
    - Xóa dữ liệu người dùng khỏi `localStorage` (`localStorage.removeItem(USER_DATA_KEY)`).
    - Hiển thị thông báo lỗi cho người dùng.
    - Chuyển hướng người dùng về trang đăng nhập (`window.location.href = '/'`).
- **Đăng xuất:** Hành động đăng xuất (`js/auth.js` -> `handleUserLogout`) xóa rõ ràng dữ liệu người dùng khỏi `localStorage` và chuyển hướng người dùng.

## 4. Bảo mật API

- **Xác thực Lệnh gọi API Backend:** Tất cả các lệnh gọi đến API backend (trừ endpoint xác thực Google ban đầu) đều yêu cầu JWT token hợp lệ được gửi trong header `Authorization: Bearer <token>` (được xử lý tự động bởi `fetchWithAuth`).
- **Giao thức:** URL cơ sở API (`API_BASE_URL` trong `config.js`) sử dụng `HTTPS` (`https://chatbotapi.hub.edu.vn/api`), đảm bảo mã hóa dữ liệu truyền đi giữa client và server.

## 5. Bảo mật Dịch vụ Bên thứ Ba

- **Google Sign-In:**
    - Sử dụng `GOOGLE_CLIENT_ID` (`config.js`) để định danh ứng dụng với Google.
    - Phụ thuộc vào cơ chế bảo mật của Google cho quá trình đăng nhập ban đầu.
    - `idToken` được gửi về backend để xác thực phía server, giảm nguy cơ giả mạo token phía client.
- **Dify API:**
    - **RỦI RO CAO:** `DIFY_API_KEY` (`config.js`) hiện đang được lưu trữ và sử dụng trực tiếp trong mã nguồn frontend (`js/chat/api.js` -> `handleSseStream`). Điều này làm **lộ khóa API** cho bất kỳ ai xem mã nguồn trang web.
    - **Khuyến nghị:** Khóa API Dify **KHÔNG BAO GIỜ** được để trong mã nguồn frontend. Cần triển khai một **endpoint proxy trên backend API**: Frontend gọi đến endpoint proxy này, và backend sẽ thêm `DIFY_API_KEY` một cách an toàn trước khi chuyển tiếp yêu cầu đến Dify.

## 6. Bảo mật Phía Client (Client-Side Security)

- **Cross-Site Scripting (XSS):**
    - **Nguồn tiềm ẩn:** Việc render nội dung do AI tạo ra (có thể chứa Markdown và code) bằng `innerHTML` (`js/chat/api.js` -> `handleSseStream`, `js/chat/ui.js` -> `addMessageToChat`, `js/chat/utils.js` -> `renderMessageElement`).
    - **Biện pháp giảm thiểu:** Hàm `renderMarkdown` (`js/chat/utils.js`) có logic sử dụng thư viện `MarkedJS` và kiểm tra sự tồn tại của `DOMPurify` để sanitize HTML output. **Tuy nhiên, nếu `DOMPurify` không được tải hoặc cấu hình sai, nguy cơ XSS vẫn tồn tại.**
    - **Khuyến nghị:** Đảm bảo `DOMPurify` luôn được tải và cấu hình đúng cách. Kiểm tra kỹ lưỡng output của `renderMarkdown`.
- **Lưu trữ Token (`localStorage`):**
    - **Rủi ro:** `localStorage` dễ bị tấn công XSS. Nếu mã độc được tiêm vào trang, nó có thể đọc JWT token từ `localStorage` và đánh cắp phiên của người dùng.
    - **Biện pháp thay thế (Cân nhắc):** Sử dụng `sessionStorage` (token mất khi đóng tab) hoặc HttpOnly cookies (không thể truy cập bằng JavaScript phía client, an toàn hơn trước XSS, nhưng yêu cầu backend hỗ trợ).

## 7. Khuyến Nghị Bảo Mật Chung

1.  **Quan trọng nhất:** **Di chuyển Dify API Key khỏi frontend.** Tạo một endpoint proxy trên backend để gọi Dify API một cách an toàn.
2.  **Đảm bảo `DOMPurify` hoạt động:** Xác minh rằng thư viện `DOMPurify` luôn được tải và sử dụng hiệu quả để sanitize HTML được render từ Markdown, đặc biệt là từ nội dung do AI tạo ra.
3.  **Xem xét lại việc lưu trữ Token:** Đánh giá lại rủi ro của việc sử dụng `localStorage` cho JWT token và cân nhắc các phương án thay thế như HttpOnly cookies.
4.  **Rate Limiting & Input Validation (Backend):** Mặc dù không thuộc phạm vi frontend, cần đảm bảo backend có các biện pháp rate limiting và input validation chặt chẽ cho tất cả các endpoint API.
5.  **Cập nhật Thư viện:** Thường xuyên cập nhật các thư viện frontend (MarkedJS, DOMPurify, Google Sign-In client) lên phiên bản mới nhất để vá các lỗ hổng bảo mật đã biết.
