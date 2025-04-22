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

// Tải phiên chat từ API
async function loadChatSessions() { // <<< Đánh dấu là async
    const apiUrl = 'http://172.20.10.44:8055/api/ChatSessions';
    console.log(`Fetching history from ${apiUrl}...`);
    chatSessions = []; // Reset trước khi tải
    currentSessionId = null;
    historySessions.innerHTML = '<p class="text-center text-secondary-500 text-sm p-4">Đang tải lịch sử...</p>'; // Hiển thị loading

    try {
        const response = await fetch(apiUrl);
        // Không cần kiểm tra response.ok nữa nếu API luôn trả về 200 và có status riêng
        const data = await response.json();
        console.log('History data received:', data);

        // Kiểm tra status và sự tồn tại của mảng sessions từ response
        if (data && data.status === 'success' && Array.isArray(data.sessions)) {
            if (data.sessions.length === 0) {
                // API trả về thành công nhưng không có session nào
                historySessions.innerHTML = `<p class="text-center text-secondary-500 text-sm p-4">${data.message || 'Chưa có lịch sử trò chuyện.'}</p>`;
                // Không có session cũ, bắt đầu chat mới
                startNewChat(); // Gọi startNewChat để tạo session mới qua API
                return; // Kết thúc hàm ở đây
            }

            // Có sessions, xử lý định dạng lại
            const formattedSessions = data.sessions.map((item, index) => ({
                id: item.id || item.sessionId || generateUniqueId(),
                title: item.title || item.summary || `Cuộc trò chuyện #${index + 1}`,
                messages: item.messages || [], // Giả định API có thể trả về messages hoặc không
                timestamp: item.timestamp || item.createdAt || item.updatedAt || Date.now(),
                conversationId: item.conversationId || ''
            }));

            chatSessions = formattedSessions;

            // Sắp xếp và chọn session mới nhất làm session hiện tại
            chatSessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            currentSessionId = chatSessions[0].id;

            // Cập nhật sidebar trước khi tải messages
            updateHistorySidebar();

            // Tải tin nhắn cho session mới nhất
            await loadSessionMessages(currentSessionId);

        } else {
            // API không trả về status success hoặc sessions không phải mảng
            console.error('Invalid data format from API:', data);
            throw new Error('Dữ liệu lịch sử trả về không hợp lệ.');
        }

    } catch (error) {
        console.error('Lỗi khi tải lịch sử chat từ API:', error);
        showNotification('Không thể tải lịch sử chat từ máy chủ.', 'error');
        historySessions.innerHTML = '<p class="text-center text-red-500 text-sm p-4">Lỗi tải lịch sử.</p>';
        chatSessions = []; // Đảm bảo mảng rỗng khi lỗi
        currentSessionId = null;
        // Có thể hiển thị nút thử lại hoặc bắt đầu chat mới
         startNewChat(); // Hoặc không làm gì cả tùy vào UX mong muốn
    }
    // Không cần gọi updateHistorySidebar() ở finally nữa
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
    // Xóa nội dung cũ trước khi thêm mới
    historySessions.innerHTML = '';

    // Kiểm tra lại nếu mảng chatSessions rỗng sau khi các thao tác (ví dụ: lỗi API)
    if (chatSessions.length === 0) {
        // Không cần hiển thị gì ở đây nữa vì loadChatSessions đã xử lý trường hợp rỗng ban đầu
        // Hoặc bạn có thể thêm lại thông báo nếu muốn nó xuất hiện cả khi xóa hết session
        // historySessions.innerHTML = '<p class="text-center text-secondary-500 text-sm p-4">Chưa có lịch sử trò chuyện.</p>';
        return;
    }

    // Sắp xếp các phiên theo thời gian mới nhất trước (đã sắp xếp trong loadChatSessions, nhưng để đây cho chắc)
    const sortedSessions = [...chatSessions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    sortedSessions.forEach(session => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item flex items-center p-3 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-all cursor-pointer relative group';
        historyItem.dataset.sessionId = session.id; // Lưu ID vào data attribute

        // Highlight session hiện tại
        if (session.id === currentSessionId) {
            historyItem.classList.add('active', 'bg-primary-100');
            historyItem.style.borderLeft = '4px solid var(--color-primary-600, #b42c1c)';
            historyItem.style.paddingLeft = 'calc(0.75rem - 4px)'; // Điều chỉnh padding
        } else {
             historyItem.style.borderLeft = '4px solid transparent';
             historyItem.style.paddingLeft = '0.75rem';
        }

        const dateStr = session.timestamp ? new Date(session.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year:'numeric' }) : '';
        const title = session.title || `Cuộc trò chuyện #${session.id.substring(0, 5)}`;

        historyItem.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </div>
            <div class="flex-grow overflow-hidden">
                <div class="text-sm font-medium text-secondary-800 truncate" title="${title}">${title}</div>
                <div class="text-xs text-secondary-500">${dateStr}</div>
            </div>
            <button class="delete-session-btn absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-secondary-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10" data-session-id="${session.id}" title="Xóa cuộc trò chuyện">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /> </svg>
            </button>
        `;

        historyItem.addEventListener('click', async (e) => { // <<< Đánh dấu là async
            // Không load session nếu click vào nút xóa
            if (e.target.closest('.delete-session-btn')) {
                return;
            }
            const clickedSessionId = historyItem.dataset.sessionId;
            if (clickedSessionId !== currentSessionId) {
                 console.log(`Loading session: ${clickedSessionId}`);
                 // Tải messages cho session được click
                 await loadSessionMessages(clickedSessionId); // <<< Gọi hàm tải message
                 // loadSessionUI(clickedSessionId); // Không gọi UI trực tiếp nữa
            }
            // Đóng sidebar trên mobile khi chọn session
            if (window.innerWidth < 768) {
                const closeButton = document.getElementById('closeHistorySidebar');
                if (closeButton) closeButton.click();
            }
        });

        // Thêm event listener cho nút xóa
        const deleteButton = historyItem.querySelector('.delete-session-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Ngăn sự kiện click của item cha
                const sessionIdToDelete = e.currentTarget.dataset.sessionId;
                console.log(`Requesting delete for session: ${sessionIdToDelete}`);
                // Nên có xác nhận trước khi xóa?
                 deleteSession(sessionIdToDelete); // Cần đảm bảo hàm này gọi API xóa
            });
        }

        historySessions.appendChild(historyItem);
    });
}

// Tải một phiên chat cụ thể (CHỈ TÌM TRONG MẢNG HIỆN TẠI)
// Hàm này KHÔNG fetch messages từ API
function loadSessionUI(sessionId) {
    const session = chatSessions.find(s => s.id === sessionId);
    chatContainer.innerHTML = ''; // Xóa tin nhắn cũ

    if (session && session.messages && session.messages.length > 0) {
         hideStaticWelcomeMessage();
        session.messages.forEach(msg => {
            addMessageToChat(msg.message, msg.isUser, false, null, msg.timestamp);
        });
         // Cuộn xuống cuối
         setTimeout(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
    } else if (session) {
        // Session tồn tại nhưng không có messages (cần fetch) hoặc là session mới
         // Có thể hiển thị loading hoặc welcome message tùy logic
         console.log(`Session ${sessionId} loaded, but no messages locally. Fetching or showing welcome.`);
         // Nếu là session mới hoàn toàn, showWelcomeMessage() sẽ được gọi sau đó
         // Nếu là session cũ chưa fetch messages, loadSessionMessages sẽ xử lý
         if (session.messages && session.messages.length === 0 && chatSessions.length > 1) {
            // Có thể là session cũ không có tin nhắn, hiển thị welcome tùy chỉnh?
             showWelcomeMessage(); // Hoặc một thông báo khác
         } else if (!session.messages) {
             // Trường hợp messages là undefined hoặc null - đợi fetch
             chatContainer.innerHTML = '<p class="text-center text-secondary-500 p-4">Đang tải tin nhắn...</p>';
         } else {
              showWelcomeMessage(); // Mặc định hiển thị welcome nếu không có tin nhắn
         }

    } else {
        console.warn(`Không tìm thấy session với ID: ${sessionId} trong mảng chatSessions.`);
        // Có thể tạo session mới hoặc hiển thị lỗi
        startNewChat();
    }
    
    // Chỉ cập nhật currentSessionId và sidebar sau khi UI được cập nhật
    currentSessionId = sessionId;
    updateHistorySidebar(); // Để highlight đúng session
}

// Hàm MỚI để tải messages cho một session cụ thể từ API
async function loadSessionMessages(sessionId) {
    const session = chatSessions.find(s => s.id === sessionId);
    // Nếu session đã có messages rồi thì không cần fetch lại (trừ khi muốn refresh)
    // if (session && session.messages && session.messages.length > 0) {
    //     console.log(`Messages for session ${sessionId} already loaded.`);
    //     loadSessionUI(sessionId); // Cập nhật UI với message đã có
    //     return;
    // }

    // *** THAY THẾ URL NÀY BẰNG ENDPOINT API LẤY MESSAGE THỰC TẾ ***
    const messagesApiUrl = `http://172.20.10.44:8055/api/ChatSessions/${sessionId}`; // URL MỚI ĐÃ SỬA
    console.log(`Fetching session details (including messages) for session ${sessionId} from ${messagesApiUrl}...`);

     // Hiển thị loading tạm thời trong chatContainer
    chatContainer.innerHTML = '<p class="text-center text-secondary-500 p-4">Đang tải tin nhắn...</p>';
    currentSessionId = sessionId; // Cập nhật ID hiện tại ngay
    updateHistorySidebar();

    try {
        const response = await fetch(messagesApiUrl);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Server response error fetching messages for ${sessionId}:`, errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        //const messagesData = await response.json(); // Dữ liệu trả về là object session, không phải chỉ messages
        const sessionData = await response.json();
        console.log(`Session data received for session ${sessionId}:`, sessionData);

        // Giả sử API trả về một OBJECT session chứa mảng messages:
        // { id: '...', title: '...', messages: [{...}, {...}] }
        // Cần điều chỉnh dựa trên cấu trúc thực tế
        if (!sessionData || !Array.isArray(sessionData.messages)) {
             console.error('Session API did not return expected format (object with messages array):', sessionData);
             throw new Error('Invalid session data format from API');
        }

        // Cập nhật mảng messages cho session tương ứng trong chatSessions
        const targetSession = chatSessions.find(s => s.id === sessionId);
        if (targetSession) {
            // Cập nhật messages từ dữ liệu API
            targetSession.messages = sessionData.messages.map(msg => ({
                message: msg.content || msg.message || '', // Điều chỉnh key dựa vào API
                isUser: msg.isUser || (msg.role === 'user'), // Điều chỉnh key/logic dựa vào API
                timestamp: msg.timestamp || msg.createdAt || Date.now() // Điều chỉnh key dựa vào API
                 // id: msg.id || undefined // Lưu message ID nếu có
            }));
            // Cập nhật thêm thông tin khác nếu cần (title, conversationId...)
            targetSession.title = sessionData.title || targetSession.title;
            targetSession.conversationId = sessionData.conversationId || targetSession.conversationId;

            // Có thể cần lưu lại vào localStorage nếu bạn muốn cache tin nhắn
            // saveChatSessions();
        } else {
            console.error(`Session ${sessionId} not found after fetching messages?`);
            // Xử lý lỗi này, có thể tạo session mới?
        }

        // Sau khi có messages, cập nhật UI
        loadSessionUI(sessionId);

    } catch (error) {
        console.error(`Lỗi khi tải tin nhắn cho session ${sessionId}:`, error);
        showNotification(`Không thể tải tin nhắn cho cuộc trò chuyện này.`, 'error');
        chatContainer.innerHTML = '<p class="text-center text-red-500 p-4">Lỗi tải tin nhắn. Vui lòng thử lại.</p>';
        // Có thể xóa messages[] của session này để thử lại lần sau?
        const targetSession = chatSessions.find(s => s.id === sessionId);
        if (targetSession) {
            targetSession.messages = []; // Reset messages khi lỗi
        }
    }
}

// Sửa startNewChat để tạo session qua API
async function startNewChat() { // <<< Đánh dấu là async
    console.log('Starting new chat via API...');
    const apiUrl = 'http://172.20.10.44:8055/api/ChatSessions';
    const defaultTitle = "Cuộc trò chuyện mới"; // Hoặc tạo title động nếu muốn

    // Lấy userId từ localStorage (Key là 'apiUserInfo')
    let userId = 0; // Giá trị mặc định nếu không lấy được
    try {
        const userInfoString = localStorage.getItem('apiUserInfo');
        if (userInfoString) {
            const userInfo = JSON.parse(userInfoString);
            if (userInfo && userInfo.data && userInfo.data.userId) {
                userId = parseInt(userInfo.data.userId, 10); // Lấy userId từ data object
            } else {
                console.warn("Dữ liệu người dùng trong localStorage không đúng định dạng (thiếu data.userId).", userInfo);
            }
        } else {
            console.warn("Không tìm thấy thông tin người dùng ('apiUserInfo') trong localStorage.");
        }
    } catch (error) {
        console.error("Lỗi khi đọc hoặc parse thông tin người dùng từ localStorage:", error);
        // Có thể thông báo lỗi cho người dùng
        showNotification("Lỗi lấy thông tin người dùng. Không thể tạo chat mới.", "error");
        return; // Dừng lại nếu lỗi nghiêm trọng
    }

    if (userId === 0 || isNaN(userId)) {
        console.error("UserId không hợp lệ sau khi lấy từ localStorage. Không thể tạo chat mới.");
        showNotification("Lỗi xác thực người dùng. Không thể tạo chat mới.", "error");
        return; // Ngăn không cho tạo nếu không có userId hợp lệ
    }

    // Hiển thị trạng thái đang tạo (tùy chọn)
    // Ví dụ: làm mờ sidebar, hiển thị loading...

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Thêm header Authorization nếu API yêu cầu
                // 'Authorization': `Bearer ${your_token}`
            },
            body: JSON.stringify({
                userId: userId, // <<< Sử dụng userId đã lấy và parse được
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
        // Cần điều chỉnh key dựa trên cấu trúc thực tế của API response
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

// Xử lý gửi tin nhắn - ĐÃ SỬA ĐỂ DÙNG sendChatMessage
async function handleSendMessage() {
    const message = messageInput.value.trim();
    
    // Kiểm tra có nội dung cần gửi không
    if (!message) return;
    
    // Thêm tin nhắn người dùng vào UI và xóa input
    addMessageToChat(message, true);
    messageInput.value = '';
    
    // Lấy conversationId từ phiên hiện tại (nếu có)
    let currentConversationIdForAPI = null; // Default là null cho API
    let currentSession = null;
    if (currentSessionId) {
        currentSession = chatSessions.find(s => s.id === currentSessionId);
        if (currentSession && currentSession.conversationId) {
            currentConversationIdForAPI = currentSession.conversationId;
        }
    }

    // Hiển thị tạm thời hiệu ứng loading hoặc tin nhắn chờ
    const loadingMsgElement = addMessageToChat('', false, false, `loading-${Date.now()}`); // Tạo tin nhắn chờ
    // (Cần CSS cho .ellipsis-animation hoặc nội dung chờ khác)
    const loadingContent = loadingMsgElement.querySelector('.message-content');
    if (loadingContent) {
        loadingContent.innerHTML = `<div class="ellipsis-animation"><span>.</span><span>.</span><span>.</span></div>`;
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Gọi API chat từ chat.js
    const responseData = await sendChatMessage(message, currentConversationIdForAPI);

    // Xóa tin nhắn loading
    loadingMsgElement.remove();

    if (responseData) {
        // Thêm tin nhắn phản hồi của bot vào UI
        // Giả sử responseData.response chứa tin nhắn trả về
        const botMessage = responseData.response || "Xin lỗi, tôi không nhận được phản hồi.";
        addMessageToChat(botMessage, false, true); // Lưu tin nhắn bot vào session
        
        // Cập nhật conversationId nếu API trả về và khác với cái hiện tại
        const newConversationId = responseData.conversation_id;
        if (newConversationId && currentSession && newConversationId !== currentSession.conversationId) {
            console.log(`Updated conversation ID for session ${currentSessionId} to ${newConversationId}`);
            currentSession.conversationId = newConversationId;
            saveChatSessions(); // Lưu lại session với conversation ID mới
        }
        
        // Nếu không có lỗi và phiên chat đang dùng tên mặc định, cập nhật tên phiên chat
        if (currentSession && currentSession.name.startsWith('Chat ') && message.length > 0) {
            // Tạo tên phiên chat từ tin nhắn đầu tiên của người dùng
            currentSession.name = message.length > 25 ? message.substring(0, 22) + '...' : message;
            saveChatSessions();
            updateHistorySidebar();
        }

    } else {
        // Xử lý lỗi khi gọi API (sendChatMessage trả về null)
        addMessageToChat('Xin lỗi, đã có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại.', false, false); // Không lưu tin nhắn lỗi vào session
    }
}

// Hiển thị tin nhắn chào mừng - CẦN ĐIỀU CHỈNH NẾU API WELCOME KHÁC
// Hiện tại đang giữ lại logic cũ gọi callChatbotAPI cho welcome message.
// Nếu API welcome của bạn khác, cần sửa hàm này.
async function showWelcomeMessage() {
    chatContainer.innerHTML = '';
    hideStaticWelcomeMessage();
    
    // TẠM THỜI: Gọi API chat mới với query đặc biệt nếu cần
    // Hoặc hiển thị tin nhắn chào mừng tĩnh nếu không có API riêng
    // const welcomeResponse = await sendChatMessage("__GET_WELCOME__", null);
    // if (welcomeResponse && welcomeResponse.response) {
    //    addMessageToChat(welcomeResponse.response, false, false);
    // } else {
    //    addMessageToChat("Chào bạn! Tôi có thể giúp gì?", false, false);
    // }
    
    // GIỮ LOGIC CŨ CHO WELCOME (có thể cần thay đổi sau)
    try {
        const { firstBotMessage } = await callChatbotAPI_forWelcomeOnly('###__get_welcome_message__###', '');
        if (firstBotMessage) {
            addMessageToChat(firstBotMessage, false, false); 
            const lastMessage = chatContainer.lastElementChild;
            if (lastMessage) lastMessage.classList.add('welcome-message');
        } else {
             addMessageToChat("Chào mừng bạn đến với Trợ lý AI! Bạn cần hỗ trợ gì?", false, false);
        }
    } catch (welcomeError) {
         console.error("Error getting welcome message:", welcomeError);
         addMessageToChat("Chào mừng bạn đến với Trợ lý AI! Rất tiếc, tôi không thể tải lời chào tự động.", false, false);
    }
}

// TẠO BẢN SAO CỦA callChatbotAPI CHỈ ĐỂ DÙNG CHO WELCOME MESSAGE
// ĐIỀU NÀY LÀ TẠM THỜI - NÊN CÓ API WELCOME RIÊNG HOẶC DÙNG sendChatMessage
async function callChatbotAPI_forWelcomeOnly(message, conversationId = '') {
    try {
        const response = await fetch('http://trolyai.hub.edu.vn/v1/chat-messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                inputs: {},
                query: message,
                response_mode: 'streaming',
                conversation_id: conversationId,
                user: 'user'
            })
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let firstBotMessage = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
            for (const line of lines) {
                const data = JSON.parse(line.substring(6));
                if (data.event === 'message' && data.answer && !firstBotMessage) {
                    firstBotMessage = data.answer;
                    // Có thể break sớm nếu chỉ cần tin nhắn đầu tiên
                     break; 
                }
            }
             if (firstBotMessage) break; // Thoát vòng lặp ngoài nếu đã có tin nhắn đầu
        }
        return { firstBotMessage };
    } catch (error) {
        console.error('Welcome API Call Error:', error);
        return { firstBotMessage: null }; // Trả về null nếu lỗi
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
async function deleteSession(sessionId) { // <<< Đánh dấu là async
    // Tạm thời bỏ qua tìm element vì chúng ta sẽ xóa dựa trên API
    // const sessionElement = document.getElementById(`session-${sessionId}`);
    // if (!sessionElement) return;
    
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
    
    document.getElementById('confirm-delete').addEventListener('click', async () => { // <<< Đánh dấu là async
        const apiUrl = `http://172.20.10.44:8055/api/ChatSessions/${sessionId}`;
        console.log(`Attempting to delete session ${sessionId} via API: ${apiUrl}`);

        // Lấy token từ localStorage
        const userInfo = getUserInfo(); // Hàm này cần được định nghĩa và hoạt động
        console.log('User info:', userInfo);
        if (!userInfo || !userInfo.token) {
            showNotification('Lỗi xác thực. Không thể xóa phiên chat.', 'error');
            document.body.removeChild(confirmDialog);
            return;
        }

        // Hiển thị loading
        const confirmButton = document.getElementById('confirm-delete');
        confirmButton.textContent = 'Đang xóa...';
        confirmButton.disabled = true;

        try {
            const response = await fetch(apiUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${userInfo.token}`
                }
            });

            if (response.ok) { 
                console.log(`Session ${sessionId} deleted successfully via API.`);
                showNotification('Đã xóa phiên chat thành công.', 'success');

                // --- REFRESH LỊCH SỬ CHAT SAU KHI XÓA THÀNH CÔNG ---
                await loadChatSessions(); // Gọi hàm load lại toàn bộ lịch sử từ API
                // Hàm loadChatSessions sẽ tự động cập nhật mảng, sidebar và tải session mới nhất (nếu có)
                // Không cần xóa thủ công ở client hay chọn session mới ở đây nữa.

            } else {
                // API trả về lỗi
                const errorText = await response.text();
                console.error(`API error deleting session ${sessionId}: ${response.status}`, errorText);
                showNotification(`Lỗi xóa phiên chat: ${response.statusText || 'Lỗi không xác định'}`, 'error');
                 // Reset nút xóa nếu lỗi
                 confirmButton.textContent = 'Xóa';
                 confirmButton.disabled = false;
            }

        } catch (error) {
            // Lỗi mạng hoặc lỗi fetch
            console.error(`Network error deleting session ${sessionId}:`, error);
            showNotification('Lỗi mạng khi xóa phiên chat. Vui lòng thử lại.', 'error');
             // Reset nút xóa nếu lỗi
             confirmButton.textContent = 'Xóa';
             confirmButton.disabled = false;
        } finally {
            // Đóng hộp thoại (chỉ đóng nếu còn tồn tại)
            if (document.body.contains(confirmDialog)) {
                document.body.removeChild(confirmDialog);
            }
            // Nút đã được reset ở trên nếu có lỗi, không cần reset ở đây
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
