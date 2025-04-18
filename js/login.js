/**
 * login.js - JavaScript cho trang đăng nhập 
 * Xử lý các sự kiện và logic trang đăng nhập (login.html)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo các element
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberCheckbox = document.getElementById('remember');
    const loginButton = document.querySelector('button[type="submit"]');
    const googleLoginButton = document.querySelector('.btn-google');
    const forgotPasswordLink = document.querySelector('a[href="forgotpassword.html"]');

    // Kiểm tra nếu đã đăng nhập
    if (isLoggedIn()) {
        // Nếu đã đăng nhập thì chuyển đến trang chatbot
        redirect('chatbot.html');
        return;
    }

    // Tải Google API JavaScript nếu nút đăng nhập Google tồn tại
    if (googleLoginButton) {
        loadGoogleAPI();
    }

    // Cấu hình toggle password
    const togglePassword = document.getElementById('password-toggle');
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Cập nhật icon
            const eyeOpen = togglePassword.querySelector('.eye-open');
            const eyeClosed = togglePassword.querySelector('.eye-closed');
            
            if (eyeOpen && eyeClosed) {
                eyeOpen.classList.toggle('hidden');
                eyeClosed.classList.toggle('hidden');
            }
        });
    }

    // Thêm hiệu ứng ripple cho các nút
    document.querySelectorAll('.btn-primary, .btn-google').forEach(button => {
        button.classList.add('relative', 'overflow-hidden');
        
        button.addEventListener('click', function(e) {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.className = 'absolute bg-white bg-opacity-30 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none';
            ripple.style.width = ripple.style.height = `${Math.max(rect.width, rect.height) * 2}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Thêm sự kiện validate cho trường email
    emailInput.addEventListener('blur', () => {
        if (emailInput.value && !validateEmail(emailInput.value)) {
            emailInput.classList.add('border-red-500');
            emailInput.setCustomValidity('Email không hợp lệ');
        } else {
            emailInput.classList.remove('border-red-500');
            emailInput.setCustomValidity('');
        }
    });

    // Thêm sự kiện validate cho trường password
    passwordInput.addEventListener('input', () => {
        if (passwordInput.value && passwordInput.value.length < 6) {
            passwordInput.classList.add('border-red-500');
        } else {
            passwordInput.classList.remove('border-red-500');
        }
    });

    // Thêm sự kiện loading khi submit form
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    // Xử lý đăng nhập với Google
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', handleGoogleLogin);
    }

    // Tự động focus vào trường email khi trang tải xong
    if (emailInput) {
        emailInput.focus();
    }

    // Xử lý hiển thị thông báo từ URL (nếu có)
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const messageType = urlParams.get('type') || 'info';
    
    if (message) {
        showNotification(decodeURIComponent(message), messageType);
    }
});

/**
 * Tải Google API JavaScript Client
 */
function loadGoogleAPI() {
    // Tạo script element
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    // Chèn script vào head
    document.head.appendChild(script);
}

/**
 * Xác thực email hợp lệ
 * @param {string} email - Email cần kiểm tra
 * @returns {boolean} True nếu email hợp lệ, ngược lại là False
 */
function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
}

/**
 * Kiểm tra trạng thái đăng nhập
 * @returns {boolean} True nếu đã đăng nhập, ngược lại là False
 */
function isLoggedIn() {
    const token = localStorage.getItem(AuthConfig.tokenStorage.tokenKey);
    const userData = localStorage.getItem(AuthConfig.tokenStorage.userKey);
    
    if (!token || !userData) {
        return false;
    }
    
    // Kiểm tra thời gian hết hạn nếu cần
    const loginTime = parseInt(localStorage.getItem(AuthConfig.tokenStorage.timeKey) || '0');
    const currentTime = Date.now();
    
    if (currentTime - loginTime > AuthConfig.tokenStorage.expireTime) {
        // Token đã hết hạn, xóa dữ liệu đăng nhập
        localStorage.removeItem(AuthConfig.tokenStorage.tokenKey);
        localStorage.removeItem(AuthConfig.tokenStorage.userKey);
        localStorage.removeItem(AuthConfig.tokenStorage.timeKey);
        return false;
    }
    
    return true;
}

/**
 * Chuyển hướng đến trang khác
 * @param {string} url - URL đích
 * @param {number} delay - Thời gian trễ (ms) trước khi chuyển hướng
 */
function redirect(url, delay = 0) {
    if (delay > 0) {
        setTimeout(() => {
            window.location.href = url;
        }, delay);
    } else {
        window.location.href = url;
    }
}

/**
 * Hiển thị thông báo
 * @param {string} message - Nội dung thông báo
 * @param {string} type - Loại thông báo ('success', 'error', 'warning', 'info')
 * @param {number} duration - Thời gian hiển thị (ms)
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Kiểm tra xem đã có container thông báo chưa
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        // Tạo container thông báo nếu chưa có
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'fixed top-5 right-5 z-50 flex flex-col items-end gap-2';
        document.body.appendChild(notificationContainer);
    }
    
    // Tạo thông báo mới
    const notification = document.createElement('div');
    
    // Thiết lập lớp CSS dựa trên loại thông báo
    let typeClass = 'bg-gray-700 text-white';
    let icon = '';
    
    switch (type) {
        case 'success':
            typeClass = 'bg-green-500 text-white';
            icon = '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            break;
        case 'error':
            typeClass = 'bg-red-500 text-white';
            icon = '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            break;
        case 'warning':
            typeClass = 'bg-yellow-500 text-white';
            icon = '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
            break;
        case 'info':
            typeClass = 'bg-blue-500 text-white';
            icon = '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
            break;
    }
    
    notification.className = `${typeClass} px-4 py-3 rounded-lg shadow-md flex items-center transform transition-all duration-300 ease-in-out opacity-0 translate-x-full`;
    notification.innerHTML = `${icon}<span>${message}</span>`;
    
    // Thêm thông báo vào container
    notificationContainer.appendChild(notification);
    
    // Hiệu ứng hiện thông báo
    setTimeout(() => {
        notification.classList.remove('opacity-0', 'translate-x-full');
    }, 10);
    
    // Thiết lập timeout để xóa thông báo
    setTimeout(() => {
        // Hiệu ứng ẩn thông báo
        notification.classList.add('opacity-0', 'translate-x-full');
        
        // Xóa thông báo sau khi hiệu ứng ẩn hoàn tất
        setTimeout(() => {
            notificationContainer.removeChild(notification);
        }, 300);
    }, duration);
}

/**
 * Xử lý sự kiện submit form đăng nhập
 * @param {Event} e - Sự kiện submit
 */
function handleLoginSubmit(e) {
    e.preventDefault();
    
    // Lấy giá trị nhập
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember').checked;
    
    // Xóa các thông báo lỗi cũ (nếu có)
    clearErrors();
    
    // Validate email
    if (!email) {
        showError('email', 'Vui lòng nhập email');
        return;
    }
    
    if (!validateEmail(email)) {
        showError('email', 'Email không đúng định dạng');
        return;
    }
    
    // Validate mật khẩu
    if (!password) {
        showError('password', 'Vui lòng nhập mật khẩu');
        return;
    }
    
    // Hiển thị trạng thái đang xử lý
    const submitButton = document.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Đang xử lý...';
    
    // Gọi API đăng nhập (trong thực tế là API thật, ở đây mô phỏng)
    setTimeout(() => {
        // Danh sách tài khoản mẫu
        const validAccounts = [
            { email: 'admin@example.com', password: 'password123', role: 'admin' },
            { email: 'user@example.com', password: 'user123', role: 'user' },
            { email: 'student@hub.edu.vn', password: 'student123', role: 'student' }
        ];
        
        // Kiểm tra thông tin đăng nhập
        const account = validAccounts.find(acc => acc.email === email && acc.password === password);
        
        if (account) {
            // Lưu thông tin đăng nhập
            const token = 'mock_token_' + Date.now();
            const userData = {
                id: 'user_' + Date.now(),
                email: email,
                role: account.role,
                rememberMe: rememberMe
            };
            
            // Lưu vào localStorage
            localStorage.setItem(AuthConfig.tokenStorage.tokenKey, token);
            localStorage.setItem(AuthConfig.tokenStorage.userKey, JSON.stringify(userData));
            localStorage.setItem(AuthConfig.tokenStorage.timeKey, Date.now());
            
            // Hiển thị thông báo thành công
            showNotification('Đăng nhập thành công!', 'success');
            
            // Chuyển hướng đến trang chính sau 1 giây
            setTimeout(() => {
                window.location.href = 'chatbot.html';
            }, 1000);
        } else {
            // Hiển thị thông báo lỗi
            showNotification('Đăng nhập thất bại: Email hoặc mật khẩu không đúng', 'error');
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    }, 1500);
}

/**
 * Xử lý đăng nhập bằng Google
 */
function handleGoogleLogin() {
    // Hiển thị thông báo
    showNotification('Đang kết nối với Google...', 'info');
    
    // Tạo URL cho OAuth 2.0 của Google
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    
    // Thêm các tham số bắt buộc
    authUrl.searchParams.append('client_id', AuthConfig.google.clientId);
    authUrl.searchParams.append('redirect_uri', AuthConfig.google.redirectUri);
    authUrl.searchParams.append('response_type', AuthConfig.google.responseType);
    authUrl.searchParams.append('scope', AuthConfig.google.scope);
    authUrl.searchParams.append('prompt', AuthConfig.google.prompt);
    
    // Thêm state để bảo vệ CSRF
    const state = 'state_' + Date.now();
    localStorage.setItem('google_auth_state', state);
    authUrl.searchParams.append('state', state);
    
    // Chuyển hướng đến trang xác thực của Google
    window.location.href = authUrl.toString();
}

/**
 * Hiển thị thông báo lỗi cho trường nhập liệu
 * @param {string} fieldId - ID của trường nhập liệu
 * @param {string} message - Thông báo lỗi
 */
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.createElement('p');
    
    // Thêm lớp CSS cho thông báo lỗi
    errorElement.className = 'text-red-500 text-xs mt-1';
    errorElement.id = `${fieldId}-error`;
    errorElement.textContent = message;
    
    // Thêm viền đỏ cho input
    field.classList.add('border-red-500');
    
    // Chèn thông báo lỗi vào sau trường nhập liệu
    field.parentNode.appendChild(errorElement);
}

/**
 * Xóa tất cả thông báo lỗi
 */
function clearErrors() {
    // Xóa tất cả các thông báo lỗi
    document.querySelectorAll('[id$="-error"]').forEach(element => {
        element.remove();
    });
    
    // Xóa viền đỏ cho các input
    document.querySelectorAll('input').forEach(input => {
        input.classList.remove('border-red-500');
    });
} 