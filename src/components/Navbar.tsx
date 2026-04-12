import { useNavigate, useLocation, Link } from 'react-router-dom';
import pb from '@/lib/pocketbase';
import { 
  Home, 
  ShoppingCart, 
  LayoutDashboard, 
  Coffee, 
  User, 
  Settings, 
  LogOut, 
  LogIn,
  RefreshCw,
  Package,
  Receipt,
  TrendingUp,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface NavbarProps {
  onCartToggle?: () => void;
  cartCount?: number;
}

export default function Navbar({ onCartToggle, cartCount = 0 }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = pb.authStore.model;
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const unsubscribeQueue = (pb as any).onQueueChange?.((count: number) => {
      setQueueCount(count);
    });
    return () => unsubscribeQueue?.();
  }, []);

  const handleLogout = () => {
    pb.authStore.clear();
    toast.success('Đã đăng xuất');
    navigate('/');
    window.location.reload();
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const synced = await (pb as any).sync?.();
      if (synced) {
        toast.success('Đã đồng bộ dữ liệu thành công!');
      } else {
        toast.info('Dữ liệu đã được đồng bộ.');
      }
    } catch (e) {
      toast.error('Lỗi khi đồng bộ dữ liệu');
    } finally {
      setIsSyncing(false);
    }
  };

  const isAdminView = location.pathname.startsWith('/admin');

  const mainNavItems = [
    { 
      icon: ShoppingCart, 
      label: 'Giỏ hàng', 
      path: 'cart', 
      show: location.pathname === '/',
      onClick: onCartToggle,
      badge: cartCount > 0 ? cartCount : undefined
    },
    { 
      icon: LayoutDashboard, 
      label: 'Quản trị', 
      path: '/admin', 
      show: user && (user.role === 'admin' || user.role === 'cast') 
    },
    { 
      icon: Coffee, 
      label: 'Pha chế', 
      path: '/barista', 
      show: user && (user.role === 'admin' || user.role === 'barista' || user.role === 'cast') 
    },
    { 
      icon: User, 
      label: 'Phục vụ', 
      path: '/staff', 
      show: user && (user.role === 'admin' || user.role === 'barista' || user.role === 'staff' || user.role === 'cast') 
    },
  ];

  const adminNavItems = [
    { icon: LayoutDashboard, label: 'Tổng quan', path: '/admin', show: user?.role === 'admin' },
    { icon: Coffee, label: 'Menu', path: '/admin/menu', show: true },
    { icon: Package, label: 'Nguyên liệu', path: '/admin/ingredients', show: true },
    { icon: Receipt, label: 'Đơn hàng', path: '/admin/orders', show: true },
    { icon: TrendingUp, label: 'Tài chính', path: '/admin/expenses', show: true },
    { icon: Users, label: 'Nhân viên', path: '/admin/staff', show: user?.role === 'admin' },
  ];

  const displayItems = isAdminView 
    ? adminNavItems.filter(i => i.show) 
    : mainNavItems.filter(i => i.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-stone-900 flex lg:flex-col items-center justify-around lg:justify-start lg:static lg:w-20 lg:h-full lg:py-6 lg:space-y-6 text-stone-400 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] lg:shadow-none shrink-0 overflow-x-auto lg:overflow-y-auto scrollbar-top show-scrollbar">
      {/* Logo / Home Icon */}
      <div className="flex flex-col items-center lg:space-y-4 w-auto lg:w-full lg:mb-4 shrink-0">
        <button 
          onClick={() => navigate('/')}
          className={cn(
            "p-3 rounded-2xl transition-all",
            location.pathname === '/' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "hover:bg-stone-800 text-stone-400"
          )}
        >
          <Home className="w-6 h-6" />
        </button>
        
        <button 
          onClick={handleSync}
          className={cn(
            "hidden lg:block p-3 hover:bg-stone-800 rounded-2xl transition-all relative",
            isSyncing && "animate-spin"
          )}
          title="Đồng bộ dữ liệu"
        >
          <RefreshCw className="w-5 h-5" />
          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              {queueCount}
            </span>
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex lg:flex-col items-center justify-around lg:justify-start w-full lg:space-y-3 shrink-0">
        {displayItems.map((item: any) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={item.onClick || (() => navigate(item.path))}
              className={cn(
                "p-3 rounded-2xl transition-all relative group",
                isActive 
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                  : "hover:bg-stone-800 text-stone-400"
              )}
              title={item.label}
            >
              <item.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              <span className="sr-only">{item.label}</span>
            </button>
          );
        })}
        
        {/* Settings Button (Mobile) */}
        <button 
          onClick={() => navigate('/settings')}
          className={cn(
            "lg:hidden p-3 rounded-2xl transition-all",
            location.pathname === '/settings' ? "bg-orange-500 text-white" : "hover:bg-stone-800 text-stone-400"
          )}
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Items (Desktop Only) */}
      <div className="hidden lg:flex flex-col items-center mt-auto space-y-3 w-full">
        <button 
          onClick={() => navigate('/settings')}
          className={cn(
            "p-3 rounded-2xl transition-all",
            location.pathname === '/settings' ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "hover:bg-stone-800 text-stone-400"
          )}
          title="Cài đặt"
        >
          <Settings className="w-6 h-6" />
        </button>
        
        {user ? (
          <button 
            onClick={handleLogout}
            className="p-3 hover:bg-red-900/20 hover:text-red-400 rounded-2xl transition-all"
            title="Đăng xuất"
          >
            <LogOut className="w-6 h-6" />
          </button>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            className="p-3 hover:bg-stone-800 text-stone-100 rounded-2xl transition-all"
            title="Đăng nhập"
          >
            <LogIn className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Mobile Auth Button */}
      <div className="lg:hidden flex items-center shrink-0">
        {user ? (
          <button 
            onClick={handleLogout}
            className="p-3 hover:bg-red-900/20 hover:text-red-400 rounded-2xl transition-all"
          >
            <LogOut className="w-6 h-6" />
          </button>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            className="p-3 hover:bg-stone-800 text-stone-100 rounded-2xl transition-all"
          >
            <LogIn className="w-6 h-6" />
          </button>
        )}
      </div>
    </nav>
  );
}
