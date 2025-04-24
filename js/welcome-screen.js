// File xử lý màn hình chào mừng
document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    const welcomeMessageDiv = document.getElementById('welcomeMessage');
    const startChatButton = document.getElementById('startChatButton');

    if (!chatContainer) {
        console.error("#chatContainer not found!");
        return;
    }
    if (!welcomeMessageDiv) {
        console.error("#welcomeMessage not found inside chatContainer!");
        // Optional: Add fallback logic here if needed, but rely on HTML structure first
        return;
    }
    if (!chatMessages) {
        console.error("#chatMessages not found!");
        // Continue if possible, but log the error
    }
    if (!startChatButton) {
        console.error("#startChatButton not found inside welcomeMessage!");
        return;
    }


    // Ensure welcome message is visible and chat messages are hidden initially
    welcomeMessageDiv.style.display = 'flex'; // Use flex as per HTML
    if (chatMessages) {
        chatMessages.classList.add('hidden');
    }

    // Add event listener for the start chat button
    startChatButton.addEventListener('click', function() {

        // Hide welcome message
        welcomeMessageDiv.style.display = 'none';

        // Show chat messages area
        if (chatMessages) {
            chatMessages.classList.remove('hidden');
        } else {
            console.warn("Cannot show chatMessages, element not found.");
        }

        // Dynamically import and call startNewChat from session.js
        import('./chat/session.js')
            .then(sessionModule => {
                if (sessionModule && typeof sessionModule.startNewChat === 'function') {
                    // Gather necessary DOM elements for startNewChat (ensure these exist)
                    const domElements = {
                        chatContainer: chatContainer,
                        messageInput: document.getElementById('messageInput'),
                        sendButton: document.getElementById('sendButton'),
                        newChatButton: document.getElementById('newChatButton'),
                        newChatButtonSidebar: document.getElementById('newChatButtonSidebar'),
                        recordButton: document.getElementById('recordButton'),
                        historySessions: document.getElementById('historySessions'),
                        chatMessagesDiv: chatMessages, // Already found
                        welcomeMessageDiv: welcomeMessageDiv, // Already found
                        userInfoDisplay: document.getElementById('userInfoDisplay')
                    };

                    // Minimal check for essential elements passed to startNewChat
                    if (!domElements.historySessions || !domElements.chatMessagesDiv) {
                        console.error("Missing essential DOM elements for startNewChat:", domElements);
                        return;
                    }
                    sessionModule.startNewChat(domElements);
                } else {
                    console.error("startNewChat function not found in session.js module.");
                }
            })
            .catch(err => {
                console.error("Error importing or executing session.js:", err);
            });
    });
});

// Function to explicitly show the welcome screen (e.g., called by main.js or auth.js)
window.showWelcomeScreen = function() {
    const welcomeDiv = document.getElementById('welcomeMessage');
    const messagesDiv = document.getElementById('chatMessages');

    if (welcomeDiv) {
        welcomeDiv.style.display = 'flex';
    } else {
        console.error("Cannot show welcome screen: #welcomeMessage not found.");
    }

    if (messagesDiv) {
        messagesDiv.classList.add('hidden');
        messagesDiv.innerHTML = ''; // Clear previous messages when showing welcome screen
    } else {
        console.warn("Cannot hide chat messages: #chatMessages not found.");
    }
};