import { CheckCircle, AlertCircle, Copy, Check, CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

interface InvoiceProps {
  invoice: any;
  onRefresh: () => void;
}

export default function InvoiceDetail({ invoice, onRefresh }: InvoiceProps) {
  const [copied, setCopied] = useState(false);
  const [bankCode, setBankCode] = useState('NCB');
  const [vnpLoading, setVnpLoading] = useState(false);
  const [vnpError, setVnpError] = useState('');
  
  if (!invoice) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`PAY ${invoice.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVNPayCheckout = async () => {
    setVnpLoading(true);
    setVnpError('');
    try {
      const res = await axios.post('/api/payments/vnpay/create-url', {
        invoiceId: invoice.id,
        bankCode,
        clientOrigin: window.location.origin,
      });
      if (res.data?.success && res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        setVnpError(res.data?.message || 'Không thể tạo link thanh toán VNPay Sandbox.');
        setVnpLoading(false);
      }
    } catch (err: any) {
      setVnpError(
        err.response?.data?.message ||
          'Không kết nối được máy chủ thanh toán. Kiểm tra backend hoặc dữ liệu hóa đơn.'
      );
      setVnpLoading(false);
    }
  };

  const qrUrl = `https://img.vietqr.io/image/970436-00000000000-compact2.png?amount=${invoice.amount}&addInfo=PAY ${invoice.id}&accountName=CHUTRO`;

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/50 border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500 max-w-md mx-auto max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        <h3 className="text-white/90 text-sm font-medium mb-1 uppercase tracking-wider">Hóa đơn tiền phòng</h3>
        <p className="text-white text-2xl font-bold">Phòng {invoice.room || '101'}</p>
        <p className="text-indigo-100 text-sm mt-1">{invoice.title || 'Tháng 10/2023'}</p>
      </div>

      <div className="p-6">
        {/* Amount Box */}
        <div className="text-center mb-6">
          <p className="text-sm text-slate-500 mb-1">Tổng số tiền cần thanh toán</p>
          <div className="text-4xl font-extrabold text-slate-800 tracking-tight">
            {invoice.amount?.toLocaleString()} <span className="text-2xl text-slate-500 font-medium">₫</span>
          </div>
          <div className={`mt-3 inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold ${
            invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
          }`}>
            {invoice.status === 'PAID' ? <CheckCircle size={16} className="mr-2"/> : <AlertCircle size={16} className="mr-2"/>}
            {invoice.status === 'PAID' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
          </div>
        </div>

        {/* Invoice details */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 space-y-3">
          <div className="flex justify-between text-sm border-b border-slate-200 pb-2 mb-2">
            <span className="text-slate-500">Mã hóa đơn:</span>
            <span className="font-semibold text-slate-700">#{invoice.id.substring(0, 8)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Tiền phòng:</span>
            <span className="font-medium text-slate-700">{invoice.roomPrice ? invoice.roomPrice.toLocaleString() : 0} ₫</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Tiền điện ({invoice.elecUsage || 0} kWh):</span>
            <span className="font-medium text-slate-700">{((invoice.elecUsage || 0) * (invoice.elecPrice || 3500)).toLocaleString()} ₫</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Tiền nước ({invoice.waterUsage || 0} khối):</span>
            <span className="font-medium text-slate-700">{((invoice.waterUsage || 0) * (invoice.waterPrice || 20000)).toLocaleString()} ₫</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-slate-200 mt-2">
            <span className="text-slate-500">Chi phí khác:</span>
            <span className="font-medium text-slate-700">{invoice.otherCosts ? invoice.otherCosts.toLocaleString() : 0} ₫</span>
          </div>
        </div>

        {/* Payment options if UNPAID */}
        {invoice.status !== 'PAID' && (
          <div className="border-t border-slate-100 pt-6 space-y-5">
            {/* VNPay Sandbox */}
            <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-[#005BAA] text-white text-[11px] font-black px-2 py-0.5 rounded">
                    VNPAY
                  </span>
                  <span className="text-sm font-bold text-slate-800">Thanh toán VNPay Sandbox</span>
                </div>
                <span className="text-[11px] font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                  Test Mode
                </span>
              </div>

              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="w-full bg-white border border-sky-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="NCB">Thẻ nội địa NCB (Thẻ test mặc định)</option>
                <option value="VNBANK">Thẻ ATM / Tài khoản ngân hàng nội địa</option>
                <option value="VNPAYQR">Cổng VNPAYQR</option>
                <option value="INTCARD">Thẻ thanh toán quốc tế</option>
                <option value="">Chọn trực tiếp trên cổng VNPay</option>
              </select>

              {vnpError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {vnpError}
                </p>
              )}

              <button
                type="button"
                onClick={handleVNPayCheckout}
                disabled={vnpLoading}
                className="w-full bg-[#005BAA] hover:bg-[#004A8D] disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                {vnpLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CreditCard size={16} />
                )}
                Thanh toán giả lập qua VNPay
              </button>
              <p className="text-[11px] text-slate-500 text-center">
                Không trừ tiền thật • Thẻ test NCB: <span className="font-mono font-semibold">9704198526191432198</span> / OTP <span className="font-mono font-semibold">123456</span>
              </p>
            </div>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-xs font-medium text-slate-400">hoặc chuyển khoản VietQR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div>
              <div className="text-center mb-4">
                <p className="text-sm font-bold text-slate-700">Mở App Ngân hàng quét mã</p>
                <p className="text-xs text-slate-500">Hệ thống sẽ tự động gạch nợ sau 3 giây</p>
              </div>
              
              <div className="flex justify-center mb-4">
                <div className="p-2 border-2 border-indigo-100 rounded-xl bg-white shadow-sm inline-block">
                  <img src={qrUrl} alt="VietQR" className="w-44 h-44 object-contain" />
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex items-center justify-between">
                <div className="truncate pr-4">
                  <p className="text-xs text-indigo-400 font-semibold mb-1 uppercase">Nội dung chuyển khoản</p>
                  <p className="text-sm font-bold text-indigo-900 font-mono tracking-wider">PAY {invoice.id.substring(0, 6)}</p>
                </div>
                <button 
                  onClick={handleCopy}
                  className="flex-shrink-0 bg-white p-2 rounded-lg text-indigo-600 shadow-sm border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-colors"
                  title="Copy nội dung"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>

              <button 
                onClick={onRefresh}
                className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-colors shadow-md shadow-slate-200"
              >
                Tôi đã chuyển khoản - Kiểm tra lại
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
