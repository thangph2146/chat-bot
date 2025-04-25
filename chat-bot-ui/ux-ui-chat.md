# Trải nghiệm và Giao diện Người dùng (UX/UI) - Trang Chat Chính

Tài liệu này mô tả chi tiết về trải nghiệm (UX) và giao diện (UI) của trang chat chính (`index.html`) trong ứng dụng Chat Bot, dựa trên mã nguồn (`index.html`, `js/` folder) và các tài liệu liên quan (`api.md`, `config.md`, `actions.md`, `auth.md`, `sessions.md`, `chat-message.md`).

## 1. Mục Đích và Bố Cục Tổng Thể

- **Mục đích:** Cung cấp giao diện chính để người dùng tương tác với Trợ lý AI, xem lại lịch sử trò chuyện và quản lý các phiên chat.
- **Bố cục (Desktop):**
    - Bố cục 3 phần chính: Header, Nội dung chính (Sidebar Lịch sử + Khu vực Chat), Footer.
    - Nội dung chính chia thành 2 cột: Sidebar lịch sử bên trái (`md:w-1/3`) và Khu vực chat + Input bên phải (`md:w-2/3`).
    - Sử dụng Flexbox và Tailwind CSS để sắp xếp các thành phần.
    - Có hiệu ứng xuất hiện mờ dần (`animate-fade-in`) cho các khối chính.
- **Bố cục (Mobile):**
    - Header được thu gọn hơn.
    - Sidebar lịch sử bị ẩn theo mặc định và có thể được mở ra dưới dạng lớp phủ (overlay) trượt từ bên phải (`translate-x-full`, `z-30`).
    - Một nút "Lịch sử" (`#toggleHistoryButton`) xuất hiện trên header để mở sidebar.
    - Một nút "bong bóng" (`#historyBubbleButton`) cố định ở góc dưới bên trái màn hình cũng dùng để mở sidebar lịch sử.
    - Khu vực chat và input chiếm toàn bộ chiều rộng.

## 2. Header

- **Vị trí:** Nằm trên cùng của trang.
- **Nền:** Trắng, bo góc, có bóng đổ và viền trên màu chính (`bg-white rounded-2xl shadow-container border-t-4 border-primary-600`).
- **Thành phần:**
    - **Logo & Tiêu đề:** Logo HUB và tên ứng dụng "Trợ lý AI Tuyển Sinh - Trường Đại học Ngân hàng TP.HCM".
    - **Thông tin Người dùng & Đăng xuất (`#userAuthContainer`):**
        - Hiển thị thông tin người dùng (`#userInfoDisplay`): "Chào, [Tên người dùng]!" (Lấy từ `localStorage` qua `js/auth.js`).
        - Nút Đăng xuất (`#logoutButton`): Biểu tượng đăng xuất, chỉ hiển thị khi người dùng đã đăng nhập. Nhấp vào sẽ xóa `localStorage` và chuyển hướng về trang đăng nhập (`js/auth.js` -> `handleUserLogout`).
    - **Nút Lịch sử (Mobile) (`#toggleHistoryButton`):** Chỉ hiển thị trên màn hình nhỏ (`md:hidden`). Nhấp vào sẽ mở sidebar lịch sử (`js/ui-interactions.js`).
    - **Nút Chat Mới (`#newChatButton`):** Nút màu chính (`bg-primary-600`), có hiệu ứng đổ bóng (`hover:shadow-glow`), nhấp nháy nhẹ (`animate-pulse`) và hiệu ứng phóng to khi hover. Nhấp vào sẽ tạo một phiên chat mới (`js/chat/main.js` -> `startNewChat`).

## 3. Sidebar Lịch sử (`#chatHistorySidebar`)

- **Vị trí:** Bên trái (desktop), lớp phủ trượt từ phải (mobile).
- **Nền & Styling:** Trắng, bo góc, có bóng đổ, viền nhẹ (`bg-white rounded-2xl shadow-container border border-primary-100`).
- **Thành phần:**
    - **Tiêu đề:** "Lịch sử hội thoại" với biểu tượng.
    - **Nút Chat Mới (Sidebar) (`#newChatButtonSidebar`):** Nút nhỏ để tạo phiên chat mới, tiện lợi khi đang ở trong sidebar.
    - **Nút Đóng (Mobile) (`#closeHistorySidebar`):** Chỉ hiển thị trên mobile để đóng sidebar.
    - **Danh sách Phiên Chat (`#historySessions`):**
        - Hiển thị danh sách các phiên chat đã tải (`js/session.js` -> `loadChatSessions`).
        - Mỗi mục (`.history-item`) hiển thị:
            - Biểu tượng chat.
            - Tiêu đề phiên (tự động tạo nếu chưa có).
            - Ngày cập nhật cuối cùng.
            - **Tương tác:**
                - **Nền hover:** Đổi màu nền nhẹ khi di chuột (`hover:bg-secondary-100`).
                - **Phiên hiện tại:** Được làm nổi bật với màu nền và viền trái (`active`, `bg-primary-100`).
                - **Chọn phiên:** Nhấp vào một mục sẽ tải và hiển thị nội dung chat của phiên đó (`js/session.js` -> `handleSelectSession`).
                - **Xóa phiên:** Nút xóa (biểu tượng 'X') xuất hiện khi hover (`.delete-session-btn`). Nhấp vào sẽ hiển thị hộp thoại xác nhận và tiến hành xóa nếu được xác nhận (`js/session.js` -> `handleDeleteRequest`, `deleteSession`).
- **Hành vi Mobile:**
    - Sidebar trượt ra từ bên phải.
    - Một lớp phủ màu đen bán trong suốt (`#mobileHistoryOverlay`) xuất hiện phía sau để làm mờ nội dung chính.
    - Nhấp vào lớp phủ hoặc nút đóng sẽ ẩn sidebar.
    - Được điều khiển bởi `js/ui-interactions.js`.

## 4. Khu vực Chat (`#chatContainer`)

- **Vị trí:** Phần lớn bên phải (desktop), toàn bộ chiều rộng dưới header (mobile).
- **Styling:** Có thanh cuộn tùy chỉnh (`scrollbar-thin scrollbar-thumb-primary-600 scrollbar-track-secondary-200`).
- **Trạng thái Ban đầu / Màn hình Chào mừng (`#welcomeMessage`):**
    - Hiển thị khi người dùng mới truy cập hoặc khi không có phiên chat nào được chọn.
    - Bao gồm logo nhỏ, tiêu đề chào mừng, mô tả ngắn và nút "Bắt đầu cuộc trò chuyện".
    - Nút "Bắt đầu cuộc trò chuyện" (`#startChatButton`): Nhấp vào sẽ ẩn màn hình chào mừng, hiển thị khu vực chat và gửi tin nhắn khởi đầu ("Bắt đầu cuộc trò chuyện") đến AI (`js/welcome-screen.js` -> `handleSendMessage`).
- **Hiển thị Tin nhắn (`#chatMessages`):**
    - Ban đầu ẩn (`hidden`).
    - Tin nhắn được thêm vào đây bởi `addMessageToChat` (`js/chat/ui.js`).
    - **Tin nhắn Người dùng:** Căn phải, nền màu chính (`bg-primary-500`), chữ trắng, avatar là chữ cái đầu.
    - **Tin nhắn AI:** Căn trái, nền xám nhạt (`bg-gray-100`), chữ đen, avatar là logo.
    - **Định dạng:** Hỗ trợ Markdown (bảng, danh sách, định dạng chữ, link...) và tô sáng cú pháp cho các khối code (sử dụng `MarkedJS`, `DOMPurify`, `Highlight.js` - xem `chat-message.md`).
    - **Phản hồi Streaming:** Khi AI đang trả lời, tin nhắn AI hiển thị hiệu ứng dấu chấm lửng (`.ellipsis-animation`) và nội dung được cập nhật dần dần.
- **Infinite Scroll:** Khi người dùng cuộn lên gần đầu khu vực chat, các tin nhắn cũ hơn sẽ được tự động tải và thêm vào đầu danh sách (nếu còn) (`js/session.js` -> `loadOlderMessages`).

## 5. Khu vực Nhập liệu (Input Area)

- **Vị trí:** Dưới cùng của khu vực chat.
- **Styling:** Nền trắng, có hiệu ứng trượt lên nhẹ (`animate-slide-up`).
- **Thành phần:**
    - **Ô nhập liệu (`#messageInput`):**
        - Kiểu `text`, có placeholder "Nhập tin nhắn của bạn tại đây...".
        - Có hiệu ứng focus (`focus:ring-2 focus:ring-primary-600`).
        - **Tương tác:** Nhấn Enter (không kèm Shift) sẽ gửi tin nhắn (`js/chat/main.js`).
    - **Nút Ghi âm (`#recordButton`):**
        - Biểu tượng micro.
        - **Trạng thái:** Khi đang ghi âm, nút có thể thay đổi màu sắc/kiểu dáng (ví dụ: thêm class `recording`, `animate-pulse` - được quản lý bởi `js/chat/ui.js` -> `updateRecordingUI`).
        - **Tương tác:** Nhấp vào để bắt đầu/dừng ghi âm (`js/speech.js` -> `toggleRecording`).
        - Có tooltip "Ghi âm giọng nói" khi hover.
    - **Nút Gửi (`#sendButton`):**
        - Biểu tượng máy bay giấy (gửi).
        - Có hiệu ứng đổ bóng, phóng to khi hover và nhấp nháy nhẹ (`hover:shadow-glow`, `hover:scale-105`, `animate-pulse`).
        - **Tương tác:** Nhấp vào để gửi nội dung trong ô nhập liệu (`js/chat/main.js` -> `handleSendMessage`).
        - Có tooltip "Gửi tin nhắn" khi hover.

## 6. Footer

- **Vị trí:** Dưới cùng của toàn bộ trang.
- **Nội dung:** Thông tin bản quyền, đơn vị phát triển, link website tuyển sinh và số điện thoại liên hệ.

## 7. Phản hồi và Microinteractions Khác

- **Hiệu ứng Ripple:** Các nút chính (Send, Record, New Chat, History Bubble...) có hiệu ứng gợn sóng khi nhấp (`js/ui-interactions.js`).
- **Hover Effects:** Nhiều nút có hiệu ứng thay đổi màu nền, đổ bóng, hoặc phóng to nhẹ khi di chuột.
- **Animations:** Sử dụng các animation đơn giản (fade-in, slide-up, pulse, float) để làm giao diện sinh động hơn.
- **Loading States:** Trạng thái tải chính được thể hiện qua:
    - Hiệu ứng dấu chấm lửng khi AI đang trả lời.
    - Có thể có thông báo "Đang tải lịch sử..." trong sidebar (quản lý bởi `js/session.js`).
- **Thông báo (Notifications):** Hệ thống có thể hiển thị các thông báo ngắn ở góc màn hình (ví dụ: khi đăng xuất thành công, lỗi ghi âm...) sử dụng hàm `showNotification` (`js/chat/ui.js`).

## 8. Trải nghiệm Chung

- **Nhất quán:** Sử dụng bộ màu (`primary`, `secondary`) và font chữ thống nhất.
- **Trực quan:** Bố cục rõ ràng, phân tách các khu vực chức năng.
- **Phản hồi tốt:** Cung cấp các chỉ dẫn trực quan cho trạng thái tải, ghi âm, và tương tác người dùng.
- **Hiện đại:** Sử dụng Tailwind CSS và các hiệu ứng/animation tinh tế.
- **Responsive:** Đảm bảo trải nghiệm tốt trên cả desktop và mobile. 