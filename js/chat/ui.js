import { formatTime, renderMarkdown, highlightCodeBlocks } from './utils.js';

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
    console.log('[ui.js] Updating recording UI, isRecording:', isRecording);
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
    console.log('[ui.js] Hiding static welcome message.');
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
    console.log('[ui.js] Setting loading indicator visibility:', show);
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
    console.log(`%c[ui.js] addMessageToChat CALLED. User: ${isUser}, Streaming: ${isStreaming}, ID: ${customId || '(auto)'}`, 'color: orange;');
    if (!chatContainerElement) {
        console.error('[ui.js] addMessageToChat: chatContainerElement not provided!');
        return null;
    }
    if (!message && !customId && !isStreaming) {
        console.warn('[ui.js] addMessageToChat called with no message/id and not streaming, aborting.');
        return null;
    }

    const messageDiv = document.createElement('div');
    if (customId) messageDiv.id = customId;
    const now = timestamp ? new Date(timestamp) : new Date();
    const timeStr = formatTime(now);

    let contentDiv = null;

    if (isUser) {
        messageDiv.className = 'flex flex-col items-end space-y-1 animate-fade-in mb-4';
        const timeDiv = document.createElement('div');
        timeDiv.className = 'text-xs text-secondary-500 mr-2';
        timeDiv.textContent = timeStr;
        messageDiv.appendChild(timeDiv);

        contentDiv = document.createElement('div');
        contentDiv.className = 'bg-primary-600 text-white px-4 py-2 rounded-t-2xl rounded-bl-2xl max-w-[85%] shadow-sm';
        contentDiv.textContent = message; // Safe for user messages
        messageDiv.appendChild(contentDiv);
    } else { // Bot message
        messageDiv.className = 'flex flex-col space-y-1 animate-fade-in mb-4';
        const timeDiv = document.createElement('div');
        timeDiv.className = 'text-xs text-secondary-500 ml-2';
        timeDiv.textContent = timeStr;
        messageDiv.appendChild(timeDiv);

        const messageRow = document.createElement('div');
        messageRow.className = 'flex items-start';

        contentDiv = document.createElement('div');
        contentDiv.className = 'bg-secondary-100 text-secondary-800 px-4 py-2 rounded-t-2xl rounded-br-2xl max-w-[85%] shadow-sm message-content';

        if (isStreaming) {
            contentDiv.innerHTML = `<div class="ellipsis-animation"><span>.</span><span>.</span><span>.</span></div><div class="markdown-content" style="min-height: 1.5rem;"></div>`;
        } else if (message) {
            contentDiv.innerHTML = `<div class="markdown-content">${renderMarkdown(message)}</div>`; // Render Markdown for bot messages
            setTimeout(() => {
                 try { highlightCodeBlocks(contentDiv); } catch (e) { console.error('[ui.js] Error highlighting code:', e); }
            }, 50);
        } else {
            contentDiv.innerHTML = `<div class="markdown-content"></div>`; // Placeholder if message is null but not streaming
        }

        messageRow.appendChild(contentDiv);
        messageDiv.appendChild(messageRow);
    }

    chatContainerElement.appendChild(messageDiv);
    console.log(`[ui.js]   -> Appended message element to chatContainer. Child count: ${chatContainerElement.childElementCount}`);
    setTimeout(() => {
         try {
             if (chatContainerElement.scrollHeight > chatContainerElement.clientHeight) {
                chatContainerElement.scrollTop = chatContainerElement.scrollHeight;
             }
         } catch(e) { console.error('[ui.js] Error scrolling chat:', e); }
    }, 0);

    // Return the element holding the actual content for potential updates (streaming)
    return isUser ? contentDiv : contentDiv.querySelector('.markdown-content') || contentDiv;
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
    console.log(`[ui.js] Updating history sidebar. Sessions count: ${sessions?.length}, Current ID: ${currentId}`);
    if (!historySessionsElement) {
        console.error('[ui.js] updateHistorySidebar: historySessionsElement not provided!');
        return;
    }
    historySessionsElement.innerHTML = '';

    if (!sessions || sessions.length === 0) {
        console.log('[ui.js] No sessions to display in sidebar.');
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
        console.log(`[ui.js] Processing session for sidebar: ID=${session.id}, Title=${session.title}`);

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
            console.log(`[ui.js] History item clicked: ${clickedSessionId}`);
            // Check if currentId is defined before comparing
            if (typeof currentId === 'undefined' || clickedSessionId !== currentId) { 
                if (onSelect) {
                    try {
                        console.log(`[ui.js] Calling onSelect handler for ${clickedSessionId}`);
                        await onSelect(clickedSessionId, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
                    } catch (selectError) {
                        console.error('[ui.js] Error calling onSelect handler:', selectError);
                    }
                }
            } else {
                 console.log(`[ui.js] Clicked on the currently active session (${clickedSessionId}), no action needed.`);
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
             console.log(`[ui.js] Delete button clicked for session: ${sessionIdToDelete}`);
            if (onDelete) {
                 try {
                     console.log(`[ui.js] Calling onDelete handler for ${sessionIdToDelete}`);
                     onDelete(sessionIdToDelete, historySessionsElement, chatContainerElement, welcomeElement, chatMessagesElement);
                 } catch (deleteError) {
                     console.error('[ui.js] Error calling onDelete handler:', deleteError);
                 }
            }
        });

        historySessionsElement.appendChild(historyItem);
    });
     console.log('[ui.js] Finished updating history sidebar.');
}

/**
 * Hiển thị giao diện cho một session cụ thể (thường là sau khi chọn từ sidebar hoặc tạo mới).
 * Xóa tin nhắn cũ và hiển thị tin nhắn mới (hoặc welcome message nếu không có tin nhắn).
 * @param {object} session - Đối tượng session.
 * @param {Function} showWelcomeFn - Hàm để hiển thị welcome message (từ chat.js).
 * @param {HTMLElement | null} chatContainerElement - Tham chiếu đến container chat.
 * @param {HTMLElement | null} welcomeElement - Tham chiếu đến div welcome tĩnh.
 * @param {HTMLElement | null} chatMessagesElement - Tham chiếu đến div chứa tin nhắn chat.
 */
export function loadSessionUI(session, showWelcomeFn, chatContainerElement, welcomeElement, chatMessagesElement) {
    console.log(`[ui.js] Loading UI for session ID: ${session?.id}`);
    if (!chatContainerElement || !welcomeElement || !chatMessagesElement) {
        console.error('[ui.js] loadSessionUI: Missing critical elements (chatContainer, welcome, chatMessages).');
        return;
    }

    // Xóa nội dung chat cũ và ẩn welcome tĩnh, hiện khu vực chat
    chatContainerElement.innerHTML = '';
    welcomeElement.classList.add('hidden');
    chatMessagesElement.classList.remove('hidden'); // Ensure chat area is visible

    if (session && session.messages && session.messages.length > 0) {
        console.log(`[ui.js] Rendering ${session.messages.length} messages for session ${session.id}`);
        session.messages.forEach(msg => {
            addMessageToChat(msg.content, chatContainerElement, msg.isUser, false, msg.id, msg.timestamp);
        });
        // Cuộn xuống dưới cùng sau khi thêm tất cả tin nhắn
        setTimeout(() => {
             try {
                 if (chatContainerElement.scrollHeight > chatContainerElement.clientHeight) {
                    chatContainerElement.scrollTop = chatContainerElement.scrollHeight;
                 }
             } catch(e) { console.error('[ui.js] Error scrolling after loading session:', e); }
        }, 50);
    } else {
        // Nếu không có tin nhắn, gọi hàm hiển thị welcome message động
        console.log(`[ui.js] Session ${session?.id} has no messages. Calling showWelcomeFn.`);
        if (showWelcomeFn) {
            showWelcomeFn(chatContainerElement, welcomeElement, chatMessagesElement); // Pass elements down
        } else {
            console.error('[ui.js] showWelcomeFn not provided to loadSessionUI!');
             // Fallback: Hiển thị thông báo tĩnh nếu hàm không có
             chatContainerElement.innerHTML = '<p class="text-center text-secondary-500 p-4">Bắt đầu cuộc trò chuyện mới!</p>';
        }
    }
     console.log(`[ui.js] Finished loading UI for session ID: ${session?.id}`);
}

/**
 * Hiển thị dialog xác nhận xóa toàn bộ lịch sử.
 * @param {Function} onConfirm - Callback sẽ được gọi nếu người dùng xác nhận.
 */
export function showClearHistoryDialog(onConfirm) {
    // Check if dialog exists
    let dialog = document.getElementById('confirmClearHistoryDialog');
    if (dialog) {
        dialog.remove(); // Remove existing dialog to avoid duplicates
    }

    // Create dialog HTML
    dialog = document.createElement('div');
    dialog.id = 'confirmClearHistoryDialog';
    dialog.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 animate-fade-in';
    dialog.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm mx-auto transform transition-all scale-95 opacity-0 modal-content">
            <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">Xác nhận Xóa Toàn Bộ Lịch Sử?</h3>
                <p class="text-sm text-gray-500 mb-6">Hành động này không thể hoàn tác. Tất cả các cuộc trò chuyện sẽ bị xóa vĩnh viễn.</p>
                <div class="flex justify-center gap-4">
                    <button id="cancelClearBtn" class="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors">
                        Hủy bỏ
                    </button>
                    <button id="confirmClearBtn" class="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors">
                        Xác nhận Xóa
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    const modalContent = dialog.querySelector('.modal-content');
    const confirmBtn = document.getElementById('confirmClearBtn');
    const cancelBtn = document.getElementById('cancelClearBtn');

    const closeDialog = () => {
         if(modalContent) {
             modalContent.classList.remove('scale-100', 'opacity-100');
             modalContent.classList.add('scale-95', 'opacity-0');
         }
        setTimeout(() => {
            dialog?.remove();
        }, 300); // Match transition duration
    };

    confirmBtn?.addEventListener('click', () => {
        if (onConfirm) {
            onConfirm();
        }
        closeDialog();
    });

    cancelBtn?.addEventListener('click', closeDialog);
    dialog.addEventListener('click', (e) => { // Close on overlay click
        if (e.target === dialog) {
            closeDialog();
        }
    });

    // Trigger enter animation
    requestAnimationFrame(() => {
         if (modalContent) {
             modalContent.classList.remove('scale-95', 'opacity-0');
             modalContent.classList.add('scale-100', 'opacity-100');
         }
    });

    console.log('[ui.js] Clear history confirmation dialog shown.');
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
     console.log('[ui.js] Delete session confirmation dialog shown.');
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

    console.log(`[ui.js] Notification shown: ${message} (Type: ${type})`);
}