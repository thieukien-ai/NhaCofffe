/**
 * GOOGLE APPS SCRIPT FOR COFFEE POS
 * 
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Tạo một Google Sheet mới.
 * 2. Vào Extensions -> Apps Script.
 * 3. Xóa hết mã cũ và dán mã này vào.
 * 4. Bấm "Deploy" -> "New Deployment".
 * 5. Chọn Type là "Web App".
 * 6. Phần "Who has access" chọn "Anyone" (Quan trọng).
 * 7. Copy URL nhận được và dán vào file .env (VITE_GOOGLE_SHEET_API_URL).
 */

const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  const action = e.parameter.action;
  const sheetName = e.parameter.sheet;
  
  if (action === 'read') {
    return readData(sheetName);
  } else if (action === 'batch_read') {
    const sheets = e.parameter.sheets ? e.parameter.sheets.split(',') : [];
    const result = {};
    sheets.forEach(name => {
      result[name] = getReadData(name);
    });
    return createResponse(result);
  } else if (action === 'seed_data') {
    return generateSeedData();
  }
  
  return createResponse({ error: 'Invalid action' });
}

function generateSeedData() {
  // Tạo dữ liệu giả cho Orders, Order Items và Expenses
  const menuItems = getReadData('menu_items');
  if (menuItems.length === 0) return createResponse({ error: 'Cần có món ăn trong menu_items trước khi tạo dữ liệu giả' });

  const ordersSheet = getOrCreateSheet('orders');
  const orderItemsSheet = getOrCreateSheet('order_items');
  const expensesSheet = getOrCreateSheet('expenses');

  const now = new Date();
  
  // Tạo 10 đơn hàng giả
  for (let i = 0; i < 10; i++) {
    const orderId = 'order_mock_' + i;
    const date = new Date(now.getTime() - (Math.random() * 7 * 24 * 60 * 60 * 1000)); // Trong 7 ngày qua
    const totalAmount = Math.floor(Math.random() * 500000) + 50000;
    
    ordersSheet.appendRow([orderId, Math.floor(Math.random() * 10) + 1, 'completed', totalAmount, 'paid', 'Dữ liệu giả', date.toISOString(), date.toISOString()]);
    
    // Mỗi đơn hàng có 1-3 món
    const itemCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < itemCount; j++) {
      const item = menuItems[Math.floor(Math.random() * menuItems.length)];
      orderItemsSheet.appendRow(['oi_mock_' + i + '_' + j, orderId, item.id, Math.floor(Math.random() * 2) + 1, item.price, 'served', '', date.toISOString(), date.toISOString()]);
    }
  }

  // Tạo 5 chi phí giả
  const expenseTypes = ['Nguyên liệu', 'Điện nước', 'Mặt bằng', 'Khác'];
  for (let i = 0; i < 5; i++) {
    const date = new Date(now.getTime() - (Math.random() * 7 * 24 * 60 * 60 * 1000));
    expensesSheet.appendRow(['exp_mock_' + i, expenseTypes[Math.floor(Math.random() * expenseTypes.length)], Math.floor(Math.random() * 1000000) + 100000, 'Chi phí giả', date.toISOString(), date.toISOString(), date.toISOString()]);
  }

  return createResponse({ success: true, message: 'Đã tạo dữ liệu giả thành công' });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  const sheetName = data.sheet;
  
  if (action === 'create') {
    return createData(sheetName, data.record);
  } else if (action === 'update') {
    return updateData(sheetName, data.id, data.record);
  } else if (action === 'delete') {
    return deleteData(sheetName, data.id);
  } else if (action === 'auth') {
    return handleAuth(data.identity, data.password);
  }
  
  return createResponse({ error: 'Invalid action' });
}

function getReadData(sheetName) {
  const sheet = getOrCreateSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const data = [];
  
  if (values.length <= 1) return [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      // Parse JSON strings back to objects/arrays if needed
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch(e) {}
      }
      obj[header] = val;
    });
    data.push(obj);
  }
  return data;
}

function readData(sheetName) {
  return createResponse(getReadData(sheetName));
}

function createData(sheetName, record) {
  const sheet = getOrCreateSheet(sheetName);
  const headers = sheet.getDataRange().getValues()[0];
  
  if (!record.id) record.id = Utilities.getUuid();
  if (!record.created) record.created = new Date().toISOString();
  record.updated = new Date().toISOString();
  
  const newRow = headers.map(header => {
    let val = record[header] || '';
    if (typeof val === 'object') val = JSON.stringify(val);
    return val;
  });
  
  sheet.appendRow(newRow);
  return createResponse(record);
}

function updateData(sheetName, id, record) {
  const sheet = getOrCreateSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) { // Giả sử ID luôn ở cột đầu tiên
      headers.forEach((header, index) => {
        if (record[header] !== undefined) {
          let val = record[header];
          if (typeof val === 'object') val = JSON.stringify(val);
          sheet.getRange(i + 1, index + 1).setValue(val);
        }
      });
      sheet.getRange(i + 1, headers.indexOf('updated') + 1).setValue(new Date().toISOString());
      return createResponse({ success: true });
    }
  }
  return createResponse({ error: 'Not found' });
}

function deleteData(sheetName, id) {
  const sheet = getOrCreateSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      sheet.deleteRow(i + 1);
      return createResponse({ success: true });
    }
  }
  return createResponse({ error: 'Not found' });
}

function handleAuth(identity, password) {
  const sheet = getOrCreateSheet('users');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const user = {};
    headers.forEach((h, idx) => user[h] = row[idx]);
    
    if ((user.username === identity || user.email === identity) && user.password == password) {
      return createResponse({ token: 'gs-token-' + user.id, record: user });
    }
  }
  return createResponse({ error: 'Invalid credentials' }, 401);
}

function getOrCreateSheet(name) {
  let sheet = SPREADSHEET.getSheetByName(name);
  if (!sheet) {
    sheet = SPREADSHEET.insertSheet(name);
    // Khởi tạo headers dựa trên bảng
    const defaultHeaders = {
      'users': ['id', 'username', 'email', 'password', 'role', 'created', 'updated'],
      'categories': ['id', 'name', 'icon', 'created', 'updated'],
      'menu_items': ['id', 'name', 'description', 'price', 'cost_price', 'category', 'available', 'created', 'updated'],
      'orders': ['id', 'table_number', 'status', 'total_amount', 'payment_status', 'notes', 'created', 'updated'],
      'order_items': ['id', 'order', 'menu_item', 'quantity', 'price_at_order', 'status', 'notes', 'created', 'updated'],
      'expenses': ['id', 'type', 'amount', 'description', 'date', 'created', 'updated'],
      'daily_reports': ['id', 'date', 'total_revenue', 'total_expenses', 'total_labor_cost', 'total_ingredient_cost', 'net_profit', 'order_count', 'created', 'updated'],
      'ingredient_imports': ['id', 'name', 'quantity', 'unit', 'price', 'supplier', 'date', 'created', 'updated'],
      'staff': ['id', 'name', 'phone', 'role', 'salary_rate', 'status', 'created', 'updated'],
      'staff_details': ['id', 'user_id', 'full_name', 'address', 'phone', 'join_date', 'salary', 'status', 'created', 'updated'],
      'ingredients': ['id', 'menu_item_id', 'name', 'quantity_needed', 'unit', 'created', 'updated'],
      'customers': ['id', 'name', 'phone', 'last_order_date', 'total_spent', 'created', 'updated']
    };
    if (defaultHeaders[name]) {
      sheet.appendRow(defaultHeaders[name]);
    }
  }
  return sheet;
}

function createResponse(data, code = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
