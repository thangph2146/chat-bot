import { handleRegister } from './register.js';
import { checkAuthentication } from '../chat/auth.js';

// *** Redirect if already logged in ***
if (checkAuthentication()) {
    console.log("[register-page.js] User already logged in. Redirecting to index.html...");
    window.location.href = 'index.html'; // Or your main chat page path
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("[register-page.js] DOMContentLoaded event fired.");
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

    // Lấy các phần tử modal
    const successModal = document.getElementById('successModal');
    const modalContent = successModal ? successModal.querySelector('.modal-content') : null;
    const modalOkButton = document.getElementById('modalOkButton');

    // Check for necessary elements (bao gồm cả modal)
    if (!registerForm || !fullNameInput || !emailInput || !passwordInput || !confirmPasswordInput || !errorMessageDiv || !errorTextElement || !submitButton || !buttonText || !buttonSpinner || !successModal || !modalContent || !modalOkButton) {
        console.error("[register-page.js] Register page UI elements (including modal) not found. Initialization failed.");
        return;
    }
    console.log("[register-page.js] All required UI elements found.");

    // Đảm bảo hàm handleRegister đã được tải
    if (typeof handleRegister !== 'function') {
        console.error("[register-page.js] CRITICAL ERROR: handleRegister() not found.");
        errorTextElement.textContent = 'Lỗi tải trang. Vui lòng thử lại.';
        errorMessageDiv.style.display = 'flex';
        submitButton.disabled = true;
        return;
    }
    console.log("[register-page.js] handleRegister function is available.");

    // Hàm hiển thị modal
    function showSuccessModal() {
        console.log("[register-page.js] Showing success modal.");
        if (!successModal || !modalContent) return;
        successModal.classList.remove('hidden');
        // Trigger reflow để animation hoạt động
        void successModal.offsetWidth;
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }

    // Hàm ẩn modal (không cần thiết nếu chỉ chuyển trang)
    // function hideSuccessModal() {
    //     if (!successModal || !modalContent) return;
    //     modalContent.classList.remove('scale-100', 'opacity-100');
    //     modalContent.classList.add('scale-95', 'opacity-0');
    //     setTimeout(() => {
    //         successModal.classList.add('hidden');
    //     }, 300); // Thời gian khớp với transition
    // }

    // Gắn sự kiện cho nút OK trên modal
    modalOkButton.addEventListener('click', () => {
        console.log("[register-page.js] OK button on modal clicked. Redirecting to login.html...");
        window.location.href = 'login.html'; // Chuyển hướng đến trang đăng nhập
    });

    registerForm.addEventListener('submit', async function(event) {
        console.log("[register-page.js] Register form submitted.");
        event.preventDefault();

        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        errorMessageDiv.style.display = 'none';
        errorTextElement.textContent = '';

        // --- Validation ---
        console.log("[register-page.js] Performing validation...");
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
        console.log("[register-page.js] Validation passed.");

        // --- Xử lý trạng thái chờ ---
        console.log("[register-page.js] Setting register button to loading state.");
        submitButton.disabled = true;
        buttonText.textContent = 'Đang xử lý...';
        buttonSpinner.classList.remove('hidden');
        errorMessageDiv.style.display = 'none';

        // --- Gọi hàm đăng ký (API) từ js/register.js ---
        try {
            console.log("[register-page.js] Calling handleRegister from register.js...");
            const registrationResult = await handleRegister(fullName, email, password, confirmPassword);
            console.log("[register-page.js] handleRegister result:", registrationResult);

            if (registrationResult.success) {
                 // Thay vì alert, hiển thị modal
                 showSuccessModal();
                 // Không cần reset nút vì modal sẽ che form và sau đó chuyển trang
            } else {
                // Registration failed
                console.error("[register-page.js] Registration failed:");
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
             console.error("[register-page.js] Unexpected error in registration form submission:", error);
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
    console.log("[register-page.js] DOMContentLoaded handler finished.");
}); 