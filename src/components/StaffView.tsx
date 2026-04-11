import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { toast } from 'sonner';
import { Order } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Coffee, Clock, LogOut, ShoppingCart, Home, User, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function StaffView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();

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
      const data = await pb.collection('orders').getFullList<Order>({
        filter: `created >= "${today}"`,
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

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
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
          onClick={() => window.location.href = '/'}
          className="p-2 bg-stone-800 rounded-xl text-orange-400 hover:text-orange-300 transition-colors"
        >
          <Home className="w-6 h-6 lg:w-8 lg:h-8" />
        </button>
        <button 
          onClick={() => window.location.href = '/'}
          className="p-3 hover:bg-stone-800 rounded-xl transition-colors"
        >
          <ShoppingCart className="w-6 h-6" />
        </button>
        <button className="p-3 bg-stone-800 rounded-xl transition-colors text-white">
          <User className="w-6 h-6" />
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
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-stone-800">Theo dõi đơn hàng (Nhân viên)</h1>
            <Badge variant="outline" className="border-stone-200 text-stone-600">
              {orders.length} Đơn hôm nay
            </Badge>
          </div>
          <div className="text-sm text-stone-500">
            {format(new Date(), 'HH:mm - dd/MM/yyyy')}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-hidden bg-stone-50/50">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 pb-8">
              <AnimatePresence mode="popLayout">
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="coffee-card border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="p-4 border-b border-stone-100 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold text-stone-800">Bàn {order.table_number}</CardTitle>
                          <div className="flex items-center gap-2 text-xs text-stone-400 mt-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(order.created), 'HH:mm')}
                          </div>
                        </div>
                        {getStatusBadge(order.status)}
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          {order.expand?.order_items_via_order?.map((item) => (
                            <div key={item.id} className="flex flex-col gap-1 p-2 bg-stone-100/50 rounded-lg border border-stone-100">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-stone-800 text-sm">{item.quantity}x</span>
                                    <span className="text-stone-700 truncate text-xs font-medium">{item.expand?.menu_item?.name}</span>
                                  </div>
                                  {item.notes && (
                                    <p className="text-[9px] text-orange-500 italic mt-0.5 truncate">Note: {item.notes}</p>
                                  )}
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[9px] px-1 py-0 h-4 shrink-0 ${
                                    item.status === 'ready' ? 'border-green-500 text-green-600 bg-green-50' : 
                                    item.status === 'preparing' ? 'border-blue-500 text-blue-600 bg-blue-50' : 
                                    'border-stone-200 text-stone-400'
                                  }`}
                                >
                                  {item.status === 'ready' ? 'Xong' : item.status === 'preparing' ? 'Đang pha' : 'Chờ'}
                                </Badge>
                              </div>
                              
                              {item.status !== 'ready' && (
                                <button
                                  onClick={() => updateItemStatus(item.id, item.status === 'preparing' ? 'ready' : 'preparing')}
                                  className={`w-full py-1 rounded text-[10px] font-bold transition-colors ${
                                    item.status === 'preparing' 
                                      ? 'bg-green-600 text-white hover:bg-green-700' 
                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                                >
                                  {item.status === 'preparing' ? 'Hoàn thành' : 'Pha chế'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {order.notes && order.notes.startsWith('Khách hàng:') && (
                          <div className="mt-4 pt-3 border-t border-stone-100 text-xs font-medium text-stone-500">
                            {order.notes}
                          </div>
                        )}
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
