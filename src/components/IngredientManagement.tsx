import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { IngredientImport } from '@/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, Calendar, Truck, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function IngredientManagement() {
  const [imports, setImports] = useState<IngredientImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchImports();
  }, []);

  const fetchImports = async () => {
    try {
      const data = await pb.collection('ingredient_imports').getFullList<IngredientImport>({
        sort: '-date'
      });
      setImports(data);
    } catch (error) {
      console.error('Error fetching imports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredImports = imports.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.supplier.toLowerCase().includes(search.toLowerCase())
  );

  const totalCost = filteredImports.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="coffee-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Tổng lượt nhập</p>
              <h3 className="text-2xl font-bold">{imports.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="coffee-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Tổng chi phí nhập</p>
              <h3 className="text-2xl font-bold">{totalCost.toLocaleString('vi-VN')}đ</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="coffee-card">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Nhà cung cấp</p>
              <h3 className="text-2xl font-bold">{new Set(imports.map(i => i.supplier)).size}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input 
            placeholder="Tìm nguyên liệu hoặc nhà cung cấp..." 
            className="pl-10 rounded-2xl border-stone-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button className="bg-primary hover:bg-primary/90 rounded-2xl">
          <Plus className="w-4 h-4 mr-2" /> Nhập hàng mới
        </Button>
      </div>

      <Card className="coffee-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-stone-50/50">
              <TableHead>Ngày nhập</TableHead>
              <TableHead>Nguyên liệu</TableHead>
              <TableHead>Số lượng</TableHead>
              <TableHead>Đơn giá</TableHead>
              <TableHead>Thành tiền</TableHead>
              <TableHead>Nhà cung cấp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredImports.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-stone-500">
                  {format(new Date(item.date), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell className="font-bold text-stone-800">{item.name}</TableCell>
                <TableCell>{item.quantity} {item.unit}</TableCell>
                <TableCell>{item.price.toLocaleString('vi-VN')}đ</TableCell>
                <TableCell className="font-bold text-primary">
                  {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                </TableCell>
                <TableCell className="text-stone-600">{item.supplier}</TableCell>
              </TableRow>
            ))}
            {filteredImports.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-stone-400">
                  Không tìm thấy dữ liệu nhập hàng
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
