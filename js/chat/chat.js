import { CHAT_API_ENDPOINT, DIFY_CHAT_API_ENDPOINT, DIFY_API_KEY, SAVE_MESSAGE_ENDPOINT } from './config.js';
import { getUserInfo } from './auth.js';
import { getCurrentSession, getCurrentSessionId, addMessageToCurrentSession, updateCurrentSessionTitle, updateCurrentSessionConversationId } from './session.js';
import { showLoading, addMessageToChat, showNotification, hideStaticWelcomeMessage } from './ui.js';
import { handleSseStream, fetchWithAuth } from './api.js';
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
    const messageToSend = messageInput.value.trim();
    if (!messageToSend) return;

    // 1. Get necessary info
    const userInfo = getUserInfo();
    const token = userInfo?.data?.token;
    const difyApiKey = DIFY_API_KEY;
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

    let latestConversationId = currentSession.conversationId || null;

    // --- Bước 1: Lưu tin nhắn người dùng vào backend --- (Sử dụng fetchWithAuth)
    const userPayload = {
        sessionId: currentSessId,
        userId: Number(userId),
        isUser: true,
        content: messageToSend
    };
    try {
        console.log('[chat.js] Saving user message to backend:', userPayload);
        fetchWithAuth(SAVE_MESSAGE_ENDPOINT, {
            method: 'POST',
            body: userPayload
        }, false);
    } catch (error) {
        console.error('[chat.js] Error preparing/sending user message save request:', error);
    }

    // --- Thêm tin nhắn user vào UI và session (như cũ) ---
    const userMessageData = {
        content: messageToSend,
        isUser: true,
        timestamp: new Date().toISOString()
    };
    addMessageToChat(messageToSend, true, false, null, userMessageData.timestamp); // UI only
    addMessageToCurrentSession(userMessageData); // Add to session state

    messageInput.value = '';
    messageInput.style.height = 'auto';

    // --- Update title if first message (client-side) ---
    if (currentSession.title && currentSession.title.startsWith('Cuộc trò chuyện mới') && messageToSend.length > 0) {
        const newTitle = messageToSend.length > 30 ? messageToSend.substring(0, 27) + '...' : messageToSend;
        updateCurrentSessionTitle(newTitle);
    }

    // --- Bước 2: Gọi AI (Dify) để lấy câu trả lời ---
    showLoading(true);
    const aiPlaceholderElement = addMessageToChat(null, false, false, null, null, true);
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;

    const difyApiUrl = DIFY_CHAT_API_ENDPOINT;
    const difyRequestBody = {
        inputs: {},
        query: messageToSend,
        response_mode: 'streaming',
        user: String(userId),
        conversation_id: latestConversationId
    };

    try {
        const result = await handleSseStream(
            difyApiUrl,
            difyRequestBody,
            difyApiKey,
            aiPlaceholderElement,
            (result) => {
                console.log('[chat.js] Dify stream completed. Saving AI message.');
                const aiPayload = {
                    sessionId: currentSessId,
                    userId: Number(userId),
                    isUser: false,
                    content: result.fullMessage || ""
                };
                try {
                    console.log('[chat.js] Saving AI message to backend:', aiPayload);
                    fetchWithAuth(SAVE_MESSAGE_ENDPOINT, {
                        method: 'POST',
                        body: aiPayload
                    }, false);
                } catch (error) {
                    console.error('[chat.js] Error preparing/sending AI message save request:', error);
                }

                const aiMessageData = {
                    id: result.messageId,
                    content: result.fullMessage,
                    isUser: false,
                    timestamp: new Date().toISOString()
                };
                addMessageToCurrentSession(aiMessageData);

                if (result.conversationId && result.conversationId !== latestConversationId) {
                     latestConversationId = result.conversationId;
                     updateCurrentSessionConversationId(latestConversationId);
                     console.log('[chat.js] Updated session conversationId from Dify:', latestConversationId);
                }
                console.log('[chat.js] AI message saved to session state and backend save initiated.');
            },
            (error) => {
                console.error('[chat.js] Dify SSE stream failed callback:', error);
                if (aiPlaceholderElement && aiPlaceholderElement.closest) {
                    const messageContent = aiPlaceholderElement.closest('.message-content');
                    if(messageContent) {
                        messageContent.innerHTML = `<div class="markdown-content text-red-600">Xin lỗi, không thể nhận phản hồi từ AI: ${error.message}</div>`;
                        const ellipsis = messageContent.querySelector('.ellipsis-animation');
                        if(ellipsis) ellipsis.remove();
                    }
                }
            }
        );

        if (result && result.conversationId && result.conversationId !== latestConversationId) {
            latestConversationId = result.conversationId;
            updateCurrentSessionConversationId(latestConversationId);
            console.log('[chat.js] Updated session conversationId after Dify stream completion:', latestConversationId);
        }

    } catch (error) {
        console.error('[chat.js] handleSendMessage caught error from Dify stream call:', error);
        if (aiPlaceholderElement && aiPlaceholderElement.closest) {
            const messageContent = aiPlaceholderElement.closest('.message-content');
            if(messageContent) {
                messageContent.innerHTML = `<div class="markdown-content text-red-600">Xin lỗi, đã xảy ra lỗi khi kết nối tới AI: ${error.message}</div>`;
                const ellipsis = messageContent.querySelector('.ellipsis-animation');
                if(ellipsis) ellipsis.remove();
            }
        }
    } finally {
        showLoading(false);
    }
}

/**
 * Fetches and displays the initial welcome message AS THE FIRST MESSAGE in the main chat area.
 */
export async function showWelcomeMessage() {
    console.log('[chat.js] Preparing to show dynamic welcome message IN CHAT AREA.');
    if (!welcomeMessageDiv || !chatMessagesDiv) {
        console.error('[chat.js] Missing critical elements (welcomeMessage, chatMessages) for showing welcome message.');
        return;
    }

    // Hide static welcome, show chat area immediately
    welcomeMessageDiv.classList.add('hidden');
    chatMessagesDiv.classList.remove('hidden');
    chatMessagesDiv.innerHTML = ''; // Clear any previous messages if this is a new chat

    console.log('[chat.js] Fetching dynamic welcome message from Dify API...');

    const userInfo = getUserInfo();
    const token = userInfo?.data?.token;
    const difyApiKey = DIFY_API_KEY;
    const userId = userInfo?.data?.userId;
    const currentSessId = getCurrentSessionId();

    if (!token || userId === undefined || userId === null) {
        console.error("[chat.js] User info missing for welcome message.");
        addMessageToChat("Chào bạn! Tôi là Trợ lý Tuyển sinh HUB. (Lỗi xác thực)", false);
        return;
    }
    if (!currentSessId) {
         console.error("[chat.js] Session ID missing for welcome message.");
         addMessageToChat("Chào bạn! Tôi là Trợ lý Tuyển sinh HUB. (Lỗi phiên làm việc)", false);
         return;
    }

    // Add placeholder in the main chat area
    const aiPlaceholderElement = addMessageToChat(null, false, false, null, null, true);
    if (!aiPlaceholderElement) {
        console.error("[chat.js] Failed to create AI placeholder for welcome message.");
        return;
    }

    const difyApiUrl = DIFY_CHAT_API_ENDPOINT;
    const requestBody = {
        inputs: {},
        query: 'Bắt đầu cuộc trò chuyện',
        response_mode: 'streaming',
        user: String(userId),
    };
    console.log('[chat.js] Sending welcome message request to Dify (without specific conversation_id):', requestBody);

    try {
        await handleSseStream(
            difyApiUrl,
            requestBody,
            difyApiKey,
            aiPlaceholderElement,
            (result) => {
                console.log('[chat.js] Welcome message stream completed from Dify.', { conversationId: result.conversationId });
                const fullWelcomeMessage = result.fullMessage || "Chào bạn! Có thể bạn muốn hỏi về tuyển sinh HUB?";

                // --- Save AI Welcome Message to Backend --- 
                const aiPayload = {
                    sessionId: currentSessId,
                    userId: Number(userId),
                    isUser: false,
                    content: fullWelcomeMessage
                };
                try {
                    console.log('[chat.js] Saving AI welcome message to backend:', aiPayload);
                    fetchWithAuth(SAVE_MESSAGE_ENDPOINT, { method: 'POST', body: aiPayload }, false)
                    .catch(saveError => {
                        console.error('[chat.js] Failed to save AI welcome message to backend:', saveError);
                    });
                } catch (error) {
                    console.error('[chat.js] Error preparing/sending AI welcome message save request:', error);
                }

                // --- Save AI Welcome Message to Session State --- 
                const aiMessageData = {
                    id: result.messageId,
                    content: fullWelcomeMessage,
                    isUser: false,
                    timestamp: new Date().toISOString()
                };
                addMessageToCurrentSession(aiMessageData);

                // --- Update Session Conversation ID --- 
                if (result.conversationId) {
                    updateCurrentSessionConversationId(result.conversationId);
                    console.log('[chat.js] Updated session conversationId from Dify welcome response:', result.conversationId);
                } else {
                    console.warn('[chat.js] Dify welcome response did not include a conversation_id.');
                }
            },
            (error) => {
                console.error('[chat.js] SSE stream failed for welcome message:', error);
            }
        );

    } catch (error) {
        console.error('[chat.js] showWelcomeMessage caught error during Dify call:', error);
    }
}