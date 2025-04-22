const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
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
        // console.log('Dữ liệu đã lưu trong localStorage:', storedSessions);
        
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
            
            // console.log('Đã tải được', chatSessions.length, 'phiên chat');
            
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
                        addMessageToChat(msg.message, msg.isUser, false);
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
        
        // console.log('Đã lưu', sessionsToSave.length, 'phiên chat vào localStorage');
        
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
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03 8 9 8s9-3.582 9-8z" />
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
            addMessageToChat(msg.message, msg.isUser, false, null, msg.timestamp);
        });
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    updateHistorySidebar();
}

// Sửa startNewChat gọi showWelcomeMessage dạng async
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

// Định dạng thời gian (tối ưu: trả về giờ:phút hiện tại, hoặc lấy từ timestamp nếu có)
function formatTime(date) {
    if (!date) return '';
    if (typeof date === 'string') date = new Date(date);
    if (!(date instanceof Date) || isNaN(date)) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Xóa welcome message cứng trong HTML nếu có (ẩn hoặc xóa khi đã có tin nhắn từ dify)
function hideStaticWelcomeMessage() {
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement) {
        welcomeElement.classList.add('hidden');
    }
}

// Thêm tin nhắn vào chat (tối ưu: truyền timestamp, render markdown cho bot)
function addMessageToChat(message, isUser = false, save = true, customId = null, timestamp = null) {
    hideStaticWelcomeMessage();
    if (!message && !customId) return;
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement && !welcomeElement.classList.contains('hidden')) {
        welcomeElement.classList.add('hidden');
    }
    const messageDiv = document.createElement('div');
    if (customId) messageDiv.id = customId;
    const now = timestamp ? new Date(timestamp) : new Date();
    const timeStr = formatTime(now);
    if (isUser) {
        messageDiv.className = 'flex flex-col items-end space-y-1 animate-fade-in mb-4';
        const timeDiv = document.createElement('div');
        timeDiv.className = 'text-xs text-secondary-500 mr-2';
        timeDiv.textContent = timeStr;
        messageDiv.appendChild(timeDiv);
        const contentDiv = document.createElement('div');
        contentDiv.className = 'bg-primary-600 text-white px-4 py-2 rounded-t-2xl rounded-bl-2xl max-w-[85%] shadow-sm';
        contentDiv.textContent = message;
        messageDiv.appendChild(contentDiv);
    } else {
        messageDiv.className = 'flex flex-col space-y-1 animate-fade-in mb-4';
        const timeDiv = document.createElement('div');
        timeDiv.className = 'text-xs text-secondary-500 ml-2';
        timeDiv.textContent = timeStr;
        messageDiv.appendChild(timeDiv);
        const messageRow = document.createElement('div');
        messageRow.className = 'flex items-start';
        const contentDiv = document.createElement('div');
        contentDiv.className = 'bg-secondary-100 text-secondary-800 px-4 py-2 rounded-t-2xl rounded-br-2xl max-w-[85%] shadow-sm message-content';
        // Nếu là message bot đã lưu, render markdown
        if (message) {
            contentDiv.innerHTML = renderMarkdown(message);
            setTimeout(() => highlightCodeBlocks(contentDiv), 10);
        } else if (customId) {
            contentDiv.innerHTML = `<div class="ellipsis-animation"><span>.</span><span>.</span><span>.</span></div><div class="markdown-content" style="display: none;"></div>`;
        }
        messageRow.appendChild(contentDiv);
        messageDiv.appendChild(messageRow);
    }
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    if (save && currentSessionId) {
        const session = chatSessions.find(s => s.id === currentSessionId);
        if (session) {
            session.messages.push({ 
                message: message || '', 
                isUser,
                timestamp: now.toISOString()
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
    // showTypingIndicator(); // Hiển thị hiệu ứng đang gõ

    try {
        // Tạo message placeholder để hiển thị streaming response
        const placeholderId = `msg-${Date.now()}`;
        const messageElement = addMessageToChat('', false, true, placeholderId);
        
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

        // Xử lý stream data
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = '';
        let conversationIdFromStream = '';
        let firstBotMessage = '';
        
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
                 // Placeholder đã được tạo trong addMessageToChat, không cần tạo lại ở đây 
                 // textElement = contentDiv; 
            } else {
                // Trường hợp này không nên xảy ra nếu addMessageToChat đã chạy đúng
                console.error("Không tìm thấy contentDiv cho placeholder");
                throw new Error('Không tìm thấy contentDiv cho placeholder');
                // const newContentDiv = document.createElement('div');
                // newContentDiv.className = 'bg-secondary-100 text-secondary-800 px-4 py-2 rounded-t-2xl rounded-br-2xl max-w-[85%] shadow-sm message-content';
                // messageRow.appendChild(newContentDiv);
                // textElement = newContentDiv;
            }
        }
        
        // Lấy tham chiếu đến các phần tử con
        const ellipsisDiv = messageElement.querySelector('.ellipsis-animation');
        const markdownContainer = messageElement.querySelector('.markdown-content');

        if (!ellipsisDiv || !markdownContainer) {
            console.error("Không tìm thấy phần tử ellipsis hoặc markdown trong placeholder:", messageElement);
            throw new Error('Cấu trúc placeholder không đúng.');
        }
        
        // markdownContainer.innerHTML = '...'; // Không cần đặt "..." ở đây nữa
        let isFirstChunk = true; // Cờ để kiểm tra chunk đầu tiên
        
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
                            if (!firstBotMessage && data.answer) {
                                firstBotMessage = data.answer;
                            }
                            
                            // Render nội dung markdown, xóa "..." nếu là chunk đầu tiên
                            if (isFirstChunk) {
                                if (ellipsisDiv) ellipsisDiv.style.display = 'none'; // Ẩn ellipsis
                                if (markdownContainer) markdownContainer.style.display = 'block'; // Hiện markdown container
                                markdownContainer.innerHTML = renderMarkdown(accumulatedResponse);
                                isFirstChunk = false;
                            } else {
                                markdownContainer.innerHTML = renderMarkdown(accumulatedResponse);
                            }
                            
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
                            // messageElement.classList.remove('typing'); // Bỏ class typing
                            // Đảm bảo ellipsis bị ẩn nếu stream kết thúc mà không có message event nào
                            if (isFirstChunk && ellipsisDiv) {
                                ellipsisDiv.style.display = 'none';
                                if (markdownContainer) markdownContainer.style.display = 'block'; // Hiện container rỗng nếu không có nội dung
                            }
                             
                        } else if (data.event === 'error') {
                             console.error('Lỗi từ API stream:', data);
                             if (ellipsisDiv) ellipsisDiv.style.display = 'none';
                             if (markdownContainer) {
                                markdownContainer.style.display = 'block';
                                markdownContainer.innerHTML = renderMarkdown(data.error || 'Lỗi không xác định từ API');
                             }
                             // Có thể thêm xử lý lỗi cụ thể ở đây
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
                 // Lưu lại tin nhắn cuối cùng của bot sau khi streaming hoàn tất
                if (session.messages.length > 0) {
                    const lastMessageIndex = session.messages.length - 1;
                    if (!session.messages[lastMessageIndex].isUser && session.messages[lastMessageIndex].message === '') {
                        session.messages[lastMessageIndex].message = accumulatedResponse || '(Không có phản hồi)';
                    }
                }
                saveChatSessions();
            }
        }
        
        return {
            answer: accumulatedResponse,
            conversationId: conversationIdFromStream,
            firstBotMessage
        };
    } catch (error) {
        // hideTypingIndicator(); // Ẩn hiệu ứng đang gõ khi có lỗi
        console.error('API Call Error:', error);
        
        // Nếu lỗi xảy ra sau khi đã tạo message placeholder, cập nhật lại
        const errorPlaceholder = document.getElementById(placeholderId);
        if (errorPlaceholder) {
            const ellipsisDiv = errorPlaceholder.querySelector('.ellipsis-animation');
            const markdownContainer = errorPlaceholder.querySelector('.markdown-content');
            
            if (ellipsisDiv) ellipsisDiv.style.display = 'none'; // Ẩn ellipsis khi lỗi
            if (markdownContainer) { 
                 markdownContainer.style.display = 'block'; // Hiện markdown container để hiển thị lỗi
                 markdownContainer.textContent = 'Xin lỗi, đã có lỗi xảy ra khi kết nối đến trợ lý. Vui lòng thử lại sau.';
            }
            // errorPlaceholder.classList.remove('typing'); // Bỏ class typing
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
 * Chuyển đổi văn bản markdown thành HTML (phiên bản tối ưu hơn)
 * @param {string} text - Văn bản markdown cần chuyển đổi
 * @returns {string} HTML đã được render
 */
function renderMarkdown(text) {
    if (!text) return '';
    let html = text
        // Code block
        .replace(/```([\w-]*)\n([\s\S]*?)\n```/g, (m, lang, code) => `<pre><code class="hljs language-${lang.trim()}">${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`)
        // Inline code
        .replace(/`([^`]+?)`/g, '<code class="inline-code bg-secondary-100 text-secondary-800 px-1 rounded font-mono">$1</code>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Link
        .replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" target="_blank" class="text-primary-600 hover:underline">$1</a>')
        // Blockquote
        .replace(/^> (.*)$/gm, '<blockquote class="pl-4 border-l-4 border-primary-500 italic my-4 text-secondary-600">$1</blockquote>')
        // Header
        .replace(/^### (.*)$/gm, '<h3 class="text-lg font-bold my-2">$1</h3>')
        .replace(/^## (.*)$/gm, '<h2 class="text-xl font-bold my-3">$1</h2>')
        .replace(/^# (.*)$/gm, '<h1 class="text-2xl font-bold my-4">$1</h1>')
        // Unordered list
        .replace(/^\s*[-*] (.*)$/gm, '<ul class="my-2"><li class="ml-4 list-disc">$1</li></ul>')
        // Ordered list
        .replace(/^\s*\d+\. (.*)$/gm, '<ol class="my-2"><li class="ml-4 list-decimal">$1</li></ol>')
        // Paragraph
        .replace(/\n{2,}/g, '</p><p class="my-2">')
        .replace(/^(?!<h\d|<ul|<ol|<blockquote|<pre|<p)(.+)$/gm, '<p class="my-2">$1</p>');
    // Dọn dẹp thẻ p lồng nhau
    html = html.replace(/<p class="my-2">\s*<\/p>/g, '');
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
    
    // Kiểm tra có nội dung cần gửi không
    if (!message) return;
    
    // Xóa nội dung input
    addMessageToChat(message, true);
    messageInput.value = '';
    
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
    } else {
        // Xử lý khi không có nội dung tin nhắn (trước đây là chỉ gửi file)
        // Có thể thêm thông báo yêu cầu nhập tin nhắn
        showNotification('Vui lòng nhập tin nhắn để gửi', 'warning');
    }
}

// Hiển thị tin nhắn chào mừng từ dify (không hard code, chỉ 1 tin nhắn duy nhất, không lưu vào session)
async function showWelcomeMessage() {
    chatContainer.innerHTML = '';
    hideStaticWelcomeMessage();
    // Gọi API lấy chào mừng, KHÔNG lưu vào chatSessions/messages
    const { firstBotMessage } = await callChatbotAPI('###__get_welcome_message__###', '');
    if (firstBotMessage) {
        // Hiển thị chào mừng nhưng không lưu vào session.messages
        addMessageToChat(firstBotMessage, false, false);
        const lastMessage = chatContainer.lastElementChild;
        if (lastMessage) lastMessage.classList.add('welcome-message');
    }
}

// Lấy danh sách lịch sử chat từ API Directus
async function fetchChatSessionsFromAPI() {
    try {
        const response = await fetch('http://172.20.10.44:8055/api/ChatSessions');
        if (!response.ok) throw new Error('Lỗi khi lấy lịch sử chat từ API');
        const data = await response.json();
        // data có thể là { data: [...] } hoặc mảng trực tiếp
        return Array.isArray(data) ? data : (data.data || []);
    } catch (err) {
        console.error('Không thể lấy lịch sử chat từ API:', err);
        return [];
    }
}

// Gọi API và cập nhật sidebar lịch sử chat khi load trang
async function updateHistorySidebarFromAPI() {
    const apiSessions = await fetchChatSessionsFromAPI();
    if (Array.isArray(apiSessions) && apiSessions.length > 0) {
        historySessions.innerHTML = '';
        apiSessions.forEach(session => {
            const sessionItem = document.createElement('div');
            sessionItem.className = 'p-3 rounded-lg cursor-pointer text-sm truncate flex justify-between items-center mb-2 transition-all hover:shadow-hover bg-secondary-100 text-secondary-700 hover:bg-secondary-200';
            sessionItem.innerHTML = `<div class='flex-grow truncate'><div class='font-medium truncate'>${session.Title || 'Chat không tên'}</div><div class='text-xs text-secondary-500 truncate mt-1'>${session.CreatedAt ? new Date(session.CreatedAt).toLocaleString('vi-VN') : ''}</div></div>`;
            historySessions.appendChild(sessionItem);
        });
    }
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

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra đăng nhập trước khi tải chatbot
    if (!checkAuthentication()) {
         // Nếu chưa đăng nhập, hàm checkAuthentication đã xử lý chuyển hướng.
         // Không cần thực hiện các hành động tải chat phía dưới.
         return; // Dừng thực thi tiếp trong sự kiện này
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
    // updateHistorySidebarFromAPI(); // Tạm thời comment nếu chưa dùng API
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
