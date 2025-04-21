-- Xóa nội dung cũ nếu có

-- =============================================
-- Bảng Người dùng (Users)
-- =============================================
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),         -- ID duy nhất cho mỗi người dùng
    FullName NVARCHAR(255) NOT NULL,              -- Họ và tên người dùng
    Email VARCHAR(255) NOT NULL UNIQUE,           -- Email đăng nhập (UNIQUE để đảm bảo không trùng)
    PasswordHash VARCHAR(MAX) NULL,               -- Hash mật khẩu (NULL nếu đăng nhập qua Google)
    AuthProvider VARCHAR(50) NOT NULL DEFAULT 'local', -- Nguồn gốc tài khoản ('local', 'google')
    GoogleID VARCHAR(255) NULL UNIQUE,            -- ID người dùng từ Google (UNIQUE nếu có)
    ProfilePictureURL VARCHAR(MAX) NULL,          -- URL ảnh đại diện (từ Google hoặc upload)
    IsVerified BIT NOT NULL DEFAULT 0,            -- Trạng thái xác thực email (0: chưa, 1: đã)
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(), -- Thời gian tạo tài khoản
    LastLoginAt DATETIME2 NULL                    -- Thời gian đăng nhập lần cuối
);

-- Index trên cột Email để tăng tốc độ truy vấn
CREATE INDEX IX_Users_Email ON Users(Email);
-- Index trên cột GoogleID
CREATE INDEX IX_Users_GoogleID ON Users(GoogleID) WHERE GoogleID IS NOT NULL;


-- =============================================
-- Bảng Phiên Chat (ChatSessions)
-- =============================================
CREATE TABLE ChatSessions (
    SessionID VARCHAR(100) PRIMARY KEY,           -- ID phiên chat (có thể từ client hoặc UUID)
    UserID INT NOT NULL,                          -- Người dùng sở hữu phiên chat
    Title NVARCHAR(255) NULL,                     -- Tiêu đề của phiên chat (có thể do người dùng đặt hoặc tự sinh)
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(), -- Thời gian tạo phiên chat
    LastUpdatedAt DATETIME2 NOT NULL DEFAULT GETDATE(), -- Thời gian cập nhật cuối cùng
    -- Khóa ngoại liên kết đến bảng Users
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE -- Xóa các phiên chat nếu người dùng bị xóa
);

-- Index trên cột UserID để tăng tốc độ truy vấn lịch sử chat của người dùng
CREATE INDEX IX_ChatSessions_UserID ON ChatSessions(UserID);


-- =============================================
-- Bảng Tin nhắn Chat (ChatMessages)
-- =============================================
CREATE TABLE ChatMessages (
    MessageID BIGINT PRIMARY KEY IDENTITY(1,1),   -- ID duy nhất cho mỗi tin nhắn
    SessionID VARCHAR(100) NOT NULL,              -- Phiên chat chứa tin nhắn này
    UserID INT NULL,                              -- Người dùng gửi tin nhắn (NULL nếu là bot)
    IsUser BIT NOT NULL,                          -- Đánh dấu tin nhắn từ người dùng (1) hay bot (0)
    Content NVARCHAR(MAX) NOT NULL,               -- Nội dung tin nhắn (hỗ trợ Unicode và nội dung dài)
    Timestamp DATETIME2 NOT NULL DEFAULT GETDATE(), -- Thời điểm gửi tin nhắn
    -- Khóa ngoại liên kết đến bảng ChatSessions
    FOREIGN KEY (SessionID) REFERENCES ChatSessions(SessionID) ON DELETE CASCADE, -- Xóa tin nhắn nếu phiên chat bị xóa
    -- Khóa ngoại liên kết đến bảng Users (cho phép NULL vì bot không có UserID)
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE NO ACTION -- Không xóa User khi xóa tin nhắn
);

-- Index trên cột SessionID và Timestamp để tăng tốc độ tải tin nhắn trong một phiên
CREATE INDEX IX_ChatMessages_SessionID_Timestamp ON ChatMessages(SessionID, Timestamp);


-- =============================================
-- Bảng Token Đặt lại Mật khẩu (PasswordResetTokens)
-- =============================================
CREATE TABLE PasswordResetTokens (
    TokenID INT PRIMARY KEY IDENTITY(1,1),        -- ID duy nhất cho token
    UserID INT NOT NULL,                          -- Người dùng yêu cầu đặt lại mật khẩu
    TokenHash VARCHAR(MAX) NOT NULL,              -- Hash của token đặt lại mật khẩu
    ExpiryDate DATETIME2 NOT NULL,                -- Thời gian hết hạn của token
    IsUsed BIT NOT NULL DEFAULT 0,                -- Trạng thái token đã được sử dụng hay chưa
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(), -- Thời gian tạo token
    -- Khóa ngoại liên kết đến bảng Users
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE -- Xóa token nếu người dùng bị xóa
);

-- Index trên cột UserID và CreatedAt
CREATE INDEX IX_PasswordResetTokens_UserID_CreatedAt ON PasswordResetTokens(UserID, CreatedAt);


-- =============================================
-- Bảng Tệp đính kèm (Attachments) - Optional
-- (Chỉ cần nếu bạn lưu trữ file trên server)
-- =============================================
CREATE TABLE Attachments (
    AttachmentID INT PRIMARY KEY IDENTITY(1,1),    -- ID duy nhất cho tệp đính kèm
    MessageID BIGINT NOT NULL,                     -- Tin nhắn chứa tệp này
    FileName NVARCHAR(260) NOT NULL,               -- Tên gốc của tệp
    FileURL VARCHAR(MAX) NOT NULL,                 -- Đường dẫn hoặc URL đến tệp được lưu trữ
    FileSize BIGINT NOT NULL,                      -- Kích thước tệp (bytes)
    FileType VARCHAR(100) NOT NULL,                -- Loại MIME của tệp (e.g., 'image/jpeg', 'application/pdf')
    UploadedAt DATETIME2 NOT NULL DEFAULT GETDATE(), -- Thời gian tải lên
    -- Khóa ngoại liên kết đến bảng ChatMessages
    FOREIGN KEY (MessageID) REFERENCES ChatMessages(MessageID) ON DELETE CASCADE -- Xóa tệp nếu tin nhắn bị xóa
);

-- Index trên cột MessageID
CREATE INDEX IX_Attachments_MessageID ON Attachments(MessageID);
