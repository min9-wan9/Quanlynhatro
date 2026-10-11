# Quy trình Check-in và Check-out

Dưới đây là luồng tính năng Check-in (Thuê phòng) và Check-out (Trả phòng) cho cả hai phía Khách thuê và Chủ trọ.

---

### 1. Phía Khách thuê (Tenant / User)

**Giai đoạn Check-in (Nhận phòng):**
*   **Ký hợp đồng trực tuyến:** Xem trước các điều khoản, quy định, thông tin tiền cọc, chu kỳ thuê và thực hiện ký điện tử trực tiếp trên ứng dụng.
*   **Cung cấp hồ sơ cư trú:** Tải lên hình ảnh CCCD/CMND và các giấy tờ cá nhân cần thiết để chủ trọ thực hiện thủ tục đăng ký tạm trú.
*   **Xác nhận biên bản bàn giao:** Kiểm tra và đối chiếu hiện trạng phòng với biên bản số (bao gồm danh sách thiết bị/tài sản, hình ảnh đính kèm và chỉ số điện/nước ban đầu). Xác nhận đồng ý trên ứng dụng trong thời hạn quy định (24–48 giờ).

**Giai đoạn Check-out (Trả phòng):**
*   **Tạo yêu cầu trả phòng:** Chọn ngày dự kiến rời đi, điền lý do và cung cấp Số tài khoản ngân hàng để nhận lại tiền cọc. 
    *   *Lưu ý:* Hệ thống sẽ tự động hiển thị cảnh báo nếu thời gian thông báo vi phạm quy định báo trước trong hợp đồng (ví dụ: cần báo trước 15–30 ngày).
*   **Xem & đối soát quyết toán:** Theo dõi bảng tính toán tiền cọc cuối kỳ, bao gồm: tiền phòng những ngày lẻ, chi phí điện nước phát sinh, và các khoản khấu trừ bồi thường hư hại (nếu có).
*   **Xác nhận thanh toán:** Nhận thông báo hoàn tất, kiểm tra biên lai/ủy nhiệm chi hoàn tiền cọc từ chủ trọ và xác nhận kết thúc hợp đồng.

---

### 2. Phía Chủ trọ / Quản lý (Admin / Host)

**Giai đoạn Check-in (Giao phòng):**
*   **Tùy chỉnh & tạo hợp đồng tự động:** Hệ thống tự động điền các thông số cơ bản của phòng và giá thuê. Tuy nhiên, chủ trọ có thể **tùy chọn chu kỳ thuê linh hoạt** (ví dụ: 1 tháng, 3 tháng, 6 tháng, 1 năm...) hoặc chỉnh sửa kỳ thanh toán để phù hợp nhất với thỏa thuận và nhu cầu thực tế của khách thuê, sau đó duyệt và gửi khách ký số.
*   **Lập biên bản bàn giao số:** Chụp ảnh hiện trạng nội thất thực tế, nhập chỉ số điện/nước ban đầu và gửi cho khách thuê để đối chiếu, xác nhận.
*   **Quản lý hồ sơ cư trú:** Tiếp nhận, lưu trữ an toàn CCCD và hồ sơ của khách thuê để phục vụ công tác khai báo tạm trú với cơ quan chức năng.

**Giai đoạn Check-out (Nhận lại phòng):**
*   **Tiếp nhận & duyệt yêu cầu trả phòng:** Theo dõi danh sách các yêu cầu trả phòng từ khách, hệ thống hỗ trợ kiểm tra thời hạn báo trước để xác định việc vi phạm hợp đồng (nếu có).
*   **Nghiệm thu tài sản (Checklist):** Đối chiếu tình trạng phòng hiện tại với hình ảnh trong biên bản bàn giao ban đầu. Đánh giá trạng thái tài sản (Tốt / Hỏng / Thiếu) và tự động áp dụng bảng giá bồi thường theo niêm yết.
*   **Chốt dịch vụ & Quyết toán tự động:** Nhập chỉ số điện/nước tại thời điểm trả phòng. Hệ thống sẽ tự động tính toán số tiền cọc hoàn lại theo công thức:
    > **Cọc hoàn lại** = Tiền cọc ban đầu - Nợ cũ (nếu có) - Chi phí điện/nước lẻ - Khấu trừ hư hại/Phí vi phạm hợp đồng.
*   **Hoàn cọc & Cập nhật trạng thái phòng:** Tải lên ủy nhiệm chi hoặc hình ảnh chuyển khoản hoàn tiền cọc cho khách. Sau khi hoàn tất, hệ thống tự động chuyển trạng thái phòng thành “Trống” hoặc “Cần dọn dẹp” để sẵn sàng cho chu kỳ thuê mới.
