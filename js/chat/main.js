import {
    checkAuthentication,
    displayUserInfo,
    handleUserLogout,
} from './auth.js';
import {
    loadChatSessions,
    startNewChat,
    setShowWelcomeMessageHandler,
    getAllSessions,
    getCurrentSessionId,
    handleSelectSession,
    handleDeleteRequest,
    loadSessionMessages
} from './session.js';
import {
    handleSendMessage,
    showWelcomeMessage
} from './chat.js';
import {
    initSpeechRecognition,
    toggleRecording
} from './speech.js';
import {
    updateHistorySidebar,
    showWelcomeScreen,
    hideWelcomeScreen
} from './ui.js';

// Main application entry point
document.addEventListener('DOMContentLoaded', async () => {

    // --- START: Gather DOM Elements --- 
    const domElements = {
        chatContainer: document.getElementById('chatContainer'),
        messageInput: document.getElementById('messageInput'),
        sendButton: document.getElementById('sendButton'),
        newChatButton: document.getElementById('newChatButton'),
        newChatButtonSidebar: document.getElementById('newChatButtonSidebar'),
        recordButton: document.getElementById('recordButton'),
        logoutButton: document.getElementById('logoutButton'),
        historySessions: document.getElementById('historySessions'),
        chatMessagesDiv: document.getElementById('chatMessages'),
        welcomeMessageDiv: document.getElementById('welcomeMessage'),
        userInfoDisplay: document.getElementById('userInfoDisplay') // Added for displayUserInfo
    };
    
    // Tạo màn hình chào mừng mới nếu không tìm thấy
    if (!domElements.welcomeMessageDiv || window.getComputedStyle(domElements.welcomeMessageDiv).display === 'none') {
        console.log("Tạo màn hình chào mừng mới vì không tìm thấy hoặc bị ẩn");
        
        // Xóa welcomeMessageDiv cũ nếu có
        if (domElements.welcomeMessageDiv) {
            domElements.welcomeMessageDiv.remove();
        }
        
        // Tạo phần tử mới
        const welcomeDiv = document.createElement('div');
        welcomeDiv.id = 'welcomeMessage';
        welcomeDiv.className = 'flex flex-col items-center justify-center h-full w-full text-center p-4 sm:p-6 animate-fade-in';
        welcomeDiv.style.display = 'flex';
        welcomeDiv.style.position = 'absolute';
        welcomeDiv.style.top = '0';
        welcomeDiv.style.left = '0';
        welcomeDiv.style.right = '0';
        welcomeDiv.style.bottom = '0';
        welcomeDiv.style.zIndex = '100';
        welcomeDiv.style.backgroundColor = 'white';
        
        welcomeDiv.innerHTML = `
            <div class="inline-flex p-3 rounded-full bg-primary-100 mb-4 animate-float">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 md:h-12 md:w-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold text-primary-600 mb-3 animate-fade-in">Chào mừng đến với Trợ lý AI</h2>
            <p class="text-secondary-600 max-w-md mb-6 animate-fade-in">Trợ lý thông minh của Đại học Ngân hàng TP.HCM luôn sẵn sàng hỗ trợ bạn mọi lúc mọi nơi.</p>
            
            <button id="startChatButton" class="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg shadow-md transition-colors duration-300 flex items-center animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Bắt đầu cuộc trò chuyện
            </button>
            
            <div id="dynamicWelcomeContent" class="w-full max-w-lg mt-4 text-secondary-700"></div>
        `;
        
        // Thêm vào DOM trước khi chatMessagesDiv
        if (domElements.chatContainer) {
            if (domElements.chatMessagesDiv) {
                domElements.chatContainer.insertBefore(welcomeDiv, domElements.chatMessagesDiv);
            } else {
                domElements.chatContainer.appendChild(welcomeDiv);
            }
            
            // Cập nhật tham chiếu
            domElements.welcomeMessageDiv = welcomeDiv;
            
            // Ẩn khu vực tin nhắn
            if (domElements.chatMessagesDiv) {
                domElements.chatMessagesDiv.classList.add('hidden');
            }
            
            // Thêm event listener cho nút "Bắt đầu cuộc trò chuyện"
            const newStartChatButton = welcomeDiv.querySelector('#startChatButton');
            if (newStartChatButton) {
                console.log("Thêm event listener cho nút 'Bắt đầu cuộc trò chuyện'");
                newStartChatButton.addEventListener('click', () => {
                    console.log("Nút 'Bắt đầu cuộc trò chuyện' được nhấn");
                    hideWelcomeScreen(domElements.welcomeMessageDiv, domElements.chatMessagesDiv);
                    startNewChat(domElements);
                });
            } else {
                console.error("Không tìm thấy nút 'Bắt đầu cuộc trò chuyện' trong màn hình chào mừng mới");
            }
        }
    }
    
    // 1. Auth Check (Crucial for protecting the page)
    const isAuthenticated = checkAuthentication(); // From auth.js

    if (!isAuthenticated) {
        // *** Immediate Redirect ***
        window.location.href = 'login.html'; // Adjust path if needed
        return; // Stop further execution of main.js
    }

    // 2. Get DOM Elements (Now using the domElements object)
    // Example: const sendButton = domElements.sendButton; (no longer needed here if passed directly)

    // 3. Initial UI Setup
    // Pass necessary elements to displayUserInfo (from auth.js, needs update there too potentially, or adapt here)
    displayUserInfo(); // Keep as is for now, assuming it finds its own elements
    // Pass necessary elements to initSpeechRecognition
    initSpeechRecognition(domElements.messageInput, domElements.recordButton);
    setShowWelcomeMessageHandler(showWelcomeMessage); // Inject callback

    // 4. Load Initial Session Data (Fetch & Process Only)
    // Pass the entire domElements object now
    const loadSuccess = await loadChatSessions(domElements); // Pass the whole object

    // 5. Update UI Based on Load Result
    if (loadSuccess) {
        const sessions = getAllSessions();
        const initialSessionId = getCurrentSessionId();

        // Update sidebar first
        updateHistorySidebar(
            sessions, 
            initialSessionId, 
            handleSelectSession, 
            handleDeleteRequest, 
            domElements.historySessions,
            domElements.chatContainer,
            domElements.welcomeMessageDiv,
            domElements.chatMessagesDiv
        );

        if (initialSessionId) {
            // If there's an initial session, load its messages
            console.log("[main.js] Initial session found, loading messages...");
            await loadSessionMessages(
                initialSessionId,
                domElements.historySessions,
                domElements.chatContainer,
                domElements.welcomeMessageDiv,
                domElements.chatMessagesDiv
            );
        } else {
            // If there's no session, show the welcome screen
            console.log("[main.js] No initial session found, showing welcome screen...");
            
            // Make sure the chat messages container is hidden
            domElements.chatMessagesDiv.classList.add('hidden');
            
            // Make sure welcome message is visible
            domElements.welcomeMessageDiv.classList.remove('hidden');
            
            // Call the function to show welcome screen properly
            showWelcomeScreen(
                () => startNewChat(domElements), 
                domElements.welcomeMessageDiv,
                domElements.chatContainer,
                domElements.chatMessagesDiv
            );
        }
    } else {
        console.error('[main.js] Failed to load initial chat sessions. Check logs from session.js.');
        // Show error message if needed
        if (domElements.historySessions && !domElements.historySessions.querySelector('.text-red-500')) {
            domElements.historySessions.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lỗi tải lịch sử.</p>';
        }
        if (domElements.chatContainer) {
            domElements.chatContainer.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Không thể tải dữ liệu. Vui lòng thử lại.</p>';
        }
    }

    // 6. Attach Event Listeners (Now that initial state is potentially set)
    
    // Thực hiện hiển thị màn hình chào mừng nếu không có session nào
    if (!getCurrentSessionId()) {
        showWelcomeScreen(
            () => startNewChat(domElements), // hàm callback khi nút "Bắt đầu cuộc trò chuyện" được bấm
            domElements.welcomeMessageDiv,
            domElements.chatContainer,
            domElements.chatMessagesDiv
        );
    }

    // Send message listeners
    if (domElements.sendButton) {
        // Pass necessary elements to handleSendMessage
        domElements.sendButton.addEventListener('click', () => handleSendMessage(domElements));
    } else {
        console.warn('Send button not found');
    }

    if (domElements.messageInput) {
        domElements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Pass necessary elements to handleSendMessage
                handleSendMessage(domElements);
            }
        });
        // Auto-resize textarea (optional)
        domElements.messageInput.addEventListener('input', () => {
            domElements.messageInput.style.height = 'auto';
            domElements.messageInput.style.height = (domElements.messageInput.scrollHeight) + 'px';
        });

        // Message Input Effect (Moved from index.html)
        domElements.messageInput.addEventListener('input', function() {
            // Add a visual cue, e.g., a temporary border highlight
            domElements.messageInput.classList.add('border-primary-400', 'ring-1', 'ring-primary-200');
            setTimeout(() => {
                domElements.messageInput.classList.remove('border-primary-400', 'ring-1', 'ring-primary-200');
            }, 300);
        });
    } else {
        console.warn('Message input not found');
    }

    // New chat listeners
    if (domElements.newChatButton) {
        // Pass necessary elements to startNewChat if it manipulates UI directly
        domElements.newChatButton.addEventListener('click', () => startNewChat(domElements));
    } else {
        console.warn('New Chat button (header) not found');
    }
    if (domElements.newChatButtonSidebar) {
         // Pass necessary elements to startNewChat if it manipulates UI directly
        domElements.newChatButtonSidebar.addEventListener('click', () => startNewChat(domElements));
    } else {
        console.warn('New Chat button (sidebar) not found');
    }

    // Recording listener
    if (domElements.recordButton) {
        domElements.recordButton.addEventListener('click', toggleRecording); // toggleRecording doesn't need elements directly
    } else {
        console.warn('Record button not found');
    }

    // Logout listener
    if (domElements.logoutButton) {
        domElements.logoutButton.addEventListener('click', handleUserLogout); // handleUserLogout doesn't need elements
    } else {
        console.warn('Logout button not found');
    }

});