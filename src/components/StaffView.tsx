import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
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
    <div className="flex h-screen bg-stone-50 text-stone-900 overflow-hidden">
      {/* Sidebar */}
      <div className="w-20 bg-stone-900 flex flex-col items-center py-6 space-y-8 text-stone-400">
        <button 
          onClick={() => navigate('/order')}
          className="p-2 bg-stone-800 rounded-xl text-orange-400 hover:text-orange-300 transition-colors"
        >
          <Home className="w-8 h-8" />
        </button>
        <button 
          onClick={() => navigate('/order')}
          className="p-3 hover:bg-stone-800 rounded-xl transition-colors"
        >
          <ShoppingCart className="w-6 h-6" />
        </button>
        <button className="p-3 bg-stone-800 rounded-xl transition-colors text-white">
          <User className="w-6 h-6" />
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

        <main className="flex-1 p-8 overflow-hidden bg-stone-50/50">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
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
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {order.expand?.order_items_via_order?.map((item) => (
                            <div key={item.id} className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-stone-800">{item.quantity}x</span>
                                  <span className="text-stone-600 truncate text-sm">{item.expand?.menu_item?.name}</span>
                                </div>
                                {item.notes && (
                                  <p className="text-[10px] text-orange-500 italic mt-0.5 truncate">Note: {item.notes}</p>
                                )}
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${
                                  item.status === 'ready' ? 'border-green-500 text-green-600 bg-green-50' : 
                                  item.status === 'preparing' ? 'border-blue-500 text-blue-600 bg-blue-50' : 
                                  'border-stone-200 text-stone-400'
                                }`}
                              >
                                {item.status === 'ready' ? 'Xong' : item.status === 'preparing' ? 'Đang pha' : 'Chờ'}
                              </Badge>
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
