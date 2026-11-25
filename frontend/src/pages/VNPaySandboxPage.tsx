import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ShieldCheck,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';

const TEST_CARD = {
  bankCode: 'NCB',
  cardNumber: '9704198526191432198',
  cardHolder: 'NGUYEN VAN A',
  issueDate: '07/15',
  otp: '123456',
};

export default function VNPaySandboxPage() {
  const rawParams = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    const obj: Record<string, string> = {};
    search.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }, []);

  const [bankCode, setBankCode] = useState(rawParams.vnp_BankCode || TEST_CARD.bankCode);
  const [cardNumber, setCardNumber] = useState(TEST_CARD.cardNumber);
  const [cardHolder, setCardHolder] = useState(TEST_CARD.cardHolder);
  const [issueDate, setIssueDate] = useState(TEST_CARD.issueDate);
  const [otp, setOtp] = useState(TEST_CARD.otp);
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const amountVnd = useMemo(() => {
    const num = Number(rawParams.vnp_Amount || 0);
    return Number.isFinite(num) ? Math.round(num / 100) : 0;
  }, [rawParams.vnp_Amount]);

  const isTopup = Boolean(rawParams.vnp_TxnRef?.startsWith('TOPUP_'));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const fillTestCard = () => {
    setBankCode(TEST_CARD.bankCode);
    setCardNumber(TEST_CARD.cardNumber);
    setCardHolder(TEST_CARD.cardHolder);
    setIssueDate(TEST_CARD.issueDate);
    setOtp(TEST_CARD.otp);
    setError('');
  };

  const handleSubmit = async (outcome: 'success' | 'cancelled' | 'insufficient_funds') => {
    if (outcome === 'success') {
      if (!cardNumber.trim() || !cardHolder.trim() || !issueDate.trim() || !otp.trim()) {
        setError('Vui lòng nhập đầy đủ thông tin thẻ test và mã OTP (hoặc bấm Điền nhanh thẻ test).');
        return;
      }
    }

    setSubmitting(outcome);
    setError('');
    try {
      const res = await axios.post('/api/payments/vnpay-sandbox/submit', {
        params: rawParams,
        outcome,
        bankCode,
        clientOrigin: window.location.origin,
      });

      if (res.data?.success && res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        setError(res.data?.message || 'Không thể xử lý giao dịch sandbox.');
        setSubmitting(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi kết nối tới backend VNPay Sandbox.');
      setSubmitting(null);
    }
  };

  if (!rawParams.vnp_TxnRef || !rawParams.vnp_SecureHash) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          <AlertTriangle className="mx-auto text-amber-500 mb-3" size={40} />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Thiếu tham số giao dịch VNPay</h1>
          <p className="text-sm text-slate-500 mb-6">
            Vui lòng khởi tạo thanh toán từ màn hình Hóa đơn trong ứng dụng để mở cổng VNPay Sandbox hợp lệ.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" /> Quay về trang chủ
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-blue-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Top Sandbox Banner */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 mb-6 flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="text-amber-600 flex-shrink-0" size={18} />
            <span>
              <strong>Môi trường VNPay Sandbox giả lập (Test Mode)</strong> — Giao dịch dùng thẻ ảo, không trừ tiền thật.
            </span>
          </div>
          <span className="text-xs font-mono bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
            TMN: {rawParams.vnp_TmnCode || 'SMARTHOST_TEST'}
          </span>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* VNPay Header */}
          <div className="bg-gradient-to-r from-[#005BAA] to-[#0077CC] px-6 py-4 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white text-[#005BAA] font-black text-lg px-3 py-1 rounded-lg tracking-tight">
                VNPAY<span className="text-[#ED1C24]">QR</span>
              </div>
              <div>
                <p className="font-bold text-base">Cổng thanh toán VNPay Sandbox</p>
                <p className="text-xs text-sky-100">Xác thực chữ ký HMAC-SHA512 & tự động gạch nợ</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-lg text-sm font-mono">
              <Clock size={16} />
              <span>Hết hạn sau: {formatTimer(secondsLeft)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5">
            {/* Left: Order Info */}
            <div className="md:col-span-2 bg-slate-50 p-6 border-b md:border-b-0 md:border-r border-slate-200 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-1">
                  Số tiền thanh toán
                </p>
                <p className="text-3xl font-extrabold text-[#005BAA]">
                  {amountVnd.toLocaleString('vi-VN')} <span className="text-lg">₫</span>
                </p>
              </div>

              <div className="space-y-3 text-sm border-t border-slate-200 pt-4">
                <div>
                  <p className="text-slate-400 text-xs">Loại giao dịch</p>
                  <span
                    className={`inline-block mt-0.5 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isTopup
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {isTopup ? 'Nạp tiền vào Ví nhà trọ' : 'Thanh toán hóa đơn phòng trọ'}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Mã tham chiếu (vnp_TxnRef)</p>
                  <p className="font-mono font-semibold text-slate-700 break-all">
                    {rawParams.vnp_TxnRef}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Nội dung thanh toán</p>
                  <p className="font-medium text-slate-700">{rawParams.vnp_OrderInfo}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Đơn vị tiền tệ</p>
                  <p className="font-medium text-slate-700">{rawParams.vnp_CurrCode || 'VND'}</p>
                </div>
              </div>

              {/* Official VNPay Test Card Reference */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-blue-800">Thẻ test chuẩn VNPay Sandbox</span>
                  <button
                    type="button"
                    onClick={fillTestCard}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 transition-colors"
                  >
                    <Sparkles size={11} /> Điền nhanh
                  </button>
                </div>
                <p>Ngân hàng: <strong>NCB</strong></p>
                <p>Số thẻ: <strong className="font-mono">{TEST_CARD.cardNumber}</strong></p>
                <p>Chủ thẻ: <strong>{TEST_CARD.cardHolder}</strong></p>
                <p>Ngày phát hành: <strong>{TEST_CARD.issueDate}</strong> — OTP: <strong>{TEST_CARD.otp}</strong></p>
              </div>
            </div>

            {/* Right: Card & Test Actions */}
            <div className="md:col-span-3 p-6 space-y-5">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                <CreditCard className="text-[#005BAA]" size={20} />
                <span>Thông tin thẻ nội địa (Test)</span>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ngân hàng test</label>
                  <select
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="NCB">NCB - Ngân hàng Quốc Dân (Test)</option>
                    <option value="VNBANK">VNBANK - Thẻ ATM nội địa</option>
                    <option value="VNPAYQR">VNPAYQR - Quét mã QR Sandbox</option>
                    <option value="INTCARD">INTCARD - Thẻ quốc tế (Test)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày phát hành</label>
                  <input
                    type="text"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="07/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Số thẻ</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="9704198526191432198"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tên chủ thẻ</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="NGUYEN VAN A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mã OTP test</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="123456"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  disabled={Boolean(submitting)}
                  onClick={() => handleSubmit('success')}
                  className="w-full bg-[#005BAA] hover:bg-[#004A8D] disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  {submitting === 'success' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  Xác nhận thanh toán thành công (Mã 00)
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={Boolean(submitting)}
                    onClick={() => handleSubmit('insufficient_funds')}
                    className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold py-2.5 px-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    {submitting === 'insufficient_funds' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <AlertTriangle size={16} />
                    )}
                    Giả lập lỗi số dư (Mã 51)
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(submitting)}
                    onClick={() => handleSubmit('cancelled')}
                    className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold py-2.5 px-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    {submitting === 'cancelled' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    Hủy giao dịch (Mã 24)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
