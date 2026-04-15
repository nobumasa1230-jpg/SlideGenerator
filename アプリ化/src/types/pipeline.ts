export type PipelineStep =
  | 'idle'
  | 'analyzing'
  | 'designing'
  | 'evaluating'
  | 'generating-images'
  | 'building-json'
  | 'submitting'
  | 'done'
  | 'error';

export interface AnalyzeResult {
  clientId: string;
  clientName: string;
  memoAnalysis: {
    topic: string;
    estimatedSlides: number;
    suggestedImageCount: number;
  };
}

export interface DesignResult {
  structure: string;
  slideCount: number;
  imageSlideIndices: number[];
}

export interface EvaluateResult {
  score: number;
  passed: boolean;
  feedback: string;
  issues: string[];
}

export interface GenerateImageResult {
  slideIndex: number;
  imageBase64: string;
  mimeType: string;
}

export interface BuildJsonResult {
  json: Record<string, unknown>;
  slideCount: number;
}

export interface SubmitResult {
  success: boolean;
  url: string;
  slideCount: number;
}

export interface PipelineState {
  step: PipelineStep;
  memo: string;
  clientId: string | null;
  clientName: string | null;
  analyzeResult: AnalyzeResult | null;
  designResult: DesignResult | null;
  evaluateResult: EvaluateResult | null;
  evaluateAttempt: number;
  bestDesign: { structure: string; score: number } | null;
  images: GenerateImageResult[];
  imagesTotal: number;
  buildResult: BuildJsonResult | null;
  submitResult: SubmitResult | null;
  error: string | null;
  logs: string[];
}
