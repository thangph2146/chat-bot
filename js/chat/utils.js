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
    if (typeof marked === 'undefined') {
        console.error('Thư viện MarkedJS chưa được tải.');
        const escapedText = document.createElement('textarea');
        escapedText.textContent = text;
        return escapedText.innerHTML.replace(/\n/g, '<br>');
    }
    try {
        marked.setOptions({
            gfm: true,
            breaks: true,
            sanitize: false,
            smartypants: false
        });

        const rawHtml = marked.parse(text);

        if (typeof DOMPurify === 'undefined') {
            console.warn('Thư viện DOMPurify chưa được tải. HTML sẽ không được sanitize.');
            return rawHtml;
        } else {
            return DOMPurify.sanitize(rawHtml, {
                USE_PROFILES: { html: true },
                ADD_ATTR: ['target'],
            });
        }
    } catch (error) {
        console.error('Lỗi khi render Markdown:', error);
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
                    addCopyButton(block.parentNode);
                }
            } catch (error) {
                console.error('Lỗi khi highlight code block:', error, block.textContent);
            }
        });
    }
} 