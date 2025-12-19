import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Download, BarChart2, Mic, CheckCircle2, 
  Music, Mic2, RefreshCw, AudioLines, Check,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Type, Eraser, Gauge
} from 'lucide-react';
import { AdaptedContent, TabOption } from '../types';

interface OutputSectionProps {
  result: AdaptedContent | null;
  audioBase64: string | null;
  onGenerateAudio: (editedText: string) => void;
  isAudioLoading: boolean;
  selectedVoice: string;
  setSelectedVoice: (s: string) => void;
  audioSpeed: number;
  setAudioSpeed: (n: number) => void;
  onPreviewVoice: () => void;
  isPreviewLoading: boolean;
}

export const OutputSection: React.FC<OutputSectionProps> = ({ 
    result, 
    audioBase64, 
    onGenerateAudio,
    isAudioLoading,
    selectedVoice,
    setSelectedVoice,
    audioSpeed,
    setAudioSpeed,
    onPreviewVoice,
    isPreviewLoading
}) => {
  const [activeTab, setActiveTab] = useState<TabOption>(TabOption.ADAPTED);
  const [progress, setProgress] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && editorRef.current && activeTab === TabOption.ADAPTED) {
      const html = highlightLogic(result.adaptedScript, result.report.frenchWords, result.report.englishWords);
      editorRef.current.innerHTML = html;
    }
  }, [result, activeTab]);

  useEffect(() => {
    let interval: any;
    if (isAudioLoading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return 95; 
          const increment = Math.max(1, (95 - prev) / 15); 
          return prev + increment;
        });
      }, 400);
    } else {
      setProgress(100);
      const timer = setTimeout(() => setProgress(0), 1000); 
      return () => clearTimeout(timer);
    }
    return () => clearInterval(interval);
  }, [isAudioLoading]);

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const highlightLogic = (text: string, french: string[], english: string[]) => {
    const frenchSet = new Set(french.map(w => w.trim().toLowerCase()));
    const englishSet = new Set(english.map(w => w.trim().toLowerCase()));
    const parts = text.split(/([a-zA-Z\u00C0-\u024F]+)/g);

    return parts.map((part) => {
      const lower = part.toLowerCase();
      if (frenchSet.has(lower)) {
        return `<span style="color: #2563eb; font-weight: bold;" dir="ltr">${part}</span>`;
      }
      if (englishSet.has(lower)) {
        return `<span style="color: #e11d48; font-weight: bold;" dir="ltr">${part}</span>`;
      }
      return part;
    }).join('');
  };

  const handleGenerateClick = () => {
    const content = editorRef.current?.innerText || result?.adaptedScript || "";
    onGenerateAudio(content);
  };

  if (!result) {
    return (
      <div className="h-full bg-slate-50 border-3 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 p-10 text-center transition-all">
        <div className="bg-slate-200/50 p-6 rounded-full mb-6">
            <AudioLines className="w-16 h-16 text-slate-300 animate-pulse" />
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-3">نتائج التحويل</h3>
        <p className="max-w-xs font-medium text-slate-500">سيتم عرض النص المنسق والتحليل الصوتي هنا بعد المعالجة.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="border-b border-slate-100">
        <div className="p-6 bg-slate-50/50 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="font-black text-slate-800 flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                    توليد المحتوى الصوتي
                </h2>
                {audioBase64 && !isAudioLoading && (
                    <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg animate-fade-in">
                        <Check className="w-3 h-3" /> الملف جاهز
                    </div>
                )}
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="relative group">
                        <Mic2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600 pointer-events-none" />
                        <select 
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="w-full h-12 pr-11 pl-4 bg-slate-50 border-2 border-slate-100 rounded-2xl appearance-none text-sm font-black text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                            disabled={isAudioLoading}
                        >
                            <option value="Zephyr">Zephyr (أكاديمي عميق)</option>
                            <option value="Charon">Charon (وقور وهادئ)</option>
                            <option value="Puck">Puck (واضح وسريع)</option>
                            <option value="Kore">Kore (صوت نسائي لطيف)</option>
                            <option value="Fenrir">Fenrir (قوي وحماسي)</option>
                        </select>
                    </div>

                    <div className="relative group">
                        <Gauge className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600 pointer-events-none" />
                        <select 
                            value={audioSpeed}
                            onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                            className="w-full h-12 pr-11 pl-4 bg-slate-50 border-2 border-slate-100 rounded-2xl appearance-none text-sm font-black text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                            disabled={isAudioLoading}
                        >
                            <option value="0.75">بطيء جداً (0.75x)</option>
                            <option value="0.9">بطيء (0.9x)</option>
                            <option value="1.0">طبيعي (1.0x)</option>
                            <option value="1.1">سريع قليلاً (1.1x)</option>
                            <option value="1.25">سريع (1.25x)</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={onPreviewVoice} disabled={isPreviewLoading || isAudioLoading} className="flex-1 px-6 h-12 bg-white border-2 border-slate-100 rounded-2xl text-indigo-700 text-sm font-black hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 active:scale-95">
                         {isPreviewLoading ? <div className="h-4 w-4 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" /> : <><Play className="w-4 h-4 fill-indigo-700" /> تجربة النبرة</>}
                  </button>
                  
                  {!audioBase64 ? (
                      <button 
                          onClick={handleGenerateClick} 
                          disabled={isAudioLoading}
                          className="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
                      >
                          <Music className="w-5 h-5" />
                          <span>توليد الصوت</span>
                      </button>
                  ) : (
                    <button onClick={handleGenerateClick} disabled={isAudioLoading} className="flex-[2] h-12 bg-white border-2 border-slate-100 text-slate-500 rounded-2xl hover:text-indigo-600 hover:border-indigo-300 transition-all font-black text-xs flex items-center justify-center gap-2">
                        <RefreshCw className={`w-3 h-3 ${isAudioLoading ? 'animate-spin' : ''}`} /> 
                        إعادة التوليد
                    </button>
                  )}
                </div>

                {isAudioLoading && (
                    <div className="w-full p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-fade-in shadow-inner">
                        <div className="flex justify-between text-[11px] text-indigo-700 mb-2 font-black tracking-widest uppercase">
                            <span>جاري المعالجة الصوتية...</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-indigo-200/30 rounded-full h-3 overflow-hidden">
                            <div className="bg-indigo-600 h-full transition-all duration-300 ease-out shadow-lg" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                {audioBase64 && !isAudioLoading && (
                     <div className="mt-2 animate-fade-in">
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                            <audio controls src={`data:audio/wav;base64,${audioBase64}`} className="w-full h-10 brightness-95" />
                            <button onClick={() => {
                                const link = document.createElement("a");
                                link.href = `data:audio/wav;base64,${audioBase64}`;
                                link.download = `lesson_audio_${Date.now()}.wav`;
                                link.click();
                            }} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-95 shadow-md"><Download className="w-5 h-5" /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        <div className="flex bg-slate-100/50 p-2 border-b border-slate-100">
          <button onClick={() => setActiveTab(TabOption.ADAPTED)} className={`flex-1 py-3 px-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === TabOption.ADAPTED ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
            <Mic className="w-4 h-4" /> النص المعدل
          </button>
          <button onClick={() => setActiveTab(TabOption.REPORT)} className={`flex-1 py-3 px-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === TabOption.REPORT ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
            <BarChart2 className="w-4 h-4" /> التحليل
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20 flex flex-col gap-4">
        {activeTab === TabOption.ADAPTED && (
          <div className="flex flex-col h-full animate-fade-in gap-3">
             <div className="flex flex-wrap items-center gap-1 p-2 bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-10">
                <button onClick={() => execCommand('bold')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="عريض"><Bold className="w-4 h-4" /></button>
                <button onClick={() => execCommand('italic')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="مائل"><Italic className="w-4 h-4" /></button>
                <button onClick={() => execCommand('underline')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="تحته خط"><Underline className="w-4 h-4" /></button>
                <div className="w-px h-6 bg-slate-200 mx-1" />
                <button onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="يمين"><AlignRight className="w-4 h-4" /></button>
                <button onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="توسط"><AlignCenter className="w-4 h-4" /></button>
                <button onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="يسار"><AlignLeft className="w-4 h-4" /></button>
                <div className="w-px h-6 bg-slate-200 mx-1" />
                <button onClick={() => execCommand('fontSize', '5')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="تكبير"><Type className="w-4 h-4" /></button>
                <button onClick={() => execCommand('removeFormat')} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 mr-auto" title="مسح التنسيقات"><Eraser className="w-4 h-4" /></button>
             </div>

             <div 
                ref={editorRef}
                contentEditable
                className="flex-1 bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 font-serif min-h-[300px] outline-none leading-[2.5] text-xl text-slate-800"
                dir="rtl"
                onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                }}
             />
             <p className="text-[10px] text-slate-400 text-center font-bold">يمكنك التعديل النهائي على السكريبت قبل توليد الصوت.</p>
          </div>
        )}

        {activeTab === TabOption.REPORT && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in" dir="rtl">
            <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-400 uppercase mb-4 border-b border-slate-50 pb-2">اللغات المحددة</h3>
              <ul className="space-y-4">
                <li className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">الكلمات العربية</span>
                  <span className="bg-slate-100 text-slate-700 px-4 py-1 rounded-xl font-black">{result.report.arabicWordCount}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-blue-600 font-bold">المصطلحات الفرنسية</span>
                  <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-xl font-black">{result.report.frenchWords.length}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-rose-600 font-bold">المصطلحات الإنجليزية</span>
                  <span className="bg-rose-100 text-rose-700 px-4 py-1 rounded-xl font-black">{result.report.englishWords.length}</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-400 uppercase mb-4 border-b border-slate-50 pb-2">عناصر علمية</h3>
              {result.report.mathElements.length > 0 ? (
                <div className="flex flex-wrap gap-2">{result.report.mathElements.map((item, idx) => <span key={idx} className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-100 text-sm font-black">{item}</span>)}</div>
              ) : <p className="text-slate-400 italic font-bold text-center py-6">لا توجد رموز رياضية مكتشفة.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};