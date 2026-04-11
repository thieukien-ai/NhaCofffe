// Google Sheets Database Service
// This service connects to a Google Apps Script Web App to use Google Sheets as a database.

class GoogleSheetsDB {
  private apiUrl = import.meta.env.VITE_GOOGLE_SHEET_API_URL;
  private authListeners: ((token: string, model: any) => void)[] = [];
  private cache: Record<string, { data: any, timestamp: number }> = {};
  private CACHE_TTL = 60000; // 60 seconds cache
  private writeQueue: { action: string, sheet: string, body: any, id: string }[] = [];
  private isSyncing = false;

  authStore = {
    model: null as any,
    isValid: false,
    clear: () => {
      this.authStore.model = null;
      this.authStore.isValid = false;
      localStorage.removeItem('coffee_pos_auth');
      this.notifyAuthChange();
    },
    onChange: (callback: (token: string, model: any) => void) => {
      this.authListeners.push(callback);
      return () => {
        this.authListeners = this.authListeners.filter(l => l !== callback);
      };
    }
  };

  constructor() {
    // Auth persistence removed to prevent automatic login
  }

  private notifyAuthChange() {
    this.authListeners.forEach(l => l('gs-token', this.authStore.model));
  }

  private async request(action: string, sheet: string, body?: any) {
    let apiUrl = this.apiUrl?.trim();
    if (!apiUrl) {
      console.warn('VITE_GOOGLE_SHEET_API_URL is missing. Using LocalStorage fallback.');
      return this.localStorageRequest(action, sheet, body);
    }

    // Clean up URL (remove trailing slashes and spaces)
    apiUrl = apiUrl.replace(/\/+$/, '');

    // Ensure URL is absolute
    if (!apiUrl.startsWith('http')) {
      console.error('VITE_GOOGLE_SHEET_API_URL must be an absolute URL starting with http/https');
      return this.localStorageRequest(action, sheet, body);
    }

    // Cache logic for read operations
    if (action === 'read' && this.cache[sheet] && (Date.now() - this.cache[sheet].timestamp < this.CACHE_TTL)) {
      return this.cache[sheet].data;
    }

    try {
      if (action === 'read') {
        const fetchUrl = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=read&sheet=${sheet}`;
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (data.error || !Array.isArray(data)) {
          console.error(`API Error reading sheet ${sheet}:`, data.error || 'Response is not an array');
          return Array.isArray(data) ? data : [];
        }

        this.cache[sheet] = { data, timestamp: Date.now() };
        return data;
      } else {
        // Ghi dữ liệu: Sử dụng cơ chế Background Sync
        const requestId = Math.random().toString(36).substr(2, 9);
        
        // Cập nhật cache local ngay lập tức để UI phản hồi nhanh
        if (action === 'create') {
          const newRecord = { ...body.record, id: body.record.id || requestId, created: new Date().toISOString(), updated: new Date().toISOString() };
          if (this.cache[sheet]) this.cache[sheet].data.push(newRecord);
          
          // Thêm vào hàng đợi gửi lên server
          this.addToWriteQueue(action, sheet, body, newRecord.id);
          return newRecord;
        } else if (action === 'update') {
          if (this.cache[sheet]) {
            const idx = this.cache[sheet].data.findIndex((i: any) => i.id === body.id);
            if (idx !== -1) this.cache[sheet].data[idx] = { ...this.cache[sheet].data[idx], ...body.record };
          }
          this.addToWriteQueue(action, sheet, body, body.id);
          return { success: true };
        }

        // Fallback cho các action khác
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: JSON.stringify({ action, sheet, ...body }),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        return await response.json();
      }
    } catch (error) {
      console.error('Google Sheets API Error:', error);
      // Only fallback to localStorage if it's a network error or 404
      return this.localStorageRequest(action, sheet, body);
    }
  }

  private addToWriteQueue(action: string, sheet: string, body: any, id: string) {
    this.writeQueue.push({ action, sheet, body, id });
    this.processQueue();
  }

  async sync() {
    if (this.writeQueue.length > 0) {
      await this.processQueue();
      return true;
    }
    return false;
  }

  private async processQueue() {
    if (this.isSyncing || this.writeQueue.length === 0) return;
    this.isSyncing = true;

    const apiUrl = this.apiUrl?.trim().replace(/\/+$/, '');
    
    while (this.writeQueue.length > 0) {
      const task = this.writeQueue[0];
      try {
        await fetch(apiUrl!, {
          method: 'POST',
          body: JSON.stringify(task),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        this.writeQueue.shift(); // Xóa task đã xong
        console.log(`Background Sync Success: ${task.action} on ${task.sheet}`);
      } catch (e) {
        console.error('Background Sync Failed, retrying in 5s...', e);
        break; // Dừng lại để thử lại sau
      }
    }

    this.isSyncing = false;
    if (this.writeQueue.length > 0) {
      setTimeout(() => this.processQueue(), 5000);
    }
  }

  private localStorageRequest(action: string, sheet: string, body?: any) {
    const storageKey = 'coffee_pos_local_db';
    const saved = localStorage.getItem(storageKey);
    let data = saved ? JSON.parse(saved) : {
      users: [],
      categories: [],
      menu_items: [],
      orders: [],
      order_items: [],
      expenses: [],
      daily_reports: [],
      ingredient_imports: []
    };

    const table = data[sheet] || [];

    if (action === 'read') {
      return table;
    } else if (action === 'create') {
      const newRecord = {
        ...body.record,
        id: body.record.id || Math.random().toString(36).substr(2, 9),
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };
      data[sheet].push(newRecord);
      localStorage.setItem(storageKey, JSON.stringify(data));
      return newRecord;
    } else if (action === 'update') {
      const index = data[sheet].findIndex((i: any) => i.id === body.id);
      if (index !== -1) {
        data[sheet][index] = { ...data[sheet][index], ...body.record, updated: new Date().toISOString() };
        localStorage.setItem(storageKey, JSON.stringify(data));
      }
      return { success: true };
    } else if (action === 'delete') {
      data[sheet] = data[sheet].filter((i: any) => i.id !== body.id);
      localStorage.setItem(storageKey, JSON.stringify(data));
      return { success: true };
    } else if (action === 'auth') {
      const user = data.users.find((u: any) => (u.username === body.identity || u.email === body.identity) && u.password == body.password);
      if (user) return { record: user };
      return { error: 'Invalid credentials' };
    }
    return [];
  }

  async batchRead(sheets: string[]) {
    let apiUrl = this.apiUrl?.trim();
    if (!apiUrl || !apiUrl.startsWith('http')) {
      const result: any = {};
      for (const sheet of sheets) {
        const list = await this.collection(sheet).getFullList();
        result[sheet] = Array.isArray(list) ? list : [];
      }
      return result;
    }

    apiUrl = apiUrl.replace(/\/+$/, '');

    try {
      const fetchUrl = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=batch_read&sheets=${sheets.join(',')}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      // Update cache for each sheet
      Object.keys(data).forEach(sheet => {
        if (Array.isArray(data[sheet])) {
          this.cache[sheet] = {
            data: data[sheet],
            timestamp: Date.now()
          };
        }
      });
      
      return data;
    } catch (error) {
      console.error('Batch read error:', error);
      const result: any = {};
      for (const sheet of sheets) {
        const list = await this.collection(sheet).getFullList();
        result[sheet] = Array.isArray(list) ? list : [];
      }
      return result;
    }
  }

  async seedData() {
    let apiUrl = this.apiUrl?.trim();
    if (!apiUrl) return { error: 'API URL missing' };
    apiUrl = apiUrl.replace(/\/+$/, '');
    
    try {
      const fetchUrl = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=seed_data`;
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Seed data error:', error);
      return { error: 'Failed to seed data' };
    }
  }

  collection(name: string) {
    return {
      getFullList: async <T>(options: any = {}) => {
        let list = await this.request('read', name);
        
        // Sorting
        if (options.sort) {
          const sortFields = options.sort.split(',').map((s: string) => s.trim());
          list.sort((a: any, b: any) => {
            for (const sortStr of sortFields) {
              const field = sortStr.replace('-', '');
              const desc = sortStr.startsWith('-');
              if (a[field] < b[field]) return desc ? 1 : -1;
              if (a[field] > b[field]) return desc ? -1 : 1;
            }
            return 0;
          });
        }

        // Filtering (Simple client-side filter)
        if (options.filter) {
          // Note: PocketBase filter syntax is complex, we'll implement a very basic version
          // e.g., 'created >= "..." && created <= "..."'
          if (options.filter.includes('status = "completed"')) {
            list = list.filter((i: any) => i.status === 'completed');
          }
        }

        // Expansion
        if (options.expand) {
          const categories = name === 'menu_items' ? await this.request('read', 'categories') : [];
          const orderItems = name === 'orders' ? await this.request('read', 'order_items') : [];
          const menuItems = name === 'orders' ? await this.request('read', 'menu_items') : [];

          list = list.map((item: any) => {
            const expanded: any = {};
            if (options.expand.includes('category') && item.category) {
              expanded.category = categories.find((c: any) => c.id === item.category);
            }
            if (options.expand.includes('order_items_via_order')) {
              expanded.order_items_via_order = orderItems
                .filter((oi: any) => oi.order === item.id)
                .map((oi: any) => ({
                  ...oi,
                  expand: { menu_item: menuItems.find((mi: any) => mi.id === oi.menu_item) }
                }));
            }
            return { ...item, expand: expanded };
          });
        }
        return list as T[];
      },

      getList: async (page: number, perPage: number) => {
        const list = await this.request('read', name);
        return {
          items: list.slice((page - 1) * perPage, page * perPage),
          totalItems: list.length
        };
      },

      getOne: async <T>(id: string, options: any = {}) => {
        const list = await this.request('read', name);
        const item = list.find((i: any) => i.id === id);
        if (!item) throw new Error('Not found');

        if (options.expand?.includes('order_items_via_order')) {
          const orderItems = await this.request('read', 'order_items');
          const menuItems = await this.request('read', 'menu_items');
          item.expand = {
            order_items_via_order: orderItems
              .filter((oi: any) => oi.order === item.id)
              .map((oi: any) => ({
                ...oi,
                expand: { menu_item: menuItems.find((mi: any) => mi.id === oi.menu_item) }
              }))
          };
        }
        return item as T;
      },

      create: async (record: any) => {
        const result = await this.request('create', name, { record });
        return result;
      },

      update: async (id: string, record: any) => {
        await this.request('update', name, { id, record });
        return { id, ...record };
      },

      delete: async (id: string) => {
        await this.request('delete', name, { id });
        return true;
      },

      authWithPassword: async (identity: string, password: string) => {
        const result = await this.request('auth', 'users', { identity, password });
        if (result.error) throw new Error(result.error);
        
        this.authStore.model = result.record;
        this.authStore.isValid = true;
        localStorage.setItem('coffee_pos_auth', JSON.stringify(result.record));
        this.notifyAuthChange();
        return result;
      },

      subscribe: (topic: string, callback: (e: any) => void, options?: any) => {
        const interval = setInterval(async () => {
          // Clear cache to force fresh fetch
          delete this.cache[name];
          callback({ action: 'update', record: {} });
        }, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
      },

      unsubscribe: (topic: string) => {}
    };
  }

  files = {
    getUrl: (record: any, fileName: string) => fileName
  };
}

const db = new GoogleSheetsDB();
export default db;
