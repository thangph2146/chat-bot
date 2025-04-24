// js/login-page.js
import { handleGoogleVerifyToken } from './login.js'; // Chỉ import hàm xác thực token Google
import { checkAuthentication } from '../chat/auth.js'; // Import checkAuthentication
import { GOOGLE_CLIENT_ID } from '../chat/config.js'; // Chỉ import Client ID

// *** Redirect if already logged in ***
if (checkAuthentication()) {
    window.location.href = 'index.html'; // Or your main chat page path
}

// --- Hàm Callback từ Google Sign-In --- 
async function handleGoogleCredentialResponse(response) {
    const idToken = response.credential;

    // Lấy các element UI để hiển thị trạng thái chờ/lỗi
    const errorMessageDiv = document.getElementById('errorMessage');
    const errorTextElement = document.getElementById('errorText');
    const googleSignInButtonDiv = document.getElementById('googleSignInButtonDiv'); // Div chứa nút Google

    if (!errorMessageDiv || !errorTextElement || !googleSignInButtonDiv) {
        console.error("[login-page.js] UI elements for Google Sign-In feedback not found.");
        alert("Lỗi giao diện, không thể xử lý đăng nhập Google.");
        return;
    }

    errorMessageDiv.style.display = 'none'; // Ẩn lỗi cũ
    errorTextElement.textContent = '';

    // --- Hiển thị trạng thái chờ --- 
    googleSignInButtonDiv.style.opacity = '0.6';
    googleSignInButtonDiv.style.pointerEvents = 'none';
    errorTextElement.textContent = 'Đang xác thực với máy chủ...';
    errorMessageDiv.style.display = 'flex'; 
    errorMessageDiv.classList.remove('text-red-600'); // Bỏ màu đỏ lỗi
    errorMessageDiv.classList.add('text-blue-600'); // Màu xanh thông báo

    try {
        // Gọi hàm trong login.js để gửi idToken về backend
        const verificationResult = await handleGoogleVerifyToken(idToken);

        if (verificationResult.success) {
            errorMessageDiv.style.display = 'none';
            window.location.href = 'index.html'; // Chuyển hướng khi thành công
        } else {
            // Lỗi từ backend (đã xác thực hoặc lỗi khác)
            console.error("[login-page.js] Google sign-in failed (backend error):");
            errorTextElement.textContent = verificationResult.message || 'Đăng nhập bằng Google thất bại từ máy chủ.';
            errorMessageDiv.classList.remove('text-blue-600');
            errorMessageDiv.classList.add('text-red-600');
            errorMessageDiv.style.display = 'flex';
        }
    } catch (error) {
        // Lỗi mạng hoặc lỗi không mong muốn khi gọi handleGoogleVerifyToken
        console.error("[login-page.js] Error during Google sign-in process:", error);
        errorTextElement.textContent = 'Lỗi kết nối hoặc xử lý phía máy chủ khi đăng nhập Google.';
        errorMessageDiv.classList.remove('text-blue-600');
        errorMessageDiv.classList.add('text-red-600');
        errorMessageDiv.style.display = 'flex';
    } finally {
        // --- Khôi phục trạng thái nút Google --- 
        googleSignInButtonDiv.style.opacity = '1';
        googleSignInButtonDiv.style.pointerEvents = 'auto';
        // Chỉ ẩn thông báo loading màu xanh, giữ lại nếu có lỗi màu đỏ
        if (errorMessageDiv.classList.contains('text-blue-600')) {
           errorMessageDiv.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Chỉ lấy các element cần thiết cho Google Sign-In và thông báo lỗi
    const errorMessageDiv = document.getElementById('errorMessage');
    const errorTextElement = document.getElementById('errorText');
    const googleSignInButtonDiv = document.getElementById('googleSignInButtonDiv');

    // Check for necessary elements for Google sign-in
    if (!errorMessageDiv || !errorTextElement || !googleSignInButtonDiv) {
        console.error("[login-page.js] Google Sign-In UI elements not found. Initialization failed.");
        if (errorTextElement && errorMessageDiv) {
            errorTextElement.textContent = 'Lỗi tải giao diện đăng nhập Google.';
            errorMessageDiv.style.display = 'flex';
        }
        return;
    }

    // Đảm bảo hàm handleGoogleVerifyToken đã được tải
    if (typeof handleGoogleVerifyToken !== 'function') {
        console.error("[login-page.js] CRITICAL ERROR: handleGoogleVerifyToken() not found.");
        errorTextElement.textContent = 'Lỗi tải chức năng đăng nhập Google. Vui lòng thử lại.';
        errorMessageDiv.style.display = 'flex';
        // Nút Google được quản lý bởi thư viện, không cần disable ở đây
        return;
    }

    // --- Khởi tạo Google Sign In --- 
    // Đặt trong window.onload để đảm bảo thư viện gsi đã tải xong và GOOGLE_CLIENT_ID đã sẵn sàng
    window.onload = function () {
      if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
          console.error("[login-page.js] Google Identity Services library (gsi) not loaded.");
          if (errorTextElement && errorMessageDiv) {
              errorTextElement.textContent = 'Không thể tải thư viện đăng nhập Google. Vui lòng kiểm tra kết nối mạng hoặc thử lại.';
              errorMessageDiv.style.display = 'flex';
          }
          return;
      }
      if (!GOOGLE_CLIENT_ID) {
          console.error("[login-page.js] GOOGLE_CLIENT_ID is not defined or imported.");
          if (errorTextElement && errorMessageDiv) {
              errorTextElement.textContent = 'Lỗi cấu hình phía client (Client ID).';
              errorMessageDiv.style.display = 'flex';
          }
          return;
      }
      try {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID, 
          callback: handleGoogleCredentialResponse // Hàm sẽ được gọi sau khi đăng nhập Google thành công
        });
        
        // Render nút đăng nhập Google vào div đã chuẩn bị
        google.accounts.id.renderButton(
          googleSignInButtonDiv, // Element div để render nút vào
          { theme: "outline", size: "large", type: "standard", text: "signin_with", shape: "rectangular", logo_alignment: "left" }  // Tùy chỉnh giao diện nút
        );
        
        // Tùy chọn: Hiển thị One Tap prompt (đăng nhập nhanh nếu đã từng đăng nhập)
        // google.accounts.id.prompt(); 
      } catch (error) {
          console.error("[login-page.js] Error initializing Google Sign-In:", error);
          if (errorTextElement && errorMessageDiv) {
             errorTextElement.textContent = 'Không thể khởi tạo đăng nhập Google. Vui lòng tải lại trang hoặc kiểm tra cấu hình console.';
             errorMessageDiv.style.display = 'flex';
          }
      }
    };

    // --- Xử lý Submit Form Email/Password đã bị xóa --- 
    // loginForm.addEventListener('submit', async function(event) { ... });

    // --- Định nghĩa animation shake đã bị xóa --- 
    // let shakeKeyframesDefined = false; ...

    // Cập nhật năm bản quyền (giữ nguyên)
    const copyrightYearElement = document.getElementById('copyrightYear');
    if (copyrightYearElement) {
        copyrightYearElement.textContent = new Date().getFullYear();
    }
}); 