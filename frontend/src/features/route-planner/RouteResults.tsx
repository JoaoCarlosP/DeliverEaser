import React, { useState } from 'react';
import {
  Navigation, MapPin, ExternalLink, FileText, Flag,
  Trash2, List, Terminal, AlertTriangle, RefreshCw, GripVertical
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { RouteLocation, WebSocketLogEvent } from '../../types';
import { LiveLogs } from './LiveLogs';
import clsx from 'clsx';

interface Props {
  result: RouteLocation[];
  logs: WebSocketLogEvent[];
  failedAddresses: string[];
  reorderStop: (from: number, to: number) => void;
  removeResultStop: (index: number) => void;
  replaceFailedAndRerun: (fixes: Record<string, string>) => void;
}

function buildFullRouteUrl(stops: RouteLocation[]): string {
  if (stops.length === 0) return '#';
  if (stops.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${stops[0].lat},${stops[0].lng}`;
  }
  const origin = `${stops[0].lat},${stops[0].lng}`;
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  const waypoints = stops.slice(1, -1).map(s => `${s.lat},${s.lng}`).join('|');
  const base = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  return waypoints ? `${base}&waypoints=${waypoints}` : base;
}

function mapsUrl(stop: RouteLocation) {
  return `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`;
}

function wazeUrl(stop: RouteLocation) {
  return `https://waze.com/ul?ll=${stop.lat},${stop.lng}&navigate=yes`;
}

function generatePDF(result: RouteLocation[], totalDistance: string | null) {
  const now = new Date().toLocaleString('pt-BR');
  const totalStops = result.filter(s => s.type === 'stop').length;

  const rows = result.map(stop => {
    const isOrigin = stop.type === 'origin';
    const isLast = !isOrigin && stop.sequence === result.filter(s => s.type === 'stop').length;
    const seqLabel = isOrigin ? '★' : String(stop.sequence);
    const typeLabel = isOrigin ? 'Ponto de Saída' : isLast ? 'Parada Final' : `Parada ${stop.sequence}`;
    const rowBg = isOrigin ? '#1e293b' : isLast ? '#059669' : '#0ea5e9';
    const maps = `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`;
    const waze = `https://waze.com/ul?ll=${stop.lat},${stop.lng}&navigate=yes`;
    return `
      <tr>
        <td style="text-align:center;padding:5px 8px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${rowBg};color:#fff;font-weight:700;font-size:11px;">${seqLabel}</span>
        </td>
        <td style="padding:5px 8px;font-size:11px;color:#1e293b;">${stop.address}</td>
        <td style="padding:5px 8px;font-size:10px;color:#64748b;white-space:nowrap;">${typeLabel}</td>
        <td style="padding:5px 8px;white-space:nowrap;">
          <a href="${maps}" style="font-size:10px;color:#0284c7;text-decoration:none;margin-right:6px;">📍 Maps</a>
          <a href="${waze}" style="font-size:10px;color:#33ccff;text-decoration:none;">🚗 Waze</a>
        </td>
      </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Rota Otimizada — DeliverEase</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; color: #1e293b; background: #fff; }
    @page { size: A4; margin: 12mm 15mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; margin-bottom: 12px; }
    .brand { display: flex; align-items: center; gap: 8px; }
    .brand-dot { width: 28px; height: 28px; background: #0ea5e9; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 14px; }
    .brand-name { font-size: 18px; font-weight: 800; color: #0284c7; }
    .meta { font-size: 10px; color: #64748b; text-align: right; line-height: 1.6; }
    .badges { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
    .badge-blue { background: #e0f2fe; color: #0284c7; }
    .badge-slate { background: #f1f5f9; color: #475569; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f8fafc; }
    th { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; padding: 6px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    td { border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-dot">D</div>
      <span class="brand-name">DeliverEase</span>
    </div>
    <div class="meta">
      Rota Otimizada<br/>
      Gerado em: ${now}
    </div>
  </div>
  <div class="badges">
    <span class="badge badge-blue">${totalStops} parada${totalStops !== 1 ? 's' : ''}</span>
    ${totalDistance ? `<span class="badge badge-slate">~${totalDistance}</span>` : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:40px;">Seq.</th>
        <th>Endereço</th>
        <th>Tipo</th>
        <th>Navegar</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Gerado por DeliverEase — Route Optimizer Pro</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

// ── Stop card UI (sem hooks de sortable — usável dentro do DragOverlay) ──────

interface StopCardProps {
  stop: RouteLocation;
  index: number;
  isLast: boolean;
  onRemove: () => void;
  dragHandleProps?: {
    attributes: Record<string, any>;
    listeners: Record<string, any> | undefined;
  };
}

const StopCard: React.FC<StopCardProps> = ({ stop, isLast, onRemove, dragHandleProps }) => (
  <div className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 hover:border-brand-200 hover:bg-slate-50/50 transition-colors bg-white">

    {/* Drag handle */}
    <button
      {...(dragHandleProps?.attributes ?? {})}
      {...(dragHandleProps?.listeners ?? {})}
      className={clsx(
        'mt-1 flex-shrink-0 text-slate-300 transition-colors',
        dragHandleProps
          ? 'cursor-grab active:cursor-grabbing hover:text-slate-500'
          : 'cursor-default opacity-50'
      )}
      title={dragHandleProps ? 'Arrastar para reordenar' : undefined}
    >
      <GripVertical className="w-4 h-4" />
    </button>

    {/* Badge */}
    <div className={clsx(
      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5',
      isLast ? 'bg-emerald-500 text-white' : 'bg-brand-500 text-white'
    )}>
      {stop.sequence}
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <p className={clsx(
        'text-xs font-bold uppercase tracking-wider mb-0.5',
        isLast ? 'text-emerald-600' : 'text-brand-600'
      )}>
        {isLast ? `Parada ${stop.sequence} · Final` : `Parada ${stop.sequence}`}
      </p>
      <p className="text-sm font-semibold text-slate-800 leading-snug break-words">
        {stop.address}
      </p>
    </div>

    {/* Controls */}
    <div className="flex flex-col items-end gap-1 flex-shrink-0">
      <div className="flex gap-1">
        <a
          href={mapsUrl(stop)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-1.5 rounded-lg transition-colors"
          title="Abrir no Google Maps"
        >
          <MapPin className="w-3 h-3" /> Maps
        </a>
        <a
          href={wazeUrl(stop)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-2 py-1.5 rounded-lg transition-colors"
          title="Navegar pelo Waze"
        >
          <Navigation className="w-3 h-3" /> Waze
        </a>
      </div>
      <button
        onClick={onRemove}
        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Remover parada"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

// ── Sortable wrapper — mostra ghost quando arrastando ────────────────────────

interface SortableStopProps {
  stop: RouteLocation;
  index: number;
  isLast: boolean;
  onRemove: () => void;
}

const SortableStop: React.FC<SortableStopProps> = ({ stop, index, isLast, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `stop-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Quando arrastando: placeholder vazio (card real vai pro DragOverlay)
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="min-h-[76px] rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/30"
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <StopCard
        stop={stop}
        index={index}
        isLast={isLast}
        onRemove={onRemove}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
};

// ── Failed address banner ────────────────────────────────────────────────────

interface FailedBannerProps {
  failed: string[];
  onRerun: (fixes: Record<string, string>) => void;
}

const FailedBanner: React.FC<FailedBannerProps> = ({ failed, onRerun }) => {
  const [fixes, setFixes] = useState<Record<string, string>>(() =>
    Object.fromEntries(failed.map(f => [f, '']))
  );

  const hasAnyFix = Object.values(fixes).some(v => v.trim().length > 0);

  return (
    <div className="mx-4 my-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
          {failed.length} endereço{failed.length !== 1 ? 's' : ''} não encontrado{failed.length !== 1 ? 's' : ''}
        </p>
      </div>
      <p className="text-xs text-amber-600">
        Corrija os endereços abaixo e recalcule a rota.
      </p>
      <div className="space-y-2">
        {failed.map(addr => (
          <div key={addr}>
            <p className="text-xs text-amber-700 font-medium mb-1 truncate" title={addr}>{addr}</p>
            <input
              type="text"
              placeholder="Ex: Rua das Flores 123, Sorocaba"
              value={fixes[addr] ?? ''}
              onChange={e => setFixes(prev => ({ ...prev, [addr]: e.target.value }))}
              className="w-full text-xs px-3 py-2 border border-amber-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
            />
          </div>
        ))}
      </div>
      {hasAnyFix && (
        <button
          onClick={() => onRerun(fixes)}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Recalcular com correções
        </button>
      )}
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

export const RouteResults: React.FC<Props> = ({
  result, logs, failedAddresses, reorderStop, removeResultStop, replaceFailedAndRerun
}) => {
  const [activeTab, setActiveTab] = useState<'route' | 'logs'>('route');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }));

  const totalStops = result.filter(s => s.type === 'stop').length;
  const distanceLog = logs.find(l => l.type === 'log_data' && l.data?.key === 'Distância total estimada');
  const totalDistance = distanceLog?.data?.value ?? null;
  const fullRouteUrl = buildFullRouteUrl(result);

  const origin = result.find(s => s.type === 'origin');
  const stops = result.filter(s => s.type === 'stop');
  const stopIds = stops.map((_, i) => `stop-${result.indexOf(stops[i])}`);

  // Card ativo para o DragOverlay
  const activeIndex = activeId ? result.findIndex((_, i) => `stop-${i}` === activeId) : -1;
  const activeStop = activeIndex !== -1 ? result[activeIndex] : null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = result.findIndex((_, i) => `stop-${i}` === active.id);
    const toIndex = result.findIndex((_, i) => `stop-${i}` === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderStop(fromIndex, toIndex);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <Navigation className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-bold text-slate-800">Rota Otimizada</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
            {totalStops} parada{totalStops !== 1 ? 's' : ''}
          </span>
          {totalDistance && (
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              ~{totalDistance}
            </span>
          )}
          {failedAddresses.length > 0 && (
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {failedAddresses.length} não encontrado{failedAddresses.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setActiveTab('route')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors',
            activeTab === 'route'
              ? 'text-brand-600 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <List className="w-3.5 h-3.5" /> Paradas
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors',
            activeTab === 'logs'
              ? 'text-brand-600 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <Terminal className="w-3.5 h-3.5" /> Logs
          {logs.length > 0 && (
            <span className="bg-emerald-500/20 text-emerald-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {logs.length}
            </span>
          )}
        </button>
      </div>

      {/* Action buttons */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-col gap-2">
        <a
          href={fullRouteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir Rota no Google Maps
        </a>
        <button
          onClick={() => generatePDF(result, totalDistance)}
          className="flex items-center justify-center gap-2 w-full border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-2 px-4 rounded-xl transition-colors text-sm"
        >
          <FileText className="w-4 h-4" />
          Gerar PDF / Imprimir
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">

        {activeTab === 'logs' && (
          <div className="h-full p-3">
            <LiveLogs logs={logs} />
          </div>
        )}

        {activeTab === 'route' && (
          <div className="py-4 space-y-2">

            {/* Failed address banner */}
            {failedAddresses.length > 0 && (
              <FailedBanner failed={failedAddresses} onRerun={replaceFailedAndRerun} />
            )}

            <div className="px-4 space-y-2">
              {/* Origin card (não arrastável) */}
              {origin && (
                <div className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 bg-white">
                  <div className="mt-1 w-4 flex-shrink-0" /> {/* spacer para alinhar com o grip */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-slate-800 text-white">
                    <Flag className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider mb-0.5 text-slate-500">
                      Ponto de Saída
                    </p>
                    <p className="text-sm font-semibold text-slate-800 leading-snug break-words">
                      {origin.address}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <a
                      href={mapsUrl(origin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      <MapPin className="w-3 h-3" /> Maps
                    </a>
                    <a
                      href={wazeUrl(origin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      <Navigation className="w-3 h-3" /> Waze
                    </a>
                  </div>
                </div>
              )}

              {/* Paradas arrastáveis */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={({ active }) => setActiveId(String(active.id))}
                onDragEnd={(event) => { setActiveId(null); handleDragEnd(event); }}
                onDragCancel={() => setActiveId(null)}
              >
                <SortableContext items={stopIds} strategy={verticalListSortingStrategy}>
                  {stops.map((stop) => {
                    const index = result.indexOf(stop);
                    const isLast = stop.sequence === totalStops;
                    return (
                      <SortableStop
                        key={`stop-${index}`}
                        stop={stop}
                        index={index}
                        isLast={isLast}
                        onRemove={() => removeResultStop(index)}
                      />
                    );
                  })}
                </SortableContext>

                {/* Overlay: card flutuante que segue o pointer durante o drag */}
                <DragOverlay dropAnimation={null}>
                  {activeStop ? (
                    <StopCard
                      stop={activeStop}
                      index={activeIndex}
                      isLast={activeStop.sequence === totalStops}
                      onRemove={() => {}}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
