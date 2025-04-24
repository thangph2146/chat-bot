// File xử lý màn hình chào mừng

import { getCurrentSessionId } from './chat/session.js'; // Import getCurrentSessionId

// Store references to elements once the DOM is loaded
let welcomeDivRef = null;
let messagesDivRef = null;

document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.getElementById('chatContainer');
    // Assign to the stored references
    welcomeDivRef = document.getElementById('welcomeMessage'); 
    messagesDivRef = document.getElementById('chatMessages');
    
    const startChatButton = document.getElementById('startChatButton');

    if (!chatContainer) {
        console.error("#chatContainer not found!");
        return;
    }
    // Check the references
    if (!welcomeDivRef) { 
        console.error("#welcomeMessage not found inside chatContainer!");
        return;
    }
    if (!messagesDivRef) { 
        console.error("#chatMessages not found!");
    }
    if (!startChatButton) {
        console.error("#startChatButton not found inside welcomeMessage!");
        return;
    }


    // Ensure welcome message is visible and chat messages are hidden initially
    welcomeDivRef.style.display = 'flex'; // Use flex as per HTML
    if (messagesDivRef) {
        messagesDivRef.classList.add('hidden');
    }

    // Add event listener for the start chat button
    startChatButton.addEventListener('click', async function() {

        // Hide welcome message using the reference
        if (welcomeDivRef) {
            welcomeDivRef.style.display = 'none';
        }

        // Show chat messages area using the reference
        if (messagesDivRef) {
            messagesDivRef.classList.remove('hidden');
        } else {
            console.warn("Cannot show chatMessages, element reference not found.");
            // If chat messages div isn't even found, we probably can't send a message
            return; 
        }

        // --- Send the initial message --- 
        const currentSessId = getCurrentSessionId();
        const messageInputRef = document.getElementById('messageInput'); // Find input element
        const chatContainerRef = document.getElementById('chatContainer'); // Find chat container
        const historySessionsRef = document.getElementById('historySessions'); // <<< GET HISTORY SESSIONS REF

        if (currentSessId && messageInputRef && welcomeDivRef && messagesDivRef && chatContainerRef && historySessionsRef) { 
            // Prepare the domElements object required by handleSendMessage
            const domElementsForSend = {
                messageInput: messageInputRef,
                chatMessagesDiv: messagesDivRef, 
                welcomeMessageDiv: welcomeDivRef,
                chatContainer: chatContainerRef,
                historySessions: historySessionsRef, // <<< ADD HISTORY SESSIONS
                // Add other elements if handleSendMessage requires them in the future
                // e.g., userInfoDisplay, logoutButton if needed by downstream functions
            };

            // Set the message content
            messageInputRef.value = "Bắt đầu cuộc trò chuyện";

            try {
                // Use dynamic import here
                const chatModule = await import('./chat/chat.js'); 
                if (chatModule && typeof chatModule.handleSendMessage === 'function') {
                    // Call handleSendMessage from the dynamically imported module
                    await chatModule.handleSendMessage(domElementsForSend);
                } else {
                    console.error("[welcome-screen.js] handleSendMessage function not found in dynamically imported module.");
                }
            } catch (error) {
                console.error("[welcome-screen.js] Error dynamically importing or calling handleSendMessage:", error);
            }
            

            // Clear the input field immediately after calling send
            messageInputRef.value = ''; 

        } else {
            // Update the warning message
            console.warn("[welcome-screen.js] Cannot send initial message. Missing SessionID, messageInput, welcomeDiv, messagesDiv, chatContainer, or historySessions.", 
                { currentSessId, messageInputRef, welcomeDivRef, messagesDivRef, chatContainerRef, historySessionsRef });
        }
    });
});

// Function to explicitly show the welcome screen (e.g., called by main.js or auth.js)
window.showWelcomeScreen = function() {
    // Use the stored references
    if (welcomeDivRef) {
        // We might need to re-add the welcomeDivRef to the chatContainer 
        // if it was previously removed by innerHTML clearing.
        const chatContainer = document.getElementById('chatContainer'); // Find container again
        if (chatContainer && !chatContainer.contains(welcomeDivRef)) {
             // Ensure chat messages are removed first if they exist and are present
            if (messagesDivRef && chatContainer.contains(messagesDivRef)) {
                chatContainer.removeChild(messagesDivRef);
            }
             // Add welcome message back
            chatContainer.appendChild(welcomeDivRef);
        }
        welcomeDivRef.style.display = 'flex';
    } else {
        console.error("Cannot show welcome screen: #welcomeMessage reference is null.");
    }

    // Hide chat messages using the reference (it might not be in the DOM anymore, which is fine)
    if (messagesDivRef) {
        messagesDivRef.classList.add('hidden');
        // Also remove it from DOM if it exists to avoid duplicate content later
         if (messagesDivRef.parentNode) {
             messagesDivRef.parentNode.removeChild(messagesDivRef);
         }
         // Clear its content just in case it gets re-added later improperly
        messagesDivRef.innerHTML = ''; 
    } else {
        // This warning is less critical now, as we primarily work with welcomeDivRef
        // console.warn("Cannot hide chat messages: #chatMessages reference is null.");
    }

    // Ensure the main chat container has no other stray content (like error messages)
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer && chatContainer.firstChild && chatContainer.firstChild !== welcomeDivRef) {
        // If the first child isn't the welcome screen, clear it before showing welcome.
        // This handles cases where error messages were injected.
        // Be careful not to remove welcomeDivRef itself if it's already the first child.
        while (chatContainer.firstChild && chatContainer.firstChild !== welcomeDivRef) {
            chatContainer.removeChild(chatContainer.firstChild);
        }
        // If welcomeDivRef wasn't already there, add it.
        if (!chatContainer.contains(welcomeDivRef)) {
             chatContainer.appendChild(welcomeDivRef);
        }
    }
};