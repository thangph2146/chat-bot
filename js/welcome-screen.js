// File xử lý màn hình chào mừng
document.addEventListener('DOMContentLoaded', function() {
    console.log("Welcome screen script loaded");
    
    // Tìm container chính để hiển thị màn hình chào mừng
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    
    if (!chatContainer) {
        console.error("Không tìm thấy phần tử #chatContainer");
        return;
    }
    
    // Xóa nội dung hiện tại của chatContainer
    chatContainer.innerHTML = '';
    
    // Ẩn phần tin nhắn chat nếu có
    if (chatMessages) {
        chatMessages.classList.add('hidden');
    }
    
    // Tạo phần tử chào mừng
    const welcomeDiv = document.createElement('div');
    welcomeDiv.id = 'welcomeMessage';
    welcomeDiv.style.display = 'flex';
    welcomeDiv.style.flexDirection = 'column';
    welcomeDiv.style.alignItems = 'center';
    welcomeDiv.style.justifyContent = 'center';
    welcomeDiv.style.height = '100%';
    welcomeDiv.style.width = '100%';
    welcomeDiv.style.padding = '1rem';
    welcomeDiv.style.textAlign = 'center';
    welcomeDiv.style.position = 'absolute';
    welcomeDiv.style.top = '0';
    welcomeDiv.style.left = '0';
    welcomeDiv.style.right = '0';
    welcomeDiv.style.bottom = '0';
    welcomeDiv.style.backgroundColor = 'white';
    welcomeDiv.style.zIndex = '1000';
    
    // Thêm nội dung HTML cho màn hình chào mừng
    welcomeDiv.innerHTML = `
        <div style="display: inline-flex; padding: 0.75rem; border-radius: 9999px; background-color: #fce8e6; margin-bottom: 1rem; animation: float 3s ease-in-out infinite;">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 md:h-12 md:w-12" style="width: 3rem; height: 3rem; color: #b42c1c;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
        </div>
        <h2 style="font-size: 1.5rem; font-weight: bold; color: #b42c1c; margin-bottom: 0.75rem;">Chào mừng đến với Trợ lý AI</h2>
        <p style="color: #4b5563; max-width: 28rem; margin-bottom: 1.5rem;">Trợ lý thông minh của Đại học Ngân hàng TP.HCM luôn sẵn sàng hỗ trợ bạn mọi lúc mọi nơi.</p>
        <button id="startChatButton" style="display: flex; align-items: center; padding: 0.75rem 1.5rem; background-color: #b42c1c; color: white; font-weight: 500; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); transition: all 0.3s ease; cursor: pointer; animation: pulse 2s infinite;">
            <svg xmlns="http://www.w3.org/2000/svg" style="width: 1.25rem; height: 1.25rem; margin-right: 0.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Bắt đầu cuộc trò chuyện
        </button>
    `;
    
    // Thêm phần tử chào mừng vào container
    chatContainer.appendChild(welcomeDiv);
    
    // Tạo style cho animation
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
    
    // Thêm event listener cho nút bắt đầu cuộc trò chuyện
    const startChatButton = document.getElementById('startChatButton');
    if (startChatButton) {
        startChatButton.addEventListener('click', function() {
            console.log("Nút bắt đầu cuộc trò chuyện được nhấn");
            
            // Thêm nhạc hiệu ứng khi bấm nút nếu muốn
            // const audio = new Audio('path/to/click-sound.mp3');
            // audio.play();
            
            // Ẩn màn hình chào mừng
            welcomeDiv.style.display = 'none';
            
            // Hiển thị khu vực chat
            if (chatMessages) {
                chatMessages.classList.remove('hidden');
            }
            
            // Gọi hàm startNewChat từ module session nếu nó tồn tại
            try {
                // Import động module session
                import('./chat/session.js')
                    .then(module => {
                        if (module && typeof module.startNewChat === 'function') {
                            // Tạo domElements object để truyền vào startNewChat
                            const domElements = {
                                chatContainer: chatContainer,
                                messageInput: document.getElementById('messageInput'),
                                sendButton: document.getElementById('sendButton'),
                                newChatButton: document.getElementById('newChatButton'),
                                newChatButtonSidebar: document.getElementById('newChatButtonSidebar'),
                                recordButton: document.getElementById('recordButton'),
                                historySessions: document.getElementById('historySessions'),
                                chatMessagesDiv: chatMessages,
                                welcomeMessageDiv: welcomeDiv,
                                // Thêm các phần tử khác nếu cần
                            };
                            
                            module.startNewChat(domElements);
                        } else {
                            console.error("Không tìm thấy hàm startNewChat trong module session");
                        }
                    })
                    .catch(err => {
                        console.error("Lỗi khi import module session:", err);
                    });
            } catch (error) {
                console.error("Lỗi khi bắt đầu cuộc trò chuyện mới:", error);
            }
        });
    } else {
        console.error("Không tìm thấy nút bắt đầu cuộc trò chuyện sau khi thêm vào DOM");
    }
});

// Tạo function để hiển thị màn hình chào mừng từ bên ngoài
window.showWelcomeScreen = function() {
    const script = document.createElement('script');
    script.src = 'js/welcome-screen.js';
    script.onload = function() {
        console.log("Welcome screen script loaded and executed");
    };
    document.head.appendChild(script);
};