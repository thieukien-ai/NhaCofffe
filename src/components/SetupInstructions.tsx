import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Database, Info } from 'lucide-react';

export default function SetupInstructions() {
  const collections = [
    { name: 'categories', fields: 'name (text), icon (text)' },
    { name: 'menu_items', fields: 'name (text), description (text), price (number), category (relation:categories), image (file), available (bool)' },
    { name: 'orders', fields: 'table_number (text), status (select: pending, preparing, completed, cancelled), total_amount (number), payment_status (select: unpaid, paid), staff (relation:users)' },
    { name: 'order_items', fields: 'order (relation:orders), menu_item (relation:menu_items), quantity (number), price_at_order (number), notes (text)' },
    { name: 'expenses', fields: 'type (select: ingredient, utility, salary, other), amount (number), description (text), date (date)' },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader className="bg-stone-800 text-stone-50 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Hướng dẫn cấu hình PocketBase
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl text-sm">
            <Info className="w-5 h-5 shrink-0" />
            <p>
              Để ứng dụng hoạt động, bạn cần tạo các Collection sau trên PocketBase (Pockethost) của mình. 
              Đảm bảo các tên trường (field names) khớp chính xác.
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collection</TableHead>
                <TableHead>Các trường (Fields)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-bold text-stone-800">{c.name}</TableCell>
                  <TableCell className="text-stone-600 text-sm">{c.fields}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="pt-4">
            <h4 className="font-bold text-stone-800 mb-2">Phân quyền (API Rules):</h4>
            <p className="text-sm text-stone-600">
              Để đơn giản cho việc bắt đầu, bạn có thể đặt tất cả API Rules thành <code className="bg-stone-100 px-1 rounded">Admin Only</code> hoặc <code className="bg-stone-100 px-1 rounded">@request.auth.id != ""</code> cho các quyền Read/Write.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
