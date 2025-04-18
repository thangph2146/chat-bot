/**
 * forgotpassword.js - Xử lý chức năng quên mật khẩu
 */

document.addEventListener('DOMContentLoaded', function() {
    // Lấy các phần tử trong form
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const resetButton = document.getElementById('resetPasswordBtn');
    const successMessage = document.getElementById('successMessage');
    
    // Nếu đã đăng nhập, chuyển hướng đến trang chính
    if (AuthUtils.isLoggedIn()) {
        AuthUtils.redirect('index.html');
        return;
    }
    
    // Thêm hiệu ứng ripple cho nút
    AuthUtils.addRippleEffect('button');
    
    // Xử lý validate email
    emailInput.addEventListener('blur', function() {
        if (emailInput.value && !AuthUtils.validateEmail(emailInput.value)) {
            emailInput.classList.add('border-red-500');
            showError('email', 'Email không đúng định dạng');
        } else {
            emailInput.classList.remove('border-red-500');
            clearError('email');
        }
    });
    
    // Xử lý submit form
    forgotPasswordForm.addEventListener('submit', handleResetPassword);
    
    // Xử lý hiển thị thông báo từ URL (nếu có)
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const messageType = urlParams.get('type') || 'info';
    
    if (message) {
        AuthUtils.showNotification(decodeURIComponent(message), messageType);
    }
});

/**
 * Xử lý sự kiện submit form đặt lại mật khẩu
 * @param {Event} e - Sự kiện submit
 */
function handleResetPassword(e) {
    e.preventDefault();
    
    // Lấy form và các phần tử
    const form = e.target;
    const emailInput = document.getElementById('email');
    const resetButton = document.getElementById('resetPasswordBtn');
    const successMessage = document.getElementById('successMessage');
    
    // Validate email
    const email = emailInput.value.trim();
    
    if (!email) {
        showError('email', 'Vui lòng nhập địa chỉ email');
        return;
    }
    
    if (!AuthUtils.validateEmail(email)) {
        showError('email', 'Email không đúng định dạng');
        return;
    }
    
    // Hiển thị trạng thái đang xử lý
    resetButton.disabled = true;
    const originalButtonText = resetButton.innerHTML;
    resetButton.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Đang xử lý...';
    
    // Giả lập gọi API đặt lại mật khẩu
    setTimeout(() => {
        // Ẩn form và hiển thị thông báo thành công
        form.classList.add('hidden');
        successMessage.classList.remove('hidden');
        
        // Hiển thị thông báo
        AuthUtils.showNotification('Email đặt lại mật khẩu đã được gửi đi!', 'success');
        
        // Lưu lịch sử yêu cầu đặt lại mật khẩu vào local storage (tùy chọn)
        try {
            const resetRequests = JSON.parse(localStorage.getItem('password_reset_requests') || '[]');
            resetRequests.push({
                email: email,
                timestamp: Date.now()
            });
            localStorage.setItem('password_reset_requests', JSON.stringify(resetRequests));
        } catch (error) {
            console.error('Không thể lưu lịch sử yêu cầu:', error);
        }
        
        // Chuyển hướng sau 5 giây
        setTimeout(() => {
            AuthUtils.redirect('login.html?message=' + encodeURIComponent('Email đặt lại mật khẩu đã được gửi đi. Vui lòng kiểm tra hộp thư của bạn.') + '&type=info');
        }, 5000);
    }, 2000);
}

/**
 * Hiển thị thông báo lỗi cho trường nhập liệu
 * @param {string} fieldId - ID của trường nhập liệu
 * @param {string} message - Thông báo lỗi
 */
function showError(fieldId, message) {
    clearError(fieldId);
    
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
 * Xóa thông báo lỗi cho trường nhập liệu
 * @param {string} fieldId - ID của trường nhập liệu
 */
function clearError(fieldId) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    if (errorElement) {
        errorElement.remove();
    }
} 