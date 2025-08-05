'use client';

// ==================== CONFIGURATION ====================
const DIFY_API_BASE_URL = process.env.NEXT_PUBLIC_DIFY_API_BASE_URL || 'https://trolyai.hub.edu.vn';
const DIFY_API_KEY = process.env.NEXT_PUBLIC_DIFY_API_KEY || 'app-kyJ4IsXr0BvdaSuYBpdPISXH';

// ==================== TYPES ====================
export interface DifyChatRequest {
  inputs?: Record<string, unknown>;
  query: string;
  response_mode: 'streaming' | 'blocking';
  conversation_id?: string;
  user?: string;
  files?: Array<{
    type: string;
    transfer_method: string;
    url: string;
  }>;
}

export interface DifyChatResponse {
  fullMessage: string;
  conversationId: string | null;
  messageId: string | null;
}

export interface DifyStreamingCallbacks {
  onMessage: (message: string) => void;
  onComplete: (result: DifyChatResponse) => void;
  onError: (error: Error) => void;
  onStart?: () => void;
}

// ==================== UTILITY FUNCTIONS ====================
const parseStreamingData = (data: string): Record<string, unknown> | null => {
  if (!data.startsWith('data: ')) {
    return null;
  }
  
  const jsonData = data.substring(6).trim();
  if (!jsonData || jsonData === '[DONE]') {
    return null;
  }
  
  try {
    return JSON.parse(jsonData);
  } catch (e) {
    console.error('Error parsing JSON line:', e, 'Data:', jsonData);
    return null;
  }
};

const handleStreamingError = (response: { status: number; data?: unknown }): Error => {
  const statusMessages: Record<number, string> = {
    400: 'Yêu cầu không hợp lệ. Vui lòng thử lại với nội dung khác.',
    401: 'API Key không hợp lệ hoặc chưa được cấu hình. Vui lòng kiểm tra NEXT_PUBLIC_DIFY_API_KEY',
    403: 'Bạn không có quyền truy cập chức năng này.',
    404: 'Không thể kết nối đến trợ lý AI. Vui lòng thử lại sau.',
    429: 'Xin lỗi! Tôi đang nhận quá nhiều yêu cầu. Hãy đợi một lát và thử lại nhé.',
    500: 'Hệ thống AI tạm thời không phản hồi. Tôi sẽ sớm hoạt động trở lại!',
    502: 'Hệ thống AI tạm thời không phản hồi. Tôi sẽ sớm hoạt động trở lại!',
    503: 'Hệ thống AI tạm thời không phản hồi. Tôi sẽ sớm hoạt động trở lại!',
    504: 'Hệ thống AI tạm thời không phản hồi. Tôi sẽ sớm hoạt động trở lại!',
  };
  
  const message = statusMessages[response.status] || 'Đã xảy ra lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.';
  return new Error(`API Error ${response.status}: ${message}`);
};

// ==================== STREAMING CHAT FUNCTION ====================
export const postDifyChatStream = async (
  data: DifyChatRequest,
  callbacks: DifyStreamingCallbacks
): Promise<void> => {
  let fullMessage = '';
  let latestConversationId: string | null = null;
  let messageId: string | null = null;

  try {
    // Call onStart callback if provided
    callbacks.onStart?.();

    console.log('=== DIFY API REQUEST (AXIOS STREAMING) ===');
    console.log('URL:', `${DIFY_API_BASE_URL}/v1/chat-messages`);
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Accept': 'text/event-stream'
    });
    console.log('Request body:', JSON.stringify(data, null, 2));

    // Sử dụng fetch cho streaming vì axios có hạn chế với streaming
    const response = await fetch(`${DIFY_API_BASE_URL}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        ...data,
        response_mode: 'streaming'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const error = handleStreamingError({ status: response.status });
      callbacks.onError(error);
      return;
    }

    if (!response.body) {
      throw new Error('Response body is not readable');
    }

    // Process streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Process streaming response
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n');

      while (boundary !== -1) {
        const eventString = buffer.substring(0, boundary).trim();
        buffer = buffer.substring(boundary + 1);

        if (eventString.startsWith('data: ')) {
          const parsedData = parseStreamingData(eventString);
          if (parsedData) {
            if (parsedData.event === 'message') {
              const chunkText = (parsedData.answer as string) || '';
              if (chunkText) {
                fullMessage += chunkText;
                callbacks.onMessage(chunkText);
              }
            }
            
            // Update conversation and message IDs
            if (parsedData.conversation_id) {
              latestConversationId = parsedData.conversation_id as string;
            }
            if (parsedData.message_id || parsedData.id) {
              messageId = (parsedData.message_id || parsedData.id) as string;
            }
          }
        }
        boundary = buffer.indexOf('\n');
      }
    }

    // Process remaining buffer
    if (buffer.trim().startsWith('data: ')) {
      const parsedData = parseStreamingData(buffer.trim());
      if (parsedData) {
        if (parsedData.event === 'message') {
          const chunkText = (parsedData.answer as string) || '';
          if (chunkText) {
            fullMessage += chunkText;
            callbacks.onMessage(chunkText);
          }
        }
        
        if (parsedData.conversation_id) {
          latestConversationId = parsedData.conversation_id as string;
        }
        if (parsedData.message_id || parsedData.id) {
          messageId = (parsedData.message_id || parsedData.id) as string;
        }
      }
    }

    // Call completion callback
    callbacks.onComplete({
      fullMessage,
      conversationId: latestConversationId,
      messageId
    });

  } catch (error: unknown) {
    console.error('Error in streaming chat:', error);
    
    if (error instanceof Error) {
      callbacks.onError(error);
    } else {
      callbacks.onError(new Error('Đã xảy ra lỗi không xác định khi gọi API'));
    }
  }
};

// ==================== BLOCKING CHAT FUNCTION ====================
export const postDifyChat = async (data: DifyChatRequest): Promise<DifyChatResponse> => {
  try {
    console.log('=== DIFY API REQUEST (BLOCKING) ===');
    console.log('URL:', `${DIFY_API_BASE_URL}/v1/chat-messages`);
    console.log('Request body:', JSON.stringify(data, null, 2));

    const response = await fetch(`${DIFY_API_BASE_URL}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIFY_API_KEY}`,
      },
      body: JSON.stringify({
        ...data,
        response_mode: 'blocking'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response data:', response.json());

    const responseData = await response.json() as Record<string, unknown>;
    return {
      fullMessage: (responseData.answer as string) || '',
      conversationId: (responseData.conversation_id as string) || null,
      messageId: (responseData.message_id as string) || (responseData.id as string) || null
    };

  } catch (error: unknown) {
    console.error('Error in chat:', error);
    
    if (error && typeof error === 'object' && 'response' in error) {
      // Axios error with response
      const axiosError = error as { response: { status: number; data?: unknown } };
      const apiError = handleStreamingError(axiosError.response);
      throw apiError;
    } else if (error && typeof error === 'object' && 'request' in error) {
      // Axios error without response
      throw new Error('Không thể kết nối đến Dify API. Vui lòng kiểm tra kết nối mạng.');
    } else {
      // Other error
      throw error;
    }
  }
};

// ==================== LEGACY API FUNCTIONS ====================
export const callDifyApiRoute = {
  // Streaming chat function
  postChatStream: async (
    data: DifyChatRequest, 
    onMessage: (message: string) => void, 
    onComplete: (result: DifyChatResponse) => void, 
    onError: (error: Error) => void,
    onStart?: () => void
  ) => {
    await postDifyChatStream(
      data,
      { onMessage, onComplete, onError, onStart }
    );
  },

  // Blocking chat function
  postChat: async (data: DifyChatRequest): Promise<DifyChatResponse> => {
    return await postDifyChat(data);
  },

};
