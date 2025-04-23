import { CHAT_API_ENDPOINT } from './config.js';
import { getUserInfo } from './auth.js';
import { getCurrentSession, getCurrentSessionId, addMessageToCurrentSession, updateCurrentSessionTitle, updateCurrentSessionConversationId } from './session.js';
import { showLoading, addMessageToChat, showNotification, hideStaticWelcomeMessage } from './ui.js';
import { handleSseStream } from './api.js';
import { renderMarkdown, highlightCodeBlocks } from './utils.js';

// Dependency (DOM Element - consider passing as argument or getting in main.js)
const messageInput = document.getElementById('messageInput');
const chatContainer = document.getElementById('chatContainer');
const chatMessagesDiv = document.getElementById('chatMessages'); // Get chat messages div
const welcomeMessageDiv = document.getElementById('welcomeMessage'); // Get welcome message div

/**
 * Xử lý việc gửi tin nhắn của người dùng.
 */
export async function handleSendMessage() {
    if (!messageInput || !chatMessagesDiv || !welcomeMessageDiv) {
        console.error('[chat.js] Missing critical elements (input, chatMessages, welcomeMessage) for sending message.');
        return;
    }
    const message = messageInput.value.trim();
    if (!message) return;

    // 1. Get necessary info
    const userInfo = getUserInfo();
    const token = userInfo?.data?.token;
    const userId = userInfo?.data?.userId;
    const currentSession = getCurrentSession();
    const currentSessId = getCurrentSessionId();

    if (!token || userId === undefined || userId === null) {
        console.error("[chat.js] User info (ID or Token) missing.", { userId, token: !!token });
        showNotification("Lỗi thông tin người dùng, không thể gửi tin nhắn.", "error");
        return;
    }

    if (!currentSession || !currentSessId) {
        console.warn("[chat.js] No active session selected.");
        showNotification("Vui lòng bắt đầu hoặc chọn một cuộc trò chuyện.", "warning");
        return;
    }

    // *** Transition from Welcome to Chat ***
    if (!welcomeMessageDiv.classList.contains('hidden')) {
        console.log('[chat.js] First user message detected. Hiding welcome message and showing chat messages container.');
        welcomeMessageDiv.classList.add('hidden');
        chatMessagesDiv.classList.remove('hidden');
    }

    const conversationId = currentSession.conversationId || null;
    const messageToSend = message;

    // 2. Add user message to UI (now targets chatMessagesDiv) and session state
    const userMessageData = {
        content: messageToSend,
        isUser: true,
        timestamp: new Date().toISOString()
    };
    addMessageToChat(messageToSend, true, false, null, userMessageData.timestamp); // UI only
    addMessageToCurrentSession(userMessageData); // Add to session state

    messageInput.value = '';
    messageInput.style.height = 'auto';

    // 3. Update title if first message (client-side)
    if (currentSession.title && currentSession.title.startsWith('Cuộc trò chuyện mới') && messageToSend.length > 0) {
        const newTitle = messageToSend.length > 30 ? messageToSend.substring(0, 27) + '...' : messageToSend;
        updateCurrentSessionTitle(newTitle);
        // Note: API call to update server title is handled in session.js if needed
    }

    // 4. Prepare and call API (Streaming to chatMessagesDiv)
    showLoading(true);
    const aiPlaceholderElement = addMessageToChat(null, false, false, null, null, true);
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;

    const apiUrl = CHAT_API_ENDPOINT;
    const requestBody = {
        inputs: {}, // Add context if needed
        query: messageToSend,
        response_mode: 'streaming',
        user: String(userId),
        conversation_id: latestConversationId // Use the potentially updated conversationId
    };
    let latestConversationId = currentSession.conversationId || null; // Use let for potential update

    try {
        const result = await handleSseStream(
            apiUrl,
            requestBody,
            token,
            aiPlaceholderElement, // Pass the content element for updates
            (result) => {
                // onComplete: Save the complete AI message to the session state
                const aiMessageData = {
                    id: result.messageId,
                    content: result.fullMessage,
                    isUser: false,
                    timestamp: new Date().toISOString()
                };
                addMessageToCurrentSession(aiMessageData);
                if (result.conversationId && result.conversationId !== latestConversationId) {
                     latestConversationId = result.conversationId; // Update for subsequent calls
                     updateCurrentSessionConversationId(latestConversationId); // Update session's conversationId if received
                     console.log('[chat.js] Updated session conversationId:', latestConversationId);
                }
                console.log('[chat.js] AI message saved:', { aiMessageId: result.messageId, conversationId: result.conversationId });
            },
            (error) => {
                console.error('[chat.js] SSE stream failed in handleSendMessage callback:', error);
            }
        );
         // Update conversation ID even if it was received before completion
         if (result.conversationId && result.conversationId !== latestConversationId) {
            latestConversationId = result.conversationId;
            updateCurrentSessionConversationId(latestConversationId);
            console.log('[chat.js] Updated session conversationId after stream completion:', latestConversationId);
        }

    } catch (error) {
        console.error('[chat.js] handleSendMessage caught error from handleSseStream:', error);
    } finally {
        showLoading(false);
    }
}

/**
 * Fetches and displays the initial welcome message into the dedicated welcome area.
 */
export async function showWelcomeMessage() {
    console.log('[chat.js] Preparing to show dynamic welcome message.');
    const dynamicWelcomeContainer = document.getElementById('dynamicWelcomeContent');
    if (!welcomeMessageDiv || !dynamicWelcomeContainer || !chatMessagesDiv) {
        console.error('[chat.js] Missing critical elements (welcomeMessage, dynamicWelcomeContent, chatMessages) for showing welcome message.');
        return;
    }

    // Ensure welcome area is visible and chat area is hidden
    welcomeMessageDiv.classList.remove('hidden');
    chatMessagesDiv.classList.add('hidden');
    dynamicWelcomeContainer.innerHTML = ''; // Clear previous dynamic content

    console.log('[chat.js] Fetching dynamic welcome message from API...');

    const userInfo = getUserInfo();
    const token = userInfo?.data?.token;
    const userId = userInfo?.data?.userId;
    const currentSessId = getCurrentSessionId();

    if (!token || userId === undefined || userId === null) {
        console.error("[chat.js] User info missing for welcome message.");
        dynamicWelcomeContainer.innerHTML = '<p class="text-red-500">Chào bạn! Tôi là Trợ lý Tuyển sinh HUB. (Lỗi xác thực)</p>';
        return;
    }

    // Create placeholder directly in the dynamic container (simpler styling)
    dynamicWelcomeContainer.innerHTML = `
        <div class="flex justify-center items-center p-4">
            <div class="ellipsis-animation"><span>.</span><span>.</span><span>.</span></div>
        </div>
    `;
    const placeholderContentElement = dynamicWelcomeContainer; // Target the container itself for now

    const apiUrl = CHAT_API_ENDPOINT;
    const requestBody = {
        inputs: {},
        query: 'Bắt đầu cuộc trò chuyện', // Special query for welcome
        response_mode: 'streaming',
        user: String(userId),
        conversation_id: currentSessId
    };
    console.log('[chat.js] Sending welcome message request:', requestBody);

    try {
        // Modify handleSseStream slightly? Or just update the container directly.
        // Let's update the container directly for simplicity here.
        let fullWelcomeMessage = '';
        let latestConversationId = currentSessId;

        await handleSseStream(
            apiUrl,
            requestBody,
            token,
            null, // Pass null for targetElement, we'll handle updates below
            (result) => { // onComplete
                console.log('[chat.js] Welcome message loaded.', { conversationId: result.conversationId });
                fullWelcomeMessage = result.fullMessage;
                 if (result.conversationId && result.conversationId !== latestConversationId) {
                    latestConversationId = result.conversationId;
                    updateCurrentSessionConversationId(latestConversationId);
                    console.log('[chat.js] Updated session conversationId from welcome:', latestConversationId);
                 }
                 // Final render after completion
                 placeholderContentElement.innerHTML = `<div class="markdown-content p-2">${renderMarkdown(fullWelcomeMessage)}</div>`;
                 highlightCodeBlocks(placeholderContentElement);
            },
            (error) => { // onError
                console.error('[chat.js] SSE stream failed for welcome message:', error);
                placeholderContentElement.innerHTML = `<div class="markdown-content text-red-500 p-2">Xin lỗi, đã xảy ra lỗi khi tải lời chào: ${error.message}</div>`;
            },
            (chunkData) => { // onChunk received
                if (chunkData.text) { // Assuming API sends chunk text in 'text' field
                    fullWelcomeMessage += chunkData.text;
                    // Incremental render
                    placeholderContentElement.innerHTML = `<div class="markdown-content p-2">${renderMarkdown(fullWelcomeMessage)}<span class="blinking-cursor">▋</span></div>`;
                }
                 if (chunkData.conversation_id && chunkData.conversation_id !== latestConversationId) {
                    latestConversationId = chunkData.conversation_id;
                    // Update immediately? Or wait for completion? Let's wait.
                 }
            }
        );

         // Ensure conversation ID is updated if received only at the end
         // const finalResult = await ... (handleSseStream modified needed to return final result if chunk handling is internal)
         // For now, assuming onComplete gets the final ID

    } catch (error) {
        console.error('[chat.js] showWelcomeMessage caught error:', error);
        if (!placeholderContentElement.querySelector('.markdown-content')) { // Fallback if streaming failed early
             placeholderContentElement.innerHTML = `<div class="markdown-content text-red-500 p-2">Chào bạn! Tôi là Trợ lý Tuyển sinh HUB. (Lỗi tải lời chào)</div>`;
        }
    }
}