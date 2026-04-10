import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import pb from '@/lib/pocketbase';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import OrderView from '@/components/OrderView';
import BaristaView from '@/components/BaristaView';
import AdminLayout from '@/components/AdminLayout';
import MenuManagement from '@/components/MenuManagement';
import ExpenseManagement from '@/components/ExpenseManagement';
import StaffManagement from '@/components/StaffManagement';
import OrderHistory from '@/components/OrderHistory';
import SetupInstructions from '@/components/SetupInstructions';
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
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          
          <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'barista' ? '/barista' : '/order'} /> : <Navigate to="/login" />} />
          
          <Route path="/order" element={user ? <OrderView /> : <Navigate to="/login" />} />
          
          <Route path="/barista" element={user ? <BaristaView /> : <Navigate to="/login" />} />
          
          <Route path="/admin" element={user?.role === 'admin' ? <AdminLayout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="expenses" element={<ExpenseManagement />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="orders" element={<OrderHistory />} />
            <Route path="settings" element={<SetupInstructions />} />
          </Route>
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}
