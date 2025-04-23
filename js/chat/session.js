import { SESSIONS_API_ENDPOINT, CHAT_MESSAGE_API_ENDPOINT } from './config.js';
import { generateUniqueId, renderMessageElement } from './utils.js';
import { showNotification, updateHistorySidebar, loadSessionUI, showDeleteSessionDialog } from './ui.js';
import { getUserInfo } from './auth.js'; // Assuming auth.js provides getUserInfo
import { fetchWithAuth } from './api.js'; // Import fetchWithAuth
// import { showWelcomeMessage } from './chat.js'; // Potential circular dependency? Manage differently.

let chatSessions = [];
let currentSessionId = null;
let isLoading = false; // Prevent multiple simultaneous loads/creates
// Store the scroll listener to remove it later
let currentScrollListener = null;

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
 * @param {object} domElements - Object containing references to key DOM elements.
 */
export function addMessageToCurrentSession(messageData, domElements) {
     // Extract elements
     const historySessionsElement = domElements?.historySessions;
     const chatContainerElement = domElements?.chatContainer;
     const welcomeElement = domElements?.welcomeMessageDiv;
     const chatMessagesElement = domElements?.chatMessagesDiv;

     // Check history element before calling updateHistorySidebar
     if (!historySessionsElement) {
         console.error('[session.js] addMessageToCurrentSession: Missing historySessions element.');
         // Decide how to handle this - maybe just log and continue?
     }

     const session = getCurrentSession();
     if (session) {
         if (!session.messages) {
             session.messages = [];
         }
         // Avoid duplicates if message has an ID
         if (!messageData.id || !session.messages.some(m => m.id === messageData.id)) {
             session.messages.push(messageData);
             // Cập nhật lastUpdatedAt ngay sau khi push
             session.lastUpdatedAt = new Date().toISOString(); 

             let titleUpdated = false;
             // --- Cập nhật title CHỈ KHI tin nhắn là của người dùng --- 
             if (messageData.isUser) {
                 const userContent = messageData.content?.trim() || '';
                 if (userContent) { 
                     const newTitle = userContent.length > 30 
                                      ? userContent.substring(0, 27) + '...' 
                                      : userContent;
                     if (newTitle !== session.title) {
                        // Gọi hàm riêng để cập nhật title (cả client và server)
                        updateCurrentSessionTitle(newTitle, domElements);
                        titleUpdated = true; // Đánh dấu title đã được cập nhật (và sidebar sẽ được gọi bên trong updateCurrentSessionTitle)
                        // Không gọi updateHistorySidebar trực tiếp ở đây nữa
                     }
                 }
             }
             // ---------------------------------------------------------

             // Chỉ gọi updateHistorySidebar nếu title KHÔNG được cập nhật 
             // (vì updateCurrentSessionTitle đã gọi nó rồi)
             if (!titleUpdated) {
                 console.log('[session.js] Added message (no title change), updating sidebar.');
                 updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
             }
         }
     } else {
         console.warn("[session.js] Cannot add message: No current session selected.");
     }
 }

/**
 * Cập nhật title cho session hiện tại (client-side state).
 * @param {string} newTitle - Tiêu đề mới.
 * @param {object} domElements - Object containing references to key DOM elements.
 */
export async function updateCurrentSessionTitle(newTitle, domElements) {
    // Extract elements
    const historySessionsElement = domElements?.historySessions;
    const chatContainerElement = domElements?.chatContainer;
    const welcomeElement = domElements?.welcomeMessageDiv;
    const chatMessagesElement = domElements?.chatMessagesDiv;

    if (!historySessionsElement) {
        console.error('[session.js] updateCurrentSessionTitle: Missing historySessions element.');
    }

    const session = getCurrentSession();
    const sessionId = session?.id; 

    if (!session || !sessionId) {
        console.warn('[session.js] Cannot update title: Session or Session ID not found.');
        return; // Exit if no session
    }

    // --- Cập nhật Client-side state --- 
    const oldTitle = session.title; // Lưu lại title cũ phòng trường hợp API lỗi và muốn hoàn tác
    session.title = newTitle;
    session.lastUpdatedAt = new Date().toISOString();
    console.log(`[session.js] Client session title updated to: "${newTitle}"`);

    // --- Cập nhật UI (Sidebar) ngay lập tức --- 
    console.log('[session.js] Updating sidebar UI immediately...');
    updateHistorySidebar(chatSessions, sessionId, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
   
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
 * @param {object} domElements - Object containing references to key DOM elements.
 *        (historySessions, chatContainer, welcomeMessageDiv, chatMessagesDiv)
 * @returns {Promise<boolean>} True nếu tải và xử lý thành công, False nếu có lỗi.
 */
export async function loadChatSessions(domElements) {
    console.log('[session.js] ===> Attempting to load chat sessions...');
    if (isLoading) {
        console.log('[session.js] Load already in progress, skipping.');
        return false;
    }
    isLoading = true;

    // Extract elements from domElements object
    const historySessionsElement = domElements?.historySessions;
    const chatContainerElement = domElements?.chatContainer;
    const welcomeElement = domElements?.welcomeMessageDiv;
    const chatMessagesElement = domElements?.chatMessagesDiv;

    // Check if essential elements exist
    if (!historySessionsElement) {
        console.error('[session.js] loadChatSessions: Missing historySessions element in domElements.');
        // Optionally show error or handle differently
        isLoading = false;
        return false;
    }

    const userInfo = getUserInfo();
    const userId = userInfo?.data?.userId;

    // const resolvedHistoryElement = historySessionsElement || document.getElementById('historySessions'); // No longer needed

    if (userId === undefined || userId === null) {
        console.error("[session.js] User ID missing. Cannot fetch sessions.");
        showNotification('Lỗi xác thực, không thể tải lịch sử chat.', 'error');
        historySessionsElement.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lỗi xác thực.</p>';
        // Pass the extracted elements to updateHistorySidebar
        updateHistorySidebar([], null, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
        isLoading = false;
        return false;
    }

    const userSessionsApiUrl = `${SESSIONS_API_ENDPOINT}/user/${userId}`;
    historySessionsElement.innerHTML = '<p class="text-center text-secondary-500 text-sm p-4">Đang tải lịch sử...</p>';

    try {
        // Sử dụng fetchWithAuth (mặc định là GET và mong đợi JSON)
        const data = await fetchWithAuth(userSessionsApiUrl);

        console.log('[session.js] Raw API response data received:', data);

        if (data === null || (Array.isArray(data) && data.length === 0)) {
            // Xử lý trường hợp 404 hoặc mảng rỗng
            console.log(`[session.js] No sessions found for user ${userId}. Treating as empty list.`);
            chatSessions = [];
            currentSessionId = null;
            historySessionsElement.innerHTML = `<p class="text-center text-secondary-500 text-sm p-4">Chưa có lịch sử trò chuyện.</p>`;
            // Pass the original domElements object to startNewChat
            await startNewChat(domElements); // <<< Pass the whole object
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
                    return {
                        id: item.id,
                        userId: item.userId,
                        title: item.title || `Cuộc trò chuyện #${String(item.id).substring(0, 5)}`,
                        createdAt: item.createdAt,
                        lastUpdatedAt: lastUpdatedAt,
                        messages: [],
                        conversationId: item.conversationId || null,
                        // Initialize infinite scroll state
                        isLoadingOlder: false,
                        hasMoreOlder: true,
                        oldestMessageId: null
                    };
                }).sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());

                console.log('[session.js] Sessions processed successfully.');
                // Select the most recent session initially
                if (chatSessions.length > 0) {
                    currentSessionId = chatSessions[0].id;
                    console.log(`[session.js] Initial currentSessionId set to: ${currentSessionId}`);
                    // Load messages for the initially selected session
                    // Make sure all required elements are available in domElements
                    if (chatContainerElement && welcomeElement && chatMessagesElement) {
                       await loadSessionMessages(currentSessionId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
                    } else {
                       console.error('[session.js] Cannot load initial session messages: Missing DOM elements.');
                    }
                } else {
                    // If somehow sessions array is empty after processing non-empty data
                    await startNewChat(domElements);
                }

            } catch (mapSortError) {
                console.error('[session.js] Error processing session data:', mapSortError);
                throw new Error('Lỗi xử lý dữ liệu session.');
            }
            // Update sidebar after processing and potentially loading the first session
            updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
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
            historySessionsElement.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lỗi tải lịch sử.</p>';
        }
         // Also update sidebar in error case to ensure it's cleared
         updateHistorySidebar([], null, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
        isLoading = false;
        console.log('[session.js] <=== Load chat sessions finished (Catch Error).');
        return false;
    }
}

/**
 * Tải tin nhắn ban đầu (gần đây nhất) cho một session.
 * Sử dụng fetchWithAuth và endpoint: /api/ChatMessages/session/{sessionId}/recent?count={count}.
 * @param {string} sessionId - ID của session cần tải.
 * @param {HTMLElement} historySessionsElement - Tham chiếu đến div lịch sử.
 * @param {HTMLElement} chatContainerElement - Tham chiếu đến div chứa tin nhắn (scrollable).
 * @param {HTMLElement} welcomeElement - Tham chiếu đến div welcome tĩnh.
 * @param {HTMLElement} chatMessagesElement - Tham chiếu đến div bao ngoài khu vực chat (parent of container).
 */
export async function loadSessionMessages(sessionId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement) {
    console.log(`[session.js] Initial load for session: ${sessionId}.`);
    const targetSession = chatSessions.find(s => s.id === sessionId);
    if (!targetSession) {
        console.error(`[session.js] Session ${sessionId} not found locally for initial load.`);
        showNotification('Không tìm thấy phiên chat cục bộ.', 'error');
        return;
    }

    // Reset session state for loading older messages
    targetSession.messages = [];
    targetSession.isLoadingOlder = false;
    targetSession.hasMoreOlder = true; // Assume there are older messages initially
    targetSession.oldestMessageId = null;

    // Remove previous scroll listener if exists
    if (currentScrollListener && chatContainerElement) {
        chatContainerElement.removeEventListener('scroll', currentScrollListener);
        console.log(`[session.js] Removed old scroll listener for session ${currentSessionId}`);
    }
    currentScrollListener = null; // Reset the stored listener

    currentSessionId = sessionId;
    console.log(`[session.js] Set currentSessionId = ${currentSessionId}`);
    // Update sidebar highlight
    updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);


    // Use the specific ChatMessages endpoint for recent messages
    // Endpoint from user query: http://172.20.10.44:8055/api/ChatMessages/session/{sessionId}/recent?count=5
    // Let's use a slightly larger initial count, e.g., 20
    const initialMessagesCount = 5;
    // Workaround: Force the correct base path, ignoring potential extra parts in CHAT_API_ENDPOINT
    const messagesApiUrl = `${CHAT_MESSAGE_API_ENDPOINT}/session/${sessionId}/recent?count=${initialMessagesCount}`;
    console.log(`[session.js] Fetching initial messages from (forced base) ${messagesApiUrl}...`);

    if (chatContainerElement) {
         chatContainerElement.innerHTML = '<p class="text-center text-secondary-500 p-4">Đang tải tin nhắn...</p>'; // Show loading message
    }

    try {
        // Fetch initial recent messages
        const initialMessages = await fetchWithAuth(messagesApiUrl); // API expected to return array of messages

        console.log(`[session.js] Raw initial messages for ${sessionId}:`, initialMessages);

        // Check if the response is a valid array
        if (!Array.isArray(initialMessages)) {
             console.error(`[session.js] Invalid messages data received for session ${sessionId}:`, initialMessages);
             throw new Error('Định dạng dữ liệu tin nhắn không hợp lệ');
        }

        try {
            const mappedMessages = initialMessages.map(apiMsg => {
                 if (!apiMsg || typeof apiMsg.content === 'undefined') return null;
                 return {
                     id: apiMsg.id, // Ensure messages have unique IDs from the API
                     senderName: apiMsg.senderName || (apiMsg.isUser ? 'Người dùng' : 'Bot'),
                     isUser: Boolean(apiMsg.isUser),
                     content: apiMsg.content,
                     timestamp: apiMsg.timestamp || new Date().toISOString()
                 };
             }).filter(msg => msg !== null)
               .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

            targetSession.messages = mappedMessages; // Assign the initially loaded messages

            if (mappedMessages.length > 0) {
                targetSession.oldestMessageId = mappedMessages[0].id; // Store the ID of the oldest message (first in sorted array)
                console.log(`[session.js] Stored oldestMessageId: ${targetSession.oldestMessageId}`);
            } else {
                // No messages loaded initially
                targetSession.hasMoreOlder = false; // No older messages if none initially
                console.log(`[session.js] No initial messages found for ${sessionId}. Setting hasMoreOlder=false.`);
            }

             // If fewer messages were returned than requested, assume no more older messages
            if (mappedMessages.length < initialMessagesCount) {
                targetSession.hasMoreOlder = false;
                console.log(`[session.js] Initial load returned fewer messages than requested (${mappedMessages.length}/${initialMessagesCount}). Setting hasMoreOlder=false.`);
            }

            // --- START: Kiểm tra và cập nhật title dựa trên tin nhắn người dùng mới nhất ---
            let lastUserMessage = null;
            for (let i = mappedMessages.length - 1; i >= 0; i--) {
                if (mappedMessages[i].isUser) {
                    lastUserMessage = mappedMessages[i];
                    break;
                }
            }

            if (lastUserMessage) {
                const userContent = lastUserMessage.content?.trim() || '';
                if (userContent) {
                    const potentialNewTitle = userContent.length > 30
                                              ? userContent.substring(0, 27) + '...'
                                              : userContent;
                    if (potentialNewTitle !== targetSession.title) {
                        console.log(`[session.js] loadSessionMessages: Found newer title (\"${potentialNewTitle}\") from last user message than current session title (\"${targetSession.title}\"). Updating...`);
                        // Tạo object domElements tạm thời nếu cần
                         const tempDomElements = {
                             historySessions: historySessionsElement,
                             chatContainer: chatContainerElement,
                             welcomeMessageDiv: welcomeElement,
                             chatMessagesDiv: chatMessagesElement
                         };
                        // Gọi hàm cập nhật (sẽ cập nhật client state, UI, và gửi API)
                        // Dùng await để đảm bảo title được cập nhật trước khi load UI? Có thể không cần thiết vì updateCurrentSessionTitle cập nhật UI ngay.
                        // Tạm thời không await để tránh block
                        updateCurrentSessionTitle(potentialNewTitle, tempDomElements); 
                    }
                }
            }
            // --- END: Kiểm tra và cập nhật title ---

            console.log(`[session.js] Processed ${targetSession.messages.length} initial messages for ${sessionId}.`);
        } catch (mapSortError) {
             console.error(`[session.js] Error processing initial messages for ${sessionId}:`, mapSortError);
             throw new Error('Lỗi xử lý dữ liệu tin nhắn ban đầu.');
        }

        // Load the UI with the initial messages
        console.log(`[session.js] Calling loadSessionUI for ${sessionId}.`);
        // Construct the domElements object needed by loadSessionUI
        const elementsForUI = {
            historySessions: historySessionsElement,
            chatContainer: chatContainerElement,
            welcomeMessageDiv: welcomeElement,
            chatMessagesDiv: chatMessagesElement
            // Add other elements from domElements if loadSessionUI or its callees need them
        };
        loadSessionUI(targetSession, showWelcomeMessageHandler, elementsForUI);

        // Add scroll listener AFTER UI is loaded and elements exist
        if (targetSession.hasMoreOlder && chatContainerElement) {
            // Define the listener function
            const scrollListener = async (event) => {
                // Check if scrolled near the top (e.g., within 50px)
                if (event.target.scrollTop <= 50) {
                    console.log(`[session.js] Scrolled near top for session ${sessionId}. Attempting to load older messages.`);
                    // Pass necessary elements to loadOlderMessages
                    await loadOlderMessages(sessionId, chatContainerElement);
                }
            };
            // Attach the listener
            chatContainerElement.addEventListener('scroll', scrollListener);
            // Store the listener function so it can be removed later
            currentScrollListener = scrollListener;
             console.log(`[session.js] Added scroll listener for session ${sessionId}`);
        } else {
             console.log(`[session.js] Not adding scroll listener for ${sessionId} (hasMoreOlder: ${targetSession.hasMoreOlder})`);
        }

    } catch (error) {
        console.error(`[session.js] Error in initial loadSessionMessages for ${sessionId}:`, error);
         if (!error.message.includes('401')) {
            showNotification(error.message || `Không thể tải tin nhắn ban đầu.`, 'error');
            if (chatContainerElement) {
                chatContainerElement.innerHTML = '<p class="text-center text-red-500 p-4">Lỗi tải tin nhắn ban đầu.</p>';
            }
         }
        targetSession.messages = []; // Ensure messages are empty on error
        targetSession.hasMoreOlder = false; // Can't load older if initial fails
    }
}

/**
 * Tải các tin nhắn cũ hơn cho session hiện tại khi người dùng cuộn lên.
 * @param {string} sessionId - ID của session cần tải thêm tin nhắn.
 * @param {HTMLElement} chatContainerElement - Phần tử chứa tin nhắn (scrollable).
 */
async function loadOlderMessages(sessionId, chatContainerElement) {
    const targetSession = chatSessions.find(s => s.id === sessionId);

    if (!targetSession) {
        console.error(`[session.js] Session ${sessionId} not found for loading older messages.`);
        return;
    }

    // Prevent simultaneous loads or loading when no more messages exist
    if (targetSession.isLoadingOlder || !targetSession.hasMoreOlder) {
        console.log(`[session.js] Skipping loadOlderMessages for ${sessionId} (isLoadingOlder: ${targetSession.isLoadingOlder}, hasMoreOlder: ${targetSession.hasMoreOlder})`);
        return;
    }

     if (!targetSession.oldestMessageId) {
        console.warn(`[session.js] Cannot load older messages for ${sessionId}: oldestMessageId is null.`);
        targetSession.hasMoreOlder = false; // Cannot proceed without a starting point
        return;
    }


    console.log(`[session.js] Loading older messages for session ${sessionId} before message ${targetSession.oldestMessageId}`);
    targetSession.isLoadingOlder = true;

    // Optional: Show a loading indicator at the top
    const loadingIndicatorId = `loading-older-${sessionId}`;
    let loadingIndicator = chatContainerElement.querySelector(`#${loadingIndicatorId}`);
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('p');
        loadingIndicator.id = loadingIndicatorId;
        loadingIndicator.className = 'text-center text-secondary-500 p-2 text-sm';
        loadingIndicator.textContent = 'Đang tải tin nhắn cũ hơn...';
        chatContainerElement.prepend(loadingIndicator); // Add to the top
    }

    // --- API Endpoint Assumption ---
    // Assuming an endpoint like: /api/ChatMessages/session/{sessionId}/recent?count=10
    // Workaround: Force the correct base path
    const olderMessagesCount = 10;
    const olderMessagesApiUrl = `${CHAT_MESSAGE_API_ENDPOINT}/session/${sessionId}/recent?count=${olderMessagesCount}`;
    // -----------------------------

    try {
        const olderMessages = await fetchWithAuth(olderMessagesApiUrl); // Expected to return array

        console.log(`[session.js] Raw older messages received for ${sessionId}:`, olderMessages);

        if (!Array.isArray(olderMessages)) {
            console.error(`[session.js] Invalid older messages data received for ${sessionId}:`, olderMessages);
            throw new Error('Định dạng dữ liệu tin nhắn cũ không hợp lệ');
        }

        if (olderMessages.length === 0) {
            // No more older messages found by API
            console.log(`[session.js] No more older messages found via API for ${sessionId}.`);
            targetSession.hasMoreOlder = false;
             if (currentScrollListener && chatContainerElement) {
                 chatContainerElement.removeEventListener('scroll', currentScrollListener);
                 currentScrollListener = null; // Clear stored listener
                 console.log(`[session.js] Removed scroll listener for ${sessionId} as API returned 0 messages.`);
             }
        } else {
            // --- Client-side Filtering START ---
            // Get IDs of messages already loaded in the client
            const existingMessageIds = new Set(targetSession.messages.map(m => m.id));

            const newlyFetchedMessages = olderMessages.map(apiMsg => {
                 if (!apiMsg || typeof apiMsg.content === 'undefined') return null;
                 // Only map messages that are NOT already loaded
                 if (existingMessageIds.has(apiMsg.id)) {
                    console.log(`[session.js] Filtering out already loaded message ID: ${apiMsg.id}`);
                    return null;
                 }
                 return {
                     id: apiMsg.id,
                     senderName: apiMsg.senderName || (apiMsg.isUser ? 'Người dùng' : 'Bot'),
                     isUser: Boolean(apiMsg.isUser),
                     content: apiMsg.content,
                     timestamp: apiMsg.timestamp || new Date().toISOString()
                 };
             }).filter(msg => msg !== null)
               .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            // --- Client-side Filtering END ---

            // Check if any *new* older messages were actually found after filtering
            if (newlyFetchedMessages.length === 0) {
                console.log(`[session.js] No *new* older messages found after filtering for ${sessionId}. End reached or API repeating.`);
                targetSession.hasMoreOlder = false;
                 if (currentScrollListener && chatContainerElement) {
                     chatContainerElement.removeEventListener('scroll', currentScrollListener);
                     currentScrollListener = null;
                     console.log(`[session.js] Removed scroll listener for ${sessionId} as no new messages found after filtering.`);
                 }
            } else {
                // Store the scroll height before adding new messages
                const previousScrollHeight = chatContainerElement.scrollHeight;
                const previousScrollTop = chatContainerElement.scrollTop;

                // Prepend ONLY the newly fetched older messages to the session's array
                targetSession.messages.unshift(...newlyFetchedMessages);

                // Update the oldest message ID based on the *newly added* messages
                // This ensures the next 'loadOlder' (if needed) starts from the right place *theoretically*
                // although the current API won't use it.
                targetSession.oldestMessageId = newlyFetchedMessages[0].id;
                console.log(`[session.js] Updated oldestMessageId to ${targetSession.oldestMessageId} based on newly added messages.`);

                // Prepend ONLY the new message elements to the chat container
                const fragment = document.createDocumentFragment();
                newlyFetchedMessages.forEach(msg => {
                    const messageElement = renderMessageElement(msg); // Use the refactored function
                    fragment.appendChild(messageElement);
                });
                // Remove the loading indicator *before* prepending new content
                if (loadingIndicator) {
                    loadingIndicator.remove();
                    loadingIndicator = null; // Clear the reference
                }
                chatContainerElement.prepend(fragment); // Prepend the new messages

                // Maintain scroll position: scrollTop should increase by the height difference
                const newScrollHeight = chatContainerElement.scrollHeight;
                chatContainerElement.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
                console.log(`[session.js] Prepended ${newlyFetchedMessages.length} new older messages. Adjusted scroll.`);

                // Check if the API returned fewer messages than requested OR if filtering removed messages
                // This indicates the end of available history from the API's perspective
                if (olderMessages.length < olderMessagesCount || newlyFetchedMessages.length < olderMessages.length) {
                    console.log(`[session.js] Setting hasMoreOlder=false. API returned ${olderMessages.length}/${olderMessagesCount}, ${newlyFetchedMessages.length} were new.`);
                    targetSession.hasMoreOlder = false;
                    if (currentScrollListener && chatContainerElement) {
                        chatContainerElement.removeEventListener('scroll', currentScrollListener);
                        currentScrollListener = null;
                        console.log(`[session.js] Removed scroll listener for ${sessionId} as end likely reached.`);
                    }
                }
            }
        }

    } catch (error) {
        console.error(`[session.js] Error loading older messages for ${sessionId}:`, error);
        if (!error.message.includes('401')) {
           showNotification('Lỗi khi tải tin nhắn cũ hơn.', 'error');
        }
        targetSession.hasMoreOlder = false; // Stop trying if error occurs
        // Optionally remove listener on error too
         if (currentScrollListener && chatContainerElement) {
            chatContainerElement.removeEventListener('scroll', currentScrollListener);
            currentScrollListener = null;
             console.log(`[session.js] Removed scroll listener for ${sessionId} due to error.`);
         }
    } finally {
        // Remove loading indicator if it hasn't been removed yet (e.g., in case of empty response or error before prepend)
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
        targetSession.isLoadingOlder = false; // Reset loading flag
        console.log(`[session.js] Finished loadOlderMessages attempt for ${sessionId}.`);
    }
}

/**
 * Bắt đầu một phiên chat mới thông qua API.
 * Sử dụng fetchWithAuth.
 * @param {object} domElements - Đối tượng chứa các tham chiếu đến phần tử DOM quan trọng.
 *        (historySessions, chatContainer, welcomeMessageDiv, chatMessagesDiv)
 */
export async function startNewChat(domElements) {
    console.log('[session.js] Attempting to start new chat...');
    // Trích xuất các element cần thiết từ domElements
    const historySessionsElement = domElements?.historySessions;
    const chatContainerElement = domElements?.chatContainer;
    const welcomeElement = domElements?.welcomeMessageDiv; // Đổi tên cho khớp với main.js
    const chatMessagesElement = domElements?.chatMessagesDiv; // Đổi tên cho khớp với main.js

    // Kiểm tra các element trước khi sử dụng (optional but recommended)
    if (!historySessionsElement || !chatContainerElement || !welcomeElement || !chatMessagesElement) {
        console.error('[session.js] startNewChat: Missing required DOM elements from domElements object.', domElements);
        showNotification("Lỗi giao diện người dùng.", "error");
        return; // Không tiếp tục nếu thiếu element
    }

    // Remove previous scroll listener if exists
    if (currentScrollListener && chatContainerElement) {
        chatContainerElement.removeEventListener('scroll', currentScrollListener);
        console.log(`[session.js] Removed old scroll listener before starting new chat.`);
    }
    currentScrollListener = null;

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
            conversationId: newSessionData.conversationId || null,
             // Initialize infinite scroll state for new session
             isLoadingOlder: false,
             hasMoreOlder: false, // New chat has no older messages
             oldestMessageId: null
        };
        chatSessions.unshift(newSession);
        currentSessionId = newSession.id;
        console.log(`[session.js] New session ${currentSessionId} added locally. Updating UI.`);
        chatSessions.sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
        // Truyền historySessionsElement và các element khác vào updateHistorySidebar
        updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
        // 1. Load (clear) the UI first
        loadSessionUI(newSession, null, domElements); // Pass null for showWelcomeFn as we handle it below

        // 2. THEN, trigger the dynamic welcome message generation
        if (showWelcomeMessageHandler) {
            console.log('[session.js] Calling showWelcomeMessageHandler AFTER loadSessionUI to display dynamic welcome message in chat area.');
            // Use try-catch as showWelcomeMessageHandler is async and might throw
            try {
                // No need to await if we don't need to wait for it to finish before proceeding
                showWelcomeMessageHandler(domElements); 
            } catch (welcomeError) {
                console.error('[session.js] Error calling showWelcomeMessageHandler:', welcomeError);
                // Optionally show an error message in the chat area
                if(chatContainerElement) {
                    chatContainerElement.innerHTML = '<p class="text-center text-red-500 p-4">Lỗi khi hiển thị tin nhắn chào mừng.</p>';
                }
            }
        } else {
            console.warn('[session.js] showWelcomeMessageHandler not set. Cannot display dynamic welcome message.');
            // UI is already cleared by loadSessionUI, maybe show a static text?
            if(chatContainerElement) {
                 chatContainerElement.innerHTML = '<p class="text-center text-secondary-500 p-4">Bắt đầu cuộc trò chuyện mới.</p>';
            }
        }

        // No scroll listener needed for a brand new chat initially
        console.log(`[session.js] Not adding scroll listener for new chat ${currentSessionId}`);

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
 * @param {HTMLElement} historySessionsElement - Tham chiếu đến div lịch sử.
 * @param {HTMLElement} chatContainerElement - Tham chiếu đến div chứa tin nhắn.
 * @param {HTMLElement} welcomeElement - Tham chiếu đến div welcome tĩnh.
 * @param {HTMLElement} chatMessagesElement - Tham chiếu đến div bao ngoài khu vực chat.
 */
export function handleDeleteRequest(sessionId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement) {
    const sessionToDelete = chatSessions.find(s => s.id === sessionId);
    const sessionTitle = sessionToDelete?.title || "Cuộc trò chuyện này";
    console.log(`[session.js] Requesting delete confirmation for session: ${sessionId} (${sessionTitle})`);
    showDeleteSessionDialog(sessionTitle, async () => {
        console.log(`[session.js] Confirmed delete for session: ${sessionId}`);
        // Truyền các tham số element vào deleteSession
        await deleteSession(sessionId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement); // <<< Truyền params
    });
}

/**
 * Thực hiện xóa session thông qua API.
 * Sử dụng fetchWithAuth.
 * @param {string} sessionId - ID của session cần xóa.
 * @param {HTMLElement} historySessionsElement - Tham chiếu đến div lịch sử.
 * @param {HTMLElement} chatContainerElement - Tham chiếu đến div chứa tin nhắn.
 * @param {HTMLElement} welcomeElement - Tham chiếu đến div welcome tĩnh.
 * @param {HTMLElement} chatMessagesElement - Tham chiếu đến div bao ngoài khu vực chat.
 */
async function deleteSession(sessionId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement) {
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
                // Truyền các tham số element vào loadSessionMessages
                await loadSessionMessages(newCurrentId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement); // loadSessionMessages sẽ cập nhật sidebar
            } else {
                console.log(`[session.js] No sessions left after delete. Starting new chat.`);
                // Truyền các tham số element vào startNewChat
                await startNewChat({ historySessions: historySessionsElement, chatContainer: chatContainerElement, welcomeMessageDiv: welcomeElement, chatMessagesDiv: chatMessagesElement });
            }
        } else {
            console.log(`[session.js] Deleted a non-current session. Updating sidebar.`);
            // Truyền historySessionsElement và các element khác vào updateHistorySidebar
            updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
        }
    } catch (error) {
        console.error(`[session.js] Error deleting session ${sessionId}:`, error);
        if (!error.message.includes('401')) {
           showNotification(error.message || 'Lỗi khi xóa phiên chat.', 'error');
        }
        // Không throw lại lỗi để không làm crash luồng dialog
    }
}

/**
 * Xử lý khi người dùng chọn một session từ sidebar.
 * Tải tin nhắn ban đầu cho session đó.
 * @param {string} sessionId - ID của session được chọn.
 * @param {HTMLElement} historySessionsElement - Tham chiếu đến div lịch sử.
 * @param {HTMLElement} chatContainerElement - Tham chiếu đến div chứa tin nhắn (scrollable).
 * @param {HTMLElement} welcomeElement - Tham chiếu đến div welcome tĩnh.
 * @param {HTMLElement} chatMessagesElement - Tham chiếu đến div bao ngoài khu vực chat.
 */
export async function handleSelectSession(sessionId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement) {
    console.log(`[session.js] handleSelectSession called for: ${sessionId}`);
    if (sessionId && sessionId !== currentSessionId) {
        console.log(`[session.js] Current session is ${currentSessionId}, selected ${sessionId}. Loading initial messages...`);

        // Remove previous scroll listener before loading new session
        if (currentScrollListener && chatContainerElement) {
            chatContainerElement.removeEventListener('scroll', currentScrollListener);
            console.log(`[session.js] Removed old scroll listener for session ${currentSessionId} in handleSelectSession.`);
            currentScrollListener = null;
        }

        // Truyền các tham số element vào loadSessionMessages để tải initial load
        await loadSessionMessages(sessionId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
        // loadSessionMessages now handles updating the sidebar highlight and adding the new listener
    } else if (sessionId === currentSessionId) {
         console.log(`[session.js] Clicked on the already active session: ${sessionId}. No action needed.`);
    } else {
         console.warn(`[session.js] handleSelectSession called with invalid sessionId: ${sessionId}`);
    }
}
