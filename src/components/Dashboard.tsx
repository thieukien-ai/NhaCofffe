import { useState, useEffect } from 'react';
import pb from '@/lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Coffee,
  Receipt,
  Settings,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { format, startOfDay, endOfDay, subDays, eachDayOfInterval } from 'date-fns';

import { cn } from '@/lib/utils';

import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const user = pb.authStore.model;
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    revenue: 0,
    expenses: 0,
    ingredientCost: 0,
    profit: 0,
    orders: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="p-6 bg-red-50 text-red-600 rounded-3xl border border-red-100 text-center max-w-md">
          <h2 className="text-2xl font-serif mb-2">Truy cập bị từ chối</h2>
          <p className="text-sm">Chỉ tài khoản Quản trị viên mới có quyền xem Dashboard báo cáo chuyên sâu.</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    { label: 'Thực đơn', icon: Coffee, path: '/admin/menu', color: 'bg-orange-500' },
    { label: 'Nguyên liệu', icon: ShoppingCart, path: '/admin/ingredients', color: 'bg-blue-500' },
    { label: 'Đơn hàng', icon: Receipt, path: '/admin/orders', color: 'bg-purple-500' },
    { label: 'Chi phí', icon: TrendingDown, path: '/admin/expenses', color: 'bg-red-500' },
    { label: 'Nhân viên', icon: Users, path: '/admin/staff', color: 'bg-indigo-500' },
    { label: 'Cài đặt', icon: Settings, path: '/admin/settings', color: 'bg-stone-600' },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = startOfDay(new Date());
      const endToday = endOfDay(new Date());

      // Use batchRead for faster initial load
      let todayOrders: any[] = [];
      let orderItems: any[] = [];
      let todayExpenses: any[] = [];

      if (typeof (pb as any).batchRead === 'function') {
        const batch = await (pb as any).batchRead(['orders', 'order_items', 'expenses', 'menu_items']);
        todayOrders = (batch.orders || []).filter((o: any) => 
          new Date(o.created) >= today && new Date(o.created) <= endToday && o.status === 'completed'
        );
        
        // Manual expansion for batchRead
        const menuItems = batch.menu_items || [];
        orderItems = (batch.order_items || []).map((oi: any) => ({
          ...oi,
          expand: { menu_item: menuItems.find((mi: any) => mi.id === oi.menu_item) }
        }));
        
        todayExpenses = (batch.expenses || []).filter((e: any) => 
          new Date(e.date) >= today && new Date(e.date) <= endToday
        );
      } else {
        const [orders, items, expenses] = await Promise.all([
          pb.collection('orders').getFullList({
            filter: `created >= "${today.toISOString()}" && created <= "${endToday.toISOString()}" && status = "completed"`,
            expand: 'order_items_via_order'
          }),
          pb.collection('order_items').getFullList({
            expand: 'menu_item'
          }),
          pb.collection('expenses').getFullList({
            filter: `date >= "${today.toISOString()}" && date <= "${endToday.toISOString()}"`
          })
        ]);
        todayOrders = orders;
        orderItems = items;
        todayExpenses = expenses;
      }

      let revenue: number = 0;
      let ingredientCost: number = 0;

      // Calculate today's stats
      todayOrders.forEach((o: any) => {
        revenue += (Number(o.total_amount) || 0);
        
        // Find items for this order to calculate COGS
        const items = orderItems.filter((oi: any) => oi.order === o.id);
        items.forEach((oi: any) => {
          // Use price_at_order or menu_item.cost_price
          const itemCost = (oi.expand?.menu_item?.cost_price || 0) * (Number(oi.quantity) || 0);
          ingredientCost += itemCost;
        });
      });

      const expensesTotal: number = (todayExpenses as any[]).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

      setStats({
        revenue,
        expenses: expensesTotal,
        ingredientCost,
        profit: revenue - expensesTotal - ingredientCost,
        orders: todayOrders.length
      });

      // 3. Generate Chart Data (Last 7 days)
      const last7Days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date()
      });

      const historicalData = await Promise.all(last7Days.map(async (day) => {
        const start = startOfDay(day);
        const end = endOfDay(day);
        
        const dayOrders = await pb.collection('orders').getFullList({
          filter: `created >= "${start.toISOString()}" && created <= "${end.toISOString()}" && status = "completed"`
        });
        
        return {
          name: format(day, 'dd/MM'),
          revenue: dayOrders.reduce<number>((sum, o: any) => sum + (Number(o.total_amount) || 0), 0),
          orders: dayOrders.length
        };
      }));

      setChartData(historicalData);

      // 4. Calculate Top Items from all order items
      const itemSales: Record<string, number> = {};
      orderItems.forEach((oi: any) => {
        const name = oi.expand?.menu_item?.name || 'Unknown';
        itemSales[name] = (itemSales[name] || 0) + (Number(oi.quantity) || 0);
      });

      const sortedTopItems = Object.entries(itemSales)
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      setTopItems(sortedTopItems.length > 0 ? sortedTopItems : [
        { name: 'Chưa có dữ liệu', sales: 0 }
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const statCards = [
    { 
      title: 'Doanh thu', 
      value: stats.revenue.toLocaleString('vi-VN') + 'đ', 
      icon: DollarSign, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      trend: '+12%',
      trendUp: true
    },
    { 
      title: 'Giá vốn hàng bán', 
      value: stats.ingredientCost.toLocaleString('vi-VN') + 'đ', 
      icon: Coffee, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50',
      trend: '+5%',
      trendUp: false
    },
    { 
      title: 'Chi phí vận hành', 
      value: stats.expenses.toLocaleString('vi-VN') + 'đ', 
      icon: TrendingDown, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50',
      trend: '+2%',
      trendUp: false
    },
    { 
      title: 'Lợi nhuận ròng', 
      value: stats.profit.toLocaleString('vi-VN') + 'đ', 
      icon: TrendingUp, 
      color: 'text-primary', 
      bg: 'bg-primary/10',
      trend: '+15%',
      trendUp: true
    },
  ];

  return (
    <div className="space-y-8">
      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all group"
          >
            <div className={cn("p-3 rounded-xl text-white mb-2 group-hover:scale-110 transition-transform", action.color)}>
              <action.icon className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-stone-600 group-hover:text-stone-900">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={cn("p-3 rounded-2xl", stat.bg)}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <div className={cn(
                  "flex items-center text-xs font-bold px-2 py-1 rounded-full",
                  stat.trendUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                )}>
                  {stat.trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {stat.trend}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-stone-500">{stat.title}</p>
                <h3 className="text-2xl font-bold text-stone-800 mt-1">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        {/* Revenue Chart */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg font-bold text-stone-800">Xu hướng doanh thu (7 ngày)</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] sm:h-[300px] p-2 sm:p-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Items Chart */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg font-bold text-stone-800">Sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] sm:h-[300px] p-2 sm:p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical" margin={{ left: -10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f1f1" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#444', fontSize: 12}} width={100} />
                <Tooltip 
                  cursor={{fill: '#f9f9f9'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="sales" fill="#292524" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

