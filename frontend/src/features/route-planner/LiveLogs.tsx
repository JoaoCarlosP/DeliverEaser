import React, { useEffect, useRef } from 'react';
import type { WebSocketLogEvent } from '../../types';
import { Terminal, CheckCircle2, AlertTriangle, Play, XCircle, Info, Database } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  logs: WebSocketLogEvent[];
}

export const LiveLogs: React.FC<Props> = ({ logs }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const renderIcon = (type: string, iconStr?: string) => {
    switch (type) {
      case 'start':        return <Play className="w-4 h-4 text-brand-400" />;
      case 'node_start':   return <span className="text-base leading-none">{iconStr || '⚙️'}</span>;
      case 'node_success': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'log_warning':  return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'log_error':    return <XCircle className="w-4 h-4 text-red-500" />;
      case 'log_info':     return <Info className="w-4 h-4 text-blue-400" />;
      case 'log_data':     return <Database className="w-4 h-4 text-purple-400" />;
      case 'end':          return <CheckCircle2 className="w-4 h-4 text-brand-400" />;
      default:             return <Terminal className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="bg-[#0f172a] rounded-3xl shadow-xl overflow-hidden flex flex-col h-full border border-slate-800">

      {/* Cabeçalho estilo macOS */}
      <div className="bg-[#1e293b] px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
          <Terminal className="w-3 h-3" />
          Logs de Execução
        </span>
        <div className="w-16 text-right">
          {logs.length > 0 ? (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">AO VIVO</span>
          ) : (
            <span className="text-[10px] bg-slate-700/50 text-slate-500 px-2 py-0.5 rounded-full font-bold">PARADO</span>
          )}
        </div>
      </div>

      {/* Área de logs */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1.5 scrollbar-hide text-slate-300"
      >
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-3">
            <Terminal className="w-10 h-10 opacity-50" />
            <p>Aguardando execução do pipeline...</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className={clsx(
                "flex items-start gap-3 p-1.5 rounded bg-transparent transition-colors",
                log.type === 'node_start'   && "mt-4 bg-slate-800/50 border border-slate-700/50",
                log.type === 'node_success' && "text-emerald-400",
                log.type === 'log_warning'  && "text-amber-400 bg-amber-500/10",
                log.type === 'log_error'    && "text-red-400 bg-red-500/10"
              )}
            >
              <div className="mt-0.5 shrink-0">
                {renderIcon(log.type, log.data?.icon)}
              </div>
              <div className="flex-1 break-words">
                {log.type === 'node_start' && (
                  <span className="font-bold text-white">
                    Etapa {log.data.step}: {log.data.node_name}
                  </span>
                )}
                {log.type === 'log_info' && (
                  <span className="text-slate-400">
                    <span className="text-slate-500 text-xs mr-2">[{log.data.timestamp}]</span>
                    {log.data.message}
                  </span>
                )}
                {log.type === 'log_data' && (
                  <span className="text-brand-300">
                    <span className="text-brand-400 font-semibold">{log.data.key}:</span> {log.data.value}
                  </span>
                )}
                {log.type === 'start' && (
                  <span className="text-slate-300 font-semibold">🚀 {log.data.workflow_name}</span>
                )}
                {log.type === 'end' && (
                  <span className="text-emerald-400 font-semibold">✓ Pipeline concluído com sucesso</span>
                )}
                {log.type === 'node_success' && (
                  <span>
                    {!log.data.message || log.data.message === 'Completed successfully'
                      ? '✓ Etapa concluída'
                      : log.data.message}
                  </span>
                )}
                {log.type === 'log_warning' && (
                  <span>⚠ {log.data.message}</span>
                )}
                {log.type === 'log_error' && (
                  <span>✗ {log.data.message}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
