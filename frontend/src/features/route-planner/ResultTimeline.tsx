import React from 'react';
import type { RouteLocation } from '../../types';
import { Navigation, Flag } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  result: RouteLocation[] | null;
}

export const ResultTimeline: React.FC<Props> = ({ result }) => {
  if (!result || result.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 flex flex-col">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-5">
        <Navigation className="w-5 h-5 text-brand-500" />
        Optimized Route
      </h2>

      <div className="relative pl-3 space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
        {result.map((stop, index) => {
          const isOrigin = stop.type === 'origin';
          const isLast = index === result.length - 1;

          return (
            <div key={index} className="relative flex items-start group">
              {/* Numbered dot */}
              <div className={clsx(
                "relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3 -ml-1 text-xs font-bold shadow-sm",
                isOrigin
                  ? "bg-slate-800 text-white"
                  : isLast
                    ? "bg-emerald-500 text-white"
                    : "bg-brand-500 text-white"
              )}>
                {isOrigin ? <Flag className="w-3.5 h-3.5" /> : stop.sequence}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 transition-colors hover:border-brand-200">
                <span className={clsx(
                  "text-xs font-bold uppercase tracking-wider block mb-0.5",
                  isOrigin ? "text-slate-500" : isLast ? "text-emerald-600" : "text-brand-600"
                )}>
                  {isOrigin ? "Departure" : isLast ? `Stop ${stop.sequence} · Final` : `Stop ${stop.sequence}`}
                </span>
                <p className="text-sm font-semibold text-slate-800 break-words leading-tight">
                  {stop.address}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
