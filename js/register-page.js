document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const errorMessageDiv = document.getElementById('errorMessage');
    const errorTextElement = document.getElementById('errorText');
    const submitButton = document.getElementById('registerSubmitButton');
    const buttonText = submitButton ? submitButton.querySelector('.button-text') : null;
    const buttonSpinner = submitButton ? submitButton.querySelector('.button-spinner') : null;

    // Check for necessary elements
    if (!registerForm || !fullNameInput || !emailInput || !passwordInput || !confirmPasswordInput || !errorMessageDiv || !errorTextElement || !submitButton || !buttonText || !buttonSpinner) {
        console.error("Register page UI elements not found. Initialization failed.");
        return;
    }

    // Đảm bảo hàm handleRegister đã được tải từ js/register.js
    if (typeof handleRegister !== 'function') {
        console.error("Lỗi nghiêm trọng: Hàm handleRegister() không tìm thấy. Đảm bảo js/register.js đã được tải trước js/register-page.js.");
        errorTextElement.textContent = 'Lỗi tải trang. Vui lòng thử lại.';
        errorMessageDiv.style.display = 'flex';
        submitButton.disabled = true;
        return;
    }

    registerForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        errorMessageDiv.style.display = 'none';
        errorTextElement.textContent = '';

        // --- Validation ---
        if (!fullName || !email || !password || !confirmPassword) {
            errorTextElement.textContent = 'Vui lòng nhập đầy đủ thông tin.';
            errorMessageDiv.style.display = 'flex';
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
             errorTextElement.textContent = 'Định dạng email không hợp lệ.';
             errorMessageDiv.style.display = 'flex';
             emailInput.focus();
             return;
        }
        if (password.length < 6) {
            errorTextElement.textContent = 'Mật khẩu phải có ít nhất 6 ký tự.';
            errorMessageDiv.style.display = 'flex';
            passwordInput.focus();
            return;
        }
        if (password !== confirmPassword) {
            errorTextElement.textContent = 'Mật khẩu xác nhận không khớp.';
            errorMessageDiv.style.display = 'flex';
            confirmPasswordInput.focus();
            confirmPasswordInput.value = '';
            passwordInput.value = '';
            registerForm.classList.add('animate-shake');
            setTimeout(() => registerForm.classList.remove('animate-shake'), 500);
            return;
        }

        // --- Xử lý trạng thái chờ ---
        submitButton.disabled = true;
        buttonText.textContent = 'Đang xử lý...';
        buttonSpinner.classList.remove('hidden');
        errorMessageDiv.style.display = 'none';

        // --- Gọi hàm đăng ký (API) từ js/register.js ---
        try {
            const registrationResult = await handleRegister(fullName, email, password, confirmPassword);

            if (registrationResult.success) {
                 alert('Đăng ký thành công! Bạn sẽ được chuyển đến trang đăng nhập.');
                 window.location.href = 'login.html';
            } else {
                // Registration failed
                errorTextElement.textContent = registrationResult.message || 'Đăng ký không thành công. Vui lòng thử lại.';
                errorMessageDiv.style.display = 'flex';
                if (registrationResult.message && registrationResult.message.toLowerCase().includes('email')) {
                    emailInput.select();
                } else {
                    fullNameInput.focus();
                }
                registerForm.classList.add('animate-shake');
                setTimeout(() => registerForm.classList.remove('animate-shake'), 500);
                // Reset button state
                submitButton.disabled = false;
                buttonText.textContent = 'Đăng ký';
                buttonSpinner.classList.add('hidden');
            }
        } catch (error) {
             // Unexpected error
             console.error("Unexpected error in registration form submission:", error);
             errorTextElement.textContent = 'Đã xảy ra lỗi không mong muốn khi gửi yêu cầu. Vui lòng thử lại.';
             errorMessageDiv.style.display = 'flex';
             // Reset button state
             submitButton.disabled = false;
             buttonText.textContent = 'Đăng ký';
             buttonSpinner.classList.add('hidden');
        }
    });

    // --- Định nghĩa animation shake ---
    let shakeKeyframesDefined = false;
    for (const sheet of document.styleSheets) {
        try {
            for (const rule of sheet.cssRules) {
                if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name === 'shake') {
                    shakeKeyframesDefined = true;
                    break;
                }
            }
        } catch (e) { /* Ignore */ }
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

    // Cập nhật năm bản quyền
    const copyrightYearElement = document.getElementById('copyrightYear');
    if (copyrightYearElement) {
        copyrightYearElement.textContent = new Date().getFullYear();
    }
}); 