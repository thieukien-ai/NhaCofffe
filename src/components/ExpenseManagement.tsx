import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { Expense } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Search, TrendingDown, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ExpenseManagement() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    type: 'ingredient',
    amount: 0,
    description: '',
    date: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const data = await pb.collection('expenses').getFullList<Expense>({ sort: '-date' });
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.description || !newExpense.type) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      await pb.collection('expenses').create(newExpense);
      toast.success('Thêm chi phí thành công');
      setIsDialogOpen(false);
      setNewExpense({ type: 'ingredient', amount: 0, description: '', date: new Date().toISOString() });
      fetchExpenses();
    } catch (error) {
      toast.error('Lỗi khi lưu thông tin');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khoản chi này?')) return;
    try {
      await pb.collection('expenses').delete(id);
      toast.success('Đã xóa khoản chi');
      fetchExpenses();
    } catch (error) {
      toast.error('Lỗi khi xóa khoản chi');
    }
  };

  const filteredExpenses = expenses.filter(exp => 
    exp.description.toLowerCase().includes(search.toLowerCase()) ||
    exp.type.toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const typeLabels: Record<string, string> = {
    ingredient: 'Nguyên liệu',
    utility: 'Điện nước',
    salary: 'Lương NV',
    other: 'Khác'
  };

  const typeColors: Record<string, string> = {
    ingredient: 'bg-blue-100 text-blue-700',
    utility: 'bg-amber-100 text-amber-700',
    salary: 'bg-purple-100 text-purple-700',
    other: 'bg-stone-100 text-stone-700'
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-none shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">Tổng chi phí (trong danh sách)</p>
              <h3 className="text-3xl font-bold text-stone-800 mt-1">{totalExpenses.toLocaleString('vi-VN')}đ</h3>
            </div>
            <div className="p-4 bg-red-50 rounded-2xl text-red-600">
              <TrendingDown className="w-8 h-8" />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex flex-col justify-center">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-full bg-stone-800 hover:bg-stone-700 text-stone-50 text-lg font-bold rounded-2xl py-8 shadow-lg shadow-stone-200">
                <Plus className="w-6 h-6 mr-2" />
                Thêm chi phí
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Thêm khoản chi mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Loại chi phí</Label>
                  <Select 
                    value={newExpense.type} 
                    onValueChange={(val: any) => setNewExpense(prev => ({ ...prev, type: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại chi phí" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ingredient">Nguyên liệu</SelectItem>
                      <SelectItem value="utility">Điện nước</SelectItem>
                      <SelectItem value="salary">Lương nhân viên</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Số tiền (VNĐ)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    value={newExpense.amount} 
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount: parseInt(e.target.value) }))}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả / Ghi chú</Label>
                  <Input 
                    id="description" 
                    value={newExpense.description} 
                    onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ví dụ: Nhập 10kg cà phê hạt"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Ngày chi</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={newExpense.date?.split('T')[0]} 
                    onChange={(e) => setNewExpense(prev => ({ ...prev, date: new Date(e.target.value).toISOString() }))}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full bg-stone-800 text-stone-50">Lưu khoản chi</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input 
            placeholder="Tìm kiếm chi phí..." 
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
              <TableHead>Ngày chi</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.map((exp) => (
              <TableRow key={exp.id} className="hover:bg-stone-50/50">
                <TableCell className="text-stone-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-stone-400" />
                    {format(new Date(exp.date), 'dd/MM/yyyy')}
                  </div>
                </TableCell>
                <TableCell className="font-medium text-stone-800">{exp.description}</TableCell>
                <TableCell>
                  <Badge className={cn("border-none", typeColors[exp.type])}>
                    {typeLabels[exp.type]}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold text-red-600">-{exp.amount.toLocaleString('vi-VN')}đ</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-stone-400 hover:text-red-600"
                    onClick={() => handleDelete(exp.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredExpenses.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-stone-400">
                  Chưa có dữ liệu chi phí
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("bg-white rounded-2xl border border-stone-200 overflow-hidden", className)}>{children}</div>;
}

function CardContent({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
