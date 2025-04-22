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

// Ví dụ cách gọi hàm này từ giao diện chat của bạn (đặt trong file JS chính của trang chat):
/*
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const chatMessagesDiv = document.getElementById('chatMessages');
let currentConversationId = null; // Lưu ID cuộc trò chuyện hiện tại

// Lấy ID cuộc trò chuyện ban đầu (nếu có) sau khi callChatAPI trong login.js chạy
// Ví dụ: currentConversationId = sessionStorage.getItem('currentConversationId');

sendButton.addEventListener('click', async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    // Hiển thị tin nhắn người dùng (ví dụ)
    appendMessage('user', message);
    chatInput.value = '';
    chatInput.disabled = true;
    sendButton.disabled = true;

    const responseData = await sendChatMessage(message, currentConversationId);

    chatInput.disabled = false;
    sendButton.disabled = false;

    if (responseData && responseData.response) {
        // Hiển thị tin nhắn của bot (ví dụ)
        appendMessage('bot', responseData.response);

        // Cập nhật conversationId nếu API trả về ID mới hoặc hiện tại
        if (responseData.conversation_id) {
            currentConversationId = responseData.conversation_id;
            // Lưu lại nếu cần: sessionStorage.setItem('currentConversationId', currentConversationId);
             console.log("Updated Conversation ID:", currentConversationId);
        }
    } else {
        // Xử lý lỗi hiển thị (ví dụ)
        appendMessage('system', 'Lỗi: Không thể gửi tin nhắn.');
    }
});

function appendMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    messageElement.textContent = text;
    chatMessagesDiv.appendChild(messageElement);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; // Cuộn xuống dưới
}
*/ 