-- Xóa nội dung cũ nếu có

-- =============================================
-- Bảng Người dùng (Users)
-- =============================================
CREATE TABLE Users (
    UserID INT PRIMARY KEY AUTO_INCREMENT,         -- ID duy nhất cho mỗi người dùng (MySQL: AUTO_INCREMENT)
    FullName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,              -- Họ và tên người dùng (MySQL: VARCHAR, specify charset for Unicode)
    Email VARCHAR(255) NOT NULL UNIQUE,           -- Email đăng nhập
    PasswordHash TEXT NULL,                       -- Hash mật khẩu (MySQL: TEXT for potentially long strings)
    AuthProvider VARCHAR(50) NOT NULL DEFAULT 'local', -- Nguồn gốc tài khoản
    GoogleID VARCHAR(255) NULL UNIQUE,            -- ID người dùng từ Google
    ProfilePictureURL TEXT NULL,                  -- URL ảnh đại diện (MySQL: TEXT)
    IsVerified BOOLEAN NOT NULL DEFAULT 0,        -- Trạng thái xác thực email (MySQL: BOOLEAN or TINYINT(1))
    CreatedAt DATETIME NOT NULL DEFAULT NOW(),    -- Thời gian tạo tài khoản (MySQL: DATETIME, NOW())
    LastLoginAt DATETIME NULL                     -- Thời gian đăng nhập lần cuối (MySQL: DATETIME)
);

-- Index trên cột Email để tăng tốc độ truy vấn
CREATE INDEX IX_Users_Email ON Users(Email);
-- Index trên cột GoogleID (MySQL >= 8.0.13 supports conditional index, older versions might require trigger or separate table)
CREATE INDEX IX_Users_GoogleID ON Users(GoogleID); -- Simplified for broader compatibility or ensure target MySQL version >= 8.0.13 for WHERE clause


-- =============================================
-- Bảng Phiên Chat (ChatSessions)
-- =============================================
CREATE TABLE ChatSessions (
    SessionID VARCHAR(100) PRIMARY KEY,           -- ID phiên chat
    UserID INT NOT NULL,                          -- Người dùng sở hữu phiên chat
    Title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,                     -- Tiêu đề của phiên chat (MySQL: VARCHAR, specify charset)
    CreatedAt DATETIME NOT NULL DEFAULT NOW(),    -- Thời gian tạo phiên chat (MySQL: DATETIME, NOW())
    LastUpdatedAt DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(), -- Thời gian cập nhật cuối cùng (MySQL: DATETIME, NOW(), ON UPDATE NOW() is common)
    -- Khóa ngoại liên kết đến bảng Users
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Index trên cột UserID
CREATE INDEX IX_ChatSessions_UserID ON ChatSessions(UserID);


-- =============================================
-- Bảng Tin nhắn Chat (ChatMessages)
-- =============================================
CREATE TABLE ChatMessages (
    MessageID BIGINT PRIMARY KEY AUTO_INCREMENT,  -- ID duy nhất cho mỗi tin nhắn (MySQL: AUTO_INCREMENT)
    SessionID VARCHAR(100) NOT NULL,              -- Phiên chat chứa tin nhắn này
    UserID INT NULL,                              -- Người dùng gửi tin nhắn
    IsUser BOOLEAN NOT NULL,                      -- Đánh dấu tin nhắn từ người dùng (MySQL: BOOLEAN)
    Content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,                   -- Nội dung tin nhắn (MySQL: TEXT for long content, specify charset)
    Timestamp DATETIME NOT NULL DEFAULT NOW(),    -- Thời điểm gửi tin nhắn (MySQL: DATETIME, NOW())
    -- Khóa ngoại liên kết đến bảng ChatSessions
    FOREIGN KEY (SessionID) REFERENCES ChatSessions(SessionID) ON DELETE CASCADE,
    -- Khóa ngoại liên kết đến bảng Users
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE SET NULL -- Changed to SET NULL as deleting user might not mean deleting message history, adjust if needed
);

-- Index trên cột SessionID và Timestamp
CREATE INDEX IX_ChatMessages_SessionID_Timestamp ON ChatMessages(SessionID, Timestamp);


-- =============================================
-- Bảng Token Đặt lại Mật khẩu (PasswordResetTokens)
-- =============================================
CREATE TABLE PasswordResetTokens (
    TokenID INT PRIMARY KEY AUTO_INCREMENT,       -- ID duy nhất cho token (MySQL: AUTO_INCREMENT)
    UserID INT NOT NULL,                          -- Người dùng yêu cầu đặt lại mật khẩu
    TokenHash TEXT NOT NULL,                      -- Hash của token (MySQL: TEXT)
    ExpiryDate DATETIME NOT NULL,                 -- Thời gian hết hạn của token (MySQL: DATETIME)
    IsUsed BOOLEAN NOT NULL DEFAULT 0,            -- Trạng thái token (MySQL: BOOLEAN)
    CreatedAt DATETIME NOT NULL DEFAULT NOW(),    -- Thời gian tạo token (MySQL: DATETIME, NOW())
    -- Khóa ngoại liên kết đến bảng Users
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Index trên cột UserID và CreatedAt
CREATE INDEX IX_PasswordResetTokens_UserID_CreatedAt ON PasswordResetTokens(UserID, CreatedAt);


-- =============================================
-- Bảng Tệp đính kèm (Attachments) - Optional
-- =============================================
CREATE TABLE Attachments (
    AttachmentID INT PRIMARY KEY AUTO_INCREMENT,   -- ID duy nhất cho tệp đính kèm (MySQL: AUTO_INCREMENT)
    MessageID BIGINT NOT NULL,                     -- Tin nhắn chứa tệp này
    FileName VARCHAR(260) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,               -- Tên gốc của tệp (MySQL: VARCHAR, specify charset)
    FileURL TEXT NOT NULL,                         -- Đường dẫn hoặc URL (MySQL: TEXT)
    FileSize BIGINT NOT NULL,                      -- Kích thước tệp (bytes)
    FileType VARCHAR(100) NOT NULL,                -- Loại MIME của tệp
    UploadedAt DATETIME NOT NULL DEFAULT NOW(),    -- Thời gian tải lên (MySQL: DATETIME, NOW())
    -- Khóa ngoại liên kết đến bảng ChatMessages
    FOREIGN KEY (MessageID) REFERENCES ChatMessages(MessageID) ON DELETE CASCADE
);

-- Index trên cột MessageID
CREATE INDEX IX_Attachments_MessageID ON Attachments(MessageID);
