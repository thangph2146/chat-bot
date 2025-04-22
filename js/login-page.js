// js/login-page.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessageDiv = document.getElementById('errorMessage');
    const errorTextElement = document.getElementById('errorText'); // Get the span for error text
    const submitButton = document.getElementById('loginSubmitButton'); // Use specific ID
    const buttonText = submitButton ? submitButton.querySelector('.button-text') : null;
    const buttonSpinner = submitButton ? submitButton.querySelector('.button-spinner') : null;

    // Check for necessary elements
    if (!loginForm || !emailInput || !passwordInput || !errorMessageDiv || !errorTextElement || !submitButton || !buttonText || !buttonSpinner) {
        console.error("Login page UI elements not found. Initialization failed.");
        return;
    }

    // Đảm bảo hàm handleLogin đã được tải từ js/login.js
    if (typeof handleLogin !== 'function') {
        console.error("Lỗi nghiêm trọng: Hàm handleLogin() không tìm thấy. Đảm bảo js/login.js đã được tải trước js/login-page.js.");
        errorTextElement.textContent = 'Lỗi tải trang. Vui lòng thử lại.';
        errorMessageDiv.style.display = 'flex'; // Show error container
        submitButton.disabled = true;
        return;
    }

    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value.trim();

        errorMessageDiv.style.display = 'none';
        errorTextElement.textContent = '';

        if (!email || !password) {
            errorTextElement.textContent = 'Vui lòng nhập email và mật khẩu.';
            errorMessageDiv.style.display = 'flex'; // Show error container
            return;
        }

        // --- Xử lý trạng thái chờ --- 
        submitButton.disabled = true;
        buttonText.textContent = 'Đang xử lý...'; // Change text
        buttonSpinner.classList.remove('hidden'); // Show spinner

        // --- Gọi hàm handleLogin (API) --- 
        try {
            const loginResult = await handleLogin(email, password); // Call async handleLogin from login.js

            if (loginResult.success) {
                errorMessageDiv.style.display = 'none';
                // Optional: Show a success message briefly before redirecting
                buttonText.textContent = 'Thành công!';
                window.location.href = 'index.html';
            } else {
                // Login failed
                errorTextElement.textContent = loginResult.message || 'Email hoặc mật khẩu không đúng.';
                errorMessageDiv.style.display = 'flex'; // Show error container
                passwordInput.value = '';
                emailInput.focus();
                loginForm.classList.add('animate-shake');
                setTimeout(() => loginForm.classList.remove('animate-shake'), 500);
                // Reset button state
                submitButton.disabled = false;
                buttonText.textContent = 'Đăng nhập'; // Restore original text
                buttonSpinner.classList.add('hidden'); // Hide spinner
            }
        } catch (error) {
            // Unexpected error
            console.error("Unexpected error during login form submission:", error);
            errorTextElement.textContent = 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';
            errorMessageDiv.style.display = 'flex'; // Show error container
            // Reset button state
            submitButton.disabled = false;
            buttonText.textContent = 'Đăng nhập'; // Restore original text
            buttonSpinner.classList.add('hidden'); // Hide spinner
        }
    });
    
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

    // Cập nhật năm bản quyền (moved from inline script)
    const copyrightYearElement = document.getElementById('copyrightYear');
    if (copyrightYearElement) {
        copyrightYearElement.textContent = new Date().getFullYear();
    }
}); 