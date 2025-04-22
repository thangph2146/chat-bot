/**
 * Gửi yêu cầu đăng ký người dùng mới đến API.
 * @param {string} fullName
 * @param {string} email
 * @param {string} password
 * @param {string} confirmPassword // Thêm confirmPassword vào tham số
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleRegister(fullName, email, password, confirmPassword) {
    const apiUrl = 'http://172.20.10.44:8055/api/Users/register'; // API Endpoint

    const requestBody = {
        fullName: fullName,
        email: email,
        password: password,
        confirmPassword: confirmPassword // API yêu cầu cả confirmPassword
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Thêm các headers khác nếu API yêu cầu (ví dụ: API Key)
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            // Đăng ký thành công (thường là status 200 hoặc 201)
            console.log('API Register Success:', email);
            return { success: true };
        } else {
            // Xử lý lỗi từ API
            let errorMessage = `Lỗi ${response.status}: ${response.statusText || 'Không thể đăng ký'}`;
            try {
                const errorData = await response.json(); // Thử parse lỗi JSON từ body
                // Giả sử API trả về lỗi trong trường 'message' hoặc tương tự
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
                // Không thể parse JSON lỗi, giữ nguyên lỗi status
                console.warn('Could not parse error JSON from API', parseError);
            }
            console.error('API Register Error:', errorMessage);
            return { success: false, message: errorMessage };
        }
    } catch (error) {
        // Lỗi mạng hoặc lỗi trong quá trình fetch
        console.error('Network or fetch error during registration:', error);
        return { success: false, message: 'Lỗi kết nối mạng hoặc không thể gửi yêu cầu đăng ký.' };
    }
}

// --- Gắn sự kiện và xử lý form khi DOM đã sẵn sàng ---
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const errorMessageDiv = document.getElementById('errorMessage');
    const submitButton = registerForm ? registerForm.querySelector('button[type="submit"]') : null;
    const originalButtonText = submitButton ? submitButton.textContent : 'Đăng ký';

    if (registerForm && submitButton) {
        registerForm.addEventListener('submit', async function(event) { // Make event listener async
            event.preventDefault();

            const fullName = fullNameInput.value.trim();
            const email = emailInput.value.trim().toLowerCase();
            const password = passwordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();

            errorMessageDiv.style.display = 'none';
            errorMessageDiv.textContent = '';

            // --- Validation --- 
            if (!fullName || !email || !password || !confirmPassword) {
                errorMessageDiv.textContent = 'Vui lòng nhập đầy đủ thông tin.';
                errorMessageDiv.style.display = 'block';
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                 errorMessageDiv.textContent = 'Định dạng email không hợp lệ.';
                 errorMessageDiv.style.display = 'block';
                 emailInput.focus();
                 return;
            }

            if (password.length < 6) {
                errorMessageDiv.textContent = 'Mật khẩu phải có ít nhất 6 ký tự.';
                errorMessageDiv.style.display = 'block';
                passwordInput.focus();
                return;
            }

            if (password !== confirmPassword) {
                errorMessageDiv.textContent = 'Mật khẩu xác nhận không khớp.';
                errorMessageDiv.style.display = 'block';
                confirmPasswordInput.focus();
                confirmPasswordInput.value = '';
                passwordInput.value = '';
                registerForm.classList.add('animate-shake');
                setTimeout(() => registerForm.classList.remove('animate-shake'), 500);
                return;
            }

            // --- Xử lý trạng thái chờ (Loading State) --- 
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xử lý...
            `;
            errorMessageDiv.style.display = 'none'; // Ẩn lỗi cũ khi bắt đầu gọi API

            // --- Gọi hàm đăng ký (API) --- 
            try {
                const registrationResult = await handleRegister(fullName, email, password, confirmPassword);

                if (registrationResult.success) {
                    alert('Đăng ký thành công! Bạn sẽ được chuyển đến trang đăng nhập.');
                    window.location.href = 'login.html'; // Chuyển hướng
                    // Không cần reset button ở đây vì đã chuyển trang
                } else {
                    errorMessageDiv.textContent = registrationResult.message || 'Đăng ký không thành công. Vui lòng thử lại.';
                    errorMessageDiv.style.display = 'block';
                    // Focus vào trường có lỗi
                    if (registrationResult.message && registrationResult.message.toLowerCase().includes('email')) {
                        emailInput.select();
                    } else {
                        fullNameInput.focus();
                    }
                    registerForm.classList.add('animate-shake');
                    setTimeout(() => registerForm.classList.remove('animate-shake'), 500);
                    // Reset button về trạng thái cũ khi có lỗi
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            } catch (error) {
                 // Lỗi không mong muốn trong quá trình xử lý await
                 console.error("Unexpected error in form submission:", error);
                 errorMessageDiv.textContent = 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';
                 errorMessageDiv.style.display = 'block';
                 // Reset button về trạng thái cũ
                 submitButton.disabled = false;
                 submitButton.textContent = originalButtonText;
            }
        });
    }

    // --- Định nghĩa animation shake (nếu chưa có trong tailwind) --- 
    // Kiểm tra xem keyframes đã tồn tại chưa để tránh thêm nhiều lần
    let shakeKeyframesDefined = false;
    for (const sheet of document.styleSheets) {
        try {
            for (const rule of sheet.cssRules) {
                if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name === 'shake') {
                    shakeKeyframesDefined = true;
                    break;
                }
            }
        } catch (e) {
             // Có thể lỗi CORS nếu CSS từ domain khác, bỏ qua
        }
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