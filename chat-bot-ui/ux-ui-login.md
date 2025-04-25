# Trải nghiệm và Giao diện Người dùng (UX/UI) - Trang Đăng nhập

Tài liệu này mô tả chi tiết về trải nghiệm (UX) và giao diện (UI) của trang đăng nhập (`login.html`) trong ứng dụng Chat Bot, dựa trên mã nguồn (`login.html`, `js/login/login-page.js`) và các tài liệu liên quan.

## 1. Mục Đích và Phương Thức Đăng nhập

- **Mục đích:** Xác thực người dùng để cho phép truy cập vào giao diện chat chính (`index.html`).
- **Phương thức:** Hiện tại, phương thức đăng nhập duy nhất được hỗ trợ và hiển thị là **Đăng nhập bằng Google (Google Sign-In)**. Các phương thức khác như Email/Password đã bị loại bỏ khỏi giao diện.

## 2. Cấu Trúc và Bố Cục Trang (`login.html`)

- **Bố cục chính:** Trang sử dụng Flexbox để căn giữa một thẻ (card) chứa nội dung đăng nhập trên toàn bộ màn hình (`min-h-screen`).
- **Nền:** Sử dụng gradient màu chuyển tiếp nhẹ nhàng (từ `primary-50` qua `secondary-50` đến `white`) làm nền trang.
- **Thẻ Đăng nhập:**
    - Nền trắng, bo góc (`rounded-2xl`), có bóng đổ (`shadow-2xl`) và đường viền trên màu chính (`border-t-4 border-primary-600`).
    - Có hiệu ứng xuất hiện mờ dần (`animate-fade-in`).
    - **Thành phần bên trong:**
        - **Logo:** Hiển thị logo của HUB (`logo/logo.png`) ở vị trí trung tâm trên cùng, có hiệu ứng phóng to nhẹ khi hover.
        - **Tiêu đề chào mừng:** `<h2>` "Chào mừng bạn đến với trợ lý AI Tuyển Sinh".
        - **Khu vực Thông báo Lỗi:** Một `div` (`#errorMessage`, `#errorText`) ẩn ban đầu, dùng để hiển thị các thông báo lỗi hoặc trạng thái chờ trong quá trình đăng nhập. Có biểu tượng SVG đi kèm.
        - **Nút Đăng nhập Google:** Một `div` (`#googleSignInButtonDiv`) dùng làm container để thư viện Google Sign-In tự động render nút đăng nhập chuẩn của Google.
        - **Thông điệp bổ sung:** `<h2>` "Đăng nhập ngay để được tư vấn bởi trợ lý AI Tuyển Sinh".
        - **Footer:** Thông tin bản quyền và năm hiện tại (cập nhật tự động bằng JavaScript).
- **Fonts và Styling:**
    - Sử dụng font `Inter` từ Google Fonts.
    - Sử dụng **Tailwind CSS** mạnh mẽ cho hầu hết việc tạo bố cục và styling.
    - Có tham chiếu đến `css/login.css` cho các tùy chỉnh CSS bổ sung (nếu có) và `css/tailwind.config.js` để định nghĩa các màu `primary`, `secondary`, v.v.
- **Responsive:** Trang được thiết kế để responsive (thích ứng với các kích thước màn hình khác nhau) thông qua việc sử dụng Tailwind CSS và thẻ `<meta name="viewport">`.

## 3. Luồng Người dùng (User Flow) - Đăng nhập Google

1.  **Truy cập trang:** Người dùng mở `login.html`.
2.  **Kiểm tra đăng nhập ngầm:** Script `js/login/login-page.js` kiểm tra ngay xem người dùng đã có phiên đăng nhập hợp lệ trong `localStorage` chưa (`checkAuthentication`). Nếu có, người dùng được **tự động chuyển hướng** đến `index.html` mà không cần tương tác.
3.  **Khởi tạo Google Sign-In:**
    - Thư viện Google (`accounts.google.com/gsi/client`) được tải.
    - Script `js/login/login-page.js` (trong `window.onload`) sử dụng `GOOGLE_CLIENT_ID` để khởi tạo dịch vụ và chỉ định hàm `handleGoogleCredentialResponse` làm callback.
    - Nút đăng nhập chuẩn của Google được render vào `div#googleSignInButtonDiv`.
    - *Xử lý lỗi:* Nếu thư viện Google hoặc Client ID không tải được, một thông báo lỗi sẽ hiển thị trong khu vực `#errorMessage`.
4.  **Tương tác người dùng:** Người dùng nhấp vào nút "Sign in with Google".
5.  **Xác thực Google:** Google xử lý cửa sổ popup hoặc chuyển hướng để người dùng chọn tài khoản và xác thực.
6.  **Callback thành công (Google):** Sau khi xác thực Google thành công, hàm `handleGoogleCredentialResponse` (`js/login/login-page.js`) được gọi với `idToken`.
7.  **Xác thực Backend:**
    - **Phản hồi UI:** Giao diện chuyển sang trạng thái chờ (xem mục 4).
    - Hàm `handleGoogleVerifyToken` (`js/login/login.js`) được gọi, gửi `idToken` đến `POST /api/auth/google/verify`.
8.  **Kết quả Xác thực Backend:**
    - **Thành công:** Backend trả về JWT token và thông tin người dùng. Dữ liệu được lưu vào `localStorage`. Người dùng được **chuyển hướng** đến `index.html`.
    - **Thất bại:** Backend trả về lỗi (ví dụ: token không hợp lệ, lỗi server). Một thông báo lỗi được hiển thị trên UI (xem mục 4). Giao diện trở lại trạng thái bình thường.

## 4. Phản hồi Giao diện (UI Feedback)

Trang đăng nhập cung cấp các phản hồi trực quan cho người dùng trong quá trình đăng nhập:

- **Trạng thái Chờ (Loading):**
    - **Kích hoạt:** Khi `handleGoogleCredentialResponse` bắt đầu gửi `idToken` về backend.
    - **Hiển thị:**
        - Khu vực `#errorMessage` hiển thị với nội dung "Đang xác thực với máy chủ...".
        - Màu chữ của thông báo này được đổi thành màu xanh dương (`text-blue-600`) để phân biệt với lỗi.
        - Nút Google trong `#googleSignInButtonDiv` (thực tế là div chứa nó) trở nên mờ (`opacity-0.6`) và không thể nhấp (`pointerEvents-none`).
- **Trạng thái Lỗi:**
    - **Kích hoạt:** Khi khởi tạo Google Sign-In thất bại, hoặc khi xác thực backend (`handleGoogleVerifyToken`) trả về lỗi, hoặc có lỗi mạng.
    - **Hiển thị:**
        - Khu vực `#errorMessage` hiển thị với nội dung lỗi cụ thể (từ backend hoặc thông báo lỗi chung).
        - Màu chữ của thông báo lỗi là màu đỏ (`text-red-600`).
        - Nút Google trở lại trạng thái bình thường (không mờ, có thể nhấp).
- **Trạng thái Thành công:**
    - **Hiển thị:** Người dùng được chuyển hướng ngay lập tức đến `index.html`. Không có thông báo thành công hiển thị trên trang `login.html`.

## 5. Tính khả dụng và Trải nghiệm Chung

- **Đơn giản hóa:** Loại bỏ form Email/Password giúp tập trung vào phương thức đăng nhập chính là Google, làm giảm sự phức tạp cho người dùng.
- **Rõ ràng:** Sử dụng logo và tiêu đề rõ ràng để định danh ứng dụng.
- **Phản hồi tốt:** Cung cấp trạng thái chờ và thông báo lỗi giúp người dùng hiểu điều gì đang xảy ra.
- **Hiện đại:** Sử dụng Tailwind CSS và thiết kế thẻ (card) mang lại cảm giác hiện đại.
- **Tự động chuyển hướng:** Việc tự động chuyển hướng nếu đã đăng nhập giúp tiết kiệm thời gian cho người dùng quay lại. 