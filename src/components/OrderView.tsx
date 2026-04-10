import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { MenuItem, Category, Order, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Search, Plus, Minus, Trash2, Coffee, LogIn, LogOut, ClipboardList, User as UserIcon, CheckCircle, TrendingUp } from 'lucide-react';
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
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [myOrder, setMyOrder] = useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();
  const user = pb.authStore.model;

  useEffect(() => {
    fetchData();
    const savedOrder = localStorage.getItem('last_order');
    if (savedOrder) {
      setMyOrder(JSON.parse(savedOrder));
    }
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
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    if (myOrder) {
      toast.error('Bạn đã xác nhận đơn hàng, không thể chỉnh sửa thêm.');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    if (myOrder) return;
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    if (myOrder) return;
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
    if (!customerName.trim()) {
      toast.error('Vui lòng nhập tên của bạn');
      return;
    }
    
    try {
      const orderData = {
        table_number: tableNumber,
        status: 'pending',
        total_amount: totalAmount,
        payment_status: 'unpaid',
        staff: user?.id || null,
        notes: `Khách hàng: ${customerName}`
      };
      
      const order = await pb.collection('orders').create(orderData);
      
      await Promise.all(cart.map(i => 
        pb.collection('order_items').create({
          order: order.id,
          menu_item: i.item.id,
          quantity: i.quantity,
          price_at_order: i.item.price
        })
      ));
      
      const orderInfo = { id: order.id, name: customerName };
      localStorage.setItem('last_order', JSON.stringify(orderInfo));
      setMyOrder(orderInfo);
      
      toast.success('Đặt món thành công!');
    } catch (error) {
      toast.error('Lỗi khi đặt món');
      console.error(error);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    window.location.reload();
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory && item.available;
  });

  return (
    <div className="flex h-screen bg-secondary overflow-hidden">
      {/* Sidebar / Navigation */}
      <div className="w-20 bg-primary flex flex-col items-center py-6 space-y-8 text-white/60">
        <div className="p-3 bg-white/10 rounded-2xl text-white">
          <Coffee className="w-8 h-8" />
        </div>
        <button className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white">
          <ShoppingCart className="w-6 h-6" />
        </button>
        {user && (
          <button 
            onClick={() => navigate('/barista')}
            className="p-3 hover:bg-white/10 rounded-2xl transition-all"
          >
            <ClipboardList className="w-6 h-6" />
          </button>
        )}
        {user?.username === 'SA' && (
          <button 
            onClick={() => navigate('/admin')}
            className="p-3 hover:bg-white/10 rounded-2xl transition-all"
          >
            <TrendingUp className="w-6 h-6" />
          </button>
        )}
        <div className="mt-auto">
          {user ? (
            <button 
              onClick={handleLogout}
              className="p-3 hover:bg-red-500/20 hover:text-red-400 rounded-2xl transition-all"
            >
              <LogOut className="w-6 h-6" />
            </button>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white"
            >
              <LogIn className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-stone-100 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-2xl font-serif text-primary">Thực đơn</h1>
          <div className="flex items-center space-x-4 w-1/2 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input 
                placeholder="Tìm kiếm món ngon..." 
                className="pl-12 h-11 bg-secondary/50 border-none rounded-2xl focus:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Menu Grid */}
        <main className="flex-1 overflow-hidden flex flex-col p-6">
          {myOrder && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-800">Đơn hàng của bạn đã được xác nhận!</p>
                  <p className="text-xs text-green-600">Mã đơn: #{myOrder.id.slice(-6)} | Tên: {myOrder.name}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-green-200 text-green-700 hover:bg-green-100"
                onClick={() => {
                  localStorage.removeItem('last_order');
                  setMyOrder(null);
                  setCart([]);
                }}
              >
                Đặt đơn mới
              </Button>
            </div>
          )}

          <Tabs defaultValue="all" className="w-full mb-8" onValueChange={setActiveCategory}>
            <TabsList className="bg-secondary p-1.5 rounded-2xl h-auto">
              <TabsTrigger value="all" className="rounded-xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Tất cả</TabsTrigger>
              {categories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id} className="rounded-xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                  {cat.name}
                </TabsTrigger>
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
                    className={`coffee-card overflow-hidden ${myOrder ? 'opacity-50 grayscale' : ''}`}
                    onClick={() => addToCart(item)}
                  >
                    <div className="aspect-square bg-stone-100 relative overflow-hidden">
                      {item.image ? (
                        <img 
                          src={pb.files.getUrl(item, item.image)} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                          <Coffee className="w-16 h-16" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-white/90 backdrop-blur-md text-primary font-bold border-none shadow-sm">
                          {item.price.toLocaleString('vi-VN')}đ
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-lg font-serif text-ink truncate">{item.name}</h3>
                      <p className="text-xs text-stone-400 line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
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
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="customerName" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> Tên khách hàng
              </Label>
              <Input 
                id="customerName" 
                placeholder="Nhập tên của bạn..." 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={!!myOrder}
                className="border-stone-200 focus:ring-stone-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tableNum">Số bàn</Label>
              <Input 
                id="tableNum" 
                type="number" 
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                disabled={!!myOrder}
                className="border-stone-200 focus:ring-stone-500"
              />
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {cart.map(({ item, quantity }) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4 mb-4 p-3 bg-stone-50 rounded-xl group"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-stone-800 truncate">{item.name}</h4>
                  <p className="text-xs text-stone-500">{(item.price * quantity).toLocaleString('vi-VN')}đ</p>
                </div>
                <div className="flex items-center gap-2">
                  {!myOrder && (
                    <>
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQuantity(item.id, -1)}><Minus className="w-3 h-3" /></Button>
                      <span className="text-sm font-bold w-4 text-center">{quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQuantity(item.id, 1)}><Plus className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-400 hover:text-red-500" onClick={() => removeFromCart(item.id)}><Trash2 className="w-3 h-3" /></Button>
                    </>
                  )}
                  {myOrder && <span className="text-sm font-bold">x{quantity}</span>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>

        <div className="p-6 bg-stone-50 border-t border-stone-200 space-y-4">
          <div className="flex justify-between items-center font-bold text-lg text-stone-800">
            <span>Tổng cộng</span>
            <span>{totalAmount.toLocaleString('vi-VN')}đ</span>
          </div>
          {!myOrder ? (
            <Button 
              className="w-full h-12 bg-stone-800 hover:bg-stone-700 text-stone-50 text-lg font-bold rounded-xl"
              disabled={cart.length === 0}
              onClick={handleSubmitOrder}
            >
              Xác nhận Order
            </Button>
          ) : (
            <div className="text-center p-3 bg-stone-200 rounded-xl text-stone-600 font-medium">
              Đơn hàng đã xác nhận
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
