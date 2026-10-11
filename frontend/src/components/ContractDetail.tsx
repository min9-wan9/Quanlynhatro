import { X, Printer, Download } from 'lucide-react';

interface ContractDetailProps {
  contract: any;
  user: any;
  onClose: () => void;
}

export default function ContractDetail({ contract, user, onClose }: ContractDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white shadow-2xl rounded-xl my-8">
        {/* Header Actions */}
        <div className="sticky top-0 bg-slate-100 rounded-t-xl px-4 py-3 flex justify-between items-center border-b border-slate-200 z-10">
          <div className="flex gap-2">
            <button className="flex items-center text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors">
              <Printer size={16} className="mr-2" /> In hợp đồng
            </button>
            <button className="flex items-center text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors">
              <Download size={16} className="mr-2" /> Tải PDF
            </button>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-rose-500 bg-white p-1.5 rounded-full shadow-sm border border-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contract Content */}
        <div className="p-8 sm:p-12 text-slate-800 bg-white rounded-b-xl" id="contract-content">
          <div className="text-center mb-8">
            <h3 className="font-bold text-lg">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
            <p className="font-semibold text-sm underline underline-offset-4 mb-6">Độc lập - Tự do - Hạnh phúc</p>
            <h2 className="font-extrabold text-2xl text-slate-900 mt-8 mb-2">HỢP ĐỒNG THUÊ NHÀ / PHÒNG TRỌ</h2>
            <p className="italic text-sm text-slate-500">Hôm nay, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
          </div>

          <div className="space-y-6 text-sm leading-relaxed">
            <p>Chúng tôi gồm có:</p>
            
            {/* Party A */}
            <div>
              <h4 className="font-bold text-base mb-2">BÊN A (Bên cho thuê):</h4>
              <div className="pl-4 space-y-1">
                <p><span className="font-semibold">Ông/Bà:</span> BAN QUẢN LÝ NHÀ TRỌ SMART HOST</p>
                <p><span className="font-semibold">Số điện thoại:</span> 0123.456.789</p>
                <p><span className="font-semibold">Địa chỉ:</span> 123 Đường ABC, Quận XYZ, TP.HCM</p>
              </div>
            </div>

            {/* Party B */}
            <div>
              <h4 className="font-bold text-base mb-2">BÊN B (Bên thuê):</h4>
              <div className="pl-4 space-y-1">
                <p><span className="font-semibold">Ông/Bà:</span> {user?.name || user?.fullName || '...........................................'}</p>
                <p><span className="font-semibold">SĐT:</span> {user?.phone || '...........................................'}</p>
                <p><span className="font-semibold">CMND/CCCD:</span> {user?.idCard || '...........................................'}</p>
              </div>
            </div>

            <p>Sau khi thỏa thuận, hai bên nhất trí ký kết hợp đồng thuê nhà với các điều khoản sau:</p>

            {/* Article 1 */}
            <div>
              <h4 className="font-bold text-base mb-2">Điều 1: Đối tượng hợp đồng</h4>
              <div className="pl-4">
                <p>Bên A đồng ý cho Bên B thuê phòng trọ số: <span className="font-bold">P.{contract?.room || '....'}</span>.</p>
                <p>Trang thiết bị bàn giao kèm theo: {contract?.equipments?.join(', ') || 'Không có'}.</p>
              </div>
            </div>

            {/* Article 2 */}
            <div>
              <h4 className="font-bold text-base mb-2">Điều 2: Giá cả và phương thức thanh toán</h4>
              <div className="pl-4 space-y-1">
                <p>- <span className="font-semibold">Giá thuê phòng:</span> <span className="font-bold">{contract?.price?.toLocaleString() || '....'} VNĐ/tháng</span>.</p>
                <p>- <span className="font-semibold">Tiền cọc:</span> <span className="font-bold">{contract?.deposit?.toLocaleString() || '....'} VNĐ</span>.</p>
                <p>- Tiền điện, nước, dịch vụ khác sẽ được tính theo thực tế sử dụng hàng tháng.</p>
              </div>
            </div>

            {/* Article 3 */}
            <div>
              <h4 className="font-bold text-base mb-2">Điều 3: Thời hạn hợp đồng</h4>
              <div className="pl-4">
                <p>Hợp đồng có giá trị từ ngày <span className="font-bold">{contract?.startDate || '....'}</span> đến ngày <span className="font-bold">{contract?.endDate || '....'}</span>.</p>
              </div>
            </div>
            
            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 text-center mt-12 pt-8 pb-16">
              <div>
                <h4 className="font-bold">ĐẠI DIỆN BÊN A</h4>
                <p className="italic text-xs text-slate-500 mb-16">(Ký, ghi rõ họ tên)</p>
                <p className="font-semibold">SMART HOST</p>
              </div>
              <div>
                <h4 className="font-bold">ĐẠI DIỆN BÊN B</h4>
                <p className="italic text-xs text-slate-500 mb-16">(Ký, ghi rõ họ tên)</p>
                <p className="font-semibold">{user?.name || user?.fullName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
