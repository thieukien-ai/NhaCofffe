import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { toast } from 'sonner';
import { Order } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Coffee, Clock, LogOut, ShoppingCart, Home, User, CheckCircle2, RefreshCw, Settings, Maximize, Minimize } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function StaffView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const navigate = useNavigate();

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        toast.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  useEffect(() => {
    fetchOrders();

    // Quick guide for staff
    const timer = setTimeout(() => {
      toast.info('Giao diện phục vụ', {
        description: 'Theo dõi trạng thái món và đánh dấu "Đã phục vụ" khi mang ra bàn.',
        duration: 5000,
      });
    }, 2000);

    // Subscribe to real-time updates
    const unsubscribe = pb.collection('orders').subscribe('*', (e) => {
      fetchOrders();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      // Filter for today's orders
      const today = startOfDay(new Date()).toISOString();
      const user = pb.authStore.model;
      
      let data = await pb.collection('orders').getFullList<Order>({
        filter: `created >= "${today}"`,
        sort: '-created, table_number',
        expand: 'order_items_via_order.menu_item'
      });

      // Role-based filtering for staff
      if (user?.role === 'staff') {
        data = data.filter(order => 
          order.expand?.order_items_via_order?.some(item => item.status === 'ready')
        );
      }

      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribeQueue = (pb as any).onQueueChange((count: number) => {
      setQueueCount(count);
    });
    return () => unsubscribeQueue();
  }, []);

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const synced = await (pb as any).sync();
      if (synced) {
        toast.success('Đã đồng bộ dữ liệu thành công!');
      } else {
        toast.info('Dữ liệu đã được đồng bộ.');
      }
    } catch (e) {
      toast.error('Lỗi khi đồng bộ dữ liệu');
    } finally {
      setIsSyncing(false);
    }
  };

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    try {
      await pb.collection('order_items').update(itemId, { status: newStatus });
      toast.success(`Đã cập nhật trạng thái: ${newStatus === 'preparing' ? 'Đang pha' : 'Xong'}`);
      fetchOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/50">Chờ xử lý</Badge>;
      case 'preparing': return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/50">Đang pha</Badge>;
      case 'completed': return <Badge className="bg-green-500/20 text-green-500 border-green-500/50">Hoàn thành</Badge>;
      case 'cancelled': return <Badge className="bg-red-500/20 text-red-500 border-red-500/50">Đã hủy</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-stone-50 text-stone-900 overflow-hidden">
      {/* Sidebar - Desktop: Side, Mobile: Bottom */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-stone-900 flex lg:flex-col items-center justify-around lg:justify-start lg:static lg:w-20 lg:h-full lg:py-6 lg:space-y-8 text-stone-400 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] lg:shadow-none">
        <button 
          onClick={() => navigate('/')}
          className="p-2 bg-stone-800 rounded-xl text-orange-400 hover:text-orange-300 transition-colors"
        >
          <Home className="w-6 h-6 lg:w-8 lg:h-8" />
        </button>
        <button 
          onClick={() => navigate('/')}
          className="p-3 hover:bg-stone-800 rounded-xl transition-colors"
        >
          <ShoppingCart className="w-6 h-6" />
        </button>
        <button className="p-3 bg-stone-800 rounded-xl transition-colors text-white">
          <User className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigate('/settings')}
          className="p-3 hover:bg-stone-800 rounded-xl transition-colors text-stone-500"
        >
          <Settings className="w-6 h-6" />
        </button>
        <button 
          onClick={toggleFullScreen}
          className="p-3 hover:bg-stone-800 rounded-xl transition-colors text-stone-500"
          title="Toàn màn hình"
        >
          {isFullScreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
        </button>
        <div className="lg:mt-auto">
          <button 
            onClick={handleLogout}
            className="p-3 hover:bg-red-900/30 hover:text-red-400 rounded-xl transition-colors"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0">
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="text-lg sm:text-xl font-bold text-stone-800 truncate">Phục vụ</h1>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSync}
              className={`relative ${isSyncing ? 'animate-spin' : ''}`}
              title="Đồng bộ ngay"
            >
              <RefreshCw className="w-4 h-4 text-stone-400" />
              {queueCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {queueCount}
                </span>
              )}
            </Button>
            <Badge variant="outline" className="hidden sm:flex border-stone-200 text-stone-600">
              {orders.length} Đơn
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <div className="text-xs text-stone-800 font-bold">{pb.authStore.model?.username}</div>
              <div className="text-[10px] text-stone-500 uppercase tracking-wider">{pb.authStore.model?.role}</div>
            </div>
            <div className="text-xs sm:text-sm text-stone-500">
              {format(new Date(), 'HH:mm')}
            </div>
          </div>
        </header>

        <main className="flex-1 p-2 sm:p-4 overflow-hidden bg-stone-50/50">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-2 sm:gap-3 pb-8">
              <AnimatePresence mode="popLayout">
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="coffee-card border-stone-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <CardHeader className="p-2 border-b border-stone-100 flex flex-row items-center justify-between bg-stone-50/50">
                        <div>
                          <CardTitle className="text-sm font-bold text-stone-800">Bàn {order.table_number}</CardTitle>
                          <div className="flex items-center gap-1 text-[8px] text-stone-400 mt-0.5">
                            <Clock className="w-2 h-2" />
                            {format(new Date(order.created), 'HH:mm')}
                          </div>
                        </div>
                        <div className="scale-50 origin-right">
                          {getStatusBadge(order.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="p-1.5">
                        <div className="space-y-1">
                          {order.expand?.order_items_via_order?.map((item) => (
                            <div key={item.id} className="flex flex-col gap-0.5 p-1 bg-white rounded border border-stone-100 shadow-sm">
                              <div className="flex justify-between items-start gap-1">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-stone-900 text-[10px]">{item.quantity}x</span>
                                    <span className="text-stone-800 truncate text-[10px] font-semibold">{item.expand?.menu_item?.name}</span>
                                  </div>
                                  {item.notes && (
                                    <p className="text-[7px] text-orange-600 font-medium italic mt-0.5 truncate bg-orange-50 px-0.5 rounded">N: {item.notes}</p>
                                  )}
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[7px] px-0.5 py-0 h-3 shrink-0 font-bold ${
                                    item.status === 'ready' ? 'border-green-500 text-green-600 bg-green-50' : 
                                    item.status === 'preparing' ? 'border-blue-500 text-blue-600 bg-blue-50' : 
                                    'border-stone-200 text-stone-400'
                                  }`}
                                >
                                  {item.status === 'ready' ? 'Xong' : item.status === 'preparing' ? 'Pha' : 'Chờ'}
                                </Badge>
                              </div>
                              
                              {item.status !== 'ready' && (
                                <button
                                  onClick={() => updateItemStatus(item.id, item.status === 'preparing' ? 'ready' : 'preparing')}
                                  className={`w-full py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                                    item.status === 'preparing' 
                                      ? 'bg-green-600 text-white hover:bg-green-700' 
                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                                >
                                  {item.status === 'preparing' ? 'Xong' : 'Pha'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              {orders.length === 0 && !loading && (
                <div className="col-span-full flex flex-col items-center justify-center py-32 text-stone-300">
                  <Coffee className="w-20 h-20 mb-4 opacity-20" />
                  <p className="text-xl font-medium">Chưa có đơn hàng nào trong hôm nay</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
