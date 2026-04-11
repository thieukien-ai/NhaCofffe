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
import { ShoppingCart, Search, Plus, Minus, Trash2, Coffee, LogIn, LogOut, ClipboardList, User as UserIcon, CheckCircle, TrendingUp, Home, User } from 'lucide-react';
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
  const [showCart, setShowCart] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
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
      // Use batchRead for faster initial load if supported by the DB service
      let itemsData: MenuItem[] = [];
      let catsData: Category[] = [];

      if (typeof (pb as any).batchRead === 'function') {
        const batch = await (pb as any).batchRead(['menu_items', 'categories']);
        itemsData = batch.menu_items || [];
        catsData = batch.categories || [];
      } else {
        const [items, cats] = await Promise.all([
          pb.collection('menu_items').getFullList<MenuItem>({ sort: 'name', expand: 'category' }),
          pb.collection('categories').getFullList<Category>({ sort: 'name' })
        ]);
        itemsData = items;
        catsData = cats;
      }
      
      // Filter out duplicates by ID just in case
      const uniqueItems = itemsData.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      
      setMenuItems(uniqueItems);
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

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeCategory]);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-secondary overflow-hidden">
      {/* Sidebar / Navigation - Desktop: Side, Mobile: Bottom */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-primary flex lg:flex-col items-center justify-around lg:justify-start lg:static lg:w-20 lg:h-full lg:py-6 lg:space-y-8 text-white/60 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] lg:shadow-none">
        <button 
          onClick={() => navigate('/')}
          className="p-3 bg-white/10 rounded-2xl text-white hover:bg-white/20 transition-all"
        >
          <Home className="w-6 h-6 lg:w-8 lg:h-8" />
        </button>
        <button 
          onClick={() => setShowCart(!showCart)}
          className={`p-3 rounded-2xl transition-all ${showCart ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/60'}`}
        >
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
        {user && (
          <button 
            onClick={() => navigate('/staff')}
            className="p-3 hover:bg-white/10 rounded-2xl transition-all"
          >
            <User className="w-6 h-6" />
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
        <div className="lg:mt-auto">
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
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0">
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
        <main className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6">
          {myOrder && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-between shrink-0">
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

          <div className="w-full mb-8 overflow-x-auto pb-4 scrollbar-hide shrink-0">
            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveCategory}>
              <TabsList className="bg-secondary p-2 rounded-2xl h-auto inline-flex whitespace-nowrap gap-2">
                <TabsTrigger 
                  value="all" 
                  className="rounded-xl px-8 py-3 text-base font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all"
                >
                  Tất cả
                </TabsTrigger>
                {categories.map(cat => (
                  <TabsTrigger 
                    key={cat.id} 
                    value={cat.id} 
                    className="rounded-xl px-8 py-3 text-base font-medium data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all"
                  >
                    {cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 relative min-h-0">
            <ScrollArea className="absolute inset-0 -mx-4 sm:-mx-6 px-4 sm:px-6">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 pb-6">
                {paginatedItems.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card 
                      className={`coffee-card overflow-hidden cursor-pointer h-full ${myOrder ? 'opacity-50 grayscale' : ''}`}
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
                      <CardContent className="p-4 sm:p-5">
                        <h3 className="text-sm sm:text-lg font-serif text-ink truncate">{item.name}</h3>
                        <p className="text-[10px] sm:text-xs text-stone-400 line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4 pb-12">
                  <Button 
                    variant="outline" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="rounded-xl h-10 px-6"
                  >
                    Trước
                  </Button>
                  <span className="text-sm font-medium text-stone-500">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="rounded-xl h-10 px-6"
                  >
                    Sau
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>
        </main>
      </div>

      {/* Cart Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-stone-200 flex flex-col shrink-0 transition-transform duration-300 ${showCart ? 'translate-x-0' : 'translate-x-full'} lg:relative lg:translate-x-0 ${!showCart ? 'lg:hidden' : 'lg:flex'}`}>
        <div className="p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Giỏ hàng
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-stone-100 text-stone-600">
              {cart.reduce((s, i) => s + i.quantity, 0)} món
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => setShowCart(false)}>
              <Minus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 border-b border-stone-200 space-y-4 shrink-0 bg-white">
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
              className="border-stone-200 focus:ring-stone-500 rounded-xl"
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
              className="border-stone-200 focus:ring-stone-500 rounded-xl"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 relative bg-white">
          <ScrollArea className="h-full">
            <div className="p-6">
              <AnimatePresence mode="popLayout">
                {cart.map(({ item, quantity }) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-4 mb-4 p-3 bg-stone-50 rounded-xl group border border-stone-100"
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
                {cart.length === 0 && (
                  <div className="text-center py-12 text-stone-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Giỏ hàng trống</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>

        <div className="p-6 bg-white border-t border-stone-200 space-y-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
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
