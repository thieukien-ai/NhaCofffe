import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(process.cwd(), 'public', 'database.xlsx');

function generateData() {
  // 1. Categories
  const categories = [
    { id: 'cat_drinks', name: 'Đồ uống', icon: 'coffee' },
    { id: 'cat_snacks', name: 'Đồ ăn vặt', icon: 'cookie' }
  ];

  // 2. Users
  const users = [];
  const roles = ['admin', 'staff', 'barista'];
  for (let i = 1; i <= 10; i++) {
    const username = i === 1 ? 'SA' : `user${i}`;
    const role = i === 1 ? 'admin' : roles[i % roles.length];
    users.push({
      id: `user_${i}`,
      username: username,
      email: `${username.toLowerCase()}@pos.internal`,
      password: '1',
      role: role,
      created: new Date().toISOString()
    });
  }

  // 3. Menu Items
  const menuItems = [];
  const drinkNames = ['Cà phê đen', 'Cà phê sữa', 'Bạc xỉu', 'Trà đào', 'Trà vải', 'Sữa chua', 'Sinh tố bơ', 'Nước ép cam', 'Trà sữa', 'Cacao'];
  for (let i = 0; i < 50; i++) {
    const name = drinkNames[i % drinkNames.length] + ` ${i + 1}`;
    const price = Math.floor(Math.random() * (50 - 15 + 1) + 15) * 1000;
    menuItems.push({
      id: `item_drink_${i}`,
      name: name,
      description: `Mô tả cho ${name}`,
      price: price,
      category: 'cat_drinks',
      available: true,
      created: new Date().toISOString()
    });
  }

  const snackNames = ['Hướng dương', 'Hạt điều', 'Khô gà', 'Bánh tráng', 'Cá viên chiên', 'Phô mai que'];
  for (let i = 0; i < 20; i++) {
    const name = snackNames[i % snackNames.length] + ` ${i + 1}`;
    const price = Math.floor(Math.random() * (50 - 15 + 1) + 15) * 1000;
    menuItems.push({
      id: `item_snack_${i}`,
      name: name,
      description: `Mô tả cho ${name}`,
      price: price,
      category: 'cat_snacks',
      available: true,
      created: new Date().toISOString()
    });
  }

  // 4. Orders & Order Items (Empty initially)
  const orders = [];
  const orderItems = [];
  const expenses = [];

  // Create Workbook
  const wb = XLSX.utils.book_new();
  
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categories), 'categories');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(users), 'users');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(menuItems), 'menu_items');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orders), 'orders');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderItems), 'order_items');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenses), 'expenses');

  // Write to file
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, buf);
  console.log(`Excel database generated at: ${DB_PATH}`);
}

generateData();
