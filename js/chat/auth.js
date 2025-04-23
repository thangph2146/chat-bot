import { showNotification } from './ui.js';

export const USER_DATA_KEY = 'hub_user_data'; // Key to store user data in localStorage

/**
 * Lấy thông tin người dùng từ localStorage.
 * @returns {object | null} Dữ liệu người dùng (theo cấu trúc { data: { userId, token, ... } }) hoặc null nếu không tìm thấy hoặc lỗi.
 */
export function getUserInfo() {
    console.log('[auth.js] Attempting to get user info from localStorage...');
    try {
        const storedData = localStorage.getItem(USER_DATA_KEY);
        if (storedData) {
            // console.log('[auth.js] Found raw data in localStorage:', storedData); // Log raw data if needed for deep debug
            const userData = JSON.parse(storedData);
            // Basic validation of the expected structure
            if (userData && userData.data && typeof userData.data.userId !== 'undefined' && userData.data.token) {
                console.log('[auth.js] Parsed user data (structure OK):', userData);
                return userData;
            } else {
                console.warn('[auth.js] Parsed data structure mismatch or missing fields (userId/token):', userData);
                localStorage.removeItem(USER_DATA_KEY); // Remove invalid data
                return null;
            }
        } else {
            console.log('[auth.js] No data found in localStorage for key:', USER_DATA_KEY);
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
    console.log('[auth.js] Performing authentication check...');
    const userInfo = getUserInfo(); // Already includes logging
    // Check specifically for the token within the data object
    if (!userInfo || !userInfo.data?.token) { // Optional chaining for safety
        console.log("[auth.js] Authentication check FAILED (userInfo or token missing).");
        return false;
    }
    console.log("[auth.js] Authentication check PASSED. User ID:", userInfo.data?.userId);
    return true;
}

/**
 * Hiển thị thông tin người dùng trên giao diện.
 * Cần phần tử HTML có ID 'userInfoDisplay'.
 */
export function displayUserInfo() {
    console.log('[auth.js] Attempting to display user info on UI.');
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
        console.log('[auth.js] User info found, preparing display name.');
        // Determine the display name: fullName > email > fallback
        const displayName = userInfo.data.fullName || userInfo.data.email || 'Người dùng';
        userInfoElement.textContent = `Chào, ${displayName}!`;
        console.log(`[auth.js] Displayed user info: "${userInfoElement.textContent}"`);

        if (logoutButton) {
             console.log('[auth.js] Showing logout button.');
             logoutButton.style.display = 'inline-flex';
        } else {
            console.warn('[auth.js] Logout button (#logoutButton) not found.');
        }
    } else {
        console.log('[auth.js] No valid user info data found to display.');
        userInfoElement.textContent = ''; // Clear the display area
        if (logoutButton) {
             console.log('[auth.js] Hiding logout button.');
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
    console.log("[auth.js] handleUserLogout called. Logging out...");
    try {
        localStorage.removeItem(USER_DATA_KEY);
        console.log(`[auth.js] Removed item with key: ${USER_DATA_KEY}`);
        showNotification('Đăng xuất thành công', 'success');
        // Chuyển hướng sau một khoảng trễ nhỏ để thông báo hiển thị
        setTimeout(() => {
            console.log('[auth.js] Redirecting to login page...');
            window.location.href = '/'; // Chuyển về trang gốc (thường là login)
        }, 1000);
    } catch (error) {
        console.error("[auth.js] Error during logout:", error);
        showNotification('Đã xảy ra lỗi khi đăng xuất', 'error');
    }
} 