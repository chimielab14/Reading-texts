export interface AnalysisReport {
  arabicWordCount: number;
  frenchWords: string[];
  englishWords: string[];
  mathElements: string[];
}

export interface AdaptedContent {
  originalText: string;
  adaptedScript: string;
  report: AnalysisReport;
}

export interface AppState {
  inputText: string;
  frenchList: string;
  englishList: string;
  selectedVoice: string;
  audioSpeed: number;
  isLoading: boolean;
  isAudioLoading: boolean;
  isPreviewLoading: boolean;
  error: string | null;
  result: AdaptedContent | null;
  audioBase64: null | string;
}

export enum TabOption {
  ADAPTED = 'adapted',
  REPORT = 'report',
}