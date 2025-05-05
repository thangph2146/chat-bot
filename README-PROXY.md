# Hướng dẫn bảo mật DIFY_API_KEY bằng Node.js và file .env

## Tổng quan giải pháp

1. **Sử dụng Node.js làm proxy server**:
   - API key được lưu trên server thay vì frontend
   - Server làm trung gian cho các API call
   - Frontend không cần biết về API key thực tế

2. **Sử dụng biến môi trường từ file .env**:
   - Bí mật API được lưu trong file .env
   - File .env không được commit lên Git
   - Dễ dàng triển khai trên các môi trường khác nhau

## Cấu trúc thực hiện

### 1. File .env

File này chứa các biến môi trường nhạy cảm:

```
API_BASE_URL=https://chatbotapi.hub.edu.vn/api
DIFY_API_BASE_URL=https://trolyai.hub.edu.vn
DIFY_API_KEY=app-kyJ4IsXr0BvdaSuYBpdPISXH
GOOGLE_CLIENT_ID=197433305936-sffe02eu5jecf94m1oh1rn6igrosv6f3.apps.googleusercontent.com
PORT=3000
```

### 2. Server Node.js (server.js)

Đóng vai trò làm proxy:

- Load các biến môi trường từ file .env
- Cung cấp endpoint `/api/config` để frontend lấy cấu hình (không tiết lộ API key)
- Cung cấp endpoint `/api/dify/chat` để proxy request đến Dify API
- Cung cấp endpoint `/api/backend/*` để proxy request đến backend API

### 3. Frontend (js/chat/config.js)

- Thay đổi để tải cấu hình từ server
- Sử dụng đường dẫn tương đối thay vì trực tiếp
- Không còn lưu trữ DIFY_API_KEY ở client

## Hướng dẫn khởi chạy

1. **Cài đặt dependencies**:
   ```
   npm install
   ```

2. **Tạo file .env**:
   ```
   API_BASE_URL=https://chatbotapi.hub.edu.vn/api
   DIFY_API_BASE_URL=https://trolyai.hub.edu.vn
   DIFY_API_KEY=app-kyJ4IsXr0BvdaSuYBpdPISXH
   GOOGLE_CLIENT_ID=197433305936-sffe02eu5jecf94m1oh1rn6igrosv6f3.apps.googleusercontent.com
   PORT=3000
   ```

3. **Khởi động server**:
   ```
   npm start
   ```

4. **Truy cập ứng dụng**:
   ```
   http://localhost:3000
   ```

## Xử lý lỗi thường gặp

1. **Lỗi không đọc được file .env**:
   - Kiểm tra định dạng file .env (không có dấu nháy, không có dấu chấm phẩy)
   - Kiểm tra vị trí file .env (phải ở thư mục gốc của dự án)

2. **Lỗi chứng chỉ SSL**:
   - Đã thêm tùy chọn `rejectUnauthorized: false` để bỏ qua lỗi SSL
   - Trong môi trường production, nên sử dụng chứng chỉ SSL hợp lệ

3. **Lỗi CORS**:
   - Nếu gặp lỗi CORS, cần thêm middleware `cors` vào server

## Lợi ích của giải pháp

1. **Bảo mật**: API key không xuất hiện trong mã nguồn frontend
2. **Dễ quản lý**: Cấu hình tập trung trong file .env
3. **Linh hoạt**: Dễ dàng chuyển đổi giữa các môi trường (dev, prod)
4. **Kiểm soát**: Có thể thêm logic xác thực, rate limiting tại server 