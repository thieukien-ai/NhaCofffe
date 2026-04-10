import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function Login() {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await pb.collection('users').authWithPassword(identity, password);
      toast.success('Đăng nhập thành công');
      navigate('/');
    } catch (error: any) {
      toast.error('Đăng nhập thất bại: Sai tài khoản hoặc mật khẩu');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="coffee-card overflow-hidden">
          <CardHeader className="bg-primary text-white p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-4">
              <Coffee className="w-10 h-10" />
            </div>
            <CardTitle className="text-3xl font-serif">Chào mừng trở lại</CardTitle>
            <CardDescription className="text-white/60 text-sm mt-2">
              Đăng nhập để quản lý cửa hàng của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="identity" className="text-stone-600">Tên đăng nhập / SĐT</Label>
                <Input
                  id="identity"
                  placeholder="SA hoặc email..."
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  className="h-12 rounded-2xl border-stone-200 focus:ring-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password text-stone-600">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-2xl border-stone-200 focus:ring-primary"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all"
                disabled={loading}
              >
                {loading ? 'Đang xác thực...' : 'Đăng nhập'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
