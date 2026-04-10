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

export default function Dashboard() {
  const [stats, setStats] = useState({
    revenue: 0,
    expenses: 0,
    orders: 0,
    customers: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = startOfDay(new Date());
      const endToday = endOfDay(new Date());

      // 1. Fetch Today's Orders
      const todayOrders = await pb.collection('orders').getFullList({
        filter: `created >= "${today.toISOString()}" && created <= "${endToday.toISOString()}" && status = "completed"`
      });

      const revenue = todayOrders.reduce((sum, o) => sum + o.total_amount, 0);

      // 2. Fetch Today's Expenses
      const todayExpenses = await pb.collection('expenses').getFullList({
        filter: `date >= "${today.toISOString()}" && date <= "${endToday.toISOString()}"`
      });

      const expenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

      setStats({
        revenue,
        expenses,
        orders: todayOrders.length,
        customers: todayOrders.length // Simplified
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
          revenue: dayOrders.reduce((sum, o) => sum + o.total_amount, 0),
          orders: dayOrders.length
        };
      }));

      setChartData(historicalData);

      // 4. Top Items (Mock for now, would need a more complex query or aggregation)
      setTopItems([
        { name: 'Cà phê sữa', sales: 45 },
        { name: 'Bạc xỉu', sales: 32 },
        { name: 'Trà đào cam sả', sales: 28 },
        { name: 'Cà phê đen', sales: 25 },
        { name: 'Trà sữa trân châu', sales: 20 },
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const statCards = [
    { 
      title: 'Doanh thu hôm nay', 
      value: stats.revenue.toLocaleString('vi-VN') + 'đ', 
      icon: DollarSign, 
      color: 'text-green-600', 
      bg: 'bg-green-100',
      trend: '+12%',
      trendUp: true
    },
    { 
      title: 'Chi phí hôm nay', 
      value: stats.expenses.toLocaleString('vi-VN') + 'đ', 
      icon: TrendingDown, 
      color: 'text-red-600', 
      bg: 'bg-red-100',
      trend: '+5%',
      trendUp: false
    },
    { 
      title: 'Đơn hàng hôm nay', 
      value: stats.orders.toString(), 
      icon: ShoppingCart, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100',
      trend: '+8%',
      trendUp: true
    },
    { 
      title: 'Lợi nhuận ròng', 
      value: (stats.revenue - stats.expenses).toLocaleString('vi-VN') + 'đ', 
      icon: TrendingUp, 
      color: 'text-orange-600', 
      bg: 'bg-orange-100',
      trend: '+15%',
      trendUp: true
    },
  ];

  return (
    <div className="space-y-8">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-stone-800">Xu hướng doanh thu (7 ngày)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
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
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-stone-800">Sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical">
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
