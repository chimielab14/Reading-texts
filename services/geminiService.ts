import { GoogleGenAI, Modality } from "@google/genai";
import { AdaptedContent, AnalysisReport } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper Functions ---

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const addWavHeader = (pcmData: ArrayBuffer, sampleRate: number = 24000) => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const numChannels = 1;
  const bitsPerSample = 16;
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.byteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.byteLength, true);
  const wavFile = new Uint8Array(header.byteLength + pcmData.byteLength);
  wavFile.set(new Uint8Array(header), 0);
  wavFile.set(new Uint8Array(pcmData), header.byteLength);
  return wavFile.buffer;
};

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const extractNonArabicTokens = (text: string): string[] => {
  const regex = /[a-zA-Z\u00C0-\u024F]+/g;
  const matches = text.match(regex);
  if (!matches) return [];
  
  const uniqueSet = new Set<string>();
  const result: string[] = [];
  matches.forEach(word => {
    if (!uniqueSet.has(word)) { 
      uniqueSet.add(word);
      result.push(word);
    }
  });
  return result.sort((a, b) => a.localeCompare(b));
};

const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

// --- Main Service Functions ---

const SYSTEM_INSTRUCTION = `
أنت خبير لغوي أكاديمي متخصص في الأنظمة التعليمية التي تجمع بين العربية والفرنسية والإنجليزية.
مهمتك الأساسية هي تكييف النص التعليمي ليصبح سكريبت جاهز للإلقاء الصوتي.
يجب الحفاظ على الكلمات الأجنبية (اللاتينية) كما هي، مع تشكيل الكلمات العربية بدقة (Tashkeel).
`;

/**
 * دالة ذكية لتصنيف الكلمات اللاتينية المكتشفة بناءً على السياق
 */
export const classifyTokens = async (text: string, tokens: string[]): Promise<{ french: string[], english: string[] }> => {
  if (tokens.length === 0) return { french: [], english: [] };
  
  try {
    const prompt = `
    Context: Analysis of Latin terms in an Arabic educational lesson.
    Task: Classify each token in the list as either "french" or "english".
    Linguistic Rules:
    1. Words with French accents (é, à, è, ê, ç, etc.) are ALWAYS French.
    2. Scientific terms in North African context are often French (e.g., "Structure", "Information" in a French-medium science context).
    3. Look at the full text to determine the dominant second language.
    
    Full Text: "${text}"
    Tokens to classify: [${tokens.join(', ')}]
    
    Return ONLY JSON: { "french": ["word1", "word2"], "english": ["word3"] }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    const result = JSON.parse(response.text || '{"french":[], "english":[]}');
    return {
      french: result.french || [],
      english: result.english || []
    };
  } catch (e) {
    console.error("Classification error", e);
    return { french: [], english: tokens }; // Fallback to english
  }
};

export const processText = async (
  text: string,
  frenchList: string,
  englishList: string
): Promise<AdaptedContent> => {
  try {
    const prompt = `القوائم المحددة لتمييز النطق: 
    فرنسية: [${frenchList}] 
    إنجليزية: [${englishList}] 
    
    النص الأصلي: """${text}"""`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION, 
        responseMimeType: "application/json" 
      },
    });
    
    const json = JSON.parse(response.text || "{}");
    
    const frenchWords = frenchList.split(',').map(s => s.trim()).filter(Boolean);
    const englishWords = englishList.split(',').map(s => s.trim()).filter(Boolean);

    return {
      originalText: text,
      adaptedScript: json.adaptedScript || text, 
      report: {
        arabicWordCount: json.arabicWordCount || text.split(/[\s\p{P}]+/u).filter(w => /^[\u0600-\u06FF]+$/.test(w)).length,
        frenchWords: frenchWords,
        englishWords: englishWords,
        mathElements: json.mathElements || [],
      },
    };
  } catch (error) {
    throw new Error("فشل في تحليل النص.");
  }
};

export const extractFromDocument = async (file: File): Promise<{
    fullText: string;
    frenchWords: string[];
    englishWords: string[];
}> => {
    try {
        const filePart = await fileToGenerativePart(file);
        const prompt = `Extract text with diacritics. Identify Latin terms and classify them into frenchWords or englishWords based on linguistic patterns. Return JSON {fullText, frenchWords, englishWords}`;
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview", 
            contents: { parts: [filePart, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        throw new Error("فشل في قراءة الملف.");
    }
}

export const generateAudio = async (
  script: string, 
  voiceName: string = 'Zephyr',
  frenchWords: string[] = [],
  englishWords: string[] = [],
  speed: number = 1.0
): Promise<string> => {
  try {
    const cleanScript = stripHtml(script);
    
    let toneInstruction = "Professional academic narrator.";
    
    if (voiceName === 'Zephyr' || voiceName === 'Charon') {
      toneInstruction = "Calm, wise, elderly professor with a deep and authoritative yet gentle voice.";
    } else if (voiceName === 'Fenrir') {
      toneInstruction = "Strong, energetic, and inspiring younger professor.";
    }

    // تعليمات السرعة الدقيقة
    const speedDescription = speed === 1.0 ? "natural" : speed > 1.0 ? "fast and energetic" : "slow and deliberate";
    const speedInstruction = `Pace: Read at a ${speedDescription} tempo (Target speed factor: ${speed}x). Maintain consistent rhythm according to this factor.`;

    const instructions = `
    Role: ${toneInstruction}
    ${speedInstruction}
    
    STRICT LANGUAGE RULES (PHONETICS):
    1. FRENCH LIST: The following words and letters MUST be pronounced with a PURE FRENCH ACCENT (e.g., Parisian French). DO NOT use English pronunciation for them, even if they share spelling with English.
       Words: [${frenchWords.join(', ')}]
       Phonetic Hint: Ensure the 'r' is uvular (/ʁ/) and 'u' is high front rounded (/y/).
    
    2. ENGLISH LIST: The following words MUST be pronounced with a clear standard English accent.
       Words: [${englishWords.join(', ')}]
    
    3. ARABIC: Read the Arabic text with absolute precision according to the Tashkeel (diacritics) provided.
    
    Boundary Rule: When switching between these lists, maintain the distinct phonetic identity of each language without blending accents.
    
    Script: """${cleanScript}"""
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: instructions }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { 
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName: voiceName } 
          } 
        },
      },
    });

    const base64PCM = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64PCM) throw new Error("لم يتم استلام صوت.");

    const pcmBuffer = base64ToArrayBuffer(base64PCM);
    const wavBuffer = addWavHeader(pcmBuffer, 24000); 
    return arrayBufferToBase64(wavBuffer);
  } catch (error) {
    throw new Error("خطأ في توليد الصوت.");
  }
};