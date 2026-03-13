import React, { useState, useRef } from 'react';
import { MapPin, Plus, Trash2, Home, Upload, Map, AlertCircle, FileUp } from 'lucide-react';
import { parseImportFile } from '../../utils/parseImportFile';

interface Props {
  origin: string;
  stops: string[];
  error: string | null;
  setOrigin: (val: string) => void;
  addStop: (val: string) => void;
  removeStop: (index: number) => void;
  loadExample: () => void;
  runOptimization: () => void;
  isLoading: boolean;
  onImport: (addresses: string[]) => void;
}

export const AddressForm: React.FC<Props> = ({
  origin, stops, error, setOrigin, addStop, removeStop, loadExample, runOptimization, isLoading, onImport
}) => {
  const [newStop, setNewStop] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddStop = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStop.trim()) {
      addStop(newStop.trim());
      setNewStop('');
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const addresses = await parseImportFile(file);
      if (addresses.length === 0) {
        setImportError('Nenhum endereço encontrado no arquivo.');
      } else {
        onImport(addresses);
      }
    } catch (err: any) {
      setImportError(err.message ?? 'Erro ao ler o arquivo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 flex flex-col space-y-6 w-full">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-1">
          <Map className="w-6 h-6 text-brand-500" />
          Criar nova rota
        </h2>
        <p className="text-slate-500 text-sm">Informe o ponto de saída e os endereços de entrega.</p>
      </div>

      {/* Origem */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Ponto de saída</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Home className="h-5 w-5 text-brand-500" />
            </div>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              disabled={isLoading}
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Ex: Av. Dom Aguirre 3000, Sorocaba"
            />
          </div>
        </div>

        {/* Paradas */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex justify-between items-center">
            <span>Paradas de entrega</span>
            <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full text-xs">
              {stops.length} adicionada{stops.length !== 1 ? 's' : ''}
            </span>
          </label>

          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
            {stops.map((stop, idx) => (
              <div key={idx} className="flex relative items-center group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  readOnly
                  value={stop}
                  title={stop}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 truncate"
                />
                <button
                  type="button"
                  onClick={() => removeStop(idx)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-1 pr-2 flex items-center text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddStop} className="flex gap-2">
            <input
              type="text"
              value={newStop}
              onChange={(e) => setNewStop(e.target.value)}
              disabled={isLoading}
              className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm bg-white disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Digite o endereço ou CEP"
            />
            <button
              type="submit"
              className="bg-slate-100 p-3 rounded-xl text-slate-700 hover:bg-slate-200 hover:text-brand-600 transition-colors flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!newStop.trim() || isLoading}
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Erros */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {importError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{importError}</span>
        </div>
      )}

      {/* Botões */}
      <div className="space-y-3">
        <button
          onClick={runOptimization}
          disabled={!origin || stops.length === 0 || isLoading}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-brand-500/30 flex justify-center items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Otimizando rota...
            </>
          ) : "Calcular Rota Otimizada"}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={loadExample}
            disabled={isLoading}
            className="border-2 border-slate-200 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-50 transition-colors flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            type="button"
          >
            <Upload className="w-4 h-4" /> Exemplo
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="border-2 border-slate-200 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-50 transition-colors flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            type="button"
          >
            <FileUp className="w-4 h-4" /> Importar
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.json,.txt"
          className="hidden"
          onChange={handleFileImport}
        />
      </div>
    </div>
  );
};
