/**
 * Kiểm tra trạng thái đăng nhập của người dùng dựa trên dữ liệu từ API login.
 * Giả sử lưu token hoặc thông tin user từ API vào localStorage với key 'apiUserInfo'.
 * @returns {boolean} True nếu đã đăng nhập, false nếu chưa.
 */
function checkLoginStatus() {
    const apiUserInfo = localStorage.getItem('apiUserInfo'); // Key mới
    return apiUserInfo !== null;
}

/**
 * Gửi yêu cầu đăng nhập đến API.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleLogin(email, password) {
    const apiUrl = 'http://172.20.10.44:8055/api/Users/login'; // API Endpoint

    const requestBody = {
        email: email,
        password: password
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
            const data = await response.json();
            // Lưu thông tin trả về từ API (ví dụ: user object hoặc token)
            // *** QUAN TRỌNG: Điều chỉnh key và cấu trúc lưu trữ tùy theo API trả về.
            // *** Ví dụ: Lưu toàn bộ object data hoặc chỉ data.token
            try {
                localStorage.setItem('apiUserInfo', JSON.stringify(data)); // Lưu data từ API
                console.log('API Login Success:', email, 'Data:', data);
                callChatAPI(); // Gọi API chat sau khi đăng nhập thành công
                return { success: true };
            } catch (storageError) {
                console.error('Lỗi khi lưu thông tin đăng nhập vào localStorage:', storageError);
                // Vẫn xem là đăng nhập thành công nhưng báo lỗi lưu trữ
                return { success: true, message: 'Đăng nhập thành công nhưng lỗi lưu phiên.' }; 
            }
        } else {
            // Xử lý lỗi từ API
            let errorMessage = `Lỗi ${response.status}: ${response.statusText || 'Không thể đăng nhập'}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
                 console.warn('Could not parse error JSON from API login', parseError);
            }
            console.error('API Login Error:', errorMessage);
            // Xóa thông tin đăng nhập cũ nếu có lỗi
            localStorage.removeItem('apiUserInfo');
            return { success: false, message: errorMessage };
        }
    } catch (error) {
        console.error('Network or fetch error during login:', error);
        localStorage.removeItem('apiUserInfo'); // Xóa thông tin cũ nếu lỗi mạng
        return { success: false, message: 'Lỗi kết nối mạng hoặc không thể gửi yêu cầu đăng nhập.' };
    }
}

/**
 * Xử lý đăng xuất.
 * Xóa thông tin người dùng từ API đã lưu.
 */
function handleLogout() {
    try {
        localStorage.removeItem('apiUserInfo'); // Xóa key mới
        localStorage.removeItem('userInfo'); // Xóa cả key cũ (nếu còn)
        console.log('Đã đăng xuất (API session).');
        window.location.reload();
    } catch (e) {
        console.error('Lỗi khi đăng xuất:', e);
    }
}

/**
 * Lấy thông tin người dùng đã đăng nhập từ API (đã lưu).
 * @returns {object | null} Đối tượng chứa thông tin người dùng từ API hoặc null.
 */
function getUserInfo() {
    try {
        const userInfoString = localStorage.getItem('apiUserInfo'); // Lấy key mới
        if (userInfoString) {
            return JSON.parse(userInfoString);
        }
    } catch (e) {
        console.error('Lỗi khi lấy thông tin người dùng API:', e);
        localStorage.removeItem('apiUserInfo'); // Xóa nếu dữ liệu bị hỏng
    }
    return null;
}

/**
 * Hàm kiểm tra xác thực tổng quát, gọi checkLoginStatus mới.
 * @returns {boolean} True nếu đã xác thực, false nếu chưa.
 */
function checkAuthentication() {
    const isLoggedIn = checkLoginStatus();
    if (!isLoggedIn) {
        console.log('Người dùng chưa đăng nhập (API check). Chuyển hướng...');
        if (window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') { // Không chuyển hướng nếu đang ở login/register
            window.location.href = 'login.html';
        }
    } else {
        console.log('Người dùng đã đăng nhập (API check).');
    }
    return isLoggedIn;
}

/**
 * Hiển thị thông tin người dùng trên giao diện dựa trên dữ liệu từ API.
 * Giả sử API trả về { ..., fullName: '...', email: '...' } trong data lưu ở localStorage.
 */
function displayUserInfo() {
    const userInfo = getUserInfo(); // Lấy dữ liệu API đã lưu
    const userInfoDisplay = document.getElementById('userInfoDisplay');
    const logoutButton = document.getElementById('logoutButton');

    if (userInfo && userInfoDisplay) {
        // *** Điều chỉnh cách hiển thị dựa trên cấu trúc userInfo trả về từ API ***
        userInfoDisplay.textContent = `Chào, ${userInfo.fullName || userInfo.email || 'User'}!`; // Ưu tiên fullName, rồi email
        if (logoutButton) {
            logoutButton.style.display = 'inline-flex';
        }
    } else if (userInfoDisplay) {
        userInfoDisplay.textContent = '';
        if (logoutButton) {
            logoutButton.style.display = 'none';
        }
    }
}

// Hàm xử lý đăng xuất (giữ nguyên để gắn vào nút)
function handleUserLogout() {
    handleLogout();
}

/**
 * Gửi yêu cầu đăng nhập bằng Google đến API backend.
 * Hàm này CẦN được tích hợp với thư viện Google Sign-In thực tế.
 * Nó sẽ nhận ID Token từ Google và gửi đến backend để xác thực.
 * @param {string} googleIdToken ID Token nhận được từ Google sau khi người dùng đăng nhập.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function handleGoogleLogin(googleIdToken) {
    // *** QUAN TRỌNG: Cần thay thế bằng endpoint API Google Login của bạn ***
    const apiUrl = 'http://172.20.10.44:8055/api/Users/google-login'; 

    // *** QUAN TRỌNG: Đây là ví dụ, cấu trúc body cần khớp với yêu cầu của API backend ***
    const requestBody = {
        idToken: googleIdToken 
    };

    console.log('Sending Google ID Token to backend:', requestBody); // Log để debug

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            const data = await response.json();
            // Giống như login thường, lưu thông tin trả về từ API
            try {
                localStorage.setItem('apiUserInfo', JSON.stringify(data)); // Lưu data từ API
                console.log('API Google Login Success:', 'Data:', data);
                callChatAPI(); // Gọi API chat sau khi đăng nhập Google thành công
                return { success: true };
            } catch (storageError) {
                console.error('Lỗi khi lưu thông tin đăng nhập Google vào localStorage:', storageError);
                return { success: true, message: 'Đăng nhập thành công nhưng lỗi lưu phiên.' };
            }
        } else {
            // Xử lý lỗi từ API Google Login
            let errorMessage = `Lỗi ${response.status}: ${response.statusText || 'Không thể đăng nhập bằng Google'}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
                 console.warn('Could not parse error JSON from API Google login', parseError);
            }
            console.error('API Google Login Error:', errorMessage);
            localStorage.removeItem('apiUserInfo'); // Xóa nếu lỗi
            return { success: false, message: errorMessage };
        }
    } catch (error) {
        console.error('Network or fetch error during Google login:', error);
        localStorage.removeItem('apiUserInfo'); // Xóa nếu lỗi mạng
        return { success: false, message: 'Lỗi kết nối mạng hoặc không thể gửi yêu cầu đăng nhập Google.' };
    }
}

/**
 * Gửi yêu cầu đến API chat sau khi đăng nhập thành công.
 */
async function callChatAPI() {
    const chatApiUrl = 'http://172.20.10.44:8055/api/ChatMessages/v1/chat';
    const userInfo = getUserInfo(); // Lấy thông tin user (ví dụ: token, id)

    // Kiểm tra xem có userInfo và các trường cần thiết (token, id) không
    if (!userInfo || !userInfo.token || userInfo.id === undefined) {
        console.warn('Không tìm thấy thông tin xác thực đầy đủ (token, id) để gọi API chat.');
        // Quyết định xem có nên dừng lại hay thử gọi mà không có user id
        // Hiện tại đang dừng lại:
        return;
    }

    const requestBody = {
        query: "", // Chuỗi rỗng để bắt đầu chat mới
        conversation_id: null, // null để tạo cuộc trò chuyện mới
        response_mode: "sync", // Theo ví dụ bạn cung cấp
        inputs: {}, // Theo ví dụ bạn cung cấp
        user: userInfo.id // Gửi ID người dùng
    };

    console.log('Gọi API Chat để bắt đầu cuộc trò chuyện mới. Body:', JSON.stringify(requestBody));

    try {
        const response = await fetch(chatApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userInfo.token}` // Gửi token
            },
            body: JSON.stringify(requestBody) // Gửi body đã cấu trúc
        });

        if (response.ok) {
            const chatData = await response.json();
            console.log('Gọi API Chat (bắt đầu mới) thành công:', chatData);
            // Có thể lưu conversation_id mới trả về nếu cần:
            // if (chatData.conversation_id) {
            //    sessionStorage.setItem('currentConversationId', chatData.conversation_id);
            // }
        } else {
            let chatErrorMsg = `Lỗi gọi API Chat (bắt đầu mới): ${response.status}`;
            try {
                const errorData = await response.json();
                chatErrorMsg = errorData.message || errorData.error || chatErrorMsg;
            } catch (e) { /* Bỏ qua lỗi parse JSON nếu có */ }
            console.error(chatErrorMsg);
            // Có thể thông báo lỗi cho người dùng nếu cần
        }
    } catch (error) {
        console.error('Lỗi mạng khi gọi API Chat (bắt đầu mới):', error);
        // Có thể thông báo lỗi cho người dùng nếu cần
    }
}

