import React from 'react';
import { Order } from '@/types';
import { format } from 'date-fns';

interface ReceiptPrinterProps {
  order: Order | null;
  config: {
    shopName: string;
    address: string;
    phone: string;
    footer: string;
  };
}

export const ReceiptPrinter = React.forwardRef<HTMLDivElement, ReceiptPrinterProps>(({ order, config }, ref) => {
  if (!order) return null;

  return (
    <div ref={ref} className="p-8 text-stone-900 font-sans bg-white" style={{ width: '80mm', margin: '0 auto' }}>
      <div className="text-center space-y-2 mb-6 border-b-2 border-stone-900 pb-6">
        <h1 className="text-2xl font-black uppercase tracking-tighter">{config.shopName || 'COFFEE SHOP'}</h1>
        <p className="text-xs font-medium leading-tight">{config.address || 'Địa chỉ cửa hàng'}</p>
        <p className="text-xs font-bold">ĐT: {config.phone || '0123 456 789'}</p>
      </div>
      
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold border-y border-stone-200 py-1">PHIẾU THANH TOÁN</h2>
      </div>

      <div className="space-y-1 mb-6 text-xs">
        <div className="flex justify-between">
          <span className="text-stone-500">Mã hóa đơn:</span>
          <span className="font-bold">#{order.id.slice(-6).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Bàn:</span>
          <span className="font-black text-sm">BÀN {order.table_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Ngày giờ:</span>
          <span className="font-medium">{format(new Date(order.created), 'dd/MM/yyyy HH:mm')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Nhân viên:</span>
          <span className="font-medium">Admin</span>
        </div>
      </div>

      <table className="w-full text-xs mb-6 border-collapse">
        <thead className="border-b-2 border-stone-900">
          <tr>
            <th className="text-left py-2">TÊN MÓN</th>
            <th className="text-center py-2">SL</th>
            <th className="text-right py-2">T.TIỀN</th>
          </tr>
        </thead>
        <tbody className="border-b border-stone-300">
          {order.expand?.order_items_via_order?.map((item) => (
            <tr key={item.id} className="border-b border-stone-100 last:border-none">
              <td className="py-3 pr-2">
                <div className="font-bold uppercase">{item.expand?.menu_item?.name}</div>
                {item.notes && <div className="text-[10px] text-stone-500 italic">*{item.notes}</div>}
              </td>
              <td className="text-center py-3 font-bold">{item.quantity}</td>
              <td className="text-right py-3 font-bold">{(item.price_at_order * item.quantity).toLocaleString('vi-VN')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-2 mb-8">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium">TỔNG TIỀN MÓN:</span>
          <span className="text-sm font-bold">{order.total_amount.toLocaleString('vi-VN')}đ</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t-2 border-stone-900">
          <span className="text-sm font-black">THANH TOÁN:</span>
          <span className="text-xl font-black">{order.total_amount.toLocaleString('vi-VN')}đ</span>
        </div>
      </div>

      <div className="text-center space-y-4 pt-4 border-t border-dashed border-stone-300">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-stone-100 flex items-center justify-center text-[10px] text-stone-400 border border-stone-200">
            QR CODE
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold italic">{config.footer || 'Cảm ơn quý khách!'}</p>
          <p className="text-[10px] text-stone-400 uppercase tracking-widest">Hẹn gặp lại quý khách</p>
        </div>
        <div className="text-[8px] text-stone-300 pt-4">
          Powered by Coffee POS
        </div>
      </div>
    </div>
  );
});

ReceiptPrinter.displayName = 'ReceiptPrinter';
