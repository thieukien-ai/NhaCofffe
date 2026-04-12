import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import pb from '@/lib/pocketbase';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

function LoadingBar() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = (pb as any).onLoadingChange((l: boolean) => setLoading(l));
    return () => unsubscribe();
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-stone-200 overflow-hidden">
      <div className="h-full bg-orange-500 animate-progress origin-left"></div>
    </div>
  );
}

function ConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'error' | 'offline'>('offline');

  useEffect(() => {
    const unsubscribe = (pb as any).onConnectionChange((s: any) => setStatus(s));
    return () => unsubscribe();
  }, []);

  if (status === 'connected') return null;

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 ${
      status === 'error' ? 'bg-red-500 text-white' : 'bg-stone-500 text-white'
    }`}>
      {status === 'error' ? <AlertCircle className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {status === 'error' ? 'Lỗi kết nối Google Sheets' : 'Đang ngoại tuyến'}
    </div>
  );
}
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import OrderView from '@/components/OrderView';
import BaristaView from '@/components/BaristaView';
import AdminLayout from '@/components/AdminLayout';
import MenuManagement from '@/components/MenuManagement';
import ExpenseManagement from '@/components/ExpenseManagement';
import StaffManagement from '@/components/StaffManagement';
import OrderHistory from '@/components/OrderHistory';
import IngredientManagement from '@/components/IngredientManagement';
import StaffView from '@/components/StaffView';
import Settings from '@/components/Settings';
import PWAHelper from '@/components/PWAHelper';
import { User } from '@/types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    if (pb.authStore.isValid) {
      setUser(pb.authStore.model as unknown as User);
    }
    setLoading(false);

    // Diagnostic check for Google Sheets connection
    const checkConnection = async () => {
      let apiUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
      
      if (!apiUrl) {
        console.error('VITE_GOOGLE_SHEET_API_URL is missing.');
        toast.error('LỖI CẤU HÌNH: Thiếu biến VITE_GOOGLE_SHEET_API_URL trên Vercel.');
        return;
      }

      apiUrl = apiUrl.trim().replace(/\/+$/, '');
      
      if (apiUrl.includes('/dev')) {
        toast.error('CẢNH BÁO: Bạn đang dùng URL kết thúc bằng /dev. Hãy dùng URL kết thúc bằng /exec để tránh lỗi đăng nhập.', { duration: 10000 });
      }
      
      try {
        console.log('Testing connection to:', apiUrl);
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'read', sheet: 'users' }),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Connection successful, data:', data);
          if (Array.isArray(data)) {
            toast.success('Kết nối Google Sheets thành công!');
          } else {
            console.warn('Response is not an array:', data);
            toast.warning('Kết nối thành công nhưng dữ liệu không đúng định dạng.');
          }
        } else {
          console.error('API Error:', response.status, response.statusText);
          const text = await response.text();
          console.error('Response body:', text);
          toast.error(`Lỗi kết nối (${response.status}): ${response.statusText}`);
        }
      } catch (error) {
        console.error('Fetch error:', error);
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          toast.error('LỖI CORS: Không thể kết nối tới Apps Script. Hãy kiểm tra: 1. Deploy là "Anyone". 2. Execute as là "Me". 3. Link URL chính xác.', { duration: 10000 });
        } else {
          toast.error('Không thể kết nối tới Apps Script. Đảm bảo bạn đã Deploy đúng cách.');
        }
      }
    };

    checkConnection();

    // Listen for auth changes
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model as unknown as User);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-stone-800"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
        <LoadingBar />
        <ConnectionStatus />
        <PWAHelper />
        <Routes>
          <Route path="/" element={<OrderView />} />
          <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'barista' ? '/barista' : user.role === 'cast' ? '/admin' : '/staff'} /> : <Login />} />
          
          <Route path="/barista" element={
            user && (user.role === 'admin' || user.role === 'barista' || user.role === 'cast') 
              ? <BaristaView /> 
              : <Navigate to="/login" />
          } />
          <Route path="/staff" element={
            user && (user.role === 'admin' || user.role === 'barista' || user.role === 'staff' || user.role === 'cast') 
              ? <StaffView /> 
              : <Navigate to="/login" />
          } />
          <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" />} />
          
          <Route path="/admin" element={
            user && (user.role === 'admin' || user.role === 'cast') 
              ? <AdminLayout /> 
              : <Navigate to="/login" />
          }>
            <Route index element={<Dashboard />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="ingredients" element={<IngredientManagement />} />
            <Route path="expenses" element={<ExpenseManagement />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="orders" element={<OrderHistory />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: 'black',
              color: 'white',
              fontSize: '1.2rem',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              textAlign: 'center'
            }
          }}
        />
      </div>
    </Router>
  );
}
