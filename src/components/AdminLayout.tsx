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
  Package,
  Home,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import Navbar from './Navbar';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Quick guide for admin
    const timer = setTimeout(() => {
      toast.info('Bảng điều khiển quản trị', {
        description: 'Sử dụng thanh bên hoặc các nút truy cập nhanh để quản lý cửa hàng.',
        duration: 5000,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Tổng quan', path: '/admin', show: pb.authStore.model?.role === 'admin' },
    { icon: Coffee, label: 'Quản lý Menu', path: '/admin/menu', show: true },
    { icon: Package, label: 'Nhập nguyên liệu', path: '/admin/ingredients', show: true },
    { icon: Receipt, label: 'Lịch sử đơn hàng', path: '/admin/orders', show: true },
    { icon: TrendingUp, label: 'Chi phí & Doanh thu', path: '/admin/expenses', show: true },
    { icon: User, label: 'Theo dõi đơn (Staff)', path: '/staff', show: true },
    { icon: Users, label: 'Nhân viên', path: '/admin/staff', show: pb.authStore.model?.role === 'admin' },
    { icon: Settings, label: 'Cài đặt', path: '/admin/settings', show: true },
  ];

  const currentNavItem = navItems.find(i => i.path === location.pathname);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-stone-50 overflow-hidden relative">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full pb-16 lg:pb-0">
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-stone-800 truncate">
              {currentNavItem?.label || 'Dashboard'}
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

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
