# Actions Chính Của Dự Án Chat Bot UI

Tài liệu này mô tả các hành động (chức năng) cốt lõi của giao diện người dùng Chat Bot, dựa trên phân tích mã nguồn JavaScript (`js/`) và tài liệu API (`api.md`, `config.md`).

## 1. Xác thực Người dùng (Authentication)

- **Kiểm tra đăng nhập trước khi tải trang (Pre-Auth Check):**
    - **Mô tả:** Kiểm tra xem thông tin đăng nhập (token) có tồn tại và hợp lệ trong `localStorage` hay không trước khi tải trang chính (`index.html`). Nếu không hợp lệ, chuyển hướng người dùng đến trang đăng nhập (`login.html`).
    - **File:** `js/pre-auth-check.js`.
    - **Logic:** Đọc `localStorage` (key `hub_user_data`), kiểm tra cấu trúc và sự tồn tại của `data.token`.
    ```javascript
    // Snippet from js/pre-auth-check.js
    try {
      const userDataString = localStorage.getItem('hub_user_data');
      let isAuthenticated = false;
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        if (userData && userData.data && userData.data.token) {
          isAuthenticated = true;
        } else {
          localStorage.removeItem('hub_user_data'); // Clean up invalid data
        }
      }
      if (!isAuthenticated) {
        window.location.replace('login.html'); // Redirect if not authenticated
      }
    } catch (error) {
      localStorage.removeItem('hub_user_data');
      window.location.replace('login.html');
    }
    ```

- **Xử lý Đăng nhập Google (Handle Google Sign-In):**
    - **Mô tả:** Khởi tạo thư viện Google Sign-In, render nút đăng nhập, và xử lý callback khi người dùng đăng nhập thành công qua Google.
    - **File:** `js/login/login-page.js`.
    - **Logic:** Sử dụng `GOOGLE_CLIENT_ID` từ `config.js` để khởi tạo. Gọi `handleGoogleCredentialResponse` khi có callback.
    ```javascript
    // Snippet from js/login/login-page.js (inside window.onload)
    try {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse // Function to call on success
      });
      google.accounts.id.renderButton(
        googleSignInButtonDiv, // Target element
        { theme: "outline", size: "large", /* ... other options */ }
      );
    } catch (error) {
      console.error("Error initializing Google Sign-In:", error);
      // Display error to user
    }
    ```

- **Xác thực Google ID Token với Backend (Verify Google Token):**
    - **Mô tả:** Gửi `idToken` nhận được từ Google Sign-In về backend để xác thực.
    - **File:** `js/login/login.js` (hàm `handleGoogleVerifyToken`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint:** `POST /api/auth/google/verify` (Xem `api.md`).
    ```javascript
    // Snippet from js/login/login.js (handleGoogleVerifyToken)
    async function handleGoogleVerifyToken(idToken) {
        const apiUrl = AUTH_GOOGLE_VERIFY_ENDPOINT;
        const requestBody = { idToken: idToken };
        try {
            const responseData = await fetchWithAuth(apiUrl, {
                method: 'POST',
                body: requestBody,
            });
            // Check response, store data in localStorage on success
            if (/* validation passes */) {
                 localStorage.setItem(USER_DATA_KEY, JSON.stringify(responseData));
                 return { success: true };
            } else {
                 return { success: false, message: /* error message */ };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    ```

- **Lưu/Truy xuất Thông tin Người dùng (Store/Retrieve User Info):**
    - **Mô tả:** Lưu thông tin người dùng (nhận được sau khi xác thực thành công) vào `localStorage` và cung cấp hàm để truy xuất thông tin này.
    - **File:** `js/auth.js` (hàm `getUserInfo`), `js/login/login.js`.
    - **Logic:** Sử dụng `localStorage` với key `hub_user_data`.
    ```javascript
    // Snippet from js/auth.js
    export function getUserInfo() {
        try {
            const storedData = localStorage.getItem(USER_DATA_KEY);
            if (storedData) {
                const userData = JSON.parse(storedData);
                // Basic validation
                if (userData && userData.data && /* ... */ userData.data.token) {
                    return userData;
                } else {
                    localStorage.removeItem(USER_DATA_KEY);
                    return null;
                }
            } // ...
        } catch (error) {
            // ... handle error, remove item
            return null;
        }
    }
    ```

- **Kiểm tra Trạng thái Đăng nhập (Check Authentication Status):**
    - **Mô tả:** Kiểm tra xem người dùng hiện tại có được coi là đã đăng nhập hay không (dựa trên thông tin trong `localStorage`).
    - **File:** `js/auth.js` (hàm `checkAuthentication`).
    ```javascript
    // Snippet from js/auth.js
    export function checkAuthentication() {
        const userInfo = getUserInfo();
        if (!userInfo || !userInfo.data?.token) {
            return false;
        }
        return true;
    }
    ```

- **Hiển thị Thông tin Người dùng (Display User Info):**
    - **Mô tả:** Hiển thị tên người dùng trên giao diện.
    - **File:** `js/auth.js` (hàm `displayUserInfo`).

- **Đăng xuất (Logout):**
    - **Mô tả:** Xóa thông tin người dùng khỏi `localStorage` và chuyển hướng về trang đăng nhập.
    - **File:** `js/auth.js` (hàm `handleUserLogout`).
    ```javascript
    // Snippet from js/auth.js
    export function handleUserLogout() {
        try {
            localStorage.removeItem(USER_DATA_KEY);
            showNotification('Đăng xuất thành công', 'success');
            setTimeout(() => {
                window.location.href = '/'; // Redirect to login
            }, 1000);
        } catch (error) {
            // ... handle error
        }
    }
    ```

## 2. Quản lý Phiên Chat (Session Management)

- **Tải Lịch sử Phiên Chat (Load Sessions):**
    - **Mô tả:** Gọi API để lấy danh sách các phiên chat của người dùng hiện tại và hiển thị chúng trên sidebar lịch sử.
    - **File:** `js/chat/session.js` (hàm `loadChatSessions`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint:** `GET /api/ChatSessions/user/{userId}` (Xem `api.md`).
    ```javascript
    // Snippet from js/chat/session.js (loadChatSessions)
    export async function loadChatSessions(domElements) {
        // ... get userId ...
        const userSessionsApiUrl = `${SESSIONS_API_ENDPOINT}/user/${userId}`;
        try {
            const data = await fetchWithAuth(userSessionsApiUrl);
            if (!data || data.length === 0) {
                // Handle no sessions: Start a new chat
                await startNewChat(domElements);
                return true;
            }
            chatSessions = data.map(item => ({ /* ... map API data to client structure ... */ }))
                           .sort(/* by lastUpdatedAt desc */);
            currentSessionId = chatSessions[0].id;
            // ... (main.js will call loadSessionMessages)
            return true;
        } catch (error) {
            // ... handle error ...
            return false;
        }
    }
    ```

- **Bắt đầu Phiên Chat Mới (Start New Chat):**
    - **Mô tả:** Gửi yêu cầu tạo phiên chat mới đến backend, cập nhật trạng thái và giao diện người dùng.
    - **File:** `js/chat/session.js` (hàm `startNewChat`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint:** `POST /api/ChatSessions` (Xem `api.md`).
    ```javascript
    // Snippet from js/chat/session.js (startNewChat)
    export async function startNewChat(domElements) {
        // ... get userId ...
        const requestBody = { userId: userId, title: "Cuộc trò chuyện mới" };
        try {
            const newSessionData = await fetchWithAuth(SESSIONS_API_ENDPOINT, {
                method: 'POST',
                body: requestBody
            });
            // Validate newSessionData.id
            const newSession = { /* ... create client-side session object ... */ };
            chatSessions.unshift(newSession);
            currentSessionId = newSession.id;
            updateHistorySidebar(...);
            loadSessionUI(newSession, null, domElements); // Clear chat area, etc.
            return { success: true, needsInitialMessage: true };
        } catch (error) {
            // ... handle error ...
            return { success: false };
        }
    }
    ```

- **Chọn Phiên Chat (Select Session):**
    - **Mô tả:** Xử lý khi người dùng chọn một phiên chat từ sidebar lịch sử. Tải và hiển thị các tin nhắn của phiên đó.
    - **File:** `js/chat/session.js` (hàm `handleSelectSession`).
    - **Logic:** Gọi `loadSessionMessages`.
    ```javascript
    // Snippet from js/chat/session.js (handleSelectSession)
    export async function handleSelectSession(sessionId, ...) {
        if (sessionId && sessionId !== currentSessionId) {
            // Remove old scroll listener if exists
            // ...
            await loadSessionMessages(sessionId, ...);
        }
    }
    ```

- **Xóa Phiên Chat (Delete Session):**
    - **Mô tả:** Gửi yêu cầu xóa một phiên chat đến backend và cập nhật giao diện.
    - **File:** `js/chat/session.js` (hàm `deleteSession`, gọi từ `handleDeleteRequest`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint:** `DELETE /api/ChatSessions/{sessionId}` (Xem `api.md`).
    ```javascript
    // Snippet from js/chat/session.js (deleteSession, called by handleDeleteRequest)
    async function deleteSession(sessionId, ...) {
        const apiUrl = `${SESSIONS_API_ENDPOINT}/${sessionId}`;
        try {
            await fetchWithAuth(apiUrl, { method: 'DELETE' }, false);
            // Remove session from chatSessions array
            const deletedIndex = chatSessions.findIndex(s => s.id === sessionId);
            if(deletedIndex > -1) chatSessions.splice(deletedIndex, 1);
            // Handle UI update: select next session or start new
            if (currentSessionId === sessionId) {
                if (chatSessions.length > 0) {
                    const newCurrentId = chatSessions[0].id;
                    await loadSessionMessages(newCurrentId, ...);
                } else {
                    await startNewChat(...);
                }
            } else {
                updateHistorySidebar(...);
            }
        } catch (error) {
            // ... handle error ...
        }
    }
    ```

- **Cập nhật Tiêu đề Phiên (Update Session Title):**
    - **Mô tả:** Tự động cập nhật tiêu đề của phiên chat phía client dựa trên tin nhắn đầu tiên của người dùng.
    - **File:** `js/chat/session.js` (hàm `updateCurrentSessionTitle`, gọi từ `addMessageToCurrentSession`).
    - *Lưu ý: Việc cập nhật title lên backend chưa được triển khai rõ ràng trong code đã phân tích.*
    ```javascript
    // Snippet from js/chat/session.js (updateCurrentSessionTitle)
    export async function updateCurrentSessionTitle(newTitle, domElements) {
        const session = getCurrentSession();
        if (!session) return;
        // Update client-side state
        session.title = newTitle;
        session.lastUpdatedAt = new Date().toISOString();
        // Update UI (Sidebar)
        updateHistorySidebar(...);
        // TODO: Add API call to persist title change to backend if needed
    }
    ```

## 3. Gửi/Nhận Tin Nhắn (Messaging)

- **Tải Tin nhắn của Phiên (Load Messages):**
    - **Mô tả:** Lấy danh sách các tin nhắn thuộc về một phiên chat cụ thể từ backend.
    - **File:** `js/chat/session.js` (hàm `loadSessionMessages`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint:** `GET /api/ChatMessages/session/{sessionId}` (hoặc `/recent`) (Xem `api.md`).
    ```javascript
    // Snippet from js/chat/session.js (loadSessionMessages)
    export async function loadSessionMessages(sessionId, ...) {
        const targetSession = chatSessions.find(s => s.id === sessionId);
        if (!targetSession) return false;
        // Reset session message state for loading
        targetSession.messages = [];
        // ... reset scroll flags ...
        currentSessionId = sessionId;
        updateHistorySidebar(...);
        // API Call (using /recent in current code)
        const messagesApiUrl = `${CHAT_MESSAGE_API_ENDPOINT}/session/${sessionId}/recent?count=...`;
        try {
            const initialMessages = await fetchWithAuth(messagesApiUrl);
            // Validate and map messages
            const mappedMessages = initialMessages.map(apiMsg => ({ /* ... */ }))
                                         .sort(/* by timestamp asc */);
            if (mappedMessages.length === 0) {
                // Handle empty session, maybe show welcome message?
                window.showWelcomeScreen(); // Example
                targetSession.hasMoreOlder = false;
                return true; // Indicates empty, needs welcome
            } else {
                // Render messages
                window.hideWelcomeScreen(); // Hide welcome
                chatContainerElement.innerHTML = ''; // Clear loading/previous
                mappedMessages.forEach(msg => addMessageToChat(msg, ...));
                // Update session state
                targetSession.messages = mappedMessages;
                targetSession.oldestMessageId = mappedMessages[0]?.id || null;
                targetSession.hasMoreOlder = mappedMessages.length >= initialMessagesCount; // Basic check
                // Setup infinite scroll listener
                setupScrollListener(targetSession, chatContainerElement);
                return false; // Indicates messages were loaded
            }
        } catch (error) {
            // ... handle error ...
            return false;
        }
    }
    ```

- **Tải Tin nhắn Cũ hơn (Infinite Scroll):**
    - **Mô tả:** Khi người dùng cuộn lên đầu khu vực chat, tải thêm các tin nhắn cũ hơn của phiên hiện tại.
    - **File:** `js/chat/session.js` (hàm `loadOlderMessages`, listener trong `loadSessionMessages`).
    - **API Endpoint:** `GET /api/ChatMessages/session/{sessionId}?beforeMessageId=...` (Lưu ý: Code hiện tại dùng endpoint `/recent` sai). (Xem `api.md`).
    ```javascript
    // Snippet from js/chat/session.js (loadOlderMessages)
    async function loadOlderMessages(sessionId, chatContainerElement) {
        const targetSession = chatSessions.find(s => s.id === sessionId);
        if (!targetSession || targetSession.isLoadingOlder || !targetSession.hasMoreOlder || !targetSession.oldestMessageId) {
            return; // Exit if not needed or already loading
        }
        targetSession.isLoadingOlder = true;
        // Display loading indicator
        // ...
        // --- IMPORTANT: API Endpoint used here is currently INCORRECT --- 
        // Correct would be: `${CHAT_MESSAGE_API_ENDPOINT}/session/${sessionId}/before/${targetSession.oldestMessageId}?count=...`
        const olderMessagesApiUrl = `${CHAT_MESSAGE_API_ENDPOINT}/session/${sessionId}/recent?count=...`; // Current incorrect usage
        try {
            const olderMessages = await fetchWithAuth(olderMessagesApiUrl);
            if (olderMessages.length === 0) {
                targetSession.hasMoreOlder = false;
            } else {
                // Filter, map, sort older messages
                const newlyFetchedMessages = olderMessages.map(...).filter(...).sort(...);
                if (newlyFetchedMessages.length === 0) {
                     targetSession.hasMoreOlder = false;
                } else {
                    // Prepend messages to UI and state
                    targetSession.messages.unshift(...newlyFetchedMessages);
                    // --- Correct logic: update oldestMessageId --- 
                    // targetSession.oldestMessageId = newlyFetchedMessages[0].id;
                    // Render messages at the top, maintain scroll position
                    // ... render logic ...
                    // --- Temporary logic: Stop loading due to incorrect API --- 
                    targetSession.hasMoreOlder = false; 
                }
            }
        } catch (error) {
            // ... handle error ...
            targetSession.hasMoreOlder = false;
        } finally {
            // Remove loading indicator
            targetSession.isLoadingOlder = false;
        }
    }
    ```

- **Gửi Tin nhắn Người dùng (Send User Message):**
    - **Mô tả:** Hiển thị tin nhắn của người dùng trên UI, lưu tin nhắn đó vào backend, và sau đó kích hoạt yêu cầu đến AI.
    - **File:** `js/chat/chat.js` (hàm `handleSendMessage`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint (Lưu tin nhắn):** `POST /api/ChatMessages` (Xem `api.md`).
    ```javascript
    // Snippet from js/chat/chat.js (handleSendMessage)
    export async function handleSendMessage(domElements) {
        const messageToSend = messageInput.value.trim();
        if (!messageToSend) return;
        // ... Get userId, sessionId, etc. ...
        // 1. Save user message to backend
        const userPayload = { sessionId, userId, isUser: true, content: messageToSend };
        fetchWithAuth(SAVE_MESSAGE_ENDPOINT, { method: 'POST', body: userPayload }, false)
            .catch(err => console.error('Failed to save user message:', err));
        // 2. Add user message to UI
        addMessageToChat(messageToSend, chatContainer, true, ...);
        // 3. Add user message to session state
        addMessageToCurrentSession({ content: messageToSend, isUser: true, ... }, domElements);
        // 4. Clear input
        messageInput.value = '';
        // 5. Trigger AI request
        requestAiResponse(messageToSend, domElements);
    }
    ```

- **Yêu cầu Phản hồi từ AI (Request AI Response):**
    - **Mô tả:** Gửi tin nhắn của người dùng đến Dify API để nhận phản hồi.
    - **File:** `js/chat/chat.js` (hàm `handleSendMessage` gọi `handleSseStream`) -> `js/chat/api.js` (hàm `handleSseStream`).
    - **API Endpoint (Dify):** `POST https://trolyai.hub.edu.vn/v1/chat-messages` (Xem `api.md`, `config.md`).
    ```javascript
    // Snippet from js/chat/chat.js (requestAiResponse called from handleSendMessage)
    async function requestAiResponse(userMessage, domElements) {
        // ... get userId, sessionId, conversationId, difyApiKey ...
        // Add AI placeholder to UI
        const aiPlaceholderElement = addMessageToChat(null, chatContainer, false, ..., true);
        // Prepare Dify request body
        const difyRequestBody = { inputs: {}, query: userMessage, response_mode: 'streaming', user: String(userId), conversation_id: latestConversationId };
        // Call SSE handler
        try {
            await handleSseStream(
                DIFY_CHAT_API_ENDPOINT,
                difyRequestBody,
                difyApiKey,
                aiPlaceholderElement, // Element to update
                chatContainer,      // Container for scrolling
                handleAiResponseComplete, // Callback on success
                handleAiResponseError     // Callback on error
            );
        } catch (error) {
            // Handle error if handleSseStream itself throws
            handleAiResponseError(error, aiPlaceholderElement);
        }
    }
    ```

- **Xử lý Phản hồi Streaming (Handle SSE):**
    - **Mô tả:** Nhận và xử lý dữ liệu Server-Sent Events (SSE) từ Dify, cập nhật giao diện người dùng một cách liên tục (incremental updates) khi AI đang "gõ".
    - **File:** `js/chat/api.js` (hàm `handleSseStream`).
    ```javascript
    // Snippet from js/chat/api.js (handleSseStream)
    export async function handleSseStream(apiUrl, requestBody, token, targetContentElement, chatContainerElement, onComplete, onError) {
        let fullMessage = '';
        // ... (other variables)
        try {
            const response = await fetch(apiUrl, { /* ... SSE headers ... */ });
            // ... check response.ok ...
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                // Process chunk, find 'data:' events
                // ... parse JSON ...
                const textPart = parsedData.chunk || parsedData.answer || parsedData.text || '';
                if (textPart) {
                    fullMessage += textPart;
                    if (targetContentElement) {
                        targetContentElement.innerHTML = renderMarkdown(fullMessage);
                        highlightCodeBlocks(targetContentElement);
                        // Scroll chat container
                        // ...
                    }
                }
                // ... update conversationId, messageId ...
            }
            // ... handle final buffer ...
            // Remove ellipsis
            // ...
            if (onComplete) onComplete({ fullMessage, conversationId, messageId });
            resolve({ fullMessage, conversationId, messageId });
        } catch (error) {
            // Handle error, update placeholder with error message
            // ...
            if (onError) onError(error);
            reject(error);
        }
    }
    ```

- **Lưu Tin nhắn AI (Save AI Message):**
    - **Mô tả:** Sau khi nhận được toàn bộ phản hồi từ AI (kết thúc streaming), lưu tin nhắn đó vào backend.
    - **File:** `js/chat/chat.js` (callback `handleAiResponseComplete` trong `handleSendMessage`) -> `js/chat/api.js` (hàm `fetchWithAuth`).
    - **API Endpoint (Lưu tin nhắn):** `POST /api/ChatMessages` (Xem `api.md`).
    ```javascript
    // Snippet from js/chat/chat.js (handleAiResponseComplete callback)
    function handleAiResponseComplete(result) {
        const aiMessageContent = result.fullMessage?.trim();
        if (aiMessageContent) {
            // 1. Save AI message to backend
            const aiPayload = { sessionId, userId, isUser: false, content: aiMessageContent };
            fetchWithAuth(SAVE_MESSAGE_ENDPOINT, { method: 'POST', body: aiPayload }, false)
                .catch(err => console.error('Failed to save AI message:', err));
            // 2. Add AI message to session state
            const aiMessageData = { id: result.messageId, content: aiMessageContent, isUser: false, ... };
            addMessageToCurrentSession(aiMessageData, domElements);
        } else {
            // Handle empty AI response (e.g., update placeholder)
            // ...
        }
        // Update conversationId if changed
        // ...
    }
    ```

- **Hiển thị Tin nhắn trên UI (Display Messages):**
    - **Mô tả:** Render các tin nhắn (của người dùng và AI) thành các phần tử HTML và thêm vào khu vực chat. Hỗ trợ định dạng Markdown và highlight code.
    - **File:** `js/chat/ui.js` (hàm `addMessageToChat`), `js/chat/utils.js` (hàm `renderMessageElement`, `renderMarkdown`, `highlightCodeBlocks`).
    ```javascript
    // Snippet from js/chat/ui.js (addMessageToChat)
    export function addMessageToChat(message, chatContainerElement, isUser, ..., isStreaming) {
        // Create message data object
        const msgData = { content: message || '', isUser, isStreaming, ... };
        // Create DOM element using renderMessageElement
        const messageElement = renderMessageElement(msgData);
        if (!messageElement) return null;
        // Append to chat container
        chatContainerElement.appendChild(messageElement);
        // Scroll to bottom
        // ...
        // Highlight code if it's a complete bot message
        if (!isUser && !isStreaming && message) {
            highlightCodeBlocks(messageElement);
        }
        // Return the inner content element for streaming updates
        if (isStreaming && !isUser) {
            return messageElement.querySelector('.markdown-content');
        }
        return null;
    }

    // Snippet from js/chat/utils.js (renderMessageElement)
    export function renderMessageElement(msg) {
        // Create message row, avatar, content block, bubble
        // ...
        if (msg.isUser) {
            // Style for user message (right align, primary color)
        } else {
            // Style for AI message (left align, gray color)
            // Add sender name
        }
        // Render content
        if (msg.isStreaming) {
            // Add ellipsis animation and empty markdown div
            // ...
        } else {
            // Render using renderMarkdown for AI, simple text for user
            // ...
        }
        // Add timestamp
        // ...
        return messageContainer;
    }
    ```

## 4. Tương tác Giao diện (UI Interactions)

- **Xử lý Màn hình Chào mừng (Handle Welcome Screen):**
    - **Mô tả:** Hiển thị màn hình chào mừng ban đầu và xử lý khi người dùng nhấn nút "Bắt đầu trò chuyện".
    - **File:** `js/welcome-screen.js` (EventListener), `js/chat/ui.js` (hàm `showWelcomeScreen`, `hideWelcomeScreen`).
    ```javascript
    // Snippet from js/welcome-screen.js
    startChatButton.addEventListener('click', async function() {
        // Hide welcome message
        hideWelcomeScreen(welcomeDivRef, messagesDivRef);
        // Trigger sending initial message
        // ... prepare domElements ...
        messageInputRef.value = "Bắt đầu cuộc trò chuyện";
        try {
            const chatModule = await import('./chat/chat.js');
            await chatModule.handleSendMessage(domElementsForSend);
        } catch (error) { /* ... handle error ... */ }
        messageInputRef.value = '';
    });

    // Snippet from js/chat/ui.js
    export function showWelcomeScreen(onStartChat, welcomeElement, chatContainer, chatMessagesElement) {
        // ... (Ensure elements exist) ...
        welcomeElement.style.display = 'flex';
        if (chatMessagesElement) chatMessagesElement.classList.add('hidden');
        // Clear chat container content and ensure welcome is visible
        // ...
        // Set up start button listener
        startChatButton.addEventListener('click', (e) => {
             e.preventDefault();
             if (typeof onStartChat === 'function') onStartChat();
        });
    }

    export function hideWelcomeScreen(welcomeElement, chatMessagesElement) {
        if (welcomeElement) welcomeElement.classList.add('hidden');
        if (chatMessagesElement) chatMessagesElement.classList.remove('hidden');
    }
    ```

- **Quản lý Sidebar Lịch sử (Mobile/Desktop):**
    - **Mô tả:** Điều khiển việc hiển thị/ẩn sidebar lịch sử trên các kích thước màn hình khác nhau, bao gồm cả lớp phủ (overlay) trên mobile.
    - **File:** `js/ui-interactions.js`.
    ```javascript
    // Snippet from js/ui-interactions.js
    const openHistorySidebar = () => {
        if (window.innerWidth < 768) {
            chatHistorySidebar.classList.remove('hidden');
            // Animate sidebar in and show overlay
            // ... (using requestAnimationFrame and classes)
            toggleBodyScroll(true);
        }
    };
    const closeHistorySidebarHandler = () => {
        // Animate overlay and sidebar out
        // ... (using classes and setTimeout)
        toggleBodyScroll(false);
    };
    historyBubbleButton.addEventListener('click', openHistorySidebar);
    // Add listener for header button if exists
    closeHistorySidebar.addEventListener('click', closeHistorySidebarHandler);
    mobileHistoryOverlay.addEventListener('click', closeHistorySidebarHandler);
    // Add resize listener to handle view changes
    // ...
    ```

- **Hiệu ứng Nút (Ripple Effect):**
    - **Mô tả:** Thêm hiệu ứng gợn sóng khi người dùng nhấp vào các nút chính.
    - **File:** `js/ui-interactions.js`.
    ```javascript
    // Snippet from js/ui-interactions.js
    rippleButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // ... (Get click coordinates relative to button)
            const ripple = document.createElement('span');
            ripple.classList.add('ripple-effect');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            button.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
    ```

## 5. Nhận dạng Giọng nói (Speech Recognition)

- **Khởi tạo (Initialize):**
    - **Mô tả:** Kiểm tra khả năng tương thích của trình duyệt và thiết lập đối tượng `SpeechRecognition`.
    - **File:** `js/speech.js` (hàm `initSpeechRecognition`).
    ```javascript
    // Snippet from js/speech.js
    export function initSpeechRecognition(messageInputElement, recordButtonElement) {
        if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            // Disable button, show error
            return;
        }
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'vi-VN';
        recognition.interimResults = true;
        // ... set up onstart, onresult, onerror, onend handlers ...
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results).map(result => result[0].transcript).join('');
            if (messageInputElement) messageInputElement.value = transcript;
            // ... (visual feedback)
        };
        recognition.onend = () => {
            // ... (clear timeout, update UI)
        };
        // ... other handlers
    }
    ```

- **Bắt đầu/Dừng Ghi âm (Toggle Recording):**
    - **Mô tả:** Xử lý khi người dùng nhấn nút ghi âm để bắt đầu hoặc dừng quá trình nhận dạng giọng nói. Cập nhật UI tương ứng.
    - **File:** `js/speech.js` (hàm `toggleRecording`, `startRecording`, `stopRecording`), `js/chat/ui.js` (hàm `updateRecordingUI`).
    ```javascript
    // Snippet from js/speech.js
    export function toggleRecording() {
        if (!recognition) return;
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }
    function startRecording() {
        if (recognition && !isRecording) recognition.start();
    }
    function stopRecording(recordButtonElement) { // Pass element for error handling UI
        if (recognition && isRecording) recognition.stop();
    }

    // Snippet from js/chat/ui.js
    export function updateRecordingUI(isRecording, recordButtonElement) {
        if (!recordButtonElement) return;
        if (isRecording) {
            recordButtonElement.classList.add('recording', 'animate-pulse');
            recordButtonElement.innerHTML = /* SVG for stop icon */;
        } else {
            recordButtonElement.classList.remove('recording', 'animate-pulse');
            recordButtonElement.innerHTML = /* SVG for mic icon */;
        }
    }
    ```

- **Xử lý Kết quả (Process Results):**
    - **Mô tả:** Nhận dạng văn bản từ giọng nói (cả kết quả tạm thời và cuối cùng) và điền vào ô nhập tin nhắn.
    - **File:** `js/speech.js` (listener `onresult`).
    ```javascript
    // Snippet from js/speech.js (inside initSpeechRecognition)
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        // Update input field with combined transcript
        if (messageInputElement) {
            messageInputElement.value = finalTranscript + interimTranscript;
        }
        // Maybe provide visual feedback based on isFinal
        if (event.results[0].isFinal) {
           // ... (final feedback)
        } else {
           // ... (interim feedback)
        }
    };
    ``` 