import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import InvoiceDetail from '../components/InvoiceDetail';
import ContractDetail from '../components/ContractDetail';
import CheckOutRequestModal from '../components/CheckOutRequestModal';
import ChatWidget from '../components/ChatWidget';
import { 
  LogOut, UserCircle, Home, Zap, ReceiptText, 
  Wrench, Bell, FileText, CheckCircle, AlertCircle, Camera, Send, Eye, X, Settings, Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TenantPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showContractDetail, setShowContractDetail] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [walletInfo, setWalletInfo] = useState({ balance: 0, isAutoPay: false });
  
  // Data states
  const [contract, setContract] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [utilities, setUtilities] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchTenantData();
  }, [user]);

  const fetchTenantData = async () => {
    try {
      if (user?.id) {
        const contractsRes = await axios.get('/api/contracts').catch(() => ({ data: [] }));
        const userContract = contractsRes.data.find((c: any) => c.userId === user.id);
        if (userContract) {
          setContract({
            room: userContract.room?.roomNumber || user?.roomNumber || '101',
            price: userContract.price || 3500000,
            deposit: userContract.deposit || 3500000,
            startDate: new Date(userContract.startDate).toLocaleDateString('vi-VN'),
            endDate: new Date(userContract.endDate).toLocaleDateString('vi-VN'),
            equipments: userContract.equipments ? userContract.equipments.split(',') : ['Điều hòa', 'Tủ lạnh', 'Giường', 'Tủ quần áo'],
            id: userContract.id,
            status: userContract.status
          });
        } else {
          setContract({
            room: user?.roomNumber || '101',
            price: 3500000,
            deposit: 3500000,
            startDate: '01/01/2026',
            endDate: '01/01/2027',
            equipments: ['Điều hòa', 'Tủ lạnh', 'Giường', 'Tủ quần áo']
          });
        }
      } else {
        setContract({
          room: user?.roomNumber || '101',
          price: 3500000,
          deposit: 3500000,
          startDate: '01/01/2026',
          endDate: '01/01/2027',
          equipments: ['Điều hòa', 'Tủ lạnh', 'Giường', 'Tủ quần áo']
        });
      }

      if (user?.id) {
        // Fetch User profile to get wallet info
        const userRes = await axios.get(`/api/users/${user.id}`).catch(() => null);
        if (userRes && userRes.data) {
          setWalletInfo({
            balance: userRes.data.walletBalance || 0,
            isAutoPay: userRes.data.isAutoPay || false
          });
        }

        const invRes = await axios.get(`/api/invoices?userId=${user.id}`);
        if (invRes.data && invRes.data.length > 0) {
          const mappedInvoices = invRes.data.map((inv: any) => ({
            ...inv,
            id: inv.id,
            title: inv.title,
            amount: inv.amount,
            status: inv.status,
            dueDate: new Date(inv.dueDate).toLocaleDateString('vi-VN')
          }));
          setInvoices(mappedInvoices);
        } else {
          setInvoices([]);
        }
      } else {
        setInvoices([
          { id: 'inv-1', title: 'Hóa đơn Tháng 10/2026', amount: 3850000, status: 'PENDING', dueDate: '15/10/2026' },
          { id: 'inv-2', title: 'Hóa đơn Tháng 09/2026', amount: 3700000, status: 'PAID', dueDate: '15/09/2026' }
        ]);
      }

      if (user?.roomId) {
        const roomRes = await axios.get(`/api/rooms/${user.roomId}`);
        const roomData = roomRes.data;
        
        if (roomData.utilityReadings && roomData.utilityReadings.length > 0) {
          const mappedUtils = [];
          for (let i = 0; i < roomData.utilityReadings.length; i++) {
            const curr = roomData.utilityReadings[i];
            const prev = i + 1 < roomData.utilityReadings.length 
              ? roomData.utilityReadings[i + 1] 
              : { powerNumber: 0, waterNumber: 0 };
              
            mappedUtils.push({
              month: `${curr.month}/${curr.year}`,
              elecPrev: prev.powerNumber,
              elecCurr: curr.powerNumber,
              elecTotal: curr.powerNumber - prev.powerNumber,
              waterPrev: prev.waterNumber,
              waterCurr: curr.waterNumber,
              waterTotal: curr.waterNumber - prev.waterNumber,
            });
          }
          setUtilities(mappedUtils);
        } else {
          setUtilities([]);
        }
      } else {
        setUtilities([
          { month: '10/2026', elecPrev: 200, elecCurr: 280, elecTotal: 80, waterPrev: 20, waterCurr: 25, waterTotal: 5 }
        ]);
      }

      if (user?.id) {
        const issuesRes = await axios.get(`/api/issues?userId=${user.id}`);
        setIssues(issuesRes.data.map((iss: any) => ({
          ...iss,
          id: iss.id,
          title: iss.title,
          status: iss.isResolved ? 'Đã xử lý' : 'Chờ xử lý',
          date: new Date(iss.createdAt).toLocaleDateString('vi-VN')
        })));
      } else {
        setIssues([]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }
    try {
      await axios.put(`/api/users/${user.id}/password`, {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      alert('Đổi mật khẩu thành công!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      alert(error.response?.data?.error || 'Lỗi khi đổi mật khẩu');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [issueForm, setIssueForm] = useState({ title: '', description: '', imageUrl: '' });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Vui lòng chọn ảnh nhỏ hơn 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setIssueForm({ ...issueForm, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const submitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !user?.roomId) {
      alert('Không tìm thấy thông tin phòng!');
      return;
    }
    try {
      await axios.post('/api/issues', {
        title: issueForm.title,
        description: issueForm.description,
        imageUrl: issueForm.imageUrl,
        userId: user.id,
        roomId: user.roomId
      });
      alert('Đã gửi yêu cầu sửa chữa đến Chủ trọ!');
      setIssueForm({ title: '', description: '', imageUrl: '' });
      fetchTenantData();
    } catch (err) {
      alert('Có lỗi xảy ra khi gửi yêu cầu!');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* TENANT SIDEBAR */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 md:h-screen sticky top-0 flex flex-col shadow-sm z-20">
        <div className="p-6 border-b border-slate-100 flex items-center">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mr-3 shadow-md">SH</div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">SmartHost</h1>
            <p className="text-xs text-slate-500 font-medium">Portal Khách thuê</p>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {[
            { id: 'overview', label: 'Thông tin Phòng', icon: Home },
            { id: 'utilities', label: 'Điện / Nước', icon: Zap },
            { id: 'invoices', label: 'Hóa đơn & Thanh toán', icon: ReceiptText },
            { id: 'issues', label: 'Báo hỏng & Yêu cầu', icon: Wrench },
            { id: 'announcements', label: 'Thông báo', icon: Bell },
            { id: 'settings', label: 'Cài đặt tài khoản', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                activeTab === item.id ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-xl mb-4 flex items-center">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-3 shrink-0"><UserCircle size={24} /></div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
              <p className="text-xs font-semibold text-slate-500">Phòng {user.roomNumber}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors">
            <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center">
            {activeTab === 'overview' && 'Hợp đồng & Thông tin phòng'}
            {activeTab === 'utilities' && 'Theo dõi Điện / Nước'}
            {activeTab === 'invoices' && 'Hóa đơn & Lịch sử thanh toán'}
            {activeTab === 'issues' && 'Báo hỏng & Sửa chữa'}
            {activeTab === 'announcements' && 'Bảng tin chung'}
            {activeTab === 'settings' && 'Cài đặt tài khoản'}
          </h2>
        </header>

        {activeTab === 'overview' && contract && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <FileText className="text-indigo-600" size={24} />
                <h3 className="font-bold text-lg text-slate-800">Chi tiết Hợp Đồng</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between"><span className="text-slate-500">Người đại diện:</span> <span className="font-semibold">{user.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Phòng thuê:</span> <span className="font-bold text-indigo-600">P.{contract.room}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tiền thuê hàng tháng:</span> <span className="font-semibold">{contract.price.toLocaleString()} ₫</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tiền cọc:</span> <span className="font-semibold">{contract.deposit.toLocaleString()} ₫</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Thời hạn:</span> <span className="font-semibold">{contract.startDate} - {contract.endDate}</span></div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <button 
                  onClick={() => setShowContractDetail(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  <Eye size={18} className="mr-2" /> Xem hợp đồng chính thức
                </button>
                <button 
                  onClick={() => setShowCheckOut(true)}
                  className="w-full sm:w-auto ml-0 sm:ml-3 mt-3 sm:mt-0 inline-flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Yêu cầu trả phòng
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <Home className="text-emerald-600" size={24} />
                <h3 className="font-bold text-lg text-slate-800">Trang thiết bị bàn giao</h3>
              </div>
              <ul className="grid grid-cols-2 gap-3">
                {contract.equipments.map((eq: string, i: number) => (
                  <li key={i} className="flex items-center text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded-lg">
                    <CheckCircle className="text-emerald-500 mr-2" size={16} /> {eq}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'utilities' && (
          <div className="space-y-6 animate-in fade-in">
            {utilities.map((u, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-slate-700">Kỳ chốt: {u.month}</div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Điện */}
                  <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 relative">
                    <Zap className="absolute top-4 right-4 text-amber-200" size={40} />
                    <h4 className="font-bold text-amber-700 mb-4 flex items-center">Chỉ số Điện</h4>
                    <div className="flex justify-between text-sm mb-2"><span className="text-amber-900/60">Số cũ:</span> <span className="font-mono font-bold text-amber-900">{u.elecPrev}</span></div>
                    <div className="flex justify-between text-sm mb-4"><span className="text-amber-900/60">Số mới:</span> <span className="font-mono font-bold text-amber-900">{u.elecCurr}</span></div>
                    <div className="flex justify-between pt-3 border-t border-amber-200/50">
                      <span className="font-bold text-amber-800">Tiêu thụ:</span> 
                      <span className="font-bold text-xl text-amber-600">{u.elecTotal} kWh</span>
                    </div>
                  </div>
                  {/* Nước */}
                  <div className="bg-cyan-50 rounded-xl p-5 border border-cyan-100 relative">
                    <Droplets className="absolute top-4 right-4 text-cyan-200" size={40} />
                    <h4 className="font-bold text-cyan-700 mb-4 flex items-center">Chỉ số Nước</h4>
                    <div className="flex justify-between text-sm mb-2"><span className="text-cyan-900/60">Số cũ:</span> <span className="font-mono font-bold text-cyan-900">{u.waterPrev}</span></div>
                    <div className="flex justify-between text-sm mb-4"><span className="text-cyan-900/60">Số mới:</span> <span className="font-mono font-bold text-cyan-900">{u.waterCurr}</span></div>
                    <div className="flex justify-between pt-3 border-t border-cyan-200/50">
                      <span className="font-bold text-cyan-800">Tiêu thụ:</span> 
                      <span className="font-bold text-xl text-cyan-600">{u.waterTotal} khối</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-6 animate-in fade-in">
            {invoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${inv.status==='PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {inv.status==='PAID' ? <CheckCircle /> : <AlertCircle />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{inv.title}</h4>
                    <p className="text-sm text-slate-500">Hạn chót: {inv.dueDate}</p>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="font-bold text-xl text-slate-800 mb-1">{inv.amount.toLocaleString()} ₫</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${inv.status==='PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                    {inv.status==='PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                  </span>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => setSelectedInvoice(inv)} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                    <Eye size={18} className="mr-2" /> Chi tiết
                  </button>
                  {inv.status !== 'PAID' && (
                    <button onClick={() => setSelectedInvoice(inv)} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                      Thanh toán
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-lg text-slate-800 mb-4">Gửi yêu cầu sửa chữa</h3>
              <form onSubmit={submitIssue} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tiêu đề sự cố</label>
                  <input required value={issueForm.title} onChange={e => setIssueForm({...issueForm, title: e.target.value})} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ví dụ: Hỏng vòi nước" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mô tả sự cố</label>
                  <textarea required value={issueForm.description} onChange={e => setIssueForm({...issueForm, description: e.target.value})} rows={4} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Ví dụ: Vòi nước bồn rửa mặt bị rỉ nước liên tục..."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Đính kèm ảnh/Video</label>
                  <label className="w-full border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 cursor-pointer transition-colors block relative overflow-hidden">
                    {issueForm.imageUrl ? (
                      <img src={issueForm.imageUrl} alt="Preview" className="mx-auto h-32 object-contain" />
                    ) : (
                      <>
                        <Camera className="mx-auto text-slate-400 mb-2" size={24} />
                        <p className="text-sm text-slate-500 font-medium">Click để chọn ảnh từ máy</p>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center">
                  <Send size={18} className="mr-2" /> Gửi yêu cầu
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-lg text-slate-800 mb-4">Lịch sử yêu cầu</h3>
              <div className="space-y-4">
                {issues.map(iss => (
                  <div key={iss.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-800">{iss.title}</h4>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">{iss.status}</span>
                    </div>
                    <p className="text-xs text-slate-400">{iss.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="text-center py-20">
            <Bell size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có thông báo nào</h3>
            <p className="text-slate-500">Bạn sẽ nhận được thông báo cắt điện, nước, hoặc nội quy ở đây.</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
            {/* Wallet & Auto Pay */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <Wallet className="text-indigo-600" size={24} />
                <h3 className="font-bold text-lg text-slate-800">Ví Nội Bộ & Thanh Toán Tự Động</h3>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4">
                <p className="text-sm text-indigo-800 mb-1">Số dư hiện tại:</p>
                <p className="text-3xl font-bold text-indigo-600">{walletInfo.balance.toLocaleString()} ₫</p>
                <p className="text-xs text-indigo-500 mt-2">Quét mã VietQR với nội dung: <strong className="bg-indigo-100 px-1 py-0.5 rounded">TOPUP {user?.id}</strong> để nạp tiền.</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-800">Tự động thanh toán</h4>
                  <p className="text-xs text-slate-500 max-w-[200px] mt-1">Hệ thống sẽ tự động trừ tiền trong ví khi có hóa đơn mới.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={walletInfo.isAutoPay} onChange={async (e) => {
                    const newValue = e.target.checked;
                    setWalletInfo({...walletInfo, isAutoPay: newValue});
                    try {
                      await axios.put(`/api/users/${user?.id}`, { isAutoPay: newValue });
                    } catch(err) {
                      setWalletInfo({...walletInfo, isAutoPay: !newValue});
                      alert("Lỗi khi cập nhật cài đặt!");
                    }
                  }} />
                  <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* Thông tin cá nhân */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <UserCircle className="text-indigo-600" size={24} />
                <h3 className="font-bold text-lg text-slate-800">Thông tin cá nhân</h3>
              </div>
              <div className="space-y-4 text-sm text-slate-700">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500 font-medium">Họ và tên:</span>
                  <span className="font-bold">{user?.name || user?.fullName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500 font-medium">Số điện thoại:</span>
                  <span className="font-bold">{user?.phone}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500 font-medium">Căn cước công dân:</span>
                  <span className="font-bold">{user?.idCard || 'Chưa cập nhật'}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-slate-500 font-medium">Phòng đang thuê:</span>
                  <span className="font-bold text-indigo-600">P.{user?.roomNumber || contract?.room || '...'}</span>
                </div>
                <p className="text-xs text-slate-400 mt-4 italic">* Để thay đổi thông tin cá nhân (CCCD, SĐT), vui lòng liên hệ Chủ trọ / Ban quản lý.</p>
              </div>
            </div>

            {/* Đổi mật khẩu */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <Settings className="text-rose-500" size={24} />
                <h3 className="font-bold text-lg text-slate-800">Đổi mật khẩu</h3>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mật khẩu hiện tại</label>
                  <input 
                    type="password" required 
                    value={passwordForm.oldPassword} 
                    onChange={e => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Mật khẩu mới</label>
                  <input 
                    type="password" required 
                    value={passwordForm.newPassword} 
                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nhập mật khẩu mới"
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                  <input 
                    type="password" required 
                    value={passwordForm.confirmPassword} 
                    onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nhập lại mật khẩu mới"
                    minLength={6}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors mt-2"
                >
                  Xác nhận đổi mật khẩu
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* CHAT WIDGET - FLOATING ON DESKTOP */}
      <div className="fixed bottom-6 right-6 z-50">
        <ChatWidget />
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-w-md w-full">
            <button 
              onClick={() => setSelectedInvoice(null)}
              className="absolute -top-3 -right-3 z-10 bg-white text-slate-500 hover:text-slate-800 p-1.5 rounded-full shadow-lg border border-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
            <InvoiceDetail invoice={selectedInvoice} onRefresh={() => { fetchTenantData(); setSelectedInvoice(null); }} />
          </div>
        </div>
      )}

      {/* Contract Detail Modal */}
      {showContractDetail && (
        <ContractDetail contract={contract} user={user} onClose={() => setShowContractDetail(false)} />
      )}
      
      {/* Check Out Request Modal */}
      {showCheckOut && contract?.id && (
        <CheckOutRequestModal 
          contractId={contract.id}
          onClose={() => setShowCheckOut(false)}
          onSuccess={() => {
            fetchTenantData();
            alert('Đã gửi yêu cầu trả phòng thành công');
          }}
        />
      )}
    </div>
  );
}

// Simple icon for Droplets since it's not imported above to avoid long import list
function Droplets(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg>;
}
