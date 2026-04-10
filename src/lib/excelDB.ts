import * as XLSX from 'xlsx';

// This is a mock database service that uses LocalStorage for persistence
// and can export/import to Excel.
// It mimics the PocketBase API structure to minimize changes in the UI.

class ExcelDB {
  private storageKey = 'coffee_pos_db';
  private data: any = {};

  constructor() {
    this.init();
  }

  private init() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.data = JSON.parse(saved);
    } else {
      // Default empty structure
      this.data = {
        users: [],
        categories: [],
        menu_items: [],
        orders: [],
        order_items: [],
        expenses: []
      };
      this.save();
    }
  }

  private save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  private authListeners: ((token: string, model: any) => void)[] = [];

  // Auth logic
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

  private notifyAuthChange() {
    this.authListeners.forEach(l => l('mock-token', this.authStore.model));
  }

  collection(name: string) {
    const table = this.data[name] || [];

    return {
      getFullList: async <T>(options: any = {}) => {
        let list = [...table];
        if (options.sort) {
          const field = options.sort.replace('-', '');
          const desc = options.sort.startsWith('-');
          list.sort((a, b) => {
            if (a[field] < b[field]) return desc ? 1 : -1;
            if (a[field] > b[field]) return desc ? -1 : 1;
            return 0;
          });
        }
        if (options.expand) {
          // Simple expansion logic
          list = list.map(item => {
            const expanded: any = {};
            if (options.expand.includes('category') && item.category) {
              expanded.category = this.data.categories.find((c: any) => c.id === item.category);
            }
            if (options.expand.includes('order_items_via_order')) {
              expanded.order_items_via_order = this.data.order_items.filter((oi: any) => oi.order === item.id).map((oi: any) => ({
                ...oi,
                expand: { menu_item: this.data.menu_items.find((mi: any) => mi.id === oi.menu_item) }
              }));
            }
            return { ...item, expand: expanded };
          });
        }
        return list as T[];
      },

      getList: async (page: number, perPage: number) => {
        return {
          items: table.slice((page - 1) * perPage, page * perPage),
          totalItems: table.length
        };
      },

      getOne: async <T>(id: string, options: any = {}) => {
        const item = table.find((i: any) => i.id === id);
        if (!item) throw new Error('Not found');
        
        const expanded: any = {};
        if (options.expand?.includes('order_items_via_order')) {
          expanded.order_items_via_order = this.data.order_items.filter((oi: any) => oi.order === item.id).map((oi: any) => ({
            ...oi,
            expand: { menu_item: this.data.menu_items.find((mi: any) => mi.id === oi.menu_item) }
          }));
        }
        
        return { ...item, expand: expanded } as T;
      },

      create: async (record: any) => {
        const newRecord = {
          ...record,
          id: Math.random().toString(36).substr(2, 9),
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        };
        this.data[name].push(newRecord);
        this.save();
        return newRecord;
      },

      update: async (id: string, record: any) => {
        const index = this.data[name].findIndex((i: any) => i.id === id);
        if (index === -1) throw new Error('Not found');
        this.data[name][index] = { ...this.data[name][index], ...record, updated: new Date().toISOString() };
        this.save();
        return this.data[name][index];
      },

      delete: async (id: string) => {
        this.data[name] = this.data[name].filter((i: any) => i.id !== id);
        this.save();
        return true;
      },

      authWithPassword: async (identity: string, password: string) => {
        const user = this.data.users.find((u: any) => (u.username === identity || u.email === identity) && u.password === password);
        if (!user) throw new Error('Invalid credentials');
        this.authStore.model = user;
        this.authStore.isValid = true;
        localStorage.setItem('coffee_pos_auth', JSON.stringify(user));
        this.notifyAuthChange();
        return { token: 'mock-token', record: user };
      },

      subscribe: (topic: string, callback: (e: any) => void, options?: any) => {
        // Mock subscription
        return () => {};
      },

      unsubscribe: (topic: string) => {}
    };
  }

  // Special method to load from the Excel file
  async loadFromExcel(fileUrl: string) {
    try {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      const newData: any = {};
      workbook.SheetNames.forEach(sheetName => {
        newData[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      });
      
      this.data = newData;
      this.save();
      console.log('Database loaded from Excel');
    } catch (error) {
      console.error('Failed to load Excel database:', error);
    }
  }

  // Helper for file URLs (mock)
  files = {
    getUrl: (record: any, fileName: string) => {
      return fileName; // Just return the name for now
    }
  };
}

const db = new ExcelDB();

// Try to load initial data from the excel file we generated
if (!localStorage.getItem('coffee_pos_db')) {
  db.loadFromExcel('/database.xlsx');
}

// Restore auth state
const savedAuth = localStorage.getItem('coffee_pos_auth');
if (savedAuth) {
  db.authStore.model = JSON.parse(savedAuth);
  db.authStore.isValid = true;
}

export default db;
