require('dotenv').config({ path: './.env', debug: true });
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Debug: Kiểm tra file .env có tồn tại không và nội dung của nó
try {
  const envExists = fs.existsSync('.env');
  console.log('File .env exists:', envExists);
  if (envExists) {
    const envContent = fs.readFileSync('.env', 'utf8');
    console.log('Nội dung file .env:');
    console.log(envContent);
  }
} catch (error) {
  console.error('Lỗi khi kiểm tra file .env:', error);
}

// Debug: Hiển thị tất cả các biến môi trường
console.log('Debugging environment variables:');
console.log('DIFY_API_KEY:', process.env.DIFY_API_KEY);
console.log('API_BASE_URL:', process.env.API_BASE_URL);
console.log('DIFY_API_BASE_URL:', process.env.DIFY_API_BASE_URL);

// Đặt giá trị mặc định cho các biến nếu chúng không được đọc từ .env
if (!process.env.DIFY_API_KEY) {
  process.env.DIFY_API_KEY = 'app-kyJ4IsXr0BvdaSuYBpdPISXH';
  console.log('Đã đặt DIFY_API_KEY mặc định:', process.env.DIFY_API_KEY);
}

if (!process.env.API_BASE_URL) {
  process.env.API_BASE_URL = 'https://chatbotapi.hub.edu.vn/api';
  console.log('Đã đặt API_BASE_URL mặc định:', process.env.API_BASE_URL);
}

if (!process.env.DIFY_API_BASE_URL) {
  process.env.DIFY_API_BASE_URL = 'https://trolyai.hub.edu.vn';
  console.log('Đã đặt DIFY_API_BASE_URL mặc định:', process.env.DIFY_API_BASE_URL);
}

// Import node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Middleware
app.use(express.json());
app.use(express.static('./'));

// Lấy API_BASE_URL từ biến môi trường và đảm bảo định dạng đúng
const getApiBaseUrl = () => {
  let apiBaseUrl = process.env.API_BASE_URL || 'https://chatbotapi.hub.edu.vn/api';
  
  // Xóa dấu nháy nếu có
  apiBaseUrl = apiBaseUrl.replace(/['";]/g, '');
  
  // Xóa dấu / ở cuối nếu có
  if (apiBaseUrl.endsWith('/')) {
    apiBaseUrl = apiBaseUrl.slice(0, -1);
  }
  
  return apiBaseUrl;
};

// Lấy DIFY_API_BASE_URL từ biến môi trường và đảm bảo định dạng đúng
const getDifyApiBaseUrl = () => {
  let difyApiBaseUrl = process.env.DIFY_API_BASE_URL || 'https://trolyai.hub.edu.vn';
  
  // Xóa dấu nháy nếu có
  difyApiBaseUrl = difyApiBaseUrl.replace(/['";]/g, '');
  
  // Xóa dấu / ở cuối nếu có
  if (difyApiBaseUrl.endsWith('/')) {
    difyApiBaseUrl = difyApiBaseUrl.slice(0, -1);
  }
  
  return difyApiBaseUrl;
};

// Lấy DIFY_API_KEY từ biến môi trường và đảm bảo định dạng đúng
const getDifyApiKey = () => {
  // Nếu không có DIFY_API_KEY trong biến môi trường, sử dụng giá trị mặc định
  let difyApiKey = process.env.DIFY_API_KEY || 'app-kyJ4IsXr0BvdaSuYBpdPISXH';
  
  // Xóa dấu nháy nếu có
  difyApiKey = difyApiKey?.replace(/['";]/g, '');
  
  return difyApiKey;
};

// API endpoint để lấy DIFY_API_KEY an toàn
app.get('/api/config', (req, res) => {
  // Chỉ trả về thông tin cấu hình cần thiết, loại bỏ thông tin nhạy cảm từ client
  res.json({
    DIFY_API_BASE_URL: getDifyApiBaseUrl(),
    DIFY_CHAT_API_ENDPOINT: `/api/dify/chat`, // Sử dụng đường dẫn tương đối
    API_BASE_URL: '/api/backend',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID?.replace(/['";]/g, '') || '197433305936-sffe02eu5jecf94m1oh1rn6igrosv6f3.apps.googleusercontent.com'
  });
});

// API endpoint để proxy request đến Dify API
app.post('/api/dify/chat', async (req, res) => {
  try {
    // Lấy thông tin từ request
    const difyApiBaseUrl = getDifyApiBaseUrl();
    const difyApiUrl = `${difyApiBaseUrl}/v1/chat-messages`;
    const difyApiKey = getDifyApiKey();
    
    console.log('Sending request to Dify API with key:', difyApiKey ? `${difyApiKey.substring(0, 8)}...` : 'không có');
    
    if (!difyApiKey) {
      return res.status(500).json({ error: 'DIFY_API_KEY chưa được cấu hình' });
    }
    
    // Chuyển tiếp request đến Dify API với API key từ server
    const response = await fetch(difyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${difyApiKey}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(req.body),
      // Thêm tùy chọn bỏ qua kiểm tra SSL
      agent: new (await import('node:https')).Agent({
        rejectUnauthorized: false
      }),
      // Add timeout to prevent hanging requests
      timeout: 30000 // 30 seconds timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Dify API error: ${response.status} - ${errorText}`);
      
      let userMessage = '';
      switch(response.status) {
        case 400:
          userMessage = 'Yêu cầu không hợp lệ. Vui lòng thử lại với nội dung khác.';
          break;
        case 401:
          userMessage = 'Phiên làm việc của bạn đã hết hạn. Vui lòng tải lại trang để tiếp tục trò chuyện.';
          break;
        case 403:
          userMessage = 'Bạn không có quyền truy cập chức năng này.';
          break;
        case 404:
          userMessage = 'Không thể kết nối đến trợ lý AI. Vui lòng thử lại sau.';
          break;
        case 429:
          userMessage = 'Xin lỗi! Tôi đang nhận quá nhiều yêu cầu. Hãy đợi một lát và thử lại nhé.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          userMessage = 'Hệ thống AI tạm thời không phản hồi. Tôi sẽ sớm hoạt động trở lại!';
          break;
        default:
          userMessage = 'Đã xảy ra lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.';
      }
      
      return res.status(response.status).json({ 
        error: `Lỗi API Dify: ${response.status}`, 
        message: userMessage
      });
    }

    // Chuyển response từ Dify API về client
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Stream response về client
    response.body.pipe(res);
  } catch (error) {
    console.error('Lỗi khi gọi Dify API:', error);
    
    // Send a more specific error message based on the error type
    let userMessage = 'Vui lòng thử lại sau ít phút.';
    let statusCode = 500;
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      statusCode = 503;
      userMessage = 'Kết nối mạng có vấn đề. Vui lòng kiểm tra kết nối internet và thử lại.';
    } else if (error.code === 'ETIMEDOUT') {
      statusCode = 504;
      userMessage = 'Câu hỏi của bạn quá phức tạp, tôi cần thêm thời gian. Hãy thử câu ngắn gọn hơn hoặc chia nhỏ vấn đề.';
    } else if (error.type === 'system' && error.code === 'ERR_INVALID_URL') {
      statusCode = 500;
      userMessage = 'Có lỗi xảy ra với hệ thống. Vui lòng thử lại sau hoặc liên hệ hỗ trợ nếu vấn đề vẫn tiếp diễn.';
    } else if (error.name === 'AbortError') {
      statusCode = 408;
      userMessage = 'Câu hỏi của bạn quá phức tạp, tôi cần thêm thời gian. Hãy thử câu ngắn gọn hơn hoặc chia nhỏ vấn đề.';
    }
    
    return res.status(statusCode).json({ 
      error: `Lỗi khi gọi Dify API: ${error.message}`, 
      message: userMessage
    });
  }
});

// Proxy cho các request đến API backend
app.all('/api/backend/*', async (req, res) => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    
    // Lấy đường dẫn sau /api/backend/
    const pathSegments = req.url.split('/api/backend/');
    let targetPath = '';
    if (pathSegments.length > 1) {
      targetPath = pathSegments[1];
    }
    
    // Đảm bảo targetPath không có dấu / ở đầu
    const cleanTargetPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
    
    // Xây dựng URL đích
    const targetUrl = `${apiBaseUrl}/${cleanTargetPath}`;
    
    console.log(`Proxying request to: ${targetUrl}`);
    
    // Headers cho request
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Thêm Authorization header nếu có
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }
    
    // Gửi request tới API backend
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      // Thêm tùy chọn bỏ qua kiểm tra SSL
      agent: new (await import('node:https')).Agent({
        rejectUnauthorized: false
      })
    });
    
    // Kiểm tra trạng thái response
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend API error (${response.status}): ${errorText}`);
      return res.status(response.status).send(errorText);
    }
    
    // Forward response từ API backend về client
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const responseData = await response.json();
      res.status(response.status).json(responseData);
    } else {
      const responseText = await response.text();
      res.status(response.status).send(responseText);
    }
  } catch (error) {
    console.error('Lỗi khi gọi API backend:', error);
    res.status(500).json({ error: 'Lỗi khi kết nối đến API backend', details: error.message });
  }
});

// Route tĩnh cho các file HTML, CSS, JS
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Chuyển hướng các route khác về trang chính
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Khởi động server
app.listen(PORT, () => {
  const difyApiKey = getDifyApiKey();
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
  console.log(`Trạng thái DIFY_API_KEY: ${difyApiKey ? 'đã cấu hình' : 'chưa cấu hình'}`);
  console.log(`DIFY_API_KEY: ${difyApiKey ? difyApiKey.substring(0, 8) + '...' : 'không có'}`);
  console.log(`API_BASE_URL: ${getApiBaseUrl()}`);
  console.log(`DIFY_API_BASE_URL: ${getDifyApiBaseUrl()}`);
});