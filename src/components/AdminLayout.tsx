import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbase';
import { 
  LayoutDashboard, 
  Coffee, 
  Receipt, 
  Users, 
  Settings, 
  LogOut, 
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Tổng quan', path: '/admin' },
    { icon: Coffee, label: 'Quản lý Menu', path: '/admin/menu' },
    { icon: Package, label: 'Nhập nguyên liệu', path: '/admin/ingredients' },
    { icon: Receipt, label: 'Lịch sử đơn hàng', path: '/admin/orders' },
    { icon: TrendingUp, label: 'Chi phí & Doanh thu', path: '/admin/expenses' },
    { icon: Users, label: 'Nhân viên', path: '/admin/staff' },
    { icon: Settings, label: 'Cài đặt', path: '/admin/settings' },
  ];

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-stone-900 text-stone-300 transition-all duration-300 flex flex-col shrink-0",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-stone-800 shrink-0">
          <Coffee className="w-8 h-8 text-orange-400 shrink-0" />
          {!collapsed && <span className="ml-3 font-bold text-lg text-stone-50 truncate">Coffee Admin</span>}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "flex items-center p-3 rounded-xl transition-all group",
                  isActive 
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                    : "hover:bg-stone-800 hover:text-stone-100"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "" : "group-hover:scale-110 transition-transform")} />
                {!collapsed && <span className="ml-3 font-medium truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-800 space-y-2">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center w-full p-3 rounded-xl hover:bg-stone-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-5 h-5 mx-auto" /> : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="ml-3 font-medium">Thu gọn</span>
              </>
            )}
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center w-full p-3 rounded-xl hover:bg-red-900/20 hover:text-red-400 transition-colors"
          >
            <LogOut className={cn("w-5 h-5", collapsed ? "mx-auto" : "")} />
            {!collapsed && <span className="ml-3 font-medium">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-stone-800">
              {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-stone-800">{pb.authStore.model?.username}</p>
              <p className="text-xs text-stone-500 capitalize">{pb.authStore.model?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold">
              {pb.authStore.model?.username?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
