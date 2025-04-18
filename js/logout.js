/**
 * logout.js - JavaScript xử lý chức năng đăng xuất
 * Xử lý việc đăng xuất người dùng và xóa thông tin xác thực
 */

document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra xem đã đăng nhập chưa
    if (!isLoggedIn()) {
        // Nếu chưa đăng nhập, chuyển hướng về trang đăng nhập
        window.location.href = 'login.html';
        return;
    }

    // Lấy thông tin người dùng từ localStorage
    const userData = getUserData();
    
    // Hiển thị thông tin người dùng nếu cần
    if (userData) {
        // Hiển thị tên người dùng (nếu có phần UI cho việc này)
        const userElement = document.getElementById('userInfo');
        if (userElement && userData.name) {
            userElement.textContent = userData.name;
        }
    }

    // Xử lý sự kiện đăng xuất
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
});

/**
 * Xử lý đăng xuất
 */
function handleLogout() {
    // Hiển thị hộp thoại xác nhận
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        // Xóa token và thông tin người dùng
        localStorage.removeItem(AuthConfig.tokenStorage.tokenKey);
        localStorage.removeItem(AuthConfig.tokenStorage.userKey);
        localStorage.removeItem(AuthConfig.tokenStorage.timeKey);
        
        // Tạo thông báo đăng xuất thành công
        const message = 'Đăng xuất thành công';
        
        // Chuyển hướng về trang đăng nhập với thông báo
        window.location.href = `login.html?message=${encodeURIComponent(message)}&type=success`;
    }
}

/**
 * Kiểm tra xem người dùng đã đăng nhập chưa
 * @returns {boolean} True nếu đã đăng nhập, False nếu chưa
 */
function isLoggedIn() {
    const token = localStorage.getItem(AuthConfig.tokenStorage.tokenKey);
    const userData = localStorage.getItem(AuthConfig.tokenStorage.userKey);
    
    if (!token || !userData) {
        return false;
    }
    
    // Kiểm tra thời gian hết hạn
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
 * Lấy thông tin người dùng từ localStorage
 * @returns {Object|null} Thông tin người dùng hoặc null nếu không có
 */
function getUserData() {
    try {
        const userDataString = localStorage.getItem(AuthConfig.tokenStorage.userKey);
        if (!userDataString) return null;
        return JSON.parse(userDataString);
    } catch (error) {
        console.error('Lỗi khi phân tích dữ liệu người dùng:', error);
        return null;
    }
} 