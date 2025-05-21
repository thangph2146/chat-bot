import { DIFY_CHAT_API_ENDPOINT, DIFY_API_KEY, SAVE_MESSAGE_ENDPOINT } from './config.js';
import { getUserInfo } from './auth.js';
import { getCurrentSession, getCurrentSessionId, addMessageToCurrentSession, updateCurrentSessionTitle, updateCurrentSessionConversationId } from './session.js';
import { showLoading, addMessageToChat, showNotification } from './ui.js';
import { handleSseStream, fetchWithAuth } from './api.js';

/**
 * Các thông báo lỗi thân thiện với người dùng 
 */
const ERROR_MESSAGES = {
    // Lỗi xác thực và phiên làm việc
    AUTH_FAILED: "Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục trò chuyện.",
    AUTH_REQUIRED: "Bạn cần đăng nhập để sử dụng tính năng này. Vui lòng đăng nhập và thử lại.",
    SESSION_INVALID: "Có lỗi với phiên trò chuyện hiện tại. Vui lòng tạo cuộc trò chuyện mới.",
    SESSION_EXPIRED: "Phiên trò chuyện đã hết hạn hoặc không được tìm thấy. Đang khởi tạo cuộc trò chuyện mới.",
    USER_INFO_MISSING: "Không thể xác thực thông tin người dùng. Vui lòng làm mới trang và đăng nhập lại.",
    
    // Lỗi kết nối mạng
    NETWORK_ERROR: "Không thể kết nối với máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.",
    SERVER_TIMEOUT: "Máy chủ phản hồi chậm. Vui lòng thử lại sau.",
    CONNECTION_LOST: "Kết nối đến máy chủ đã bị gián đoạn. Đang thử kết nối lại...",
    
    // Lỗi AI
    AI_UNAVAILABLE: "Hệ thống AI hiện không khả dụng. Các kỹ thuật viên đang khắc phục sự cố.",
    AI_OVERLOADED: "Hệ thống AI đang quá tải. Vui lòng thử lại sau vài phút.",
    AI_NO_RESPONSE: "AI không phản hồi. Vui lòng thử lại hoặc đặt câu hỏi khác.",
    AI_CONTENT_FILTERED: "Câu hỏi của bạn đã bị từ chối bởi bộ lọc nội dung. Vui lòng điều chỉnh và thử lại.",
    AI_ERROR_PROCESSING: "AI gặp khó khăn khi xử lý câu hỏi của bạn. Vui lòng thử lại với câu hỏi đơn giản hơn.",
    AI_TOO_COMPLEX: "Câu hỏi quá phức tạp cho AI xử lý. Vui lòng chia nhỏ thành nhiều câu hỏi đơn giản hơn.",
    
    // Lỗi ứng dụng
    MESSAGE_TOO_LONG: "Tin nhắn quá dài để xử lý. Vui lòng chia nhỏ câu hỏi của bạn (tối đa 4000 ký tự).",
    MESSAGE_SAVE_FAILED: "Không thể lưu tin nhắn. Nội dung vẫn được hiển thị nhưng có thể không được lưu lại.",
    MESSAGE_EMPTY: "Không thể gửi tin nhắn trống. Vui lòng nhập nội dung.",
    MESSAGE_FORMAT_INVALID: "Định dạng tin nhắn không hợp lệ. Vui lòng kiểm tra và thử lại.",
    
    // Lỗi ghi âm
    RECORDING_NOT_SUPPORTED: "Trình duyệt của bạn không hỗ trợ ghi âm giọng nói. Vui lòng thử trình duyệt khác.",
    RECORDING_PERMISSION_DENIED: "Quyền truy cập microphone bị từ chối. Vui lòng cho phép truy cập để sử dụng tính năng ghi âm.",
    RECORDING_ERROR: "Đã xảy ra lỗi khi ghi âm. Vui lòng thử lại hoặc sử dụng nhập văn bản.",
    
    // Lỗi lịch sử chat
    HISTORY_LOAD_FAILED: "Không thể tải lịch sử trò chuyện. Vui lòng làm mới trang hoặc thử lại sau.",
    HISTORY_DELETE_FAILED: "Không thể xóa cuộc trò chuyện. Vui lòng thử lại sau.",
    HISTORY_EMPTY: "Bạn chưa có cuộc trò chuyện nào. Hãy bắt đầu cuộc trò chuyện mới.",
    
    // Các lỗi khác
    UNKNOWN_ERROR: "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.",
    MAINTENANCE: "Hệ thống đang bảo trì. Vui lòng quay lại sau.",
    RATE_LIMITED: "Bạn đã gửi quá nhiều tin nhắn trong thời gian ngắn. Vui lòng đợi giây lát và thử lại.",
    SERVER_ERROR: "Máy chủ gặp sự cố. Đội kỹ thuật đã được thông báo và đang khắc phục.",
    UNSUPPORTED_BROWSER: "Trình duyệt của bạn có thể không được hỗ trợ đầy đủ. Để có trải nghiệm tốt nhất, hãy sử dụng Chrome hoặc Edge phiên bản mới nhất.",
    SESSION_CONFLICT: "Tài khoản của bạn đang đăng nhập ở thiết bị khác. Vui lòng làm mới trang để tiếp tục."
}

/**
 * Xử lý việc gửi tin nhắn của người dùng.
 * @param {object} domElements - Object chứa tham chiếu đến các element DOM (vd: messageInput, chatContainer).
 */
export async function handleSendMessage(domElements) {
    // Destructure needed elements
    const { messageInput, chatMessagesDiv, welcomeMessageDiv, chatContainer, /* add other needed elements */ } = domElements;

    if (!messageInput || !chatMessagesDiv || !welcomeMessageDiv || !chatContainer) {
        console.error('[chat.js] Missing critical elements passed via domElements for sending message.');
        showNotification(ERROR_MESSAGES.UNKNOWN_ERROR, "error");
        return;
    }
    const messageToSend = messageInput.value.trim();
    if (!messageToSend) {
        showNotification(ERROR_MESSAGES.MESSAGE_EMPTY, "warning");
        return;
    }

    // Kiểm tra độ dài tin nhắn để tránh lỗi từ API
    if (messageToSend.length > 4000) {
        showNotification(ERROR_MESSAGES.MESSAGE_TOO_LONG, "warning");
        return;
    }

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
    const userId = userInfo?.data?.userId;
    const currentSession = getCurrentSession();
    const currentSessId = getCurrentSessionId();

    if (!token || userId === undefined || userId === null) {
        console.error("[chat.js] User info (ID or Token) missing.", { userId, token: !!token });
        showNotification(ERROR_MESSAGES.USER_INFO_MISSING, "error");
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
        try {
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
        } catch (error) {
            console.error("[chat.js] Failed to create new session:", error);
            showNotification(ERROR_MESSAGES.SESSION_INVALID, "error");
        }
        
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
        }, false).catch(error => {
            console.error('[chat.js] Failed to save user message:', error);
            showNotification(ERROR_MESSAGES.MESSAGE_SAVE_FAILED, "warning");
        });
    } catch (error) {
        console.error('[chat.js] Error preparing/sending user message save request:', error);
        showNotification(ERROR_MESSAGES.MESSAGE_SAVE_FAILED, "warning");
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

    // Sử dụng proxy API thay vì gọi trực tiếp đến Dify API
    const difyApiUrl = DIFY_CHAT_API_ENDPOINT; // Endpoint mới (/api/dify/chat) từ server Node.js
    const difyRequestBody = {
        inputs: {},
        query: messageToSend,
        response_mode: 'streaming',
        user: String(userId),
        conversation_id: latestConversationId
    };

    try {
        // Không cần gửi DIFY_API_KEY vì nó đã được xử lý bởi server
        const result = await handleSseStream(
            difyApiUrl,
            difyRequestBody,
            token, // Sử dụng token người dùng cho API của server, DIFY_API_KEY sẽ được xử lý phía server
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
                        }, false).catch(error => {
                            console.error('[chat.js] Failed to save AI response:', error);
                            showNotification(ERROR_MESSAGES.MESSAGE_SAVE_FAILED, "warning");
                        });
                    } catch (error) {
                        console.error('[chat.js] Error preparing/sending AI message save request:', error);
                        showNotification(ERROR_MESSAGES.MESSAGE_SAVE_FAILED, "warning");
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
                            messageContentDiv.innerHTML = `<div class="markdown-content text-secondary-500 italic">${ERROR_MESSAGES.AI_NO_RESPONSE}</div>`;
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
                let errorMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
                
                // Phân loại lỗi để hiển thị thông báo phù hợp
                if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
                    errorMessage = ERROR_MESSAGES.SERVER_TIMEOUT;
                } else if (error.message?.includes('network') || error.message?.includes('connection')) {
                    errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
                } else if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('auth')) {
                    errorMessage = ERROR_MESSAGES.AUTH_FAILED;
                } else if (error.message?.includes('overloaded') || error.message?.includes('too many requests')) {
                    errorMessage = ERROR_MESSAGES.AI_OVERLOADED;
                } else if (error.message?.includes('content') || error.message?.includes('filter') || error.message?.includes('moderation')) {
                    errorMessage = ERROR_MESSAGES.AI_CONTENT_FILTERED;
                } else if (error.message?.includes('503') || error.message?.includes('502') || error.message?.includes('504')) {
                    errorMessage = ERROR_MESSAGES.AI_UNAVAILABLE;
                }
                
                if (aiPlaceholderElement && aiPlaceholderElement.closest) {
                    const messageContent = aiPlaceholderElement.closest('.message-content');
                    if(messageContent) {
                        messageContent.innerHTML = `<div class="markdown-content text-red-600">${errorMessage}</div>`;
                        const ellipsis = messageContent.querySelector('.ellipsis-animation');
                        if(ellipsis) ellipsis.remove();
                    }
                }
                
                // Hiển thị thông báo toast để người dùng dễ nhìn thấy
                showNotification(errorMessage, "error");
            }
        );

        if (result && result.conversationId && result.conversationId !== latestConversationId) {
            latestConversationId = result.conversationId;
            updateCurrentSessionConversationId(latestConversationId);
        }

    } catch (error) {
        console.error('[chat.js] handleSendMessage caught error from Dify stream call:', error);
        let errorMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
                
        // Phân loại lỗi để hiển thị thông báo phù hợp
        if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
            errorMessage = ERROR_MESSAGES.SERVER_TIMEOUT;
        } else if (error.message?.includes('network') || error.message?.includes('connection')) {
            errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
        } else if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('auth')) {
            errorMessage = ERROR_MESSAGES.AUTH_FAILED;
        }
                
        if (aiPlaceholderElement && aiPlaceholderElement.closest) {
            const messageContent = aiPlaceholderElement.closest('.message-content');
            if(messageContent) {
                messageContent.innerHTML = `<div class="markdown-content text-red-600">${errorMessage}</div>`;
                const ellipsis = messageContent.querySelector('.ellipsis-animation');
                if(ellipsis) ellipsis.remove();
            }
        }
        
        // Hiển thị thông báo toast để người dùng dễ nhìn thấy
        showNotification(errorMessage, "error");
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
        showNotification("Không thể hiển thị màn hình chào mừng. Vui lòng làm mới trang.", "error");
        return;
    }

    // Hide static welcome, show chat area immediately
    welcomeMessageDiv.classList.add('hidden');
    chatMessagesDiv.classList.remove('hidden');
    chatMessagesDiv.innerHTML = ''; // Clear any previous messages


    const userInfo = getUserInfo();
    const token = userInfo?.data?.token;
    const userId = userInfo?.data?.userId;
    const currentSessId = getCurrentSessionId();

    if (!token || userId === undefined || userId === null) {
        console.error("[chat.js] User info missing for welcome message.");
        addMessageToChat("Chào bạn! Tôi là Trợ lý Tuyển sinh HUB. " + ERROR_MESSAGES.USER_INFO_MISSING, chatContainer, false);
        showNotification(ERROR_MESSAGES.USER_INFO_MISSING, "error");
        return;
    }
    if (!currentSessId) {
         console.error("[chat.js] Session ID missing for welcome message.");
         addMessageToChat("Chào bạn! Tôi là Trợ lý Tuyển sinh HUB. " + ERROR_MESSAGES.SESSION_INVALID, chatContainer, false);
         showNotification(ERROR_MESSAGES.SESSION_INVALID, "error");
         return;
    }

    // Add placeholder in the main chat area (pass chatContainer)
    const aiPlaceholderElement = addMessageToChat(null, chatContainer, false, false, null, null, true);
    if (!aiPlaceholderElement) {
        console.error("[chat.js] Failed to create AI placeholder for welcome message.");
        addMessageToChat("Chào bạn! Tôi là Trợ lý Tuyển sinh HUB. Đã xảy ra lỗi khi khởi tạo trò chuyện. Vui lòng thử lại sau.", chatContainer, false);
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
            token,
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
                        showNotification(ERROR_MESSAGES.MESSAGE_SAVE_FAILED, "warning");
                    });
                } catch (error) {
                    console.error('[chat.js] Error preparing/sending AI welcome message save request:', error);
                    showNotification(ERROR_MESSAGES.MESSAGE_SAVE_FAILED, "warning");
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
                let errorMessage = "Xin lỗi, không thể tải tin nhắn chào mừng.";
                
                if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
                    errorMessage = "Máy chủ phản hồi chậm khi tải tin nhắn chào mừng. Vui lòng thử làm mới trang.";
                } else if (error.message?.includes('network') || error.message?.includes('connection')) {
                    errorMessage = "Lỗi kết nối khi tải tin nhắn chào mừng. Vui lòng kiểm tra mạng và thử lại.";
                } else if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('auth')) {
                    errorMessage = "Lỗi xác thực khi tải tin nhắn chào mừng. Vui lòng đăng nhập lại.";
                }
                
                if (aiPlaceholderElement && aiPlaceholderElement.closest) {
                    const messageContent = aiPlaceholderElement.closest('.message-content');
                    if(messageContent) {
                        messageContent.innerHTML = `<div class="markdown-content text-red-600">${errorMessage}</div>`;
                        const ellipsis = messageContent.querySelector('.ellipsis-animation');
                        if(ellipsis) ellipsis.remove();
                    }
                }
                
                showNotification(errorMessage, "error");
            }
        );
    } catch (error) {
        console.error('[chat.js] showWelcomeMessage caught error from Dify stream call:', error);
        let errorMessage = "Đã xảy ra lỗi khi tải tin nhắn chào mừng.";
        
        if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
            errorMessage = "Máy chủ phản hồi chậm khi tải tin nhắn chào mừng. Vui lòng thử làm mới trang.";
        } else if (error.message?.includes('network') || error.message?.includes('connection')) {
            errorMessage = "Lỗi kết nối khi tải tin nhắn chào mừng. Vui lòng kiểm tra mạng và thử lại.";
        } else if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('auth')) {
            errorMessage = "Lỗi xác thực khi tải tin nhắn chào mừng. Vui lòng đăng nhập lại.";
        }
        
        if (aiPlaceholderElement && aiPlaceholderElement.closest) {
            const messageContent = aiPlaceholderElement.closest('.message-content');
            if(messageContent) {
                messageContent.innerHTML = `<div class="markdown-content text-red-600">${errorMessage}</div>`;
                const ellipsis = messageContent.querySelector('.ellipsis-animation');
                if(ellipsis) ellipsis.remove();
            }
        }
        
        showNotification(errorMessage, "error");
    }
}