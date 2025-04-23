import { AUTH_REGISTER_ENDPOINT } from '../chat/config.js';
import { fetchWithAuth } from '../chat/api.js';

/**
 * Gửi yêu cầu đăng ký người dùng mới đến API.
 * @param {string} fullName
 * @param {string} email
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function handleRegister(fullName, email, password, confirmPassword) {
    const apiUrl = AUTH_REGISTER_ENDPOINT;
    const requestBody = {
        fullName: fullName,
        email: email,
        password: password,
        confirmPassword: confirmPassword
    };

    try {
        // Sử dụng fetchWithAuth, không cần truyền token vì đây là đăng ký
        // Endpoint này thường không yêu cầu xác thực
        // fetchWithAuth vẫn hữu ích để chuẩn hóa request và xử lý lỗi
        await fetchWithAuth(apiUrl, {
            method: 'POST',
            body: requestBody,
            headers: { 'Authorization': undefined } // Explicitly remove Authorization header if fetchWithAuth adds it by default
        });

        return { success: true };

    } catch (error) {
        console.error('API Register Error:', error);
        // fetchWithAuth đã log lỗi chi tiết và chuẩn hóa message
        return { success: false, message: error.message || 'Lỗi kết nối hoặc không thể gửi yêu cầu đăng ký.' };
    }
}

// Toàn bộ logic DOMContentLoaded và xử lý form đã được chuyển sang js/register-page.js
// File này chỉ nên chứa hàm handleRegister. 