import React, { useState, useRef } from 'react';
import { InputSection } from './components/InputSection';
import { OutputSection } from './components/OutputSection';
import { AppState } from './types';
import { processText, generateAudio } from './services/geminiService';
import { GraduationCap, AlertCircle, RotateCcw, Sparkles } from 'lucide-react';

const getInitialState = (): AppState => ({
  inputText: '',
  frenchList: '',
  englishList: '',
  selectedVoice: 'Zephyr',
  audioSpeed: 1.25, // السرعة الافتراضية 1.25 كما طلب المستخدم
  isLoading: false,
  isAudioLoading: false,
  isPreviewLoading: false,
  error: null,
  result: null,
  audioBase64: null,
});

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(getInitialState());
  const [resetKey, setResetKey] = useState(0);
  const operationRef = useRef(0);

  const handleInputChange = (field: keyof AppState, value: any) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في بدء درس جديد؟ سيتم مسح جميع البيانات الحالية.')) {
      operationRef.current += 1;
      setState(getInitialState());
      setResetKey(prev => prev + 1);
    }
  };

  const handleAnalyze = async () => {
    const currentOpId = operationRef.current + 1;
    operationRef.current = currentOpId;
    setState((prev) => ({ ...prev, isLoading: true, error: null, result: null, audioBase64: null }));

    try {
      const adaptedContent = await processText(state.inputText, state.frenchList, state.englishList);
      if (operationRef.current === currentOpId) {
        setState((prev) => ({ ...prev, isLoading: false, result: adaptedContent }));
      }
    } catch (error: any) {
      if (operationRef.current === currentOpId) {
        setState((prev) => ({ ...prev, isLoading: false, error: error.message || 'حدث خطأ غير متوقع.' }));
      }
    }
  };

  const handleGenerateAudio = async (editedText?: string) => {
    if (!state.result) return;
    const currentOpId = operationRef.current + 1;
    operationRef.current = currentOpId;
    setState((prev) => ({ ...prev, isAudioLoading: true, error: null }));

    try {
      const finalScript = editedText || state.result.adaptedScript;
      const audioData = await generateAudio(
        finalScript, 
        state.selectedVoice,
        state.result.report.frenchWords,
        state.result.report.englishWords,
        state.audioSpeed
      );
      if (operationRef.current === currentOpId) {
        setState((prev) => ({ ...prev, isAudioLoading: false, audioBase64: audioData }));
      }
    } catch (error: any) {
      if (operationRef.current === currentOpId) {
        setState((prev) => ({ ...prev, isAudioLoading: false, error: error.message || 'فشل في توليد الصوت.' }));
      }
    }
  }

  const handlePreviewVoice = async () => {
    setState((prev) => ({ ...prev, isPreviewLoading: true, error: null }));
    try {
      const audioData = await generateAudio("تجربة الصوت المختارة.", state.selectedVoice, [], [], state.audioSpeed);
      const audio = new Audio(`data:audio/wav;base64,${audioData}`);
      audio.play();
      setState((prev) => ({ ...prev, isPreviewLoading: false }));
    } catch (error: any) {
      setState((prev) => ({ ...prev, isPreviewLoading: false, error: 'فشل في تحميل المعاينة.' }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-right" dir="rtl">
      <header className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="bg-indigo-500/20 backdrop-blur-md p-2.5 rounded-xl border border-indigo-400/30 shadow-inner"><GraduationCap className="w-7 h-7 text-indigo-300" /></div>
                <div><h1 className="text-2xl font-black flex items-center gap-2">مُعَلِّم <span className="text-indigo-400">AI</span><Sparkles className="w-4 h-4 text-yellow-400" /></h1><p className="text-[10px] text-slate-300 font-bold uppercase opacity-70">المنصة الذكية للتحويل الصوتي الأكاديمي</p></div>
            </div>
            <button onClick={handleReset} className="flex items-center gap-2 text-sm font-bold bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl border border-white/10 transition-all active:scale-95 group"><RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" /><span className="hidden sm:inline">بدء عمل جديد</span></button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {state.error && <div className="mb-6 bg-rose-50 border-r-4 border-rose-500 p-4 rounded-xl shadow-sm flex items-center gap-3 animate-fade-in border border-rose-100"><AlertCircle className="w-6 h-6 text-rose-600" /><p className="text-rose-700 font-bold">{state.error}</p></div>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-180px)] min-h-[650px]">
          <div className="h-full">
            <InputSection key={`input-${resetKey}`} text={state.inputText} setText={(s) => handleInputChange('inputText', s)} frenchList={state.frenchList} setFrenchList={(s) => handleInputChange('frenchList', s)} englishList={state.englishList} setEnglishList={(s) => handleInputChange('englishList', s)} onAnalyze={handleAnalyze} isLoading={state.isLoading} />
          </div>
          <div className="h-full">
            <OutputSection 
              key={`output-${resetKey}`} 
              result={state.result} 
              audioBase64={state.audioBase64} 
              onGenerateAudio={handleGenerateAudio} 
              isAudioLoading={state.isAudioLoading} 
              selectedVoice={state.selectedVoice} 
              setSelectedVoice={(s) => handleInputChange('selectedVoice', s)} 
              audioSpeed={state.audioSpeed}
              setAudioSpeed={(n) => handleInputChange('audioSpeed', n)}
              onPreviewVoice={handlePreviewVoice} 
              isPreviewLoading={state.isPreviewLoading} 
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;