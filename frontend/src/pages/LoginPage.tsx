import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Building2, User, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';

export default function LoginPage() {
  const [tab, setTab] = useState<'ADMIN' | 'TENANT'>('ADMIN');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Đích đến sau khi đăng nhập (nếu có)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/users/login', { 
        identifier, 
        password, 
        role: tab 
      });
      
      const userData = res.data.user;
      
      if (tab === 'ADMIN') {
        login(userData, res.data.token);
        navigate('/admin', { replace: true });
      } else {
        // Find room number from contract if available
        const roomNumber = userData.contracts?.[0]?.room?.roomNumber || 'Unknown';
        const roomId = userData.contracts?.[0]?.room?.id || '';
        login(
          { ...userData, roomNumber, roomId },
          res.data.token
        );
        navigate('/', { replace: true });
      }
      
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  const autoFillAdmin = () => {
    setIdentifier('admin@nhatro.com');
    setPassword('hashed_password');
  };

  const autoFillTenant = () => {
    setIdentifier('0911111111');
    setPassword('123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-[1000px] w-full bg-white rounded-3xl shadow-2xl flex overflow-hidden">
        
        {/* Cột trái: Hình ảnh / Quảng cáo */}
        <div className="hidden lg:flex w-1/2 bg-indigo-600 flex-col justify-between p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-indigo-400/30 rounded-full blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-2xl mb-8 shadow-lg">
              SH
            </div>
            <h1 className="text-4xl font-extrabold leading-tight mb-4">
              Quản lý trọ <br /> chưa bao giờ <br /> dễ dàng đến thế!
            </h1>
            <p className="text-indigo-200 text-lg">
              Tự động hóa thanh toán, báo cáo sự cố 24/7 và hệ thống AI hỗ trợ cư dân thông minh.
            </p>
          </div>
          
          <div className="relative z-10 text-indigo-200 text-sm">
            © 2026 SmartHost. All rights reserved.
          </div>
        </div>

        {/* Cột phải: Form đăng nhập */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Đăng nhập</h2>
            <p className="text-slate-500">Vui lòng chọn vai trò để truy cập hệ thống.</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button
              onClick={() => { setTab('ADMIN'); setIdentifier(''); setPassword(''); setError(''); }}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg flex items-center justify-center transition-all ${
                tab === 'ADMIN' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Building2 size={18} className="mr-2" /> Chủ trọ / Quản lý
            </button>
            <button
              onClick={() => { setTab('TENANT'); setIdentifier(''); setPassword(''); setError(''); }}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg flex items-center justify-center transition-all ${
                tab === 'TENANT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User size={18} className="mr-2" /> Khách thuê phòng
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-4 bg-rose-50 text-rose-600 text-sm rounded-xl font-medium flex items-center border border-rose-100 animate-in fade-in">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {tab === 'ADMIN' ? 'Email hoặc Tên đăng nhập' : 'Số điện thoại'}
              </label>
              <input
                type={tab === 'ADMIN' ? 'text' : 'tel'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
                placeholder={tab === 'ADMIN' ? 'admin@nhatro.com' : '0911111111'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                <span>{tab === 'ADMIN' ? 'Mật khẩu' : 'Mã phòng (Mật khẩu)'}</span>
                <a href="#" className="text-indigo-600 hover:underline font-medium text-xs">Quên mật khẩu?</a>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 font-medium"
                  placeholder={tab === 'ADMIN' ? '••••••••' : '123'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-200 flex items-center justify-center mt-6 disabled:opacity-70"
            >
              {loading ? (
                <><Loader2 className="animate-spin mr-2" size={20} /> Đang xử lý...</>
              ) : (
                <>Đăng nhập ngay <ArrowRight className="ml-2" size={20} /></>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Tài khoản Demo (Bấm để điền)</p>
            <div className="flex gap-3 justify-center">
              <button onClick={autoFillAdmin} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors">
                <KeyRound size={14} className="mr-1.5" /> Demo Admin
              </button>
              <button onClick={autoFillTenant} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg flex items-center transition-colors">
                <KeyRound size={14} className="mr-1.5" /> Demo Khách
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
