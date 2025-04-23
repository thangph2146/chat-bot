import { showNotification, updateRecordingUI } from './ui.js';

let recognition = null;
let isRecording = false;
let isProcessingVoice = false;
let recordingTimeout = null;

// Dependency (Placeholder - Removed, now passed via arguments)
/*
const messageInput = document.getElementById('messageInput');
*/

/**
 * Khởi tạo Web Speech API.
 * Cấu hình nhận dạng giọng nói tiếng Việt.
 * @param {HTMLInputElement | null} messageInputElement - Tham chiếu đến ô nhập tin nhắn.
 * @param {HTMLButtonElement | null} recordButtonElement - Tham chiếu đến nút ghi âm.
 */
export function initSpeechRecognition(messageInputElement, recordButtonElement) {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        // Use passed recordButtonElement
        if (recordButtonElement) {
             recordButtonElement.disabled = true;
             recordButtonElement.title = 'Trình duyệt không hỗ trợ ghi âm giọng nói';
             recordButtonElement.classList.add('opacity-50');
        }
        showNotification('Trình duyệt của bạn không hỗ trợ ghi âm giọng nói', 'error');
        return;
    }

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'vi-VN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        console.log('Voice recording started');
        isRecording = true;
        isProcessingVoice = true;
        // Pass recordButtonElement to updateRecordingUI
        updateRecordingUI(true, recordButtonElement);

        recordingTimeout = setTimeout(() => {
            if (isRecording) {
                showNotification('Đã tự động dừng ghi âm sau 15 giây', 'warning');
                stopRecording(recordButtonElement); // Pass element to stopRecording
            }
        }, 15000); // 15 seconds timeout
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');

        // Use passed messageInputElement
        if (messageInputElement) {
            messageInputElement.value = transcript;
            messageInputElement.style.backgroundColor = 'rgba(28, 100, 242, 0.05)';
        }

        if (event.results[0].isFinal) {
             // Use passed messageInputElement
            if (messageInputElement) {
                messageInputElement.style.backgroundColor = 'rgba(28, 100, 242, 0.1)';
            }
            isProcessingVoice = false;
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopRecording(recordButtonElement); // Pass element to stopRecording
        showNotification(`Lỗi ghi âm: ${event.error}`, 'error');
    };

    recognition.onend = () => {
        clearTimeout(recordingTimeout);
        isRecording = false;
        // Pass recordButtonElement to updateRecordingUI
        updateRecordingUI(false, recordButtonElement);

        setTimeout(() => {
             // Use passed messageInputElement
            if (messageInputElement) {
                messageInputElement.style.backgroundColor = '';
                // Auto-send logic might be better handled in the main script event listener
                // if (messageInput.value.trim() !== '' && !isProcessingVoice) {
                //     // handleSendMessage(); // Trigger send
                // }
            }
        }, 500);
    };
}

/**
 * Bắt đầu ghi âm giọng nói.
 */
function startRecording() { // Doesn't directly need elements, relies on onstart handler
    if (recognition && !isRecording) {
        try {
            recognition.start();
        } catch (e) {
            console.error('Failed to start recording:', e);
            showNotification('Không thể bắt đầu ghi âm, vui lòng thử lại', 'error');
            // Ensure UI is reset if start fails - onstart won't fire
            isRecording = false;
            // We might need recordButtonElement here if onstart fails
            // updateRecordingUI(false, ???); // Need element ref here too
        }
    }
}

/**
 * Dừng ghi âm giọng nói.
 * @param {HTMLButtonElement | null} recordButtonElement - Tham chiếu đến nút ghi âm (cần cho UI update nếu lỗi).
 */
function stopRecording(recordButtonElement) {
    if (recognition && isRecording) {
        try {
            recognition.stop();
            clearTimeout(recordingTimeout); // Clear timeout explicitly
        } catch (e) {
            console.error('Failed to stop recording:', e);
            // UI should update via onend, but reset state & UI defensively
            isRecording = false;
            updateRecordingUI(false, recordButtonElement);
        }
    }
}

/**
 * Chuyển đổi trạng thái ghi âm (bắt đầu/dừng).
 * Đây là hàm được gọi bởi event listener của nút record.
 * Cần truyền recordButtonElement xuống stopRecording để xử lý lỗi.
 */
export function toggleRecording() {
    if (!recognition) {
        console.error("Speech recognition not initialized.");
        showNotification("Chức năng ghi âm chưa sẵn sàng.", "error");
        return;
    }
    if (isRecording) {
        stopRecording(); // Will use module-level var if needed
    } else {
        startRecording(); // Will use module-level var if needed
    }
} 