/**
 * Kiểm tra xem trình duyệt có hỗ trợ Web Speech API không
 */
export const isSpeechSynthesisSupported = (): boolean => {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
};

/**
 * Lấy danh sách voices có sẵn
 */
export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  if (!isSpeechSynthesisSupported()) {
    return [];
  }
  
  return window.speechSynthesis.getVoices();
};

/**
 * Lấy voice mặc định (ưu tiên tiếng Việt)
 */
export const getDefaultVoice = (): SpeechSynthesisVoice | null => {
  const voices = getAvailableVoices();
  
  // Ưu tiên tìm voice tiếng Việt
  const vietnameseVoice = voices.find(voice => 
    voice.lang.startsWith('vi') || 
    voice.lang.startsWith('vi-VN') ||
    voice.name.toLowerCase().includes('vietnamese') ||
    voice.name.toLowerCase().includes('viet nam')
  );
  
  if (vietnameseVoice) {
    return vietnameseVoice;
  }
  
  // Nếu không có tiếng Việt, tìm voice tiếng Anh
  const englishVoice = voices.find(voice => 
    voice.lang.startsWith('en') || 
    voice.lang.startsWith('en-US') ||
    voice.name.toLowerCase().includes('english')
  );
  
  if (englishVoice) {
    return englishVoice;
  }
  
  // Cuối cùng trả về voice đầu tiên
  return voices.length > 0 ? voices[0] : null;
};

/**
 * Lọc voices theo ngôn ngữ
 */
export const getVoicesByLanguage = (lang: string): SpeechSynthesisVoice[] => {
  const voices = getAvailableVoices();
  return voices.filter(voice => voice.lang.startsWith(lang));
};

/**
 * Lấy danh sách voices tiếng Việt
 */
export const getVietnameseVoices = (): SpeechSynthesisVoice[] => {
  const voices = getAvailableVoices();
  return voices.filter(voice => 
    voice.lang.startsWith('vi') || 
    voice.lang.startsWith('vi-VN') ||
    voice.name.toLowerCase().includes('vietnamese') ||
    voice.name.toLowerCase().includes('viet nam')
  );
};

/**
 * Lấy danh sách voices tiếng Anh
 */
export const getEnglishVoices = (): SpeechSynthesisVoice[] => {
  const voices = getAvailableVoices();
  return voices.filter(voice => 
    voice.lang.startsWith('en') || 
    voice.lang.startsWith('en-US') ||
    voice.name.toLowerCase().includes('english')
  );
};

/**
 * Tạo utterance với cấu hình mặc định
 */
export const createUtterance = (
  text: string, 
  options: {
    voice?: SpeechSynthesisVoice | null;
    rate?: number;
    pitch?: number;
    volume?: number;
  } = {}
): SpeechSynthesisUtterance => {
  const utterance = new SpeechSynthesisUtterance(text);
  
  utterance.voice = options.voice || getDefaultVoice();
  utterance.rate = options.rate || 1;
  utterance.pitch = options.pitch || 1;
  utterance.volume = options.volume || 1;
  
  return utterance;
};

/**
 * Phát text với cấu hình đơn giản
 */
export const speakText = (
  text: string,
  options: {
    voice?: SpeechSynthesisVoice | null;
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: SpeechSynthesisErrorEvent) => void;
  } = {}
): void => {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    return;
  }

  const utterance = createUtterance(text, options);
  
  // Thêm event listeners
  if (options.onStart) utterance.onstart = options.onStart;
  if (options.onEnd) utterance.onend = options.onEnd;
  if (options.onError) utterance.onerror = options.onError;
  
  // Dừng phát hiện tại
  window.speechSynthesis.cancel();
  
  // Phát text mới
  window.speechSynthesis.speak(utterance);
};

/**
 * Dừng tất cả speech đang phát
 */
export const stopAllSpeech = (): void => {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
};

/**
 * Tạm dừng speech
 */
export const pauseSpeech = (): void => {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.pause();
  }
};

/**
 * Tiếp tục speech đã tạm dừng
 */
export const resumeSpeech = (): void => {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.resume();
  }
}; 