import { getUserInfo } from './auth.js'; // Thêm import

/**
 * Hàm tiện ích tạo ID ngẫu nhiên đơn giản.
 * @returns {string} ID ngẫu nhiên dựa trên thời gian và số ngẫu nhiên.
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Tạo ID duy nhất phức tạp hơn cho việc khôi phục phiên
 * @returns {string} ID duy nhất
 */
export function generateUniqueId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 10);
    const uuid = crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').substring(0, 8) : '';
    return `${timestamp}-${randomStr}-${uuid || Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Định dạng thời gian từ đối tượng Date hoặc chuỗi ISO.
 * @param {Date|string|null} date - Thời gian cần định dạng.
 * @returns {string} Chuỗi thời gian hh:mm hoặc chuỗi rỗng nếu đầu vào không hợp lệ.
 */
export function formatTime(date) {
    if (!date) return '';
    if (typeof date === 'string') date = new Date(date);
    if (!(date instanceof Date) || isNaN(date)) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Kiểm tra xem localStorage có khả dụng và hoạt động không.
 * @returns {boolean} True nếu localStorage khả dụng, false nếu không.
 */
export function isLocalStorageAvailable() {
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

/**
 * Render Markdown sang HTML và sanitize kết quả.
 * Sử dụng thư viện Marked và DOMPurify (nếu có).
 * @param {string} text - Chuỗi Markdown cần render.
 * @returns {string} Chuỗi HTML đã được render và sanitize.
 */
export function renderMarkdown(text) {
    // Kiểm tra xem thư viện Marked có sẵn không
    if (typeof marked === 'undefined') {
        console.error('Thư viện MarkedJS chưa được tải.');
        // Fallback: Trả về text đã được escape cơ bản để tránh XSS đơn giản
        const escapedText = document.createElement('textarea');
        escapedText.textContent = text;
        return escapedText.innerHTML.replace(/\n/g, '<br>'); // Thay newline bằng <br>
    }
    try {
        // Cấu hình Marked (nên thực hiện một lần ở nơi khác nếu có thể)
        marked.setOptions({
            gfm: true,      // Hỗ trợ GitHub Flavored Markdown (bảng, etc.)
            breaks: true,   // Chuyển đổi \n thành <br>
            sanitize: false, // TẮT trình sanitize của Marked (lỗi thời và không an toàn)
                            // Chúng ta sẽ sử dụng DOMPurify để thay thế.
            smartypants: false // Không chuyển đổi dấu ngoặc kép, etc.
        });

        // Bước 1: Parse Markdown thành HTML thô
        const rawHtml = marked.parse(text);

        // Bước 2: Sanitize HTML bằng DOMPurify (nếu có)
        // Đây là bước QUAN TRỌNG để chống XSS
        if (typeof DOMPurify === 'undefined') {
            console.warn('Thư viện DOMPurify chưa được tải. HTML sẽ không được sanitize - Nguy cơ XSS!');
            return rawHtml; // Trả về HTML thô nếu không có DOMPurify
        } else {
            // Cấu hình DOMPurify (có thể tùy chỉnh thêm)
            const cleanHtml = DOMPurify.sanitize(rawHtml, {
                USE_PROFILES: { html: true }, // Cho phép các thẻ HTML an toàn cơ bản
                ADD_ATTR: ['target'],          // Cho phép thuộc tính target (cho link _blank)
                // ADD_TAGS: [], // Thêm các thẻ tùy chỉnh nếu cần
            });
            return cleanHtml;
        }
    } catch (error) {
        console.error('Lỗi khi render Markdown:', error);
        // Fallback an toàn trong trường hợp lỗi parse
        const escapedText = document.createElement('textarea');
        escapedText.textContent = text;
        return escapedText.innerHTML.replace(/\n/g, '<br>');
    }
}

/**
 * Thêm nút "Copy code" vào phần tử <pre> chứa khối code.
 * @param {HTMLPreElement} preElement - Phần tử <pre>.
 */
export function addCopyButton(preElement) {
    if (!preElement || preElement.querySelector('.copy-code-btn')) {
        return;
    }

    const button = document.createElement('button');
    button.className = 'copy-code-btn';
    button.title = 'Copy code';
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
      </svg>`;

    button.addEventListener('click', () => {
        const codeElement = preElement.querySelector('code');
        if (codeElement) {
            const codeToCopy = codeElement.innerText;
            navigator.clipboard.writeText(codeToCopy).then(() => {
                button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16">
                    <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/>
                  </svg>`;
                setTimeout(() => {
                    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                      </svg>`;
                }, 1500);
            }).catch(err => {
                console.error('Không thể copy code:', err);
                // Consider importing and using showNotification here if needed
                // showNotification('Lỗi khi copy code', 'error');
            });
        }
    });

    preElement.style.position = 'relative';
    preElement.appendChild(button);
}

/**
 * Highlight các khối code bên trong một phần tử container.
 * Sử dụng thư viện Highlight.js (nếu có).
 * @param {HTMLElement} containerElement - Phần tử chứa các khối code.
 */
export function highlightCodeBlocks(containerElement) {
    if (typeof hljs === 'undefined') {
        return;
    }
    const codeBlocks = containerElement.querySelectorAll('pre code');
    if (codeBlocks.length > 0) {
        codeBlocks.forEach((block) => {
            try {
                 if (!block.classList.contains('hljs') && !block.dataset.highlighted) {
                    hljs.highlightElement(block);
                    block.dataset.highlighted = 'true';
                }
            } catch (error) {
                console.error('Lỗi khi highlight code block:', error, block.textContent);
            }
        });
    }
}

/**
 * Tạo phần tử DOM cho một tin nhắn.
 * @param {object} msg - Dữ liệu tin nhắn (ví dụ: { id, content, isUser, timestamp, senderName, isStreaming }).
 * @returns {HTMLElement | null} Phần tử DOM của tin nhắn hoặc null nếu lỗi.
 */
export function renderMessageElement(msg) {
    if (!msg || typeof msg.id === 'undefined') {
        console.error('[utils.js] renderMessageElement: Invalid msg object received:', msg);
        return null;
    }

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-row', 'mb-4', 'flex', 'items-start', 'gap-3', 'animate-fade-in'); // Thêm fade-in
    messageContainer.dataset.messageId = msg.id;

    // 1. Avatar
    const avatarElement = document.createElement('div');
    avatarElement.classList.add(
        'flex-shrink-0', 'w-8', 'h-8', 'rounded-full', 'flex', 'items-center', 'justify-center',
        'text-sm', 'font-semibold', 'mt-1'
    );

    // 2. Khối nội dung (Tên + Bubble)
    const mainContentBlock = document.createElement('div');
    mainContentBlock.classList.add('flex', 'flex-col', 'w-full', 'max-w-[85%]');

    // 3. Bubble chứa nội dung và timestamp
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('message-bubble', 'p-3', 'rounded-lg', 'shadow-md');

    // Căn chỉnh và style dựa trên người gửi
    if (msg.isUser) {
        messageContainer.classList.add('justify-end');
        mainContentBlock.classList.add('items-end');
        avatarElement.classList.add('bg-primary-100', 'text-primary-700', 'order-2');
        const userInfo = getUserInfo();
        const userFullName = userInfo?.data?.fullName || '';
        const userInitial = userFullName.trim().charAt(0).toUpperCase() || 'U';
        avatarElement.textContent = userInitial;
        contentWrapper.classList.add('bg-primary-500', 'text-white', 'rounded-br-none');
        mainContentBlock.classList.add('order-1');
    } else { // Bot message
        messageContainer.classList.add('justify-start');
        mainContentBlock.classList.add('items-start');
        avatarElement.classList.add('bg-white', 'border', 'border-gray-200', 'order-1', 'overflow-hidden');
        avatarElement.innerHTML = ''; // Xóa SVG cũ nếu có
        const logoImg = document.createElement('img');
        logoImg.src = 'logo/logo.png';
        logoImg.alt = 'Bot Avatar';
        logoImg.classList.add('w-full', 'h-full', 'object-cover');
        avatarElement.appendChild(logoImg);
        contentWrapper.classList.add('bg-gray-100', 'text-gray-900', 'rounded-bl-none');
        mainContentBlock.classList.add('order-2');
        const senderNameSpan = document.createElement('span');
        senderNameSpan.className = 'text-xs font-semibold text-secondary-700 mb-1 ml-1';
        senderNameSpan.textContent = 'Trợ lý AI';
        mainContentBlock.appendChild(senderNameSpan);
    }

    // 4. Render nội dung thực tế vào div riêng bên trong bubble
    const contentDiv = document.createElement('div');
    // ĐỔI TÊN CLASS để addMessageToChat dễ tìm đúng div này
    contentDiv.classList.add('message-text-content', 'text-sm');

    if (msg.isUser) {
        contentDiv.textContent = msg.content;
    } else {
        if (msg.isStreaming) {
            // *** Xử lý trạng thái Streaming cho Bot ***
            contentDiv.innerHTML = `<div class="ellipsis-animation"><span>.</span><span>.</span><span>.</span></div><div class="markdown-content" style="min-height: 1.5rem;"></div>`;
            // Đảm bảo có class markdown-content để addMessageToChat tìm thấy
        } else {
            // Bot message đã hoàn thành
            contentDiv.innerHTML = `<div class="markdown-content">${renderMarkdown(msg.content || '')}</div>`;
            // Highlight code sẽ được thực hiện bởi addMessageToChat hoặc loadSessionUI sau khi element được thêm vào DOM
        }
    }
    contentWrapper.appendChild(contentDiv); // Thêm nội dung vào bubble

    // 5. Thêm timestamp vào *bên trong* bubble
    const timeSpan = document.createElement('span');
    const timeClasses = msg.isUser ? 'text-white/80' : 'text-gray-500';
    timeSpan.className = `message-timestamp text-xs ${timeClasses} mt-1 block text-right`;
    timeSpan.textContent = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    contentWrapper.appendChild(timeSpan); // Thêm timestamp vào bubble

    // 6. Gắn bubble vào khối nội dung chính
    mainContentBlock.appendChild(contentWrapper);

    // 7. Gắn avatar và khối nội dung vào container hàng
    messageContainer.appendChild(avatarElement);
    messageContainer.appendChild(mainContentBlock);

    return messageContainer; // Trả về container của cả hàng
} 