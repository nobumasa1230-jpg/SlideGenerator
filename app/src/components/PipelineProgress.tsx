import type { PipelineState } from '../types/pipeline';

interface Props {
  state: PipelineState;
}

const STEPS = [
  { key: 'analyzing', label: 'メモ解析', icon: '1' },
  { key: 'designing', label: '構成設計', icon: '2' },
  { key: 'evaluating', label: '品質評価', icon: '3' },
  { key: 'generating-images', label: '画像生成', icon: '4' },
  { key: 'building-json', label: 'JSON組立', icon: '5' },
  { key: 'submitting', label: 'スライド出力', icon: '6' },
] as const;

function getStepStatus(
  stepKey: string,
  currentStep: string
): 'completed' | 'active' | 'pending' {
  const stepOrder = STEPS.map((s) => s.key);
  const currentIdx = stepOrder.indexOf(currentStep as typeof STEPS[number]['key']);
  const stepIdx = stepOrder.indexOf(stepKey as typeof STEPS[number]['key']);

  if (currentStep === 'done' || currentStep === 'error') {
    if (currentStep === 'done') return 'completed';
    return stepIdx <= currentIdx ? 'completed' : 'pending';
  }
  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

export function PipelineProgress({ state }: Props) {
  const { step, evaluateAttempt, evaluateResult, images, imagesTotal, logs } = state;

  if (step === 'idle') return null;

  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => {
          const status = getStepStatus(s.key, step);
          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    status === 'completed'
                      ? 'bg-green-500 text-white'
                      : status === 'active'
                        ? 'bg-amber-500 text-gray-900 animate-pulse'
                        : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {status === 'completed' ? '\u2713' : s.icon}
                </div>
                <span
                  className={`mt-1 text-xs ${
                    status === 'active' ? 'text-amber-400 font-medium' : status === 'completed' ? 'text-green-400' : 'text-gray-500'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 mt-[-16px] ${
                    getStepStatus(STEPS[i + 1].key, step) !== 'pending' ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Status details */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        {step === 'evaluating' && evaluateResult && !evaluateResult.passed && (
          <div className="mb-3 text-sm">
            <span className="text-amber-400">品質スコア: {evaluateResult.score}点</span>
            <span className="text-gray-400 ml-2">(リトライ {evaluateAttempt}/3)</span>
            {evaluateResult.feedback && (
              <p className="text-gray-400 mt-1">{evaluateResult.feedback}</p>
            )}
          </div>
        )}

        {step === 'generating-images' && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-300">画像生成中</span>
              <span className="text-amber-400">
                {images.length} / {imagesTotal || '?'} 枚
              </span>
            </div>
            {imagesTotal > 0 && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(images.length / imagesTotal) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {step === 'done' && state.submitResult && (
          <div className="text-center">
            <p className="text-green-400 text-lg font-bold mb-2">生成完了!</p>
            <a
              href={state.submitResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Google Slides を開く
            </a>
            <p className="text-gray-400 text-sm mt-2">{state.submitResult.slideCount}枚のスライド</p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-red-400">
            <p className="font-bold">エラーが発生しました</p>
            <p className="text-sm mt-1">{state.error}</p>
          </div>
        )}

        {/* Logs */}
        <div className="mt-4 max-h-40 overflow-y-auto">
          {logs.map((log, i) => (
            <p key={i} className="text-xs text-gray-500 font-mono">
              {log}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
