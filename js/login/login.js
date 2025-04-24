import { AUTH_GOOGLE_VERIFY_ENDPOINT } from '../chat/config.js';
import { USER_DATA_KEY } from '../chat/auth.js';
import { fetchWithAuth } from '../chat/api.js';

/**
 * Gửi idToken nhận từ Google về backend để xác thực và đăng nhập.
 * @param {string} idToken Chuỗi JWT nhận từ Google.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function handleGoogleVerifyToken(idToken) {
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

