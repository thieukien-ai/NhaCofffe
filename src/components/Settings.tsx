import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, MapPin, Lock, Save, ShieldCheck, Printer, Store, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbase';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const user = pb.authStore.model;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [receiptConfig, setReceiptConfig] = useState({
    shopName: 'COFFEE SHOP',
    address: '123 Đường Cà Phê, Quận 1, TP.HCM',
    phone: '0123 456 789',
    footer: 'Cảm ơn quý khách! Hẹn gặp lại.'
  });
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await pb.collection('settings').getFullList();
      const config: any = {};
      data.forEach((s: any) => {
        config[s.key] = s.value;
      });
      if (config.receipt_config) {
        setReceiptConfig(JSON.parse(config.receipt_config));
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  };

  const handleUpdateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const existing = await pb.collection('settings').getFullList({ filter: 'key = "receipt_config"' });
      const value = JSON.stringify(receiptConfig);
      
      if (existing.length > 0) {
        await pb.collection('settings').update((existing[0] as any).id, { value });
      } else {
        await pb.collection('settings').create({ key: 'receipt_config', value });
      }
      toast.success('Cập nhật cấu hình in thành công');
    } catch (error) {
      toast.error('Lỗi khi cập nhật cấu hình in');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const updateData: any = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      };

      if (formData.password) {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Mật khẩu xác nhận không khớp');
          setLoading(false);
          return;
        }
        updateData.password = formData.password;
      }

      await pb.collection('users').update(user.id, updateData);
      toast.success('Cập nhật thông tin thành công');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Lỗi khi cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-stone-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-stone-800">Cài đặt cá nhân</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(user?.role === 'admin' ? '/admin' : user?.role === 'barista' ? '/barista' : user?.role === 'cast' ? '/admin' : '/staff')}
            className="rounded-xl border-stone-200 text-stone-600 hidden sm:flex"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Quay lại Dashboard
          </Button>
          <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            Quyền: {user?.role}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-stone-800 text-stone-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Thông tin cơ bản
            </CardTitle>
            <CardDescription className="text-stone-400">
              Cập nhật thông tin cá nhân của bạn để mọi người dễ nhận diện
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Họ và tên</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input 
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="pl-10 rounded-xl border-stone-200"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input 
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-10 rounded-xl border-stone-200"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input 
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="pl-10 rounded-xl border-stone-200"
                      placeholder="090xxxxxxx"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Địa chỉ</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input 
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="pl-10 rounded-xl border-stone-200"
                      placeholder="Số 1, Đường X..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 space-y-4">
                <h3 className="font-bold text-stone-800 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Đổi mật khẩu
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Mật khẩu mới</Label>
                    <Input 
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="rounded-xl border-stone-200"
                      placeholder="Để trống nếu không đổi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                    <Input 
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="rounded-xl border-stone-200"
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button 
                  type="submit" 
                  className="w-full bg-stone-800 hover:bg-stone-700 text-stone-50 h-12 rounded-xl font-bold"
                  disabled={loading}
                >
                  {loading ? 'Đang lưu...' : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {user?.role === 'admin' && (
          <Card className="md:col-span-2 border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-primary text-white">
              <CardTitle className="text-lg flex items-center gap-2">
                <Printer className="w-5 h-5" />
                Cấu hình hóa đơn in
              </CardTitle>
              <CardDescription className="text-white/70">
                Tùy chỉnh thông tin hiển thị trên hóa đơn khi in cho khách hàng
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdateReceipt} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Tên cửa hàng</Label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input 
                      id="shopName"
                      value={receiptConfig.shopName}
                      onChange={(e) => setReceiptConfig(prev => ({ ...prev, shopName: e.target.value }))}
                      className="pl-10 rounded-xl border-stone-200"
                      placeholder="Tên quán của bạn"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="receipt_phone">Số điện thoại</Label>
                    <Input 
                      id="receipt_phone"
                      value={receiptConfig.phone}
                      onChange={(e) => setReceiptConfig(prev => ({ ...prev, phone: e.target.value }))}
                      className="rounded-xl border-stone-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receipt_address">Địa chỉ</Label>
                    <Input 
                      id="receipt_address"
                      value={receiptConfig.address}
                      onChange={(e) => setReceiptConfig(prev => ({ ...prev, address: e.target.value }))}
                      className="rounded-xl border-stone-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footer">Lời chào cuối hóa đơn</Label>
                  <Input 
                    id="footer"
                    value={receiptConfig.footer}
                    onChange={(e) => setReceiptConfig(prev => ({ ...prev, footer: e.target.value }))}
                    className="rounded-xl border-stone-200"
                    placeholder="Ví dụ: Cảm ơn quý khách!"
                  />
                </div>
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-white h-12 rounded-xl font-bold"
                    disabled={loading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Lưu cấu hình in
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-orange-50 border-orange-100">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-orange-800">Thông tin tài khoản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-orange-600">ID:</span>
                <span className="font-mono font-bold text-orange-900">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-600">Username:</span>
                <span className="font-bold text-orange-900">{user?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-600">Ngày tham gia:</span>
                <span className="font-bold text-orange-900">{user?.created ? new Date(user.created).toLocaleDateString('vi-VN') : 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm">
            <h4 className="font-bold text-stone-800 mb-2 text-sm">Hướng dẫn nhanh</h4>
            <ul className="space-y-2 text-xs text-stone-500">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1 shrink-0" />
                Dùng số điện thoại làm tên đăng nhập để dễ nhớ.
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1 shrink-0" />
                Mật khẩu nên có ít nhất 8 ký tự.
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1 shrink-0" />
                Cập nhật đầy đủ thông tin để nhận báo cáo qua email.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
