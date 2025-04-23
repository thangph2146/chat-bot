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

    // --- START: Gather DOM Elements ---
    const domElements = {
        chatContainer: document.getElementById('chatContainer'),
        messageInput: document.getElementById('messageInput'),
        sendButton: document.getElementById('sendButton'),
        newChatButton: document.getElementById('newChatButton'),
        newChatButtonSidebar: document.getElementById('newChatButtonSidebar'),
        clearHistoryButton: document.getElementById('clearHistoryButton'),
        recordButton: document.getElementById('recordButton'),
        logoutButton: document.getElementById('logoutButton'),
        historySessions: document.getElementById('historySessions'),
        chatMessagesDiv: document.getElementById('chatMessages'),
        welcomeMessageDiv: document.getElementById('welcomeMessage'),
        userInfoDisplay: document.getElementById('userInfoDisplay') // Added for displayUserInfo
        // Add any other frequently used elements here
    };
    console.log('[main.js] Collected DOM elements:', domElements);
    // --- END: Gather DOM Elements ---

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

    // 2. Get DOM Elements (Now using the domElements object)
    // Example: const sendButton = domElements.sendButton; (no longer needed here if passed directly)

    // 3. Initial UI Setup
    console.log('[main.js] Performing initial UI setup...');
    // Pass necessary elements to displayUserInfo (from auth.js, needs update there too potentially, or adapt here)
    displayUserInfo(); // Keep as is for now, assuming it finds its own elements
    // Pass necessary elements to initSpeechRecognition
    initSpeechRecognition(domElements.messageInput, domElements.recordButton);
    setShowWelcomeMessageHandler(showWelcomeMessage); // Inject callback
    console.log('[main.js] Initial UI setup complete.');

    // 4. Load Initial Session Data (Fetch & Process Only)
    console.log('[main.js] ---> Calling loadChatSessions...');
    // Pass historySessions element for potential error display inside loadChatSessions
    const loadSuccess = await loadChatSessions(domElements.historySessions);
    console.log(`[main.js] <--- loadChatSessions completed. Success: ${loadSuccess}`);

    // 5. Update UI Based on Load Result
    if (loadSuccess) {
        const sessions = getAllSessions();
        const initialSessionId = getCurrentSessionId();
        console.log(`[main.js] Load successful. Sessions count: ${sessions?.length}, Initial Session ID: ${initialSessionId}`);

        // Luôn cập nhật sidebar trước
        // Pass historySessions element to updateHistorySidebar
        updateHistorySidebar(
            sessions, 
            initialSessionId, 
            handleSelectSession, 
            handleDeleteRequest, 
            domElements.historySessions, // historySessionsElement
            domElements.chatContainer,    // chatContainerElement (Thêm)
            domElements.welcomeMessageDiv,// welcomeElement (Thêm)
            domElements.chatMessagesDiv   // chatMessagesElement (Thêm)
        );
        console.log('[main.js] History sidebar updated.');

        if (initialSessionId) {
            // Nếu có session ban đầu, tải tin nhắn cho nó
            console.log(`[main.js] ---> Calling loadSessionMessages for initial session: ${initialSessionId}`);
            // Pass ALL required elements to loadSessionMessages
            await loadSessionMessages(
                initialSessionId,
                domElements.historySessions,    // <<< Thêm historySessions
                domElements.chatContainer,      // <<< Đã có
                domElements.welcomeMessageDiv,  // <<< Thêm welcomeMessageDiv
                domElements.chatMessagesDiv     // <<< Thêm chatMessagesDiv
            );
            console.log(`[main.js] <--- loadSessionMessages for initial session finished.`);
        } else {
            // Nếu không có session nào (loadChatSessions đã gọi startNewChat)
            console.log('[main.js] No initial session ID found. startNewChat should have handled UI.');
             // startNewChat will need to receive elements too if it calls loadSessionUI
             // Need to trace how showWelcomeMessage is ultimately called and ensure elements are passed down
        }
    } else {
        console.error('[main.js] Failed to load initial chat sessions. Check logs from session.js.');
        // Update sidebar to show error state if not already done by session.js
        if (domElements.historySessions && !domElements.historySessions.querySelector('.text-red-500')) {
             domElements.historySessions.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lỗi tải lịch sử.</p>';
        }
        // Optionally show an error message in the chat area if needed
        if (domElements.chatContainer) {
            domElements.chatContainer.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Không thể tải dữ liệu. Vui lòng thử lại.</p>';
        }
    }

    // 6. Attach Event Listeners (Now that initial state is potentially set)
    console.log('[main.js] Attaching event listeners...');
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
        console.log('[main.js] Added input effect listener to messageInput.');
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

    // Clear history listener
    if (domElements.clearHistoryButton) {
        // Pass necessary elements if handleClearHistoryRequest needs them (e.g., for dialogs from ui.js)
        domElements.clearHistoryButton.addEventListener('click', () => handleClearHistoryRequest(domElements));
    } else {
        console.warn('Clear History button not found');
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

    console.log('[main.js] Initialization complete.');
}); 