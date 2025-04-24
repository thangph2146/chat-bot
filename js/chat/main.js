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
import { showWelcomeMessage } from './chat.js';
import {
    initSpeechRecognition,
    toggleRecording
} from './speech.js';
import {
    updateHistorySidebar,
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
        userInfoDisplay: document.getElementById('userInfoDisplay')
    };
    
    
    // Basic check for essential containers
    if (!domElements.chatContainer || !domElements.historySessions) {
        console.error("[main.js] Critical DOM elements missing (chatContainer or historySessions). Aborting.");
        // Maybe display a user-friendly error message in the body
        document.body.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Lỗi tải giao diện người dùng. Vui lòng thử lại.</p>';
        return;
    }

    // 1. Auth Check (Crucial for protecting the page)
    const isAuthenticated = checkAuthentication(); // From auth.js

    if (!isAuthenticated) {
        // *** Immediate Redirect ***
        window.location.href = 'login.html'; // Adjust path if needed
        return; // Stop further execution of main.js
    }

    // 2. Get DOM Elements (Now using the domElements object)
    // Elements are already gathered above

    // 3. Initial UI Setup
    displayUserInfo(); // Assumes it finds its own elements or uses localStorage
    // Pass necessary elements to initSpeechRecognition
    if (domElements.messageInput && domElements.recordButton) {
        initSpeechRecognition(domElements.messageInput, domElements.recordButton);
    } else {
        console.warn("[main.js] Cannot initialize speech recognition: messageInput or recordButton not found.");
    }
    setShowWelcomeMessageHandler(showWelcomeMessage); // Inject callback for dynamic welcome message

    // 4. Load Initial Session Data (Fetch & Process Only)
    // Pass the entire domElements object now
    const loadSuccess = await loadChatSessions(domElements); // Pass the whole object

    // 5. Update UI Based on Load Result
    if (loadSuccess) {
        const sessions = getAllSessions();
        const initialSessionId = getCurrentSessionId(); // Get ID *after* loadChatSessions potentially created one

        // Update sidebar (always do this after load)
        updateHistorySidebar(
            sessions, 
            initialSessionId, 
            handleSelectSession, 
            handleDeleteRequest, 
            domElements.historySessions, // Essential
            domElements.chatContainer,   // Essential
            domElements.welcomeMessageDiv, // Pass even if potentially null
            domElements.chatMessagesDiv    // Pass even if potentially null
        );

        if (initialSessionId) {
            // If a session ID exists (either loaded or newly created), load its messages
            // Note: If it was newly created by startNewChat, loadSessionMessages might be called
            //       redundantly, but loadSessionMessages clears the container anyway.
            //       Alternatively, startNewChat could return a flag.
            await loadSessionMessages(
                initialSessionId,
                domElements.historySessions, // Essential
                domElements.chatContainer,   // Essential
                domElements.welcomeMessageDiv,
                domElements.chatMessagesDiv
            );
        } else {
            // This block should ideally NOT be reached if loadChatSessions successfully 
            // created a new session when the list was empty. 
            // If it IS reached, it implies loadChatSessions failed to create a session.
            console.error("[main.js] No session ID found after successful loadChatSessions. This might indicate an issue in startNewChat.");
            // Display a generic error or fallback UI
            if (domElements.chatContainer) {
                 domElements.chatContainer.innerHTML = '<p class="text-center text-red-500 p-4">Không thể tải hoặc tạo cuộc trò chuyện.</p>';
            }
            // Ensure static welcome screen is hidden if it exists
             if (domElements.welcomeMessageDiv) {
                 domElements.welcomeMessageDiv.style.display = 'none';
             }
        }
    } else {
        // loadChatSessions failed (e.g., API error, auth error handled internally)
        console.error("[main.js] loadChatSessions failed. See previous logs for details.");
        // UI might already show an error (e.g., in history sidebar), 
        // or display a general error in the chat container.
        if (domElements.chatContainer) {
            domElements.chatContainer.innerHTML = '<p class="text-center text-red-500 p-4">Đã xảy ra lỗi khi tải dữ liệu trò chuyện.</p>';
        }
         // Ensure static welcome screen is hidden if it exists
         if (domElements.welcomeMessageDiv) {
             domElements.welcomeMessageDiv.style.display = 'none';
         }
    }

    // 6. Add Event Listeners (using domElements)
    if (domElements.sendButton && domElements.messageInput) {
        domElements.sendButton.addEventListener('click', async () => {
            try {
                const chatModule = await import('./chat.js');
                if (chatModule && typeof chatModule.handleSendMessage === 'function') {
                     await chatModule.handleSendMessage(domElements);
                } else {
                     console.error("[main.js] handleSendMessage function not found in dynamically imported module (sendButton).");
                }
            } catch (error) {
                 console.error("[main.js] Error dynamically importing or calling handleSendMessage (sendButton):", error);
            }
        });
        domElements.messageInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent default newline on Enter
                 try {
                    const chatModule = await import('./chat.js');
                    if (chatModule && typeof chatModule.handleSendMessage === 'function') {
                         await chatModule.handleSendMessage(domElements);
                    } else {
                         console.error("[main.js] handleSendMessage function not found in dynamically imported module (keypress).");
                    }
                } catch (error) {
                     console.error("[main.js] Error dynamically importing or calling handleSendMessage (keypress):", error);
                }
            }
        });
    } else {
        console.warn("[main.js] Cannot add send listeners: sendButton or messageInput not found.");
    }

    if (domElements.newChatButton) {
        domElements.newChatButton.addEventListener('click', async () => {
            const result = await startNewChat(domElements);
            if (result.success && result.needsInitialMessage) {
                if(domElements.messageInput) {
                    domElements.messageInput.value = "Bắt đầu cuộc trò chuyện mới";
                     try {
                        const chatModule = await import('./chat.js');
                        if (chatModule && typeof chatModule.handleSendMessage === 'function') {
                            await chatModule.handleSendMessage(domElements);
                        } else {
                             console.error("[main.js] handleSendMessage function not found in dynamically imported module (newChatButton).");
                        }
                    } catch (error) {
                         console.error("[main.js] Error dynamically importing or calling handleSendMessage (newChatButton):", error);
                    }
                } else {
                    console.warn("[main.js] Cannot send initial message: messageInput not found.");
                }
            }
        });
    } else {
        console.warn("[main.js] newChatButton not found.");
    }
    if (domElements.newChatButtonSidebar) {
        domElements.newChatButtonSidebar.addEventListener('click', async () => {
            const result = await startNewChat(domElements);
            if (result.success && result.needsInitialMessage) {
                if(domElements.messageInput) {
                    domElements.messageInput.value = "Bắt đầu cuộc trò chuyện mới";
                    try {
                        const chatModule = await import('./chat.js');
                        if (chatModule && typeof chatModule.handleSendMessage === 'function') {
                             await chatModule.handleSendMessage(domElements);
                        } else {
                             console.error("[main.js] handleSendMessage function not found in dynamically imported module (newChatSidebar).");
                        }
                    } catch (error) {
                         console.error("[main.js] Error dynamically importing or calling handleSendMessage (newChatSidebar):", error);
                    }
                } else {
                    console.warn("[main.js] Cannot send initial message: messageInput not found.");
                }
            }
        });
    } else {
        console.warn("[main.js] newChatButtonSidebar not found.");
    }

    if (domElements.recordButton) {
        domElements.recordButton.addEventListener('click', () => toggleRecording(domElements.recordButton)); // Pass the button itself
    } else {
        console.warn("[main.js] recordButton not found.");
    }

    if (domElements.logoutButton) {
        domElements.logoutButton.addEventListener('click', handleUserLogout); // Assumes handleUserLogout handles redirect
    } else {
        console.warn("[main.js] logoutButton not found.");
    }
});