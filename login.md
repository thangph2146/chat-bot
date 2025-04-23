# Chức Năng Đăng Nhập Bằng Email và Mật khẩu

Tài liệu này mô tả luồng hoạt động và mã nguồn liên quan đến chức năng đăng nhập người dùng bằng địa chỉ email và mật khẩu trong ứng dụng Trợ lý AI HUB.

## Luồng Hoạt động Chi tiết

1.  **Giao diện Người dùng (`login.html`):**
    *   Người dùng truy cập trang `login.html`.
    *   Trang hiển thị một form (`id="loginForm"`) yêu cầu nhập "Địa chỉ email" (`id="email"`) và "Mật khẩu" (`id="password"`).
    *   Có một nút "Đăng nhập" (`id="loginSubmitButton"`) để gửi thông tin.
    *   Một khu vực (`id="errorMessage"`) được dành riêng để hiển thị thông báo lỗi nếu đăng nhập thất bại.

2.  **Bắt Sự kiện và Validate Phía Client (`js/login/login-page.js`):**
    *   Khi DOM đã tải xong (`DOMContentLoaded`), script `login-page.js` sẽ chạy.
    *   Nó lấy các tham chiếu đến form, các ô input, nút submit, và vùng hiển thị lỗi.
    *   Một trình nghe sự kiện (`addEventListener`) được gắn vào sự kiện `submit` của `loginForm`.
    *   Khi người dùng nhấn nút "Đăng nhập":
        *   Sự kiện `submit` mặc định bị chặn (`event.preventDefault()`).
        *   Giá trị email và mật khẩu được lấy từ các ô input, được làm sạch (trim) và email được chuyển thành chữ thường.
        *   Kiểm tra cơ bản xem email và mật khẩu có được nhập hay không. Nếu thiếu, hiển thị lỗi và dừng lại.
        *   Giao diện người dùng được cập nhật để hiển thị trạng thái chờ: nút "Đăng nhập" bị vô hiệu hóa, văn bản đổi thành "Đang xử lý...", và một biểu tượng spinner được hiển thị. Vùng lỗi cũ (nếu có) được ẩn đi.

3.  **Gọi Hàm Xử lý Đăng nhập (`js/login/login.js`):**
    *   Hàm `handleLogin(email, password)` từ `login.js` được gọi (thông qua `await`) với email và mật khẩu đã được validate sơ bộ.

4.  **Gửi Yêu cầu đến Backend (`js/login/login.js`):**
    *   Bên trong `handleLogin`:
        *   Endpoint API đăng nhập (`AUTH_LOGIN_ENDPOINT` từ `config.js`) được xác định.
        *   Một đối tượng `requestBody` chứa `email` và `password` được tạo.
        *   Hàm `fetchWithAuth` (từ `api.js`) được sử dụng để gửi yêu cầu `POST` đến API endpoint với `requestBody`. Hàm này có thể tự động xử lý việc chuyển đổi body thành JSON và thêm các header cần thiết (như `Content-Type`). Nó cũng có thể xử lý việc thêm token xác thực nếu cần cho các API khác, nhưng có thể không cần thiết cho chính API đăng nhập.
        *   Hàm `fetchWithAuth` xử lý phản hồi từ API, bao gồm cả việc kiểm tra lỗi HTTP và phân tích cú pháp JSON.

5.  **Xử lý Phản hồi từ Backend (`js/login/login.js`):**
    *   Sau khi `fetchWithAuth` hoàn thành:
        *   **Trường hợp thành công:**
            *   Dữ liệu trả về (`responseData`) được kiểm tra cấu trúc (ví dụ: phải có `data.token` và `data.userId`).
            *   Nếu cấu trúc hợp lệ, toàn bộ `responseData` (chứa token và thông tin user) được chuyển đổi thành chuỗi JSON và lưu vào `localStorage` với key là `USER_DATA_KEY` (từ `auth.js`).
            *   Hàm `handleLogin` trả về `{ success: true }`. Nếu có lỗi khi lưu vào `localStorage`, nó vẫn trả về success nhưng có thể kèm thông báo.
        *   **Trường hợp thất bại (Lỗi API hoặc Lỗi Mạng):**
            *   Hàm `fetchWithAuth` sẽ ném ra lỗi (đã được chuẩn hóa với thuộc tính `message`).
            *   Khối `catch` trong `handleLogin` bắt lỗi này.
            *   Mọi dữ liệu người dùng cũ có thể đã lưu trong `localStorage` với `USER_DATA_KEY` sẽ bị xóa (`localStorage.removeItem`).
            *   Hàm `handleLogin` trả về `{ success: false, message: error.message }`.

6.  **Cập nhật Giao diện và Chuyển hướng (`js/login/login-page.js`):**
    *   Script `login-page.js` nhận kết quả (`loginResult`) từ `handleLogin`.
    *   **Nếu `loginResult.success` là `true`:**
        *   Vùng lỗi được ẩn.
        *   Nút submit có thể được cập nhật thành "Thành công!".
        *   Người dùng được chuyển hướng đến trang chính của ứng dụng (`window.location.href = 'index.html'`).
    *   **Nếu `loginResult.success` là `false`:**
        *   Thông báo lỗi (`loginResult.message` hoặc một thông báo mặc định) được hiển thị trong vùng `errorMessage`.
        *   Ô mật khẩu được xóa. Con trỏ được đặt lại vào ô email.
        *   Form có thể được thêm hiệu ứng rung lắc (`animate-shake`) để thu hút sự chú ý.
        *   Trạng thái chờ của nút submit được gỡ bỏ: nút được kích hoạt lại, văn bản trở lại "Đăng nhập", spinner bị ẩn.

## Ví dụ Mã nguồn Minh họa

**1. HTML Form (`login.html`)**

```html
<form id="loginForm" class="space-y-6">
    <div class="relative">
        <label for="email" class="sr-only">Email</label>
        <span class="absolute inset-y-0 left-0 flex items-center pl-3">
           <!-- Icon -->
        </span>
        <input type="email" id="email" name="email" required autocomplete="email"
               class="w-full pl-10 pr-4 py-3 border ..."
               placeholder="Địa chỉ email">
    </div>
    <div class="relative">
        <label for="password" class="sr-only">Mật khẩu</label>
        <span class="absolute inset-y-0 left-0 flex items-center pl-3">
            <!-- Icon -->
        </span>
        <input type="password" id="password" name="password" required autocomplete="current-password"
               class="w-full pl-10 pr-4 py-3 border ..."
               placeholder="Mật khẩu">
    </div>

    <div id="errorMessage" class="text-red-600 ..." style="display: none;">
        <svg><!-- Icon --></svg>
        <span id="errorText"></span>
    </div>

    <div>
        <button type="submit" id="loginSubmitButton"
                class="w-full mt-4 p-3 bg-primary-600 ...">
            <span class="button-text">Đăng nhập</span>
            <svg class="animate-spin h-5 w-5 ml-3 ... button-spinner hidden">
                <!-- Spinner SVG -->
            </svg>
        </button>
    </div>
</form>
```

**2. Xử lý sự kiện Submit (`js/login/login-page.js`)**

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // ... Lấy elements: loginForm, emailInput, passwordInput, errorMessageDiv, errorTextElement, submitButton, buttonText, buttonSpinner ...

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value.trim();

        errorMessageDiv.style.display = 'none';
        errorTextElement.textContent = '';

        if (!email || !password) {
            errorTextElement.textContent = 'Vui lòng nhập email và mật khẩu.';
            errorMessageDiv.style.display = 'flex';
            return;
        }

        // --- Hiển thị trạng thái chờ ---
        submitButton.disabled = true;
        buttonText.textContent = 'Đang xử lý...';
        buttonSpinner.classList.remove('hidden');

        try {
            const loginResult = await handleLogin(email, password); // Gọi hàm xử lý đăng nhập

            if (loginResult.success) {
                // --- Xử lý thành công ---
                errorMessageDiv.style.display = 'none';
                buttonText.textContent = 'Thành công!';
                window.location.href = 'index.html'; // Chuyển hướng
            } else {
                // --- Xử lý thất bại ---
                errorTextElement.textContent = loginResult.message || 'Email hoặc mật khẩu không đúng.';
                errorMessageDiv.style.display = 'flex';
                passwordInput.value = ''; // Xóa pass
                emailInput.focus(); // Focus lại email
                loginForm.classList.add('animate-shake'); // Rung lắc form
                setTimeout(() => loginForm.classList.remove('animate-shake'), 500);
                // Khôi phục nút
                submitButton.disabled = false;
                buttonText.textContent = 'Đăng nhập';
                buttonSpinner.classList.add('hidden');
            }
        } catch (error) {
            // --- Xử lý lỗi không mong muốn (vd: lỗi trong chính login-page.js) ---
            console.error("[login-page.js] Unexpected error during login form submission:", error);
            errorTextElement.textContent = 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';
            errorMessageDiv.style.display = 'flex';
            // Khôi phục nút
            submitButton.disabled = false;
            buttonText.textContent = 'Đăng nhập';
            buttonSpinner.classList.add('hidden');
        }
    });

    // ... Code khác: animation shake, copyright year ...
});
```

**3. Hàm Gửi Yêu cầu và Xử lý Phản hồi (`js/login/login.js`)**

```javascript
import { AUTH_LOGIN_ENDPOINT } from '../chat/config.js';
import { USER_DATA_KEY } from '../chat/auth.js';
import { fetchWithAuth } from '../chat/api.js';

export async function handleLogin(email, password) {
    console.log(`[login.js] Attempting login for email: ${email}`);
    const apiUrl = AUTH_LOGIN_ENDPOINT;
    const requestBody = {
        email: email,
        password: password
    };

    try {
        const responseData = await fetchWithAuth(apiUrl, {
            method: 'POST',
            body: requestBody
        });

        console.log('[login.js] API Login Success Data Received:', responseData);

        // --- Kiểm tra cấu trúc dữ liệu thành công ---
        if (!responseData || !responseData.data || !responseData.data.token || typeof responseData.data.userId === 'undefined') {
            console.error('[login.js] API response missing expected data structure (data.token, data.userId).', responseData);
            return { success: false, message: 'Dữ liệu đăng nhập trả về không hợp lệ.' };
        }

        // --- Lưu thông tin vào localStorage ---
        try {
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(responseData));
            console.log('[login.js] User data stored successfully.');
            return { success: true };
        } catch (storageError) {
            console.error('[login.js] Error storing login info to localStorage:', storageError);
            return { success: true, message: 'Đăng nhập thành công nhưng lỗi lưu phiên.' }; // Vẫn coi là success về mặt login API
        }

    } catch (error) {
        // --- Xử lý lỗi từ fetchWithAuth (lỗi mạng, lỗi API) ---
        console.error('[login.js] Login failed:', error);
        localStorage.removeItem(USER_DATA_KEY); // Đảm bảo xóa dữ liệu không hợp lệ
        return { success: false, message: error.message || 'Lỗi kết nối hoặc xử lý phía máy chủ.' };
    }
}
```

**4. Các Thành phần Phụ trợ (Giả định)**

*   **`js/chat/config.js`**: Export hằng số `AUTH_LOGIN_ENDPOINT` chứa URL của API đăng nhập backend.
*   **`js/chat/auth.js`**: Export hằng số `USER_DATA_KEY` (ví dụ: `'hub_user_data'`) là key dùng để lưu/đọc thông tin user trong `localStorage`. Cũng có thể chứa hàm `checkAuthentication` để kiểm tra trạng thái đăng nhập dựa trên `localStorage`.
*   **`js/chat/api.js`**: Export hàm `fetchWithAuth` để thực hiện các yêu cầu API, xử lý JSON, và chuẩn hóa lỗi.
