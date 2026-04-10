import { useState, useEffect, useRef } from 'react';
import pb from '@/lib/pocketbase';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Printer, Search, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { Input } from '@/components/ui/input';

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await pb.collection('orders').getFullList<Order>({
        sort: '-created',
        expand: 'order_items_via_order.menu_item'
      });
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Hoa-don-${selectedOrder?.id}`,
  });

  const filteredOrders = orders.filter(o => 
    o.table_number.includes(search) || 
    o.id.includes(search)
  );

  const statusLabels: Record<string, string> = {
    pending: 'Chờ xử lý',
    preparing: 'Đang pha',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy'
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    preparing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input 
            placeholder="Tìm kiếm theo bàn hoặc mã đơn..." 
            className="pl-10 bg-white border-stone-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-stone-50">
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Bàn</TableHead>
              <TableHead>Tổng tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs text-stone-500">#{order.id.slice(-6)}</TableCell>
                <TableCell className="text-stone-600">{format(new Date(order.created), 'HH:mm dd/MM')}</TableCell>
                <TableCell className="font-bold text-stone-800">{order.table_number}</TableCell>
                <TableCell>{order.total_amount.toLocaleString('vi-VN')}đ</TableCell>
                <TableCell>
                  <Badge className={cn("border-none", statusColors[order.status])}>
                    {statusLabels[order.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setSelectedOrder(order);
                        // Trigger print after state update
                        setTimeout(() => handlePrint(), 100);
                      }}
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Hidden Print Template */}
      <div className="hidden">
        <div ref={printRef} className="p-8 text-stone-800 font-sans max-w-[400px] mx-auto">
          <div className="text-center space-y-2 mb-6 border-b border-dashed border-stone-300 pb-6">
            <h1 className="text-2xl font-bold uppercase tracking-widest">Coffee POS</h1>
            <p className="text-sm">123 Đường Cà Phê, Quận 1, TP.HCM</p>
            <p className="text-sm">ĐT: 0123 456 789</p>
          </div>
          
          <div className="space-y-1 mb-6 text-sm">
            <div className="flex justify-between">
              <span>Mã đơn:</span>
              <span className="font-bold">#{selectedOrder?.id.slice(-6)}</span>
            </div>
            <div className="flex justify-between">
              <span>Bàn:</span>
              <span className="font-bold">{selectedOrder?.table_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Ngày:</span>
              <span>{selectedOrder && format(new Date(selectedOrder.created), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </div>

          <table className="w-full text-sm mb-6">
            <thead className="border-b border-stone-200">
              <tr>
                <th className="text-left py-2">Món</th>
                <th className="text-center py-2">SL</th>
                <th className="text-right py-2">Tiền</th>
              </tr>
            </thead>
            <tbody className="border-b border-stone-200">
              {selectedOrder?.expand?.order_items_via_order?.map((item) => (
                <tr key={item.id}>
                  <td className="py-2">{item.expand?.menu_item?.name}</td>
                  <td className="text-center py-2">{item.quantity}</td>
                  <td className="text-right py-2">{(item.price_at_order * item.quantity).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-2 font-bold">
            <div className="flex justify-between text-lg">
              <span>TỔNG CỘNG:</span>
              <span>{selectedOrder?.total_amount.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>

          <div className="mt-10 text-center space-y-2 border-t border-dashed border-stone-300 pt-6">
            <p className="text-sm italic">Cảm ơn quý khách!</p>
            <p className="text-xs text-stone-400">Hẹn gặp lại quý khách lần sau</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
