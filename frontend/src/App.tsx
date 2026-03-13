import { useRouteOptimizer } from './hooks/useRouteOptimizer';
import { AddressForm } from './features/route-planner/AddressForm';
import { LiveLogs } from './features/route-planner/LiveLogs';
import { RouteMap } from './features/route-planner/RouteMap';
import { RouteResults } from './features/route-planner/RouteResults';
import { Truck, ArrowLeft } from 'lucide-react';

function App() {
  const {
    origin,
    stops,
    isLoading,
    result,
    failedAddresses,
    logs,
    error,
    setOrigin,
    addStop,
    removeStop,
    runOptimization,
    replaceFailedAndRerun,
    loadExample,
    resetResults,
    reorderStop,
    removeResultStop,
  } = useRouteOptimizer();

  const hasResult = result && result.length > 0;

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden">

      {/* ── Header ── */}
      <header className="no-print bg-white border-b border-slate-200 z-50 shadow-sm flex-shrink-0">
        <div className="h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {hasResult && (
              <button
                onClick={resetResults}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Nova Rota
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="bg-brand-500 p-2 rounded-xl">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                DeliverEase
              </span>
            </div>
          </div>
          <span className="text-sm text-slate-400 font-medium">Otimizador de Rotas</span>
        </div>
      </header>

      {/* ── Main ── */}
      {!hasResult ? (

        /* ── Form + Logs view ── */
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5">
              <AddressForm
                origin={origin}
                stops={stops}
                error={error}
                setOrigin={setOrigin}
                addStop={addStop}
                removeStop={removeStop}
                loadExample={loadExample}
                runOptimization={runOptimization}
                isLoading={isLoading}
                onImport={(addresses) => addresses.forEach(addStop)}
              />
            </div>
            <div className="lg:col-span-7 lg:sticky lg:top-4" style={{ height: '600px' }}>
              <LiveLogs logs={logs} />
            </div>
          </div>
        </main>

      ) : (

        /* ── Result view: map (left) + results panel (right) ── */
        <main className="flex-1 flex overflow-hidden no-print-layout">

          {/* Map — 60% */}
          <div className="no-print" style={{ flex: '3', minWidth: 0 }}>
            <RouteMap result={result} className="h-full w-full" />
          </div>

          {/* Results panel — 40% */}
          <div style={{ flex: '2', minWidth: '320px', maxWidth: '480px' }} className="border-l border-slate-200 overflow-hidden bg-white flex flex-col">
            <RouteResults
              result={result}
              logs={logs}
              failedAddresses={failedAddresses}
              reorderStop={reorderStop}
              removeResultStop={removeResultStop}
              replaceFailedAndRerun={replaceFailedAndRerun}
            />
          </div>

        </main>
      )}
    </div>
  );
}

export default App;
