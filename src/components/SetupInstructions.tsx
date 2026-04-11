import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Info, FileSpreadsheet, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SetupInstructions() {
  const [copied, setCopied] = useState(false);
  const scriptUrl = "https://raw.githubusercontent.com/your-repo/GOOGLE_APPS_SCRIPT.js"; // Placeholder

  const copyScript = () => {
    // In a real scenario, we'd fetch the content of /GOOGLE_APPS_SCRIPT.js
    // For now, we'll just show a message or provide a way to get it
    toast.info('Vui lòng mở file GOOGLE_APPS_SCRIPT.js trong mã nguồn để copy code.');
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader className="bg-stone-800 text-stone-50 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Cấu hình Google Sheets Database
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-start gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl text-sm">
            <Info className="w-5 h-5 shrink-0" />
            <div className="space-y-2">
              <p>
                Hệ thống hiện đang sử dụng **Google Sheets** làm cơ sở dữ liệu thời gian thực.
              </p>
              <p>
                Bạn có thể quản lý món ăn, nhân viên và xem đơn hàng trực tiếp trên bảng tính Google.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-stone-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-800 text-white text-xs">1</span>
              Bước 1: Tạo Google Sheet
            </h4>
            <p className="text-sm text-stone-600 ml-8">
              Tạo một Google Sheet mới và đặt tên (ví dụ: Coffee POS DB).
            </p>
            <Button variant="outline" className="ml-8 border-stone-200" asChild>
              <a href="https://sheets.new" target="_blank" rel="noreferrer">
                Tạo Sheet mới <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>

            <h4 className="font-bold text-stone-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-800 text-white text-xs">2</span>
              Bước 2: Cài đặt Apps Script
            </h4>
            <div className="ml-8 space-y-2 text-sm text-stone-600">
              <p>Vào menu **Extensions {"->"} Apps Script**.</p>
              <p>Copy toàn bộ mã trong file `GOOGLE_APPS_SCRIPT.js` và dán vào đó.</p>
              <Button variant="secondary" size="sm" onClick={copyScript} className="mt-2">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy mã Apps Script
              </Button>
            </div>

            <h4 className="font-bold text-stone-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-800 text-white text-xs">3</span>
              Bước 3: Triển khai (Deploy)
            </h4>
            <ul className="ml-8 space-y-1 text-sm text-stone-600 list-disc">
              <li>Bấm **Deploy {"->"} New Deployment**.</li>
              <li>Chọn loại là **Web App**.</li>
              <li>Phần "Who has access" chọn **Anyone**.</li>
              <li>Copy URL nhận được.</li>
            </ul>

            <h4 className="font-bold text-stone-800 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-800 text-white text-xs">4</span>
              Bước 4: Kết nối App
            </h4>
            <p className="text-sm text-stone-600 ml-8">
              Dán URL vừa copy vào biến môi trường `VITE_GOOGLE_SHEET_API_URL` trong phần Settings của AI Studio.
            </p>
          </div>

          <div className="pt-6 border-t border-stone-100">
            <h4 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-stone-400" />
              Các Sheets sẽ tự động được tạo:
            </h4>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {['users', 'categories', 'menu_items', 'orders', 'order_items', 'expenses'].map(sheet => (
                <li key={sheet} className="p-2 bg-stone-50 rounded-lg border border-stone-100 text-stone-600 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                  {sheet}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mt-6">
            <h4 className="font-bold text-stone-800 mb-2">Tạo dữ liệu giả (Tùy chọn)</h4>
            <p className="text-sm text-stone-600 mb-4">
              Nếu bạn đã cấu hình xong và muốn có dữ liệu để xem thử các biểu đồ báo cáo, hãy bấm nút dưới đây.
            </p>
            <Button 
              onClick={async () => {
                const res = await (pb as any).seedData();
                if (res.success) toast.success('Đã tạo dữ liệu giả thành công! Hãy tải lại trang.');
                else toast.error(res.error || 'Lỗi khi tạo dữ liệu');
              }}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary hover:text-white"
            >
              Tạo dữ liệu giả ngay
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
