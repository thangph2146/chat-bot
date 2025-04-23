import { AUTH_LOGIN_ENDPOINT, AUTH_GOOGLE_LOGIN_ENDPOINT, AUTH_GOOGLE_LOGIN_CUSTOM_ENDPOINT, AUTH_GOOGLE_VERIFY_ENDPOINT } from '../chat/config.js';
import { getUserInfo as getUserInfoFromAuth, USER_DATA_KEY } from '../chat/auth.js'; // Correct path: Go up one level then into chat
import { fetchWithAuth } from '../chat/api.js'; // Correct path: Go up one level then into chat
import { showNotification } from '../chat/ui.js'; // Import showNotification for consistency

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
        // Không cần xóa localStorage ở đây vì fetchWithAuth đã xử lý 401
        // localStorage.removeItem(USER_DATA_KEY);
        // Trả về message từ lỗi đã được chuẩn hóa bởi fetchWithAuth hoặc lỗi mạng
        return { success: false, message: error.message || 'Lỗi kết nối hoặc xử lý phía máy chủ.' };
    }
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
        // Không cần xóa localStorage ở đây vì fetchWithAuth đã xử lý 401
        // localStorage.removeItem(USER_DATA_KEY);
        // Trả về message từ lỗi đã được chuẩn hóa bởi fetchWithAuth hoặc lỗi mạng
        return { success: false, message: error.message || 'Lỗi kết nối đến máy chủ xác thực.' };
    }
}

