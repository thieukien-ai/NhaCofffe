import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { Order, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Coffee, CheckCircle2, Clock, ChevronRight, LogOut, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function BaristaView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();

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

  const fetchOrders = async () => {
    try {
      const data = await pb.collection('orders').getFullList<Order>({
        filter: 'status != "completed" && status != "cancelled"',
        sort: '-created',
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

  const updateStatus = async (orderId: string, status: Order['status']) => {
    try {
      await pb.collection('orders').update(orderId, { status });
      toast.success(`Đã cập nhật trạng thái: ${status}`);
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-stone-900 text-stone-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-20 bg-stone-950 flex flex-col items-center py-6 space-y-8 text-stone-500">
        <div className="p-2 bg-stone-800 rounded-xl text-orange-400">
          <Coffee className="w-8 h-8" />
        </div>
        <button 
          onClick={() => navigate('/order')}
          className="p-3 hover:bg-stone-800 rounded-xl transition-colors"
        >
          <ShoppingCart className="w-6 h-6" />
        </button>
        <button className="p-3 bg-stone-800 rounded-xl transition-colors text-stone-50">
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
        <header className="h-16 bg-stone-950 border-b border-stone-800 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Khu vực Pha chế</h1>
            <Badge variant="outline" className="border-orange-500/50 text-orange-400 bg-orange-500/10">
              {orders.length} Đơn đang chờ
            </Badge>
          </div>
          <div className="text-sm text-stone-400">
            {format(new Date(), 'HH:mm - dd/MM/yyyy')}
          </div>
        </header>

        <main className="flex-1 p-8 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
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
                      <CardHeader className="p-4 border-b border-stone-700 flex flex-row items-center justify-between bg-stone-800/50">
                        <div>
                          <CardTitle className="text-lg text-stone-100">Bàn {order.table_number}</CardTitle>
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-2 text-xs text-stone-400">
                              <Clock className="w-3 h-3" />
                              {format(new Date(order.created), 'HH:mm')}
                            </div>
                            {order.notes && order.notes.startsWith('Khách hàng:') && (
                              <div className="text-xs font-bold text-orange-400">
                                {order.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge 
                          className={
                            order.status === 'pending' ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' :
                            'bg-blue-500/20 text-blue-500 border-blue-500/50'
                          }
                        >
                          {order.status === 'pending' ? 'Chờ xử lý' : 'Đang pha'}
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-4">
                        <ul className="space-y-3">
                          {order.expand?.order_items_via_order?.map((item) => (
                            <li key={item.id} className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <span className="font-bold text-stone-100">{item.quantity}x</span>
                                <span className="ml-2 text-stone-300">{item.expand?.menu_item?.name}</span>
                                {item.notes && (
                                  <p className="text-xs text-orange-400 italic mt-0.5">Note: {item.notes}</p>
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
