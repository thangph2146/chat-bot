import {
    checkAuthentication,
    displayUserInfo,
    handleUserLogout,
    getUserInfo
} from './auth.js';
import {
    loadChatSessions,
    startNewChat,
    handleClearHistoryRequest,
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
    updateHistorySidebar
} from './ui.js';

// Main application entry point
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[main.js] DOM fully loaded. Initializing...');

    // 1. Auth Check (Crucial for protecting the page)
    console.log('[main.js] ---> Calling checkAuthentication...');
    const isAuthenticated = checkAuthentication(); // From auth.js
    console.log(`[main.js] <--- checkAuthentication result: ${isAuthenticated}`);

    if (!isAuthenticated) {
        console.log('[main.js] Auth check FAILED. Redirecting to login page immediately.');
        // *** Immediate Redirect ***
        window.location.href = 'login.html'; // Adjust path if needed
        return; // Stop further execution of main.js
    }
    console.log('[main.js] Auth check PASSED.');

    // 2. Get DOM Elements
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    const newChatButton = document.getElementById('newChatButton');
    const newChatButtonSidebar = document.getElementById('newChatButtonSidebar');
    const clearHistoryButton = document.getElementById('clearHistoryButton');
    const recordButton = document.getElementById('recordButton');
    const logoutButton = document.getElementById('logoutButton');
    const historyElement = document.getElementById('historySessions'); // For error display

    // 3. Initial UI Setup
    console.log('[main.js] Performing initial UI setup...');
    displayUserInfo();
    initSpeechRecognition();
    setShowWelcomeMessageHandler(showWelcomeMessage); // Inject callback
    console.log('[main.js] Initial UI setup complete.');

    // 4. Load Initial Session Data (Fetch & Process Only)
    console.log('[main.js] ---> Calling loadChatSessions...');
    const loadSuccess = await loadChatSessions();
    console.log(`[main.js] <--- loadChatSessions completed. Success: ${loadSuccess}`);

    // 5. Update UI Based on Load Result
    if (loadSuccess) {
        const sessions = getAllSessions();
        const initialSessionId = getCurrentSessionId();
        console.log(`[main.js] Load successful. Sessions count: ${sessions?.length}, Initial Session ID: ${initialSessionId}`);
        
        // Luôn cập nhật sidebar trước
        updateHistorySidebar(sessions, initialSessionId, handleSelectSession, handleDeleteRequest);
        console.log('[main.js] History sidebar updated.');

        if (initialSessionId) {
            // Nếu có session ban đầu, tải tin nhắn cho nó
            console.log(`[main.js] ---> Calling loadSessionMessages for initial session: ${initialSessionId}`);
            await loadSessionMessages(initialSessionId); // <<< Gọi loadSessionMessages thay vì showWelcomeMessage
            console.log(`[main.js] <--- loadSessionMessages for initial session finished.`);
        } else {
            // Nếu không có session nào (loadChatSessions đã gọi startNewChat)
            console.log('[main.js] No initial session ID found. startNewChat should have handled UI.');
            // startNewChat đã gọi loadSessionUI(newSession, showWelcomeMessageHandler);
            // loadSessionUI sẽ tự gọi showWelcomeMessageHandler vì newSession chưa có messages.
        }
    } else {
        console.error('[main.js] Failed to load initial chat sessions. Check logs from session.js.');
        // Update sidebar to show error state if not already done by session.js
        if (historyElement && !historyElement.querySelector('.text-red-500')) {
             historyElement.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lỗi tải lịch sử.</p>';
        }
        // Optionally show an error message in the chat area if needed
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Không thể tải dữ liệu. Vui lòng thử lại.</p>';
        }
    }

    // 6. Attach Event Listeners (Now that initial state is potentially set)
    console.log('[main.js] Attaching event listeners...');
    // Send message listeners
    if (sendButton) {
        sendButton.addEventListener('click', handleSendMessage);
    } else {
        console.warn('Send button not found');
    }

    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
        // Auto-resize textarea (optional)
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = (messageInput.scrollHeight) + 'px';
        });

        // Message Input Effect (Moved from index.html)
        messageInput.addEventListener('input', function() {
            // Add a visual cue, e.g., a temporary border highlight
            messageInput.classList.add('border-primary-400', 'ring-1', 'ring-primary-200'); 
            setTimeout(() => {
                messageInput.classList.remove('border-primary-400', 'ring-1', 'ring-primary-200');
            }, 300);
        });
        console.log('[main.js] Added input effect listener to messageInput.');
    } else {
        console.warn('Message input not found');
    }

    // New chat listeners
    if (newChatButton) {
        newChatButton.addEventListener('click', startNewChat);
    } else {
        console.warn('New Chat button (header) not found');
    }
    if (newChatButtonSidebar) {
        newChatButtonSidebar.addEventListener('click', startNewChat);
    } else {
        console.warn('New Chat button (sidebar) not found');
    }

    // Clear history listener
    if (clearHistoryButton) {
        clearHistoryButton.addEventListener('click', handleClearHistoryRequest);
    } else {
        console.warn('Clear History button not found');
    }

    // Recording listener
    if (recordButton) {
        recordButton.addEventListener('click', toggleRecording);
    } else {
        console.warn('Record button not found');
    }

    // Logout listener
    if (logoutButton) {
        logoutButton.addEventListener('click', handleUserLogout);
    } else {
        console.warn('Logout button not found');
    }

    console.log('[main.js] Initialization complete.');
}); 