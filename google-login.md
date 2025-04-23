# Kế hoạch Triển khai Chức năng Đăng nhập bằng Google (Chú trọng Bảo mật & Ví dụ Code)

Tài liệu này mô tả các bước cần thiết để tích hợp chức năng đăng nhập bằng Google vào ứng dụng web, tập trung vào luồng xác thực **an toàn** và cung cấp các ví dụ mã nguồn cụ thể cho cấu trúc dự án hiện tại.

**Nguyên tắc Bảo mật Chính:**

**A. Bảo mật Frontend:**

*   **Không bao giờ chứa Client Secret:** `GOOGLE_CLIENT_SECRET` không bao giờ được xuất hiện trong mã nguồn frontend (HTML/JS) hoặc bất kỳ tài nguyên nào có thể truy cập từ trình duyệt.
*   **Chỉ sử dụng Client ID:** Frontend chỉ cần `GOOGLE_CLIENT_ID` để khởi tạo thư viện Google Identity Services.
*   **Không giải mã/tin tưởng idToken:** Frontend chỉ nhận `idToken` từ Google và chuyển tiếp nguyên vẹn về backend. **Không** thực hiện giải mã hay dựa vào thông tin từ token chưa được xác thực ở backend.
*   **Sử dụng HTTPS:** Mọi giao tiếp với backend và Google phải qua HTTPS.
*   **Content Security Policy (CSP):** Triển khai CSP header mạnh mẽ để giới hạn nguồn script (chỉ cho phép từ domain của bạn và `accounts.google.com`), ngăn chặn XSS.
*   **Lưu trữ Session An toàn:** Khi nhận được token/session ID của *ứng dụng* từ backend:
    *   **JWT:** Lưu vào `localStorage` hoặc `sessionStorage` nếu cần truy cập bằng JavaScript, nhưng nhận thức được nguy cơ XSS có thể đánh cắp token.
    *   **Session ID (Cookie):** Ưu tiên sử dụng cookie với cờ `HttpOnly`, `Secure`, và `SameSite=Lax` (hoặc `Strict`) do backend thiết lập. Điều này ngăn JavaScript truy cập cookie, giảm thiểu rủi ro XSS đánh cắp session.
*   **Xử lý Lỗi An toàn:** Thông báo lỗi cho người dùng không tiết lộ chi tiết kỹ thuật.

**B. Bảo mật Backend:**

*   **Lưu trữ An toàn Credentials:** `GOOGLE_CLIENT_ID` và đặc biệt là `GOOGLE_CLIENT_SECRET` phải được lưu trữ an toàn (biến môi trường, vault, secret manager), không commit vào mã nguồn.
*   **Bắt buộc Xác thực idToken:** Đây là bước **quan trọng nhất**. Sử dụng thư viện Google phía server để xác minh:
    *   **Chữ ký:** Đảm bảo token thực sự do Google cấp và không bị sửa đổi.
    *   **Audience (`aud`):** Phải khớp chính xác với `GOOGLE_CLIENT_ID` của ứng dụng bạn.
    *   **Issuer (`iss`):** Phải là của Google (`https://accounts.google.com` hoặc `accounts.google.com`).
    *   **Thời gian hết hạn (`exp`):** Đảm bảo token chưa hết hạn.
*   **Chống Tấn công Replay (nếu cần):** Mặc dù `idToken` có thời gian hết hạn ngắn, đối với ứng dụng yêu cầu bảo mật cực cao, có thể lưu trữ `jti` (JWT ID) của các token đã xử lý trong một khoảng thời gian ngắn để ngăn việc sử dụng lại cùng một token.
*   **Sử dụng HTTPS:** Toàn bộ API phải hoạt động trên HTTPS.
*   **Tạo Session/Token An toàn:** Khi tạo session/token của ứng dụng sau khi xác thực Google thành công:
    *   **Session ID:** Sử dụng ID đủ mạnh, ngẫu nhiên.
    *   **JWT:** Ký token bằng thuật toán mạnh (vd: RS256), sử dụng khóa bí mật mạnh và quản lý khóa an toàn.
*   **Bảo vệ Chống CSRF:** Triển khai các biện pháp chống CSRF (vd: Synchronizer Token Pattern, Double Submit Cookie) cho các endpoint yêu cầu phiên đăng nhập (ngoại trừ endpoint xác thực Google ban đầu nếu nó không dùng session cookie).
*   **Rate Limiting:** Áp dụng giới hạn truy cập cho endpoint xác thực Google để chống brute-force.
*   **Input Validation:** Xác thực mọi dữ liệu đầu vào cho API (dù trong trường hợp này chỉ là `idToken`, việc xác thực cấu trúc vẫn cần thiết).
*   **Security Headers:** Thiết lập các HTTP Security Header quan trọng từ backend (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP nếu quản lý tập trung).
*   **Cập nhật Dependencies:** Thường xuyên quét và cập nhật các thư viện (bao gồm cả thư viện xác thực Google) để vá lỗi bảo mật.

**Luồng Xác thực An toàn Đề xuất:**

1.  **Frontend (HTTPS):** Người dùng nhấp nút.
2.  **Frontend (HTTPS):** Gọi thư viện Google (`google.accounts.id`).
3.  **Google:** Người dùng xác thực.
4.  **Google -> Frontend (HTTPS):** Nhận `idToken`.
5.  **Frontend -> Backend (HTTPS):** Gửi **nguyên vẹn `idToken`** về endpoint xác thực.
6.  **Backend:** Nhận `idToken`.
7.  **Backend (Quan trọng):** **Xác minh đầy đủ** `idToken` (chữ ký, `aud`, `iss`, `exp`). Nếu lỗi -> 401.
8.  **Backend:** Trích xuất thông tin user từ token **đã xác thực**.
9.  **Backend:** Tìm/Tạo user trong DB.
10. **Backend:** Tạo session/token **an toàn** của ứng dụng.
11. **Backend -> Frontend (HTTPS):** Trả về session/token ứng dụng.
12. **Frontend:** Lưu trữ session/token **an toàn** và chuyển hướng.

## Phase 1: Cấu hình Google Cloud Platform

1.  **Truy cập Google Cloud Console:** [https://console.cloud.google.com/](https://console.cloud.google.com/)
2.  **Tạo/Chọn Dự án:** Tạo một dự án mới hoặc chọn dự án hiện có.
3.  **Kích hoạt APIs:**
    *   Vào "APIs & Services" -> "Library".
    *   Tìm và kích hoạt "Identity Platform".
4.  **Tạo OAuth 2.0 Client ID:**
    *   Vào "APIs & Services" -> "Credentials".
    *   Nhấp "Create Credentials" -> "OAuth client ID".
    *   Chọn "Application type" là "Web application".
    *   Đặt tên (ví dụ: "Web Client for HUB AI Assistant").
    *   **Cấu hình "Authorized JavaScript origins":**
        *   **Quan trọng:** Thêm **chính xác** tất cả các địa chỉ URL (bao gồm schema `http`/`https` và port) mà frontend của bạn sẽ chạy.
        *   Ví dụ:
            *   `http://localhost:xxxx`
            *   `http://127.0.0.1:xxxx`
            *   `https://your-production-domain.com`
    *   **Cấu hình "Authorized redirect URIs":** (Thường không bắt buộc cho luồng này).
    *   Nhấp "Create".
5.  **Lưu Credentials:**
    *   Ghi lại **Client ID**. Sử dụng trong `config.js` frontend và backend.
    *   Ghi lại **Client Secret**. **BẢO MẬT TUYỆT ĐỐI**. **CHỈ SỬ DỤNG VÀ LƯU TRỮ AN TOÀN TRÊN BACKEND** (ví dụ: biến môi trường, vault). **KHÔNG BAO GIỜ** đưa vào mã nguồn frontend hoặc commit vào Git.

## Phase 2: Triển khai Frontend (An toàn) với Ví dụ Code

1.  **Cập nhật `js/chat/config.js`:**

    ```javascript
    // js/chat/config.js
    export const API_BASE_URL = 'http://172.20.10.44:8055/api'; // Hoặc URL production

    // ... các endpoint khác ...

    // --- Google Sign-In --- 
    // Lấy từ Google Cloud Console
    export const GOOGLE_CLIENT_ID = "197433305936-sffe02eu5jecf94m1oh1rn6igrosv6f3.apps.googleusercontent.com"; 

    // Endpoint Backend để xác thực idToken (Ví dụ)
    export const AUTH_GOOGLE_VERIFY_ENDPOINT = `${API_BASE_URL}/auth/google/verify`; 

    // !!! TUYỆT ĐỐI KHÔNG export GOOGLE_CLIENT_SECRET ở đây !!!
    ```

2.  **Cập nhật `login.html`:**

    ```html
    <!-- Trong <head> -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <!-- Link tới CSS, bao gồm css/login.css -->
    <link rel="stylesheet" href="css/login.css">

    <!-- Trong <body> -->
    <!-- ... form đăng nhập email/pass ... -->

    <div class="relative my-6 h-px bg-secondary-200">
        <!-- ... "Hoặc đăng nhập với" ... -->
    </div>

    <div>
        <!-- Div này sẽ chứa nút Google Sign-In -->
        <div id="googleSignInButtonDiv" class="flex justify-center"></div>
    </div>

    <!-- Element hiển thị lỗi chung (bao gồm cả lỗi Google Sign-In) -->
    <div id="errorMessage" class="text-red-600 text-sm ..." style="display: none;">
        <svg>...</svg>
        <span id="errorText"></span>
    </div>

    <!-- ... liên kết "Đăng ký ngay", copyright ... -->

    <!-- Script chính cho trang login -->
    <script type="module" src="js/login/login-page.js"></script>
    ```

3.  **Cập nhật `js/login/login-page.js`:**

    ```javascript
    // js/login/login-page.js
    import { handleLogin, handleGoogleVerifyToken } from './login.js'; // Import hàm xác thực token mới
    import { checkAuthentication } from '../chat/auth.js';
    import { GOOGLE_CLIENT_ID } from '../chat/config.js'; // Chỉ import Client ID

    // *** Redirect if already logged in ***
    if (checkAuthentication()) {
        window.location.href = 'index.html';
    }

    // --- Hàm Callback từ Google Sign-In --- 
    async function handleGoogleCredentialResponse(response) {
        console.log("[login-page.js] Received Google Credential Response");
        const idToken = response.credential;

        const errorMessageDiv = document.getElementById('errorMessage');
        const errorTextElement = document.getElementById('errorText');
        const googleSignInButtonDiv = document.getElementById('googleSignInButtonDiv');

        if (!errorMessageDiv || !errorTextElement || !googleSignInButtonDiv) {
            console.error("[login-page.js] UI elements for Google Sign-In feedback not found.");
            return;
        }

        errorMessageDiv.style.display = 'none';
        errorTextElement.textContent = '';

        // Hiển thị trạng thái chờ
        googleSignInButtonDiv.style.opacity = '0.6';
        googleSignInButtonDiv.style.pointerEvents = 'none';
        errorTextElement.textContent = 'Đang xác thực với máy chủ...';
        errorMessageDiv.style.display = 'flex';
        errorMessageDiv.classList.remove('text-red-600');
        errorMessageDiv.classList.add('text-blue-600');

        try {
            console.log("[login-page.js] Calling handleGoogleVerifyToken with idToken...");
            // Gọi hàm trong login.js để gửi idToken về backend
            const verificationResult = await handleGoogleVerifyToken(idToken);
            console.log("[login-page.js] handleGoogleVerifyToken result:", verificationResult);

            if (verificationResult.success) {
                errorMessageDiv.style.display = 'none';
                console.log("[login-page.js] Google sign-in successful. Redirecting...");
                window.location.href = 'index.html'; // Chuyển hướng
            } else {
                // Lỗi từ backend (đã xác thực hoặc lỗi khác)
                errorTextElement.textContent = verificationResult.message || 'Đăng nhập bằng Google thất bại.';
                errorMessageDiv.classList.remove('text-blue-600');
                errorMessageDiv.classList.add('text-red-600');
                errorMessageDiv.style.display = 'flex';
            }
        } catch (error) {
            // Lỗi mạng hoặc lỗi không mong muốn khi gọi handleGoogleVerifyToken
            console.error("[login-page.js] Error during Google sign-in process:", error);
            errorTextElement.textContent = 'Lỗi kết nối hoặc xử lý phía máy chủ.';
            errorMessageDiv.classList.remove('text-blue-600');
            errorMessageDiv.classList.add('text-red-600');
            errorMessageDiv.style.display = 'flex';
        } finally {
            // Khôi phục trạng thái nút
            googleSignInButtonDiv.style.opacity = '1';
            googleSignInButtonDiv.style.pointerEvents = 'auto';
            if (errorMessageDiv.classList.contains('text-blue-600')) {
               errorMessageDiv.style.display = 'none';
            }
        }
    }

    // --- Khởi tạo khi DOM sẵn sàng --- 
    document.addEventListener('DOMContentLoaded', () => {
        const loginForm = document.getElementById('loginForm');
        const googleSignInButtonDiv = document.getElementById('googleSignInButtonDiv');
        const errorMessageDiv = document.getElementById('errorMessage');
        const errorTextElement = document.getElementById('errorText');
        // ... lấy các element khác của form email/pass ...

        if (!loginForm || !googleSignInButtonDiv /* ... */) {
             console.error("[login-page.js] UI elements not found.");
             return;
        }

        // --- Xử lý Submit Form Email/Password --- 
        loginForm.addEventListener('submit', async (event) => {
            // ... code xử lý đăng nhập bằng email/password như cũ ...
        });

        // --- Khởi tạo Google Sign In --- 
        // Nên đặt trong window.onload để đảm bảo thư viện gsi đã tải xong
        window.onload = function () {
          console.log("[login-page.js] Initializing Google Sign-In...");
          try {
            google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID, 
              callback: handleGoogleCredentialResponse // Hàm xử lý khi có idToken
            });
            google.accounts.id.renderButton(
              googleSignInButtonDiv, // Render vào div đã chuẩn bị
              { theme: "outline", size: "large", type: "standard", text: "signin_with" /* ... các tùy chọn khác */ }
            );
            // google.accounts.id.prompt(); // Optional: One Tap prompt
            console.log("[login-page.js] Google Sign-In initialized and button rendered.");
          } catch (error) {
              console.error("[login-page.js] Error initializing Google Sign-In:", error);
              if (errorTextElement && errorMessageDiv) {
                   errorTextElement.textContent = 'Không thể khởi tạo đăng nhập Google. Vui lòng tải lại trang hoặc kiểm tra cấu hình.';
                   errorMessageDiv.style.display = 'flex';
              }
          }
        };
        
        // ... code xử lý animation shake, copyright year ... 
    });
    ```

4.  **Cập nhật `js/login/login.js`:**

    ```javascript
    // js/login/login.js
    import { AUTH_LOGIN_ENDPOINT, AUTH_GOOGLE_VERIFY_ENDPOINT } from '../chat/config.js';
    import { USER_DATA_KEY } from '../chat/auth.js'; 
    import { fetchWithAuth } from '../chat/api.js'; 

    // ... các hàm checkLoginStatus, handleLogin (email/pass), handleLogout ... giữ nguyên ...

    /**
     * Gửi idToken nhận từ Google về backend để xác thực và đăng nhập.
     * @param {string} idToken Chuỗi JWT nhận từ Google.
     * @returns {Promise<{success: boolean, message?: string}>}
     */
    export async function handleGoogleVerifyToken(idToken) {
        console.log('[login.js] Sending idToken to backend for verification...');
        const apiUrl = AUTH_GOOGLE_VERIFY_ENDPOINT;
        const requestBody = { idToken: idToken };

        try {
            // Sử dụng fetchWithAuth hoặc fetch thường tùy thuộc API backend có yêu cầu 
            // token nào khác không (thường là không cho endpoint này)
            const responseData = await fetchWithAuth(apiUrl, {
                method: 'POST',
                body: requestBody,
                // Có thể cần xóa header Authorization nếu fetchWithAuth tự thêm vào
                // headers: { 'Authorization': undefined } 
            });

            console.log('[login.js] Backend verification response:', responseData);

            // Giả sử backend trả về cấu trúc tương tự khi đăng nhập thành công
            if (!responseData || !responseData.data || !responseData.data.token || typeof responseData.data.userId === 'undefined') {
                console.error('[login.js] Backend Google verification response missing expected structure.', responseData);
                // Trả về lỗi từ backend nếu có, hoặc lỗi chung
                const message = responseData?.message || responseData?.error || 'Xác thực Google thất bại từ máy chủ.';
                return { success: false, message: message };
            }

            // Đăng nhập thành công từ backend
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(responseData));
            console.log('[login.js] User data from Google sign-in stored successfully.');
            return { success: true };

        } catch (error) {
            // Lỗi mạng hoặc lỗi từ fetchWithAuth
            console.error('[login.js] Error sending idToken to backend:', error);
            localStorage.removeItem(USER_DATA_KEY); // Xóa session cũ nếu có lỗi
            return { success: false, message: error.message || 'Lỗi kết nối đến máy chủ xác thực.' };
        }
    }

    // Xóa hàm handleGoogleLogin cũ (nếu nó xử lý theo cách không an toàn)
    ```

## Phase 3: Triển khai Backend (An toàn) với Ví dụ Khái niệm

*(Ví dụ sử dụng Node.js và `google-auth-library`)*

1.  **Cài đặt thư viện:** `npm install google-auth-library`
2.  **Lưu trữ Credentials:**
    *   Trong file `.env`: `GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`
    *   Sử dụng `dotenv`: `require('dotenv').config();`
3.  **Tạo Endpoint (ví dụ với Express):**

    ```javascript
    // Ví dụ backend/routes/auth.js (sử dụng Express)
    const express = require('express');
    const { OAuth2Client } = require('google-auth-library');
    const router = express.Router();

    // Lấy Client ID từ biến môi trường
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    // Endpoint: POST /api/auth/google/verify 
    router.post('/google/verify', async (req, res) => {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ message: 'idToken is required.' });
        }

        try {
            // Xác thực idToken
            const ticket = await client.verifyIdToken({
                idToken: idToken,
                audience: GOOGLE_CLIENT_ID, // Chỉ định audience là Client ID của bạn
            });
            
            const payload = ticket.getPayload();
            
            // --- Xác thực thành công --- 
            const googleUserId = payload['sub'];
            const email = payload['email'];
            const name = payload['name'];
            const picture = payload['picture'];
            const emailVerified = payload['email_verified'];

            console.log('Google User Verified:', { googleUserId, email, name });

            // TODO: Xử lý logic tìm hoặc tạo user trong DB của bạn
            // const user = await findOrCreateUser({ googleId: googleUserId, email, name, picture });
            const user = { id: 'mock_user_id_123', email: email, fullName: name }; // << Thay bằng logic DB thật

            // TODO: Tạo session/token của ứng dụng bạn
            // const appToken = generateAppToken(user.id);
            const appToken = 'mock_app_token_abc'; // << Thay bằng logic token thật

            // Trả về token của ứng dụng và thông tin user cần thiết
            res.status(200).json({
                message: 'Google sign-in successful.',
                data: {
                    token: appToken,
                    userId: user.id, // ID người dùng trong hệ thống của bạn
                    fullName: user.fullName,
                    email: user.email
                    // ... các thông tin khác nếu cần
                }
            });

        } catch (error) {
            // Lỗi xác thực token (không hợp lệ, hết hạn, sai audience...)
            console.error('Error verifying Google idToken:', error);
            res.status(401).json({ message: 'Invalid Google token or authentication failed.' });
        }
    });

    module.exports = router;
    ```

## Phase 4: Tích hợp và Kiểm thử

*(Giữ nguyên như phiên bản trước, tập trung kiểm thử luồng an toàn và các trường hợp lỗi)*

## Phase 5: Rà soát Bảo mật và Tinh chỉnh

*(Giữ nguyên như phiên bản trước, đảm bảo tuân thủ tất cả các nguyên tắc bảo mật)* 