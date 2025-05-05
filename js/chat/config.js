// Đường dẫn API cơ sở cho các endpoint API, có thể được load động từ server
export let API_BASE_URL = '/api/backend';
export let AUTH_LOGIN_ENDPOINT = `${API_BASE_URL}/Users/login`;
export let AUTH_REGISTER_ENDPOINT = `${API_BASE_URL}/Users/register`;
export let AUTH_GOOGLE_LOGIN_ENDPOINT = `${API_BASE_URL}/Users/google-login`;
export let AUTH_GOOGLE_LOGIN_CUSTOM_ENDPOINT = `${API_BASE_URL}/Users/google-login`;
export let AUTH_GOOGLE_VERIFY_ENDPOINT = `${API_BASE_URL}/auth/google/verify`;
export let CHAT_MESSAGE_API_ENDPOINT = `${API_BASE_URL}/ChatMessages`;
export let SESSIONS_API_ENDPOINT = `${API_BASE_URL}/ChatSessions`;
export let SAVE_MESSAGE_ENDPOINT = `${API_BASE_URL}/ChatMessages`;

// Cấu hình Google Client ID
export let GOOGLE_CLIENT_ID = '197433305936-sffe02eu5jecf94m1oh1rn6igrosv6f3.apps.googleusercontent.com';

// Cấu hình cho Dify (Sẽ được load từ server để bảo mật DIFY_API_KEY)
export let DIFY_API_BASE_URL = 'https://trolyai.hub.edu.vn';
export let DIFY_CHAT_API_ENDPOINT = '/api/dify/chat'; // Điểm cuối proxy qua server Node.js
export let DIFY_API_KEY = ''; // Không còn lưu trữ ở client

// Hàm để tải cấu hình từ server
export async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error('Không thể tải cấu hình');
        }
        const config = await response.json();
        
        // Chỉ cập nhật DIFY_API_BASE_URL và GOOGLE_CLIENT_ID, giữ nguyên đường dẫn proxy cho API_BASE_URL        
        if (config.DIFY_API_BASE_URL) {
            DIFY_API_BASE_URL = config.DIFY_API_BASE_URL;
        }
        
        if (config.DIFY_CHAT_API_ENDPOINT) {
            DIFY_CHAT_API_ENDPOINT = config.DIFY_CHAT_API_ENDPOINT;
        }
        
        if (config.GOOGLE_CLIENT_ID) {
            GOOGLE_CLIENT_ID = config.GOOGLE_CLIENT_ID;
        }
        
        console.log('Đã tải cấu hình thành công');
    } catch (error) {
        console.error('Lỗi khi tải cấu hình:', error);
    }
}