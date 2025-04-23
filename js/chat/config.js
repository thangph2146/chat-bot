// Cấu hình API (Chuẩn hóa)
export const API_BASE_URL = 'http://172.20.10.44:8055/api'; // URL cơ sở chính
export const AUTH_LOGIN_ENDPOINT = `${API_BASE_URL}/Users/login`; // Endpoint đăng nhập
export const AUTH_REGISTER_ENDPOINT = `${API_BASE_URL}/Auth/register`; // Endpoint đăng ký
export const AUTH_GOOGLE_LOGIN_ENDPOINT = `${API_BASE_URL}/Auth/google-login`; // Endpoint Google Login
export const CHAT_API_ENDPOINT = `${API_BASE_URL}/ChatMessages/v1/chat`;
export const SESSIONS_API_ENDPOINT = `${API_BASE_URL}/ChatSessions`;

// Cấu hình Google Client ID
// 

// Cấu hình cho Dify (Nếu bạn sử dụng API Dify trực tiếp thay vì embed)
// export const DIFY_API_BASE_URL = 'http://trolyai.hub.edu.vn';
// export const DIFY_CHAT_API_ENDPOINT = `${DIFY_API_BASE_URL}/v1/chat-messages`; // Example endpoint
// export const DIFY_API_KEY = 'YOUR_DIFY_API_KEY'; // Example, store securely