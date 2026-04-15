const API_BASE = '/api';

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

export interface AnalyzeRequest {
  memo: string;
  clientId?: string;
}

export interface AnalyzeResponse {
  clientId: string;
  clientName: string;
  memoAnalysis: {
    topic: string;
    estimatedSlides: number;
    suggestedImageCount: number;
  };
}

export function analyze(req: AnalyzeRequest) {
  return post<AnalyzeResponse>('analyze', req);
}

export interface DesignRequest {
  memo: string;
  clientId: string;
  feedback?: string;
}

export interface DesignResponse {
  structure: string;
  slideCount: number;
  imageSlideIndices: number[];
}

export function designStructure(req: DesignRequest) {
  return post<DesignResponse>('design-structure', req);
}

export interface EvaluateRequest {
  structure: string;
  memo: string;
  clientId: string;
}

export interface EvaluateResponse {
  score: number;
  passed: boolean;
  feedback: string;
  issues: string[];
}

export function evaluate(req: EvaluateRequest) {
  return post<EvaluateResponse>('evaluate', req);
}

export interface GenerateImageRequest {
  slideIndex: number;
  designInstruction: string;
  themeColors?: { primary?: string; accent?: string; background?: string };
}

export interface GenerateImageResponse {
  slideIndex: number;
  imageBase64: string;
  mimeType: string;
}

export function generateImage(req: GenerateImageRequest) {
  return post<GenerateImageResponse>('generate-image', req);
}

export interface BuildJsonRequest {
  structure: string;
  images: { slideIndex: number; base64: string; mime: string }[];
  clientId: string;
}

export interface BuildJsonResponse {
  json: Record<string, unknown>;
  slideCount: number;
}

export function buildJson(req: BuildJsonRequest) {
  return post<BuildJsonResponse>('build-json', req);
}

export interface SubmitRequest {
  json: Record<string, unknown>;
}

export interface SubmitResponse {
  success: boolean;
  url: string;
  slideCount: number;
}

export function submitSlides(req: SubmitRequest) {
  return post<SubmitResponse>('submit-slides', req);
}
