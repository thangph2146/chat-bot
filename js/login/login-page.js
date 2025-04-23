// js/login-page.js
import { handleLogin, handleGoogleLogin } from './login.js'; // Import the necessary functions
import { checkAuthentication } from '../chat/auth.js'; // Import checkAuthentication
import { GOOGLE_CLIENT_ID } from '../chat/config.js'; // Import Google Client ID

// *** Redirect if already logged in ***
if (checkAuthentication()) {
    console.log("[login-page.js] User already logged in. Redirecting to index.html...");
    window.location.href = 'index.html'; // Or your main chat page path
}

// Hàm callback xử lý khi Google trả về thông tin đăng nhập
async function handleGoogleCredentialResponse(response) {
    console.log("[login-page.js] Received Google Credential Response:", response);
    const idToken = response.credential;

    // Lấy các element UI để hiển thị trạng thái chờ/lỗi
    const errorMessageDiv = document.getElementById('errorMessage');
    const errorTextElement = document.getElementById('errorText');
    const googleSignInButtonDiv = document.getElementById('googleSignInButtonDiv'); // Div chứa nút Google

    if (!errorMessageDiv || !errorTextElement || !googleSignInButtonDiv) {
        console.error("[login-page.js] UI elements for Google Sign-In feedback not found.");
        alert("Lỗi giao diện, không thể xử lý đăng nhập Google.");
        return;
    }

    errorMessageDiv.style.display = 'none'; // Ẩn lỗi cũ
    errorTextElement.textContent = '';

    // --- Hiển thị trạng thái chờ (có thể thêm spinner vào div hoặc làm mờ nút) ---
    console.log("[login-page.js] Setting Google button to loading state.");
    googleSignInButtonDiv.style.opacity = '0.6';
    googleSignInButtonDiv.style.pointerEvents = 'none';
    errorTextElement.textContent = 'Đang xác thực với máy chủ...';
    errorMessageDiv.style.display = 'flex'; 
    errorMessageDiv.classList.remove('text-red-600'); // Bỏ màu đỏ lỗi
    errorMessageDiv.classList.add('text-blue-600'); // Màu xanh thông báo

    try {
        console.log("[login-page.js] Calling handleGoogleLogin from login.js...");
        const googleLoginResult = await handleGoogleLogin(idToken); // Gọi hàm từ login.js
        console.log("[login-page.js] handleGoogleLogin result:", googleLoginResult);

        if (googleLoginResult.success) {
            errorMessageDiv.style.display = 'none';
            console.log("[login-page.js] Google login successful. Redirecting to index.html...");
            window.location.href = 'index.html'; // Chuyển hướng khi thành công
        } else {
            // Lỗi từ backend
            console.error("[login-page.js] Google login failed (backend error):");
            errorTextElement.textContent = googleLoginResult.message || 'Đăng nhập bằng Google thất bại từ máy chủ.';
            errorMessageDiv.classList.remove('text-blue-600');
            errorMessageDiv.classList.add('text-red-600');
            errorMessageDiv.style.display = 'flex';
        }
    } catch (error) {
        console.error("[login-page.js] Error during Google login process:", error);
        errorTextElement.textContent = 'Lỗi kết nối hoặc xử lý phía máy chủ khi đăng nhập Google.';
        errorMessageDiv.classList.remove('text-blue-600');
        errorMessageDiv.classList.add('text-red-600');
        errorMessageDiv.style.display = 'flex';
    } finally {
        // --- Khôi phục trạng thái nút Google ---
        console.log("[login-page.js] Restoring Google button state.");
        googleSignInButtonDiv.style.opacity = '1';
        googleSignInButtonDiv.style.pointerEvents = 'auto';
        // Có thể ẩn thông báo chờ nếu không có lỗi
        if (errorMessageDiv.classList.contains('text-blue-600')) {
           errorMessageDiv.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("[login-page.js] DOMContentLoaded event fired.");
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessageDiv = document.getElementById('errorMessage');
    const errorTextElement = document.getElementById('errorText');
    const submitButton = document.getElementById('loginSubmitButton');
    const buttonText = submitButton ? submitButton.querySelector('.button-text') : null;
    const buttonSpinner = submitButton ? submitButton.querySelector('.button-spinner') : null;

    // Lấy div chứa nút Google (thay vì nút cũ)
    const googleSignInButtonDiv = document.getElementById('googleSignInButtonDiv');

    // Check for necessary elements (bỏ các element của nút Google cũ, thêm div mới)
    if (!loginForm || !emailInput || !passwordInput || !errorMessageDiv || !errorTextElement || !submitButton || !buttonText || !buttonSpinner || !googleSignInButtonDiv) {
        console.error("[login-page.js] Login page UI elements not found. Initialization failed.");
        if (errorTextElement && errorMessageDiv) {
            errorTextElement.textContent = 'Lỗi tải giao diện trang đăng nhập.';
            errorMessageDiv.style.display = 'flex';
        }
        return;
    }
    console.log("[login-page.js] All required UI elements found.");

    // Đảm bảo hàm handleLogin và handleGoogleLogin đã được tải
    if (typeof handleLogin !== 'function' || typeof handleGoogleLogin !== 'function') {
        console.error("[login-page.js] CRITICAL ERROR: handleLogin() or handleGoogleLogin() not found.");
        errorTextElement.textContent = 'Lỗi tải chức năng đăng nhập. Vui lòng thử lại.';
        errorMessageDiv.style.display = 'flex';
        submitButton.disabled = true;
        // Không cần disable nút Google vì nó được quản lý bởi thư viện
        return;
    }
    console.log("[login-page.js] handleLogin and handleGoogleLogin functions are available.");

    // --- Khởi tạo Google Sign In --- 
    // Đợi thư viện Google tải xong
    window.onload = function () {
      console.log("[login-page.js] window.onload event fired, initializing Google Sign-In...");
      try {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID, 
          callback: handleGoogleCredentialResponse // Hàm sẽ được gọi sau khi đăng nhập Google thành công
        });
        console.log("[login-page.js] Google Sign-In initialized.");
        
        // Render nút đăng nhập Google vào div đã chuẩn bị
        google.accounts.id.renderButton(
          googleSignInButtonDiv, // Element div để render nút vào
          { theme: "outline", size: "large", type: "standard", text: "signin_with", shape: "rectangular", logo_alignment: "left" }  // Tùy chỉnh giao diện nút
        );
        console.log("[login-page.js] Google Sign-In button rendered.");
        
        // Tùy chọn: Hiển thị One Tap prompt (đăng nhập nhanh nếu đã từng đăng nhập)
        // google.accounts.id.prompt(); 
      } catch (error) {
          console.error("[login-page.js] Error initializing Google Sign-In:", error);
          errorTextElement.textContent = 'Không thể khởi tạo đăng nhập Google. Vui lòng tải lại trang.';
          errorMessageDiv.style.display = 'flex';
      }
    };

    // --- Xử lý Submit Form Email/Password (giữ nguyên) --- 
    loginForm.addEventListener('submit', async function(event) {
        console.log("[login-page.js] Login form submitted.");
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

        console.log("[login-page.js] Setting login button to loading state.");
        submitButton.disabled = true;
        buttonText.textContent = 'Đang xử lý...';
        buttonSpinner.classList.remove('hidden');

        try {
            console.log("[login-page.js] Calling handleLogin from login.js...");
            const loginResult = await handleLogin(email, password);
            console.log("[login-page.js] handleLogin result:", loginResult);

            if (loginResult.success) {
                errorMessageDiv.style.display = 'none';
                buttonText.textContent = 'Thành công!';
                console.log("[login-page.js] Standard login successful. Redirecting to index.html...");
                window.location.href = 'index.html';
            } else {
                console.error("[login-page.js] Standard login failed:");
                errorTextElement.textContent = loginResult.message || 'Email hoặc mật khẩu không đúng.';
                errorMessageDiv.style.display = 'flex';
                passwordInput.value = '';
                emailInput.focus();
                loginForm.classList.add('animate-shake');
                setTimeout(() => loginForm.classList.remove('animate-shake'), 500);
                submitButton.disabled = false;
                buttonText.textContent = 'Đăng nhập';
                buttonSpinner.classList.add('hidden');
            }
        } catch (error) {
            console.error("[login-page.js] Unexpected error during login form submission:", error);
            errorTextElement.textContent = 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';
            errorMessageDiv.style.display = 'flex';
            submitButton.disabled = false;
            buttonText.textContent = 'Đăng nhập';
            buttonSpinner.classList.add('hidden');
        }
    });

    // --- Định nghĩa animation shake (giữ nguyên) --- 
    let shakeKeyframesDefined = false;
    for (const sheet of document.styleSheets) {
        try {
            for (const rule of sheet.cssRules) {
                if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name === 'shake') {
                    shakeKeyframesDefined = true;
                    break;
                }
            }
        } catch (e) { /* Ignore potential CORS errors */ }
        if (shakeKeyframesDefined) break;
    }
    if (!shakeKeyframesDefined) {
        const styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = `
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
          40%, 60% { transform: translate3d(3px, 0, 0); }
        }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        `;
        document.head.appendChild(styleSheet);
    }
    console.log("[login-page.js] Shake animation logic setup.");

    // Cập nhật năm bản quyền (giữ nguyên)
    const copyrightYearElement = document.getElementById('copyrightYear');
    if (copyrightYearElement) {
        copyrightYearElement.textContent = new Date().getFullYear();
    }
    console.log("[login-page.js] DOMContentLoaded handler finished.");
}); 