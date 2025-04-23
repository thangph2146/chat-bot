import { renderMarkdown, highlightCodeBlocks } from './utils.js';
import { getUserInfo } from './auth.js'; // Import để lấy token
import { showNotification } from './ui.js'; // Để hiển thị lỗi

// Dependency (Placeholder - should be managed better)
const chatContainer = document.getElementById('chatContainer'); // Needed for scrolling

/**
 * Hàm tiện ích để thực hiện fetch request với Authorization header.
 * Tự động lấy token từ auth.js.
 * Xử lý các lỗi mạng và HTTP cơ bản, trả về JSON hoặc text.
 * Tự động xử lý 401 Unauthorized bằng cách đăng xuất.
 *
 * @param {string} url URL của API endpoint.
 * @param {object} [options={}] Các tùy chọn cho fetch (method, body, headers...).
 * @param {boolean} [expectJson=true] True nếu mong đợi phản hồi JSON, False nếu mong đợi text.
 * @returns {Promise<any>} Promise giải quyết với dữ liệu JSON/text hoặc reject với Error.
 */
export async function fetchWithAuth(url, options = {}, expectJson = true) {
    const userInfo = getUserInfo();
    const token = userInfo?.data?.token;

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': expectJson ? 'application/json' : 'text/plain', // Điều chỉnh Accept header
        ...(token && { 'Authorization': `Bearer ${token}` }) // Thêm token nếu có
    };

    // Merge headers, ưu tiên headers được truyền vào
    const requestOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers // Headers trong options sẽ ghi đè defaultHeaders
        }
    };

    // Đảm bảo body là JSON string nếu là object và Content-Type là json
    if (requestOptions.body && typeof requestOptions.body === 'object' && requestOptions.headers['Content-Type'] === 'application/json') {
        requestOptions.body = JSON.stringify(requestOptions.body);
    }

    console.log(`[api.js] fetchWithAuth: ${requestOptions.method || 'GET'} ${url}`, requestOptions);

    try {
        const response = await fetch(url, requestOptions);

        // Kiểm tra lỗi 401 Unauthorized -> Đăng xuất
        if (response.status === 401) {
            console.error('[api.js] fetchWithAuth: Received 401 Unauthorized. Logging out.');
            showNotification('Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.', 'error', 5000);
            // Gọi hàm đăng xuất từ auth.js (cần import hoặc xử lý ở đây)
            // Giả sử có hàm handleLogout() toàn cục hoặc import được
            // handleUserLogout(); // <- Cần cơ chế gọi hàm này một cách an toàn
            localStorage.removeItem('hub_user_data'); // Tạm thời xóa trực tiếp
            window.location.href = '/'; // Redirect về trang login
            throw new Error('Unauthorized (401)'); // Ném lỗi để dừng xử lý tiếp theo
        }

        // Các lỗi HTTP khác
        if (!response.ok) {
            let errorBody = '';
            try {
                errorBody = await response.text(); // Lấy text lỗi để dễ debug
            } catch (e) { /* ignore read error */ }
            console.error(`[api.js] fetchWithAuth: HTTP error ${response.status} for ${url}. Body:`, errorBody);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody || response.statusText}`);
        }

        // Xử lý phản hồi thành công
        if (expectJson) {
            if (response.headers.get('content-length') === '0' || response.status === 204) {
                 console.log(`[api.js] fetchWithAuth: Received empty JSON response (status ${response.status}) for ${url}.`);
                 return null; // Trả về null cho response rỗng
            }
            try {
                 const jsonData = await response.json();
                 console.log(`[api.js] fetchWithAuth: Success (JSON) for ${url}`, jsonData);
                 return jsonData;
            } catch (jsonError) {
                console.error(`[api.js] fetchWithAuth: Error parsing JSON response for ${url}:`, jsonError);
                throw new Error('Invalid JSON response from server.');
            }
        } else {
            const textData = await response.text();
            console.log(`[api.js] fetchWithAuth: Success (Text) for ${url}`, textData);
            return textData;
        }

    } catch (error) {
        // Bắt các lỗi mạng hoặc lỗi đã ném ở trên
        console.error(`[api.js] fetchWithAuth: Fetch failed for ${url}:`, error);
        // Ném lại lỗi để hàm gọi có thể xử lý
        throw error;
    }
}

/**
 * Handles Fetch requests with Server-Sent Events (SSE).
 * Updates a target element incrementally with Markdown rendering.
 *
 * @param {string} apiUrl The API endpoint URL.
 * @param {object} requestBody The body of the POST request.
 * @param {string} token The authorization Bearer token.
 * @param {HTMLElement} targetContentElement The HTML element whose innerHTML will be updated.
 * @param {Function} [onComplete] Optional callback upon successful completion. Receives { fullMessage, conversationId, messageId }.
 * @param {Function} [onError] Optional callback on error. Receives the error object.
 * @returns {Promise<{ fullMessage: string, conversationId: string | null, messageId: string | null }>} Resolves with final data or rejects on error.
 */
export async function handleSseStream(apiUrl, requestBody, token, targetContentElement, onComplete, onError) {
    let fullMessage = '';
    let latestConversationId = requestBody.conversation_id || null;
    let messageId = null;
    const messageWrapper = targetContentElement?.closest('.message-content');
    const ellipsis = messageWrapper?.querySelector('.ellipsis-animation');

    return new Promise(async (resolve, reject) => {
        try {
            console.log(`Sending SSE request to ${apiUrl}`, requestBody);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    console.log('SSE Stream finished.');
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                let boundary = buffer.indexOf('\n\n');

                while (boundary !== -1) {
                    const eventString = buffer.substring(0, boundary).trim();
                    buffer = buffer.substring(boundary + 2);

                    if (eventString.startsWith('data:')) {
                        const jsonData = eventString.substring(5).trim();
                        try {
                            const parsedData = JSON.parse(jsonData);
                            // Adapt based on actual API response structure
                            const chunkText = parsedData.chunk || parsedData.answer || parsedData.text || '';
                            const currentConvId = parsedData.conversation_id;
                            const currentMessageId = parsedData.message_id;

                            if (chunkText) {
                                fullMessage += chunkText;
                                if (targetContentElement) {
                                    targetContentElement.innerHTML = renderMarkdown(fullMessage);
                                    highlightCodeBlocks(targetContentElement); // Highlight incrementally
                                    if (chatContainer) {
                                        chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll down
                                    }
                                }
                            }

                            if (currentConvId) latestConversationId = currentConvId;
                            if (currentMessageId) messageId = currentMessageId;

                        } catch (e) {
                            console.error('Error parsing SSE JSON:', e, 'Data:', jsonData);
                        }
                    }
                    boundary = buffer.indexOf('\n\n');
                }
            }

            // Process remaining buffer content
            if (buffer.trim().startsWith('data:')){
               const jsonData = buffer.trim().substring(5).trim();
                try {
                   const parsedData = JSON.parse(jsonData);
                   const chunkText = parsedData.chunk || parsedData.answer || parsedData.text || '';
                   const currentConvId = parsedData.conversation_id;
                   const currentMessageId = parsedData.message_id;
                   if (chunkText) {
                       fullMessage += chunkText;
                       if (targetContentElement) {
                           targetContentElement.innerHTML = renderMarkdown(fullMessage);
                           highlightCodeBlocks(targetContentElement);
                       }
                   }
                    if (currentConvId) latestConversationId = currentConvId;
                    if (currentMessageId) messageId = currentMessageId;
               } catch (e) {
                   console.error('Error parsing final SSE JSON:', e, 'Data:', jsonData);
               }
           }

            if (ellipsis) ellipsis.remove();

            if (!fullMessage.trim() && targetContentElement) {
                targetContentElement.innerHTML = renderMarkdown("_(Không có nội dung phản hồi)_");
            }

            if (onComplete) {
                onComplete({ fullMessage, conversationId: latestConversationId, messageId });
            }

            resolve({ fullMessage, conversationId: latestConversationId, messageId });

        } catch (error) {
            console.error('Error in handleSseStream:', error);
            if (targetContentElement) {
                const errorWrapper = targetContentElement.closest('.message-content') || targetContentElement;
                errorWrapper.innerHTML = `<div class="markdown-content text-red-600">Xin lỗi, đã xảy ra lỗi: ${error.message}</div>`;
                if (ellipsis) ellipsis.remove();
            }

            if (onError) {
                onError(error);
            }
            reject(error);
        }
    });
}

// TODO: Add other API call functions here (e.g., fetchSessions, createSession, deleteSession)
// Example:
// export async function fetchChatSessions(apiUrl, token) { ... } 