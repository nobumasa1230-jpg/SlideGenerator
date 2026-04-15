import { MemoInput } from '../components/MemoInput';
import { PipelineProgress } from '../components/PipelineProgress';
import { usePipeline } from '../hooks/usePipeline';

export function Home() {
  const { state, start } = usePipeline();
  const isRunning = state.step !== 'idle' && state.step !== 'done' && state.step !== 'error';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">
            <span className="text-amber-400">Slide</span>Generator
          </h1>
          <span className="text-xs text-gray-500">Powered by Gemini + Google Slides</span>
        </div>
      </header>

      <main className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {state.step === 'idle' && (
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3">
                メモから<span className="text-amber-400">スライド</span>を自動生成
              </h2>
              <p className="text-gray-400">
                メモや指示を入力するだけで、構成設計・画像生成・スライド出力まで全自動で実行します
              </p>
            </div>
          )}

          <MemoInput
            onSubmit={(memo, clientId) => start(memo, clientId)}
            disabled={isRunning}
          />

          <PipelineProgress state={state} />
        </div>
      </main>
    </div>
  );
}
