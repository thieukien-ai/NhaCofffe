import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { User } from '@/types';
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
import { Plus, UserPlus, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
    role: 'staff'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await pb.collection('users').getFullList<User>();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        passwordConfirm: '',
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        passwordConfirm: '',
        role: 'staff'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dummyEmail = formData.email || `${formData.username.toLowerCase()}@pos.internal`;
      
      if (editingUser) {
        const updateData: any = {
          username: formData.username,
          email: dummyEmail,
          role: formData.role
        };
        if (formData.password) {
          updateData.password = formData.password;
          updateData.passwordConfirm = formData.password;
        }
        await pb.collection('users').update(editingUser.id, updateData);
        toast.success('Cập nhật nhân viên thành công');
      } else {
        await pb.collection('users').create({
          ...formData,
          email: dummyEmail,
          passwordConfirm: formData.password
        });
        toast.success('Thêm nhân viên thành công');
      }
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) return;
    try {
      await pb.collection('users').delete(id);
      toast.success('Xóa nhân viên thành công');
      fetchUsers();
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Quản trị viên',
    staff: 'Nhân viên phục vụ',
    barista: 'Nhân viên pha chế'
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    staff: 'bg-blue-100 text-blue-700',
    barista: 'bg-orange-100 text-orange-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          <Shield className="w-5 h-5 text-stone-400" />
          Danh sách nhân viên
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="bg-stone-800 text-stone-50">
              <UserPlus className="w-4 h-4 mr-2" />
              Thêm nhân viên
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập / SĐT / Tên</Label>
                <Input 
                  id="username" 
                  placeholder="Ví dụ: SA, 0901234567, Phuong..."
                  value={formData.username} 
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Tùy chọn)</Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="Để trống nếu không dùng email"
                  value={formData.email} 
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu {editingUser && '(để trống nếu không đổi)'}</Label>
                  <Input 
                    id="password" 
                    type="password"
                    value={formData.password} 
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Vai trò</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(val: any) => setFormData(prev => ({ ...prev, role: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Quản trị viên</SelectItem>
                      <SelectItem value="staff">Nhân viên phục vụ</SelectItem>
                      <SelectItem value="barista">Nhân viên pha chế</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full bg-stone-800 text-stone-50">
                  {editingUser ? 'Cập nhật' : 'Tạo tài khoản'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-stone-50">
            <TableRow>
              <TableHead>Nhân viên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-stone-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold text-xs">
                    {user.username[0].toUpperCase()}
                  </div>
                  {user.username}
                </TableCell>
                <TableCell className="text-stone-500">{user.email}</TableCell>
                <TableCell>
                  <Badge className={cn("border-none", roleColors[user.role])}>
                    {roleLabels[user.role]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-stone-400 hover:text-stone-800"
                    onClick={() => handleOpenDialog(user)}
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-stone-400 hover:text-red-600"
                    onClick={() => handleDelete(user.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
