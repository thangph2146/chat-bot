import { formatTime, renderMarkdown, highlightCodeBlocks, renderMessageElement } from './utils.js';

// --- DOM Element References ---
// Elements are now passed as arguments to functions that need them.
// Remove direct DOM lookups here.
/*
const chatContainer = document.getElementById('chatContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const historySessions = document.getElementById('historySessions');
const recordButton = document.getElementById('recordButton');
const welcomeMessageElement = document.getElementById('welcomeMessage');
*/

// --- State (Placeholder - should be managed elsewhere) ---
// Remove state management from UI module
/*
let currentSessionId = null; // Example: Will be set by session logic
let chatSessions = []; // Example: Will be populated by session logic
*/

// Dependencies to be injected/resolved later:
// ... (Keep comments if needed)

// --- UI Update Functions ---

/**
 * Cập nhật giao diện nút ghi âm.
 * @param {boolean} isRecording - Trạng thái đang ghi âm.
 * @param {HTMLElement | null} recordButtonElement - Tham chiếu đến nút ghi âm.
 */
export function updateRecordingUI(isRecording, recordButtonElement) {
    if (!recordButtonElement) {
         console.warn('[ui.js] updateRecordingUI: recordButtonElement not provided.');
         return;
    }
    if (isRecording) {
        recordButtonElement.classList.add('recording', 'animate-pulse');
        recordButtonElement.title = 'Đang ghi âm... Nhấn để dừng';
        document.body.classList.add('recording-active');
    } else {
        recordButtonElement.classList.remove('recording', 'animate-pulse');
        recordButtonElement.title = 'Ghi âm giọng nói';
        document.body.classList.remove('recording-active');
    }
}

/**
 * Ẩn tin nhắn chào mừng tĩnh trong HTML.
 * @param {HTMLElement | null} welcomeElement - Tham chiếu đến div welcome message.
 */
export function hideStaticWelcomeMessage(welcomeElement) {
    if (welcomeElement) {
        welcomeElement.classList.add('hidden');
    }
}

/**
 * Hiển thị hoặc ẩn chỉ báo loading.
 * @param {boolean} show - True để hiển thị, false để ẩn.
 * @param {HTMLElement | null} loadingElement - Tham chiếu đến chỉ báo loading.
 */
export function showLoading(show, loadingElement) {
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Thêm tin nhắn vào giao diện chat.
 * @param {string | null} message - Nội dung tin nhắn. Null nếu là placeholder cho streaming.
 * @param {HTMLElement | null} chatContainerElement - Tham chiếu đến container chứa các tin nhắn.
 * @param {boolean} [isUser=false] - True nếu là tin nhắn của người dùng.
 * @param {boolean} [save=true] - (DEPRECATED/MOVED) Logic lưu đã chuyển đi.
 * @param {string | null} [customId=null] - ID tùy chỉnh cho phần tử tin nhắn.
 * @param {string | Date | null} [timestamp=null] - Thời gian của tin nhắn.
 * @param {boolean} [isStreaming=false] - True nếu đang streaming tin nhắn từ bot.
 * @returns {HTMLElement | null} Phần tử chứa nội dung tin nhắn (để cập nhật khi streaming) hoặc null.
 */
export function addMessageToChat(message, chatContainerElement, isUser = false, save = true, customId = null, timestamp = null, isStreaming = false) {
    if (!chatContainerElement) {
        console.error('[ui.js] addMessageToChat: chatContainerElement not provided!');
        return null;
    }

    // Create the message data object for renderMessageElement
    const msgData = {
        id: customId || `temp-${Date.now()}`, // Generate a temporary ID if none provided
        content: message || '', // Ensure content is at least an empty string
        isUser: isUser,
        timestamp: timestamp || new Date().toISOString(),
        // senderName will be handled by renderMessageElement based on isUser and potentially getUserInfo
        // Add isStreaming flag for renderMessageElement to handle placeholder
        isStreaming: isStreaming
    };

    // --- Create the message element using the utility function ---
    const messageElement = renderMessageElement(msgData);

    if (!messageElement) {
        console.error('[ui.js] renderMessageElement failed to create an element for:', msgData);
        return null;
    }

    // --- Append and scroll ---
    chatContainerElement.appendChild(messageElement);

    // Scroll to bottom
    setTimeout(() => {
         try {
             // Ensure scrolling happens after potential reflows
             requestAnimationFrame(() => {
                 if (chatContainerElement.scrollHeight > chatContainerElement.clientHeight) {
                     chatContainerElement.scrollTop = chatContainerElement.scrollHeight;
                 }
             });
         } catch(e) { console.error('[ui.js] Error scrolling chat:', e); }
    }, 0);

    // --- Highlight code blocks if it's a complete bot message ---
    if (!isUser && !isStreaming && message) {
        setTimeout(() => {
             try {
                 // Highlight only within the newly added message element for efficiency
                 highlightCodeBlocks(messageElement);
             } catch (e) {
                 console.error('[ui.js] Error highlighting code in new message:', e);
             }
        }, 50); // Delay slightly for rendering
    }

    // --- Return the correct element for streaming updates ---
    // Tìm bubble chứa nội dung
    const bubbleElement = messageElement.querySelector('.message-bubble');

    if (bubbleElement) {
        // Tìm container chứa text/markdown bên trong bubble
        const textContentElement = bubbleElement.querySelector('.message-text-content');

        if (textContentElement) {
            if (isStreaming && !isUser) {
                // Nếu là bot đang streaming, tìm div .markdown-content bên trong .message-text-content
                const markdownContentElement = textContentElement.querySelector('.markdown-content');
                if (markdownContentElement) {
                    return markdownContentElement;
                } else {
                    return textContentElement; // Fallback: trả về container text
                }
            } else {
                 // Nếu là tin nhắn user hoặc bot đã hoàn thành, trả về container text chính
                 // (Mặc dù việc cập nhật user message thường không cần thiết)
                 // return textContentElement;
                 // -> Quyết định: Trả về null vì handleSseStream chỉ cần phần tử cho streaming
                 return null;
            }
        }
    }

    return null; // Fallback an toàn
}

/**
 * Cập nhật sidebar lịch sử chat.
 * @param {Array} sessions - Mảng các đối tượng session.
 * @param {string | null} currentId - ID của session hiện tại đang được chọn.
 * @param {Function} onSelect - Callback khi một session được chọn.
 * @param {Function} onDelete - Callback khi nút xóa session được nhấn.
 * @param {HTMLElement | null} historySessionsElement - Tham chiếu đến div chứa lịch sử.
 * @param {HTMLElement | null} chatContainerElement - Tham chiếu đến container chat.
 * @param {HTMLElement | null} welcomeElement - Tham chiếu đến div welcome tĩnh.
 * @param {HTMLElement | null} chatMessagesElement - Tham chiếu đến div chứa tin nhắn chat.
 */
export function updateHistorySidebar(sessions, currentId, onSelect, onDelete, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement) {
    if (!historySessionsElement) {
        console.error('[ui.js] updateHistorySidebar: historySessionsElement not provided!');
        return;
    }
    historySessionsElement.innerHTML = '';

    if (!sessions || sessions.length === 0) {
        // Optionally display a message here if needed
        return;
    }

    // Ensure sorting (redundant if already sorted in session.js, but safe)
    const sortedSessions = [...sessions].sort((a, b) =>
        new Date(b?.lastUpdatedAt || 0).getTime() - new Date(a?.lastUpdatedAt || 0).getTime()
    );

    sortedSessions.forEach((session, index) => {
        // Add defensive checks for session properties
        if (!session || !session.id) {
            console.warn(`[ui.js] Skipping invalid session data at index ${index}:`, session);
            return;
        }

        const historyItem = document.createElement('div');
        historyItem.className = 'history-item group flex cursor-pointer items-center rounded-lg p-3 transition-all hover:bg-secondary-100';
        historyItem.dataset.sessionId = session.id;

        if (session.id === currentId) {
            historyItem.classList.add('active', 'bg-primary-100');
            historyItem.style.borderLeft = '4px solid var(--color-primary-600, #b42c1c)';
            historyItem.style.paddingLeft = 'calc(0.75rem - 4px)';
        } else {
            historyItem.style.borderLeft = '4px solid transparent';
            historyItem.style.paddingLeft = '0.75rem';
        }

        // Check lastUpdatedAt before formatting
        const dateStr = session.lastUpdatedAt ? new Date(session.lastUpdatedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Không rõ ngày';
        const title = session.title || `Cuộc trò chuyện #${session.id.substring(0, 5)}`;

        historyItem.innerHTML = `
            <div class="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </div>
            <div class="flex-grow overflow-hidden">
                <div class="truncate text-sm font-medium text-secondary-800" title="${title}">${title}</div>
                <div class="text-xs text-secondary-500">${dateStr}</div>
            </div>
            <button class="delete-session-btn ml-auto flex-shrink-0 p-1 text-secondary-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500" data-session-id="${session.id}" title="Xóa cuộc trò chuyện">
                <svg xmlns="http://www.w3.org/2000/svg" class="pointer-events-none h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /> </svg>
            </button>
        `;

        historyItem.addEventListener('click', async (e) => {
            if (e.target.closest('.delete-session-btn')) return;
            const clickedSessionId = historyItem.dataset.sessionId;
            // Check if currentId is defined before comparing
            if (typeof currentId === 'undefined' || clickedSessionId !== currentId) { 
                if (onSelect) {
                    try {
                        await onSelect(clickedSessionId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
                    } catch (selectError) {
                        console.error('[ui.js] Error calling onSelect handler:', selectError);
                    }
                }
            } else {
                 // Do nothing
            }
            // Close sidebar on mobile after selection regardless of whether it was active
            if (window.innerWidth < 768) {
                document.getElementById('closeHistorySidebar')?.click();
            }
        });

        const deleteButton = historyItem.querySelector('.delete-session-btn');
        deleteButton?.addEventListener('click', (e) => {
            e.stopPropagation();
            const sessionIdToDelete = e.currentTarget.dataset.sessionId;
            if (onDelete) {
                 try {
                     onDelete(sessionIdToDelete, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
                 } catch (deleteError) {
                     console.error('[ui.js] Error calling onDelete handler:', deleteError);
                 }
            }
        });

        historySessionsElement.appendChild(historyItem);
    });
}

/**
 * Tải giao diện cho một session cụ thể (tin nhắn, v.v.).
 * @param {object | null} session - Đối tượng session cần tải. Null nếu không có session.
 * @param {Function} showWelcomeFn - Hàm để hiển thị màn hình chào mừng.
 * @param {object} domElements - Object containing references to key DOM elements.
 */
export function loadSessionUI(session, showWelcomeFn, domElements) {
    const chatContainerElement = domElements?.chatContainer;
    const welcomeElement = domElements?.welcomeMessageDiv;
    const chatMessagesElement = domElements?.chatMessagesDiv; // Assuming this is the parent

    if (!chatContainerElement || !welcomeElement || !chatMessagesElement) {
        console.error('[ui.js] loadSessionUI: Missing required DOM elements!', domElements);
        // Optionally show an error to the user
        return;
    }

    chatContainerElement.innerHTML = ''; // Clear previous messages
    chatContainerElement.scrollTop = chatContainerElement.scrollHeight; // Scroll to bottom initially

    if (!session || !session.messages || session.messages.length === 0) {
        // --- THAY ĐỔI LOGIC --- 
        // 1. Ẩn màn hình chào mừng tĩnh
        welcomeElement.classList.add('hidden');
        // 2. Xóa class căn giữa khỏi container cha (nếu có)
        chatMessagesElement.classList.remove('items-center', 'justify-center');
        // 3. Hiển thị container chat (nó đã được xóa nội dung ở trên)
        chatContainerElement.classList.remove('hidden');
        // 4. KHÔNG gọi showWelcomeFn nữa. Việc này sẽ do startNewChat xử lý.
        // if (showWelcomeFn) { ... } // <<< BỎ ĐI

    } else {
        welcomeElement.classList.add('hidden');
        chatMessagesElement.classList.remove('items-center', 'justify-center'); // Remove centering
        chatContainerElement.classList.remove('hidden');

        // *** Đây là phần quan trọng ***
        const fragment = document.createDocumentFragment();
        session.messages.forEach(msg => {
            // **Đang gọi renderMessageElement!**
            const messageElement = renderMessageElement(msg);
            if (messageElement) { // Check if element was created successfully
                fragment.appendChild(messageElement);
            } else {
                 console.warn('[ui.js] renderMessageElement returned null for message:', msg);
            }
        });
        chatContainerElement.appendChild(fragment);

        // Scroll to bottom after rendering initial messages
        setTimeout(() => {
            chatContainerElement.scrollTop = chatContainerElement.scrollHeight;
        }, 0); // Timeout to allow DOM updates

        // Highlight code blocks after adding messages to DOM
        try {
             highlightCodeBlocks(chatContainerElement);
        } catch (e) {
             console.error('[ui.js] Error highlighting code blocks on initial load:', e);
        }
    }
     // Update history sidebar highlight (session.js handles the actual ID change, UI just reflects)
     // updateHistorySidebar(getAllSessions(), session?.id, handleSelectSession, handleDeleteRequest); // This call might be redundant if session.js already calls it
}

/**
 * Hiển thị màn hình chào mừng và cấu hình nút bắt đầu cuộc trò chuyện.
 * @param {Function} onStartChat - Hàm callback được gọi khi nút "Bắt đầu cuộc trò chuyện" được nhấn.
 * @param {HTMLElement} welcomeElement - Phần tử DOM chứa màn hình chào mừng.
 * @param {HTMLElement} chatContainer - Phần tử DOM chứa khu vực chat (sẽ bị ẩn).
 * @param {HTMLElement} chatMessagesElement - Phần tử DOM chứa tin nhắn chat.
 */
export function showWelcomeScreen(onStartChat, welcomeElement, chatContainer, chatMessagesElement) {
    console.log("[ui.js] Showing welcome screen");
    if (!welcomeElement || !chatContainer || !chatMessagesElement) {
        console.error("[ui.js] Missing required elements for showWelcomeScreen:", { 
            welcomeElement: !!welcomeElement,
            chatContainer: !!chatContainer,
            chatMessagesElement: !!chatMessagesElement
        });
        return;
    }
    
    // Đảm bảo hiển thị màn hình chào mừng
    welcomeElement.style.display = 'flex';
    welcomeElement.classList.remove('hidden');
    
    // Ẩn khu vực chat
    chatMessagesElement.classList.add('hidden');
    chatContainer.innerHTML = ''; 
    
    // Cấu hình các phần tử cha để hiển thị đúng
    const chatAreaWrapper = chatContainer.parentElement;
    if (chatAreaWrapper) {
        chatAreaWrapper.style.display = 'flex';
        chatAreaWrapper.style.flexDirection = 'column';
        chatAreaWrapper.style.alignItems = 'center';
        chatAreaWrapper.style.justifyContent = 'center';
    }
    
    // Nếu welcomeElement bị ẩn trong CSS, hiển thị nó
    console.log("[ui.js] Welcome element display style:", window.getComputedStyle(welcomeElement).display);
    if (window.getComputedStyle(welcomeElement).display === 'none') {
        console.log("[ui.js] Forcing welcome element to display flex");
        welcomeElement.style.display = 'flex';
    }
    
    // Đảm bảo nút "Bắt đầu cuộc trò chuyện" hiển thị đúng cách
    // Tìm nút trong phần tử welcomeElement thay vì toàn bộ DOM
    let startChatButton = welcomeElement.querySelector('#startChatButton');
    
    if (!startChatButton) {
        // Nếu không tìm thấy nút, thử tìm bằng cách sử dụng DOM chung
        startChatButton = document.getElementById('startChatButton');
        console.log("[ui.js] Looking for button in entire DOM:", !!startChatButton);
    }
    
    if (startChatButton) {
        console.log("[ui.js] Start chat button found, configuring it");
        // Đảm bảo nút hiển thị
        startChatButton.style.display = 'flex';
        startChatButton.classList.add('animate-pulse');
        
        // Xóa event listeners cũ (nếu có)
        const newButton = startChatButton.cloneNode(true);
        if (startChatButton.parentNode) {
            startChatButton.parentNode.replaceChild(newButton, startChatButton);
        }
        
        // Thêm event listener mới
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("[ui.js] Start chat button clicked");
            if (typeof onStartChat === 'function') {
                onStartChat();
            }
        });
    } else {
        // Nếu không tìm thấy nút, tạo nút mới
        console.warn("[ui.js] Start chat button not found, creating a new one");
        
        const newButton = document.createElement('button');
        newButton.id = 'startChatButton';
        newButton.className = 'px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg shadow-md transition-colors duration-300 flex items-center animate-pulse';
        newButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Bắt đầu cuộc trò chuyện
        `;
        
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("[ui.js] Start chat button clicked (newly created)");
            if (typeof onStartChat === 'function') {
                onStartChat();
            }
        });
        
        // Thêm nút vào welcome message
        welcomeElement.appendChild(newButton);
    }
}

/**
 * Ẩn màn hình chào mừng và hiển thị khu vực chat.
 * @param {HTMLElement} welcomeElement - Phần tử DOM chứa màn hình chào mừng.
 * @param {HTMLElement} chatMessagesElement - Phần tử DOM chứa tin nhắn chat.
 */
export function hideWelcomeScreen(welcomeElement, chatMessagesElement) {
    if (!welcomeElement || !chatMessagesElement) return;
    
    welcomeElement.classList.add('hidden');
    chatMessagesElement.classList.remove('hidden');
}

/**
 * Hiển thị dialog xác nhận xóa một session cụ thể.
 * @param {string} sessionTitle - Tiêu đề của session để hiển thị trong dialog.
 * @param {Function} onConfirm - Callback sẽ được gọi nếu người dùng xác nhận.
 */
export function showDeleteSessionDialog(sessionTitle, onConfirm) {
    let dialog = document.getElementById('confirmDeleteSessionDialog');
    if (dialog) dialog.remove();

    dialog = document.createElement('div');
    dialog.id = 'confirmDeleteSessionDialog';
    dialog.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 animate-fade-in';
    dialog.innerHTML = `
         <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm mx-auto transform transition-all scale-95 opacity-0 modal-content">
             <div class="text-center">
                 <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                     <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                         <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                 </div>
                 <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">Xác nhận Xóa Hội Thoại?</h3>
                 <p class="text-sm text-gray-500 mb-1">Bạn có chắc chắn muốn xóa cuộc trò chuyện:</p>
                 <p class="text-sm font-semibold text-gray-700 mb-6 truncate" title="${sessionTitle}">${sessionTitle}</p>
                 <p class="text-xs text-red-500 mb-6">Hành động này không thể hoàn tác.</p>
                 <div class="flex justify-center gap-4">
                     <button id="cancelDeleteSessionBtn" class="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors">
                         Hủy bỏ
                     </button>
                     <button id="confirmDeleteSessionBtn" class="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors">
                         Xác nhận Xóa
                     </button>
                 </div>
             </div>
         </div>
     `;

    document.body.appendChild(dialog);

    const modalContent = dialog.querySelector('.modal-content');
    const confirmBtn = document.getElementById('confirmDeleteSessionBtn');
    const cancelBtn = document.getElementById('cancelDeleteSessionBtn');

    const closeDialog = () => {
         if(modalContent) {
             modalContent.classList.remove('scale-100', 'opacity-100');
             modalContent.classList.add('scale-95', 'opacity-0');
         }
        setTimeout(() => {
            dialog?.remove();
        }, 300);
    };

    confirmBtn?.addEventListener('click', () => {
        if (onConfirm) onConfirm();
        closeDialog();
    });
    cancelBtn?.addEventListener('click', closeDialog);
    dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(); });

    // Trigger enter animation
    requestAnimationFrame(() => {
         if (modalContent) {
             modalContent.classList.remove('scale-95', 'opacity-0');
             modalContent.classList.add('scale-100', 'opacity-100');
         }
    });
}

/**
 * Hiển thị thông báo nổi (toast).
 * @param {string} message - Nội dung thông báo.
 * @param {'info'|'success'|'warning'|'error'} [type='info'] - Loại thông báo.
 * @param {number} [duration=3000] - Thời gian hiển thị (ms).
 */
export function showNotification(message, type = 'info', duration = 3000) {
    const containerId = 'notification-container';
    let container = document.getElementById(containerId);

    // Create container if it doesn't exist
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'fixed top-4 right-4 z-[100] flex flex-col items-end space-y-3';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = 'notification-item transform transition-all duration-300 ease-in-out translate-y-full opacity-0 max-w-[400px] min-w-[350px] w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border';

    let bgColor, textColor, iconSvg, borderColor;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-50'; textColor = 'text-green-800'; borderColor = 'border-green-200';
            iconSvg = `<svg class="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
            break;
        case 'warning':
            bgColor = 'bg-yellow-50'; textColor = 'text-yellow-800'; borderColor = 'border-yellow-200';
            iconSvg = `<svg class="h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>`;
            break;
        case 'error':
            bgColor = 'bg-red-50'; textColor = 'text-red-800'; borderColor = 'border-red-200';
            iconSvg = `<svg class="h-6 w-6 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>`;
            break;
        default: // info
            bgColor = 'bg-blue-50'; textColor = 'text-blue-800'; borderColor = 'border-blue-200';
            iconSvg = `<svg class="h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>`;
            break;
    }

    notification.classList.add(bgColor, borderColor);
    notification.innerHTML = `
        <div class="p-4">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    ${iconSvg}
                </div>
                <div class="ml-3 w-0 flex-1">
                    <p class="text-sm font-medium ${textColor}">${message}</p>
                </div>
                <div class="ml-4 flex flex-shrink-0">
                    <button type="button" class="inline-flex rounded-md ${bgColor} text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 close-notification-btn">
                        <span class="sr-only">Close</span>
                        <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    container.appendChild(notification);

    // Function to remove notification (Simplified)
    const removeNotification = () => {
        notification.classList.add('opacity-0'); // Fade out
        // Optional: Add translate-y-2 for slight slide-out
        // notification.classList.add('translate-y-2');
        setTimeout(() => {
            notification.remove();
            if (container && !container.hasChildNodes()) {
                container.remove();
            }
        }, 300); // Match transition duration
    };

    // Add event listener to close button
    notification.querySelector('.close-notification-btn')?.addEventListener('click', removeNotification);

    // Animate in (Reverted to simpler requestAnimationFrame)
    requestAnimationFrame(() => {
        notification.classList.remove('opacity-0');
    });

    // Auto remove after duration
    setTimeout(removeNotification, duration);
}