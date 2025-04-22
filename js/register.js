/**
 * Gửi yêu cầu đăng ký người dùng mới đến API.
 * @param {string} fullName
 * @param {string} email
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleRegister(fullName, email, password, confirmPassword) {
    const apiUrl = 'http://172.20.10.44:8055/api/Users/register';
    const requestBody = {
        fullName: fullName,
        email: email,
        password: password,
        confirmPassword: confirmPassword
    };
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        if (response.ok) {
            console.log('API Register Success:', email);
            return { success: true };
        } else {
            let errorMessage = `Lỗi ${response.status}: ${response.statusText || 'Không thể đăng ký'}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
                 console.warn('Could not parse error JSON from API register', parseError);
            }
            console.error('API Register Error:', errorMessage);
            return { success: false, message: errorMessage };
        }
    } catch (error) {
        console.error('Network or fetch error during registration:', error);
        return { success: false, message: 'Lỗi kết nối mạng hoặc không thể gửi yêu cầu đăng ký.' };
    }
}

// Toàn bộ logic DOMContentLoaded và xử lý form đã được chuyển sang js/register-page.js
// File này chỉ nên chứa hàm handleRegister. 