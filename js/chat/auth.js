import { showNotification } from './ui.js';

export const USER_DATA_KEY = 'hub_user_data'; // Key to store user data in localStorage

/**
 * Lấy thông tin người dùng từ localStorage.
 * @returns {object | null} Dữ liệu người dùng (theo cấu trúc { data: { userId, token, ... } }) hoặc null nếu không tìm thấy hoặc lỗi.
 */
export function getUserInfo() {
    try {
        const storedData = localStorage.getItem(USER_DATA_KEY);
        if (storedData) {
            const userData = JSON.parse(storedData);
            // Basic validation of the expected structure
            if (userData && userData.data && typeof userData.data.userId !== 'undefined' && userData.data.token) {
                return userData;
            } else {
                localStorage.removeItem(USER_DATA_KEY); // Remove invalid data
                return null;
            }
        } else {
            return null;
        }
    } catch (error) {
        console.error("[auth.js] Error retrieving/parsing user info:", error);
        localStorage.removeItem(USER_DATA_KEY);
        return null;
    }
}

/**
 * Kiểm tra xem người dùng đã đăng nhập hay chưa.
 * Dựa vào sự tồn tại của token trong dữ liệu user.
 * @returns {boolean} True nếu đã đăng nhập (có token), false nếu chưa.
 */
export function checkAuthentication() {
    const userInfo = getUserInfo(); // Already includes logging
    // Check specifically for the token within the data object
    if (!userInfo || !userInfo.data?.token) { // Optional chaining for safety
        return false;
    }
    return true;
}

/**
 * Hiển thị thông tin người dùng trên giao diện.
 * Cần phần tử HTML có ID 'userInfoDisplay'.
 */
export function displayUserInfo() {
    const userInfo = getUserInfo(); // Returns format { data: { ... } } or null
    const userInfoElement = document.getElementById('userInfoDisplay');
    const logoutButton = document.getElementById('logoutButton');

    if (!userInfoElement) {
        console.warn('[auth.js] User info display element (#userInfoDisplay) not found in the DOM.');
        // Still try to hide/show logout button if it exists
        if (logoutButton) {
            logoutButton.style.display = 'none';
        }
        return; // Exit if the main display element isn't there
    }

    if (userInfo && userInfo.data) {
        // Determine the display name: fullName > email > fallback
        const displayName = userInfo.data.fullName || userInfo.data.email || 'Người dùng';
        userInfoElement.textContent = `Chào, ${displayName}!`;

        if (logoutButton) {
             logoutButton.style.display = 'inline-flex';
        } else {
            console.warn('[auth.js] Logout button (#logoutButton) not found.');
        }
    } else {
        userInfoElement.textContent = ''; // Clear the display area
        if (logoutButton) {
             logoutButton.style.display = 'none';
        } else {
             console.warn('[auth.js] Logout button (#logoutButton) not found.');
        }
    }
}

/**
 * Xử lý đăng xuất người dùng.
 * Xóa dữ liệu người dùng khỏi localStorage và chuyển hướng đến trang đăng nhập.
 */
export function handleUserLogout() {
    try {
        localStorage.removeItem(USER_DATA_KEY);
        showNotification('Đăng xuất thành công', 'success');
        // Chuyển hướng sau một khoảng trễ nhỏ để thông báo hiển thị
        setTimeout(() => {
            window.location.href = '/'; // Chuyển về trang gốc (thường là login)
        }, 1000);
    } catch (error) {
        showNotification('Đã xảy ra lỗi khi đăng xuất', 'error');
    }
} 