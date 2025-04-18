const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('fileInput');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const clearHistoryButton = document.getElementById('clearHistoryButton');
const newChatButton = document.getElementById('newChatButton');
const historySessions = document.getElementById('historySessions');
const recordButton = document.getElementById('recordButton');

// Cấu hình API
const API_CONFIG = {
    baseUrl: 'http://trolyai.hub.edu.vn/v1',
    token: 'YLBbdRrlvFRDPkYV',
    apiKey: 'app-kyJ4IsXr0BvdaSuYBpdPISXH'
};

let chatSessions = []; // Mảng lưu các phiên chat
let currentSessionId = null;
let attachedFiles = [];
let recognition = null;
let isRecording = false;
let isProcessingVoice = false; // Trạng thái xử lý giọng nói
let recordingTimeout = null; // Timeout để tự động dừng ghi âm

// Hàm tiện ích tạo ID ngẫu nhiên
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Tạo ID duy nhất phức tạp hơn cho việc khôi phục phiên
 * @returns {string} ID duy nhất
 */
function generateUniqueId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 10);
    const uuid = crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').substring(0, 8) : '';
    return `${timestamp}-${randomStr}-${uuid || Math.random().toString(36).substring(2, 6)}`;
}

// Khởi tạo Web Speech API để thu âm giọng nói
function initSpeechRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'vi-VN';
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            console.log('Voice recording started');
            isRecording = true;
            isProcessingVoice = true;
            updateRecordingUI(true);
            
            // Tự động dừng ghi âm sau 15 giây
            recordingTimeout = setTimeout(() => {
                if (isRecording) {
                    showNotification('Đã tự động dừng ghi âm sau 15 giây', 'warning');
                    stopRecording();
                }
            }, 15000);
        };

        recognition.onresult = (event) => {
            // Lấy kết quả và hiển thị kết quả tạm thời trong lúc ghi âm
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            
            messageInput.value = transcript;
            messageInput.style.backgroundColor = 'rgba(28, 100, 242, 0.05)';
            
            // Nếu kết quả là cuối cùng
            if (event.results[0].isFinal) {
                messageInput.style.backgroundColor = 'rgba(28, 100, 242, 0.1)';
                isProcessingVoice = false;
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            stopRecording();
            showNotification(`Lỗi ghi âm: ${event.error}`, 'error');
        };

        recognition.onend = () => {
            clearTimeout(recordingTimeout);
            isRecording = false;
            updateRecordingUI(false);
            
            // Thêm delay nhỏ để hiệu ứng
            setTimeout(() => {
                messageInput.style.backgroundColor = '';
                if (messageInput.value.trim() !== '' && !isProcessingVoice) {
                    // Tự động gửi tin nhắn nếu đã ghi âm xong và có nội dung
                    // handleSendMessage();
                }
            }, 500);
        };
    } else {
        recordButton.disabled = true;
        recordButton.title = 'Trình duyệt không hỗ trợ ghi âm giọng nói';
        recordButton.classList.add('opacity-50');
        showNotification('Trình duyệt của bạn không hỗ trợ ghi âm giọng nói', 'error');
    }
}

// Cập nhật giao diện khi đang ghi âm
function updateRecordingUI(isRecording) {
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

// Bắt đầu ghi âm
function startRecording() {
    if (recognition && !isRecording) {
        try {
            recognition.start();
        } catch (e) {
            console.error('Failed to start recording:', e);
            showNotification('Không thể bắt đầu ghi âm, vui lòng thử lại', 'error');
        }
    }
}

// Dừng ghi âm
function stopRecording() {
    if (recognition && isRecording) {
        try {
            recognition.stop();
            clearTimeout(recordingTimeout);
        } catch (e) {
            console.error('Failed to stop recording:', e);
        }
    }
}

// Chuyển đổi trạng thái ghi âm
function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

// Kiểm tra localStorage có hoạt động không
function isLocalStorageAvailable() {
    try {
        const testKey = '_test_' + Date.now();
        localStorage.setItem(testKey, testKey);
        const result = localStorage.getItem(testKey) === testKey;
        localStorage.removeItem(testKey);
        return result;
    } catch (e) {
        return false;
    }
}

// Xử lý khi không có localStorage 
function handleNoLocalStorage() {
    // Tạo một đối tượng giả lập localStorage trong bộ nhớ
    const memoryStorage = {};
    
    // Ghi đè phương thức localStorage
    const oldLocalStorage = window.localStorage;
    window.localStorage = {
        getItem: function(key) {
            return memoryStorage[key] || null;
        },
        setItem: function(key, value) {
            memoryStorage[key] = String(value);
        },
        removeItem: function(key) {
            delete memoryStorage[key];
        },
        clear: function() {
            Object.keys(memoryStorage).forEach(key => {
                delete memoryStorage[key];
            });
        }
    };
    
    console.warn('Đang sử dụng bộ nhớ tạm thay vì localStorage. Dữ liệu sẽ bị mất khi tải lại trang.');
    showNotification('Trình duyệt không hỗ trợ lưu trữ cục bộ. Dữ liệu sẽ bị mất khi tải lại trang.', 'warning');
    
    // Khôi phục localStorage ban đầu khi trang được tải lại
    window.addEventListener('beforeunload', function() {
        window.localStorage = oldLocalStorage;
    });
}

// Hàm khôi phục dữ liệu nếu có vấn đề với localStorage
function recoverChatSessions() {
    try {
        // Thử lấy dữ liệu từ sessionStorage nếu có
        const sessionBackup = sessionStorage.getItem('chatSessionsBackup');
        if (sessionBackup && sessionBackup !== 'undefined' && sessionBackup !== 'null') {
            const parsedData = JSON.parse(sessionBackup);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
                chatSessions = parsedData;
                saveChatSessions(); // Lưu lại vào localStorage
                console.log('Đã khôi phục dữ liệu từ sessionStorage');
                return true;
            }
        }
        
        return false;
    } catch (e) {
        console.error('Lỗi khi khôi phục dữ liệu:', e);
        return false;
    }
}

// Tạo backup trong sessionStorage
function backupChatSessions() {
    try {
        if (Array.isArray(chatSessions) && chatSessions.length > 0) {
            sessionStorage.setItem('chatSessionsBackup', JSON.stringify(chatSessions));
        }
    } catch (e) {
        console.error('Không thể tạo backup:', e);
    }
}

// Tải phiên chat từ localStorage
function loadChatSessions() {
    // Kiểm tra localStorage có hoạt động không
    if (!isLocalStorageAvailable()) {
        handleNoLocalStorage();
    }
    
    try {
        const storedSessions = localStorage.getItem('chatSessions');
        console.log('Dữ liệu đã lưu trong localStorage:', storedSessions);
        
        if (storedSessions && storedSessions !== 'undefined' && storedSessions !== 'null') {
            chatSessions = JSON.parse(storedSessions);
            
            // Kiểm tra xem có đúng định dạng mảng không
            if (!Array.isArray(chatSessions)) {
                console.error("Dữ liệu không đúng định dạng mảng:", chatSessions);
                
                // Thử khôi phục từ backup
                if (!recoverChatSessions()) {
                    chatSessions = [];
                    startNewChat();
                    return;
                }
            }
            
            console.log('Đã tải được', chatSessions.length, 'phiên chat');
            
            if (chatSessions.length > 0) {
                // Tạo backup ngay sau khi tải thành công
                backupChatSessions();
                
                // Lấy phiên chat mới nhất
                currentSessionId = chatSessions[chatSessions.length - 1].id;
                
                // Hiển thị danh sách phiên chat
                updateHistorySidebar();
                
                // Hiển thị tin nhắn của phiên hiện tại
                const currentSession = chatSessions.find(s => s.id === currentSessionId);
                if (currentSession && Array.isArray(currentSession.messages)) {
                    currentSession.messages.forEach(msg => {
                        addMessageToChat(msg.message, msg.isUser, [], false);
                    });
                    
                    // Cuộn xuống cuối cùng
                    setTimeout(() => {
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }, 100);
                } else {
                    console.warn("Không tìm thấy tin nhắn trong phiên chat hiện tại");
                }
            } else {
                console.log("Không có phiên chat nào, bắt đầu phiên mới");
                startNewChat();
            }
        } else {
            console.log("Không tìm thấy dữ liệu phiên chat trong localStorage");
            // Thử khôi phục từ backup
            if (!recoverChatSessions()) {
                startNewChat();
            } else {
                // Tải lại dữ liệu đã khôi phục
                loadChatSessions();
            }
        }
    } catch (e) {
        console.error("Lỗi khi tải phiên chat:", e);
        
        // Thử khôi phục từ backup
        if (!recoverChatSessions()) {
            // Khởi tạo lại dữ liệu mới nếu có lỗi
            chatSessions = [];
            localStorage.removeItem('chatSessions');
            startNewChat();
            showNotification('Đã xảy ra lỗi khi tải lịch sử chat, đã tạo phiên mới', 'warning');
        } else {
            // Tải lại dữ liệu đã khôi phục
            loadChatSessions();
        }
    }
}

// Lưu phiên chat vào localStorage
function saveChatSessions() {
    try {
        if (!Array.isArray(chatSessions)) {
            console.error("Không thể lưu: chatSessions không phải là mảng");
            return;
        }
        
        const sessionsToSave = chatSessions.map(session => {
            // Đảm bảo session có đúng định dạng
            if (!session || typeof session !== 'object') {
                console.warn("Phát hiện session không đúng định dạng:", session);
                return null;
            }
            
            return {
                id: session.id || generateId(),
                name: session.name || 'Chat không tên',
                conversationId: session.conversationId || '',
                createdAt: session.createdAt || new Date().toISOString(),
                messages: Array.isArray(session.messages) ? session.messages.map(msg => ({
                    message: msg.message || '',
                    isUser: Boolean(msg.isUser),
                    timestamp: msg.timestamp || new Date().toISOString()
                })) : []
            };
        }).filter(Boolean); // Loại bỏ các giá trị null/undefined
        
        const dataToSave = JSON.stringify(sessionsToSave);
        localStorage.setItem('chatSessions', dataToSave);
        
        // Tạo backup trong sessionStorage
        backupChatSessions();
        
        console.log('Đã lưu', sessionsToSave.length, 'phiên chat vào localStorage');
        
        // Kiểm tra xem đã lưu thành công chưa
        const savedData = localStorage.getItem('chatSessions');
        if (!savedData || savedData === 'undefined' || savedData === 'null') {
            console.error("Lưu dữ liệu không thành công");
            showNotification('Không thể lưu lịch sử chat', 'error');
        }
    } catch (e) {
        console.error("Lỗi khi lưu phiên chat:", e);
        showNotification('Không thể lưu lịch sử chat', 'error');
    }
}

// Cập nhật sidebar lịch sử chat
function updateHistorySidebar() {
    historySessions.innerHTML = '';
    
    if (chatSessions.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'text-center py-8 text-secondary-500 text-sm';
        emptyState.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>Chưa có phiên chat nào</p>
            <p class="mt-2">Bấm "Bắt đầu chat mới" để bắt đầu</p>
        `;
        historySessions.appendChild(emptyState);
        return;
    }
    
    // Sắp xếp phiên chat mới nhất lên đầu
    const sortedSessions = [...chatSessions].reverse();
    
    sortedSessions.forEach(session => {
        const sessionItem = document.createElement('div');
        sessionItem.id = `session-${session.id}`;
        sessionItem.className = `p-3 rounded-lg cursor-pointer text-sm truncate flex justify-between items-center mb-2 transition-all hover:shadow-hover ${
            session.id === currentSessionId 
                ? 'bg-primary-100 text-primary-700 border-l-4 border-primary-500' 
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
        }`;
        
        // Tạo nội dung phiên chat
        const sessionContent = document.createElement('div');
        sessionContent.className = 'flex-grow truncate';
        
        const sessionName = document.createElement('div');
        sessionName.className = 'font-medium truncate';
        sessionName.textContent = session.name;
        sessionContent.appendChild(sessionName);
        
        // Hiển thị tin nhắn cuối cùng
        if (session.messages && session.messages.length > 0) {
            const lastMessage = document.createElement('div');
            lastMessage.className = 'text-xs text-secondary-500 truncate mt-1';
            const lastMsg = session.messages[session.messages.length - 1];
            lastMessage.textContent = `${lastMsg.isUser ? 'Bạn: ' : 'Bot: '}${lastMsg.message.substring(0, 30)}${lastMsg.message.length > 30 ? '...' : ''}`;
            sessionContent.appendChild(lastMessage);
        }
        
        sessionItem.appendChild(sessionContent);
        
        // Nút xóa phiên chat
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>`;
        deleteButton.className = 'ml-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center hover:bg-red-600 hover:scale-110 transition-all';
        deleteButton.title = 'Xóa phiên chat này';
        deleteButton.onclick = (event) => {
            event.stopPropagation();
            deleteSession(session.id);
        };
        sessionItem.appendChild(deleteButton);
        
        // Sự kiện click để chọn phiên chat
        sessionItem.onclick = (event) => {
            if (event.target !== deleteButton && !deleteButton.contains(event.target)) {
                loadSession(session.id);
            }
        };
        
        historySessions.appendChild(sessionItem);
    });
}

// Tải một phiên chat cụ thể
function loadSession(sessionId) {
    if (sessionId === currentSessionId) return;
    
    currentSessionId = sessionId;
    chatContainer.innerHTML = '';
    const session = chatSessions.find(s => s.id === sessionId);
    
    if (session) {
        session.messages.forEach(msg => {
            addMessageToChat(msg.message, msg.isUser, [], false);
        });
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    updateHistorySidebar();
}

// Bắt đầu phiên chat mới
function startNewChat() {
    const newSessionId = generateId();
    const sessionName = `Chat ${chatSessions.length + 1}`;
    
    // Thêm phiên chat mới vào mảng
    chatSessions.push({
        id: newSessionId,
        name: sessionName,
        messages: [],
        createdAt: new Date().toISOString(),
        conversationId: ''
    });
    
    // Cập nhật ID phiên hiện tại
    currentSessionId = newSessionId;
    
    // Xóa nội dung chat hiện tại
    chatContainer.innerHTML = '';
    
    // Lưu vào localStorage
    saveChatSessions();
    
    // Cập nhật sidebar
    updateHistorySidebar();
    
    // Hiển thị tin nhắn chào mừng
    showWelcomeMessage();
}

// Xóa toàn bộ lịch sử chat
function clearChatHistory() {
    // Tạo hộp thoại xác nhận tùy chỉnh
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    confirmDialog.id = 'confirmDialog';
    
    const dialogContent = document.createElement('div');
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
        document.body.removeChild(confirmDialog);
    };
    
    const confirmButton = document.createElement('button');
    confirmButton.className = 'px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors';
    confirmButton.textContent = 'Xóa tất cả';
    confirmButton.onclick = () => {
        // Tạo backup trước khi xóa
        try {
            sessionStorage.setItem('lastDeletedSessions', JSON.stringify(chatSessions));
        } catch (e) {
            console.error('Không thể tạo backup trước khi xóa:', e);
        }
        
        // Xóa dữ liệu
        chatSessions = [];
        currentSessionId = null;
        localStorage.removeItem('chatSessions');
        chatContainer.innerHTML = '';
        updateHistorySidebar();
        
        // Hiển thị thông báo
        showNotification('Đã xóa toàn bộ lịch sử chat', 'success');
        
        // Thêm tùy chọn khôi phục
        const undoNotification = showNotificationWithAction(
            'Đã xóa toàn bộ lịch sử chat', 
            'Hoàn tác', 
            recoverLastDeletedSession
        );
        
        // Đóng dialog
        document.body.removeChild(confirmDialog);
        
        // Bắt đầu chat mới
        startNewChat();
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
 * Khôi phục phiên chat đã xóa gần nhất
 * @returns {boolean} Trả về true nếu khôi phục thành công, false nếu không có phiên nào để khôi phục
 */
function recoverLastDeletedSession() {
    const lastDeletedSessionJSON = sessionStorage.getItem('lastDeletedSession');
    if (!lastDeletedSessionJSON) {
        showNotification('Không có phiên chat nào để khôi phục', 'warning');
        return false;
    }
    
    try {
        // Lấy dữ liệu phiên chat đã xóa
        const lastDeletedSession = JSON.parse(lastDeletedSessionJSON);
        
        // Kiểm tra xem ID đã tồn tại trong chatSessions chưa
        if (chatSessions.some(s => s.id === lastDeletedSession.id)) {
            // Nếu ID đã tồn tại, tạo ID mới cho phiên khôi phục
            lastDeletedSession.id = generateUniqueId();
        }
        
        // Thêm phiên đã xóa vào danh sách
        chatSessions.push(lastDeletedSession);
        
        // Lưu lại vào localStorage
        saveChatSessions();
        
        // Cập nhật giao diện
        updateHistorySidebar();
        
        // Chọn phiên vừa khôi phục
        loadSession(lastDeletedSession.id);
        
        // Xóa dữ liệu phiên đã khôi phục
        sessionStorage.removeItem('lastDeletedSession');
        
        // Hiển thị thông báo thành công
        showNotification('Đã khôi phục phiên chat thành công', 'success');
        
        return true;
    } catch (error) {
        console.error('Lỗi khi khôi phục phiên chat:', error);
        showNotification('Không thể khôi phục phiên chat', 'error');
        return false;
    }
}

/**
 * Hiển thị thông báo với nút hành động
 * @param {string} message - Nội dung thông báo
 * @param {string} actionText - Văn bản nút hành động
 * @param {Function} actionCallback - Hàm callback khi nhấn nút
 * @param {number} [duration=5000] - Thời gian hiển thị (ms)
 * @returns {HTMLElement} Phần tử thông báo
 */
function showNotificationWithAction(message, actionText, actionCallback, duration = 5000) {
    // Tạo phần tử thông báo
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-secondary-800 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center min-w-[300px] max-w-md';
    notification.style.transform = 'translateY(20px)';
    notification.style.opacity = '0';
    notification.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    
    // Tạo phần nội dung thông báo
    const messageElement = document.createElement('div');
    messageElement.className = 'flex-1 mr-4';
    messageElement.textContent = message;
    
    // Tạo nút hành động
    const actionButton = document.createElement('button');
    actionButton.className = 'bg-primary-600 hover:bg-primary-500 text-white px-3 py-1 rounded-md transition-colors text-sm font-medium';
    actionButton.textContent = actionText;
    actionButton.onclick = () => {
        if (actionCallback && typeof actionCallback === 'function') {
            actionCallback();
        }
        // Xóa thông báo sau khi nhấn nút
        removeNotification();
    };
    
    // Thêm vào DOM
    notification.appendChild(messageElement);
    notification.appendChild(actionButton);
    document.body.appendChild(notification);
    
    // Hiệu ứng hiển thị
    setTimeout(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    }, 10);
    
    // Biến để theo dõi thời gian còn lại
    let remainingTime = duration;
    let timeoutId = null;
    let startTime = Date.now();
    let isPaused = false;
    
    // Xử lý sự kiện hover để tạm dừng thời gian tự động đóng
    notification.addEventListener('mouseenter', () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
            // Lưu thời gian còn lại khi hover
            remainingTime -= (Date.now() - startTime);
            isPaused = true;
        }
    });
    
    notification.addEventListener('mouseleave', () => {
        if (isPaused) {
            // Tiếp tục đếm thời gian khi không hover
            startTime = Date.now();
            timeoutId = setTimeout(removeNotification, remainingTime);
            isPaused = false;
        }
    });
    
    // Hàm để xóa thông báo
    function removeNotification() {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        notification.style.transform = 'translateY(20px)';
        notification.style.opacity = '0';
        
        // Xóa phần tử sau khi hiệu ứng hoàn tất
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }
    
    // Thiết lập thời gian tự động đóng
    if (duration > 0) {
        startTime = Date.now();
        timeoutId = setTimeout(removeNotification, duration);
    }
    
    return notification;
}

// Đảm bảo dữ liệu được lưu khi rời trang
window.addEventListener('beforeunload', function() {
    // Lưu dữ liệu hiện tại vào localStorage
    if (Array.isArray(chatSessions) && chatSessions.length > 0) {
        try {
            localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
            sessionStorage.setItem('chatSessionsBackup', JSON.stringify(chatSessions));
        } catch (e) {
            console.error('Không thể lưu dữ liệu trước khi rời trang:', e);
        }
    }
});

// Định dạng thời gian
function formatTime(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Thêm tin nhắn vào chat
function addMessageToChat(message, isUser = false, files = [], save = true, customId = null) {
    if (!message && (!files || files.length === 0) && !customId) return;
    
    // Ẩn tin nhắn chào mừng nếu đang hiển thị
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement && !welcomeElement.classList.contains('hidden')) {
        welcomeElement.classList.add('hidden');
    }
    
    const messageDiv = document.createElement('div');
    
    // Thêm ID nếu được chỉ định (cho streaming)
    if (customId) {
        messageDiv.id = customId;
    }
    
    // Khởi tạo timestamp
    const now = new Date();
    const timestamp = formatTime(now);
    
    if (isUser) {
        // Tin nhắn người dùng - bên phải
        messageDiv.className = 'flex flex-col items-end space-y-1 animate-fade-in mb-4';
        
        // Thời gian
        const timeDiv = document.createElement('div');
        timeDiv.className = 'text-xs text-secondary-500 mr-2';
        timeDiv.textContent = timestamp;
        messageDiv.appendChild(timeDiv);

        // Nội dung tin nhắn
        const contentDiv = document.createElement('div');
        contentDiv.className = 'bg-primary-600 text-white px-4 py-2 rounded-t-2xl rounded-bl-2xl max-w-[85%] shadow-sm';
        contentDiv.textContent = message;
        messageDiv.appendChild(contentDiv);
    } else {
        // Tin nhắn bot - bên trái
        messageDiv.className = 'flex flex-col space-y-1 animate-fade-in mb-4';
        
        // Thời gian
        const timeDiv = document.createElement('div');
        timeDiv.className = 'text-xs text-secondary-500 ml-2';
        timeDiv.textContent = timestamp;
        messageDiv.appendChild(timeDiv);

        // Nội dung tin nhắn
        const messageRow = document.createElement('div');
        messageRow.className = 'flex items-start';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'bg-secondary-100 text-secondary-800 px-4 py-2 rounded-t-2xl rounded-br-2xl max-w-[85%] shadow-sm';
        
        // Lưu trữ nội dung tin nhắn để cập nhật khi streaming
        if (message) {
            contentDiv.textContent = message;
        } else {
            contentDiv.className += ' message-content min-h-[24px] min-w-[60px]';
        }
        
        messageRow.appendChild(contentDiv);
        messageDiv.appendChild(messageRow);
    }
    
    // Hiển thị file đính kèm
    if (files && files.length > 0) {
        const fileContainer = document.createElement('div');
        fileContainer.className = 'flex flex-wrap gap-2 mb-2 ' + (isUser ? 'justify-end' : 'justify-start');
        
        files.forEach(file => {
            const filePreview = document.createElement('div');
            filePreview.className = 'bg-white rounded-lg shadow-sm p-2 border border-secondary-200 ' + 
                                   (isUser ? 'ml-auto' : 'mr-auto');
            
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.alt = file.name;
                img.className = 'w-32 h-32 object-cover rounded-md';
                filePreview.appendChild(img);
                
                const fileInfo = document.createElement('div');
                fileInfo.className = 'text-xs text-secondary-500 mt-1 truncate max-w-[128px]';
                fileInfo.textContent = file.name;
                filePreview.appendChild(fileInfo);
            } else {
                const fileInfo = document.createElement('div');
                fileInfo.className = 'flex flex-col items-center p-2';
                
                // Icon hiển thị dựa vào loại file
                const icon = document.createElement('div');
                if (file.type.includes('pdf')) {
                    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>`;
                } else if (file.type.includes('word') || file.type.includes('doc')) {
                    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>`;
                } else {
                    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>`;
                }
                
                fileInfo.appendChild(icon);
                
                const text = document.createElement('p');
                text.textContent = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
                text.className = 'text-xs truncate mt-2 font-medium';
                fileInfo.appendChild(text);
                
                const size = document.createElement('p');
                size.textContent = formatFileSize(file.size);
                size.className = 'text-xs text-secondary-500';
                fileInfo.appendChild(size);
                
                filePreview.appendChild(fileInfo);
            }
            
            // Thêm hành động khi click vào file
            filePreview.addEventListener('click', () => {
                if (file.type.startsWith('image/')) {
                    // Hiển thị ảnh lớn hơn
                    const modal = document.createElement('div');
                    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 fade-in';
                    
                    const modalContent = document.createElement('div');
                    modalContent.className = 'bg-white rounded-xl p-4 max-w-3xl max-h-[90vh] overflow-auto relative';
                    
                    const closeButton = document.createElement('button');
                    closeButton.className = 'absolute top-2 right-2 bg-secondary-800 text-white rounded-full p-1';
                    closeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>`;
                    closeButton.onclick = () => document.body.removeChild(modal);
                    
                    const modalImg = document.createElement('img');
                    modalImg.src = URL.createObjectURL(file);
                    modalImg.className = 'max-w-full max-h-[80vh] object-contain';
                    
                    const filename = document.createElement('p');
                    filename.className = 'text-center text-secondary-600 mt-2';
                    filename.textContent = file.name;
                    
                    modalContent.appendChild(closeButton);
                    modalContent.appendChild(modalImg);
                    modalContent.appendChild(filename);
                    modal.appendChild(modalContent);
                    
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            document.body.removeChild(modal);
                        }
                    });
                    
                    document.body.appendChild(modal);
                }
            });
            
            fileContainer.appendChild(filePreview);
        });
        
        // Thêm file container vào tin nhắn trước hoặc sau nội dung, tùy thuộc vào loại tin nhắn
        if (isUser) {
            messageDiv.insertBefore(fileContainer, messageDiv.firstChild);
        } else {
            messageDiv.appendChild(fileContainer);
        }
    }

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Lưu tin nhắn vào lịch sử nếu cần
    if (save && currentSessionId) {
        const session = chatSessions.find(s => s.id === currentSessionId);
        if (session) {
            session.messages.push({ 
                message: message || '(Đã gửi file)', 
                isUser, 
                timestamp: now.toISOString(),
                files: files.map(file => ({
                    name: file.name,
                    type: file.type,
                    size: file.size
                }))
            });
            saveChatSessions();
        }
    }
    
    return messageDiv;
}

// Show/Hide Loading Indicator
function showLoading(show) {
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
}

// Hàm gọi API cho chatbot từ trolyai.hub.edu.vn với hỗ trợ streaming
async function callChatbotAPI(message, conversationId = '') {
    showLoading(true);
    
    try {
        // Tạo message placeholder để hiển thị streaming response
        const placeholderId = `msg-${Date.now()}`;
        const messageElement = addMessageToChat('', false, [], true, placeholderId);
        
        // Streaming mode - fetch với stream true
        const response = await fetch('http://trolyai.hub.edu.vn/v1/chat-messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                inputs: {},
                query: message,
                response_mode: 'streaming', // Chế độ streaming
                conversation_id: conversationId,
                user: 'user'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Lỗi kết nối API: ${response.status} ${response.statusText}`);
        }
        
        showLoading(false);
        
        // Xử lý stream data
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = '';
        let conversationIdFromStream = '';
        
        // Tìm message element để cập nhật nội dung
        if (!messageElement) {
            throw new Error('Không tìm thấy phần tử tin nhắn để cập nhật');
        }
        
        // Tìm hoặc tạo phần tử content
        let textElement = messageElement.querySelector('.message-content');
        if (!textElement) {
            const messageRow = messageElement.querySelector('div[class^="flex items-start"]');
            if (!messageRow) {
                throw new Error('Không tìm thấy message row để thêm nội dung');
            }
            
            // Tạo content container nếu không tồn tại
            const contentDiv = messageRow.querySelector('div[class^="bg-secondary-100"]');
            if (contentDiv) {
                // Đảm bảo có class message-content
                contentDiv.classList.add('message-content');
                textElement = contentDiv;
            } else {
                const newContentDiv = document.createElement('div');
                newContentDiv.className = 'bg-secondary-100 text-secondary-800 px-4 py-2 rounded-t-2xl rounded-br-2xl max-w-[85%] shadow-sm message-content';
                messageRow.appendChild(newContentDiv);
                textElement = newContentDiv;
            }
        }
        
        // Thêm hiệu ứng typing
        messageElement.classList.add('typing');
        
        // Tạo container cho nội dung markdown
        if (!textElement.querySelector('.markdown-content')) {
            const markdownContainer = document.createElement('div');
            markdownContainer.className = 'markdown-content';
            textElement.appendChild(markdownContainer);
        }
        
        const markdownContainer = textElement.querySelector('.markdown-content');
        if (!markdownContainer) {
            throw new Error('Không thể tạo container cho nội dung markdown');
        }
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.substring(6));
                        
                        if (data.event === 'message') {
                            // Cập nhật tin nhắn streaming
                            accumulatedResponse += data.answer || '';
                            
                            // Render nội dung markdown
                            markdownContainer.innerHTML = renderMarkdown(accumulatedResponse);
                            
                            // Áp dụng highlight cho code blocks sau khi thêm nội dung markdown
                            setTimeout(() => {
                                highlightCodeBlocks(markdownContainer);
                            }, 10);
                            
                            // Cuộn xuống khi có nội dung mới
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                            
                            // Lưu conversation_id nếu có
                            if (data.conversation_id && !conversationIdFromStream) {
                                conversationIdFromStream = data.conversation_id;
                            }
                        } else if (data.event === 'message_end' || data.event === 'done') {
                            // Stream đã hoàn tất
                            messageElement.classList.remove('typing');
                            
                            // Lưu metadata nếu có
                            if (data.metadata) {
                                console.log('Metadata từ API:', data.metadata);
                            }
                        }
                    } catch (e) {
                        console.error('Lỗi khi parse JSON từ stream:', e);
                    }
                }
            }
        }
        
        // Lưu conversation_id nếu có
        if (conversationIdFromStream && currentSessionId) {
            const session = chatSessions.find(s => s.id === currentSessionId);
            if (session) {
                session.conversationId = conversationIdFromStream;
                saveChatSessions();
            }
        }
        
        return {
            answer: accumulatedResponse,
            conversationId: conversationIdFromStream
        };
    } catch (error) {
        showLoading(false);
        console.error('API Call Error:', error);
        
        // Nếu lỗi xảy ra sau khi đã tạo message placeholder, cập nhật lại
        const errorPlaceholder = document.getElementById(placeholderId);
        if (errorPlaceholder) {
            const textElem = errorPlaceholder.querySelector('.message-content');
            if (textElem) {
                textElem.textContent = 'Xin lỗi, đã có lỗi xảy ra khi kết nối đến trợ lý. Vui lòng thử lại sau.';
            }
            errorPlaceholder.classList.remove('typing');
        } else {
            // Nếu không tìm thấy placeholder, tạo message lỗi mới
            addMessageToChat('Xin lỗi, đã có lỗi xảy ra khi kết nối đến trợ lý. Vui lòng thử lại sau.', false);
        }
        
        return {
            answer: 'Xin lỗi, đã có lỗi xảy ra khi kết nối đến trợ lý. Vui lòng thử lại sau.',
            error: true
        };
    }
}

/**
 * Chuyển đổi văn bản markdown thành HTML
 * @param {string} text - Văn bản markdown cần chuyển đổi
 * @returns {string} HTML đã được render
 */
function renderMarkdown(text) {
    if (!text) return '';
    
    // Xử lý code blocks trước tiên (để tránh xung đột với các regex khác)
    let html = text.replace(/```([\w-]*)\n([\s\S]*?)\n```/g, function(match, language, code) {
        language = language.trim();
        // Thêm class ngôn ngữ nếu được chỉ định
        const languageClass = language ? ` language-${language}` : '';
        return `<pre><code class="hljs${languageClass}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    });
    
    // Xử lý đường dẫn
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-primary-600 hover:underline">$1</a>');
    
    // Xử lý tiêu đề
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold my-2">$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold my-3">$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold my-4">$1</h1>');
    
    // Xử lý đoạn văn mới
    html = html.replace(/\n\n/g, '<br><br>');
    
    // Xử lý in đậm và in nghiêng
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Xử lý danh sách không có thứ tự
    html = html.replace(/^\* (.*$)/gm, '<li class="ml-4 list-disc">$1</li>');
    html = html.replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>');
    
    // Xử lý danh sách có thứ tự
    html = html.replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>');
    
    // Nhóm các mục danh sách thành danh sách UL/OL
    html = html.replace(/<li class="ml-4 list-disc">(.+?)<\/li>(?!\s*<li)/gs, '<ul class="my-2"><li class="ml-4 list-disc">$1</li></ul>');
    html = html.replace(/<li class="ml-4 list-decimal">(.+?)<\/li>(?!\s*<li)/gs, '<ol class="my-2"><li class="ml-4 list-decimal">$1</li></ol>');
    
    // Tránh lặp ul/ol
    html = html.replace(/<\/ul>\s*<ul class="my-2">/g, '');
    html = html.replace(/<\/ol>\s*<ol class="my-2">/g, '');
    
    // Ghép nhiều li liên tiếp vào cùng một ul/ol
    html = html.replace(/<\/li><\/ul>\s*<ul class="my-2"><li/g, '</li><li');
    html = html.replace(/<\/li><\/ol>\s*<ol class="my-2"><li/g, '</li><li');
    
    // Xử lý inline code (sau khi xử lý code blocks)
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code bg-secondary-100 text-secondary-800 px-1 rounded font-mono">$1</code>');
    
    // Xử lý bảng (nếu có)
    if (text.includes('|')) {
        // Nhận dạng bảng markdown
        const tableRegex = /\|(.+)\|\n\|(\s*[-:]+[-:|\s]*)\|\n((\|.+\|\n)+)/g;
        html = html.replace(tableRegex, function(match, headerRow, separatorRow, bodyRows) {
            // Xử lý hàng tiêu đề
            const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
            let tableHtml = '<div class="overflow-x-auto my-4"><table class="w-full border-collapse">\n<thead>\n<tr>';
            
            headers.forEach(header => {
                tableHtml += `<th class="border border-secondary-300 bg-secondary-100 px-4 py-2 text-left">${header}</th>`;
            });
            
            tableHtml += '</tr>\n</thead>\n<tbody>';
            
            // Xử lý phần thân bảng
            const rows = bodyRows.trim().split('\n');
            rows.forEach(row => {
                const cells = row.split('|').map(c => c.trim()).filter(c => c);
                if (cells.length) {
                    tableHtml += '\n<tr>';
                    cells.forEach(cell => {
                        tableHtml += `<td class="border border-secondary-300 px-4 py-2">${cell}</td>`;
                    });
                    tableHtml += '</tr>';
                }
            });
            
            tableHtml += '\n</tbody>\n</table></div>';
            return tableHtml;
        });
    }
    
    // Xử lý các thẻ đặc biệt
    const blockquoteRegex = /^> (.*)$/gm;
    html = html.replace(blockquoteRegex, '<blockquote class="pl-4 border-l-4 border-primary-500 italic my-4 text-secondary-600">$1</blockquote>');
    
    // Xử lý đường ngang
    html = html.replace(/^\s*(-{3,}|={3,})\s*$/gm, '<hr class="my-4 border-t border-secondary-300">');
    
    return html;
}

/**
 * Highlight code blocks trong container
 * @param {HTMLElement} container - Container chứa code cần highlight
 */
function highlightCodeBlocks(container) {
    if (!container || typeof hljs === 'undefined') return;
    
    try {
        // Lấy tất cả các code blocks
        const codeBlocks = container.querySelectorAll('pre code');
        if (codeBlocks.length === 0) return;
        
        // Highlight từng block
        codeBlocks.forEach(block => {
            // Thêm padding cho block
            const preTag = block.parentElement;
            if (preTag) {
                preTag.classList.add('rounded-lg', 'overflow-x-auto', 'my-4');
            }
            
            // Highlight với hljs
            hljs.highlightElement(block);
            
            // Thêm nút copy code nếu chưa có
            if (!preTag.querySelector('.copy-code-button')) {
                const copyButton = document.createElement('button');
                copyButton.className = 'copy-code-button absolute top-2 right-2 bg-secondary-200 bg-opacity-80 hover:bg-secondary-300 text-secondary-800 rounded px-2 py-1 text-xs';
                copyButton.textContent = 'Sao chép';
                copyButton.onclick = function() {
                    const code = block.textContent;
                    navigator.clipboard.writeText(code).then(() => {
                        copyButton.textContent = 'Đã sao chép!';
                        setTimeout(() => {
                            copyButton.textContent = 'Sao chép';
                        }, 2000);
                    }).catch(err => {
                        console.error('Không thể sao chép code:', err);
                    });
                };
                
                // Thêm position relative cho pre tag để có thể định vị button
                if (preTag) {
                    preTag.style.position = 'relative';
                    preTag.appendChild(copyButton);
                }
            }
        });
    } catch (error) {
        console.error('Lỗi khi highlight code:', error);
    }
}

// Xử lý gửi tin nhắn
async function handleSendMessage() {
    const message = messageInput.value.trim();
    const filesToSend = [...attachedFiles]; // Tạo bản sao mảng files
    
    // Kiểm tra có nội dung cần gửi không
    if (!message && filesToSend.length === 0) return;
    
    // Xóa nội dung input và file đính kèm
    addMessageToChat(message || 'Đã gửi file', true, filesToSend);
    messageInput.value = '';
    filePreviewContainer.innerHTML = '';
    attachedFiles = [];
    fileInput.value = '';
    
    // Lấy conversationId từ phiên hiện tại (nếu có)
    let conversationId = '';
    if (currentSessionId) {
        const session = chatSessions.find(s => s.id === currentSessionId);
        if (session && session.conversationId) {
            conversationId = session.conversationId;
        }
    }

    if (message) {
        const { answer, conversationId: newConversationId, error } = await callChatbotAPI(message, conversationId);
        
        // Không cần thêm message khi streaming vì đã tạo trước đó
        
        // Nếu không có lỗi và phiên chat đang dùng tên mặc định, cập nhật tên phiên chat
        if (!error && currentSessionId) {
            const session = chatSessions.find(s => s.id === currentSessionId);
            if (session && session.name.startsWith('Chat ') && message.length > 0) {
                // Tạo tên phiên chat từ tin nhắn đầu tiên của người dùng
                session.name = message.length > 25 ? message.substring(0, 22) + '...' : message;
                saveChatSessions();
                updateHistorySidebar();
            }
        }
    } else if (filesToSend.length > 0) {
        // Xử lý khi chỉ gửi file, không có nội dung tin nhắn
        showLoading(true);
        // Giả lập xử lý file
        await new Promise(resolve => setTimeout(resolve, 1000));
        showLoading(false);
        
        // Giả lập phản hồi khi nhận file
        addMessageToChat('Cảm ơn bạn đã gửi file. Tôi đã nhận được và sẽ xem xét nội dung.', false);
    }
}

// Hiển thị tin nhắn chào mừng
function showWelcomeMessage() {
    setTimeout(() => {
        const welcomeMessage = "Xin chào! Tôi là Trợ lý AI của Đại học Ngân hàng TP.HCM. Tôi có thể giúp bạn trả lời các câu hỏi về tuyển sinh, chương trình đào tạo, học phí, và các thông tin khác về trường. Bạn cần hỗ trợ gì?";
        addMessageToChat(welcomeMessage, false);
        
        // Thêm class welcome-message để có animation riêng
        const lastMessage = chatContainer.lastElementChild;
        if (lastMessage) {
            lastMessage.classList.add('welcome-message');
        }
    }, 500);
}

// Event Listeners
sendButton.addEventListener('click', handleSendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

newChatButton.addEventListener('click', startNewChat);
clearHistoryButton.addEventListener('click', clearChatHistory);

recordButton.addEventListener('click', toggleRecording);

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Thêm files vào mảng
    attachedFiles.push(...files);
    
    // Xóa previews cũ
    filePreviewContainer.innerHTML = '';
    
    // Hiển thị preview cho mỗi file
    attachedFiles.forEach((file, index) => {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'relative flex items-center gap-2 bg-secondary-100 p-2 rounded-lg shadow-sm hover:shadow-md transition-all';
        
        // Preview khác nhau tùy loại file
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = file.name;
            img.className = 'w-10 h-10 object-cover rounded';
            previewDiv.appendChild(img);
        } else if (file.type.includes('pdf')) {
            const icon = document.createElement('div');
            icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>`;
            previewDiv.appendChild(icon);
        } else if (file.type.includes('word') || file.type.includes('doc')) {
            const icon = document.createElement('div');
            icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>`;
            previewDiv.appendChild(icon);
        } else {
            const icon = document.createElement('div');
            icon.textContent = '📁';
            icon.className = 'text-2xl';
            previewDiv.appendChild(icon);
        }
        
        // Thông tin file
        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex flex-col';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
        nameSpan.className = 'text-xs font-medium';
        fileInfo.appendChild(nameSpan);
        
        const sizeSpan = document.createElement('span');
        sizeSpan.textContent = formatFileSize(file.size);
        sizeSpan.className = 'text-xs text-secondary-500';
        fileInfo.appendChild(sizeSpan);
        
        previewDiv.appendChild(fileInfo);
        
        // Nút xóa file
        const removeButton = document.createElement('button');
        removeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>`;
        removeButton.className = 'absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center hover:bg-red-600 hover:scale-110 transition-all';
        removeButton.onclick = (event) => {
            event.stopPropagation();
            
            // Xóa file khỏi mảng
            const fileIndex = attachedFiles.findIndex(f => f === file);
            if (fileIndex > -1) {
                attachedFiles.splice(fileIndex, 1);
            }
            
            // Xóa preview
            previewDiv.remove();
        };
        previewDiv.appendChild(removeButton);
        
        filePreviewContainer.appendChild(previewDiv);
    });
});

// Format kích thước file
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// Kiểm tra đăng nhập khi tải trang
function checkAuthentication() {
    // Kiểm tra xem đã đăng nhập chưa
    if (!isUserLoggedIn()) {
        // Nếu chưa đăng nhập, chuyển hướng về trang đăng nhập
        window.location.href = 'login.html?message=' + encodeURIComponent('Vui lòng đăng nhập để tiếp tục') + '&type=warning';
        return false;
    }
    return true;
}

/**
 * Kiểm tra trạng thái đăng nhập
 * @returns {boolean} Trạng thái đăng nhập
 */
function isUserLoggedIn() {
    try {
        const token = localStorage.getItem(AuthConfig.tokenStorage.tokenKey);
        const userData = localStorage.getItem(AuthConfig.tokenStorage.userKey);
        
        if (!token || !userData) {
            return false;
        }
        
        // Kiểm tra thời gian hết hạn
        const loginTime = parseInt(localStorage.getItem(AuthConfig.tokenStorage.timeKey) || '0');
        const currentTime = Date.now();
        
        if (currentTime - loginTime > AuthConfig.tokenStorage.expireTime) {
            // Token đã hết hạn, xóa dữ liệu đăng nhập
            clearAuthData();
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Lỗi kiểm tra đăng nhập:', error);
        return false;
    }
}

/**
 * Xử lý đăng xuất
 */
function handleUserLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        // Lưu tạm dữ liệu chat trước khi đăng xuất
        saveChatSessions();
        
        // Xóa dữ liệu xác thực
        clearAuthData();
        
        // Chuyển hướng về trang đăng nhập
        window.location.href = 'login.html?message=' + encodeURIComponent('Đăng xuất thành công') + '&type=success';
    }
}

/**
 * Xóa dữ liệu xác thực
 */
function clearAuthData() {
    localStorage.removeItem(AuthConfig.tokenStorage.tokenKey);
    localStorage.removeItem(AuthConfig.tokenStorage.userKey);
    localStorage.removeItem(AuthConfig.tokenStorage.timeKey);
}

/**
 * Hiển thị thông tin người dùng
 */
function displayUserInfo() {
    try {
        const userDataString = localStorage.getItem(AuthConfig.tokenStorage.userKey);
        if (!userDataString) return;
        
        const userData = JSON.parse(userDataString);
        const userInfoElement = document.getElementById('userInfo');
        
        if (userInfoElement && userData.name) {
            userInfoElement.textContent = userData.name;
        } else if (userInfoElement && userData.email) {
            userInfoElement.textContent = userData.email;
        }
    } catch (error) {
        console.error('Lỗi hiển thị thông tin người dùng:', error);
    }
}

/**
 * Khởi tạo chatbot
 */
function initChatbot() {
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const fileInput = document.getElementById('fileInput');
    const filePreviewContainer = document.getElementById('filePreviewContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const clearHistoryButton = document.getElementById('clearHistoryButton');
    const newChatButton = document.getElementById('newChatButton');
    const historySessions = document.getElementById('historySessions');
    const recordButton = document.getElementById('recordButton');

    // ... rest of original script.js code ...
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra đăng nhập trước khi tải chatbot
    if (!checkAuthentication()) {
        return; // Nếu chưa đăng nhập thì dừng lại
    }
    
    // Xử lý nút đăng xuất
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleUserLogout);
    }
    
    // Hiển thị thông tin người dùng nếu có
    displayUserInfo();
    
    // Tải các phiên chat
    loadChatSessions();
    initSpeechRecognition();
    
    // Set sự kiện cho form input để tránh reload trang
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSendMessage();
        });
    }
    
    // Kết nối cho nút chat mới trong sidebar
    const newChatButtonSidebar = document.getElementById('newChatButtonSidebar');
    if (newChatButtonSidebar) {
        newChatButtonSidebar.addEventListener('click', startNewChat);
    }
});

/**
 * Xóa một phiên chat
 * @param {string} sessionId - ID của phiên chat cần xóa
 */
function deleteSession(sessionId) {
    const sessionElement = document.getElementById(`session-${sessionId}`);
    if (!sessionElement) return;
    
    // Hiển thị hộp thoại xác nhận
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    confirmDialog.innerHTML = `
        <div class="bg-[#343541] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-semibold text-white mb-4">Xác nhận xóa</h3>
            <p class="text-gray-300 mb-6">Bạn có chắc chắn muốn xóa phiên chat này không?</p>
            <div class="flex justify-end gap-3">
                <button id="cancel-delete" class="px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors">Hủy</button>
                <button id="confirm-delete" class="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors">Xóa</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmDialog);
    
    // Xử lý sự kiện nút
    document.getElementById('cancel-delete').addEventListener('click', () => {
        document.body.removeChild(confirmDialog);
    });
    
    document.getElementById('confirm-delete').addEventListener('click', () => {
        // Tìm và lưu phiên chat bị xóa vào sessionStorage để có thể khôi phục
        const sessionIndex = chatSessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex !== -1) {
            const deletedSession = chatSessions[sessionIndex];
            sessionStorage.setItem('lastDeletedSession', JSON.stringify(deletedSession));
            
            // Xóa phiên khỏi danh sách
            chatSessions.splice(sessionIndex, 1);
            
            // Lưu vào localStorage
            saveChatSessions();
            
            // Chọn phiên chat mới nếu phiên bị xóa đang được chọn
            if (currentSessionId === sessionId) {
                if (chatSessions.length > 0) {
                    loadSession(chatSessions[0].id);
                } else {
                    // Tạo phiên mới nếu không còn phiên nào
                    startNewChat();
                }
            }
            
            // Cập nhật giao diện
            updateHistorySidebar();
            
            // Hiển thị thông báo với nút khôi phục
            showNotificationWithAction(
                'Đã xóa phiên chat',
                'Khôi phục',
                () => recoverLastDeletedSession()
            );
        }
        
        // Đóng hộp thoại
        document.body.removeChild(confirmDialog);
    });
}

/**
 * Hiển thị thông báo đơn giản
 * @param {string} message - Nội dung thông báo
 * @param {string} [type='info'] - Loại thông báo: 'info', 'success', 'warning', 'error'
 * @param {number} [duration=3000] - Thời gian hiển thị thông báo (ms)
 * @returns {HTMLElement} Phần tử thông báo
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Tạo phần tử thông báo
    const notification = document.createElement('div');
    
    // Xác định màu sắc dựa vào loại thông báo
    let bgColor, textColor, iconSvg;
    
    switch (type) {
        case 'success':
            bgColor = 'bg-green-500';
            textColor = 'text-white';
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>`;
            break;
        case 'warning':
            bgColor = 'bg-yellow-500';
            textColor = 'text-white';
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>`;
            break;
        case 'error':
            bgColor = 'bg-red-500';
            textColor = 'text-white';
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>`;
            break;
        default: // info
            bgColor = 'bg-blue-500';
            textColor = 'text-white';
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`;
    }
    
    // Thiết lập nội dung và kiểu dáng thông báo
    notification.className = `fixed bottom-4 right-4 ${bgColor} ${textColor} px-4 py-3 rounded-lg shadow-lg z-50 flex items-center transform translate-y-20 opacity-0 transition-all duration-300`;
    notification.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
    `;
    
    // Thêm vào DOM
    document.body.appendChild(notification);
    
    // Hiệu ứng hiển thị
    setTimeout(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    }, 10);
    
    // Tự động đóng sau thời gian
    const timeoutId = setTimeout(() => {
        notification.style.transform = 'translateY(20px)';
        notification.style.opacity = '0';
        
        // Xóa phần tử sau khi hiệu ứng hoàn tất
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, duration);
    
    // Dừng đếm ngược khi hover
    notification.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId);
    });
    
    // Tiếp tục đếm ngược khi không hover
    notification.addEventListener('mouseleave', () => {
        setTimeout(() => {
            notification.style.transform = 'translateY(20px)';
            notification.style.opacity = '0';
            
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 1000); // Thêm 1 giây trước khi đóng sau khi di chuột ra
    });
    
    return notification;
}
