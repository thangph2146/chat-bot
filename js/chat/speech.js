import { showNotification, updateRecordingUI } from './ui.js';

let recognition = null;
let isRecording = false;
let isProcessingVoice = false;
let recordingTimeout = null;

// Dependency (Placeholder - needs element reference)
const messageInput = document.getElementById('messageInput');

/**
 * Khởi tạo Web Speech API.
 * Cấu hình nhận dạng giọng nói tiếng Việt.
 */
export function initSpeechRecognition() {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const recordButton = document.getElementById('recordButton');
        if (recordButton) {
             recordButton.disabled = true;
             recordButton.title = 'Trình duyệt không hỗ trợ ghi âm giọng nói';
             recordButton.classList.add('opacity-50');
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
        updateRecordingUI(true);

        recordingTimeout = setTimeout(() => {
            if (isRecording) {
                showNotification('Đã tự động dừng ghi âm sau 15 giây', 'warning');
                stopRecording();
            }
        }, 15000); // 15 seconds timeout
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');

        if (messageInput) {
            messageInput.value = transcript;
            messageInput.style.backgroundColor = 'rgba(28, 100, 242, 0.05)';
        }

        if (event.results[0].isFinal) {
            if (messageInput) {
                messageInput.style.backgroundColor = 'rgba(28, 100, 242, 0.1)';
            }
            isProcessingVoice = false;
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopRecording(); // Ensure recording stops on error
        showNotification(`Lỗi ghi âm: ${event.error}`, 'error');
    };

    recognition.onend = () => {
        clearTimeout(recordingTimeout);
        isRecording = false;
        updateRecordingUI(false);

        setTimeout(() => {
            if (messageInput) {
                messageInput.style.backgroundColor = '';
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
function startRecording() {
    if (recognition && !isRecording) {
        try {
            recognition.start();
        } catch (e) {
            console.error('Failed to start recording:', e);
            showNotification('Không thể bắt đầu ghi âm, vui lòng thử lại', 'error');
            // Ensure UI is reset if start fails
            isRecording = false;
            updateRecordingUI(false);
        }
    }
}

/**
 * Dừng ghi âm giọng nói.
 */
function stopRecording() {
    if (recognition && isRecording) {
        try {
            recognition.stop();
            clearTimeout(recordingTimeout); // Clear timeout explicitly
        } catch (e) {
            console.error('Failed to stop recording:', e);
            // UI should update via onend, but clear state just in case
            isRecording = false;
             updateRecordingUI(false);
        }
    }
}

/**
 * Chuyển đổi trạng thái ghi âm (bắt đầu/dừng).
 * Đây là hàm được gọi bởi event listener của nút record.
 */
export function toggleRecording() {
    if (!recognition) {
        console.error("Speech recognition not initialized.");
        showNotification("Chức năng ghi âm chưa sẵn sàng.", "error");
        return;
    }
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
} 