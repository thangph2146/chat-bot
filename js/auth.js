/**
 * auth.js - Thư viện tiện ích xác thực
 * Chứa các utility functions được sử dụng trong login.js và register.js
 */

const AuthUtils = {
    /**
     * Lưu dữ liệu xác thực vào localStorage
     * @param {string} token - Access token
     * @param {Object} userData - Thông tin người dùng
     */
    saveAuthData: function(token, userData) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        localStorage.setItem('auth_time', Date.now());
    },

    /**
     * Xóa dữ liệu xác thực khỏi localStorage
     */
    clearAuthData: function() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_time');
    },

    /**
     * Lấy dữ liệu xác thực từ localStorage
     * @returns {Object|null} Dữ liệu xác thực hoặc null nếu không có
     */
    getAuthData: function() {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('auth_user');
        
        if (!token || !userData) {
            return null;
        }
        
        try {
            return {
                token,
                user: JSON.parse(userData),
                loginTime: localStorage.getItem('auth_time')
            };
        } catch (e) {
            console.error('Error parsing auth data:', e);
            return null;
        }
    },

    /**
     * Kiểm tra trạng thái đăng nhập
     * @returns {boolean} True nếu đã đăng nhập, ngược lại là False
     */
    isLoggedIn: function() {
        return !!this.getAuthData();
    },

    /**
     * Xác thực email hợp lệ
     * @param {string} email - Email cần kiểm tra
     * @returns {boolean} True nếu email hợp lệ, ngược lại là False
     */
    validateEmail: function(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(email);
    },

    /**
     * Kiểm tra độ mạnh của mật khẩu
     * @param {string} password - Mật khẩu cần kiểm tra
     * @returns {string} 'weak', 'medium', hoặc 'strong'
     */
    checkPasswordStrength: function(password) {
        let score = 0;
        
        // Độ dài tối thiểu
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        
        // Có số
        if (/\d/.test(password)) score++;
        
        // Có chữ thường
        if (/[a-z]/.test(password)) score++;
        
        // Có chữ hoa
        if (/[A-Z]/.test(password)) score++;
        
        // Có ký tự đặc biệt
        if (/[^a-zA-Z0-9]/.test(password)) score++;
        
        // Đánh giá độ mạnh
        if (score < 3) return 'weak';
        if (score < 5) return 'medium';
        return 'strong';
    },

    /**
     * Thiết lập toggle hiển thị/ẩn mật khẩu
     * @param {string} inputId - ID của input mật khẩu
     * @param {string} toggleId - ID của toggle button
     */
    setupPasswordToggle: function(inputId, toggleId) {
        const passwordInput = document.getElementById(inputId);
        const toggleButton = document.getElementById(toggleId);
        
        if (!passwordInput || !toggleButton) return;
        
        toggleButton.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Cập nhật icon
            const eyeOpen = toggleButton.querySelector('.eye-open');
            const eyeClosed = toggleButton.querySelector('.eye-closed');
            
            if (eyeOpen && eyeClosed) {
                eyeOpen.classList.toggle('hidden');
                eyeClosed.classList.toggle('hidden');
            }
        });
    },

    /**
     * Chuyển hướng đến trang khác
     * @param {string} url - URL đích
     * @param {number} delay - Thời gian trễ (ms) trước khi chuyển hướng
     */
    redirect: function(url, delay = 0) {
        if (delay > 0) {
            setTimeout(() => {
                window.location.href = url;
            }, delay);
        } else {
            window.location.href = url;
        }
    },

    /**
     * Hiển thị thông báo
     * @param {string} message - Nội dung thông báo
     * @param {string} type - Loại thông báo ('success', 'error', 'warning', 'info')
     * @param {number} duration - Thời gian hiển thị (ms)
     */
    showNotification: function(message, type = 'info', duration = 3000) {
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
    },

    /**
     * Thêm hiệu ứng ripple cho các nút
     * @param {string} selector - CSS selector cho các nút cần thêm hiệu ứng
     */
    addRippleEffect: function(selector) {
        const buttons = document.querySelectorAll(selector);
        
        buttons.forEach(button => {
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
    },

    /**
     * Giả lập gọi API
     * @param {string} endpoint - Endpoint API
     * @param {Object} data - Dữ liệu gửi lên API
     * @returns {Promise<Object>} Promise chứa kết quả từ API
     */
    callAPI: function(endpoint, data = {}) {
        return new Promise((resolve, reject) => {
            console.log(`Calling API ${endpoint} with data:`, data);
            
            // Giả lập độ trễ mạng
            setTimeout(() => {
                // Giả lập xử lý API
                if (endpoint === '/api/auth/login') {
                    if (data.email === 'demo@example.com' && data.password === 'Password123!') {
                        resolve({
                            success: true,
                            data: {
                                token: 'fake_jwt_token_' + Date.now(),
                                userId: 'user_' + Date.now(),
                                email: data.email
                            }
                        });
                    } else {
                        reject(new Error('Email hoặc mật khẩu không đúng'));
                    }
                } else if (endpoint === '/api/auth/register') {
                    // Kiểm tra email đã tồn tại (giả lập)
                    if (data.email === 'demo@example.com') {
                        reject(new Error('Email đã tồn tại'));
                    } else {
                        resolve({
                            success: true,
                            data: {
                                token: 'fake_jwt_token_' + Date.now(),
                                userId: 'user_' + Date.now(),
                                email: data.email
                            }
                        });
                    }
                } else {
                    reject(new Error('Endpoint không hợp lệ'));
                }
            }, 1000);
        });
    }
};

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthUtils;
} 