import { useState } from 'react';
import { X, CheckCircle, AlertCircle, DollarSign, Calculator } from 'lucide-react';
import axios from 'axios';

interface CheckOutProcessModalProps {
  request: any;
  contract: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckOutProcessModal({ request, contract, onClose, onSuccess }: CheckOutProcessModalProps) {
  const [deductions, setDeductions] = useState<number>(0);
  const [deductionReason, setDeductionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const deposit = contract?.deposit || 0;
  const refundAmount = Math.max(0, deposit - deductions);

  const handleProcess = async (isApproved: boolean) => {
    setLoading(true);
    setError('');

    try {
      await axios.post(`/api/contracts/check-out/${request.id}/process`, {
        isApproved,
        refundAmount,
        deductions,
        deductionReason
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden relative">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800">Quyết toán Trả phòng</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
          
          <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
            <div className="text-sm text-blue-800">
              <p><strong>Ngày dự kiến trả:</strong> {new Date(request.moveOutDate).toLocaleDateString('vi-VN')}</p>
              <p><strong>Ngân hàng nhận cọc:</strong> {request.bankAccount}</p>
              <p><strong>Lý do:</strong> {request.reason || 'Không có'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-200 p-4 rounded-xl">
              <p className="text-sm text-slate-500 mb-1">Tiền cọc ban đầu</p>
              <p className="font-bold text-lg text-slate-800">{deposit.toLocaleString()} đ</p>
            </div>
            <div className="border border-slate-200 p-4 rounded-xl bg-emerald-50 border-emerald-100">
              <p className="text-sm text-emerald-600 mb-1">Tiền cọc hoàn lại</p>
              <p className="font-bold text-lg text-emerald-700">{refundAmount.toLocaleString()} đ</p>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Calculator size={16} /> Các khoản khấu trừ (Hư hại, Điện/Nước lẻ)
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Số tiền trừ (VNĐ)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input 
                    type="number" 
                    min="0"
                    value={deductions}
                    onChange={(e) => setDeductions(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Lý do trừ tiền</label>
                <input 
                  type="text" 
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  placeholder="VD: Hư ổ khóa, điện nước 5 ngày cuối..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={() => handleProcess(false)}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Từ chối YC
            </button>
            <button 
              type="button" 
              onClick={() => handleProcess(true)}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Đang xử lý...' : <><CheckCircle size={18} /> Duyệt & Hoàn cọc</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
