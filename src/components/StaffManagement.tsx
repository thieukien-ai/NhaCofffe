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
  const [newUser, setNewUser] = useState({
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await pb.collection('users').create(newUser);
      toast.success('Thêm nhân viên thành công');
      setIsDialogOpen(false);
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
            <Button className="bg-stone-800 text-stone-50">
              <UserPlus className="w-4 h-4 mr-2" />
              Thêm nhân viên
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm nhân viên mới</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <Input 
                  id="username" 
                  value={newUser.username} 
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={newUser.email} 
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input 
                    id="password" 
                    type="password"
                    value={newUser.password} 
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Vai trò</Label>
                  <Select 
                    value={newUser.role} 
                    onValueChange={(val: any) => setNewUser(prev => ({ ...prev, role: val }))}
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
                <Button type="submit" className="w-full bg-stone-800 text-stone-50">Tạo tài khoản</Button>
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
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-stone-400 hover:text-red-600">
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
