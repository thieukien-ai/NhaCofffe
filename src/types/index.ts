export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  expand?: {
    category: Category;
  };
  image?: string;
  available: boolean;
}

export interface Order {
  id: string;
  table_number: string;
  status: 'pending' | 'preparing' | 'completed' | 'cancelled';
  total_amount: number;
  payment_status: 'unpaid' | 'paid';
  staff?: string;
  created: string;
  expand?: {
    order_items_via_order?: OrderItem[];
  };
}

export interface OrderItem {
  id: string;
  order: string;
  menu_item: string;
  quantity: number;
  price_at_order: number;
  notes?: string;
  expand?: {
    menu_item: MenuItem;
  };
}

export interface Expense {
  id: string;
  type: 'ingredient' | 'utility' | 'salary' | 'other';
  amount: number;
  description: string;
  date: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'staff' | 'barista';
}
