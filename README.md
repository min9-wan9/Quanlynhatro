# 🏠 HỆ THỐNG QUẢN LÝ NHÀ TRỌ THÔNG MINH

> Hệ thống Fullstack hỗ trợ số hóa toàn diện quy trình vận hành nhà trọ: Quản lý danh mục phòng, hợp đồng điện tử, chỉ số điện nước, hóa đơn, quy trình trả phòng (check-out) quyết toán cọc và Trợ lý ảo AI (Google Gemini Function Calling).

---

## 🌟 Tính Năng Nổi Bật

### 1. Phân hệ Chủ trọ / Quản lý (Admin Dashboard)
* **Bảng điều khiển KPI:** Thống kê trực quan số phòng trống, phòng đang thuê, tỷ lệ lấp đầy, doanh thu và công nợ tồn đọng.
* **Quản lý phòng trọ:** Thêm, sửa, xóa phòng; theo dõi trạng thái phòng (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`).
* **Hợp đồng & Nghiệm thu trả phòng (Check-out):** Tạo hợp đồng, thiết lập chu kỳ thu tiền, tiền cọc. Tiếp nhận đơn trả phòng của khách, tính toán cấn trừ hư hại tài sản và quyết toán hoàn cọc tự động.
* **Tính điện nước & Lập hóa đơn:** Bảng nhập số điện/nước cũ - mới, tự động tính kWh/m³ tiêu thụ và xuất hóa đơn chi tiết hàng tháng.
* **Xử lý sự cố:** Xem hình ảnh hư hại thực tế do khách gửi lên, cập nhật tiến độ sửa chữa.

### 2. Phân hệ Người thuê trọ (Tenant Portal)
* **Hợp đồng & Bàn giao:** Xem lại điều khoản hợp đồng và danh mục tài sản bàn giao.
* **Theo dõi điện nước & Hóa đơn:** Minh bạch chỉ số tiêu thụ, xem chi tiết từng khoản mục trong hóa đơn hàng tháng.
* **Ví thanh toán ảo & AutoPay:** Quản lý số dư ví cá nhân, thanh toán hóa đơn tức thì hoặc bật chế độ tự động thanh toán.
* **Báo hỏng phòng:** Chụp ảnh hiện trường hư hỏng gửi trực tiếp cho chủ nhà kèm mô tả.
* **Yêu cầu trả phòng:** Đăng ký ngày chuyển đi, lý do và cung cấp số tài khoản nhận hoàn tiền cọc.

### 3. Trợ lý ảo AI Chatbot (Google Gemini)
* Tích hợp **Google Gemini Function Calling** có khả năng truy vấn dữ liệu thời gian thực:
  * Tra cứu phòng trống và giá thuê.
  * Tra cứu tình trạng nợ hóa đơn theo số điện thoại.
  * Tự động tạo phiếu báo cáo sự cố khi người thuê nhắn tin.
  * Giải đáp nội quy và quy định nhà trọ 24/7.

---

## 🛠️ Công Nghệ Sử Dụng

* **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/).
* **Backend:** [Node.js](https://nodejs.org/), [Express.js v5](https://expressjs.com/), [TypeScript](https://www.typescriptlang.org/), [Prisma ORM v5](https://www.prisma.io/).
* **Cơ sở dữ liệu:** [PostgreSQL](https://www.postgresql.org/).

* **Đóng gói container:** Docker & Docker Compose.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

Bạn có thể lựa chọn 1 trong 2 cách chạy dưới đây:

### CÁCH 1: Chạy bằng Docker Compose (Khuyên dùng - Nhanh nhất)
Hệ thống đã cấu hình sẵn Docker tự động khởi tạo cơ sở dữ liệu PostgreSQL, đẩy schema và **bơm sẵn dữ liệu mẫu (`seed data`)** vào hệ thống.

1. Đảm bảo máy tính đã cài đặt **Docker Desktop**.
2. Tại thư mục gốc của dự án, mở Terminal và chạy lệnh:
   ```bash
   docker compose up --build
   ```
3. Sau khi hoàn tất:
   * **Frontend:** Truy cập `http://localhost:5173`
   * **Backend API:** Truy cập `http://localhost:3000`

---

### CÁCH 2: Cài đặt và Chạy thủ công trên máy (Manual Setup)

#### Bước 1: Chuẩn bị môi trường & CSDL PostgreSQL
* Cài đặt **Node.js (>= 18.x)** và **PostgreSQL** trên máy.
* Tạo một cơ sở dữ liệu trống trong PostgreSQL (ví dụ: `nhatro_db`).

#### Bước 2: Cấu hình Backend
1. Di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Tạo file `.env` từ file mẫu:
   ```bash
   cp .env.example .env
   ```
   *(Mở file `.env` và cập nhật lại chuỗi kết nối `DATABASE_URL` theo tài khoản PostgreSQL trên máy bạn, kèm khóa `GEMINI_API_KEY` nếu muốn sử dụng tính năng Chat AI).*

4. Đồng bộ Schema vào Cơ sở dữ liệu:
   ```bash
   npx prisma db push
   ```

5. **Nạp dữ liệu mẫu (Seed Data) vào CSDL:**
   ```bash
   npm run seed
   ```
   *(Lệnh này sẽ tự động khởi tạo tài khoản Admin, các phòng trọ mẫu 101, 102, hợp đồng và hóa đơn).*

6. Khởi chạy Backend Server:
   ```bash
   npm run dev
   ```
   *(Backend sẽ chạy tại: `http://localhost:3000`)*

#### Bước 3: Cấu hình và Chạy Frontend
1. Mở một cửa sổ Terminal mới và di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Khởi chạy ứng dụng Frontend:
   ```bash
   npm run dev
   ```
   *(Frontend sẽ chạy tại: `http://localhost:5173`)*

---

## 🔑 Tài Khoản Thử Nghiệm (Demo Accounts)

Hệ thống có sẵn các nút bấm tự động điền tài khoản tại trang Đăng nhập (`http://localhost:5173/login`), hoặc bạn có thể đăng nhập bằng thông tin sau:

| Vai trò | Thông tin đăng nhập | Mật khẩu | Chức năng kiểm thử |
| :--- | :--- | :---: | :--- |
| **Quản trị viên (Chủ trọ)** | `admin@nhatro.com` | `hashed_password` | Quản lý phòng, hợp đồng, nhập số điện nước, lập hóa đơn, duyệt trả phòng, xử lý sự cố. |
| **Khách thuê 1** | `0911111111` | `123` | Thuê phòng 101, thanh toán tiền phòng qua ví, xem điện nước, yêu cầu trả phòng. |
| **Khách thuê 2** | `0922222222` | `123` | Thuê phòng 102, kiểm tra hóa đơn, gửi phản ánh sự cố. |

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Định nghĩa cấu trúc các bảng CSDL
│   │   └── seed.ts          # Mã nguồn nạp dữ liệu mẫu tự động
│   ├── src/
│   │   ├── config/          # Cấu hình CSDL Prisma Client
│   │   ├── modules/         # Các phân hệ nghiệp vụ (Route, Controller, Service)
│   │   │   ├── chat/        # Trợ lý ảo AI Google Gemini Function Calling
│   │   │   ├── contracts/   # Quản lý Hợp đồng & Check-out
│   │   │   ├── invoices/    # Quản lý Hóa đơn
│   │   │   ├── issues/      # Báo cáo sự cố phòng
│   │   │   ├── payments/    # Thanh toán & Ví ảo
│   │   │   ├── rooms/       # Quản lý phòng trọ
│   │   │   └── users/       # Quản lý tài khoản & Xác thực
│   │   ├── app.ts           # Cấu hình Express app & Middleware
│   │   └── server.ts        # Entry point khởi động Backend
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Các thành phần giao diện (Sidebar, Modals, ChatWidget...)
│   │   ├── context/         # AuthContext quản lý đăng nhập và quyền
│   │   ├── pages/           # Màn hình chính: LoginPage, AdminDashboard, TenantPortal
│   │   ├── App.tsx          # Điều hướng & Phân quyền đường dẫn
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
│
├── docs/                    # Tài liệu đặc tả tính năng
├── docker-compose.yml       # Cấu hình khởi chạy toàn bộ hệ thống bằng Docker
└── README.md                # Tài liệu hướng dẫn sử dụng
```
