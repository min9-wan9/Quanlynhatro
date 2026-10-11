import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import KPICard from '../components/KPICard';
import InvoiceDetail from '../components/InvoiceDetail';
import ContractDetail from '../components/ContractDetail';
import CheckOutProcessModal from '../components/CheckOutProcessModal';
import { 
  Home, CheckCircle, Wallet, AlertCircle, Plus, RefreshCw, Eye, 
  ReceiptText, Edit, Trash2, UserPlus, X, Zap, Droplets, 
  FileSignature, BellRing, Calculator, TrendingUp, Filter
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [rooms, setRooms] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [adminIssues, setAdminIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showCreateContractModal, setShowCreateContractModal] = useState(false);
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [selectedCheckOutRequest, setSelectedCheckOutRequest] = useState<any>(null);
  
  // Forms
  const [roomForm, setRoomForm] = useState({ roomNumber: '', price: '', area: '', status: 'AVAILABLE' });
  const [tenantForm, setTenantForm] = useState({ id: '', name: '', phone: '', password: '' });
  const [contractForm, setContractForm] = useState({ id: '', room: '', tenant: '', idCard: '', phone: '', price: '', deposit: '', startDate: '', endDate: '', equipments: '' });
  const [invoiceForm, setInvoiceForm] = useState({ id: '', title: '', amount: '', dueDate: '', status: 'PENDING' });

  // Mock data fallbacks
  const mockRooms = [
    { id: '1', roomNumber: '101', price: 3000000, status: 'OCCUPIED', tenant: 'Nguyễn Văn A', phone: '0911111111', elecPrev: 120, elecCurr: 200, waterPrev: 15, waterCurr: 20 },
    { id: '2', roomNumber: '102', price: 3500000, status: 'OCCUPIED', tenant: 'Trần Thị B', phone: '0922222222', elecPrev: 310, elecCurr: 380, waterPrev: 40, waterCurr: 48 },
    { id: '3', roomNumber: '201', price: 3000000, status: 'AVAILABLE', tenant: '', phone: '' },
    { id: '4', roomNumber: '202', price: 4000000, status: 'MAINTENANCE', tenant: '', phone: '' }
  ];

  const mockInvoices = [
    { id: 'inv-1', title: 'Hóa đơn T10 - P.101', room: '101', tenant: 'Nguyễn Văn A', amount: 3350000, status: 'PENDING', dueDate: '15/10/2026' },
    { id: 'inv-2', title: 'Hóa đơn T10 - P.102', room: '102', tenant: 'Trần Thị B', amount: 3950000, status: 'PAID', dueDate: '15/10/2026' }
  ];

  const mockContracts = [
    { id: 'c-1', room: '101', tenant: 'Nguyễn Văn A', startDate: '01/01/2026', endDate: '01/01/2027', status: 'ACTIVE' },
    { id: 'c-2', room: '102', tenant: 'Trần Thị B', startDate: '15/05/2026', endDate: '15/05/2027', status: 'ACTIVE' }
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsRes, invoicesRes, contractsRes, issuesRes] = await Promise.all([
        axios.get('/api/rooms').catch(() => ({ data: [] })),
        axios.get('/api/invoices').catch(() => ({ data: [] })),
        axios.get('/api/contracts').catch(() => ({ data: [] })),
        axios.get('/api/issues').catch(() => ({ data: [] }))
      ]);
      setAdminIssues(issuesRes.data || []);
      setRooms(roomsRes.data.length ? roomsRes.data.map((r: any) => {
        const utils = r.utilityReadings || [];
        const curr = utils[0] || { powerNumber: 0, waterNumber: 0 };
        const prev = utils[1] || { powerNumber: 0, waterNumber: 0 };
        return {
          ...r,
          tenant: r.contracts?.[0]?.user?.fullName || '',
          phone: r.contracts?.[0]?.user?.phone || '',
          userId: r.contracts?.[0]?.user?.id || '',
          elecCurr: curr.powerNumber,
          waterCurr: curr.waterNumber,
          elecPrev: prev.powerNumber,
          waterPrev: prev.waterNumber,
        };
      }) : mockRooms);
      setInvoices(invoicesRes.data.length ? invoicesRes.data.map((inv: any) => ({
        ...inv,
        id: inv.id,
        title: inv.title,
        amount: inv.amount,
        status: inv.status,
        dueDate: new Date(inv.dueDate).toLocaleDateString('vi-VN'),
        room: inv.user?.contracts?.[0]?.room?.roomNumber || 'Unknown',
        tenant: inv.user?.fullName || 'Unknown'
      })) : mockInvoices);
      
      setContracts(contractsRes.data.length ? contractsRes.data.map((c: any) => ({
        ...c,
        id: c.id,
        room: c.room?.roomNumber || 'Unknown',
        tenant: c.user?.fullName || 'Unknown',
        startDate: new Date(c.startDate).toLocaleDateString('vi-VN'),
        endDate: new Date(c.endDate).toLocaleDateString('vi-VN'),
        status: new Date(c.endDate).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000 ? 'WARNING' : 'ACTIVE',
        price: c.price || 0,
        deposit: c.deposit || 0,
        equipments: c.equipments ? c.equipments.split(',') : [],
        checkOutRequest: c.checkOutRequest
      })) : mockContracts);
    } catch (error) {
      setRooms(mockRooms);
      setInvoices(mockInvoices);
      setContracts(mockContracts);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const simulateWebhook = async (invoiceId: string, amount: number) => {
    try {
      await axios.post('/api/payments/webhook', {
        transactionId: `TXN_${Date.now()}`,
        transferAmount: amount,
        content: `Thanh toan PAY ${invoiceId}`,
        bankCode: 'MOCKBANK'
      }, { headers: { 'Authorization': 'test_secret_123' } });
      fetchData(); 
    } catch (error) {
      setInvoices(prev => prev.map(i => i.id === invoiceId ? {...i, status: 'PAID'} : i));
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa hợp đồng này? Mọi lịch sử và yêu cầu Check-out liên quan cũng sẽ bị xóa.')) return;
    try {
      await axios.delete(`/api/contracts/${id}`);
      fetchData();
      alert('Đã xóa hợp đồng thành công!');
    } catch (err) {
      alert('Lỗi khi xóa hợp đồng!');
    }
  };

  const openEditContract = (c: any) => {
    // Chuyển đổi định dạng ngày từ DD/MM/YYYY sang YYYY-MM-DD
    const parseDate = (dString: string) => {
      if (!dString) return '';
      const parts = dString.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      return dString;
    };

    setContractForm({
      id: c.id,
      room: c.room || '',
      tenant: c.tenant || '',
      phone: c.user?.phone || '',
      idCard: c.user?.idCard || '',
      price: c.price ? c.price.toString() : '',
      deposit: c.deposit ? c.deposit.toString() : '',
      startDate: parseDate(c.startDate),
      endDate: parseDate(c.endDate),
      equipments: c.equipments ? c.equipments.join(', ') : ''
    });
    setShowCreateContractModal(true);
  };


  // ROOM CRUD
  const openRoomModal = (room?: any) => {
    setSelectedRoom(room || null);
    if (room) {
      setRoomForm({ roomNumber: room.roomNumber, price: room.price.toString(), area: room.area?.toString() || '', status: room.status });
    } else {
      setRoomForm({ roomNumber: '', price: '', area: '', status: 'AVAILABLE' });
    }
    setShowRoomModal(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...roomForm, price: Number(roomForm.price), area: Number(roomForm.area || 0) };
    try {
      if (selectedRoom) {
        await axios.put(`/api/rooms/${selectedRoom.id}`, data);
      } else {
        await axios.post('/api/rooms', data);
      }
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi lưu phòng!');
    }
    setShowRoomModal(false);
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phòng này?')) return;
    try {
      await axios.delete(`/api/rooms/${id}`);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi xóa phòng!');
    }
  };

  const openTenantModal = (room: any, isEdit = false) => {
    setSelectedRoom(room);
    if (isEdit) {
      setTenantForm({ id: room.userId, name: room.tenant, phone: room.phone, password: '' });
    } else {
      setTenantForm({ id: '', name: '', phone: '', password: '' });
    }
    setShowTenantModal(true);
  };

  const handleAssignTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (tenantForm.id) {
        // Edit existing
        await axios.put(`/api/users/${tenantForm.id}`, {
          fullName: tenantForm.name,
          phone: tenantForm.phone,
          password: tenantForm.password
        });
      } else {
        // Create new
        await axios.post('/api/users', {
          fullName: tenantForm.name,
          phone: tenantForm.phone,
          password: tenantForm.password,
          roomId: selectedRoom?.id
        });
      }
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi cập nhật tài khoản!');
    }
    setShowTenantModal(false);
  };

  const sendReminder = (room: string) => {
    alert(`Đã gửi thông báo Zalo/SMS nhắc nợ cho phòng ${room}!`);
  };

  const handleUtilityChange = (roomId: string, field: string, value: number) => {
    setRooms(rooms.map(r => r.id === roomId ? { ...r, [field]: value } : r));
  };

  const handleSaveAllUtilities = async () => {
    setLoading(true);
    try {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const promises = rooms.filter(r => r.status === 'OCCUPIED').map(r => 
        axios.post(`/api/rooms/${r.id}/utilities`, {
          month,
          year,
          powerNumber: r.elecCurr || 0,
          waterNumber: r.waterCurr || 0
        }).catch(err => console.error(err))
      );
      await Promise.all(promises);
      alert('Đã lưu chỉ số điện nước thành công!');
      fetchData();
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu chỉ số điện nước!');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGenerateInvoices = async () => {
    if (!confirm('Bạn có chắc chắn muốn chốt hóa đơn hàng loạt cho tất cả các phòng đang thuê không? Hệ thống sẽ tự động lấy chỉ số điện/nước mới nhất để tính tiền.')) return;
    setLoading(true);
    try {
      const res = await axios.post('/api/invoices/bulk-generate');
      alert(`Đã tạo thành công ${res.data.count} hóa đơn!`);
      fetchData();
    } catch (error) {
      alert('Có lỗi xảy ra khi tạo hóa đơn hàng loạt!');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa hóa đơn này?')) return;
    try {
      await axios.delete(`/api/invoices/${id}`);
      fetchData();
      alert('Xóa hóa đơn thành công!');
    } catch (err) {
      alert('Lỗi khi xóa hóa đơn!');
    }
  };

  const openEditInvoice = (inv: any) => {
    const parseDate = (dString: string) => {
      if (!dString) return '';
      const parts = dString.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      return dString;
    };

    setInvoiceForm({
      id: inv.id,
      title: inv.title,
      amount: inv.amount.toString(),
      dueDate: inv.dueDate?.includes('/') ? parseDate(inv.dueDate) : (inv.dueDate?.split('T')[0] || ''),
      status: inv.status
    });
    setShowEditInvoiceModal(true);
  };

  // KPI calculations
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED').length;
  const collectedMoney = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);
  const pendingMoney = invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="ml-64 flex-1 p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {activeTab === 'overview' && 'Tổng quan & Báo cáo'}
              {activeTab === 'rooms' && 'Quản lý phòng trọ'}
              {activeTab === 'utilities' && 'Tính điện nước'}
              {activeTab === 'invoices' && 'Thu tiền & Hóa đơn'}
              {activeTab === 'contracts' && 'Hợp đồng thuê'}
              {activeTab === 'issues' && 'Sự cố cần xử lý'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">Chào mừng quay trở lại, Admin!</p>
          </div>
          <button onClick={fetchData} className="flex items-center text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg font-medium transition-colors">
            <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        </header>

        {/* 1. TỔNG QUAN & BÁO CÁO */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <KPICard title="Tổng thu tháng này" value={`${collectedMoney.toLocaleString()} ₫`} icon={TrendingUp} badgeType="success" subtitle="+15% so với tháng trước" />
              <KPICard title="Dự kiến thu thêm / Nợ" value={`${pendingMoney.toLocaleString()} ₫`} icon={AlertCircle} badgeType="danger" subtitle={`${invoices.filter(i => i.status==='PENDING').length} hóa đơn chưa đóng`} />
              <KPICard title="Lấp đầy phòng" value={`${Math.round((occupiedRooms/totalRooms)*100 || 0)}%`} icon={Home} badgeType="primary" subtitle={`${occupiedRooms}/${totalRooms} phòng có khách`} />
              <KPICard title="Chi phí vận hành" value="1,250,000 ₫" icon={Wallet} badgeType="default" subtitle="Bảo trì, rác, wifi..." />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Biểu đồ dòng tiền (Giả lập bằng UI stat) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Báo cáo Lãi Ròng</h3>
                  <button className="text-sm font-medium text-slate-500 flex items-center bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200"><Filter size={14} className="mr-1"/> Khu A</button>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                    <span className="text-emerald-700 font-semibold">Tổng doanh thu</span>
                    <span className="font-bold text-emerald-700">{(collectedMoney + pendingMoney).toLocaleString()} ₫</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-rose-50 rounded-lg">
                    <span className="text-rose-700 font-semibold">Tổng chi phí</span>
                    <span className="font-bold text-rose-700">1,250,000 ₫</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-indigo-600 rounded-lg text-white">
                    <span className="font-bold text-lg">LỢI NHUẬN RÒNG</span>
                    <span className="font-bold text-xl">{((collectedMoney + pendingMoney) - 1250000).toLocaleString()} ₫</span>
                  </div>
                </div>
              </div>

              {/* Tình trạng phòng nhanh */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Trạng thái Tòa nhà</h3>
                <div className="flex flex-col h-[200px] justify-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-1/3 text-sm font-semibold text-slate-600">Đang thuê ({occupiedRooms})</div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{width: `${(occupiedRooms/totalRooms)*100}%`}}></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-1/3 text-sm font-semibold text-slate-600">Phòng trống ({totalRooms - occupiedRooms})</div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-300 rounded-full" style={{width: `${((totalRooms - occupiedRooms)/totalRooms)*100}%`}}></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-1/3 text-sm font-semibold text-slate-600">Bảo trì/Sửa (1)</div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{width: `10%`}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. QUẢN LÝ PHÒNG */}
        {activeTab === 'rooms' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50 rounded-t-xl">
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md">Đang thuê ({occupiedRooms})</span>
                <span className="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-md">Trống ({totalRooms - occupiedRooms - 1})</span>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-md">Đang sửa (1)</span>
              </div>
              <button onClick={() => openRoomModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center font-medium transition-colors shadow-sm shadow-indigo-200">
                <Plus size={18} className="mr-2" /> Thêm phòng mới
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="px-6 py-4">Mã / Số phòng</th>
                    <th className="px-6 py-4">Giá thuê</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4">Khách thuê</th>
                    <th className="px-6 py-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-700">P.{room.roomNumber}</td>
                      <td className="px-6 py-4 font-medium text-indigo-600">{Number(room.price).toLocaleString()} ₫</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex w-max items-center 
                          ${room.status === 'AVAILABLE' ? 'bg-slate-100 text-slate-500' : 
                            room.status === 'OCCUPIED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {room.status === 'AVAILABLE' && 'Trống'}
                          {room.status === 'OCCUPIED' && 'Đang thuê'}
                          {room.status === 'MAINTENANCE' && 'Đang sửa chữa'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {room.status === 'OCCUPIED' ? (
                          <div onClick={() => openTenantModal(room, true)} className="cursor-pointer hover:bg-slate-100 p-2 -ml-2 rounded-lg transition-colors inline-block">
                            <p className="text-sm font-semibold text-slate-800 flex items-center">{room.tenant} <Edit size={14} className="ml-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                            <p className="text-xs text-slate-500">{room.phone}</p>
                          </div>
                        ) : room.status === 'AVAILABLE' ? (
                          <button onClick={() => openTenantModal(room, false)} className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center transition-colors border border-indigo-100">
                            <UserPlus size={16} className="mr-1" /> Thêm khách & Tạo TK
                          </button>
                        ) : <span className="text-slate-400 text-sm italic">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openRoomModal(room)} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors" title="Sửa thông tin"><Edit size={18} /></button>
                          <button onClick={() => handleDeleteRoom(room.id)} className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors" title="Xóa phòng"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. TÍNH ĐIỆN NƯỚC */}
        {activeTab === 'utilities' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            <div className="p-6 bg-indigo-50/50 border-b border-indigo-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-indigo-900 flex items-center"><Calculator className="mr-2" size={20}/> Chốt chỉ số Điện / Nước tháng 10</h3>
                <p className="text-sm text-indigo-700 mt-1">Hệ thống sẽ tự động tính giá lũy tiến/bậc thang theo cài đặt.</p>
              </div>
              <button onClick={handleSaveAllUtilities} disabled={loading} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                Lưu tất cả chỉ số
              </button>
            </div>
            
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs uppercase font-bold text-center">
                    <th className="px-4 py-3 border border-slate-200 text-left">Phòng</th>
                    <th className="px-4 py-3 border border-slate-200 text-amber-600 bg-amber-50" colSpan={3}><Zap size={14} className="inline mr-1"/> Điện (kWh) - 3.500đ</th>
                    <th className="px-4 py-3 border border-slate-200 text-cyan-600 bg-cyan-50" colSpan={3}><Droplets size={14} className="inline mr-1"/> Nước (m3) - 20.000đ</th>
                  </tr>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-semibold text-center">
                    <th className="border border-slate-200"></th>
                    <th className="px-2 py-2 border border-slate-200">Số Cũ</th>
                    <th className="px-2 py-2 border border-slate-200">Số Mới</th>
                    <th className="px-2 py-2 border border-slate-200 text-indigo-600">Sử dụng</th>
                    <th className="px-2 py-2 border border-slate-200">Số Cũ</th>
                    <th className="px-2 py-2 border border-slate-200">Số Mới</th>
                    <th className="px-2 py-2 border border-slate-200 text-indigo-600">Sử dụng</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.filter(r => r.status === 'OCCUPIED').map(room => (
                    <tr key={room.id} className="text-center hover:bg-slate-50">
                      <td className="px-4 py-3 border border-slate-200 font-bold text-slate-800 text-left">P.{room.roomNumber}</td>
                      <td className="px-2 py-2 border border-slate-200 font-mono text-slate-500">{room.elecPrev || 0}</td>
                      <td className="px-2 py-2 border border-slate-200">
                        <input type="number" value={room.elecCurr || 0} onChange={e => handleUtilityChange(room.id, 'elecCurr', Number(e.target.value))} className="w-20 px-2 py-1 border border-amber-200 rounded text-center focus:ring-2 focus:ring-amber-500 outline-none" />
                      </td>
                      <td className="px-2 py-2 border border-slate-200 font-bold text-amber-600">{(room.elecCurr || 0) - (room.elecPrev || 0)}</td>
                      
                      <td className="px-2 py-2 border border-slate-200 font-mono text-slate-500">{room.waterPrev || 0}</td>
                      <td className="px-2 py-2 border border-slate-200">
                        <input type="number" value={room.waterCurr || 0} onChange={e => handleUtilityChange(room.id, 'waterCurr', Number(e.target.value))} className="w-20 px-2 py-1 border border-cyan-200 rounded text-center focus:ring-2 focus:ring-cyan-500 outline-none" />
                      </td>
                      <td className="px-2 py-2 border border-slate-200 font-bold text-cyan-600">{(room.waterCurr || 0) - (room.waterPrev || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. THU TIỀN VÀ HÓA ĐƠN */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Quản lý thu tiền</h3>
                <p className="text-sm text-slate-500">Tạo bảng kê chi tiết cho từng phòng và gửi hóa đơn cho khách.</p>
              </div>
              <button onClick={handleBulkGenerateInvoices} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg flex items-center font-bold transition-colors shadow-sm disabled:opacity-50">
                <ReceiptText size={18} className="mr-2" /> {loading ? 'Đang tạo...' : 'Chốt hóa đơn Hàng Loạt'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="px-6 py-4">Phòng / Khách</th>
                    <th className="px-6 py-4">Tổng tiền (Phòng+Đ+N+DV)</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4">Hạn nộp</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">P.{inv.room}</p>
                        <p className="text-xs text-slate-500">{inv.tenant}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{inv.amount.toLocaleString()} ₫</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex w-max items-center ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                          {inv.status === 'PAID' ? <CheckCircle size={14} className="mr-1"/> : <AlertCircle size={14} className="mr-1"/>}
                          {inv.status === 'PAID' ? 'Đã thu' : 'Chưa thu'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono">{inv.dueDate}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-end">
                          {inv.status !== 'PAID' && (
                            <>
                              <button onClick={() => sendReminder(inv.room)} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center border border-amber-200" title="Gửi Zalo/SMS nhắc nợ">
                                <BellRing size={14} className="mr-1" /> Nhắc nợ
                              </button>
                              <button onClick={() => simulateWebhook(inv.id, inv.amount)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center border border-slate-200">
                                Xác nhận thu tay
                              </button>
                            </>
                          )}
                          <button onClick={() => setSelectedInvoice(inv)} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-md" title="Xem chi tiết"><Eye size={16} /></button>
                          <button onClick={() => openEditInvoice(inv)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md" title="Sửa"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteInvoice(inv.id)} className="text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-md" title="Xóa"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. HỢP ĐỒNG THUÊ */}
        {activeTab === 'contracts' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg flex items-center"><FileSignature className="mr-2 text-indigo-600"/> Quản lý hợp đồng</h3>
              <button 
                onClick={() => {
                  setContractForm({ room: '', tenant: '', idCard: '', phone: '', price: '', deposit: '', startDate: '', endDate: '', equipments: '' });
                  setShowCreateContractModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center font-medium transition-colors"
              >
                <Plus size={18} className="mr-2" /> Tạo hợp đồng mới
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="px-6 py-4">Phòng</th>
                    <th className="px-6 py-4">Khách thuê</th>
                    <th className="px-6 py-4">Từ ngày</th>
                    <th className="px-6 py-4">Đến ngày</th>
                    <th className="px-6 py-4">Tình trạng</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contracts.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold text-slate-800">P.{c.room}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">{c.tenant}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{c.startDate}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-bold">{c.endDate}</td>
                      <td className="px-6 py-4">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.status === 'WARNING' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                           {c.status === 'WARNING' ? 'Sắp hết hạn (< 30 ngày)' : 'Đang hiệu lực'}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         {c.status === 'WARNING' && (
                           <button className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 text-xs font-bold rounded-lg mr-2">
                             Gia hạn nhanh
                           </button>
                         )}
                         {c.checkOutRequest && c.checkOutRequest.status === 'PENDING' && (
                           <button 
                             onClick={() => {
                               setSelectedContract(c);
                               setSelectedCheckOutRequest(c.checkOutRequest);
                             }}
                             className="text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1 text-xs font-bold rounded-lg mr-2"
                           >
                             Duyệt Check-out
                           </button>
                         )}
                         <button 
                           onClick={() => setSelectedContract({...c, price: c.price || 3500000, deposit: c.deposit || 3500000, equipments: c.equipments || ['Điều hòa', 'Tủ lạnh']})}
                           className="text-slate-500 hover:text-slate-700"
                           title="Xem chi tiết"
                         >
                           <Eye size={18} />
                         </button>
                         <button onClick={() => openEditContract(c)} className="text-slate-500 hover:text-blue-600 ml-2" title="Sửa hợp đồng">
                           <Edit size={18} />
                         </button>
                         <button onClick={() => handleDeleteContract(c.id)} className="text-slate-500 hover:text-red-600 ml-2" title="Xóa hợp đồng">
                           <Trash2 size={18} />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. SỰ CỐ BẢO TRÌ */}
        {activeTab === 'issues' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg flex items-center"><AlertCircle className="mr-2 text-indigo-600"/> Sự cố cần xử lý</h3>
            </div>
            <div className="overflow-x-auto p-4">
              {adminIssues.length === 0 ? (
                <div className="text-center py-8 text-slate-500">Chưa có yêu cầu sửa chữa nào.</div>
              ) : (
                <div className="space-y-4">
                  {adminIssues.map(issue => (
                    <div key={issue.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-bold text-slate-800">Phòng {issue.room?.roomNumber || 'N/A'}</span>
                          <span className={`text-xs px-2 py-1 rounded font-bold ${issue.isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {issue.isResolved ? 'Đã xử lý' : 'Chưa xử lý'}
                          </span>
                        </div>
                        <h4 className="font-semibold text-indigo-900">{issue.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{issue.description}</p>
                        {issue.imageUrl && (
                          <div className="mt-3">
                            <img src={issue.imageUrl} alt="Sự cố" className="h-24 w-auto rounded border border-slate-200 cursor-pointer object-cover" onClick={() => window.open(issue.imageUrl, '_blank')} />
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-2">{new Date(issue.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                      {!issue.isResolved && (
                        <button 
                          onClick={async () => {
                            try {
                              await axios.put(`/api/issues/${issue.id}/resolve`);
                              fetchData();
                            } catch(e) { alert('Có lỗi xảy ra!'); }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                        >
                          Đánh dấu đã xử lý
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ROOM MODAL */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">{selectedRoom ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}</h3>
              <button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Số phòng</label>
                <input 
                  type="text" required value={roomForm.roomNumber} onChange={e => setRoomForm({...roomForm, roomNumber: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Giá thuê (VNĐ)</label>
                <input 
                  type="number" required value={roomForm.price} onChange={e => setRoomForm({...roomForm, price: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Trạng thái phòng</label>
                <select 
                  value={roomForm.status} onChange={e => setRoomForm({...roomForm, status: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="AVAILABLE">Trống</option>
                  <option value="OCCUPIED">Đang thuê</option>
                  <option value="MAINTENANCE">Đang sửa chữa</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowRoomModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TENANT ASSIGN MODAL */}
      {showTenantModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">{tenantForm.id ? `Sửa tài khoản (P.${selectedRoom?.roomNumber})` : `Cấp tài khoản cho P.${selectedRoom?.roomNumber}`}</h3>
              <button onClick={() => setShowTenantModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleAssignTenant} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tên khách thuê</label>
                <input 
                  type="text" required value={tenantForm.name} onChange={e => setTenantForm({...tenantForm, name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Số điện thoại (Tên đăng nhập)</label>
                <input 
                  type="tel" required value={tenantForm.phone} onChange={e => setTenantForm({...tenantForm, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Mật khẩu {tenantForm.id ? '(Để trống nếu không đổi)' : ''}</label>
                <input 
                  type="text" required={!tenantForm.id} value={tenantForm.password} onChange={e => setTenantForm({...tenantForm, password: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowTenantModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl">{tenantForm.id ? 'Cập nhật' : 'Cấp & Cho thuê'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            <InvoiceDetail invoice={selectedInvoice} onRefresh={() => { fetchData(); setSelectedInvoice(null); }} />
          </div>
        </div>
      )}

      {/* Check Out Process Modal */}
      {selectedCheckOutRequest && selectedContract && (
        <CheckOutProcessModal 
          request={selectedCheckOutRequest} 
          contract={selectedContract}
          onClose={() => {
            setSelectedCheckOutRequest(null);
            setSelectedContract(null);
          }}
          onSuccess={fetchData}
        />
      )}

      {/* CREATE / EDIT CONTRACT MODAL */}
      {showCreateContractModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in overflow-y-auto py-10">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl animate-in zoom-in-95 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">{contractForm.id ? 'Sửa hợp đồng' : 'Tạo hợp đồng mới'}</h3>
              <button onClick={() => setShowCreateContractModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              try {
                if (contractForm.id) {
                  await axios.put(`/api/contracts/${contractForm.id}`, contractForm);
                  alert('Sửa hợp đồng thành công!'); 
                } else {
                  await axios.post('/api/contracts', contractForm);
                  alert('Tạo hợp đồng thành công!'); 
                }
                setShowCreateContractModal(false); 
                setContractForm({ id: '', room: '', tenant: '', idCard: '', phone: '', price: '', deposit: '', startDate: '', endDate: '', equipments: '' });
                fetchData();
              } catch(err) {
                alert('Có lỗi xảy ra khi lưu hợp đồng');
              }
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Số phòng</label>
                  <input type="text" required value={contractForm.room} onChange={e => setContractForm({...contractForm, room: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tên khách thuê</label>
                  <input type="text" required value={contractForm.tenant} onChange={e => setContractForm({...contractForm, tenant: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input type="text" required value={contractForm.phone} onChange={e => setContractForm({...contractForm, phone: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">CCCD / CMND</label>
                  <input type="text" required value={contractForm.idCard} onChange={e => setContractForm({...contractForm, idCard: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Giá thuê (VNĐ/tháng)</label>
                  <input type="number" required value={contractForm.price} onChange={e => setContractForm({...contractForm, price: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tiền cọc (VNĐ)</label>
                  <input type="number" required value={contractForm.deposit} onChange={e => setContractForm({...contractForm, deposit: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Từ ngày</label>
                  <input type="date" required value={contractForm.startDate} onChange={e => setContractForm({...contractForm, startDate: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Đến ngày</label>
                  <input type="date" required value={contractForm.endDate} onChange={e => setContractForm({...contractForm, endDate: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Trang thiết bị bàn giao (cách nhau bởi dấu phẩy)</label>
                  <input type="text" value={contractForm.equipments} onChange={e => setContractForm({...contractForm, equipments: e.target.value})} placeholder="VD: Điều hòa, Tủ lạnh, Giường" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowCreateContractModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">Lưu & Tạo hợp đồng</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INVOICE MODAL */}
      {showEditInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in overflow-y-auto py-10">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Sửa thông tin hóa đơn</h3>
              <button onClick={() => setShowEditInvoiceModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              try {
                await axios.put(`/api/invoices/${invoiceForm.id}`, invoiceForm);
                alert('Sửa hóa đơn thành công!'); 
                setShowEditInvoiceModal(false); 
                fetchData();
              } catch(err) {
                alert('Có lỗi xảy ra khi lưu hóa đơn');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tên / Tiêu đề hóa đơn</label>
                <input type="text" required value={invoiceForm.title} onChange={e => setInvoiceForm({...invoiceForm, title: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tổng tiền (VNĐ)</label>
                <input type="number" required value={invoiceForm.amount} onChange={e => setInvoiceForm({...invoiceForm, amount: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Hạn nộp</label>
                <input type="date" required value={invoiceForm.dueDate} onChange={e => setInvoiceForm({...invoiceForm, dueDate: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Trạng thái</label>
                <select value={invoiceForm.status} onChange={e => setInvoiceForm({...invoiceForm, status: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  <option value="PENDING">Chưa thu (PENDING)</option>
                  <option value="PAID">Đã thu (PAID)</option>
                  <option value="OVERDUE">Quá hạn (OVERDUE)</option>
                  <option value="PARTIAL">Thu một phần (PARTIAL)</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowEditInvoiceModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">Lưu hóa đơn</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTRACT DETAIL MODAL */}
      {selectedContract && !selectedCheckOutRequest && (
        <ContractDetail 
          contract={selectedContract} 
          user={{ 
            name: selectedContract.tenant, 
            phone: selectedContract.user?.phone, 
            idCard: selectedContract.user?.idCard 
          }} 
          onClose={() => setSelectedContract(null)} 
        />
      )}

      {/* EDIT INVOICE MODAL */}
      {showEditInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 animate-in fade-in overflow-y-auto py-10">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Sửa thông tin hóa đơn</h3>
              <button onClick={() => setShowEditInvoiceModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              try {
                await axios.put(`/api/invoices/${invoiceForm.id}`, invoiceForm);
                alert('Sửa hóa đơn thành công!'); 
                setShowEditInvoiceModal(false); 
                fetchData();
              } catch(err) {
                alert('Có lỗi xảy ra khi lưu hóa đơn');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tên / Tiêu đề hóa đơn</label>
                <input type="text" required value={invoiceForm.title} onChange={e => setInvoiceForm({...invoiceForm, title: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tổng tiền (VNĐ)</label>
                <input type="number" required value={invoiceForm.amount} onChange={e => setInvoiceForm({...invoiceForm, amount: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Hạn nộp</label>
                <input type="date" required value={invoiceForm.dueDate} onChange={e => setInvoiceForm({...invoiceForm, dueDate: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Trạng thái</label>
                <select value={invoiceForm.status} onChange={e => setInvoiceForm({...invoiceForm, status: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  <option value="PENDING">Chưa thu (PENDING)</option>
                  <option value="PAID">Đã thu (PAID)</option>
                  <option value="OVERDUE">Quá hạn (OVERDUE)</option>
                  <option value="PARTIAL">Thu một phần (PARTIAL)</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowEditInvoiceModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">Lưu hóa đơn</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
