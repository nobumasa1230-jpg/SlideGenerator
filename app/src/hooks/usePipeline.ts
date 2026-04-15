import { useReducer, useCallback } from 'react';
import type { PipelineState, PipelineStep } from '../types/pipeline';
import * as api from '../lib/api';

type Action =
  | { type: 'START'; memo: string }
  | { type: 'SET_STEP'; step: PipelineStep }
  | { type: 'ANALYZE_DONE'; clientId: string; clientName: string; memoAnalysis: PipelineState['analyzeResult'] }
  | { type: 'DESIGN_DONE'; structure: string; slideCount: number; imageSlideIndices: number[] }
  | { type: 'EVALUATE_DONE'; score: number; passed: boolean; feedback: string; issues: string[] }
  | { type: 'IMAGE_DONE'; slideIndex: number; imageBase64: string; mimeType: string; total: number }
  | { type: 'BUILD_DONE'; json: Record<string, unknown>; slideCount: number }
  | { type: 'SUBMIT_DONE'; url: string; slideCount: number }
  | { type: 'ERROR'; error: string }
  | { type: 'LOG'; message: string };

const initialState: PipelineState = {
  step: 'idle',
  memo: '',
  clientId: null,
  clientName: null,
  analyzeResult: null,
  designResult: null,
  evaluateResult: null,
  evaluateAttempt: 0,
  bestDesign: null,
  images: [],
  imagesTotal: 0,
  buildResult: null,
  submitResult: null,
  error: null,
  logs: [],
};

function reducer(state: PipelineState, action: Action): PipelineState {
  switch (action.type) {
    case 'START':
      return { ...initialState, step: 'analyzing', memo: action.memo, logs: ['パイプライン開始'] };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'ANALYZE_DONE':
      return {
        ...state,
        step: 'designing',
        clientId: action.clientId,
        clientName: action.clientName,
        analyzeResult: action.memoAnalysis,
        logs: [...state.logs, `クライアント検出: ${action.clientName}`],
      };
    case 'DESIGN_DONE':
      return {
        ...state,
        step: 'evaluating',
        designResult: { structure: action.structure, slideCount: action.slideCount, imageSlideIndices: action.imageSlideIndices },
        logs: [...state.logs, `構成案生成完了: ${action.slideCount}枚`],
      };
    case 'EVALUATE_DONE': {
      const attempt = state.evaluateAttempt + 1;
      const currentBest = state.bestDesign;
      const newBest =
        !currentBest || action.score > currentBest.score
          ? { structure: state.designResult?.structure ?? '', score: action.score }
          : currentBest;
      if (action.passed) {
        return {
          ...state,
          step: 'generating-images',
          evaluateResult: { score: action.score, passed: true, feedback: action.feedback, issues: action.issues },
          evaluateAttempt: attempt,
          bestDesign: newBest,
          logs: [...state.logs, `品質評価: ${action.score}点 - 合格`],
        };
      }
      if (attempt >= 3) {
        return {
          ...state,
          step: 'generating-images',
          evaluateResult: { score: action.score, passed: false, feedback: action.feedback, issues: action.issues },
          evaluateAttempt: attempt,
          bestDesign: newBest,
          designResult: state.designResult
            ? { ...state.designResult, structure: newBest.structure }
            : state.designResult,
          logs: [...state.logs, `品質評価: ${action.score}点 - リトライ上限到達、ベスト版で続行`],
        };
      }
      return {
        ...state,
        step: 'designing',
        evaluateResult: { score: action.score, passed: false, feedback: action.feedback, issues: action.issues },
        evaluateAttempt: attempt,
        bestDesign: newBest,
        logs: [...state.logs, `品質評価: ${action.score}点 - リトライ ${attempt}/3`],
      };
    }
    case 'IMAGE_DONE':
      return {
        ...state,
        images: [...state.images, { slideIndex: action.slideIndex, imageBase64: action.imageBase64, mimeType: action.mimeType }],
        imagesTotal: action.total,
        logs: [...state.logs, `画像生成完了: スライド${action.slideIndex + 1}`],
      };
    case 'BUILD_DONE':
      return {
        ...state,
        step: 'submitting',
        buildResult: { json: action.json, slideCount: action.slideCount },
        logs: [...state.logs, `JSON組立完了: ${action.slideCount}枚`],
      };
    case 'SUBMIT_DONE':
      return {
        ...state,
        step: 'done',
        submitResult: { success: true, url: action.url, slideCount: action.slideCount },
        logs: [...state.logs, `スライド生成完了!`],
      };
    case 'ERROR':
      return { ...state, step: 'error', error: action.error, logs: [...state.logs, `エラー: ${action.error}`] };
    case 'LOG':
      return { ...state, logs: [...state.logs, action.message] };
    default:
      return state;
  }
}

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task().then((result) => {
      results.push(result);
    });
    executing.push(p);
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((e) => e === p),
        1
      );
    }
  }
  await Promise.all(executing);
  return results;
}

export function usePipeline() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const start = useCallback(async (memo: string, clientId?: string) => {
    dispatch({ type: 'START', memo });

    try {
      // Step 1: Analyze
      const analyzeResult = await api.analyze({ memo, clientId });
      dispatch({
        type: 'ANALYZE_DONE',
        clientId: analyzeResult.clientId,
        clientName: analyzeResult.clientName,
        memoAnalysis: analyzeResult,
      });

      // Step 2-3: Design + Evaluate loop
      let currentStructure = '';
      let currentImageIndices: number[] = [];
      let feedback: string | undefined;
      let passed = false;
      let attempt = 0;

      while (!passed && attempt < 3) {
        // Step 2: Design
        const designResult = await api.designStructure({
          memo,
          clientId: analyzeResult.clientId,
          feedback,
        });
        currentStructure = designResult.structure;
        currentImageIndices = designResult.imageSlideIndices;
        dispatch({
          type: 'DESIGN_DONE',
          structure: designResult.structure,
          slideCount: designResult.slideCount,
          imageSlideIndices: designResult.imageSlideIndices,
        });

        // Step 3: Evaluate
        const evalResult = await api.evaluate({
          structure: designResult.structure,
          memo,
          clientId: analyzeResult.clientId,
        });
        dispatch({
          type: 'EVALUATE_DONE',
          score: evalResult.score,
          passed: evalResult.passed,
          feedback: evalResult.feedback,
          issues: evalResult.issues,
        });

        if (evalResult.passed) {
          passed = true;
        } else {
          feedback = `スコア: ${evalResult.score}点\nフィードバック: ${evalResult.feedback}\n問題点: ${evalResult.issues.join(', ')}`;
          attempt++;
        }
      }

      // Step 4: Generate images (parallel)
      dispatch({ type: 'SET_STEP', step: 'generating-images' });
      const imageResults: api.GenerateImageResponse[] = [];

      if (currentImageIndices.length > 0) {
        const structureLines = currentStructure.split('\n');
        const slideDesigns: { index: number; instruction: string }[] = [];

        let currentSlideIdx = -1;
        let currentContent = '';
        for (const line of structureLines) {
          const slideMatch = line.match(/###\s*スライド(\d+)/);
          if (slideMatch) {
            if (currentSlideIdx >= 0 && currentImageIndices.includes(currentSlideIdx)) {
              slideDesigns.push({ index: currentSlideIdx, instruction: currentContent.trim() });
            }
            currentSlideIdx = parseInt(slideMatch[1], 10) - 1;
            currentContent = line + '\n';
          } else {
            currentContent += line + '\n';
          }
        }
        if (currentSlideIdx >= 0 && currentImageIndices.includes(currentSlideIdx)) {
          slideDesigns.push({ index: currentSlideIdx, instruction: currentContent.trim() });
        }

        const tasks = slideDesigns.map((sd) => async () => {
          const result = await api.generateImage({
            slideIndex: sd.index,
            designInstruction: sd.instruction,
          });
          dispatch({
            type: 'IMAGE_DONE',
            slideIndex: result.slideIndex,
            imageBase64: result.imageBase64,
            mimeType: result.mimeType,
            total: slideDesigns.length,
          });
          return result;
        });

        const results = await runWithConcurrency(tasks, 3);
        imageResults.push(...results);
      }

      // Step 5: Build JSON
      dispatch({ type: 'SET_STEP', step: 'building-json' });
      const buildResult = await api.buildJson({
        structure: currentStructure,
        images: imageResults.map((r) => ({ slideIndex: r.slideIndex, base64: r.imageBase64, mime: r.mimeType })),
        clientId: analyzeResult.clientId,
      });
      dispatch({ type: 'BUILD_DONE', json: buildResult.json, slideCount: buildResult.slideCount });

      // Step 6: Submit to GAS
      const submitResult = await api.submitSlides({ json: buildResult.json });
      if (submitResult.success) {
        dispatch({ type: 'SUBMIT_DONE', url: submitResult.url, slideCount: submitResult.slideCount });
      } else {
        dispatch({ type: 'ERROR', error: 'GASからのスライド生成に失敗しました' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      dispatch({ type: 'ERROR', error: message });
    }
  }, []);

  return { state, start };
}
