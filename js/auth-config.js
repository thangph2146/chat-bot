/**
 * auth-config.js - Cấu hình xác thực cho ứng dụng
 * Lưu trữ các cấu hình cho các dịch vụ đăng nhập bên thứ ba
 */

const AuthConfig = {
    /**
     * Cấu hình Google OAuth 2.0
     */
    google: {
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
        redirectUri: window.location.origin + '/google-callback.html',
        scope: 'email profile',
        responseType: 'code',
        prompt: 'select_account'
    },
    
    /**
     * Cấu hình thông tin API backend
     */
    apiEndpoints: {
        login: '/api/auth/login',
        googleLogin: '/api/auth/google-login',
        register: '/api/auth/register',
        forgotPassword: '/api/auth/forgot-password',
        resetPassword: '/api/auth/reset-password',
        logout: '/api/auth/logout'
    },
    
    /**
     * Cấu hình lưu trữ token
     */
    tokenStorage: {
        tokenKey: 'auth_token',
        userKey: 'auth_user',
        timeKey: 'auth_time',
        expireTime: 24 * 60 * 60 * 1000 // 24 giờ (tính bằng milliseconds)
    }
}; 