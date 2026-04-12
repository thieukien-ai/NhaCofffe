import React, { useState, useEffect } from 'react';
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
import { Plus, Search, Package, Calendar, Truck, DollarSign, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function IngredientManagement() {
  const [imports, setImports] = useState<IngredientImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    unit: 'kg',
    price: 0,
    supplier: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchImports();
  }, []);

  const fetchImports = async () => {
    setLoading(true);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lượt nhập hàng này?')) return;
    try {
      await pb.collection('ingredient_imports').delete(id);
      toast.success('Đã xóa lượt nhập');
      fetchImports();
    } catch (error) {
      toast.error('Lỗi khi xóa lượt nhập');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await pb.collection('ingredient_imports').create({
        ...formData,
        quantity: Number(formData.quantity),
        price: Number(formData.price)
      });
      
      // Also record as an expense
      await pb.collection('expenses').create({
        type: 'ingredient',
        amount: Number(formData.price) * Number(formData.quantity),
        description: `Nhập nguyên liệu: ${formData.name} (${formData.quantity} ${formData.unit})`,
        date: formData.date
      });

      toast.success('Đã nhập hàng thành công');
      setIsDialogOpen(false);
      setFormData({
        name: '',
        quantity: 1,
        unit: 'kg',
        price: 0,
        supplier: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchImports();
    } catch (error) {
      toast.error('Lỗi khi nhập hàng');
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger 
            nativeButton={true}
            render={
              <Button className="bg-primary hover:bg-primary/90 rounded-2xl">
                <Plus className="w-4 h-4 mr-2" /> Nhập hàng mới
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Nhập nguyên liệu mới</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên nguyên liệu</Label>
                <Input 
                  id="name" 
                  placeholder="Ví dụ: Cà phê hạt, Sữa đặc..." 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Số lượng</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Đơn vị</Label>
                  <Input 
                    id="unit" 
                    placeholder="kg, lít, hộp..." 
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Đơn giá (VNĐ)</Label>
                <Input 
                  id="price" 
                  type="number" 
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Nhà cung cấp</Label>
                <Input 
                  id="supplier" 
                  placeholder="Tên nhà cung cấp..." 
                  value={formData.supplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Ngày nhập</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required 
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full bg-primary text-white rounded-xl h-12">
                  Xác nhận nhập hàng
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
              <TableHead className="text-right">Thao tác</TableHead>
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
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-stone-400 hover:text-red-600"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
