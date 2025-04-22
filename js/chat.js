/**
 * Gửi tin nhắn đến API chat và nhận phản hồi.
 * Hàm này giả định hàm getUserInfo() từ js/login.js đã tồn tại và có thể truy cập.
 *
 * @param {string} message Tin nhắn người dùng nhập.
 * @param {string | null} conversationId ID của cuộc trò chuyện hiện tại (null nếu bắt đầu mới hoặc API tự quản lý).
 * @returns {Promise<object | null>} Promise giải quyết với dữ liệu phản hồi từ API hoặc null nếu có lỗi.
 */
async function sendChatMessage(message, conversationId = null) {
    const chatApiUrl = 'http://172.20.10.44:8055/api/ChatMessages/v1/chat';
    const userInfo = getUserInfo(); // Lấy thông tin user từ login.js

    // Kiểm tra thông tin xác thực
    if (!userInfo || !userInfo.token || userInfo.id === undefined) {
        console.error('Lỗi: Không tìm thấy thông tin người dùng (token/id) để gửi tin nhắn.');
        // Có thể hiển thị lỗi cho người dùng ở đây
        return null; // Hoặc throw new Error('User not authenticated');
    }

    const requestBody = {
        query: message,
        conversation_id: conversationId, // Sử dụng ID được truyền vào
        response_mode: "sync",           // Chế độ phản hồi đồng bộ
        inputs: {},                      // Dữ liệu bổ sung (nếu có)
        user: userInfo.id                // ID người dùng
    };

    console.log(`Đang gửi tin nhắn: "${message}", Conversation ID: ${conversationId}`);
    console.log('Request Body:', JSON.stringify(requestBody));

    try {
        const response = await fetch(chatApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userInfo.token}` // Thêm token vào header
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            const data = await response.json();
            console.log('API Chat Response:', data);
            // Trả về toàn bộ dữ liệu để bên ngoài xử lý (ví dụ: data.response, data.conversation_id)
            return data;
        } else {
            // Xử lý lỗi từ API
            let errorMessage = `Lỗi gửi tin nhắn: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
                 console.warn('Không thể phân tích lỗi JSON từ API chat:', parseError);
            }
            console.error(errorMessage);
            // Có thể hiển thị lỗi cho người dùng ở đây
            return null; // Trả về null khi có lỗi
        }
    } catch (error) {
        console.error('Lỗi mạng hoặc fetch khi gửi tin nhắn:', error);
        // Có thể hiển thị lỗi cho người dùng ở đây
        return null; // Trả về null khi có lỗi mạng
    }
}

/**
 * Lưu một tin nhắn (người dùng hoặc bot) vào session thông qua API.
 * @param {string} sessionId ID của session chat.
 * @param {number} userId ID của người dùng.
 * @param {string} content Nội dung tin nhắn.
 * @param {boolean} isUser True nếu là tin nhắn người dùng, false nếu là bot.
 * @returns {Promise<boolean>} True nếu lưu thành công, false nếu có lỗi.
 */
async function saveMessageToSession(sessionId, userId, content, isUser) {
    const saveApiUrl = 'http://172.20.10.44:8055/api/ChatMessages';
    const userInfo = getUserInfo(); // Lấy thông tin user (để lấy token)

    if (!userInfo || !userInfo.token) {
        console.error('Lỗi: Không tìm thấy token xác thực để lưu tin nhắn.');
        showNotification('Lỗi xác thực, không thể lưu tin nhắn.', 'error');
        return false;
    }

    if (!sessionId) {
         console.error('Lỗi: Không có sessionId để lưu tin nhắn.');
         // Không nên hiển thị lỗi này cho người dùng cuối, log là đủ
         return false;
    }

    const requestBody = {
        sessionId: sessionId,
        userId: userId,       // Đảm bảo userId là number
        isUser: isUser,
        content: content
    };

    console.log(`Saving message to session ${sessionId}:`, JSON.stringify(requestBody));

    try {
        const response = await fetch(saveApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userInfo.token}`
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            // Có thể không cần xử lý data trả về nếu API chỉ trả về status
            console.log(`Message (${isUser ? 'user' : 'bot'}) saved successfully for session ${sessionId}.`);
            return true;
        } else {
            // Xử lý lỗi từ API
            let errorMessage = `Lỗi lưu tin nhắn vào session: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
                console.warn('Không thể phân tích lỗi JSON từ API lưu tin nhắn:', parseError);
                 errorMessage = await response.text(); // Log raw text nếu JSON parse lỗi
            }
            console.error(errorMessage);
            showNotification('Không thể lưu tin nhắn vào lịch sử.', 'error');
            return false;
        }
    } catch (error) {
        console.error('Lỗi mạng hoặc fetch khi lưu tin nhắn:', error);
        showNotification('Lỗi mạng, không thể lưu tin nhắn.', 'error');
        return false;
    }
}
