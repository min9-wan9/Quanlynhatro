import { useNavigate } from 'react-router-dom';
import { BedDouble, ReceiptText, AlertTriangle, LogOut, UserCircle, Zap, FileSignature, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { id: 'overview', label: 'Tổng quan & Báo cáo', icon: BarChart3 },
    { id: 'rooms', label: 'Quản lý phòng', icon: BedDouble },
    { id: 'utilities', label: 'Tính Điện Nước', icon: Zap },
    { id: 'invoices', label: 'Thu tiền & Hóa đơn', icon: ReceiptText },
    { id: 'contracts', label: 'Hợp đồng thuê', icon: FileSignature },
    { id: 'issues', label: 'Sự cố bảo trì', icon: AlertTriangle },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen fixed top-0 left-0 flex flex-col shadow-sm z-20">
      <div className="p-6 border-b border-slate-100 flex items-center">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mr-3 shadow-md shadow-indigo-200">
          SH
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">SmartHost</h1>
          <p className="text-xs text-slate-500 font-medium">Quản lý nhà trọ AI</p>
        </div>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
            }`}
          >
            <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'}`} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 p-4 rounded-xl mb-4 flex items-center">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-3 shrink-0">
            <UserCircle size={24} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-800 truncate">{user?.name || 'Ban Quản Lý'}</p>
            <p className="text-xs font-semibold text-emerald-600 mt-0.5 inline-block bg-emerald-100 px-2 py-0.5 rounded-md">ADMIN</p>
          </div>
        </div>
        
        <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors">
          <LogOut className="w-4 h-4 mr-2" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
