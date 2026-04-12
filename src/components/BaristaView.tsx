import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { Order, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Coffee, CheckCircle2, Clock, ChevronRight, LogOut, ShoppingCart, Home, RefreshCw, Settings, Maximize, Minimize } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function BaristaView() {
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

    // Quick guide for barista
    const timer = setTimeout(() => {
      toast.info('Giao diện pha chế', {
        description: 'Bấm "Pha" để bắt đầu và "Xong" khi hoàn thành món.',
        duration: 5000,
      });
    }, 2000);

    // Subscribe to real-time updates
    pb.collection('orders').subscribe('*', (e) => {
      if (e.action === 'create') {
        // Fetch full order with expansion
        fetchOrder(e.record.id).then(newOrder => {
          if (newOrder) setOrders(prev => [newOrder, ...prev]);
        });
        toast.info('Có đơn hàng mới!');
      } else if (e.action === 'update') {
        setOrders(prev => prev.map(o => o.id === e.record.id ? { ...o, ...e.record } : o));
      } else if (e.action === 'delete') {
        setOrders(prev => prev.filter(o => o.id !== e.record.id));
      }
    }, { expand: 'order_items_via_order.menu_item' });

    return () => {
      pb.collection('orders').unsubscribe('*');
    };
  }, []);

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

  const fetchOrders = async () => {
    try {
      const data = await pb.collection('orders').getFullList<Order>({
        filter: 'status != "completed" && status != "cancelled"',
        sort: '-created, table_number',
        expand: 'order_items_via_order.menu_item'
      });
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrder = async (id: string) => {
    try {
      return await pb.collection('orders').getOne<Order>(id, {
        expand: 'order_items_via_order.menu_item'
      });
    } catch (error) {
      return null;
    }
  };

  const updateItemStatus = async (itemId: string, status: OrderItem['status']) => {
    // Optimistic update
    setOrders(prev => prev.map(order => ({
      ...order,
      expand: {
        ...order.expand,
        order_items_via_order: order.expand?.order_items_via_order?.map(item => 
          item.id === itemId ? { ...item, status } : item
        )
      }
    })));

    try {
      await pb.collection('order_items').update(itemId, { status });
      toast.success('Đã cập nhật trạng thái món');
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái món');
      fetchOrders(); // Revert on error
    }
  };

  const updateStatus = async (orderId: string, status: Order['status']) => {
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));

    try {
      await pb.collection('orders').update(orderId, { status });
      if (status === 'completed') {
        const order = orders.find(o => o.id === orderId);
        if (order?.expand?.order_items_via_order) {
          await Promise.all(order.expand.order_items_via_order.map(item => 
            pb.collection('order_items').update(item.id, { status: 'ready' })
          ));
        }
      }
      toast.success(`Đã cập nhật trạng thái: ${status}`);
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái');
      fetchOrders(); // Revert on error
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

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-stone-900 text-stone-100 overflow-hidden">
      {/* Sidebar - Desktop: Side, Mobile: Bottom */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-stone-950 flex lg:flex-col items-center justify-around lg:justify-start lg:static lg:w-20 lg:h-full lg:py-6 lg:space-y-8 text-stone-500 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.3)] lg:shadow-none">
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
        <button className="p-3 bg-stone-800 rounded-xl transition-colors text-stone-50">
          <ClipboardList className="w-6 h-6" />
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
        <header className="h-16 bg-stone-950 border-b border-stone-800 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="text-lg sm:text-xl font-bold truncate">Pha chế</h1>
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
            <Badge variant="outline" className="hidden sm:flex border-orange-500/50 text-orange-400 bg-orange-500/10">
              {orders.length} Đơn
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <div className="text-xs text-stone-300 font-bold">{pb.authStore.model?.username}</div>
              <div className="text-[10px] text-stone-500 uppercase tracking-wider">{pb.authStore.model?.role}</div>
            </div>
            <div className="text-xs sm:text-sm text-stone-400">
              {format(new Date(), 'HH:mm')}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 pb-8">
              <AnimatePresence mode="popLayout">
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="bg-stone-800 border-stone-700 shadow-xl overflow-hidden">
                      <CardHeader className="p-3 border-b border-stone-700 flex flex-row items-center justify-between bg-stone-800/50">
                        <div>
                          <CardTitle className="text-base text-stone-100">Bàn {order.table_number}</CardTitle>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-1 text-[10px] text-stone-400">
                              <Clock className="w-2.5 h-2.5" />
                              {format(new Date(order.created), 'HH:mm')}
                            </div>
                            {order.notes && order.notes.startsWith('Khách hàng:') && (
                              <div className="text-[10px] font-bold text-orange-400 truncate max-w-[100px]">
                                {order.notes.replace('Khách hàng: ', '')}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge 
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-5",
                            order.status === 'pending' ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' :
                            'bg-blue-500/20 text-blue-500 border-blue-500/50'
                          )}
                        >
                          {order.status === 'pending' ? 'Chờ' : 'Pha'}
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-4">
                        <ul className="space-y-2">
                          {order.expand?.order_items_via_order?.map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-stone-900/40 border border-stone-700/50">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-stone-100">{item.quantity}x</span>
                                  <span className="text-stone-300 text-sm truncate">{item.expand?.menu_item?.name}</span>
                                </div>
                                {item.notes && (
                                  <p className="text-[10px] text-orange-400 italic truncate">Note: {item.notes}</p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0">
                                {item.status === 'ready' ? (
                                  <Badge variant="outline" className="border-green-500 text-green-500 bg-green-500/10 text-[10px] px-1.5 py-0 h-5">Xong</Badge>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="secondary"
                                    className={cn(
                                      "h-7 px-2 text-[10px] font-bold uppercase tracking-wider",
                                      item.status === 'preparing' 
                                        ? "bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/30" 
                                        : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-600/30"
                                    )}
                                    onClick={() => updateItemStatus(item.id, item.status === 'preparing' ? 'ready' : 'preparing')}
                                  >
                                    {item.status === 'preparing' ? 'Xong' : 'Pha'}
                                  </Button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter className="p-4 bg-stone-900/50 flex gap-2">
                        {order.status === 'pending' ? (
                          <Button 
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                            onClick={() => updateStatus(order.id, 'preparing')}
                          >
                            Bắt đầu pha
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        ) : (
                          <Button 
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white"
                            onClick={() => updateStatus(order.id, 'completed')}
                          >
                            Hoàn thành
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              {orders.length === 0 && !loading && (
                <div className="col-span-full flex flex-col items-center justify-center py-32 text-stone-600">
                  <Coffee className="w-20 h-20 mb-4 opacity-10" />
                  <p className="text-xl font-medium">Hiện không có đơn hàng nào</p>
                  <p className="text-sm opacity-50">Nghỉ ngơi một chút nhé!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}


function ClipboardList(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  )
}
