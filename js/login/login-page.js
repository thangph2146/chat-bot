// js/login-page.js
import { handleLogin, handleGoogleVerifyToken } from './login.js'; // Import hàm xác thực token mới
import { checkAuthentication } from '../chat/auth.js'; // Import checkAuthentication
import { GOOGLE_CLIENT_ID } from '../chat/config.js'; // Chỉ import Client ID

// *** Redirect if already logged in ***
if (checkAuthentication()) {
    window.location.href = 'index.html'; // Or your main chat page path
}

// --- Hàm Callback từ Google Sign-In --- 
async function handleGoogleCredentialResponse(response) {
    const idToken = response.credential;

    // --- Không cần giải mã idToken ở client nữa ---
    // let googleID = null;
    // let email = null;
    // try {
    //     // ... code giải mã cũ (KHÔNG AN TOÀN) ...
    // } catch (decodeError) {
    //     // ... xử lý lỗi giải mã cũ ...
    //     return;
    // }
    // --- Kết thúc phần giải mã không an toàn ---

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

    // --- Hiển thị trạng thái chờ --- 
    googleSignInButtonDiv.style.opacity = '0.6';
    googleSignInButtonDiv.style.pointerEvents = 'none';
    errorTextElement.textContent = 'Đang xác thực với máy chủ...';
    errorMessageDiv.style.display = 'flex'; 
    errorMessageDiv.classList.remove('text-red-600'); // Bỏ màu đỏ lỗi
    errorMessageDiv.classList.add('text-blue-600'); // Màu xanh thông báo

    try {
        // Gọi hàm trong login.js để gửi idToken về backend
        const verificationResult = await handleGoogleVerifyToken(idToken);

        if (verificationResult.success) {
            errorMessageDiv.style.display = 'none';
            window.location.href = 'index.html'; // Chuyển hướng khi thành công
        } else {
            // Lỗi từ backend (đã xác thực hoặc lỗi khác)
            console.error("[login-page.js] Google sign-in failed (backend error):");
            errorTextElement.textContent = verificationResult.message || 'Đăng nhập bằng Google thất bại từ máy chủ.';
            errorMessageDiv.classList.remove('text-blue-600');
            errorMessageDiv.classList.add('text-red-600');
            errorMessageDiv.style.display = 'flex';
        }
    } catch (error) {
        // Lỗi mạng hoặc lỗi không mong muốn khi gọi handleGoogleVerifyToken
        console.error("[login-page.js] Error during Google sign-in process:", error);
        errorTextElement.textContent = 'Lỗi kết nối hoặc xử lý phía máy chủ khi đăng nhập Google.';
        errorMessageDiv.classList.remove('text-blue-600');
        errorMessageDiv.classList.add('text-red-600');
        errorMessageDiv.style.display = 'flex';
    } finally {
        // --- Khôi phục trạng thái nút Google --- 
        googleSignInButtonDiv.style.opacity = '1';
        googleSignInButtonDiv.style.pointerEvents = 'auto';
        // Chỉ ẩn thông báo loading màu xanh, giữ lại nếu có lỗi màu đỏ
        if (errorMessageDiv.classList.contains('text-blue-600')) {
           errorMessageDiv.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessageDiv = document.getElementById('errorMessage');
    const errorTextElement = document.getElementById('errorText');
    const submitButton = document.getElementById('loginSubmitButton');
    const buttonText = submitButton ? submitButton.querySelector('.button-text') : null;
    const buttonSpinner = submitButton ? submitButton.querySelector('.button-spinner') : null;

    // Lấy div chứa nút Google (theo cập nhật html)
    const googleSignInButtonDiv = document.getElementById('googleSignInButtonDiv');

    // Check for necessary elements
    if (!loginForm || !emailInput || !passwordInput || !errorMessageDiv || !errorTextElement || !submitButton || !buttonText || !buttonSpinner || !googleSignInButtonDiv) {
        console.error("[login-page.js] Login page UI elements not found. Initialization failed.");
        if (errorTextElement && errorMessageDiv) {
            errorTextElement.textContent = 'Lỗi tải giao diện trang đăng nhập.';
            errorMessageDiv.style.display = 'flex';
        }
        return;
    }

    // Đảm bảo hàm handleLogin và handleGoogleVerifyToken đã được tải
    if (typeof handleLogin !== 'function' || typeof handleGoogleVerifyToken !== 'function') { // Kiểm tra hàm mới
        console.error("[login-page.js] CRITICAL ERROR: handleLogin() or handleGoogleVerifyToken() not found."); // Cập nhật thông báo lỗi
        errorTextElement.textContent = 'Lỗi tải chức năng đăng nhập. Vui lòng thử lại.';
        errorMessageDiv.style.display = 'flex';
        submitButton.disabled = true;
        // Không cần disable nút Google vì nó được quản lý bởi thư viện
        return;
    }

    // --- Khởi tạo Google Sign In --- 
    // Đặt trong window.onload để đảm bảo thư viện gsi đã tải xong và GOOGLE_CLIENT_ID đã sẵn sàng
    window.onload = function () {
      if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
          console.error("[login-page.js] Google Identity Services library (gsi) not loaded.");
          if (errorTextElement && errorMessageDiv) {
              errorTextElement.textContent = 'Không thể tải thư viện đăng nhập Google. Vui lòng kiểm tra kết nối mạng hoặc thử lại.';
              errorMessageDiv.style.display = 'flex';
          }
          return;
      }
      if (!GOOGLE_CLIENT_ID) {
          console.error("[login-page.js] GOOGLE_CLIENT_ID is not defined or imported.");
          if (errorTextElement && errorMessageDiv) {
              errorTextElement.textContent = 'Lỗi cấu hình phía client (Client ID).';
              errorMessageDiv.style.display = 'flex';
          }
          return;
      }
      try {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID, 
          callback: handleGoogleCredentialResponse // Hàm sẽ được gọi sau khi đăng nhập Google thành công
        });
        
        // Render nút đăng nhập Google vào div đã chuẩn bị
        google.accounts.id.renderButton(
          googleSignInButtonDiv, // Element div để render nút vào
          { theme: "outline", size: "large", type: "standard", text: "signin_with", shape: "rectangular", logo_alignment: "left" }  // Tùy chỉnh giao diện nút
        );
        
        // Tùy chọn: Hiển thị One Tap prompt (đăng nhập nhanh nếu đã từng đăng nhập)
        // google.accounts.id.prompt(); 
      } catch (error) {
          console.error("[login-page.js] Error initializing Google Sign-In:", error);
          if (errorTextElement && errorMessageDiv) {
             errorTextElement.textContent = 'Không thể khởi tạo đăng nhập Google. Vui lòng tải lại trang hoặc kiểm tra cấu hình console.';
             errorMessageDiv.style.display = 'flex';
          }
      }
    };

    // --- Xử lý Submit Form Email/Password (giữ nguyên logic cũ) --- 
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

        submitButton.disabled = true;
        buttonText.textContent = 'Đang xử lý...';
        buttonSpinner.classList.remove('hidden');

        try {
            const loginResult = await handleLogin(email, password);

            if (loginResult.success) {
                errorMessageDiv.style.display = 'none';
                buttonText.textContent = 'Thành công!';
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

    // Cập nhật năm bản quyền (giữ nguyên)
    const copyrightYearElement = document.getElementById('copyrightYear');
    if (copyrightYearElement) {
        copyrightYearElement.textContent = new Date().getFullYear();
    }
}); 