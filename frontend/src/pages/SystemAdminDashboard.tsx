import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ScrollText,
  Building2,
  LogOut,
  UserCircle,
  RefreshCw,
  Search,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Activity,
  Home,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import KPICard from '../components/KPICard';

interface LandlordItem {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  activeTenantCount: number;
  _count: {
    ownedRooms: number;
    tenants: number;
    landlordInvoices: number;
    activityLogs: number;
  };
}

interface ActivityLogItem {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  landlordId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  ipAddress: string | null;
  createdAt: string;
}

export default function SystemAdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'logs' | 'landlords'>('logs');
  const [landlords, setLandlords] = useState<LandlordItem[]>([]);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalAllLogs, setTotalAllLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters for activity logs
  const [search, setSearch] = useState('');
  const [filterLandlordId, setFilterLandlordId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Create landlord modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchLandlords = async () => {
    try {
      const res = await axios.get('/api/users/landlords');
      setLandlords(res.data || []);
    } catch (error) {
      console.error('Error fetching landlords:', error);
    }
  };

  const fetchLogs = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await axios.get('/api/audit-logs', {
        params: {
          page: targetPage,
          limit: 20,
          landlordId: filterLandlordId || undefined,
          action: filterAction || undefined,
          search: search.trim() || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        },
      });
      setLogs(res.data.logs || []);
      setTotalLogs(res.data.total || 0);
      setTotalAllLogs(res.data.totalAll || 0);
      setTotalPages(res.data.totalPages || 1);
      setAvailableActions(res.data.actions || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLandlords();
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [page, filterLandlordId, filterAction, fromDate, toDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  const handleToggleLandlordStatus = async (landlord: LandlordItem) => {
    const nextStatus = !landlord.isActive;
    const actionLabel = nextStatus ? 'mở khóa' : 'khóa';
    if (!confirm(`Bạn có chắc chắn muốn ${actionLabel} tài khoản Chủ trọ "${landlord.fullName}"?`)) {
      return;
    }
    try {
      await axios.patch(`/api/users/landlords/${landlord.id}/status`, {
        isActive: nextStatus,
      });
      await Promise.all([fetchLandlords(), fetchLogs(page)]);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Không thể cập nhật trạng thái chủ trọ.');
    }
  };

  const handleCreateLandlord = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await axios.post('/api/users/landlords', createForm);
      setShowCreateModal(false);
      setCreateForm({ fullName: '', email: '', phone: '', password: '' });
      await Promise.all([fetchLandlords(), fetchLogs(1)]);
      setPage(1);
    } catch (err: any) {
      setCreateError(err.response?.data?.error || 'Không thể tạo tài khoản Chủ trọ.');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeClass = (role: string) => {
    if (role === 'ADMIN') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (role === 'LANDLORD') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('DELETE') || action.includes('LOCK') || action.includes('REJECT')) {
      return 'bg-rose-100 text-rose-700';
    }
    if (action.includes('CREATE') || action.includes('VNPAY') || action.includes('UNLOCK')) {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (action === 'LOGIN') {
      return 'bg-sky-100 text-sky-700';
    }
    return 'bg-indigo-100 text-indigo-700';
  };

  const totalRoomsAll = landlords.reduce((sum, l) => sum + l._count.ownedRooms, 0);
  const activeLandlordsCount = landlords.filter((l) => l.isActive).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 md:h-screen md:sticky top-0 flex flex-col shadow-sm z-20">
        <div className="p-6 border-b border-slate-100 flex items-center">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold mr-3 shadow-md shadow-amber-200">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">SmartHost</h1>
            <p className="text-xs text-amber-600 font-semibold">Admin Hệ Thống</p>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'logs'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ScrollText
              className={`w-5 h-5 mr-3 ${activeTab === 'logs' ? 'text-indigo-600' : 'text-slate-400'}`}
            />
            Nhật ký hoạt động
          </button>

          <button
            onClick={() => setActiveTab('landlords')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
              activeTab === 'landlords'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Building2
              className={`w-5 h-5 mr-3 ${
                activeTab === 'landlords' ? 'text-indigo-600' : 'text-slate-400'
              }`}
            />
            Quản lý Chủ trọ
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-xl mb-4 flex items-center">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mr-3 shrink-0">
              <UserCircle size={24} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.name || 'Admin'}</p>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                ADMIN
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {activeTab === 'logs'
                ? 'Nhật ký hoạt động toàn hệ thống'
                : 'Quản lý tài khoản Chủ trọ'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === 'logs'
                ? 'Theo dõi toàn bộ thao tác đăng nhập, phòng, hợp đồng, hóa đơn và thanh toán theo thời gian thực.'
                : 'Tạo mới, theo dõi quy mô phòng và khóa/mở khóa tài khoản của các Chủ trọ.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchLandlords();
                fetchLogs(page);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
            {activeTab === 'landlords' && (
              <button
                onClick={() => {
                  setCreateError('');
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm"
              >
                <Plus size={16} />
                Thêm Chủ trọ
              </button>
            )}
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Tổng số Chủ trọ"
            value={landlords.length}
            icon={Building2}
            subtitle="Tài khoản quản lý khu trọ"
          />
          <KPICard
            title="Chủ trọ hoạt động"
            value={activeLandlordsCount}
            icon={CheckCircle2}
            badgeType="success"
            subtitle={`${landlords.length - activeLandlordsCount} tài khoản đang khóa`}
          />
          <KPICard
            title="Tổng phòng hệ thống"
            value={totalRoomsAll}
            icon={Home}
            subtitle="Trên tất cả Chủ trọ"
          />
          <KPICard
            title="Bản ghi nhật ký"
            value={totalAllLogs}
            icon={Activity}
            badgeType="warning"
            subtitle="Tự động ghi nhận"
          />
        </div>

        {/* TAB 1: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Filters */}
            <form
              onSubmit={handleSearchSubmit}
              className="p-4 border-b border-slate-100 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
            >
              <div className="lg:col-span-2 relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo mô tả, tên người dùng..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <select
                value={filterLandlordId}
                onChange={(e) => {
                  setFilterLandlordId(e.target.value);
                  setPage(1);
                }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Tất cả Chủ trọ</option>
                {landlords.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fullName}
                  </option>
                ))}
              </select>

              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(1);
                }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Tất cả hành động</option>
                {availableActions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                title="Từ ngày"
              />

              <div className="flex gap-2">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  title="Đến ngày"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shrink-0"
                >
                  Lọc
                </button>
              </div>
            </form>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Thời gian</th>
                    <th className="px-5 py-3.5">Người thực hiện</th>
                    <th className="px-5 py-3.5">Hành động</th>
                    <th className="px-5 py-3.5">Đối tượng</th>
                    <th className="px-5 py-3.5">Chi tiết hoạt động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        Chưa có bản ghi nhật ký nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-500">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">{log.actorName}</div>
                          <span
                            className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded border ${getRoleBadgeClass(
                              log.actorRole
                            )}`}
                          >
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${getActionBadgeClass(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">{log.entityType}</span>
                          {log.entityId && (
                            <span className="block font-mono text-[11px] text-slate-400">
                              #{log.entityId.substring(0, 8)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-700">{log.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600 bg-slate-50/50">
              <span>
                Hiển thị <strong>{logs.length}</strong> / <strong>{totalLogs}</strong> bản ghi
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-semibold px-2">
                  Trang {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LANDLORDS MANAGEMENT */}
        {activeTab === 'landlords' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Chủ trọ</th>
                    <th className="px-6 py-4">Liên hệ</th>
                    <th className="px-6 py-4 text-center">Số phòng</th>
                    <th className="px-6 py-4 text-center">Khách thuê</th>
                    <th className="px-6 py-4 text-center">Hóa đơn</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {landlords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        Chưa có tài khoản Chủ trọ nào. Hãy bấm &ldquo;Thêm Chủ trọ&rdquo; để tạo mới.
                      </td>
                    </tr>
                  ) : (
                    landlords.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{l.fullName}</p>
                          <p className="text-xs text-slate-400 font-mono">#{l.id.substring(0, 8)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-700 font-medium">{l.email}</p>
                          <p className="text-xs text-slate-500">{l.phone || 'Chưa có SĐT'}</p>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-indigo-600">
                          {l._count.ownedRooms}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">
                          {l.activeTenantCount}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-slate-600">
                          {l._count.landlordInvoices}
                        </td>
                        <td className="px-6 py-4">
                          {l.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <CheckCircle2 size={13} /> Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                              <XCircle size={13} /> Đã khóa
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setFilterLandlordId(l.id);
                                setPage(1);
                                setActiveTab('logs');
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                            >
                              <Eye size={14} /> Xem log ({l._count.activityLogs})
                            </button>
                            <button
                              onClick={() => handleToggleLandlordStatus(l)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                l.isActive
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {l.isActive ? (
                                <>
                                  <Lock size={14} /> Khóa
                                </>
                              ) : (
                                <>
                                  <Unlock size={14} /> Mở khóa
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal Create Landlord */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Thêm tài khoản Chủ trọ mới</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLandlord} className="space-y-4">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Họ tên / Tên khu trọ
                </label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="Ví dụ: Chủ Trọ Thanh Xuân"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="chutro3@nhatro.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="0909xxxxxx"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Mật khẩu đăng nhập
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold"
                >
                  {creating ? 'Đang tạo...' : 'Tạo Chủ trọ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
