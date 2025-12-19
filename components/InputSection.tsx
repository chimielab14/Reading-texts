import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Languages, FileText, Upload, AlertCircle, RefreshCw, Check, MousePointer2, Sparkles, Loader2 } from 'lucide-react';
import { extractFromDocument, extractNonArabicTokens, classifyTokens } from '../services/geminiService';

interface InputSectionProps {
  text: string;
  setText: (s: string) => void;
  frenchList: string;
  setFrenchList: (s: string) => void;
  englishList: string;
  setEnglishList: (s: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({
  text,
  setText,
  frenchList,
  setFrenchList,
  englishList,
  setEnglishList,
  onAnalyze,
  isLoading,
}) => {
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const [detectedTokens, setDetectedTokens] = useState<string[]>([]);
  const [frenchSelection, setFrenchSelection] = useState<Set<string>>(new Set());
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    if (editorRef.current && text !== editorRef.current.innerText) {
      updateEditorHighlighting(text);
    }
  }, [text]);

  useEffect(() => {
    if (hasScanned) {
      updateEditorHighlighting(text);
    }
  }, [frenchList, englishList, hasScanned]);

  const updateEditorHighlighting = (rawText: string) => {
    if (!editorRef.current) return;
    
    if (!hasScanned) {
      editorRef.current.innerText = rawText;
      return;
    }

    const french = new Set(frenchList.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
    const english = new Set(englishList.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
    
    const parts = rawText.split(/([a-zA-Z\u00C0-\u024F]+)/g);
    const html = parts.map(part => {
      const lower = part.toLowerCase();
      if (french.has(lower)) {
        return `<span style="color: #2563eb; font-weight: bold;">${part}</span>`;
      }
      if (english.has(lower)) {
        return `<span style="color: #e11d48; font-weight: bold;">${part}</span>`;
      }
      return part;
    }).join('');

    editorRef.current.innerHTML = html;
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.innerText;
    setText(newText);
  };

  const handleScanText = async () => {
    if (!text.trim()) return;
    setIsScanning(true);
    setHasScanned(true);

    try {
      const tokens = extractNonArabicTokens(text);
      setDetectedTokens(tokens);
      
      // استخدام الذكاء الاصطناعي لتصنيف الكلمات بدقة
      const classification = await classifyTokens(text, tokens);
      
      const newSelection = new Set<string>();
      classification.french.forEach(t => newSelection.add(t));
      
      setFrenchSelection(newSelection);
      updateParentLists(tokens, newSelection);
    } catch (error) {
      console.error("Scan error", error);
    } finally {
      setIsScanning(false);
    }
  };

  const updateParentLists = (tokens: string[], currentFrenchSelection: Set<string>) => {
    const french = tokens.filter(t => currentFrenchSelection.has(t));
    const english = tokens.filter(t => !currentFrenchSelection.has(t));
    setFrenchList(french.join(', '));
    setEnglishList(english.join(', '));
  };

  const toggleTokenLanguage = (token: string) => {
    const newSelection = new Set<string>(frenchSelection);
    if (newSelection.has(token)) {
        newSelection.delete(token);
    } else {
        newSelection.add(token);
    }
    setFrenchSelection(newSelection);
    updateParentLists(detectedTokens, newSelection);
  };

  const setAllLanguage = (isFrench: boolean) => {
    const newSelection = isFrench ? new Set<string>(detectedTokens) : new Set<string>();
    setFrenchSelection(newSelection);
    updateParentLists(detectedTokens, newSelection);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
        const result = await extractFromDocument(file);
        setText(result.fullText);
        setFrenchList(result.frenchWords.join(', '));
        setEnglishList(result.englishWords.join(', '));
        setHasScanned(true);
        // تحديث حالة الاختيارات بناءً على استخراج AI
        const newSelection = new Set<string>(result.frenchWords);
        setFrenchSelection(newSelection);
        setDetectedTokens(extractNonArabicTokens(result.fullText));
        setInputMode('text');
    } catch (error: any) {
        setUploadError(error.message || 'حدث خطأ أثناء معالجة الملف.');
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden h-full flex flex-col transition-all">
      <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col gap-5">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-800">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h2 className="font-extrabold text-lg">محتوى الدرس</h2>
            </div>
            <div className="flex bg-slate-200/60 p-1.5 rounded-xl border border-slate-300/30">
                <button
                    onClick={() => setInputMode('text')}
                    disabled={isLoading || isUploading}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2
                        ${inputMode === 'text' 
                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' 
                            : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <FileText className="w-4 h-4" />
                    نص حر
                </button>
                <button
                    onClick={() => setInputMode('file')}
                    disabled={isLoading || isUploading}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2
                        ${inputMode === 'file' 
                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' 
                            : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <Upload className="w-4 h-4" />
                    استخراج
                </button>
            </div>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-white">
        {inputMode === 'file' ? (
             <div className="h-full flex flex-col items-center justify-center border-3 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 p-10 transition-all hover:bg-slate-50 hover:border-indigo-400 group">
                <input 
                    type="file" 
                    accept=".pdf, .jpg, .jpeg, .png"
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
                {isUploading ? (
                    <div className="text-center space-y-6">
                        <div className="relative inline-block">
                             <div className="h-20 w-20 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                             <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                             </div>
                        </div>
                        <h3 className="text-xl font-black text-slate-800">جاري مسح المستند...</h3>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto font-medium">تحويل الصور إلى نصوص وتصنيف اللغات آلياً.</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-6 rounded-3xl mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-500">
                            <Upload className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">ارفع ملفك التعليمي</h3>
                        <p className="text-slate-500 text-center mb-8 max-w-sm leading-relaxed">يدعم PDF والصور الممسوحة ضوئياً.</p>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3.5 rounded-2xl font-black text-lg transition-all active:translate-y-1"
                        >
                            اختيار ملف
                        </button>
                        {uploadError && (
                            <div className="mt-8 flex items-center gap-3 text-rose-600 bg-rose-50 px-5 py-3 rounded-2xl text-sm font-bold border border-rose-100">
                                <AlertCircle className="w-5 h-5" />
                                {uploadError}
                            </div>
                        )}
                    </>
                )}
             </div>
        ) : (
            <>
                <div className="space-y-3 group">
                    <div className="flex justify-between items-center">
                        <label className="block text-sm font-black text-slate-700">سكريبت الدرس</label>
                        {hasScanned && (
                          <div className="flex gap-4 text-[10px] font-bold">
                            <span className="text-blue-600">● فرنسي</span>
                            <span className="text-rose-600">● إنجليزي</span>
                          </div>
                        )}
                    </div>
                    <div 
                        ref={editorRef}
                        contentEditable
                        onInput={handleInput}
                        className="w-full h-64 p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all overflow-y-auto text-right font-serif leading-loose text-xl shadow-inner outline-none"
                        dir="rtl"
                        placeholder="اكتب نص الدرس هنا..."
                    />
                </div>

                <div className="space-y-4 border-t-2 border-slate-50 pt-6">
                    <div className="flex items-center justify-between">
                         <label className="flex items-center gap-2 text-sm font-black text-slate-800">
                            <Languages className="w-5 h-5 text-indigo-600" />
                            فرز المصطلحات اللاتينية
                        </label>
                        <button 
                            onClick={handleScanText}
                            disabled={isScanning || !text.trim()}
                            className="text-[11px] font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all border border-indigo-100 disabled:opacity-50"
                        >
                            {isScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            فحص ذكي (AI)
                        </button>
                    </div>

                    {!hasScanned && detectedTokens.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30 flex flex-col items-center gap-3">
                            <MousePointer2 className="w-8 h-8 text-slate-300" />
                            <p className="text-sm font-bold text-slate-400">اضغط على "فحص ذكي" للبدء بتصنيف الكلمات تلقائياً.</p>
                        </div>
                    ) : (
                        <div className="animate-fade-in space-y-4 bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
                            {isScanning ? (
                                <div className="py-10 text-center space-y-4">
                                    <div className="flex justify-center"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin" /></div>
                                    <p className="text-xs font-black text-slate-500">جاري تحليل اللغات وتصنيف الكلمات...</p>
                                </div>
                            ) : (
                                <>
                                    {detectedTokens.length > 0 && (
                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1 mb-2">
                                            <span>قم بتحديد الحروف و الكلمات الفرنسية</span>
                                            <div className="flex gap-4">
                                                <button onClick={() => setAllLanguage(false)} className="hover:text-rose-600 transition-colors">الكل إنجليزي</button>
                                                <button onClick={() => setAllLanguage(true)} className="hover:text-blue-600 transition-colors">الكل فرنسي</button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2.5 max-h-52 overflow-y-auto p-1">
                                        {detectedTokens.length === 0 ? (
                                            <div className="w-full text-center py-4 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm font-bold italic">
                                                لا توجد كلمات لاتينية مكتشفة.
                                            </div>
                                        ) : (
                                            detectedTokens.map((token, idx) => {
                                                const isFrench = frenchSelection.has(token);
                                                return (
                                                    <button
                                                        key={`${token}-${idx}`}
                                                        onClick={() => toggleTokenLanguage(token)}
                                                        className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition-all flex items-center gap-2
                                                        ${isFrench 
                                                            ? 'bg-blue-600 border-blue-500 text-white shadow-md' 
                                                            : 'bg-white border-slate-100 text-slate-600 hover:border-rose-400 hover:text-rose-600 shadow-sm'
                                                        }`}
                                                    >
                                                        {isFrench && <Check className="w-3 h-3" />}
                                                        {token}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                    {detectedTokens.length > 0 && (
                                        <p className="text-[9px] text-slate-400 font-bold italic text-center">
                                            * الكلمات التي لا يتم تحديدها سيتم نطقها بالإنجليزية تلقائياً.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </>
        )}
      </div>

      <div className="p-5 bg-white border-t border-slate-100">
        <button
          onClick={onAnalyze}
          disabled={isLoading || isUploading || !text.trim()}
          className={`w-full py-4 px-8 rounded-2xl text-white font-black text-xl shadow-xl transition-all flex items-center justify-center gap-4
            ${(isLoading || isUploading)
              ? 'bg-slate-300 cursor-not-allowed shadow-none' 
              : 'bg-gradient-to-r from-indigo-600 to-blue-700 hover:shadow-indigo-200 active:scale-[0.98]'
            }`}
        >
          {isLoading ? (
            <><div className="h-6 w-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>جاري المعالجة...</>
          ) : (
            <><Sparkles className="w-6 h-6" />تحليل وتكييف النص</>
          )}
        </button>
      </div>
    </div>
  );
};
