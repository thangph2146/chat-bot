import { renderMarkdown, highlightCodeBlocks } from './utils.js';
import { getUserInfo } from './auth.js'; // Import để lấy token
import { showNotification } from './ui.js'; // Để hiển thị lỗi

// Dependency (Placeholder - Removed, now passed via arguments)
/*
const chatContainer = document.getElementById('chatContainer'); // Needed for scrolling
*/

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
            const errorData = await response.json();
            const messageContainer = document.createElement('div');
            messageContainer.className = 'error-message p-3 rounded-lg bg-red-50 border border-red-200';
            
            messageContainer.innerHTML = `
              <div class="flex items-center">
                <svg class="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
                </svg>
                <p class="text-red-800">${errorData.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.'}</p>
              </div>
              <button class="retry-button mt-2 px-3 py-1 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-md">
                Thử lại
              </button>
            `;
            
            targetContentElement.innerHTML = '';
            targetContentElement.appendChild(messageContainer);
            
            // Thêm sự kiện click cho nút "Thử lại"
            const retryButton = messageContainer.querySelector('.retry-button');
            if (retryButton) {
              retryButton.addEventListener('click', () => {
                // Gọi lại hàm xử lý chat
                handleUserMessage(lastUserMessage);
              });
            }
        }

        // Xử lý phản hồi thành công
        if (expectJson) {
            if (response.headers.get('content-length') === '0' || response.status === 204) {
                 return null; // Trả về null cho response rỗng
            }
            try {
                 const jsonData = await response.json();
                 return jsonData;
            } catch (jsonError) {
                console.error(`[api.js] fetchWithAuth: Error parsing JSON response for ${url}:`, jsonError);
                throw new Error('Invalid JSON response from server.');
            }
        } else {
            const textData = await response.text();
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
 * @param {HTMLElement | null} targetContentElement The HTML element whose innerHTML will be updated.
 * @param {HTMLElement | null} chatContainerElement The chat container element for scrolling.
 * @param {Function} [onComplete] Optional callback upon successful completion. Receives { fullMessage, conversationId, messageId }.
 * @param {Function} [onError] Optional callback on error. Receives the error object.
 * @returns {Promise<{ fullMessage: string, conversationId: string | null, messageId: string | null }>} Resolves with final data or rejects on error.
 */
export async function handleSseStream(apiUrl, requestBody, token, targetContentElement, chatContainerElement, onComplete, onError) {
    let fullMessage = '';
    let latestConversationId = requestBody.conversation_id || null;
    let messageId = null;
    const messageWrapper = targetContentElement?.closest('.message-content');
    const ellipsis = messageWrapper?.querySelector('.ellipsis-animation');

    return new Promise(async (resolve, reject) => {
        try {
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
                                    // Use passed chatContainerElement for scrolling
                                    if (chatContainerElement && chatContainerElement.scrollHeight > chatContainerElement.clientHeight) {
                                        chatContainerElement.scrollTop = chatContainerElement.scrollHeight;
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

            // Process remaining buffer content (if any)
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
                           // Scroll one last time
                            if (chatContainerElement && chatContainerElement.scrollHeight > chatContainerElement.clientHeight) {
                                chatContainerElement.scrollTop = chatContainerElement.scrollHeight;
                            }
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