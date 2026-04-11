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
import IngredientManagement from '@/components/IngredientManagement';
import StaffView from '@/components/StaffView';
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
          console.log('Database already has categories. Checking for menu items...');
          const items = await pb.collection('menu_items').getFullList();
          if (items.length > 0) {
            console.log('Database already seeded.');
            return;
          }
        }

        console.log('Starting automatic seed to real database...');
        
        // 2. Create Categories
        const drinkCat = await pb.collection('categories').create({ id: 'cat_drinks', name: 'Đồ uống', icon: 'coffee' });
        const snackCat = await pb.collection('categories').create({ id: 'cat_snacks', name: 'Đồ ăn vặt', icon: 'cookie' });
        const mainCat = await pb.collection('categories').create({ id: 'cat_main', name: 'Món chính', icon: 'utensils' });
        const sideCat = await pb.collection('categories').create({ id: 'cat_side', name: 'Món kèm', icon: 'plus-circle' });
        const starterCat = await pb.collection('categories').create({ id: 'cat_starter', name: 'Khai vị', icon: 'soup' });

        // 3. Create SA User
        // ... (existing code)
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

        // 4. Create Items for each category
        const seedCategory = async (catId: string, names: string[], prefix: string, count: number) => {
          for (let i = 0; i < count; i++) {
            const name = names[i % names.length] + ` ${i + 1}`;
            const price = Math.floor(Math.random() * (150 - 20 + 1) + 20) * 1000;
            const cost_price = Math.floor(price * 0.4);
            await pb.collection('menu_items').create({
              name: name,
              description: `Mô tả cho ${name}`,
              price: price,
              cost_price: cost_price,
              category: catId,
              available: true
            });
          }
        };

        await seedCategory(drinkCat.id, ['Cà phê đen', 'Cà phê sữa', 'Bạc xỉu', 'Trà đào', 'Trà vải'], 'drink', 30);
        await seedCategory(snackCat.id, ['Hướng dương', 'Hạt điều', 'Khô gà', 'Bánh tráng'], 'snack', 20);
        await seedCategory(mainCat.id, ['Cơm chiên', 'Mì xào', 'Bún bò', 'Phở bò'], 'main', 15);
        await seedCategory(sideCat.id, ['Trứng ốp la', 'Xúc xích', 'Chả giò'], 'side', 10);
        await seedCategory(starterCat.id, ['Súp cua', 'Gỏi cuốn', 'Khoai tây chiên'], 'starter', 10);

        console.log('Google Sheets automatic seed completed!');

        // 6. Create Fake Orders and Items for testing
        const tables = [1, 2, 3, 4, 5];
        for (const tableNum of tables) {
          const order = await pb.collection('orders').create({
            table_number: tableNum,
            status: 'preparing',
            total_amount: 0,
            payment_status: 'unpaid'
          });

          let total = 0;
          const itemsToCreate = Math.floor(Math.random() * 3) + 1;
          const allItems = await pb.collection('menu_items').getFullList() as any[];
          
          for (let j = 0; j < itemsToCreate; j++) {
            const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
            const qty = Math.floor(Math.random() * 2) + 1;
            await pb.collection('order_items').create({
              order: order.id,
              menu_item: randomItem.id,
              quantity: qty,
              price_at_order: randomItem.price,
              status: 'preparing'
            });
            total += randomItem.price * qty;
          }
          await pb.collection('orders').update(order.id, { total_amount: total });
        }

        // 7. Create Fake Expenses
        const expenseTypes = ['utility', 'salary', 'other'];
        for (let i = 0; i < 5; i++) {
          await pb.collection('expenses').create({
            type: expenseTypes[i % expenseTypes.length],
            amount: (Math.floor(Math.random() * 10) + 5) * 100000,
            description: `Chi phí mẫu ${i + 1}`,
            date: new Date().toISOString()
          });
        }

        // 8. Create Fake Ingredient Imports
        const ingredients = ['Hạt cà phê Arabica', 'Sữa đặc', 'Đường', 'Trà đen', 'Bột cacao'];
        for (let i = 0; i < 5; i++) {
          await pb.collection('ingredient_imports').create({
            name: ingredients[i % ingredients.length],
            quantity: Math.floor(Math.random() * 20) + 5,
            unit: 'kg',
            price: (Math.floor(Math.random() * 20) + 10) * 10000,
            supplier: 'Nhà cung cấp ABC',
            date: new Date().toISOString()
          });
        }
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
          <Route path="/staff" element={user ? <StaffView /> : <Navigate to="/login" />} />
          
          <Route path="/admin" element={user?.role === 'admin' ? <AdminLayout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="ingredients" element={<IngredientManagement />} />
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
