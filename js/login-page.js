// js/login-page.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessageDiv = document.getElementById('errorMessage');
    const submitButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    const originalButtonText = submitButton ? submitButton.textContent : 'Đăng nhập';

    // Đảm bảo hàm handleLogin đã được tải từ js/login.js
    if (typeof handleLogin !== 'function') {
        console.error("Lỗi nghiêm trọng: Hàm handleLogin() không tìm thấy. Đảm bảo js/login.js đã được tải trước js/login-page.js.");
        if(errorMessageDiv) {
            errorMessageDiv.textContent = 'Lỗi tải trang. Vui lòng thử lại.';
            errorMessageDiv.style.display = 'block';
        }
        if(submitButton) submitButton.disabled = true;
        return; // Dừng lại nếu hàm cốt lõi bị thiếu
    }

    if (loginForm && submitButton) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const email = emailInput.value.trim().toLowerCase();
            const password = passwordInput.value.trim();

            errorMessageDiv.style.display = 'none';
            errorMessageDiv.textContent = '';

            if (!email || !password) {
                errorMessageDiv.textContent = 'Vui lòng nhập email và mật khẩu.';
                errorMessageDiv.style.display = 'block';
                return;
            }

            // --- Xử lý trạng thái chờ --- 
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang đăng nhập...
            `;

            // --- Gọi hàm handleLogin (API) --- 
            try {
                const loginResult = await handleLogin(email, password); // Call async handleLogin from login.js

                if (loginResult.success) {
                    errorMessageDiv.style.display = 'none';
                    window.location.href = 'index.html';
                } else {
                    errorMessageDiv.textContent = loginResult.message || 'Email hoặc mật khẩu không đúng.';
                    errorMessageDiv.style.display = 'block';
                    passwordInput.value = '';
                    emailInput.focus();
                    loginForm.classList.add('animate-shake');
                    setTimeout(() => loginForm.classList.remove('animate-shake'), 500);
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            } catch (error) {
                console.error("Unexpected error during login form submission:", error);
                errorMessageDiv.textContent = 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';
                errorMessageDiv.style.display = 'block';
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
    
    // --- Định nghĩa animation shake (nếu chưa có) --- 
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
}); 