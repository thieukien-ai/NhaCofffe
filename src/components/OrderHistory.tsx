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
import { Printer, Search, Eye, CheckCircle2, XCircle, Trash2, Loader2, ShoppingCart, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ReceiptPrinter } from './ReceiptPrinter';

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptConfig, setReceiptConfig] = useState({
    shopName: 'COFFEE SHOP',
    address: '123 Đường Cà Phê, Quận 1, TP.HCM',
    phone: '0123 456 789',
    footer: 'Cảm ơn quý khách! Hẹn gặp lại.'
  });
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOrders();
    fetchReceiptConfig();
  }, []);

  const fetchReceiptConfig = async () => {
    try {
      const data = await pb.collection('settings').getFullList({ filter: 'key = "receipt_config"' });
      if (data.length > 0) {
        setReceiptConfig(JSON.parse((data[0] as any).value));
      }
    } catch (e) {
      console.error('Error fetching receipt config:', e);
    }
  };

  const fetchOrders = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setLoading(true);
    
    try {
      // Clear cache to force fresh fetch if manual
      if (manual) {
        delete (pb as any).cache?.['orders'];
      }
      
      const data = await pb.collection('orders').getFullList<Order>({
        sort: '-created',
        expand: 'order_items_via_order.menu_item'
      });
      
      const validOrders = Array.isArray(data) ? data : [];
      setOrders(validOrders);
      
      if (manual) toast.success('Đã cập nhật dữ liệu mới nhất');
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Lỗi khi tải lịch sử đơn hàng');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Hoa-don-${selectedOrder?.id}`,
  });

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) return;
    try {
      await pb.collection('orders').delete(id);
      toast.success('Đã xóa đơn hàng');
      fetchOrders();
    } catch (error) {
      toast.error('Lỗi khi xóa đơn hàng');
    }
  };

  const filteredOrders = orders.filter(o => 
    String(o.table_number).includes(search) || 
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
            className="pl-10 bg-white border-stone-200 rounded-2xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchOrders(true)}
          className="rounded-2xl border-stone-200 text-stone-600"
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Đang tải lịch sử đơn hàng...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
            <p>Không tìm thấy đơn hàng nào</p>
          </div>
        ) : (
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
                <TableCell className="text-stone-600">
                  {order.created ? format(new Date(order.created), 'HH:mm dd/MM') : '---'}
                </TableCell>
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
                    {pb.authStore.model?.role === 'admin' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </div>

      {/* Hidden Print Template */}
      <div className="opacity-0 pointer-events-none absolute -z-50">
        <ReceiptPrinter ref={printRef} order={selectedOrder} config={receiptConfig} />
      </div>
    </div>
  );
}

