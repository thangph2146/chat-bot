import { formatTime, renderMarkdown, highlightCodeBlocks } from './utils.js';

// --- DOM Element References ---
// It's better to get these elements in the main script after DOMContentLoaded
// and pass them to the functions or make them available globally/scoped.
// For now, we define selectors here for simplicity, but this might need refactoring.
const chatContainer = document.getElementById('chatContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const historySessions = document.getElementById('historySessions');
const recordButton = document.getElementById('recordButton');
const welcomeMessageElement = document.getElementById('welcomeMessage');

// --- State (Placeholder - should be managed elsewhere) ---
// These variables are needed by some UI functions but should ideally be managed
// in a dedicated state management module or the main script.
let currentSessionId = null; // Example: Will be set by session logic
let chatSessions = []; // Example: Will be populated by session logic

// Dependencies to be injected/resolved later:
// - loadSessionMessages (from session.js)
// - deleteSession (from session.js)
// - startNewChat (from session.js)
// - showWelcomeMessage (from chat.js or main.js)

// --- UI Update Functions ---

/**
 * Cập nhật giao diện nút ghi âm.
 * @param {boolean} isRecording - Trạng thái đang ghi âm.
 */
export function updateRecordingUI(isRecording) {
    console.log('[ui.js] Updating recording UI, isRecording:', isRecording);
    if (!recordButton) return;
    if (isRecording) {
        recordButton.classList.add('recording', 'animate-pulse');
        recordButton.title = 'Đang ghi âm... Nhấn để dừng';
        document.body.classList.add('recording-active');
    } else {
        recordButton.classList.remove('recording', 'animate-pulse');
        recordButton.title = 'Ghi âm giọng nói';
        document.body.classList.remove('recording-active');
    }
}

/**
 * Ẩn tin nhắn chào mừng tĩnh trong HTML.
 */
export function hideStaticWelcomeMessage() {
    console.log('[ui.js] Hiding static welcome message.');
    if (welcomeMessageElement) {
        welcomeMessageElement.classList.add('hidden');
    }
}

/**
 * Hiển thị hoặc ẩn chỉ báo loading.
 * @param {boolean} show - True để hiển thị, false để ẩn.
 */
export function showLoading(show) {
    console.log('[ui.js] Setting loading indicator visibility:', show);
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Thêm tin nhắn vào giao diện chat.
 * @param {string | null} message - Nội dung tin nhắn. Null nếu là placeholder cho streaming.
 * @param {boolean} [isUser=false] - True nếu là tin nhắn của người dùng.
 * @param {boolean} [save=true] - (DEPRECATED/MOVED) Logic lưu đã chuyển đi.
 * @param {string | null} [customId=null] - ID tùy chỉnh cho phần tử tin nhắn.
 * @param {string | Date | null} [timestamp=null] - Thời gian của tin nhắn.
 * @param {boolean} [isStreaming=false] - True nếu đang streaming tin nhắn từ bot.
 * @returns {HTMLElement | null} Phần tử chứa nội dung tin nhắn (để cập nhật khi streaming) hoặc null.
 */
export function addMessageToChat(message, isUser = false, save = true, customId = null, timestamp = null, isStreaming = false) {
    console.log(`[ui.js] Adding message to chat. User: ${isUser}, Streaming: ${isStreaming}, Message:`, message ? message.substring(0, 50) + '...' : '(No message/Placeholder)');
    if (!chatContainer) {
        console.error('[ui.js] chatContainer element not found!');
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
        contentDiv.textContent = message;
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
            contentDiv.innerHTML = `<div class="markdown-content">${renderMarkdown(message)}</div>`;
            setTimeout(() => {
                 try { highlightCodeBlocks(contentDiv); } catch (e) { console.error('[ui.js] Error highlighting code:', e); }
            }, 50);
        } else {
            contentDiv.innerHTML = `<div class="markdown-content"></div>`; // Placeholder if message is null but not streaming
        }

        messageRow.appendChild(contentDiv);
        messageDiv.appendChild(messageRow);
    }

    chatContainer.appendChild(messageDiv);
    setTimeout(() => {
         try {
             if (chatContainer.scrollHeight > chatContainer.clientHeight) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
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
 */
export function updateHistorySidebar(sessions, currentId, onSelect, onDelete) {
    console.log(`[ui.js] Updating history sidebar. Sessions count: ${sessions?.length}, Current ID: ${currentId}`);
    if (!historySessions) {
        console.error('[ui.js] historySessions element not found!');
        return;
    }
    historySessions.innerHTML = '';

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
            if (clickedSessionId !== currentId) {
                if (onSelect) {
                    try {
                        console.log(`[ui.js] Calling onSelect handler for ${clickedSessionId}`);
                        await onSelect(clickedSessionId);
                    } catch (selectError) {
                        console.error('[ui.js] Error calling onSelect handler:', selectError);
                    }
                }
            }
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
                     onDelete(sessionIdToDelete);
                 } catch (deleteError) {
                     console.error('[ui.js] Error calling onDelete handler:', deleteError);
                 }
            }
        });

        historySessions.appendChild(historyItem);
    });
     console.log('[ui.js] Finished updating history sidebar.');
}

/**
 * Tải giao diện cho một phiên chat (hiển thị tin nhắn đã có).
 * @param {object | null} session - Đối tượng session chứa messages.
 * @param {Function} showWelcomeFn - Hàm để hiển thị welcome message nếu session trống.
 */
export function loadSessionUI(session, showWelcomeFn) {
    console.log(`[ui.js] Loading UI for session:`, session ? session.id : 'null/undefined session');
    if (!chatContainer) {
         console.error('[ui.js] chatContainer not found in loadSessionUI!');
         return;
    }
    chatContainer.innerHTML = '';

    if (session?.messages?.length > 0) {
        console.log(`[ui.js] Session ${session.id} has ${session.messages.length} messages. Rendering...`);
        hideStaticWelcomeMessage();
        try {
            session.messages.forEach(msg => {
                // Add check for message content
                if (msg && typeof msg.content !== 'undefined') { // Check if content exists
                    addMessageToChat(msg.content, msg.isUser, false, msg.id, msg.timestamp);
                } else {
                    console.warn(`[ui.js] Skipping message with missing content in session ${session.id}:`, msg);
                }
            });
        } catch(renderError) {
             console.error(`[ui.js] Error rendering messages for session ${session.id}:`, renderError);
        }
        setTimeout(() => {
            try {
                if (chatContainer.scrollHeight > chatContainer.clientHeight) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    console.log(`[ui.js] Scrolled to bottom after rendering messages for ${session.id}.`);
                }
            } catch (scrollError) {
                 console.error(`[ui.js] Error scrolling after rendering messages for ${session.id}:`, scrollError);
            }
        }, 50);
    } else if (session) {
        console.log(`[ui.js] Session ${session.id} exists but has no messages. Calling showWelcomeFn.`);
        if (showWelcomeFn && typeof showWelcomeFn === 'function') {
            showWelcomeFn();
        } else {
            console.warn('[ui.js] showWelcomeFn is not available or not a function.');
            // Show a basic message if welcome function isn't available
             chatContainer.innerHTML = '<p class="text-center text-secondary-500 p-4">Bắt đầu trò chuyện!</p>';
        }
    } else {
        console.warn(`[ui.js] loadSessionUI called with null/invalid session. Calling showWelcomeFn.`);
         if (showWelcomeFn && typeof showWelcomeFn === 'function') {
            showWelcomeFn();
        } else {
             console.warn('[ui.js] showWelcomeFn is not available or not a function.');
             chatContainer.innerHTML = '<p class="text-center text-secondary-500 p-4">Không có phiên chat nào được chọn.</p>';
        }
    }
}


/**
 * Hiển thị hộp thoại xác nhận xóa TẤT CẢ lịch sử.
 * @param {Function} onConfirm - Callback khi người dùng xác nhận xóa.
 */
export function showClearHistoryDialog(onConfirm) {
    console.log('[ui.js] Showing clear history confirmation dialog.');
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    confirmDialog.id = 'confirmDialog';
    const dialogContent = document.createElement('div'); // Define dialogContent
    dialogContent.className = 'bg-white rounded-xl p-6 max-w-md shadow-xl';
    const dialogTitle = document.createElement('h3');
    dialogTitle.className = 'text-xl font-bold text-red-600 mb-4';
    dialogTitle.textContent = 'Xác nhận xóa';
    const dialogMessage = document.createElement('p');
    dialogMessage.className = 'mb-6 text-secondary-700';
    dialogMessage.textContent = 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử chat? Hành động này không thể hoàn tác.';
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex justify-end gap-3';
    const cancelButton = document.createElement('button');
    cancelButton.className = 'px-4 py-2 bg-secondary-200 text-secondary-800 rounded-lg hover:bg-secondary-300 transition-colors';
    cancelButton.textContent = 'Hủy';
    cancelButton.onclick = () => {
        console.log('[ui.js] Clear history cancelled.');
        document.body.removeChild(confirmDialog);
    };
    const confirmButton = document.createElement('button');
    confirmButton.className = 'px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors';
    confirmButton.textContent = 'Xóa tất cả';
    confirmButton.onclick = () => {
        console.log('[ui.js] Clear history confirmed.');
        if (onConfirm) {
             try { onConfirm(); } catch(e) { console.error('[ui.js] Error in onConfirm for clear history:', e); }
        }
        document.body.removeChild(confirmDialog);
    };
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(confirmButton);
    dialogContent.appendChild(dialogTitle);
    dialogContent.appendChild(dialogMessage);
    dialogContent.appendChild(buttonContainer);
    confirmDialog.appendChild(dialogContent);
    document.body.appendChild(confirmDialog);
}

/**
 * Hiển thị hộp thoại xác nhận xóa MỘT session.
 * @param {string} sessionTitle - Tiêu đề của session cần xóa.
 * @param {Function} onConfirm - Callback khi người dùng xác nhận xóa.
 */
export function showDeleteSessionDialog(sessionTitle, onConfirm) {
     console.log(`[ui.js] Showing delete confirmation dialog for: ${sessionTitle}`);
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    confirmDialog.id = 'confirmDialog';
    confirmDialog.innerHTML = `
        <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 class="text-xl font-bold text-red-600 mb-4">Xác nhận xóa</h3>
            <p class="text-secondary-700 mb-6">Bạn có chắc chắn muốn xóa <strong class="font-semibold">${sessionTitle || 'cuộc trò chuyện này'}</strong> không? Hành động này không thể hoàn tác.</p>
            <div class="flex justify-end gap-3">
                <button id="cancel-delete" class="px-4 py-2 rounded-lg bg-secondary-200 text-secondary-800 hover:bg-secondary-300 transition-colors">Hủy</button>
                <button id="confirm-delete" class="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">Xóa</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmDialog);
    const closeDialog = () => {
        const dialog = document.getElementById('confirmDialog');
        if (dialog && document.body.contains(dialog)) {
            document.body.removeChild(dialog);
        }
    };
    const confirmButton = confirmDialog.querySelector('#confirm-delete');
    const cancelButton = confirmDialog.querySelector('#cancel-delete');
    cancelButton.addEventListener('click', () => {
         console.log(`[ui.js] Delete session cancelled for: ${sessionTitle}`);
         closeDialog();
    });
    confirmButton.addEventListener('click', async () => {
        console.log(`[ui.js] Delete session confirmed for: ${sessionTitle}. Executing onConfirm...`);
        confirmButton.textContent = 'Đang xóa...';
        confirmButton.disabled = true;
        cancelButton.disabled = true;
        try {
            if (onConfirm) {
                await onConfirm();
            }
            console.log(`[ui.js] onConfirm completed for delete dialog: ${sessionTitle}`);
            closeDialog();
        } catch (error) {
            console.error("[ui.js] Error during delete confirmation execution:", error);
            confirmButton.textContent = 'Xóa';
            confirmButton.disabled = false;
            cancelButton.disabled = false;
        }
    });
}


/**
 * Hiển thị thông báo đơn giản.
 * @param {string} message - Nội dung thông báo.
 * @param {string} [type='info'] - Loại thông báo: 'info', 'success', 'warning', 'error'.
 * @param {number} [duration=3000] - Thời gian hiển thị (ms).
 * @returns {HTMLElement} Phần tử thông báo.
 */
export function showNotification(message, type = 'info', duration = 3000) {
     console.log(`[ui.js] Showing notification. Type: ${type}, Message: ${message}`);
    const notification = document.createElement('div');
    let bgColor, textColor, iconSvg;

    switch (type) {
        case 'success':
            bgColor = 'bg-green-500';
            textColor = 'text-white';
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
            break;
        case 'warning':
            bgColor = 'bg-yellow-500';
            textColor = 'text-white';
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
            break;
        case 'error':
            bgColor = 'bg-red-500';
            textColor = 'text-white';
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`;
            break;
        default: // info
            bgColor = 'bg-blue-500';
            textColor = 'text-white';
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    }

    notification.className = `fixed bottom-4 right-4 ${bgColor} ${textColor} px-4 py-3 rounded-lg shadow-lg z-50 flex items-center transform translate-y-20 opacity-0 transition-all duration-300`;
    notification.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    }, 10);

    let timeoutId = null;
    const removeNotification = () => {
        notification.style.transform = 'translateY(20px)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    };

    if (duration > 0) {
         timeoutId = setTimeout(removeNotification, duration);
    }

    notification.addEventListener('mouseenter', () => {
        if (timeoutId) clearTimeout(timeoutId);
    });

    notification.addEventListener('mouseleave', () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(removeNotification, 1000); // Add delay on mouseleave
    });

    return notification;
} 