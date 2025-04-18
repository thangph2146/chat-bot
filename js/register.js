/**
 * register.js - JavaScript cho trang đăng ký 
 * Xử lý các sự kiện và logic trang đăng ký (register.html)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo các element
    const registerForm = document.getElementById('registerForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');
    const registerButton = registerForm.querySelector('button[type="submit"]');
    const googleRegisterButton = document.querySelector('button.flex.items-center.justify-center.gap-3');
    const loginLink = document.querySelector('a[href="#"]');

    // Khởi tạo đường dẫn cho link "Đăng nhập"
    loginLink.href = 'login.html';

    // Cấu hình toggle password cho trường mật khẩu
    AuthUtils.setupPasswordToggle('password', 'togglePassword');
    AuthUtils.setupPasswordToggle('confirmPassword', 'toggleConfirmPassword');

    // Thêm hiệu ứng ripple cho các nút
    AuthUtils.addRippleEffect('button');

    // Kiểm tra nếu đã đăng nhập
    const authData = AuthUtils.getAuthData();
    if (authData) {
        // Nếu đã đăng nhập thì chuyển đến trang chatbot
        AuthUtils.redirect('chatbot.html');
        return;
    }

    // Hiển thị độ mạnh mật khẩu
    const passwordStrengthEl = document.createElement('div');
    passwordStrengthEl.className = 'password-strength mt-1 text-xs hidden';
    passwordInput.parentNode.appendChild(passwordStrengthEl);

    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        if (password) {
            // Kiểm tra độ mạnh mật khẩu
            const strength = AuthUtils.checkPasswordStrength(password);
            
            // Hiển thị độ mạnh mật khẩu
            passwordStrengthEl.classList.remove('hidden', 'text-red-500', 'text-yellow-500', 'text-green-500');
            
            if (strength === 'weak') {
                passwordStrengthEl.className = 'password-strength mt-1 text-xs text-red-500';
                passwordStrengthEl.textContent = 'Mật khẩu yếu';
                passwordInput.classList.add('border-red-500');
                passwordInput.classList.remove('border-yellow-500', 'border-green-500');
            } else if (strength === 'medium') {
                passwordStrengthEl.className = 'password-strength mt-1 text-xs text-yellow-500';
                passwordStrengthEl.textContent = 'Mật khẩu trung bình';
                passwordInput.classList.add('border-yellow-500');
                passwordInput.classList.remove('border-red-500', 'border-green-500');
            } else {
                passwordStrengthEl.className = 'password-strength mt-1 text-xs text-green-500';
                passwordStrengthEl.textContent = 'Mật khẩu mạnh';
                passwordInput.classList.add('border-green-500');
                passwordInput.classList.remove('border-red-500', 'border-yellow-500');
            }
        } else {
            passwordStrengthEl.classList.add('hidden');
            passwordInput.classList.remove('border-red-500', 'border-yellow-500', 'border-green-500');
        }
    });

    // Kiểm tra trùng khớp mật khẩu
    confirmPasswordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value) {
            if (confirmPasswordInput.value !== passwordInput.value) {
                confirmPasswordInput.classList.add('border-red-500');
                confirmPasswordInput.classList.remove('border-green-500');
                confirmPasswordInput.setCustomValidity('Mật khẩu không khớp');
            } else {
                confirmPasswordInput.classList.remove('border-red-500');
                confirmPasswordInput.classList.add('border-green-500');
                confirmPasswordInput.setCustomValidity('');
            }
        } else {
            confirmPasswordInput.classList.remove('border-red-500', 'border-green-500');
            confirmPasswordInput.setCustomValidity('');
        }
    });

    // Thêm sự kiện validate cho trường email
    emailInput.addEventListener('blur', () => {
        if (emailInput.value && !AuthUtils.validateEmail(emailInput.value)) {
            emailInput.classList.add('border-red-500');
            emailInput.setCustomValidity('Email không hợp lệ');
        } else {
            emailInput.classList.remove('border-red-500');
            emailInput.setCustomValidity('');
        }
    });

    // Thêm sự kiện validate cho trường họ tên
    fullNameInput.addEventListener('blur', () => {
        if (fullNameInput.value && fullNameInput.value.trim().length < 3) {
            fullNameInput.classList.add('border-red-500');
            fullNameInput.setCustomValidity('Họ tên phải có ít nhất 3 ký tự');
        } else {
            fullNameInput.classList.remove('border-red-500');
            fullNameInput.setCustomValidity('');
        }
    });

    // Xử lý đăng ký
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Kiểm tra hợp lệ
        if (!fullNameInput.value || !emailInput.value || !passwordInput.value || !confirmPasswordInput.value) {
            AuthUtils.showNotification('Vui lòng nhập đầy đủ thông tin đăng ký', 'warning');
            return;
        }

        if (!AuthUtils.validateEmail(emailInput.value)) {
            AuthUtils.showNotification('Email không hợp lệ', 'error');
            return;
        }

        if (AuthUtils.checkPasswordStrength(passwordInput.value) === 'weak') {
            AuthUtils.showNotification('Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.', 'warning');
            return;
        }

        if (passwordInput.value !== confirmPasswordInput.value) {
            AuthUtils.showNotification('Mật khẩu xác nhận không khớp', 'error');
            return;
        }

        if (!termsCheckbox.checked) {
            AuthUtils.showNotification('Vui lòng đồng ý với Điều khoản dịch vụ', 'warning');
            return;
        }
        
        // Hiển thị loading
        registerButton.disabled = true;
        const originalButtonText = registerButton.innerHTML;
        registerButton.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Đang xử lý...';
        
        // Lấy dữ liệu
        const fullName = fullNameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        
        try {
            // Gọi API đăng ký (giả lập)
            const response = await AuthUtils.callAPI('/api/auth/register', {
                fullName,
                email,
                password
            });
            
            // Xử lý đăng ký thành công
            if (response.success) {
                // Lưu token
                AuthUtils.saveAuthData(response.data.token, {
                    email: email,
                    userId: response.data.userId,
                    fullName: fullName
                });
                
                // Hiển thị thông báo thành công
                AuthUtils.showNotification('Đăng ký thành công!', 'success', 1500);
                
                // Chuyển hướng sang trang chatbot
                AuthUtils.redirect('chatbot.html', 1500);
            } else {
                throw new Error('Đăng ký không thành công');
            }
        } catch (error) {
            // Xử lý lỗi
            console.error('Lỗi đăng ký:', error);
            AuthUtils.showNotification('Đăng ký thất bại. Vui lòng thử lại sau.', 'error');
            
            // Khôi phục nút
            registerButton.disabled = false;
            registerButton.innerHTML = originalButtonText;
        }
    });

    // Xử lý đăng ký với Google
    googleRegisterButton.addEventListener('click', async () => {
        AuthUtils.showNotification('Đang chuyển hướng đến trang đăng ký với Google...', 'info');
        
        // Thêm hiệu ứng loading
        googleRegisterButton.disabled = true;
        const originalButtonText = googleRegisterButton.innerHTML;
        googleRegisterButton.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-secondary-800 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Đang kết nối...';
        
        try {
            // Giả lập API đăng ký với Google
            setTimeout(() => {
                // Lưu dữ liệu đăng ký mẫu
                AuthUtils.saveAuthData('google_oauth_token_123456', {
                    email: 'user@example.com',
                    userId: 'google_user_123',
                    fullName: 'Google User',
                    provider: 'google'
                });
                
                // Chuyển hướng sang trang chatbot
                AuthUtils.redirect('chatbot.html');
            }, 2000);
        } catch (error) {
            console.error('Lỗi đăng ký Google:', error);
            AuthUtils.showNotification('Đăng ký bằng Google thất bại. Vui lòng thử lại sau.', 'error');
            
            // Khôi phục nút
            googleRegisterButton.disabled = false;
            googleRegisterButton.innerHTML = originalButtonText;
        }
    });

    // Tự động focus vào trường họ tên khi trang tải xong
    fullNameInput.focus();
}); 