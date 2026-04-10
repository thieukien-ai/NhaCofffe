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

    // Automatic Seeding Logic for Google Sheets (or LocalStorage fallback)
    const autoSeed = async () => {
      try {
        // 1. Check if we already have categories
        const categories = await pb.collection('categories').getFullList();
        if (categories.length > 0) {
          console.log('Database already seeded.');
          return;
        }

        console.log('Starting automatic seed...');
        
        // 2. Create Categories
        const drinkCat = await pb.collection('categories').create({ id: 'cat_drinks', name: 'Đồ uống', icon: 'coffee' });
        const snackCat = await pb.collection('categories').create({ id: 'cat_snacks', name: 'Đồ ăn vặt', icon: 'cookie' });

        // 3. Create SA User
        try {
          await pb.collection('users').create({
            id: 'user_sa',
            username: 'SA',
            email: 'sa@pos.internal',
            password: '1',
            role: 'admin'
          });
          console.log('Default SA user created.');
        } catch (e) {
          console.log('SA user might already exist.');
        }

        // 4. Create 50 Drinks
        const drinkNames = ['Cà phê đen', 'Cà phê sữa', 'Bạc xỉu', 'Trà đào', 'Trà vải', 'Sữa chua', 'Sinh tố bơ', 'Nước ép cam', 'Trà sữa', 'Cacao'];
        for (let i = 0; i < 50; i++) {
          const name = drinkNames[i % drinkNames.length] + ` ${i + 1}`;
          const price = Math.floor(Math.random() * (50 - 15 + 1) + 15) * 1000;
          const cost_price = Math.floor(price * 0.4); // 40% cost
          await pb.collection('menu_items').create({
            id: `item_drink_${i}`,
            name: name,
            description: `Mô tả cho ${name}`,
            price: price,
            cost_price: cost_price,
            category: drinkCat.id,
            available: true
          });
        }

        // 5. Create 20 Snacks
        const snackNames = ['Hướng dương', 'Hạt điều', 'Khô gà', 'Bánh tráng', 'Cá viên chiên', 'Phô mai que'];
        for (let i = 0; i < 20; i++) {
          const name = snackNames[i % snackNames.length] + ` ${i + 1}`;
          const price = Math.floor(Math.random() * (50 - 15 + 1) + 15) * 1000;
          const cost_price = Math.floor(price * 0.5); // 50% cost
          await pb.collection('menu_items').create({
            id: `item_snack_${i}`,
            name: name,
            description: `Mô tả cho ${name}`,
            price: price,
            cost_price: cost_price,
            category: snackCat.id,
            available: true
          });
        }

        console.log('Google Sheets automatic seed completed!');
      } catch (error) {
        console.error('Auto-seed error:', error);
      }
    };

    autoSeed();

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
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<OrderView />} />
          
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
