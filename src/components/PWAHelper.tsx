import { useState, useEffect } from 'react';
import { Share, Maximize2, Minimize2, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';

export default function PWAHelper() {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Check if it's iOS and not already in standalone mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIOS && !isStandalone) {
      const lastPrompt = localStorage.getItem('ios_pwa_prompt');
      const now = Date.now();
      // Show prompt once every 24 hours
      if (!lastPrompt || now - Number(lastPrompt) > 24 * 60 * 60 * 1000) {
        setShowIOSPrompt(true);
      }
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => {
        console.error(`Error attempting to enable full-screen mode: ${e.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const closePrompt = () => {
    setShowIOSPrompt(false);
    localStorage.setItem('ios_pwa_prompt', Date.now().toString());
  };

  return (
    <>
      <AnimatePresence>
        {showIOSPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-4 right-4 z-[100] bg-white rounded-3xl shadow-2xl border border-stone-200 p-6"
          >
            <button onClick={closePrompt} className="absolute top-4 right-4 text-stone-400">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <Info className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg">Cài đặt ứng dụng</h3>
                <p className="text-sm text-stone-600">
                  Để trải nghiệm tốt nhất trên iPhone/iPad, hãy nhấn nút <Share className="w-4 h-4 inline mx-1" /> 
                  trong trình duyệt Safari và chọn <strong>"Thêm vào MH chính"</strong>.
                </p>
                <Button onClick={closePrompt} className="w-full bg-primary text-white rounded-xl mt-2">
                  Tôi đã hiểu
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-4 right-4 z-[60] flex gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleFullscreen}
          className="bg-white/80 backdrop-blur-md border-stone-200 rounded-full shadow-lg hover:bg-white"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </Button>
      </div>
    </>
  );
}
