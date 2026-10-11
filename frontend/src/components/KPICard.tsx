import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  badgeType?: 'primary' | 'success' | 'danger' | 'warning' | 'default';
  subtitle?: string;
}

export default function KPICard({ title, value, icon: Icon, badgeType = 'default', subtitle }: KPICardProps) {
  const getBadgeStyle = () => {
    switch (badgeType) {
      case 'primary': return 'bg-indigo-100 text-indigo-600';
      case 'success': return 'bg-emerald-100 text-emerald-600';
      case 'danger': return 'bg-rose-100 text-rose-600';
      case 'warning': return 'bg-amber-100 text-amber-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${getBadgeStyle()}`}>
          <Icon size={22} />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <div className="flex items-end justify-between">
          <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
          {subtitle && <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}
