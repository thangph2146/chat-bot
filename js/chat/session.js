import { SESSIONS_API_ENDPOINT, CHAT_API_ENDPOINT } from './config.js';
import { generateUniqueId } from './utils.js';
import { showNotification, updateHistorySidebar, loadSessionUI, showClearHistoryDialog, showDeleteSessionDialog } from './ui.js';
import { getUserInfo } from './auth.js'; // Assuming auth.js provides getUserInfo
import { fetchWithAuth } from './api.js'; // Import fetchWithAuth
// import { showWelcomeMessage } from './chat.js'; // Potential circular dependency? Manage differently.

let chatSessions = [];
let currentSessionId = null;
let isLoading = false; // Prevent multiple simultaneous loads/creates

// Placeholder for the showWelcomeMessage function to avoid circular dependency
// This should be set by the main script/chat module after initialization.
let showWelcomeMessageHandler = () => { console.warn('showWelcomeMessageHandler not set in session.js') };
export function setShowWelcomeMessageHandler(handler) {
    console.log('[session.js] Setting showWelcomeMessageHandler');
    showWelcomeMessageHandler = handler;
}


/**
 * Lấy session hiện tại.
 * @returns {object | null} Đối tượng session hiện tại hoặc null.
 */
export function getCurrentSession() {
    return chatSessions.find(s => s.id === currentSessionId) || null;
}

/**
 * Lấy ID của session hiện tại.
 * @returns {string | null} ID session hiện tại.
 */
export function getCurrentSessionId() {
    return currentSessionId;
}

/**
 * Lấy danh sách tất cả các session.
 * @returns {Array} Mảng các đối tượng session.
 */
export function getAllSessions() {
    return chatSessions;
}

/**
 * Thêm tin nhắn vào session hiện tại (client-side state).
 * @param {object} messageData - Dữ liệu tin nhắn (ví dụ: { id, content, isUser, timestamp }).
 */
export function addMessageToCurrentSession(messageData) {
     const session = getCurrentSession();
     if (session) {
         if (!session.messages) {
             session.messages = [];
         }
         // Avoid duplicates if message has an ID
         if (!messageData.id || !session.messages.some(m => m.id === messageData.id)) {
             session.messages.push(messageData);
             session.lastUpdatedAt = new Date().toISOString(); // Update timestamp
             console.log('[session.js] Added message, updating sidebar.');
             // No need to save cache here
             // Update sidebar to reflect new timestamp/activity
             updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest);
         }
     } else {
         console.warn("[session.js] Cannot add message: No current session selected.");
     }
 }

/**
 * Cập nhật title cho session hiện tại (client-side state).
 * @param {string} newTitle - Tiêu đề mới.
 */
 export function updateCurrentSessionTitle(newTitle) {
    const session = getCurrentSession();
    if (session) {
        session.title = newTitle;
        session.lastUpdatedAt = new Date().toISOString();
        console.log('[session.js] Updated session title, updating sidebar.');
        updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest);
        // TODO: Add API call to update title on server if needed
        // await updateSessionTitleOnServer(currentSessionId, newTitle);
    }
}

/**
 * Cập nhật conversationId cho session hiện tại.
 * @param {string | null} convId - Conversation ID mới.
 */
export function updateCurrentSessionConversationId(convId) {
    const session = getCurrentSession();
    if (session) {
        session.conversationId = convId;
        console.log(`[session.js] Updated conversationId for session ${session.id} to: ${convId}`);
    }
}

/**
 * Tải danh sách các phiên chat của người dùng hiện tại từ API.
 * Sử dụng fetchWithAuth.
 * Endpoint: /api/ChatSessions/user/{userId}
 * @returns {Promise<boolean>} True nếu tải và xử lý thành công, False nếu có lỗi.
 */
export async function loadChatSessions() {
    console.log('[session.js] ===> Attempting to load chat sessions...');
    if (isLoading) {
        console.log('[session.js] Load already in progress, skipping.');
        return false;
    }
    isLoading = true;

    const userInfo = getUserInfo();
    const userId = userInfo?.data?.userId;

    if (userId === undefined || userId === null) {
        console.error("[session.js] User ID missing. Cannot fetch sessions.");
        showNotification('Lỗi xác thực, không thể tải lịch sử chat.', 'error');
        const historyElement = document.getElementById('historySessions');
        if (historyElement) historyElement.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lỗi xác thực.</p>';
        updateHistorySidebar([], null, handleSelectSession, handleDeleteRequest);
        isLoading = false;
        return false;
    }

    const userSessionsApiUrl = `${SESSIONS_API_ENDPOINT}/user/${userId}`;
    const historyElement = document.getElementById('historySessions');
    if (historyElement) historyElement.innerHTML = '<p class="text-center text-secondary-500 text-sm p-4">Đang tải lịch sử...</p>';

    try {
        // Sử dụng fetchWithAuth (mặc định là GET và mong đợi JSON)
        const data = await fetchWithAuth(userSessionsApiUrl);

        console.log('[session.js] Raw API response data received:', data);

        if (data === null || (Array.isArray(data) && data.length === 0)) {
            // Xử lý trường hợp 404 hoặc mảng rỗng
            console.log(`[session.js] No sessions found for user ${userId}. Treating as empty list.`);
            chatSessions = [];
            currentSessionId = null;
            if (historyElement) historyElement.innerHTML = `<p class="text-center text-secondary-500 text-sm p-4">Chưa có lịch sử trò chuyện.</p>`;
            await startNewChat(); // Bắt đầu chat mới nếu không có session
            isLoading = false;
            return true; // Thành công (danh sách rỗng)
        }

        if (Array.isArray(data)) {
            console.log(`[session.js] Found ${data.length} sessions. Processing...`);
            try {
                chatSessions = data.map((item, index) => {
                    if (!item || typeof item.id === 'undefined' || item.id === null) {
                         console.warn(`[session.js] Session item ${index} missing ID. Assigning new one.`, item);
                         item = item || {}; item.id = generateUniqueId();
                    }
                    const lastUpdatedAt = item.lastUpdatedAt || item.createdAt || new Date(0).toISOString();
                    return { id: item.id, userId: item.userId, title: item.title || `Cuộc trò chuyện #${String(item.id).substring(0, 5)}`, createdAt: item.createdAt, lastUpdatedAt: lastUpdatedAt, messages: [], conversationId: item.conversationId || null };
                }).sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());

                console.log('[session.js] Sessions processed successfully.');
                currentSessionId = chatSessions[0].id;
                console.log(`[session.js] Initial currentSessionId set to: ${currentSessionId}`);
            } catch (mapSortError) {
                console.error('[session.js] Error processing session data:', mapSortError);
                throw new Error('Lỗi xử lý dữ liệu session.');
            }
            isLoading = false;
            console.log('[session.js] <=== Load chat sessions finished (Success).');
            return true; // Thành công
        } else {
            console.error('[session.js] Invalid API response structure. Expected array or null, received:', data);
            throw new Error('Dữ liệu lịch sử API người dùng không hợp lệ.');
        }

    } catch (error) {
        // fetchWithAuth đã xử lý lỗi 401 và log các lỗi HTTP khác
        console.error('[session.js] Error in loadChatSessions catch block:', error);
        chatSessions = [];
        currentSessionId = null;
        // Chỉ hiển thị thông báo nếu lỗi không phải là 401 (đã xử lý trong fetchWithAuth)
        if (!error.message.includes('401')) {
            showNotification(error.message || 'Không thể tải lịch sử chat.', 'error');
            if (historyElement) historyElement.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lỗi tải lịch sử.</p>';
        }
        isLoading = false;
        console.log('[session.js] <=== Load chat sessions finished (Catch Error).');
        return false;
    }
}

/**
 * Tải tin nhắn chi tiết cho một session cụ thể từ API.
 * Sử dụng fetchWithAuth.
 */
async function loadSessionMessages(sessionId) {
    console.log(`[session.js] Attempting to load messages for session: ${sessionId}`);
    const targetSession = chatSessions.find(s => s.id === sessionId);
    if (!targetSession) {
        console.error(`[session.js] Session ${sessionId} not found locally.`);
        showNotification('Không tìm thấy phiên chat cục bộ.', 'error');
        return; // Dừng lại nếu không tìm thấy session
    }

    currentSessionId = sessionId;
    console.log(`[session.js] Set currentSessionId = ${currentSessionId}`);
    updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest);

    targetSession.messages = [];
    const messagesApiUrl = `${SESSIONS_API_ENDPOINT}/${sessionId}`;
    console.log(`[session.js] Fetching messages from ${messagesApiUrl}...`);

    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
         chatContainer.innerHTML = '<p class="text-center text-secondary-500 p-4">Đang tải tin nhắn...</p>';
    }

    try {
        // Sử dụng fetchWithAuth
        const sessionData = await fetchWithAuth(messagesApiUrl);

        console.log(`[session.js] Raw messages data for ${sessionId}:`, sessionData);

        // Kiểm tra sessionData và sessionData.messages
        if (!sessionData || !Array.isArray(sessionData.messages)) {
             console.error(`[session.js] Invalid messages data format for session ${sessionId}:`, sessionData);
             throw new Error('Định dạng dữ liệu tin nhắn từ API không hợp lệ');
        }

        try {
            targetSession.messages = sessionData.messages.map(apiMsg => {
                 if (!apiMsg || typeof apiMsg.content === 'undefined') return null;
                 return {
                     id: apiMsg.id,
                     senderName: apiMsg.senderName || (apiMsg.isUser ? 'Người dùng' : 'Bot'),
                     isUser: Boolean(apiMsg.isUser),
                     content: apiMsg.content,
                     timestamp: apiMsg.timestamp || new Date().toISOString()
                 };
             }).filter(msg => msg !== null)
               .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            console.log(`[session.js] Processed ${targetSession.messages.length} messages for ${sessionId}.`);
        } catch (mapSortError) {
             console.error(`[session.js] Error processing messages for ${sessionId}:`, mapSortError);
             throw new Error('Lỗi xử lý dữ liệu tin nhắn.');
        }

        targetSession.title = sessionData.title || targetSession.title;
        targetSession.lastUpdatedAt = sessionData.lastUpdatedAt || targetSession.lastUpdatedAt || new Date().toISOString();
        targetSession.conversationId = sessionData.conversationId || targetSession.conversationId || null;

        updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest);
        console.log(`[session.js] Calling loadSessionUI for ${sessionId}.`);
        loadSessionUI(targetSession, showWelcomeMessageHandler);

    } catch (error) {
        console.error(`[session.js] Error in loadSessionMessages for ${sessionId}:`, error);
         if (!error.message.includes('401')) {
            showNotification(error.message || `Không thể tải tin nhắn cho cuộc trò chuyện này.`, 'error');
            if (chatContainer) {
                chatContainer.innerHTML = '<p class="text-center text-red-500 p-4">Lỗi tải tin nhắn.</p>';
            }
         }
        if (targetSession) targetSession.messages = [];
    }
}

/**
 * Bắt đầu một phiên chat mới thông qua API.
 * Sử dụng fetchWithAuth.
 */
export async function startNewChat() {
    console.log('[session.js] Attempting to start new chat...');
    if (isLoading) return;
    isLoading = true;
    const defaultTitle = "Cuộc trò chuyện mới";
    const userInfo = getUserInfo();
    const userId = userInfo?.data?.userId;

    if (userId === undefined || userId === null) {
        console.error("[session.js] User ID missing for new chat.");
        showNotification("Lỗi xác thực người dùng.", "error");
        isLoading = false; return;
    }

    console.log(`[session.js] Creating new chat for user ${userId}...`);
    const requestBody = { userId: userId, title: defaultTitle };

    try {
        // Sử dụng fetchWithAuth cho POST request
        const newSessionData = await fetchWithAuth(SESSIONS_API_ENDPOINT, {
            method: 'POST',
            body: requestBody
        });

        console.log('[session.js] New session created via API:', newSessionData);
        if (!newSessionData || typeof newSessionData.id === 'undefined') {
             throw new Error('API không trả về ID cho session mới.');
        }

        const newSession = {
            id: newSessionData.id,
            userId: newSessionData.userId || userId,
            title: newSessionData.title || defaultTitle,
            createdAt: newSessionData.createdAt || new Date().toISOString(),
            lastUpdatedAt: newSessionData.lastUpdatedAt || new Date().toISOString(),
            messages: [],
            conversationId: newSessionData.conversationId || null
        };
        chatSessions.unshift(newSession);
        currentSessionId = newSession.id;
        console.log(`[session.js] New session ${currentSessionId} added locally. Updating UI.`);
        chatSessions.sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
        updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest);
        loadSessionUI(newSession, showWelcomeMessageHandler);
    } catch (error) {
        console.error('[session.js] Error creating new chat:', error);
         if (!error.message.includes('401')) {
            showNotification(error.message || 'Không thể tạo cuộc trò chuyện mới.', 'error');
         }
    } finally {
        console.log('[session.js] Start new chat finished.');
        isLoading = false;
    }
}

/**
 * Xử lý yêu cầu xóa một session (hiển thị dialog).
 * @param {string} sessionId - ID của session cần xóa.
 */
export function handleDeleteRequest(sessionId) {
    const sessionToDelete = chatSessions.find(s => s.id === sessionId);
    const sessionTitle = sessionToDelete?.title || "Cuộc trò chuyện này";
    console.log(`[session.js] Requesting delete confirmation for session: ${sessionId} (${sessionTitle})`);
    showDeleteSessionDialog(sessionTitle, async () => {
        console.log(`[session.js] Confirmed delete for session: ${sessionId}`);
        await deleteSession(sessionId);
    });
}

/**
 * Thực hiện xóa session thông qua API.
 * Sử dụng fetchWithAuth.
 * @param {string} sessionId - ID của session cần xóa.
 */
async function deleteSession(sessionId) {
    const apiUrl = `${SESSIONS_API_ENDPOINT}/${sessionId}`;
    console.log(`[session.js] Attempting to DELETE session ${sessionId} via API: ${apiUrl}`);

    try {
        // Sử dụng fetchWithAuth cho DELETE request, không mong đợi JSON body
        await fetchWithAuth(apiUrl, { method: 'DELETE' }, false);

        console.log(`[session.js] Session ${sessionId} deleted successfully via API.`);
        showNotification('Đã xóa phiên chat thành công.', 'success');

        const deletedIndex = chatSessions.findIndex(session => session.id === sessionId);
        if(deletedIndex > -1) chatSessions.splice(deletedIndex, 1);

        if (currentSessionId === sessionId) {
            console.log(`[session.js] Deleted the current session. Selecting new session...`);
            currentSessionId = null;
            if (chatSessions.length > 0) {
                chatSessions.sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
                const newCurrentId = chatSessions[0].id;
                console.log(`[session.js] New current session will be ${newCurrentId}. Loading its messages.`);
                await loadSessionMessages(newCurrentId); // loadSessionMessages sẽ cập nhật sidebar
            } else {
                console.log(`[session.js] No sessions left after delete. Starting new chat.`);
                await startNewChat();
            }
        } else {
            console.log(`[session.js] Deleted a non-current session. Updating sidebar.`);
            updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest);
        }
    } catch (error) {
        console.error(`[session.js] Error deleting session ${sessionId}:`, error);
        if (!error.message.includes('401')) {
           showNotification(error.message || 'Lỗi khi xóa phiên chat.', 'error');
        }
        // Không throw lại lỗi để không làm crash luồng dialog
        // throw error; // Bỏ throw ở đây nếu không muốn dialog bị kẹt ở trạng thái loading
    }
}

/**
 * Xử lý yêu cầu xóa toàn bộ lịch sử (hiển thị dialog).
 */
export function handleClearHistoryRequest() {
    console.log('[session.js] Requesting clear history confirmation.');
     showClearHistoryDialog(async () => {
        console.log('[session.js] Confirmed clear history.');
         try {
             // TODO: Thêm API call để xóa lịch sử phía server nếu cần
             // Ví dụ: await fetchWithAuth(`${SESSIONS_API_ENDPOINT}/user/${userId}/clear`, { method: 'DELETE' });

             console.log('[session.js] Clearing local chat history...');
             chatSessions = [];
             currentSessionId = null;
             const chatContainer = document.getElementById('chatContainer');
             if(chatContainer) chatContainer.innerHTML = '';
             updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest);
             showNotification('Đã xóa toàn bộ lịch sử chat', 'success');
             console.log('[session.js] Starting new chat after clearing history.');
             await startNewChat();
         } catch (error) {
             console.error("[session.js] Error clearing chat history:", error);
             showNotification(`Lỗi khi xóa lịch sử: ${error.message}`, 'error');
         }
     });
 }

/**
 * Xử lý khi người dùng chọn một session từ sidebar.
 * @param {string} sessionId - ID của session được chọn.
 */
export async function handleSelectSession(sessionId) {
     console.log(`[session.js] handleSelectSession called for: ${sessionId}`);
     if (isLoading) {
         console.log(`[session.js] Selection change skipped, loading in progress.`);
         return;
     }
     if (sessionId !== currentSessionId) {
        console.log(`[session.js] Session change requested from ${currentSessionId} to ${sessionId}. Loading messages...`);
        await loadSessionMessages(sessionId); // Đã có sẵn loadSessionMessages
        console.log(`[session.js] Finished processing selection change for ${sessionId}.`);
     } else {
        console.log(`[session.js] Clicked on the currently active session (${sessionId}). No messages reloaded.`);
     }
 }
