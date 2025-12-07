
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Scan, X, Sparkles, AlertCircle, RefreshCw, Power } from 'lucide-react';
import { identifyTarotCard } from './geminiService';
import { cards } from './tarotData';
import { TarotCard } from './types';

type AppState = 'landing' | 'scanning' | 'result';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [view, setView] = useState<AppState>('landing');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [identifiedCard, setIdentifiedCard] = useState<TarotCard | null>(null);
  const [geminiRawName, setGeminiRawName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // --- Camera Management ---
  
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      if (stream) return; // Already running
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Не удалось получить доступ к камере.");
    }
  }, [stream]);

  // Effect to handle camera state based on View
  useEffect(() => {
    if (view === 'scanning') {
      startCamera();
    } else {
      stopCamera();
    }
    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [view, startCamera, stopCamera]);

  // Attach stream to video element when stream changes (and we are in scanning mode)
  useEffect(() => {
    if (stream && videoRef.current && view === 'scanning') {
      videoRef.current.srcObject = stream;
    }
  }, [stream, view]);


  // --- Logic ---

  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setError(null);
    setIdentifiedCard(null);
    setGeminiRawName("");

    try {
      // Capture frame
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error("Could not get canvas context");
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);

      // Call Gemini API
      const response = await identifyTarotCard(base64Image);
      const cardName = response.cardName.trim();
      setGeminiRawName(cardName);

      // Find card in database
      const foundCard = cards.find(c => 
        c.name.toLowerCase() === cardName.toLowerCase() ||
        c.name.toLowerCase().includes(cardName.toLowerCase()) ||
        cardName.toLowerCase().includes(c.name.toLowerCase())
      );

      if (foundCard) {
        setIdentifiedCard(foundCard);
        setView('result'); // Switch to result view, which stops camera
      } else {
        // Even if not found in DB, show result state with error/raw name
        setError(`Карта определена как "${cardName}", но описание отсутствует в базе.`);
        setView('result');
      }

    } catch (err) {
      console.error(err);
      setError("Связь с астралом прервана. Попробуйте снова.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setIdentifiedCard(null);
    setError(null);
    setView('scanning');
  };

  // --- Renders ---

  // 1. Landing View
  if (view === 'landing') {
    return (
      <div className="min-h-screen w-full bg-mystic-black text-mystic-text flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background ambience */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-mystic-gold/10 via-transparent to-transparent opacity-50"></div>
        
        <header className="z-10 text-center mb-16 animate-fade-in">
          <h1 className="font-display text-6xl tracking-[0.2em] text-mystic-gold drop-shadow-lg mb-4">
            AURA
          </h1>
          <h2 className="font-serif text-2xl text-white/80 tracking-widest uppercase border-t border-b border-mystic-gold/30 py-2">
            Астрал Герой Таро
          </h2>
        </header>

        <button 
          onClick={() => setView('scanning')}
          className="group relative z-10 w-32 h-32 rounded-full border border-mystic-gold flex items-center justify-center bg-black/50 hover:bg-mystic-gold/10 transition-all duration-500"
        >
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-full border border-mystic-gold/50 animate-ping opacity-20"></div>
          <div className="absolute inset-[-10px] rounded-full border border-mystic-gold/20 animate-pulse"></div>
          
          <div className="flex flex-col items-center">
            <Power className="w-8 h-8 text-mystic-gold mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-display text-xs text-mystic-gold tracking-widest">ВКЛЮЧИТЬ</span>
          </div>
        </button>

        <footer className="absolute bottom-6 text-mystic-gold/30 text-xs tracking-[0.3em] font-display">
          МИРМАГ
        </footer>
      </div>
    );
  }

  // 2. Scanning View
  if (view === 'scanning') {
    return (
      <div className="relative min-h-screen w-full bg-mystic-black flex flex-col items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />

        {/* Video Feed */}
        <div className="absolute inset-0 w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover opacity-80"
          />
          {/* Grain overlay */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
        </div>

        {/* Overlay Frame */}
        <div className="absolute inset-0 border-[30px] border-mystic-black/60 pointer-events-none z-10"></div>
        
        {/* Mystic Card Guide */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-[28rem] border border-mystic-gold/50 rounded-lg pointer-events-none z-20 flex items-center justify-center">
           <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-mystic-gold"></div>
           <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-mystic-gold"></div>
           <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-mystic-gold"></div>
           <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-mystic-gold"></div>
           
           {isProcessing && (
              <div className="absolute inset-0 bg-mystic-gold/10 animate-pulse">
                 <div className="w-full h-1 bg-mystic-gold shadow-[0_0_20px_rgba(199,168,123,1)] animate-scan-line"></div>
              </div>
           )}
        </div>

        {/* Text Status */}
        <div className="absolute top-1/4 z-30 font-serif text-xl text-mystic-gold/80 tracking-widest text-shadow-md">
           {isProcessing ? "Связь с астралом..." : "Наведите камеру на карту"}
        </div>

        {/* Scan Button */}
        <div className="absolute bottom-12 z-30">
          <button
            onClick={handleScan}
            disabled={isProcessing}
            className="w-20 h-20 rounded-full border-2 border-mystic-gold bg-black/60 backdrop-blur-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-wait"
          >
             {isProcessing ? (
               <div className="animate-spin w-8 h-8 border-t-2 border-mystic-gold rounded-full"></div>
             ) : (
               <div className="w-16 h-16 rounded-full border border-mystic-gold/30 flex items-center justify-center">
                 <Scan className="w-8 h-8 text-mystic-gold" />
               </div>
             )}
          </button>
          <div className="text-center mt-4 font-display text-xs text-mystic-gold tracking-widest opacity-70">
            СКАНИРОВАТЬ
          </div>
        </div>
      </div>
    );
  }

  // 3. Result View
  if (view === 'result') {
    return (
      <div className="min-h-screen w-full bg-mystic-black text-mystic-text flex flex-col relative overflow-y-auto">
        {/* Result Header */}
        <div className="sticky top-0 z-20 bg-mystic-black/90 backdrop-blur-md border-b border-mystic-gold/20 p-4 flex justify-between items-center shadow-lg">
           <h3 className="font-display text-xl text-mystic-gold tracking-widest">AURA</h3>
           <button onClick={handleReset} className="p-2 text-mystic-gold/60 hover:text-mystic-gold transition-colors">
             <X className="w-6 h-6" />
           </button>
        </div>

        <div className="flex-grow p-6 flex flex-col items-center max-w-2xl mx-auto w-full animate-fade-in pb-24">
           {identifiedCard ? (
             <>
                <div className="relative mb-8 group perspective-1000">
                   <div className="relative w-64 h-96 rounded-xl overflow-hidden border-2 border-mystic-gold/40 shadow-[0_0_40px_rgba(199,168,123,0.15)] transition-transform duration-700 transform group-hover:rotate-y-12 bg-black">
                     
                     {/* CONDITIONAL RENDERING: Video for Major, Image for Minor */}
                     {identifiedCard.isVideo ? (
                        <video
                          src={identifiedCard.imageUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                     ) : (
                        <img 
                          src={identifiedCard.imageUrl} 
                          alt={identifiedCard.name}
                          className="w-full h-full object-cover"
                        />
                     )}
                     
                     <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
                   </div>
                   <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                      <Sparkles className="w-8 h-8 text-mystic-gold animate-pulse drop-shadow-[0_0_10px_rgba(199,168,123,0.8)]" />
                   </div>
                </div>

                <h1 className="font-display text-3xl text-mystic-gold text-center mb-2 uppercase tracking-[0.15em]">
                  {identifiedCard.name}
                </h1>
                <p className="font-serif italic text-white/60 text-lg text-center mb-10 max-w-md">
                  "{identifiedCard.keyword}"
                </p>

                {/* Encyclopedia Content */}
                <div className="w-full space-y-8 font-serif">
                  <Section title="Общее значение" content={identifiedCard.desc_general} />
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-mystic-gold/30 to-transparent"></div>
                  <Section title="Любовь и Отношения" content={identifiedCard.desc_love} />
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-mystic-gold/30 to-transparent"></div>
                  <Section title="Работа и Финансы" content={identifiedCard.desc_work} />
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-mystic-gold/30 to-transparent"></div>
                  <Section title="Здоровье" content={identifiedCard.desc_health} />
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-mystic-gold/30 to-transparent"></div>
                  <Section title="Совет Карты" content={identifiedCard.desc_path} />
                </div>
             </>
           ) : (
             <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <AlertCircle className="w-16 h-16 text-mystic-gold/50 mb-6" />
                <h2 className="font-display text-2xl text-mystic-gold mb-4">Туман в кристалле</h2>
                <p className="font-serif text-lg text-white/70 mb-2">
                   Мы почувствовали энергию карты <strong>"{geminiRawName}"</strong>,
                </p>
                <p className="font-serif text-white/50">
                   но древние свитки молчат о её значении.
                </p>
             </div>
           )}
        </div>

        {/* Floating Action Button for New Reading */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
           <button 
             onClick={handleReset}
             className="px-8 py-4 bg-mystic-gold text-mystic-black font-display font-bold uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(199,168,123,0.4)] hover:bg-white hover:scale-105 transition-all flex items-center gap-3"
           >
             <RefreshCw className="w-5 h-5" />
             <span>Новое Гадание</span>
           </button>
        </div>
      </div>
    );
  }

  return null;
};

// Helper Component for Text Sections
const Section: React.FC<{title: string, content: string}> = ({ title, content }) => (
  <div className="bg-white/5 p-6 rounded-lg border border-white/5 hover:border-mystic-gold/20 transition-colors">
    <h4 className="font-display text-mystic-gold mb-3 text-lg">{title}</h4>
    <p className="text-white/80 leading-relaxed text-lg">
      {content}
    </p>
  </div>
);

export default App;
