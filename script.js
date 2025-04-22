const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const clearHistoryButton = document.getElementById('clearHistoryButton');
const newChatButton = document.getElementById('newChatButton');
const historySessions = document.getElementById('historySessions');
const recordButton = document.getElementById('recordButton');

// Cấu hình API (Chuẩn hóa)
const API_BASE_URL = 'http://172.20.10.44:8055/api'; // URL cơ sở chính
const CHAT_API_ENDPOINT = `${API_BASE_URL}/ChatMessages/v1/chat`;
const SESSIONS_API_ENDPOINT = `${API_BASE_URL}/ChatSessions`;

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
        getItem: function (key) {
            return memoryStorage[key] || null;
        },
        setItem: function (key, value) {
            memoryStorage[key] = String(value);
        },
        removeItem: function (key) {
            delete memoryStorage[key];
        },
        clear: function () {
            Object.keys(memoryStorage).forEach(key => {
                delete memoryStorage[key];
            });
        }
    };

    console.warn('Đang sử dụng bộ nhớ tạm thay vì localStorage. Dữ liệu sẽ bị mất khi tải lại trang.');
    showNotification('Trình duyệt không hỗ trợ lưu trữ cục bộ. Dữ liệu sẽ bị mất khi tải lại trang.', 'warning');

    // Khôi phục localStorage ban đầu khi trang được tải lại
    window.addEventListener('beforeunload', function () {
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

// Tải phiên chat từ API
async function loadChatSessions() {
    const apiUrl = SESSIONS_API_ENDPOINT;
    console.log(`Fetching history from ${apiUrl}...`);
    chatSessions = [];
    currentSessionId = null;
    historySessions.innerHTML = '<p class="text-center text-secondary-500 text-sm p-4">Đang tải lịch sử...</p>';

    try {
        const response = await fetch(apiUrl);
        // TODO: Thêm kiểm tra response.ok nếu API có thể trả về lỗi thực sự
        // if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        const data = await response.json();
        console.log('History data received:', data);

        // Giả định API luôn trả về cấu trúc { status: 'success', sessions: [...] } hoặc lỗi
        if (data && data.status === 'success' && Array.isArray(data.sessions)) {
            if (data.sessions.length === 0) {
                historySessions.innerHTML = `<p class="text-center text-secondary-500 text-sm p-4">${data.message || 'Chưa có lịch sử trò chuyện.'}</p>`;
                await startNewChat(); // Chờ tạo chat mới hoàn tất
                return;
            }

            // Map dữ liệu session từ API, bổ sung lastUpdatedAt nếu thiếu
            chatSessions = data.sessions.map((item) => ({
                id: item.id || generateUniqueId(), // Cần ID duy nhất
                userId: item.userId, // Giữ userId
                title: item.title || `Cuộc trò chuyện #${(item.id || '').substring(0, 5)}`, // Title mặc định tốt hơn
                createdAt: item.createdAt,
                lastUpdatedAt: item.lastUpdatedAt || item.createdAt || new Date(0).toISOString(), // Ưu tiên lastUpdatedAt, fallback về createdAt hoặc epoch
                messages: [], // Sẽ tải sau
                conversationId: item.conversationId || null // Giữ conversationId từ API nếu có
            }));

            // Sắp xếp theo lastUpdatedAt (mới nhất trước)
            chatSessions.sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());

            if (chatSessions.length > 0) {
                currentSessionId = chatSessions[0].id;
                updateHistorySidebar();
                await loadSessionMessages(currentSessionId); // Tải messages cho session mới nhất
            } else {
                 // Trường hợp map xong không còn session nào hợp lệ (ít xảy ra)
                 await startNewChat();
            }

        } else {
            console.error('Invalid history data format from API:', data);
            throw new Error('Dữ liệu lịch sử trả về không hợp lệ.');
        }

    } catch (error) {
        console.error('Lỗi khi tải lịch sử chat từ API:', error);
        showNotification('Không thể tải lịch sử chat từ máy chủ.', 'error');
        historySessions.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lỗi tải lịch sử.</p>';
        chatSessions = [];
        currentSessionId = null;
        // Cân nhắc không tự động startNewChat khi lỗi, để người dùng tự quyết định
        // await startNewChat();
    }
}

// Lưu phiên chat vào localStorage (CACHE/FALLBACK)
function saveChatSessions() {
    try {
        // Chỉ lưu các trường cần thiết cho cache/UI state
        const sessionsToCache = chatSessions.map(session => ({
            id: session.id,
            userId: session.userId,
            title: session.title,
            createdAt: session.createdAt,
            lastUpdatedAt: session.lastUpdatedAt,
            // Không lưu messages vào localStorage để tránh quá tải
            conversationId: session.conversationId
        }));
        localStorage.setItem('chatSessionsCache', JSON.stringify(sessionsToCache));
        // console.log('Session cache updated in localStorage');
    } catch (e) {
        console.error("Lỗi khi lưu cache session:", e);
        // Không cần thông báo lỗi này cho người dùng
    }
    // Backup vào sessionStorage không còn cần thiết nếu không có logic khôi phục phức tạp
    // backupChatSessions();
}

// Cập nhật sidebar lịch sử chat
function updateHistorySidebar() {
    historySessions.innerHTML = '';

    if (chatSessions.length === 0) {
        // Không hiển thị gì nếu không có session (loadChatSessions đã xử lý)
        return;
    }

    // Đảm bảo đã sắp xếp theo lastUpdatedAt mới nhất trước
    // Sắp xếp lại ở đây để đảm bảo nhất quán nếu có thay đổi sau load
    const sortedSessions = [...chatSessions].sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());

    sortedSessions.forEach(session => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item group flex cursor-pointer items-center rounded-lg p-3 transition-all hover:bg-secondary-100'; // Class gọn hơn
        historyItem.dataset.sessionId = session.id;

        // Highlight session hiện tại
        if (session.id === currentSessionId) {
            historyItem.classList.add('active', 'bg-primary-100');
            historyItem.style.borderLeft = '4px solid var(--color-primary-600, #b42c1c)';
            historyItem.style.paddingLeft = 'calc(0.75rem - 4px)';
        } else {
            historyItem.style.borderLeft = '4px solid transparent';
            historyItem.style.paddingLeft = '0.75rem';
        }

        // Sử dụng lastUpdatedAt để hiển thị ngày tháng
        const dateStr = session.lastUpdatedAt ? new Date(session.lastUpdatedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
        const title = session.title || `Cuộc trò chuyện #${session.id.substring(0, 5)}`;

        // Icon và cấu trúc giữ nguyên
        historyItem.innerHTML = `
            <div class="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </div>
            <div class="flex-grow overflow-hidden">
                <div class="truncate text-sm font-medium text-secondary-800" title="${title}">${title}</div>
                <div class="text-xs text-secondary-500">${dateStr || 'Không có ngày'}</div>
            </div>
            <button class="delete-session-btn absolute right-2 top-1/2 z-10 -translate-y-1/2 p-1 text-secondary-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500" data-session-id="${session.id}" title="Xóa cuộc trò chuyện">
                <svg xmlns="http://www.w3.org/2000/svg" class="pointer-events-none h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /> </svg>
            </button>
        `;

        // Event listener cho click item (không đổi)
        historyItem.addEventListener('click', async (e) => {
            if (e.target.closest('.delete-session-btn')) return;
            const clickedSessionId = historyItem.dataset.sessionId;
            if (clickedSessionId !== currentSessionId) {
                console.log(`Loading session: ${clickedSessionId}`);
                await loadSessionMessages(clickedSessionId);
            }
            if (window.innerWidth < 768) {
                document.getElementById('closeHistorySidebar')?.click();
            }
        });

        // Event listener cho nút xóa (không đổi)
        const deleteButton = historyItem.querySelector('.delete-session-btn');
        deleteButton?.addEventListener('click', (e) => {
            e.stopPropagation();
            const sessionIdToDelete = e.currentTarget.dataset.sessionId;
            console.log(`Requesting delete for session: ${sessionIdToDelete}`);
            deleteSession(sessionIdToDelete);
        });

        historySessions.appendChild(historyItem);
    });
}

// Tải UI cho một phiên chat (từ dữ liệu đã có trong chatSessions)
function loadSessionUI(sessionId) {
    const session = chatSessions.find(s => s.id === sessionId);
    chatContainer.innerHTML = ''; // Xóa tin nhắn cũ

    if (session?.messages?.length > 0) {
        hideStaticWelcomeMessage();
        // Thêm từng tin nhắn từ session.messages
        session.messages.forEach(msg => {
            // Truyền đúng các trường từ cấu trúc message đã map
            addMessageToChat(msg.content, msg.isUser, false, null, msg.timestamp);
        });
        // Cuộn xuống cuối sau khi thêm hết tin nhắn
        setTimeout(() => {
             if (chatContainer.scrollHeight > chatContainer.clientHeight) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
             }
        }, 50); // Delay nhỏ để đảm bảo render xong
    } else if (session) {
        // Session tồn tại nhưng không có messages (hoặc chưa load)
        console.log(`Session ${sessionId} UI loaded, but no messages locally.`);
        showWelcomeMessage(); // Hiển thị welcome nếu không có tin nhắn
    } else {
        console.warn(`Không tìm thấy session với ID: ${sessionId} trong mảng chatSessions.`);
        // Có thể tạo session mới hoặc hiển thị lỗi?
        startNewChat();
    }

    currentSessionId = sessionId;
    updateHistorySidebar(); // Highlight đúng session
}

// Hàm MỚI để tải messages cho một session cụ thể từ API
async function loadSessionMessages(sessionId) {
    const targetSession = chatSessions.find(s => s.id === sessionId);
    if (!targetSession) {
        console.error(`Session ${sessionId} không tồn tại trong mảng chatSessions khi gọi loadSessionMessages.`);
        return;
    }

    // Kiểm tra xem đã có messages chưa để tránh fetch lại không cần thiết
    if (targetSession.messages && targetSession.messages.length > 0) {
        console.log(`Messages for session ${sessionId} already loaded.`);
        loadSessionUI(sessionId);
        return;
    }

    const messagesApiUrl = `${SESSIONS_API_ENDPOINT}/${sessionId}`;
    console.log(`Fetching session details (including messages) for session ${sessionId} from ${messagesApiUrl}...`);

    // Hiển thị loading tạm thời trong chatContainer
    chatContainer.innerHTML = '<p class="text-center text-secondary-500 p-4">Đang tải tin nhắn...</p>';
    currentSessionId = sessionId; // Cập nhật ID hiện tại ngay
    updateHistorySidebar();

    try {
        const response = await fetch(messagesApiUrl);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Server response error fetching messages for ${sessionId}: ${response.status}`, errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const sessionData = await response.json();
        console.log(`Session data received for session ${sessionId}:`, sessionData);

        // Kiểm tra cấu trúc response
        if (!sessionData || !Array.isArray(sessionData.messages)) {
            console.error('API /api/ChatSessions/{id} không trả về mảng messages hợp lệ:', sessionData);
            throw new Error('Invalid session data format from API');
        }

        // Cập nhật mảng messages cho session trong chatSessions
        // Map dữ liệu từ API response vào cấu trúc client-side mong muốn
        targetSession.messages = sessionData.messages.map(apiMsg => ({
            id: apiMsg.id, // Giữ ID tin nhắn từ DB
            // sessionId: apiMsg.sessionId, // Không cần lưu lại vì đã có trong session cha
            // userId: apiMsg.userId, // Có thể không cần thiết ở client
            senderName: apiMsg.senderName || (apiMsg.isUser ? 'Người dùng' : 'Bot'), // Fallback senderName
            isUser: Boolean(apiMsg.isUser),
            content: apiMsg.content || '', // Đảm bảo content là string
            timestamp: apiMsg.timestamp || new Date().toISOString() // Đảm bảo có timestamp
        }));

        // Cập nhật thêm thông tin khác cho session nếu API trả về (ví dụ title có thể thay đổi)
        targetSession.title = sessionData.title || targetSession.title;
        targetSession.lastUpdatedAt = sessionData.lastUpdatedAt || targetSession.lastUpdatedAt;
        targetSession.conversationId = sessionData.conversationId || targetSession.conversationId || null;

        // Lưu cache session mới cập nhật (chỉ thông tin session, không phải messages)
        saveChatSessions();
        // Cập nhật lại sidebar nếu title hoặc lastUpdatedAt thay đổi
        updateHistorySidebar();

        // Sau khi có messages, cập nhật UI
        loadSessionUI(sessionId);

    } catch (error) {
        console.error(`Lỗi khi tải tin nhắn cho session ${sessionId}:`, error);
        showNotification(`Không thể tải tin nhắn cho cuộc trò chuyện này.`, 'error');
        chatContainer.innerHTML = '<p class="text-center text-red-500 p-4">Lỗi tải tin nhắn. Vui lòng thử lại.</p>';
        // Reset messages của session này để có thể thử lại
        if (targetSession) {
            targetSession.messages = [];
        }
    }
}

// Sửa startNewChat để tạo session qua API
async function startNewChat() {
    console.log('Starting new chat via API...');
    const apiUrl = SESSIONS_API_ENDPOINT;
    const defaultTitle = "Cuộc trò chuyện mới"; // Hoặc tạo title động nếu muốn

    // Lấy userId và token từ hàm getUserInfo()
    const userInfo = getUserInfo();
    let userId = userInfo?.userId;
    let userToken = userInfo?.token;

    if (!userId || isNaN(userId) || !userToken) {
        console.error("UserId hoặc Token không hợp lệ. Không thể tạo chat mới.", userInfo);
        showNotification("Lỗi xác thực người dùng. Không thể tạo chat mới.", "error");
        return; // Ngăn không cho tạo nếu không có userId/token hợp lệ
    }

    // Hiển thị trạng thái đang tạo (tùy chọn)
    // Ví dụ: làm mờ sidebar, hiển thị loading...

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Thêm header Authorization dựa theo tài liệu
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({
                userId: userId, // Sử dụng userId đã lấy
                title: defaultTitle
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API response error on creating session:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const newSessionData = await response.json();
        console.log('New session created via API:', newSessionData);

        // --- XỬ LÝ DỮ LIỆU SESSION MỚI TỪ API ---
        // Giả định API trả về object chứa thông tin session mới
        // Cần điều chỉnh key dựa trên cấu trúc thực tế của API
        const newSession = {
            id: newSessionData.id || generateUniqueId(), // Lấy ID từ API là quan trọng nhất
            title: newSessionData.title || defaultTitle, // Lấy title từ API hoặc dùng mặc định
            messages: [], // Session mới chưa có tin nhắn
            timestamp: newSessionData.timestamp || newSessionData.createdAt || Date.now(), // Lấy timestamp từ API
            conversationId: newSessionData.conversationId || '' // Lấy conversationId nếu API trả về
        };
        // --- KẾT THÚC XỬ LÝ DỮ LIỆU ---

        // Thêm session mới vào đầu mảng (để hiển thị lên đầu)
        chatSessions.unshift(newSession);

        // Đặt session mới là session hiện tại
        currentSessionId = newSession.id;

        // Xóa nội dung khu vực chat cũ
        chatContainer.innerHTML = '';

        // Cập nhật sidebar để hiển thị session mới
        updateHistorySidebar();

        // Tải giao diện cho session mới (sẽ thường là trống)
        // Hàm này sẽ tự động gọi showWelcomeMessage nếu session không có message
        loadSessionUI(currentSessionId);

        // Không cần gọi saveChatSessions() vì session đã được tạo trên server

    } catch (error) {
        console.error('Lỗi khi tạo phiên chat mới qua API:', error);
        showNotification('Không thể tạo cuộc trò chuyện mới. Vui lòng thử lại.', 'error');
        // Có thể cần xử lý thêm ở đây, ví dụ không chuyển session
    }
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

        // Xóa dữ liệu client-side
        chatSessions = [];
        currentSessionId = null;
        localStorage.removeItem('chatSessionsCache'); // Sử dụng đúng key
        chatContainer.innerHTML = '';
        updateHistorySidebar();

        // Hiển thị thông báo
        showNotification('Đã xóa toàn bộ lịch sử chat', 'success');

        // Đóng dialog
        document.body.removeChild(confirmDialog);

        // Bắt đầu chat mới
        startNewChat(); // Gọi startNewChat thay vì hiển thị welcome tĩnh
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
 * Khôi phục phiên chat đã xóa gần nhất (SẼ BỊ XÓA)
 * @returns {boolean} Trả về true nếu khôi phục thành công, false nếu không có phiên nào để khôi phục
 */
// function recoverLastDeletedSession() {
//     const lastDeletedSessionJSON = sessionStorage.getItem('lastDeletedSession');
//     if (!lastDeletedSessionJSON) {
//         showNotification('Không có phiên chat nào để khôi phục', 'warning');
//         return false;
//     }
//
//     try {
//         // Lấy dữ liệu phiên chat đã xóa
//         const lastDeletedSession = JSON.parse(lastDeletedSessionJSON);
//
//         // Kiểm tra xem ID đã tồn tại trong chatSessions chưa
//         if (chatSessions.some(s => s.id === lastDeletedSession.id)) {
//             // Nếu ID đã tồn tại, tạo ID mới cho phiên khôi phục
//             lastDeletedSession.id = generateUniqueId();
//         }
//
//         // Thêm phiên đã xóa vào danh sách
//         chatSessions.push(lastDeletedSession);
//
//         // Lưu lại vào localStorage
//         saveChatSessions();
//
//         // Cập nhật giao diện
//         updateHistorySidebar();
//
//         // Chọn phiên vừa khôi phục
//         loadSession(lastDeletedSession.id);
//
//         // Xóa dữ liệu phiên đã khôi phục
//         sessionStorage.removeItem('lastDeletedSession');
//
//         // Hiển thị thông báo thành công
//         showNotification('Đã khôi phục phiên chat thành công', 'success');
//
//         return true;
//     } catch (error) {
//         console.error('Lỗi khi khôi phục phiên chat:', error);
//         showNotification('Không thể khôi phục phiên chat', 'error');
//         return false;
//     }
// }

/**
 * Hiển thị thông báo với nút hành động (SẼ BỊ XÓA)
 * @param {string} message - Nội dung thông báo
 * @param {string} actionText - Văn bản nút hành động
 * @param {Function} actionCallback - Hàm callback khi nhấn nút
 * @param {number} [duration=5000] - Thời gian hiển thị (ms)
 * @returns {HTMLElement} Phần tử thông báo
 */
// function showNotificationWithAction(message, actionText, actionCallback, duration = 5000) {
//     // Tạo phần tử thông báo
//     const notification = document.createElement('div');
//     notification.className = 'fixed bottom-4 right-4 bg-secondary-800 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center min-w-[300px] max-w-md';
//     notification.style.transform = 'translateY(20px)';
//     notification.style.opacity = '0';
//     notification.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
//
//     // Tạo phần nội dung thông báo
//     const messageElement = document.createElement('div');
//     messageElement.className = 'flex-1 mr-4';
//     messageElement.textContent = message;
//
//     // Tạo nút hành động
//     const actionButton = document.createElement('button');
//     actionButton.className = 'bg-primary-600 hover:bg-primary-500 text-white px-3 py-1 rounded-md transition-colors text-sm font-medium';
//     actionButton.textContent = actionText;
//     actionButton.onclick = () => {
//         if (actionCallback && typeof actionCallback === 'function') {
//             actionCallback();
//         }
//         // Xóa thông báo sau khi nhấn nút
//         removeNotification();
//     };
//
//     // Thêm vào DOM
//     notification.appendChild(messageElement);
//     notification.appendChild(actionButton);
//     document.body.appendChild(notification);
//
//     // Hiệu ứng hiển thị
//     setTimeout(() => {
//         notification.style.transform = 'translateY(0)';
//         notification.style.opacity = '1';
//     }, 10);
//
//     // Biến để theo dõi thời gian còn lại
//     let remainingTime = duration;
//     let timeoutId = null;
//     let startTime = Date.now();
//     let isPaused = false;
//
//     // Xử lý sự kiện hover để tạm dừng thời gian tự động đóng
//     notification.addEventListener('mouseenter', () => {
//         if (timeoutId) {
//             clearTimeout(timeoutId);
//             timeoutId = null;
//             // Lưu thời gian còn lại khi hover
//             remainingTime -= (Date.now() - startTime);
//             isPaused = true;
//         }
//     });
//
//     notification.addEventListener('mouseleave', () => {
//         if (isPaused) {
//             // Tiếp tục đếm thời gian khi không hover
//             startTime = Date.now();
//             timeoutId = setTimeout(removeNotification, remainingTime);
//             isPaused = false;
//         }
//     });
//
//     // Hàm để xóa thông báo
//     function removeNotification() {
//         if (timeoutId) {
//             clearTimeout(timeoutId);
//         }
//
//         notification.style.transform = 'translateY(20px)';
//         notification.style.opacity = '0';
//
//         // Xóa phần tử sau khi hiệu ứng hoàn tất
//         setTimeout(() => {
//             if (document.body.contains(notification))
//                 document.body.removeChild(notification);
//             }
//         }, 300);
//     }
//
//     // Thiết lập thời gian tự động đóng
//     if (duration > 0) {
//         startTime = Date.now();
//         timeoutId = setTimeout(removeNotification, duration);
//     }
//
//     return notification;
// }

// Đảm bảo dữ liệu được lưu khi rời trang
window.addEventListener('beforeunload', function () {
    // Lưu dữ liệu hiện tại vào localStorage cache
    if (Array.isArray(chatSessions) && chatSessions.length > 0) {
        try {
            // localStorage.setItem('chatSessions', JSON.stringify(chatSessions)); // Key cũ
            saveChatSessions(); // Gọi hàm save chuẩn
            // sessionStorage.setItem('chatSessionsBackup', JSON.stringify(chatSessions)); // Không cần backup session nữa
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
// Sửa đổi: Thêm isStreaming flag, trả về contentDiv để cập nhật stream.
function addMessageToChat(message, isUser = false, save = true, customId = null, timestamp = null, isStreaming = false) {
    hideStaticWelcomeMessage();
    // Bỏ qua nếu không có message và không phải streaming placeholder
    if (!message && !customId && !isStreaming) return;

    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement && !welcomeElement.classList.contains('hidden')) {
        welcomeElement.classList.add('hidden');
    }

    const messageDiv = document.createElement('div');
    if (customId) messageDiv.id = customId;
    const now = timestamp ? new Date(timestamp) : new Date();
    const timeStr = formatTime(now);

    let contentDiv = null; // Biến để lưu trữ phần tử chứa nội dung

    if (isUser) {
        messageDiv.className = 'flex flex-col items-end space-y-1 animate-fade-in mb-4';
        const timeDiv = document.createElement('div');
        timeDiv.className = 'text-xs text-secondary-500 mr-2';
        timeDiv.textContent = timeStr;
        messageDiv.appendChild(timeDiv);

        contentDiv = document.createElement('div'); // Gán contentDiv cho tin nhắn user
        contentDiv.className = 'bg-primary-600 text-white px-4 py-2 rounded-t-2xl rounded-bl-2xl max-w-[85%] shadow-sm';
        contentDiv.textContent = message;
        messageDiv.appendChild(contentDiv);
    } else { // Tin nhắn của Bot
        messageDiv.className = 'flex flex-col space-y-1 animate-fade-in mb-4';
        const timeDiv = document.createElement('div');
        timeDiv.className = 'text-xs text-secondary-500 ml-2';
        timeDiv.textContent = timeStr;
        messageDiv.appendChild(timeDiv);

        const messageRow = document.createElement('div');
        messageRow.className = 'flex items-start';

        contentDiv = document.createElement('div'); // Gán contentDiv cho tin nhắn bot
        contentDiv.className = 'bg-secondary-100 text-secondary-800 px-4 py-2 rounded-t-2xl rounded-br-2xl max-w-[85%] shadow-sm message-content';

        if (isStreaming) {
            // Hiển thị placeholder cho streaming
            contentDiv.innerHTML = `<div class="ellipsis-animation"><span>.</span><span>.</span><span>.</span></div><div class="markdown-content" style="min-height: 1.5rem;"></div>`; // Thêm div markdown-content
        } else if (message) {
            // Render markdown cho message bot đã hoàn chỉnh
            contentDiv.innerHTML = `<div class="markdown-content">${renderMarkdown(message)}</div>`;
            setTimeout(() => highlightCodeBlocks(contentDiv), 10);
        } else {
            // Trường hợp khác (có thể là lỗi?)
             contentDiv.innerHTML = `<div class="markdown-content"></div>`;
        }

        messageRow.appendChild(contentDiv);
        messageDiv.appendChild(messageRow);
    }

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Lưu vào session chỉ khi save = true và *không* phải đang streaming
    if (save && !isStreaming && currentSessionId) {
        const session = chatSessions.find(s => s.id === currentSessionId);
        if (session) {
            session.messages.push({
                message: message || '', // Lưu message thực tế
                isUser,
                timestamp: now.toISOString()
            });
            saveChatSessions();
        }
    }

    // Trả về phần tử chứa nội dung markdown thực tế (hoặc chính contentDiv nếu là user)
    // Điều này cho phép cập nhật nội dung khi streaming
    return isUser ? contentDiv : contentDiv.querySelector('.markdown-content') || contentDiv;
}

// Show/Hide Loading Indicator
function showLoading(show) {
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Reusable function to handle Fetch requests with Server-Sent Events (SSE).
 * Updates a target element incrementally with Markdown rendering.
 *
 * @param {string} apiUrl The API endpoint URL.
 * @param {object} requestBody The body of the POST request.
 * @param {string} token The authorization Bearer token.
 * @param {HTMLElement} targetContentElement The HTML element whose innerHTML will be updated with the streamed content.
 * @param {Function} [onComplete] Optional callback function executed upon successful completion. Receives { fullMessage, conversationId, messageId }.
 * @param {Function} [onError] Optional callback function executed on error. Receives the error object.
 * @returns {Promise<{ fullMessage: string, conversationId: string | null, messageId: string | null }>} A promise resolving with the final data, or rejecting on error.
 */
async function handleSseStream(apiUrl, requestBody, token, targetContentElement, onComplete, onError) {
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
                            const chunkText = parsedData.answer || '';
                            const currentConvId = parsedData.conversation_id;
                            const currentMessageId = parsedData.message_id;

                            if (chunkText) {
                                fullMessage += chunkText;
                                if (targetContentElement) {
                                    targetContentElement.innerHTML = renderMarkdown(fullMessage);
                                    highlightCodeBlocks(targetContentElement); // Highlight incrementally
                                    chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll down
                                }
                            }

                            if (currentConvId) {
                                latestConversationId = currentConvId;
                            }
                            if (currentMessageId) {
                                messageId = currentMessageId;
                            }

                        } catch (e) {
                            console.error('Error parsing SSE JSON:', e, 'Data:', jsonData);
                            // Optional: Add visual indication of parsing error?
                        }
                    }
                    boundary = buffer.indexOf('\n\n');
                }
            }
             // Process remaining buffer content after stream ends
             if (buffer.trim().startsWith('data:')){
                const jsonData = buffer.trim().substring(5).trim();
                 try {
                    const parsedData = JSON.parse(jsonData);
                    const chunkText = parsedData.answer || '';
                    const currentConvId = parsedData.conversation_id;
                    const currentMessageId = parsedData.message_id;
                    if (chunkText) {
                        fullMessage += chunkText;
                        if (targetContentElement) {
                            targetContentElement.innerHTML = renderMarkdown(fullMessage);
                            highlightCodeBlocks(targetContentElement);
                        }
                    }
                     if (currentConvId) {
                         latestConversationId = currentConvId;
                     }
                     if (currentMessageId) {
                         messageId = currentMessageId;
                     }
                } catch (e) {
                    console.error('Error parsing final SSE JSON:', e, 'Data:', jsonData);
                }
            }

            // Remove loading indicator (ellipsis) from the specific message
            if (ellipsis) ellipsis.remove();

             // Ensure some content is displayed if the final message is empty
             if (!fullMessage.trim() && targetContentElement) {
                 targetContentElement.innerHTML = renderMarkdown("_(Không có nội dung phản hồi)_" );
             }

            // Call the onComplete callback if provided
            if (onComplete) {
                onComplete({ fullMessage, conversationId: latestConversationId, messageId });
            }

            // Resolve the promise with the final data
            resolve({ fullMessage, conversationId: latestConversationId, messageId });

        } catch (error) {
            console.error('Error in handleSseStream:', error);
             // Update the target element with an error message
             if (targetContentElement) {
                 const errorWrapper = targetContentElement.closest('.message-content') || targetContentElement;
                 errorWrapper.innerHTML = `<div class="markdown-content text-red-600">Xin lỗi, đã xảy ra lỗi: ${error.message}</div>`;
                 if (ellipsis) ellipsis.remove(); // Remove ellipsis on error too
             }

             // Call the onError callback if provided
             if (onError) {
                 onError(error);
             }

             // Reject the promise with the error
             reject(error);
         }
    });
}

// Xử lý gửi tin nhắn
async function handleSendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // 1. Lấy thông tin cần thiết
    let currentSession = null;
    let userId = null;
    const userInfo = getUserInfo(); // Hàm từ login.js
    console.log('User info:', userInfo);
    userId = userInfo.data.userId; // Lấy userId từ userInfo
    const userToken = userInfo.data.token; // Lấy token

    if (!userInfo || !userToken || userId === undefined || userId === null) {
        console.error("Lỗi: Không tìm thấy thông tin User hợp lệ (ID hoặc Token).");
        showNotification("Lỗi thông tin người dùng, không thể gửi tin nhắn.", "error");
        return;
    }

    if (currentSessionId) {
        currentSession = chatSessions.find(s => s.id === currentSessionId);
        if (!currentSession) {
            console.warn(`Session ID hiện tại (${currentSessionId}) không tìm thấy. Tạo session mới hoặc chọn session khác.`);
            // Có thể muốn gọi startNewChat() ở đây hoặc thông báo rõ hơn
            showNotification("Phiên trò chuyện hiện tại không hợp lệ.", "warning");
            return;
        }
    } else {
        console.warn("Không có currentSessionId. Tin nhắn sẽ không được lưu vào session nào.");
        showNotification("Vui lòng bắt đầu hoặc chọn một cuộc trò chuyện trước khi gửi tin nhắn.", "warning");
        return; // Dừng lại nếu không có session hiện tại
    }

    const conversationId = currentSession.conversationId || null;
    const messageToSend = message; // Store the message before clearing input

    // 2. Hiển thị tin nhắn người dùng trên UI
    addMessageToChat(messageToSend, true, true); // User message lưu ngay lập tức
    messageInput.value = '';
    messageInput.style.height = 'auto'; // Reset input height

    // 3. Cập nhật title nếu là tin nhắn đầu tiên (tùy chọn, giữ nguyên logic cũ)
    if (currentSession.title && currentSession.title.startsWith('Cuộc trò chuyện mới') && messageToSend.length > 0) {
        const newTitle = messageToSend.length > 25 ? messageToSend.substring(0, 22) + '...' : messageToSend;
        currentSession.title = newTitle;
        // currentSession.name = newTitle; // Assume name is not used/needed if title exists
        updateHistorySidebar();
        saveChatSessions();
        // await updateSessionTitleOnServer(currentSessionId, newTitle); // Cần API cập nhật title
    }

    // 4. Chuẩn bị gọi API Chat
    showLoading(true);
    // Tạo placeholder cho tin nhắn AI và lấy element để update
    const aiMessageContentElement = addMessageToChat(null, false, false, null, null, true);
    // Cuộn xuống cuối sau khi thêm placeholder
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const apiUrl = CHAT_API_ENDPOINT;
    const requestBody = {
        inputs: {}, // Giữ trống hoặc thêm context nếu cần
        query: messageToSend, // Tin nhắn của người dùng
        response_mode: 'streaming',
        user: String(userId), // User ID dạng string
        conversation_id: currentSessionId // Sử dụng sessionId làm conversation_id cho request
    };

    try {
         // Gọi hàm xử lý SSE stream mới
         const { fullMessage: aiFullMessage, conversationId: latestConversationId, messageId } = await handleSseStream(
             apiUrl,
             requestBody,
             userToken,
             aiMessageContentElement,
             (result) => {
                 // onComplete callback: Lưu tin nhắn AI hoàn chỉnh và conversationId vào session
                 if (currentSession) {
                     currentSession.messages.push({
                         id: result.messageId, // Lưu message ID nếu có
                         message: result.fullMessage,
                         isUser: false,
                         timestamp: new Date().toISOString()
                     });
                     currentSession.conversationId = result.conversationId; // Cập nhật ID cuối cùng
                     currentSession.lastUpdatedAt = new Date().toISOString(); // Update last updated time
                     saveChatSessions(); // Lưu lại session
                     updateHistorySidebar(); // Cập nhật sidebar để phản ánh thời gian mới
                     console.log('AI message saved to session:', { messageId: result.messageId, conversationId: result.conversationId });
                 } else {
                     console.warn("Không thể lưu tin nhắn AI vì currentSession không tồn tại sau khi stream kết thúc.");
                 }
             },
             (error) => {
                 // onError callback (optional, error already shown in placeholder)
                 console.error('SSE stream failed in handleSendMessage:', error);
                 // showNotification(`Lỗi khi nhận phản hồi: ${error.message}`, 'error'); // Không cần thiết vì lỗi đã hiển thị
             }
         );

        // Các xử lý sau khi stream thành công (nếu cần)

    } catch (error) {
        // Lỗi đã được xử lý và hiển thị bởi handleSseStream
        console.error('handleSendMessage caught an error from handleSseStream:', error);
        // showNotification(`Lỗi: ${error.message || 'Không thể kết nối tới AI'}`, 'error'); // Không cần thiết
    } finally {
        showLoading(false);
    }
}

// Hiển thị tin nhắn chào mừng - Sử dụng API Chat chính
async function showWelcomeMessage() {
    chatContainer.innerHTML = ''; // Xóa nội dung cũ
    hideStaticWelcomeMessage(); // Ẩn welcome tĩnh trong HTML (nếu có)

    console.log('Fetching welcome message using main chat API...');

    // Lấy thông tin user để gửi kèm yêu cầu
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token || !userInfo.userId) {
        console.error("Lỗi: Không tìm thấy thông tin User hợp lệ (ID hoặc Token) để lấy welcome message.");
        addMessageToChat("Chào bạn! Tôi là Trợ lý Tuyển sinh HUB. (Lỗi tải lời chào)", false, false);
        return;
    }
    const userToken = userInfo.token;
    const userId = userInfo.userId;

    // Tạo placeholder cho tin nhắn welcome
    const welcomeMessageContentElement = addMessageToChat(null, false, false, 'welcome-message-placeholder', null, true);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const apiUrl = CHAT_API_ENDPOINT;
    const requestBody = {
        inputs: {},
        query: '###__get_welcome_message__###', // Query đặc biệt
        response_mode: 'streaming',
        user: String(userId),
        conversation_id: null // Welcome message không thuộc về conversation nào trước đó
    };

    try {
        // Gọi hàm xử lý SSE stream mới cho welcome message
        await handleSseStream(
            apiUrl,
            requestBody,
            userToken,
            welcomeMessageContentElement,
            (result) => {
                // onComplete: Welcome message không cần lưu vào session
                console.log('Welcome message received:', result.fullMessage);
                 // Add class if needed (optional)
                 const welcomeDiv = welcomeMessageContentElement?.closest('.animate-fade-in');
                 if (welcomeDiv) welcomeDiv.classList.add('welcome-message');
            },
            (error) => {
                // onError: Lỗi đã được hiển thị trong placeholder
                 console.error('SSE stream failed for welcome message:', error);
                 // showNotification(`Lỗi tải lời chào: ${error.message}`, 'error'); // Không cần thiết
            }
        );

    } catch (error) {
        // Lỗi đã được xử lý và hiển thị bởi handleSseStream
        console.error("showWelcomeMessage caught an error from handleSseStream:", error);
        // Fallback nếu element không tồn tại hoặc lỗi rất sớm
        if (!welcomeMessageContentElement?.closest('.message-content')) {
            addMessageToChat("Chào bạn! Tôi là Trợ lý Tuyển sinh HUB. (Lỗi tải lời chào)", false, false);
        }
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
document.addEventListener('DOMContentLoaded', async () => { // <<< Đánh dấu là async
    console.log('DOM fully loaded and parsed');
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

    // Tải các phiên chat từ API bằng hàm đã sửa đổi
    await loadChatSessions(); // <<< Gọi hàm đã sửa
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

    // Hiển thị thông báo chào mừng hoặc tin nhắn session đã tải
    // Logic này đã được chuyển vào trong loadSessionMessages / loadSessionUI
});

/**
 * Xóa một phiên chat
 * @param {string} sessionId - ID của phiên chat cần xóa
 */
async function deleteSession(sessionId) {
    // Hiển thị hộp thoại xác nhận
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    confirmDialog.innerHTML = `
        <div class="bg-[#343541] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-semibold text-white mb-4">Xác nhận xóa</h3>
            <p class="text-gray-300 mb-6">Bạn có chắc muốn xóa cuộc trò chuyện này không?</p>
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

    document.getElementById('confirm-delete').addEventListener('click', async () => {
        // Sửa endpoint API
        const apiUrl = `${SESSIONS_API_ENDPOINT}/${sessionId}`; // Sử dụng hằng số và đúng endpoint
        console.log(`Attempting to delete session ${sessionId} via API: ${apiUrl}`);

        // Lấy token từ localStorage (Sử dụng cấu trúc data.token)
        const userInfo = getUserInfo();
        // Kiểm tra userInfo và userInfo.data trước khi truy cập token
        if (!userInfo || !userInfo.data || !userInfo.data.token) {
            showNotification('Lỗi xác thực hoặc không tìm thấy token. Không thể xóa phiên chat.', 'error');
            // Đóng dialog nếu còn
            const dialog = document.getElementById('confirmDialog');
            if(dialog) document.body.removeChild(dialog);
            return;
        }
        const userToken = userInfo.data.token; // Lấy token từ data

        // Hiển thị loading
        const confirmButton = document.getElementById('confirm-delete');
        confirmButton.textContent = 'Đang xóa...';
        confirmButton.disabled = true;

        try {
            const response = await fetch(apiUrl, {
                method: 'DELETE',
                headers: {
                    // Sửa cách truyền token
                    'Authorization': `Bearer ${userToken}`
                }
            });

            if (response.ok) {
                console.log(`Session ${sessionId} deleted successfully via API.`);
                showNotification('Đã xóa phiên chat thành công.', 'success');
                await loadChatSessions();
            } else {
                const errorText = await response.text();
                console.error(`API error deleting session ${sessionId}: ${response.status}`, errorText);
                showNotification(`Lỗi xóa phiên chat: ${response.statusText || 'Lỗi không xác định'}`, 'error');
                confirmButton.textContent = 'Xóa';
                confirmButton.disabled = false;
            }
        } catch (error) {
            // Lỗi mạng hoặc lỗi fetch
            console.error(`Network error deleting session ${sessionId}:`, error);
            showNotification('Lỗi mạng khi xóa phiên chat. Vui lòng thử lại.', 'error');
            confirmButton.textContent = 'Xóa';
            confirmButton.disabled = false;
        } finally {
            // Đóng hộp thoại (chỉ đóng nếu còn tồn tại)
            const dialog = document.getElementById('confirmDialog');
            if(dialog && document.body.contains(dialog)) {
                 document.body.removeChild(dialog);
            }
        }
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
