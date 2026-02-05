
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { analyzeFoodImage, analyzeFoodByName } from './services/geminiService';
import { FoodData, AnalysisHistory } from './types';
import NutritionCard from './components/NutritionCard';
import RecipeCard from './components/RecipeCard';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [foodData, setFoodData] = useState<FoodData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Persistence
  useEffect(() => {
    const savedHistory = localStorage.getItem('nutrilens_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedTheme = localStorage.getItem('nutrilens_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nutrilens_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nutrilens_theme', 'light');
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      setIsCameraActive(true);
      setCapturedImage(null);
      setFoodData(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        stopCamera();
        handleAnalyze(dataUrl);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setCapturedImage(base64String);
        setFoodData(null);
        handleAnalyze(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async (image: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeFoodImage(image);
      setFoodData(result);
      
      const newHistory: AnalysisHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUrl: image,
        data: result
      };
      
      const updatedHistory = [newHistory, ...history].slice(0, 20);
      setHistory(updatedHistory);
      localStorage.setItem('nutrilens_history', JSON.stringify(updatedHistory));
    } catch (err: any) {
      setError(err.message || "Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    setCapturedImage(null);
    try {
      const result = await analyzeFoodByName(manualInput);
      setFoodData(result);
    } catch (err: any) {
      setError(err.message || "Search failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight hidden sm:block">NutriLens AI</h1>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              title="History"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 9H3m3.343-5.657l-.707.707m12.728 12.728l-.707.707M6.343 17.657l-.707-.707M17.657 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
            <button onClick={() => setError(null)} className="text-sm font-bold underline">Dismiss</button>
          </div>
        )}

        {/* History Modal-like Sidebar */}
        {showHistory && (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
            <div 
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl p-6 overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold font-display">Recent History</h2>
                <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {history.length === 0 ? (
                  <p className="text-gray-500 italic text-center py-8">No scan history yet.</p>
                ) : (
                  history.map(item => (
                    <div 
                      key={item.id} 
                      className="group cursor-pointer p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => {
                        setFoodData(item.data);
                        setCapturedImage(item.imageUrl);
                        setShowHistory(false);
                      }}
                    >
                      <div className="flex space-x-3">
                        <img src={item.imageUrl} className="w-16 h-16 rounded-lg object-cover" alt={item.data.food_name} />
                        <div>
                          <h4 className="font-bold text-sm">{item.data.food_name}</h4>
                          <p className="text-xs text-gray-500 mt-1">{item.data.nutrition.calories} kcal • {item.data.classification}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(item.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hero & Scanner */}
        {!foodData && !isAnalyzing && !isCameraActive && !capturedImage && (
          <div className="text-center max-w-2xl mx-auto mt-12 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold font-display mb-6 leading-tight">
              Unlock the <span className="text-orange-500">Truth</span> behind your meals.
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-10">
              Instant food identification, detailed macro-nutrients, and complete recipes just by snapping a photo.
            </p>
            
            <form onSubmit={handleManualSearch} className="mb-12 max-w-md mx-auto relative">
              <input 
                type="text"
                placeholder="Or type a dish name manually..."
                className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 pr-12 transition-all"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
              />
              <button type="submit" className="absolute right-3 top-3 p-2 text-orange-500 hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Camera/Capture View */}
        <div className="max-w-xl mx-auto">
          {isCameraActive && (
            <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black aspect-[3/4]">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-6 px-6">
                <button 
                  onClick={stopCamera}
                  className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button 
                  onClick={capturePhoto}
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full border-4 border-gray-100" />
                </button>
                <div className="w-12 h-12" /> {/* Spacer */}
              </div>
            </div>
          )}

          {capturedImage && !foodData && !isAnalyzing && (
            <div className="relative rounded-3xl overflow-hidden shadow-2xl group">
              <img src={capturedImage} className="w-full aspect-[3/4] object-cover" alt="Captured food" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setCapturedImage(null); setFoodData(null); startCamera(); }}
                  className="bg-white text-black px-6 py-3 rounded-full font-bold shadow-lg"
                >
                  Retake Photo
                </button>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
                <div className="absolute inset-4 rounded-full border-4 border-green-500/20 border-b-green-500 animate-spin [animation-duration:1.5s]" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold font-display animate-pulse">Analyzing Dish...</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Consulting our on-device food intelligence engine</p>
              </div>
            </div>
          )}
        </div>

        {/* Results View */}
        {foodData && !isAnalyzing && (
          <div className="space-y-8 animate-in fade-in duration-700 slide-in-from-bottom-4">
            {/* Summary Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
               {/* Background Glow */}
               <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
               
               <div className="flex-1">
                 <div className="flex items-center space-x-2 mb-2 text-sm text-orange-500 font-bold tracking-widest uppercase">
                   <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                     <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                   </svg>
                   <span>AI Identification • {foodData.confidence} Confidence</span>
                 </div>
                 <h2 className="text-4xl font-bold font-display mb-2">{foodData.food_name}</h2>
                 <p className="text-lg text-gray-500 dark:text-gray-400 capitalize">{foodData.cuisine} Cuisine</p>
               </div>

               <div className="flex-shrink-0 flex items-center space-x-4">
                 {capturedImage && (
                   <img src={capturedImage} className="w-24 h-24 rounded-2xl object-cover shadow-lg border-4 border-white dark:border-gray-700" alt="Result" />
                 )}
                 <div className="flex flex-col space-y-2">
                   <button 
                     onClick={() => { setFoodData(null); setCapturedImage(null); startCamera(); }}
                     className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-bold transition-colors"
                   >
                     New Scan
                   </button>
                   <button 
                     onClick={() => window.print()}
                     className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-colors"
                   >
                     Print Report
                   </button>
                 </div>
               </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
               <div className="lg:col-span-1">
                 <NutritionCard nutrition={foodData.nutrition} servingSize={foodData.serving_size} />
               </div>
               <div className="lg:col-span-2 space-y-8">
                 <RecipeCard 
                   ingredients={foodData.ingredients} 
                   recipe={foodData.recipe} 
                   allergens={foodData.allergens} 
                   classification={foodData.classification}
                 />
                 
                 {foodData.tips && foodData.tips.length > 0 && (
                   <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                     <h4 className="text-emerald-700 dark:text-emerald-400 font-bold mb-3 flex items-center">
                       <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                       </svg>
                       Chef's Pro Tips
                     </h4>
                     <ul className="space-y-2">
                       {foodData.tips.map((tip, i) => (
                         <li key={i} className="text-sm text-emerald-800 dark:text-emerald-300/80 leading-relaxed">• {tip}</li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
            </div>
            
            <p className="text-center text-xs text-gray-400 mt-12 py-8">
              Disclaimer: NutriLens AI provides estimated data for educational purposes. 
              Nutritional values and recipes are generated via semantic browser-based inference.
            </p>
          </div>
        )}
      </main>

      {/* Action Bar (Fixed bottom for mobile) */}
      {!isCameraActive && !isAnalyzing && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent z-20 pointer-events-none">
          <div className="max-w-md mx-auto flex justify-center space-x-4 pointer-events-auto">
            <label className="flex items-center justify-center w-14 h-14 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 transition-all active:scale-95">
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </label>
            
            <button 
              onClick={startCamera}
              className="flex-1 bg-orange-500 text-white font-bold rounded-2xl px-8 py-4 shadow-xl shadow-orange-500/30 flex items-center justify-center space-x-2 active:scale-95 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              <span>Scan Food</span>
            </button>

            {foodData && (
              <button 
                onClick={() => { setFoodData(null); setCapturedImage(null); }}
                className="w-14 h-14 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center"
              >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default App;
