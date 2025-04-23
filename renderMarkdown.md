# Xử lý và Render Markdown từ JSON Streaming

Tài liệu này mô tả cách xử lý chuỗi các đối tượng JSON nhận được từ một nguồn streaming (ví dụ: WebSocket, Server-Sent Events) để tái tạo và hiển thị nội dung Markdown hoàn chỉnh trên giao diện người dùng.

## Dữ liệu Đầu vào (Ví dụ)

Chúng ta nhận được một chuỗi các đối tượng JSON, mỗi đối tượng đại diện cho một phần (chunk) của câu trả lời cuối cùng. Các message quan trọng có `event: "message"` và chứa phần nội dung trong trường `answer`.

```json
// Message 1
{
  "event": "message",
  "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3",
  "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc",
  // ... other fields
  "answer": "Tr"
}

// Message 2
{
  "event": "message",
  "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3",
  "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc",
  // ... other fields
  "answer": "ường Đại học"
}

// Message 3
{
  "event": "message",
  "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3",
  "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc",
  // ... other fields
  "answer": " Ngân hàng TP. Hồ Chí Minh..."
}

// ... tiếp tục các message chunk ...

// Message kết thúc (ví dụ)
{
  "event": "message_end",
  "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3",
  "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc",
  // ... metadata, usage, etc.
}

```

## Quy trình Xử lý Phía Client (JavaScript)

1.  **Khởi tạo Vùng chứa:** Xác định một phần tử HTML trên trang sẽ hiển thị nội dung tin nhắn của bot (ví dụ: một `div` với ID hoặc class cụ thể).

2.  **Khởi tạo Biến Lưu trữ:** Tạo một biến (ví dụ: `currentBotMessageContent = ""`) để lưu trữ và tích lũy nội dung của tin nhắn đang được stream.

3.  **Lắng nghe Sự kiện Message:** Sử dụng cơ chế nhận message từ backend (WebSocket `onmessage`, EventSource `onmessage`, etc.).

4.  **Xử lý Message đến:**
    *   Khi nhận được một message mới, phân tích cú pháp chuỗi JSON thành đối tượng JavaScript.
    *   Kiểm tra trường `event`:
        *   **Nếu `event === "message"`:**
            *   Kiểm tra xem `message_id` có khớp với tin nhắn đang được xử lý không (quan trọng nếu có nhiều tin nhắn đồng thời).
            *   Lấy giá trị từ trường `answer`.
            *   Nối (append) giá trị `answer` này vào biến `currentBotMessageContent`.
            *   **Render Markdown:** Sử dụng một thư viện Markdown (ví dụ: `marked.js`, `showdown.js`, `markdown-it`) để chuyển đổi *toàn bộ* chuỗi `currentBotMessageContent` (đã bao gồm chunk mới) thành HTML.
            *   **Cập nhật UI:** Cập nhật `innerHTML` của phần tử HTML chứa tin nhắn bot bằng chuỗi HTML đã được render. Điều này tạo ra hiệu ứng chữ chạy/streaming.
        *   **Nếu `event === "message_end"`:**
            *   Đánh dấu rằng tin nhắn với `message_id` tương ứng đã hoàn tất. Không cần xử lý thêm nội dung `answer` cho tin nhắn này.
            *   Có thể thực hiện các hành động cuối cùng như kích hoạt lại ô nhập liệu của người dùng, dừng hiệu ứng loading, v.v.
            *   Các loại `event` khác (nếu có) có thể được xử lý tùy theo logic ứng dụng.

## Thư viện Render Markdown

Để chuyển đổi chuỗi văn bản chứa cú pháp Markdown thành HTML an toàn, chúng ta sử dụng hàm tiện ích `renderMarkdown` được định nghĩa trong `js/chat/utils.js`. Hàm này đóng gói việc sử dụng thư viện `marked.js` để phân tích cú pháp và `DOMPurify` để làm sạch (sanitize) HTML đầu ra, ngăn chặn các cuộc tấn công XSS.

**Yêu cầu:**

1.  **Nhúng Thư viện Gốc:** Đảm bảo rằng `marked.js` và `DOMPurify` đã được nhúng vào trang HTML của bạn (ví dụ: qua CDN) hoặc được quản lý thông qua hệ thống module.
    ```html
    <!-- Ví dụ nhúng qua CDN -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dompurify@latest/dist/purify.min.js"></script>
    ```
2.  **Import Hàm Tiện Ích:** Import hàm `renderMarkdown` từ file `utils.js` vào file JavaScript xử lý logic chat của bạn.
    ```javascript
    // Trong file chat.js hoặc tương tự
    import { renderMarkdown } from './utils.js';
    ```

**Sử dụng trong JavaScript:**

Sau khi đã import, bạn chỉ cần gọi hàm `renderMarkdown` với chuỗi Markdown cần chuyển đổi.

```javascript
// Giả sử bạn đã có currentBotMessageContent và messageContainerElement

// Bên trong hàm xử lý message có event === "message"
// ... nối chunk vào currentBotMessageContent ...

// Render Markdown bằng hàm tiện ích (đã bao gồm sanitize)
const cleanHtml = renderMarkdown(currentBotMessageContent);

// Cập nhật UI
messageContainerElement.innerHTML = cleanHtml;
```

Hàm `renderMarkdown` sẽ tự động xử lý việc gọi `marked.parse` và `DOMPurify.sanitize` với cấu hình phù hợp, đồng thời kiểm tra xem các thư viện gốc đã được tải hay chưa và cung cấp fallback an toàn nếu cần.

**Lưu ý quan trọng:**

*   **Hiệu năng:** Đối với các tin nhắn rất dài, việc gọi `renderMarkdown` và cập nhật `innerHTML` cho mỗi chunk nhỏ có thể ảnh hưởng đến hiệu năng. Cân nhắc các kỹ thuật tối ưu hóa nếu cần (ví dụ: chỉ cập nhật DOM khi có thay đổi đáng kể, sử dụng Virtual DOM nếu dùng framework như React/Vue).

## Mã giả Minh họa

```javascript
// Giả định: Các thư viện gốc (marked, DOMPurify) đã có sẵn toàn cục hoặc qua CDN
// Import hàm tiện ích từ utils.js
import { renderMarkdown } from './utils.js'; // Đường dẫn có thể thay đổi

let currentBotMessageContent = {}; // Lưu trữ nội dung theo message_id
const chatContainer = document.getElementById('chat-container'); // Vùng chứa tất cả tin nhắn

// Hàm tạo phần tử tin nhắn mới (ví dụ đơn giản)
function createMessageElement(messageId, role = 'bot') {
    const messageDiv = document.createElement('div');
    messageDiv.id = `message-${messageId}`;
    messageDiv.classList.add('message', `message-${role}`); // Thêm class để CSS styling
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    messageDiv.appendChild(contentDiv);

    chatContainer.appendChild(messageDiv);
    return contentDiv; // Trả về phần tử chứa nội dung để cập nhật innerHTML
}

// Hàm xử lý message từ nguồn streaming (WebSocket, EventSource, etc.)
function handleIncomingMessage(eventData) {
    try {
        const data = JSON.parse(eventData);
        const messageId = data.message_id;

        // Tìm hoặc tạo phần tử chứa nội dung tin nhắn
        let messageContentElement = document.querySelector(`#message-${messageId} .message-content`);

        if (data.event === "message") {
            if (!messageContentElement) {
                // Nếu message element chưa tồn tại, tạo mới
                console.log(`Creating new message element for ID: ${messageId}`);
                messageContentElement = createMessageElement(messageId);
                currentBotMessageContent[messageId] = ""; // Khởi tạo nội dung rỗng
            } else {
                 // Đảm bảo nội dung được khởi tạo nếu element đã có nhưng chưa có nội dung
                 if (currentBotMessageContent[messageId] === undefined) {
                     currentBotMessageContent[messageId] = "";
                 }
            }

            // Nối nội dung chunk mới
            currentBotMessageContent[messageId] += data.answer;

            // Render và làm sạch HTML bằng hàm tiện ích
            const cleanHtml = renderMarkdown(currentBotMessageContent[messageId]); // Sử dụng hàm renderMarkdown

            // Cập nhật UI
            if (messageContentElement) {
                messageContentElement.innerHTML = cleanHtml;
                // Tự động cuộn xuống dưới
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

        } else if (data.event === "message_end") {
            console.log(`Message finished streaming: ${messageId}`);
            // Render lại lần cuối để đảm bảo mọi thứ được hiển thị đúng
            // (Đặc biệt quan trọng nếu có xử lý highlight code sau khi render)
             if (messageContentElement && currentBotMessageContent.hasOwnProperty(messageId)) {
                 const finalCleanHtml = renderMarkdown(currentBotMessageContent[messageId]);
                 messageContentElement.innerHTML = finalCleanHtml;
                 // Gọi hàm highlight code ở đây nếu cần
                 // highlightCodeBlocks(messageContentElement);
             }

            // Đánh dấu hoàn tất, không cần xóa nội dung đã hiển thị
            // Có thể xóa khỏi currentBotMessageContent nếu không cần truy cập lại
             if (currentBotMessageContent.hasOwnProperty(messageId)) {
                 delete currentBotMessageContent[messageId];
             }
            // Kích hoạt lại input, dừng spinner, etc.
            // enableUserInput();
        } else {
            // Xử lý các loại event khác nếu cần
            console.log("Received other event:", data.event);
        }

    } catch (error) {
        console.error("Error processing message:", error, "Raw data:", eventData);
    }
}

// ----- Ví dụ mô phỏng nhận message -----
const exampleMessages = [
    '{"event": "message", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc", "answer": "Tr"}',
    '{"event": "message", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc", "answer": "ường Đại học"}',
    '{"event": "message", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc", "answer": " Ngân hàng TP. Hồ Chí Minh..."}',
    '{"event": "message", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc", "answer": " Ngân hàng TP. Hồ Chí Minh hiện đang đào tạo 16 ngành đại"}',
    '{"event": "message", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc", "answer": " học. Dưới đây là danh sách các ngành học của trường, bao gồm chương"}',
    '{"event": "message", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc", "answer": " trình quy chuẩn và chương trình tiếng Anh bán phần (chất lượng cao):\\n\\n**Chương trình quy chuẩn:**\\n\\n1. Tài chính -"}',
    '{"event": "message", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc", "answer": " Ngân hàng\\n2. Kế toán\\n3. Quản trị kinh doanh\\n4. Kinh tế quốc tế\\n5. "}',
    '{"event": "message", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc", "answer": "Marketing\\n6. Công nghệ tài chính (Fintech)\\n7. Kinh doanh quốc tế\\n8. Luật kinh tế\\n9. Hệ thống thông tin quản lý\\n10. Ngôn ngữ"}',
    '{"event": "message", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc", "answer": " Anh\\n11. Khoa học dữ liệu\\n12. Logistics và Quản lý chuỗi cung ứng\\n13. Luật (mới, tuyển sinh từ 2025)\\n14. Trí tu"}',
    '{"event": "message", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc", "answer": "ệ nhân tạo (mới, tuyển sinh từ 2025)\\n15. Kiểm toán (mới, tuyển sinh từ 2025)\\n16. Thương mại điện tử (mới, tuyển sinh từ 2025)\\n\\n**Chương trình tiếng Anh bán phần"}',
    '{"event": "message", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc", "answer": " (chất lượng cao):**\\n\\n1. Tài chính - Ngân hàng\\n2. Kế toán\\n3. Quản trị kinh doanh\\n4. Hệ thống thông tin quản lý\\n5. Kinh tế quốc tế\\n6. Luật kinh tế\\n7"}',
    '{"event": "message", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc", "answer": ". Ngôn ngữ Anh (Chương trình đào tạo đặc biệt)\\n\\nBạn có muốn biết thêm thông tin chi tiết về ngành nào không?"}',
    '{"event": "message_end", "conversation_id": "ecbc1a99-9bf7-4815-83bf-7388afaba8c3", "message_id": "6a7e9603-6e1e-493b-a07e-a4d2be6c16dc"}'
];

// Mô phỏng việc nhận message lần lượt
let messageIndex = 0;
const intervalId = setInterval(() => {
    if (messageIndex < exampleMessages.length) {
        console.log(`Simulating receive: ${exampleMessages[messageIndex].substring(0, 50)}...`);
        handleIncomingMessage(exampleMessages[messageIndex]);
        messageIndex++;
    } else {
        clearInterval(intervalId);
        console.log("Simulation finished.");
    }
}, 300); // Giả lập độ trễ giữa các chunk

```

**Yêu cầu HTML:**

Để đoạn mã trên hoạt động, bạn cần có một phần tử HTML với `id="chat-container"` trong trang của mình:

```html
<div id="chat-container" style="height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 10px;">
    <!-- Tin nhắn sẽ được thêm vào đây -->
</div>
```

Bạn cũng cần đảm bảo đã nhúng thư viện `marked.js` và `DOMPurify` vào trang HTML của mình (qua CDN hoặc import từ module).

## Ví dụ Code Xử lý Streaming với Hiệu ứng Typing

Đoạn mã JavaScript sau minh họa cách xử lý streaming, render Markdown, sanitize HTML và thêm hiệu ứng con trỏ typing nhấp nháy.

**Yêu cầu:**

1.  **HTML:** Cần có một vùng chứa chat, ví dụ: `<div id="chat-container"></div>`.
2.  **CSS:** Thêm các quy tắc CSS cho `.typing-cursor` và animation `blink` (như mô tả bên dưới).
3.  **Thư viện:** Nhúng hoặc import `marked.js` và `DOMPurify`.
4.  **File `utils.js`:** Chứa các hàm `renderMarkdown` và `highlightCodeBlocks` đã được định nghĩa trước đó.

**CSS Cần Thiết:**

```css
/* Trong file CSS của bạn (ví dụ: css/chat.css) */

/* --- CSS cho hiệu ứng con trỏ typing mờ dần (Mượt hơn) --- */
.typing-cursor {
  display: inline-block;
  margin-left: 2px;        /* Khoảng cách với chữ */
  font-weight: normal;
  background-color: currentColor; /* Dùng màu chữ làm màu con trỏ */
  width: 1.5px;             /* Độ dày con trỏ */
  height: 1em;              /* Chiều cao bằng dòng chữ */
  vertical-align: text-bottom; /* Căn chỉnh với dòng chữ */
  opacity: 1;
  /* Animation mờ dần */
  animation: smooth-blink 1s infinite;
}

/* Animation mờ dần */
@keyframes smooth-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
/* --- Kết thúc CSS con trỏ mờ dần --- */


/* Đảm bảo layout không bị vỡ bởi cursor */
/* Quan trọng nếu bạn dùng display:inline cho thẻ p cuối */
.message-content p:last-child {
    /* display: inline; */ /* Cân nhắc kỹ nếu sử dụng */
    /* Có thể không cần nếu thẻ p là block và cursor nằm trong đó */
}

/* CSS khác cho .message, .message-bot, .message-content... */
```

**JavaScript Xử lý Stream:**

```javascript
// Giả định đang ở trong file xử lý sự kiện stream (vd: chat.js)
// import { renderMarkdown, highlightCodeBlocks } from './utils.js';
// import DOMPurify from 'dompurify'; // Nếu dùng module
// import { marked } from 'marked';   // Nếu dùng module

let accumulatedMessages = {}; // Lưu trữ nội dung theo message_id
const chatContainer = document.getElementById('chat-container'); // Vùng chứa chat

// Hàm tạo phần tử tin nhắn mới (ví dụ)
function createMessageElement(messageId, role = 'bot') {
    const messageDiv = document.createElement('div');
    messageDiv.id = `message-${messageId}`;
    messageDiv.classList.add('message', `message-${role}`);
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);
    return contentDiv; // Trả về div chứa nội dung
}

// Hàm chính xử lý message từ nguồn streaming
function handleStreamEvent(eventData) {
    try {
        const data = JSON.parse(eventData);
        const messageId = data.message_id;
        const messageContainer = document.getElementById(`message-${messageId}`);
        let messageContentElement = messageContainer?.querySelector('.message-content');

        // --- Xóa con trỏ cũ (nếu có) trước khi xử lý chunk mới ---
        const existingCursor = messageContentElement?.querySelector('.typing-cursor');
        if (existingCursor) {
            existingCursor.remove();
        }

        if (data.event === 'message') {
            // Tìm hoặc tạo element nếu chưa có
            if (!messageContentElement) {
                messageContentElement = createMessageElement(messageId);
                accumulatedMessages[messageId] = "";
            } else if (accumulatedMessages[messageId] === undefined) {
                 accumulatedMessages[messageId] = "";
            }

            // Nối chunk nội dung
            accumulatedMessages[messageId] += data.answer;

            // Render Markdown bằng hàm tiện ích (đã bao gồm sanitize)
            const cleanHtml = renderMarkdown(accumulatedMessages[messageId]);

            // Cập nhật UI và thêm con trỏ typing MỚI
            if (messageContentElement) {
                 // Thêm con trỏ vào cuối HTML đã render
                 messageContentElement.innerHTML = cleanHtml + '<span class="typing-cursor"></span>';

                 // Highlight code (có thể gọi ở đây hoặc chỉ gọi ở message_end)
                 // highlightCodeBlocks(messageContentElement);

                 // Cuộn xuống dưới
                 chatContainer.scrollTop = chatContainer.scrollHeight;
            }

        } else if (data.event === 'message_end') {
            console.log(`Message finished streaming: ${messageId}`);
            // --- Xử lý kết thúc stream ---
             if (messageContentElement && accumulatedMessages.hasOwnProperty(messageId)) {
                 // Render lần cuối KHÔNG có con trỏ bằng hàm tiện ích
                 const finalCleanHtml = renderMarkdown(accumulatedMessages[messageId]);
                 messageContentElement.innerHTML = finalCleanHtml;
                 // Highlight code lần cuối cùng sau khi toàn bộ nội dung đã render
                 highlightCodeBlocks(messageContentElement); // Gọi highlight ở đây
             } else if (existingCursor) {
                 // Đảm bảo xóa con trỏ nếu không có nội dung cuối
                 existingCursor.remove();
             }

            // Dọn dẹp
            delete accumulatedMessages[messageId];
            // enableUserInput(); // Ví dụ: Kích hoạt lại input
        } else {
            console.log("Received other event:", data.event);
        }

    } catch(error) {
         console.error("Error processing message:", error, "Raw data:", eventData);
         // Cố gắng xóa con trỏ nếu lỗi xảy ra
         const messageIdOnError = JSON.parse(eventData)?.message_id;
         if (messageIdOnError) {
            const errorCursor = document.querySelector(`#message-${messageIdOnError} .message-content .typing-cursor`);
            errorCursor?.remove();
         }
    }
}


// ----- Ví dụ mô phỏng nhận message (giữ nguyên từ trước) -----
// const exampleMessages = [ ... ];
// let messageIndex = 0;
// const intervalId = setInterval(() => { ... });

```

// ... Phần Yêu cầu HTML cũ ...
