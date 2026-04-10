import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { MenuItem, Category } from '@/types';
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
import { Plus, Edit2, Trash2, Search, Coffee, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function MenuManagement() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsData, catsData] = await Promise.all([
        pb.collection('menu_items').getFullList<MenuItem>({ sort: 'name', expand: 'category' }),
        pb.collection('categories').getFullList<Category>({ sort: 'name' })
      ]);
      setItems(itemsData);
      setCategories(catsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem?.price || !editingItem?.category) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      if (editingItem.id) {
        await pb.collection('menu_items').update(editingItem.id, editingItem);
        toast.success('Cập nhật món thành công');
      } else {
        await pb.collection('menu_items').create({
          ...editingItem,
          available: true
        });
        toast.success('Thêm món mới thành công');
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Lỗi khi lưu thông tin');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa món này?')) return;
    try {
      await pb.collection('menu_items').delete(id);
      toast.success('Đã xóa món');
      fetchData();
    } catch (error) {
      toast.error('Lỗi khi xóa món');
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      await pb.collection('menu_items').update(item.id, { available: !item.available });
      fetchData();
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.expand?.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input 
            placeholder="Tìm kiếm món hoặc danh mục..." 
            className="pl-10 bg-white border-stone-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-stone-800 hover:bg-stone-700 text-stone-50"
              onClick={() => setEditingItem({ name: '', price: 0, description: '', category: categories[0]?.id })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm món mới
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingItem?.id ? 'Chỉnh sửa món' : 'Thêm món mới'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên món</Label>
                <Input 
                  id="name" 
                  value={editingItem?.name || ''} 
                  onChange={(e) => setEditingItem(prev => ({ ...prev!, name: e.target.value }))}
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Giá (VNĐ)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    value={editingItem?.price || 0} 
                    onChange={(e) => setEditingItem(prev => ({ ...prev!, price: parseInt(e.target.value) }))}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Danh mục</Label>
                  <Select 
                    value={editingItem?.category} 
                    onValueChange={(val) => setEditingItem(prev => ({ ...prev!, category: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Input 
                  id="description" 
                  value={editingItem?.description || ''} 
                  onChange={(e) => setEditingItem(prev => ({ ...prev!, description: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full bg-stone-800 text-stone-50">Lưu thay đổi</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-stone-50">
            <TableRow>
              <TableHead className="w-[80px]">Ảnh</TableHead>
              <TableHead>Tên món</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id} className="hover:bg-stone-50/50">
                <TableCell>
                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center overflow-hidden">
                    {item.image ? (
                      <img src={pb.files.getUrl(item, item.image)} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Coffee className="w-5 h-5 text-stone-400" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium text-stone-800">{item.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-stone-100 text-stone-600 border-none">
                    {item.expand?.category?.name || 'Chưa phân loại'}
                  </Badge>
                </TableCell>
                <TableCell>{item.price.toLocaleString('vi-VN')}đ</TableCell>
                <TableCell>
                  <button 
                    onClick={() => toggleAvailability(item)}
                    className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      item.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}
                  >
                    {item.available ? 'Đang bán' : 'Hết hàng'}
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-stone-400 hover:text-stone-800"
                      onClick={() => {
                        setEditingItem(item);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-stone-400 hover:text-red-600"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredItems.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-stone-400">
                  Không tìm thấy món nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
