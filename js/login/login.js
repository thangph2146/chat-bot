import { AUTH_LOGIN_ENDPOINT, AUTH_GOOGLE_LOGIN_ENDPOINT, AUTH_GOOGLE_LOGIN_CUSTOM_ENDPOINT, AUTH_GOOGLE_VERIFY_ENDPOINT } from '../chat/config.js';
import { getUserInfo as getUserInfoFromAuth, USER_DATA_KEY } from '../chat/auth.js'; // Correct path: Go up one level then into chat
import { fetchWithAuth } from '../chat/api.js'; // Correct path: Go up one level then into chat
import { showNotification } from '../chat/ui.js'; // Import showNotification for consistency

/**
 * Kiểm tra trạng thái đăng nhập của người dùng dựa trên dữ liệu từ API login.
 * Giả sử lưu token hoặc thông tin user từ API vào localStorage với key 'hub_user_data'.
 * @returns {boolean} True nếu đã đăng nhập, false nếu chưa.
 */
function checkLoginStatus() {
    console.log('[login.js] Checking login status...');
    const apiUserInfo = localStorage.getItem('hub_user_data'); // <-- Use consistent key
    const isLoggedIn = apiUserInfo !== null;
    console.log(`[login.js] Login status (hub_user_data exists): ${isLoggedIn}`);
    return isLoggedIn;
}

/**
 * Gửi yêu cầu đăng nhập đến API.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function handleLogin(email, password) {
    console.log(`[login.js] Attempting login for email: ${email}`);
    const apiUrl = AUTH_LOGIN_ENDPOINT;
    const requestBody = {
        email: email,
        password: password
    };

    try {
        // Sử dụng fetchWithAuth
        const responseData = await fetchWithAuth(apiUrl, {
            method: 'POST',
            body: requestBody // fetchWithAuth sẽ tự stringify nếu cần
        });

        console.log('[login.js] API Login Success Data Received:', responseData);

        // Validation cấu trúc response (điều chỉnh nếu API trả về khác)
        if (!responseData || !responseData.data || !responseData.data.token || typeof responseData.data.userId === 'undefined') {
            console.error('[login.js] API response missing expected data structure (data.token, data.userId).', responseData);
            return { success: false, message: 'Dữ liệu đăng nhập trả về không hợp lệ.' };
        }

        try {
            console.log(`[login.js] Storing user data to localStorage with key: ${USER_DATA_KEY}`);
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(responseData));
            console.log('[login.js] User data stored successfully.');
            return { success: true };
        } catch (storageError) {
            console.error('[login.js] Error storing login info to localStorage:', storageError);
            // Vẫn trả về thành công vì đăng nhập API đã ok, chỉ là lưu trữ lỗi
            return { success: true, message: 'Đăng nhập thành công nhưng lỗi lưu phiên.' };
        }

    } catch (error) {
        // fetchWithAuth đã log lỗi chi tiết
        console.error('[login.js] Login failed:', error);
        localStorage.removeItem(USER_DATA_KEY); // Đảm bảo xóa dữ liệu không hợp lệ
        // Trả về message từ lỗi đã được chuẩn hóa bởi fetchWithAuth hoặc lỗi mạng
        return { success: false, message: error.message || 'Lỗi kết nối hoặc xử lý phía máy chủ.' };
    }
}

/**
 * Xử lý đăng xuất.
 * Xóa thông tin người dùng từ API đã lưu.
 */
export function handleLogout() {
    try {
        console.log('[login.js] Logging out user...');
        localStorage.removeItem(USER_DATA_KEY);
        console.log('[login.js] User data removed from localStorage.');
        window.location.href = '/'; // Chuyển về trang gốc
        // window.location.reload(); // Reload không cần thiết khi đã chuyển trang
    } catch (e) {
        console.error('[login.js] Error during logout:', e);
        // Hiển thị lỗi cho người dùng nếu cần
        showNotification('Lỗi xảy ra trong quá trình đăng xuất.', 'error');
    }
}

/**
 * Lấy thông tin người dùng đã đăng nhập từ API (đã lưu).
 * @returns {object | null} Đối tượng chứa thông tin người dùng từ API hoặc null.
 */
function getUserInfo() {
    try {
        const userInfoString = localStorage.getItem('hub_user_data'); // Use consistent key
        if (userInfoString) {
            console.log('[login.js] Retrieved raw user info string:', userInfoString);
            const parsedInfo = JSON.parse(userInfoString);
            console.log('[login.js] Parsed user info:', parsedInfo);
            return parsedInfo;
        } else {
            console.log('[login.js] No user info found in localStorage for hub_user_data.');
        }
    } catch (e) {
        console.error('[login.js] Error parsing stored user info:', e);
        localStorage.removeItem('hub_user_data'); // Clear corrupted data
    }
    return null;
}

/**
 * Hàm kiểm tra xác thực tổng quát, gọi checkLoginStatus.
 * @returns {boolean} True nếu đã xác thực, false nếu chưa.
 */
function checkAuthentication() {
    console.log('[login.js] checkAuthentication called...');
    const isLoggedIn = checkLoginStatus();
    if (!isLoggedIn) {
        console.log('[login.js] User is NOT logged in. Redirecting if not on login/register page.');
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath !== '/login.html' && currentPath !== '/' && currentPath !== '/register.html') { // Allow root path as well
            console.log(`[login.js] Redirecting from ${currentPath} to login.html`);
            window.location.href = 'login.html'; // Adjust if base path is different
        }
    } else {
        console.log('[login.js] User is logged in.');
    }
    return isLoggedIn;
}

/**
 * Hiển thị thông tin người dùng trên giao diện dựa trên dữ liệu từ API.
 * Giả sử API trả về { data: { fullName: '...', email: '...' } }.
 */
function displayUserInfo() {
    console.log('[login.js] Attempting to display user info on UI...');
    const userInfo = getUserInfo(); // Gets the { data: { ... } } structure
    const userInfoDisplay = document.getElementById('userInfoDisplay');
    const logoutButton = document.getElementById('logoutButton');

    if (userInfo && userInfo.data && userInfoDisplay) { // Check nested data object
        const displayName = userInfo.data.fullName || userInfo.data.email || 'User';
        console.log(`[login.js] Displaying user info: ${displayName}`);
        userInfoDisplay.textContent = `Chào, ${displayName}!`;
        if (logoutButton) {
            logoutButton.style.display = 'inline-flex';
        }
    } else if (userInfoDisplay) {
        console.log('[login.js] No valid user info found to display.');
        userInfoDisplay.textContent = '';
        if (logoutButton) {
            logoutButton.style.display = 'none';
        }
    }
}

// Hàm xử lý đăng xuất (để gắn vào nút)
function handleUserLogout() {
    console.log('[login.js] handleUserLogout (for button) called.');
    handleLogout();
}

/**
 * Gửi idToken nhận từ Google về backend để xác thực và đăng nhập.
 * @param {string} idToken Chuỗi JWT nhận từ Google.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function handleGoogleVerifyToken(idToken) {
    console.log('[login.js] Sending idToken to backend for verification...');
    const apiUrl = AUTH_GOOGLE_VERIFY_ENDPOINT;
    const requestBody = { idToken: idToken };

    try {
        // Sử dụng fetchWithAuth. Nếu endpoint backend không yêu cầu token ứng dụng
        // (chỉ idToken), có thể cần điều chỉnh fetchWithAuth hoặc dùng fetch thường.
        // Giả sử fetchWithAuth có thể xử lý trường hợp không cần gửi token cũ.
        const responseData = await fetchWithAuth(apiUrl, {
            method: 'POST',
            body: requestBody,
            // Nếu fetchWithAuth luôn thêm 'Authorization', và endpoint này không cần,
            // bạn có thể cần thêm logic để bỏ qua header đó:
            // headers: { 'Authorization': undefined } 
        });

        console.log('[login.js] Backend verification response:', responseData);

        // Kiểm tra cấu trúc response thành công từ backend
        if (!responseData || !responseData.data || !responseData.data.token || typeof responseData.data.userId === 'undefined') {
            console.error('[login.js] Backend Google verification response missing expected structure (data.token, data.userId).', responseData);
            // Cố gắng lấy message lỗi từ backend
            const message = responseData?.message || responseData?.error || 'Xác thực Google thất bại từ máy chủ.';
            return { success: false, message: message };
        }

        // Đăng nhập thành công từ backend
        try {
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(responseData));
            console.log('[login.js] User data from Google sign-in stored successfully.');
            return { success: true };
        } catch (storageError) {
            console.error('[login.js] Error storing verified Google login info to localStorage:', storageError);
            // Vẫn trả về thành công vì backend đã xác thực, chỉ là lưu trữ lỗi
            return { success: true, message: 'Xác thực Google thành công nhưng lỗi lưu phiên.' };
        }

    } catch (error) {
        // Lỗi mạng hoặc lỗi từ fetchWithAuth
        console.error('[login.js] Error sending idToken to backend:', error);
        localStorage.removeItem(USER_DATA_KEY); // Xóa session cũ nếu có lỗi
        // Trả về message từ lỗi đã được chuẩn hóa bởi fetchWithAuth hoặc lỗi mạng
        return { success: false, message: error.message || 'Lỗi kết nối đến máy chủ xác thực.' };
    }
}

