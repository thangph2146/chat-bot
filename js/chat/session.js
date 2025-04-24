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

    // --- Cập nhật UI (Sidebar) ngay lập tức --- 
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
    if (isLoading) {
        console.warn("[session.js] loadChatSessions called while already loading.");
        return false;
    }
    isLoading = true;
    console.log("[session.js] loadChatSessions started.");

    // Extract elements from domElements object
    const historySessionsElement = domElements?.historySessions;
    const chatContainerElement = domElements?.chatContainer;
    const welcomeElement = domElements?.welcomeMessageDiv;
    const chatMessagesElement = domElements?.chatMessagesDiv;

    // Check if essential elements exist
    if (!historySessionsElement) {
        console.error('[session.js] loadChatSessions: Missing historySessions element in domElements.');
        isLoading = false;
        return false;
    }

    const userInfo = getUserInfo();
    const userId = userInfo?.data?.userId;

    if (userId === undefined || userId === null) {
        console.error("[session.js] User ID missing. Cannot fetch sessions.");
        showNotification('Lỗi xác thực, không thể tải lịch sử chat.', 'error');
        historySessionsElement.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lỗi xác thực.</p>';
        updateHistorySidebar([], null, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
        isLoading = false;
        return false;
    }

    const userSessionsApiUrl = `${SESSIONS_API_ENDPOINT}/user/${userId}`;
    historySessionsElement.innerHTML = '<p class="text-center text-secondary-500 text-sm p-4">Đang tải lịch sử...</p>';

    try {
        console.log(`[session.js] Fetching sessions from: ${userSessionsApiUrl}`);
        const data = await fetchWithAuth(userSessionsApiUrl);
        console.log(`[session.js] Response from ${userSessionsApiUrl}:`, JSON.stringify(data)); // Log full response

        if (data === null || (Array.isArray(data) && data.length === 0)) {
            console.log('[session.js] Empty session list detected. Attempting to start a new chat...');
            chatSessions = [];
            currentSessionId = null;
            historySessionsElement.innerHTML = `<p class="text-center text-secondary-500 text-sm p-4">Chưa có lịch sử. Đang tạo cuộc trò chuyện mới...</p>`;
            showNotification('Đang bắt đầu cuộc trò chuyện mới...', 'info', 2000);
            
            // *** FIX: Reset isLoading before calling startNewChat ***
            isLoading = false; 
            console.log("[session.js] Reset isLoading before calling startNewChat.");
            
            const newChatSuccess = await startNewChat(domElements); 
            // isLoading will be set again inside startNewChat if it proceeds
            
            if (newChatSuccess) {
                console.log("[session.js] New chat started successfully within loadChatSessions.");
                // No need to set isLoading = false here, startNewChat handles it
                return true; 
            } else {
                console.error("[session.js] Failed to start new chat within loadChatSessions.");
                historySessionsElement.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lỗi tạo cuộc trò chuyện mới.</p>';
                // Ensure isLoading is false if startNewChat failed internally without resetting
                isLoading = false; 
                return false; 
            }
        }

        if (Array.isArray(data)) {
            console.log(`[session.js] Processing ${data.length} sessions from API.`);
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
                 console.log("[session.js] Sessions mapped and sorted.");

                if (chatSessions.length > 0) {
                    currentSessionId = chatSessions[0].id;
                    console.log(`[session.js] Set currentSessionId to the most recent: ${currentSessionId}`);
                    if (chatContainerElement && welcomeElement && chatMessagesElement) {
                        // loadSessionMessages will be called by main.js after this returns true
                        // await loadSessionMessages(currentSessionId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
                    } else {
                       console.error('[session.js] Cannot load initial session messages: Missing DOM elements.');
                    }
                } else {
                     console.warn('[session.js] Session array is empty after processing non-empty API data? Starting new chat.');
                    // This case should ideally not happen if API returned data, but handle it defensively
                    isLoading = false; // Reset before calling startNewChat
                    console.log("[session.js] Reset isLoading before calling startNewChat (edge case).");
                    const newChatSuccess = await startNewChat(domElements);
                    // No need to set isLoading=false here, startNewChat handles it
                    return newChatSuccess; 
                }

            } catch (mapSortError) {
                console.error('[session.js] Error processing session data:', mapSortError);
                isLoading = false;
                throw new Error('Lỗi xử lý dữ liệu session.'); // Re-throw to be caught below
            }
            
            // Update sidebar after processing (main.js will call loadSessionMessages)
            // We don't call updateHistorySidebar here anymore, main.js does it after load completes.
            // updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
            console.log("[session.js] loadChatSessions finished successfully (found existing sessions).");
            isLoading = false;
            return true; // Success
        } else {
            console.error('[session.js] Invalid API response structure. Expected array or null, received:', typeof data, data);
            isLoading = false;
            throw new Error('Dữ liệu lịch sử API người dùng không hợp lệ.');
        }

    } catch (error) {
        console.error('[session.js] Error in loadChatSessions catch block:', error);
        chatSessions = [];
        currentSessionId = null;
        if (!error.message.includes('401')) {
            showNotification(error.message || 'Không thể tải lịch sử chat.', 'error');
            historySessionsElement.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lỗi tải lịch sử.</p>';
        }
         updateHistorySidebar([], null, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
         console.log("[session.js] loadChatSessions finished with error.");
        isLoading = false;
        return false; // Indicate failure
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
    console.log(`[session.js] loadSessionMessages called for sessionId: ${sessionId}`);
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
        console.log("[session.js] Removing previous scroll listener.");
        chatContainerElement.removeEventListener('scroll', currentScrollListener);
    }
    currentScrollListener = null; // Reset the stored listener

    currentSessionId = sessionId;
    console.log(`[session.js] currentSessionId set to: ${currentSessionId}`);
    // Update sidebar highlight (ensure all elements are passed)
    updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);


    // Use the specific ChatMessages endpoint for recent messages
    const initialMessagesCount = 5;
    const messagesApiUrl = `${CHAT_MESSAGE_API_ENDPOINT}/session/${sessionId}/recent?count=${initialMessagesCount}`;
    console.log(`[session.js] Fetching initial messages from: ${messagesApiUrl}`);

    if (chatContainerElement) {
         chatContainerElement.innerHTML = '<p class="text-center text-secondary-500 p-4">Đang tải tin nhắn...</p>'; // Show loading message
    }
    // Ensure welcome screen is hidden
    if (welcomeElement) {
        welcomeElement.style.display = 'none';
    }
    // Ensure chat message area is visible
    if (chatMessagesElement) {
        chatMessagesElement.classList.remove('hidden');
    }

    try {
        const initialMessages = await fetchWithAuth(messagesApiUrl);
        console.log(`[session.js] Initial messages API response for ${sessionId}:`, JSON.stringify(initialMessages));

        if (!Array.isArray(initialMessages)) {
             console.error(`[session.js] Invalid messages data received for session ${sessionId}:`, initialMessages);
             throw new Error('Định dạng dữ liệu tin nhắn không hợp lệ');
        }

        try {
             const mappedMessages = initialMessages.map(apiMsg => {
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
             console.log(`[session.js] Mapped and sorted ${mappedMessages.length} initial messages.`);

            targetSession.messages = mappedMessages;

            if (mappedMessages.length > 0) {
                targetSession.oldestMessageId = mappedMessages[0].id;
                console.log(`[session.js] Oldest message ID set to: ${targetSession.oldestMessageId}`);
            } else {
                targetSession.hasMoreOlder = false;
                console.log("[session.js] No initial messages loaded, setting hasMoreOlder to false.");
            }

            if (mappedMessages.length < initialMessagesCount) {
                targetSession.hasMoreOlder = false;
                console.log("[session.js] Fewer messages loaded than requested, setting hasMoreOlder to false.");
            }

            // --- START: Update title based on last user message --- 
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
                         const tempDomElements = {
                             historySessions: historySessionsElement,
                             chatContainer: chatContainerElement,
                             welcomeMessageDiv: welcomeElement,
                             chatMessagesDiv: chatMessagesElement
                         };
                        console.log(`[session.js] Updating session title to: "${potentialNewTitle}" based on last user message.`);
                        updateCurrentSessionTitle(potentialNewTitle, tempDomElements);
                    }
                }
            }
            // --- END: Update title --- 

        } catch (mapSortError) {
             console.error(`[session.js] Error processing initial messages for ${sessionId}:`, mapSortError);
             throw new Error('Lỗi xử lý dữ liệu tin nhắn ban đầu.');
        }

        // Load the UI with the initial messages
        const elementsForUI = {
            historySessions: historySessionsElement,
            chatContainer: chatContainerElement,
            welcomeMessageDiv: welcomeElement,
            chatMessagesDiv: chatMessagesElement
        };
        console.log("[session.js] Calling loadSessionUI...");
        loadSessionUI(targetSession, null, elementsForUI); // Pass null for showWelcomeMessageHandler here

        // Add scroll listener AFTER UI is loaded
        if (targetSession.hasMoreOlder && chatContainerElement) {
            console.log("[session.js] Adding scroll listener for loading older messages.");
            const scrollListener = async (event) => {
                if (event.target.scrollTop <= 50) {
                    console.log("[session.js] Scrolled near top, attempting to load older messages...");
                    await loadOlderMessages(sessionId, chatContainerElement);
                }
            };
            chatContainerElement.addEventListener('scroll', scrollListener);
            currentScrollListener = scrollListener;
        } else {
             console.log("[session.js] Not adding scroll listener (hasMoreOlder=false or chatContainerElement missing).");
        }
         console.log("[session.js] loadSessionMessages completed successfully.");

    } catch (error) {
        console.error(`[session.js] Error in initial loadSessionMessages for ${sessionId}:`, error);
         if (!error.message.includes('401')) {
            showNotification(error.message || `Không thể tải tin nhắn ban đầu.`, 'error');
            if (chatContainerElement) {
                chatContainerElement.innerHTML = '<p class="text-center text-red-500 p-4">Lỗi tải tin nhắn ban đầu.</p>';
            }
         }
        targetSession.messages = [];
        targetSession.hasMoreOlder = false;
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

    if (targetSession.isLoadingOlder || !targetSession.hasMoreOlder) {
         console.log(`[session.js] Skipping loadOlderMessages: isLoadingOlder=${targetSession.isLoadingOlder}, hasMoreOlder=${targetSession.hasMoreOlder}`);
        return;
    }

     if (!targetSession.oldestMessageId) {
        console.warn(`[session.js] Cannot load older messages: oldestMessageId is null for session ${sessionId}.`);
        targetSession.hasMoreOlder = false;
        return;
    }

    console.log(`[session.js] loadOlderMessages started for session ${sessionId}, before message ID ${targetSession.oldestMessageId}`);
    targetSession.isLoadingOlder = true;

    const loadingIndicatorId = `loading-older-${sessionId}`;
    let loadingIndicator = chatContainerElement.querySelector(`#${loadingIndicatorId}`);
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('p');
        loadingIndicator.id = loadingIndicatorId;
        loadingIndicator.className = 'text-center text-secondary-500 p-2 text-sm';
        loadingIndicator.textContent = 'Đang tải tin nhắn cũ hơn...';
        chatContainerElement.prepend(loadingIndicator);
        console.log("[session.js] Prepended loading indicator.");
    }

    const olderMessagesCount = 10;
    // --- API Endpoint Assumption - NEEDS TO BE CORRECTED TO USE `beforeMessageId` --- 
    // const olderMessagesApiUrl = `${CHAT_MESSAGE_API_ENDPOINT}/session/${sessionId}/before/${targetSession.oldestMessageId}?count=${olderMessagesCount}`;
    // TEMPORARY WORKAROUND using /recent - THIS WILL NOT LOAD CORRECTLY
     const olderMessagesApiUrl = `${CHAT_MESSAGE_API_ENDPOINT}/session/${sessionId}/recent?count=${olderMessagesCount}`;
     console.warn(`[session.js] USING TEMPORARY /recent ENDPOINT FOR OLDER MESSAGES - THIS IS INCORRECT! API needs /before/{messageId}`);
    // ----------------------------------------------------------------------------

    try {
        console.log(`[session.js] Fetching older messages from: ${olderMessagesApiUrl}`);
        const olderMessages = await fetchWithAuth(olderMessagesApiUrl);
        console.log(`[session.js] Older messages API response:`, JSON.stringify(olderMessages));


        if (!Array.isArray(olderMessages)) {
            console.error(`[session.js] Invalid older messages data received for ${sessionId}:`, olderMessages);
            throw new Error('Định dạng dữ liệu tin nhắn cũ không hợp lệ');
        }

        if (olderMessages.length === 0) {
            console.log("[session.js] API returned 0 older messages. Setting hasMoreOlder to false.");
            targetSession.hasMoreOlder = false;
             if (currentScrollListener && chatContainerElement) {
                 chatContainerElement.removeEventListener('scroll', currentScrollListener);
                 currentScrollListener = null;
                 console.log("[session.js] Removed scroll listener (no more older messages).");
             }
        } else {
            // Filter out messages already present (due to temporary API endpoint)
            const existingMessageIds = new Set(targetSession.messages.map(m => m.id));
            const newlyFetchedMessages = olderMessages.map(apiMsg => {
                 if (!apiMsg || typeof apiMsg.content === 'undefined' || existingMessageIds.has(apiMsg.id)) return null;
                 return {
                     id: apiMsg.id,
                     senderName: apiMsg.senderName || (apiMsg.isUser ? 'Người dùng' : 'Bot'),
                     isUser: Boolean(apiMsg.isUser),
                     content: apiMsg.content,
                     timestamp: apiMsg.timestamp || new Date().toISOString()
                 };
             }).filter(msg => msg !== null)
               .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            console.log(`[session.js] Filtered down to ${newlyFetchedMessages.length} new older messages.`);

            if (newlyFetchedMessages.length === 0) {
                 console.log("[session.js] No *new* older messages after filtering. Setting hasMoreOlder to false.");
                targetSession.hasMoreOlder = false;
                 if (currentScrollListener && chatContainerElement) {
                     chatContainerElement.removeEventListener('scroll', currentScrollListener);
                     currentScrollListener = null;
                     console.log("[session.js] Removed scroll listener (no new older messages after filter).");
                 }
            } else {
                const previousScrollHeight = chatContainerElement.scrollHeight;
                const previousScrollTop = chatContainerElement.scrollTop;

                targetSession.messages.unshift(...newlyFetchedMessages);
                
                // --- CORRECT LOGIC (when API supports `before`) ---
                // targetSession.oldestMessageId = newlyFetchedMessages[0].id;
                // console.log(`[session.js] Updated oldestMessageId to: ${targetSession.oldestMessageId}`);
                // --- TEMPORARY (due to /recent endpoint) - Keep the *original* oldest ID ---
                // This prevents infinite loops with the broken API call
                console.warn("[session.js] NOT updating oldestMessageId due to temporary /recent endpoint.");

                const fragment = document.createDocumentFragment();
                newlyFetchedMessages.forEach(msg => {
                    const messageElement = renderMessageElement(msg);
                    fragment.appendChild(messageElement);
                });
                if (loadingIndicator) {
                    loadingIndicator.remove();
                    loadingIndicator = null;
                }
                chatContainerElement.prepend(fragment);
                console.log(`[session.js] Prepended ${newlyFetchedMessages.length} message elements.`);

                const newScrollHeight = chatContainerElement.scrollHeight;
                chatContainerElement.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
                console.log(`[session.js] Adjusted scroll position. PrevTop: ${previousScrollTop}, HeightDiff: ${newScrollHeight - previousScrollHeight}, NewTop: ${chatContainerElement.scrollTop}`);

                // Due to using /recent, we can't reliably know if there are more. Assume no more to prevent loops.
                console.warn("[session.js] Setting hasMoreOlder=false due to temporary /recent endpoint workaround.");
                targetSession.hasMoreOlder = false; 
                if (currentScrollListener && chatContainerElement) {
                    chatContainerElement.removeEventListener('scroll', currentScrollListener);
                    currentScrollListener = null;
                    console.log("[session.js] Removed scroll listener (workaround).");
                }
                // --- Original logic (when API is correct) ---
                // if (olderMessages.length < olderMessagesCount) {
                //     targetSession.hasMoreOlder = false;
                //     if (currentScrollListener && chatContainerElement) {
                //         chatContainerElement.removeEventListener('scroll', currentScrollListener);
                //         currentScrollListener = null;
                //         console.log("[session.js] Removed scroll listener (API returned fewer than requested).");
                //     }
                // }
                // --- End Original Logic ---
            }
        }

    } catch (error) {
        console.error(`[session.js] Error loading older messages for ${sessionId}:`, error);
        if (!error.message.includes('401')) {
           showNotification('Lỗi khi tải tin nhắn cũ hơn.', 'error');
        }
        targetSession.hasMoreOlder = false;
         if (currentScrollListener && chatContainerElement) {
            chatContainerElement.removeEventListener('scroll', currentScrollListener);
            currentScrollListener = null;
            console.log("[session.js] Removed scroll listener due to error.");
         }
    } finally {
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
        targetSession.isLoadingOlder = false;
        console.log("[session.js] loadOlderMessages finished.");
    }
}

/**
 * Bắt đầu một phiên chat mới thông qua API.
 * Sử dụng fetchWithAuth.
 * @param {object} domElements - Đối tượng chứa các tham chiếu đến phần tử DOM quan trọng.
 *        (historySessions, chatContainer, welcomeMessageDiv, chatMessagesDiv)
 * @returns {Promise<boolean>} True nếu tạo và xử lý thành công, False nếu có lỗi.
 */
export async function startNewChat(domElements) {
    console.log("[session.js] startNewChat initiated.");
    // Trích xuất các element cần thiết từ domElements
    const historySessionsElement = domElements?.historySessions;
    const chatContainerElement = domElements?.chatContainer;
    const welcomeElement = domElements?.welcomeMessageDiv;
    const chatMessagesElement = domElements?.chatMessagesDiv;

    console.log('[session.js] startNewChat: DOM elements check:', {
        historySessions: !!historySessionsElement,
        chatContainer: !!chatContainerElement,
        welcomeMessageDiv: !!welcomeElement,
        chatMessagesDiv: !!chatMessagesElement
    });

    const resolvedElements = {
        historySessions: historySessionsElement || document.getElementById('historySessions'),
        chatContainer: chatContainerElement || document.getElementById('chatContainer'),
        welcomeMessageDiv: welcomeElement || document.getElementById('welcomeMessage'),
        chatMessagesDiv: chatMessagesElement || document.getElementById('chatMessages')
    };

    if (!resolvedElements.historySessions || !resolvedElements.chatContainer) {
        console.error('[session.js] startNewChat: Critical DOM elements missing after resolution.', resolvedElements);
        showNotification("Lỗi giao diện người dùng khi tạo chat mới.", "error");
        return false; // Indicate failure
    }

    // Create missing non-critical elements defensively
    if (!resolvedElements.welcomeMessageDiv && resolvedElements.chatContainer) {
        // ... (create welcome message logic)
    }
    if (!resolvedElements.chatMessagesDiv && resolvedElements.chatContainer) {
       // ... (create chat messages logic)
    }

    if (currentScrollListener && resolvedElements.chatContainer) {
        resolvedElements.chatContainer.removeEventListener('scroll', currentScrollListener);
    }
    currentScrollListener = null;

    if (isLoading) {
        console.warn("[session.js] startNewChat called while already loading.");
        return false; // Indicate failure
    }
    isLoading = true;
    console.log("[session.js] startNewChat setting isLoading=true.");
    const defaultTitle = "Cuộc trò chuyện mới";
    const userInfo = getUserInfo();
    const userId = userInfo?.data?.userId;

    if (userId === undefined || userId === null) {
        console.error("[session.js] User ID missing for new chat.");
        showNotification("Lỗi xác thực người dùng.", "error");
        isLoading = false; return false;
    }

    const requestBody = { userId: userId, title: defaultTitle };
    let newSessionData = null; // Declare outside try

    try {
        console.log(`[session.js] Calling API to create new session at ${SESSIONS_API_ENDPOINT}`);
        newSessionData = await fetchWithAuth(SESSIONS_API_ENDPOINT, {
            method: 'POST',
            body: requestBody
        });
        console.log("[session.js] API response for new session:", JSON.stringify(newSessionData));

        if (!newSessionData || typeof newSessionData.id === 'undefined' || newSessionData.id === null) {
             console.error("[session.js] Invalid ID received from new session API:", newSessionData);
             throw new Error('API không trả về ID hợp lệ cho session mới.');
        }

        const newSession = {
            id: newSessionData.id,
            userId: newSessionData.userId || userId,
            title: newSessionData.title || defaultTitle,
            createdAt: newSessionData.createdAt || new Date().toISOString(),
            lastUpdatedAt: newSessionData.lastUpdatedAt || new Date().toISOString(),
            messages: [],
            conversationId: newSessionData.conversationId || null,
             isLoadingOlder: false,
             hasMoreOlder: false,
             oldestMessageId: null
        };
        chatSessions.unshift(newSession);
        currentSessionId = newSession.id; // Set the global variable
        console.log(`[session.js] New session created. currentSessionId set to: ${currentSessionId}`);
        chatSessions.sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
        
        // Update sidebar immediately
        console.log("[session.js] Updating history sidebar after new session creation.");
        updateHistorySidebar(
            chatSessions, 
            currentSessionId, 
            handleSelectSession, 
            handleDeleteRequest, 
            resolvedElements.historySessions,
            resolvedElements.chatContainer,
            resolvedElements.welcomeMessageDiv,
            resolvedElements.chatMessagesDiv
        );
        
        // Clear the chat area and prepare for welcome message
        console.log("[session.js] Calling loadSessionUI for the new session.");
        loadSessionUI(newSession, null, resolvedElements); // Pass null for handler

        // Trigger the dynamic welcome message
        if (showWelcomeMessageHandler) {
            console.log("[session.js] Calling showWelcomeMessageHandler.");
            try {
                showWelcomeMessageHandler(resolvedElements); 
            } catch (welcomeError) {
                console.error('[session.js] Error calling showWelcomeMessageHandler:', welcomeError);
                if(resolvedElements.chatContainer) {
                    resolvedElements.chatContainer.innerHTML = '<p class="text-center text-red-500 p-4">Lỗi khi hiển thị tin nhắn chào mừng.</p>';
                }
            }
        } else {
            console.warn('[session.js] showWelcomeMessageHandler not set.');
            if(resolvedElements.chatContainer) {
                 resolvedElements.chatContainer.innerHTML = '<p class="text-center text-secondary-500 p-4">Bắt đầu cuộc trò chuyện mới.</p>';
            }
        }
        console.log("[session.js] startNewChat completed successfully.");
        isLoading = false;
        return true; // Indicate success

    } catch (error) {
        console.error('[session.js] Error creating new chat via API:', error);
         if (!error.message?.includes('401')) { // Check safely
            showNotification(error.message || 'Không thể tạo cuộc trò chuyện mới.', 'error');
         }
         // Ensure currentSessionId is null if creation failed
         if (newSessionData && currentSessionId === newSessionData.id) {
            currentSessionId = null;
         }
         console.log("[session.js] startNewChat finished with error.");
         isLoading = false;
         return false; // Indicate failure
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
    showDeleteSessionDialog(sessionTitle, async () => {
        await deleteSession(sessionId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
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
    console.log(`[session.js] Attempting to delete session ${sessionId} via API: ${apiUrl}`);

    try {
        await fetchWithAuth(apiUrl, { method: 'DELETE' }, false);
        console.log(`[session.js] Session ${sessionId} deleted successfully via API.`);
        showNotification('Đã xóa phiên chat thành công.', 'success');

        const deletedIndex = chatSessions.findIndex(session => session.id === sessionId);
        if(deletedIndex > -1) chatSessions.splice(deletedIndex, 1);
        console.log(`[session.js] Session ${sessionId} removed from local state.`);

        if (currentSessionId === sessionId) {
            console.log(`[session.js] Deleted the current session. Selecting new session or starting new chat.`);
            currentSessionId = null;
            if (chatSessions.length > 0) {
                chatSessions.sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
                const newCurrentId = chatSessions[0].id;
                console.log(`[session.js] Selecting next session: ${newCurrentId}`);
                await loadSessionMessages(newCurrentId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
            } else {
                console.log(`[session.js] No sessions left after deletion. Starting new chat.`);
                await startNewChat({ historySessions: historySessionsElement, chatContainer: chatContainerElement, welcomeMessageDiv: welcomeElement, chatMessagesDiv: chatMessagesElement });
            }
        } else {
            console.log(`[session.js] Deleted session ${sessionId} was not the current one. Updating sidebar.`);
            updateHistorySidebar(chatSessions, currentSessionId, handleSelectSession, handleDeleteRequest, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
        }
    } catch (error) {
        console.error(`[session.js] Error deleting session ${sessionId}:`, error);
        if (!error.message.includes('401')) {
           showNotification(error.message || 'Lỗi khi xóa phiên chat.', 'error');
        }
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
    console.log(`[session.js] handleSelectSession called for sessionId: ${sessionId}`);
    if (sessionId && sessionId !== currentSessionId) {
        console.log(`[session.js] Selecting new session: ${sessionId}. Current was: ${currentSessionId}`);

        if (currentScrollListener && chatContainerElement) {
            console.log("[session.js] Removing previous scroll listener before selecting new session.");
            chatContainerElement.removeEventListener('scroll', currentScrollListener);
            currentScrollListener = null;
        }

        await loadSessionMessages(sessionId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);

    } else if (sessionId === currentSessionId) {
         console.log(`[session.js] Session ${sessionId} is already selected. Doing nothing.`);
    } else {
         console.warn(`[session.js] handleSelectSession called with invalid sessionId: ${sessionId}`);
    }
}
