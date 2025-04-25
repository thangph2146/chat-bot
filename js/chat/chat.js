import { DIFY_CHAT_API_ENDPOINT, DIFY_API_KEY, SAVE_MESSAGE_ENDPOINT } from './config.js';
import { getUserInfo } from './auth.js';
import { getCurrentSession, getCurrentSessionId, addMessageToCurrentSession, updateCurrentSessionTitle, updateCurrentSessionConversationId } from './session.js';
import { showLoading, addMessageToChat, showNotification } from './ui.js';
import { handleSseStream, fetchWithAuth } from './api.js';

/**
 * Xử lý việc gửi tin nhắn của người dùng.
 * @param {object} domElements - Object chứa tham chiếu đến các element DOM (vd: messageInput, chatContainer).
 */
export async function handleSendMessage(domElements) {
    // Destructure needed elements
    const { messageInput, chatMessagesDiv, welcomeMessageDiv, chatContainer, /* add other needed elements */ } = domElements;

    if (!messageInput || !chatMessagesDiv || !welcomeMessageDiv || !chatContainer) {
        console.error('[chat.js] Missing critical elements passed via domElements for sending message.');
        return;
    }
    const messageToSend = messageInput.value.trim();
    if (!messageToSend) return;

    // --- Thêm logic ẩn welcome message nếu nó đang hiển thị ---
    if (welcomeMessageDiv.style.display !== 'none' && window.getComputedStyle(welcomeMessageDiv).display !== 'none') {
        console.log('[chat.js] Welcome message is visible. Hiding it and showing chat messages.');
        welcomeMessageDiv.style.display = 'none'; // Hide welcome
        chatMessagesDiv.classList.remove('hidden'); // Show chat area
        // Đảm bảo chat area trống trước khi thêm tin nhắn đầu tiên
        // (có thể không cần nếu loadSessionMessages/startNewChat đã xử lý)
        // chatMessagesDiv.innerHTML = '';
    }
    // ---------------------------------------------------------

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
        console.warn("[chat.js] No active session selected. Creating a new chat session.");
        
        // Ẩn màn hình chào mừng (nếu đang hiển thị)
        if (welcomeMessageDiv && chatMessagesDiv) {
            welcomeMessageDiv.classList.add('hidden');
            chatMessagesDiv.classList.remove('hidden');
        }
        
        // Lưu tin nhắn người dùng tạm thời để gửi sau
        const tempUserMessage = messageToSend;
        
        // Tạo phiên chat mới (import từ session.js)
        const { startNewChat } = await import('./session.js');
        await startNewChat(domElements);
        
        // Gọi lại hàm này sau khi phiên chat mới được tạo
        setTimeout(() => {
            // Khôi phục tin nhắn
            if (messageInput) {
                messageInput.value = tempUserMessage;
            }
            // Gọi lại hàm gửi tin nhắn
            handleSendMessage(domElements);
        }, 800); // Đợi một chút để phiên chat mới được khởi tạo hoàn tất
        
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
        fetchWithAuth(SAVE_MESSAGE_ENDPOINT, {
            method: 'POST',
            body: userPayload
        }, false);
    } catch (error) {
        console.error('[chat.js] Error preparing/sending user message save request:', error);
    }

    // --- Thêm tin nhắn user vào UI và session (sử dụng domElements) ---
    const userMessageData = {
        content: messageToSend,
        isUser: true,
        timestamp: new Date().toISOString()
    };
    addMessageToChat(messageToSend, chatContainer, true, false, null, userMessageData.timestamp); // Pass chatContainer
    addMessageToCurrentSession(userMessageData, domElements); // Add domElements argument

    messageInput.value = '';
    messageInput.style.height = 'auto';

    // --- Bước 2: Gọi AI (Dify) để lấy câu trả lời (sử dụng domElements) ---
    showLoading(true /*, pass loadingIndicator element if ui.js requires it */); // Need to update showLoading call if needed
    // Pass chatContainer to addMessageToChat
    const aiPlaceholderElement = addMessageToChat(null, chatContainer, false, false, null, null, true);
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
            chatContainer, // Pass chatContainer to handleSseStream
            (result) => {
                const aiMessageContent = result.fullMessage ? result.fullMessage.trim() : ""; // Trim whitespace

                // --- Tìm và xóa hiệu ứng typing --- 
                if (aiPlaceholderElement && aiPlaceholderElement.closest) {
                    // Tìm lại message bubble chứa placeholder này
                    const messageBubble = aiPlaceholderElement.closest('.message-bubble');
                    if (messageBubble) {
                        const ellipsis = messageBubble.querySelector('.ellipsis-animation');
                        if (ellipsis) {
                            ellipsis.remove();
                        }
                    }
                }
                // -------------------------------------

                // Chỉ lưu tin nhắn AI nếu có nội dung thực sự
                if (aiMessageContent) {
                    const aiPayload = {
                        sessionId: currentSessId,
                        userId: Number(userId),
                        isUser: false,
                        content: aiMessageContent // Sử dụng nội dung đã trim
                    };
                    try {
                        fetchWithAuth(SAVE_MESSAGE_ENDPOINT, {
                            method: 'POST',
                            body: aiPayload
                        }, false); // Lỗi 400 xảy ra ở đây nếu content rỗng
                    } catch (error) {
                        console.error('[chat.js] Error preparing/sending AI message save request:', error);
                    }

                    const aiMessageData = {
                        id: result.messageId,
                        content: aiMessageContent, // Lưu nội dung đã trim vào session state
                        isUser: false,
                        timestamp: new Date().toISOString()
                    };
                    addMessageToCurrentSession(aiMessageData, domElements); // Add domElements argument


                } else {
                    console.warn('[chat.js] Dify stream completed but result.fullMessage was empty. Skipping AI message save.');
                    // Có thể bạn muốn xử lý trường hợp AI trả về rỗng ở đây (ví dụ: xóa placeholder?)
                    // Hoặc cập nhật placeholder với thông báo "AI không có phản hồi"
                    if (aiPlaceholderElement && aiPlaceholderElement.closest) {
                        const messageContentDiv = aiPlaceholderElement.closest('.message-content');
                        if(messageContentDiv) {
                            messageContentDiv.innerHTML = `<div class="markdown-content text-secondary-500 italic">AI không có phản hồi.</div>`;
                            const ellipsis = messageContentDiv.querySelector('.ellipsis-animation');
                            if(ellipsis) ellipsis.remove();
                        }
                    }
                }

                if (result.conversationId && result.conversationId !== latestConversationId) {
                     latestConversationId = result.conversationId;
                     updateCurrentSessionConversationId(latestConversationId);
                }
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
        showLoading(false /*, pass loadingIndicator element if needed */);
    }
}

/**
 * Fetches and displays the initial welcome message AS THE FIRST MESSAGE in the main chat area.
 * @param {HTMLElement | null} chatContainerElement - Tham chiếu đến container chat.
 * @param {HTMLElement | null} welcomeElement - Tham chiếu đến div welcome tĩnh.
 * @param {HTMLElement | null} chatMessagesElement - Tham chiếu đến div chứa tin nhắn chat.
 * @param {object} domElements - Object chứa tham chiếu đến các element DOM.
 */
export async function showWelcomeMessage(domElements) {
    // Destructure elements from domElements
    const { chatContainer, welcomeMessageDiv, chatMessagesDiv } = domElements;

    // Use passed elements
    if (!welcomeMessageDiv || !chatMessagesDiv || !chatContainer) {
        console.error('[chat.js] Missing critical elements passed via arguments for showing welcome message.');
        return;
    }

    // Hide static welcome, show chat area immediately
    welcomeMessageDiv.classList.add('hidden');
    chatMessagesDiv.classList.remove('hidden');
    chatMessagesDiv.innerHTML = ''; // Clear any previous messages


    const userInfo = getUserInfo();
    const token = userInfo?.data?.token;
    const difyApiKey = DIFY_API_KEY;
    const userId = userInfo?.data?.userId;
    const currentSessId = getCurrentSessionId();

    if (!token || userId === undefined || userId === null) {
        console.error("[chat.js] User info missing for welcome message.");
        addMessageToChat("Chào bạn! Tôi là Trợ lý Tuyển sinh HUB. (Lỗi xác thực)", chatContainer, false);
        return;
    }
    if (!currentSessId) {
         console.error("[chat.js] Session ID missing for welcome message.");
         addMessageToChat("Chào bạn! Tôi là Trợ lý Tuyển sinh HUB. (Lỗi phiên làm việc)", chatContainer, false);
         return;
    }

    // Add placeholder in the main chat area (pass chatContainer)
    const aiPlaceholderElement = addMessageToChat(null, chatContainer, false, false, null, null, true);
    if (!aiPlaceholderElement) {
        console.error("[chat.js] Failed to create AI placeholder for welcome message.");
        return;
    }

    const difyApiUrl = DIFY_CHAT_API_ENDPOINT;
    const requestBody = {
        inputs: {},
        query: 'Bắt đầu cuộc trò chuyện', // Or a more specific welcome prompt
        response_mode: 'streaming',
        user: String(userId),
        // conversation_id: null // Explicitly null for a new conversation start for welcome
    };

    try {
        await handleSseStream(
            difyApiUrl,
            requestBody,
            difyApiKey,
            aiPlaceholderElement,
            chatContainer, // Pass chatContainer
            (result) => {
                const fullWelcomeMessage = result.fullMessage || "Chào bạn! Có thể bạn muốn hỏi về tuyển sinh HUB?";

                // --- Tìm và xóa hiệu ứng typing --- 
                if (aiPlaceholderElement && aiPlaceholderElement.closest) {
                    const messageBubble = aiPlaceholderElement.closest('.message-bubble');
                    if (messageBubble) {
                        const ellipsis = messageBubble.querySelector('.ellipsis-animation');
                        if (ellipsis) {
                            ellipsis.remove();
                        }
                    }
                }
                // -------------------------------------

                // --- Save AI Welcome Message to Backend --- 
                const aiPayload = {
                    sessionId: currentSessId,
                    userId: Number(userId),
                    isUser: false,
                    content: fullWelcomeMessage
                };
                try {
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
                // Now domElements is available in this scope
                addMessageToCurrentSession(aiMessageData, domElements);

                // Update conversationId for the current session based on the welcome message response
                 if (result.conversationId) {
                    updateCurrentSessionConversationId(result.conversationId);
                 }

            },
            (error) => {
                console.error('[chat.js] Dify SSE stream failed callback for welcome message:', error);
                if (aiPlaceholderElement && aiPlaceholderElement.closest) {
                    const messageContent = aiPlaceholderElement.closest('.message-content');
                    if(messageContent) {
                        messageContent.innerHTML = `<div class="markdown-content text-red-600">Xin lỗi, không thể tải tin nhắn chào mừng: ${error.message}</div>`;
                        const ellipsis = messageContent.querySelector('.ellipsis-animation');
                        if(ellipsis) ellipsis.remove();
                    }
                }
            }
        );
    } catch (error) {
        console.error('[chat.js] showWelcomeMessage caught error from Dify stream call:', error);
        if (aiPlaceholderElement && aiPlaceholderElement.closest) {
            const messageContent = aiPlaceholderElement.closest('.message-content');
            if(messageContent) {
                messageContent.innerHTML = `<div class="markdown-content text-red-600">Lỗi khi tải tin nhắn chào mừng: ${error.message}</div>`;
                const ellipsis = messageContent.querySelector('.ellipsis-animation');
                if(ellipsis) ellipsis.remove();
            }
        }
    }
}