import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { MenuItem, Category, Order, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Search, Plus, Minus, Trash2, Coffee, LogOut, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function OrderView() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [tableNumber, setTableNumber] = useState('1');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsData, catsData] = await Promise.all([
        pb.collection('menu_items').getFullList<MenuItem>({ sort: 'name', expand: 'category' }),
        pb.collection('categories').getFullList<Category>({ sort: 'name' })
      ]);
      setMenuItems(itemsData);
      setCategories(catsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      // If collections don't exist yet, we might get errors. 
      // In a real app, we'd handle this more gracefully.
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === itemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const totalAmount = cart.reduce((sum, i) => sum + i.item.price * i.quantity, 0);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    
    try {
      // 1. Create Order
      const orderData = {
        table_number: tableNumber,
        status: 'pending',
        total_amount: totalAmount,
        payment_status: 'unpaid',
        staff: pb.authStore.model?.id
      };
      
      const order = await pb.collection('orders').create(orderData);
      
      // 2. Create Order Items
      await Promise.all(cart.map(i => 
        pb.collection('order_items').create({
          order: order.id,
          menu_item: i.item.id,
          quantity: i.quantity,
          price_at_order: i.item.price
        })
      ));
      
      toast.success('Đặt món thành công!');
      setCart([]);
    } catch (error) {
      toast.error('Lỗi khi đặt món');
      console.error(error);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory && item.available;
  });

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-stone-100 overflow-hidden">
      {/* Sidebar / Navigation */}
      <div className="w-20 bg-stone-800 flex flex-col items-center py-6 space-y-8 text-stone-400">
        <div className="p-2 bg-stone-700 rounded-xl text-stone-50">
          <Coffee className="w-8 h-8" />
        </div>
        <button className="p-3 hover:bg-stone-700 rounded-xl transition-colors text-stone-50">
          <ShoppingCart className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigate('/barista')}
          className="p-3 hover:bg-stone-700 rounded-xl transition-colors"
        >
          <ClipboardList className="w-6 h-6" />
        </button>
        <div className="mt-auto">
          <button 
            onClick={handleLogout}
            className="p-3 hover:bg-red-900/30 hover:text-red-400 rounded-xl transition-colors"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-xl font-bold text-stone-800">Thực đơn</h1>
          <div className="flex items-center space-x-4 w-1/2 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input 
                placeholder="Tìm kiếm món nước..." 
                className="pl-10 bg-stone-50 border-stone-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-sm font-medium text-stone-500">Bàn:</span>
              <Input 
                type="number" 
                className="w-16 h-9 text-center" 
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Menu Grid */}
        <main className="flex-1 overflow-hidden flex flex-col p-6">
          <Tabs defaultValue="all" className="w-full mb-6" onValueChange={setActiveCategory}>
            <TabsList className="bg-stone-200/50 p-1">
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              {categories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <ScrollArea className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
              {filteredItems.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -4 }}
                >
                  <Card 
                    className="overflow-hidden border-stone-200 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => addToCart(item)}
                  >
                    <div className="aspect-video bg-stone-200 relative overflow-hidden">
                      {item.image ? (
                        <img 
                          src={pb.files.getUrl(item, item.image)} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">
                          <Coffee className="w-12 h-12" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-stone-800/80 backdrop-blur-sm text-white border-none">
                          {item.price.toLocaleString('vi-VN')}đ
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-stone-800 truncate">{item.name}</h3>
                      <p className="text-xs text-stone-500 line-clamp-2 mt-1">{item.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {filteredItems.length === 0 && !loading && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-stone-400">
                  <Coffee className="w-16 h-16 mb-4 opacity-20" />
                  <p>Không tìm thấy món nào</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>

      {/* Cart Sidebar */}
      <aside className="w-96 bg-white border-l border-stone-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Giỏ hàng
          </h2>
          <Badge variant="secondary" className="bg-stone-100 text-stone-600">
            {cart.reduce((s, i) => s + i.quantity, 0)} món
          </Badge>
        </div>

        <ScrollArea className="flex-1 p-6">
          <AnimatePresence mode="popLayout">
            {cart.map(({ item, quantity }) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4 mb-4 p-3 bg-stone-50 rounded-xl group"
              >
                <div className="w-12 h-12 rounded-lg bg-stone-200 overflow-hidden shrink-0">
                  {item.image ? (
                    <img src={pb.files.getUrl(item, item.image)} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400"><Coffee className="w-6 h-6" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-stone-800 truncate">{item.name}</h4>
                  <p className="text-xs text-stone-500">{(item.price * quantity).toLocaleString('vi-VN')}đ</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 rounded-full border-stone-300"
                    onClick={() => updateQuantity(item.id, -1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-sm font-bold w-4 text-center">{quantity}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 rounded-full border-stone-300"
                    onClick={() => updateQuantity(item.id, 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-stone-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400">
              <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Giỏ hàng trống</p>
            </div>
          )}
        </ScrollArea>

        <div className="p-6 bg-stone-50 border-t border-stone-200 space-y-4">
          <div className="flex justify-between items-center text-stone-500 text-sm">
            <span>Tạm tính</span>
            <span>{totalAmount.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between items-center font-bold text-lg text-stone-800">
            <span>Tổng cộng</span>
            <span>{totalAmount.toLocaleString('vi-VN')}đ</span>
          </div>
          <Button 
            className="w-full h-12 bg-stone-800 hover:bg-stone-700 text-stone-50 text-lg font-bold rounded-xl"
            disabled={cart.length === 0}
            onClick={handleSubmitOrder}
          >
            Xác nhận Order
          </Button>
        </div>
      </aside>
    </div>
  );
}
