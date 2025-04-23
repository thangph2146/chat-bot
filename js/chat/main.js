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
    updateHistorySidebar
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
        // Add any other frequently used elements here
    };
    // --- END: Gather DOM Elements ---

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

        // LuÃ´n cáº­p nháº­t sidebar trÆ°á»›c
        // Pass historySessions element to updateHistorySidebar
        updateHistorySidebar(
            sessions, 
            initialSessionId, 
            handleSelectSession, 
            handleDeleteRequest, 
            domElements.historySessions, // historySessionsElement
            domElements.chatContainer,    // chatContainerElement (ThÃªm)
            domElements.welcomeMessageDiv,// welcomeElement (ThÃªm)
            domElements.chatMessagesDiv   // chatMessagesElement (ThÃªm)
        );

        if (initialSessionId) {
            // Náº¿u cÃ³ session ban Ä‘áº§u, táº£i tin nháº¯n cho nÃ³
            // Pass ALL required elements to loadSessionMessages
            await loadSessionMessages(
                initialSessionId,
                domElements.historySessions,    // <<< ThÃªm historySessions
                domElements.chatContainer,      // <<< ÄÃ£ cÃ³
                domElements.welcomeMessageDiv,  // <<< ThÃªm welcomeMessageDiv
                domElements.chatMessagesDiv     // <<< ThÃªm chatMessagesDiv
            );
        } else {
            // Náº¿u khÃ´ng cÃ³ session nÃ o (loadChatSessions Ä‘Ã£ gá»i startNewChat)
             // startNewChat will need to receive elements too if it calls loadSessionUI
             // Need to trace how showWelcomeMessage is ultimately called and ensure elements are passed down
        }
    } else {
        console.error('[main.js] Failed to load initial chat sessions. Check logs from session.js.');
        // Update sidebar to show error state if not already done by session.js
        if (domElements.historySessions && !domElements.historySessions.querySelector('.text-red-500')) {
             domElements.historySessions.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lá»—i táº£i lá»‹ch sá»­.</p>';
        }
        // Optionally show an error message in the chat area if needed
        if (domElements.chatContainer) {
            domElements.chatContainer.innerHTML = '<p class="text-center text-red-500 text-sm p-4">KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u. Vui lÃ²ng thá»­ láº¡i.</p>';
        }
    }

    // 6. Attach Event Listeners (Now that initial state is potentially set)
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