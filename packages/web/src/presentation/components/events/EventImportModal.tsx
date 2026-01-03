import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  X,
  Check,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  Camera,
  Calendar,
  RefreshCw,
  Users,
  Trash2,
} from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import { calendarIntegrationService } from '@/services/calendarIntegrationService';
import { format, parse, isValid } from 'date-fns';
import type { EventType } from '@/types';
import { scanEventOrder } from '@/services/geminiService';
import { parsePlaningMatrix } from '@/utils/planingParser';
import type { PlaningEvent } from '@/utils/planingParser';
// import { BEOUploader } from '@/presentation/components/events/BEOUploader';

interface ParsedEvent {
  name: string;
  date: string;
  pax: number;
  menuNotes: string;
  type: EventType;
}

interface EventImportModalProps {
  onClose: () => void;
  onSave: () => void;
}

export const EventImportModal: React.FC<EventImportModalProps> = ({ onClose, onSave }) => {
  // @ts-expect-error Missing some store types
  const { events, addEvents, addEvent, activeOutletId } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'excel' | 'matrix' | 'scan' | 'sync'>('excel');
  const [year, setYear] = useState(new Date().getFullYear());
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedEvent | null>(null);
  const [matrixEvents, setMatrixEvents] = useState<PlaningEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (mode === 'excel') {
        parseExcel(selectedFile);
      } else if (mode === 'matrix') {
        parseExcel(selectedFile);
      }
    }
  };

  const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    if (!file) return;

    setParsing(true);
    setError(null);
    setParsedData(null);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const res = (reader.result as string).split(',')[1];
          if (res) resolve(res);
          else reject(new Error('Invalid file data'));
        };
        reader.onerror = reject;
      });

      const result = await scanEventOrder(base64Data);

      if (result.success && result.data) {
        const d = result.data;
        setParsedData({
          name: d.eventName || 'Evento Escaneado',
          date: d.date || format(new Date(), 'yyyy-MM-dd'),
          pax: Number(d.pax) || 0,
          menuNotes:
            (d.menu?.name ? `Menú: ${d.menu.name}\n` : '') +
            (d.menu?.items?.join(', ') || '') +
            (d.notes ? `\n\nNotas: ${d.notes}` : ''),
          type: 'Comida',
        });
      } else {
        throw new Error(result.error || 'No se pudo leer la hoja de evento');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al escanear documento');
    } finally {
      setParsing(false);
    }
  };

  async function parseExcel(file: File) {
    setParsing(true);
    setError(null);
    setParsedData(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      if (mode === 'matrix') {
        let allEvents: PlaningEvent[] = [];
        // Process all sheets that look like months or quarters
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          if (worksheet) {
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            const sheetEvents = parsePlaningMatrix(jsonData, year, sheetName);
            allEvents = [...allEvents, ...sheetEvents];
          }
        });

        if (allEvents.length > 0) {
          setMatrixEvents(allEvents);
        } else {
          throw new Error('No se detectaron eventos con el formato de Matriz (Meses y Salones).');
        }
      } else {
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error('El archivo Excel no tiene hojas');

        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) throw new Error('No se encontro hoja de calculo');
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const extracted = extractData(jsonData, file.name);
        setParsedData(extracted);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al leer el archivo. Asegúrate de que es un Excel válido.');
    } finally {
      setParsing(false);
    }
  }

  function extractData(data: any[][], filename: string): ParsedEvent {
    let name = filename.replace(/\.xlsx?$/, '');
    let date = format(new Date(), 'yyyy-MM-dd');
    let pax = 0;
    let menuNotes = '';
    let type: EventType = 'Comida'; // Default

    // Heuristics
    for (let r = 0; r < data.length; r++) {
      const row = data[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c]).toLowerCase().trim();

        // Name / Evento
        if (cell.includes('evento') && !name.includes('Navidad')) {
          if (row[c + 1]) name = String(row[c + 1]);
          else {
            const nextRow = data[r + 1];
            if (nextRow && nextRow[c]) name = String(nextRow[c]);
          }
        }

        // Date / Fecha
        if (cell === 'fecha') {
          let dateRaw = row[c + 1];
          if (!dateRaw) {
            const nextRow = data[r + 1];
            if (nextRow) dateRaw = nextRow[c];
          }

          if (dateRaw) {
            if (typeof dateRaw === 'number') {
              const dateObj = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
              if (isValid(dateObj)) date = format(dateObj, 'yyyy-MM-dd');
            } else {
              const parsed = parse(String(dateRaw).trim(), 'dd/MM/yyyy', new Date());
              if (isValid(parsed)) date = format(parsed, 'yyyy-MM-dd');
            }
          }
        }

        // PAX / Personas
        if (cell === 'pax' || cell === 'no pax' || cell === 'personas' || cell.includes('nº pax')) {
          let paxRaw = row[c + 1];
          if (!paxRaw) {
            const nextRow = data[r + 1];
            if (nextRow) paxRaw = nextRow[c];
          }

          if (paxRaw && !isNaN(Number(paxRaw))) {
            pax = Number(paxRaw);
          }
        }

        // Menu content
        if (cell.includes('alimentos y bebidas')) {
          let currentRow = r + 1;
          while (currentRow < data.length) {
            const nextRow = data[currentRow];
            if (!nextRow) {
              currentRow++;
              continue;
            }
            const firstCell = String(nextRow[0] || '').toLowerCase();

            if (
              firstCell.includes('bodega') ||
              firstCell.includes('observaciones') ||
              firstCell.includes('horarios')
            ) {
              break;
            }

            const line = nextRow.filter((x) => x).join(' ');
            if (line.trim()) {
              menuNotes += line + '\n';
            }
            currentRow++;
          }
        }
      }
    }

    const lowerName = name.toLowerCase();
    if (lowerName.includes('boda')) type = 'Boda';
    else if (lowerName.includes('comida')) type = 'Comida';
    else if (lowerName.includes('cena')) type = 'Cena';
    else if (lowerName.includes('coctel') || lowerName.includes('cóctel')) type = 'Coctel';
    else if (lowerName.includes('desayuno') || lowerName.includes('coffee')) type = 'Coffee Break';

    return { name, date, pax, menuNotes, type };
  }

  const handleSave = async () => {
    if (!parsedData) return;

    const newEvent = {
      id: crypto.randomUUID(),
      name: parsedData.name,
      date: parsedData.date,
      pax: parsedData.pax,
      type: parsedData.type,
      room: 'room' in parsedData ? (parsedData as any).room : undefined,
      notes: parsedData.menuNotes,
      status: 'confirmed',
      menuId: undefined,
      outletId: activeOutletId || undefined,
    };

    // Use store action to persist
    await addEvent(newEvent as any);
    onSave();
    onClose();
  };

  const handleSaveBulk = async () => {
    if (matrixEvents.length === 0) return;

    const sourceData = matrixEvents.map((e) => ({
      name: e.name,
      date: e.date,
      pax: e.pax,
      type: e.type,
      menuNotes: e.notes,
    }));

    const newEventsArray = sourceData.map((evt) => ({
      id: crypto.randomUUID(),
      name: evt.name || 'Evento Importado',
      date: evt.date || format(new Date(), 'yyyy-MM-dd'),
      pax: evt.pax || 0,
      type: evt.type || ('Otros' as EventType),
      room: (evt as any).room, // Only matrix has room currently
      notes: evt.menuNotes || '',
      status: 'confirmed' as const,
      menuId: undefined,
      outletId: activeOutletId || undefined,
    }));

    // Use store action to persist
    await addEvents(newEventsArray as any[]);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-surface border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {mode === 'excel' ? (
              <FileSpreadsheet className="text-emerald-400" />
            ) : mode === 'scan' ? (
              <Camera className="text-purple-400" />
            ) : (
              <RefreshCw className="text-orange-400" />
            )}
            {mode === 'excel'
              ? 'Importar Hoja de Servicio'
              : mode === 'matrix'
                ? 'Importar Matriz Planing'
                : mode === 'scan'
                  ? 'Escanear Orden de Evento (BEO)'
                  : 'Sincronizar Nube'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-white/10 overflow-x-auto">
          <button
            onClick={() => setMode('excel')}
            className={`flex-1 py-3 text-sm font-medium whitespace-nowrap px-4 transition-colors ${mode === 'excel' ? 'bg-white/5 text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}
          >
            Excel Ficha
          </button>
          <button
            onClick={() => setMode('matrix')}
            className={`flex-1 py-3 text-sm font-medium whitespace-nowrap px-4 transition-colors ${mode === 'matrix' ? 'bg-white/5 text-emerald-400 border-b-2 border-emerald-400 transition-all' : 'text-slate-400 hover:text-white'}`}
          >
            Matriz Planing
          </button>
          <button
            onClick={() => setMode('scan')}
            className={`flex-1 py-3 text-sm font-medium whitespace-nowrap px-4 transition-colors ${mode === 'scan' ? 'bg-white/5 text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'}`}
          >
            OCR Scanner
          </button>

          <button
            onClick={() => setMode('sync')}
            className={`flex-1 py-3 text-sm font-medium whitespace-nowrap px-4 transition-colors ${mode === 'sync' ? 'bg-white/5 text-orange-400 border-b-2 border-orange-400' : 'text-slate-400 hover:text-white'}`}
          >
            Cloud Sync
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {mode === 'matrix' && !parsedData && matrixEvents.length === 0 && (
            <div className="flex justify-center mb-6">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-4">
                <label className="text-sm font-medium text-slate-300">Año del Planing:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setYear((y) => y - 1)}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <span className="text-xl font-bold text-white min-w-[60px] text-center">
                    {year}
                  </span>
                  <button
                    onClick={() => setYear((y) => y + 1)}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {!parsedData && matrixEvents.length === 0 && mode !== 'sync' ? (
            <>
              {mode === 'scan' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-white/10 rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 hover:border-primary/50 transition-all ${parsing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleScanUpload}
                    className="hidden"
                    accept=".jpg, .jpeg, .png, .webp, .pdf"
                  />
                  {parsing ? (
                    <>
                      <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                      <p className="text-lg font-medium text-white">
                        Escaneando Orden de Evento...
                      </p>
                      <p className="text-sm text-slate-400 mt-2">
                        La IA está extrayendo datos (fecha, pax, menú)
                      </p>
                    </>
                  ) : error ? (
                    <>
                      <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
                      <p className="text-lg font-medium text-red-400">{error}</p>
                      <p className="text-sm text-slate-400 mt-2">Click para intentar de nuevo</p>
                    </>
                  ) : (
                    <>
                      <Camera className="w-10 h-10 text-purple-400 mb-4" />
                      <p className="text-lg font-medium text-white">
                        Click para subir BEO (PDF o Imagen)
                      </p>
                      <p className="text-sm text-slate-400 mt-2">
                        La IA detectará automáticamente los detalles.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-white/10 rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 hover:border-primary/50 transition-all ${parsing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={
                      mode === 'excel' || mode === 'matrix' ? handleFileChange : handleScanUpload
                    }
                    className="hidden"
                    accept={
                      mode === 'excel' || mode === 'matrix'
                        ? '.xlsx, .xls'
                        : '.jpg, .jpeg, .png, .webp'
                    }
                  />

                  {parsing ? (
                    <>
                      <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                      <p className="text-lg font-medium text-white">Analizando archivo...</p>
                      <p className="text-sm text-slate-400 mt-2">
                        {mode === 'excel' || mode === 'matrix'
                          ? 'Buscando fechas, comensales y eventos'
                          : 'Extrayendo datos con IA'}
                      </p>
                    </>
                  ) : error ? (
                    <>
                      <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
                      <p className="text-lg font-medium text-red-400">{error}</p>
                      <p className="text-sm text-slate-400 mt-2">Click para intentar de nuevo</p>
                    </>
                  ) : (
                    <>
                      {mode === 'excel' ? (
                        <Upload className="w-10 h-10 text-slate-400 mb-4" />
                      ) : (
                        <Camera className="w-10 h-10 text-purple-400 mb-4" />
                      )}
                      <p className="text-lg font-medium text-white">
                        {mode === 'excel' || mode === 'matrix'
                          ? 'Click para subir Excel'
                          : 'Click para subir Imagen BEO'}
                      </p>
                      <p className="text-sm text-slate-400 mt-2">
                        {mode === 'excel' || mode === 'matrix'
                          ? 'Soporta .xlsx y .xls'
                          : 'Soporta JPG, PNG (las fotos claras funcionan mejor)'}
                      </p>
                    </>
                  )}
                </div>
              )}
            </>
          ) : mode === 'sync' ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6 text-center p-8">
              <div className="bg-orange-500/10 p-4 rounded-full">
                <RefreshCw className="w-12 h-12 text-orange-400" />
              </div>
              <h4 className="text-xl font-bold text-white">Sincronización Automática</h4>
              <p className="text-slate-400 max-w-sm">
                Conecta tus calendarios de Google o Outlook para importar eventos automáticamente.
              </p>

              <div className="flex gap-4 mt-4 w-full justify-center">
                <button
                  onClick={() => calendarIntegrationService.initiateGoogleAuth()}
                  className="flex items-center gap-3 px-6 py-3 bg-[#4285F4] hover:bg-[#3367D6] text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.04-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google Calendar
                </button>
                <button
                  onClick={() => calendarIntegrationService.initiateOutlookAuth()}
                  className="flex items-center gap-3 px-6 py-3 bg-[#0078D4] hover:bg-[#106EBE] text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1.6 4.5l9 6.2 9-6.2c-.4-.5-1-.8-1.6-.8h-14.8c-.6 0-1.2.3-1.6.8zm19.8 1.4l-9 6.2-9-6.2c-.4.5-.6 1.1-.5 1.7v9.4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-9.4c.1-.6-.1-1.2-.5-1.7z" />
                  </svg>
                  Outlook
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-4">(Próximamente: Integración API directa)</p>
            </div>
          ) : matrixEvents.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 bg-blue-400/10 p-3 rounded-lg border border-blue-400/20 text-sm">
                <Check className="w-4 h-4" />
                <span>Se encontraron {matrixEvents.length} eventos.</span>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {matrixEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center group hover:bg-white/10 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold truncate">{evt.name}</div>
                      <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                        <Calendar className="w-3 h-3" /> {evt.date}
                        <span className="text-slate-600">•</span>
                        <span className="text-primary font-medium">{evt.type}</span>
                        {'room' in evt && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-emerald-400">{evt.room}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {evt.pax ? (
                        <div className="bg-slate-800 px-3 py-1 rounded-lg text-xs text-white font-bold flex items-center gap-1.5 border border-white/5">
                          <Users className="w-3 h-3 text-slate-400" /> {evt.pax}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 italic">
                Verifica los datos antes de completar la importación.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20 text-sm">
                <Check className="w-4 h-4" />
                <span>Datos extraídos correctamente. Por favor verifica antes de guardar.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase font-bold">
                    Nombre del Evento
                  </label>
                  <input
                    type="text"
                    value={parsedData?.name || ''}
                    onChange={(e) =>
                      parsedData && setParsedData({ ...parsedData, name: e.target.value })
                    }
                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase font-bold">Tipo</label>
                  <select
                    value={parsedData?.type || 'Otros'}
                    onChange={(e) =>
                      parsedData &&
                      setParsedData({ ...parsedData, type: e.target.value as EventType })
                    }
                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:border-primary"
                  >
                    <option value="Comida">Comida</option>
                    <option value="Cena">Cena</option>
                    <option value="Boda">Boda</option>
                    <option value="Coctel">Coctel</option>
                    <option value="Coffee Break">Coffee Break</option>
                    <option value="Empresa">Empresa</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase font-bold">Fecha</label>
                  <input
                    type="date"
                    value={parsedData?.date || ''}
                    onChange={(e) =>
                      parsedData && setParsedData({ ...parsedData, date: e.target.value })
                    }
                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 uppercase font-bold">Nº PAX</label>
                  <input
                    type="number"
                    value={parsedData?.pax || 0}
                    onChange={(e) =>
                      parsedData && setParsedData({ ...parsedData, pax: Number(e.target.value) })
                    }
                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 uppercase font-bold">
                  Menú / Observaciones
                </label>
                <textarea
                  rows={8}
                  value={parsedData?.menuNotes || ''}
                  onChange={(e) =>
                    parsedData && setParsedData({ ...parsedData, menuNotes: e.target.value })
                  }
                  className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:border-primary font-mono text-xs leading-relaxed"
                />
                <p className="text-[10px] text-slate-500 text-right">
                  Extraído {mode === 'excel' ? 'de Excel' : 'con IA'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Permanent Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <button
            onClick={async () => {
              if (
                confirm(
                  '¿Estás SEGURO de que quieres borrar TODOS los eventos cargados en este rango? Esta acción no se puede deshacer.'
                )
              ) {
                try {
                  await useStore.getState().clearEvents();
                  alert('Eventos eliminados correctamente.');
                } catch (err) {
                  alert('Error al borrar eventos.');
                }
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
          >
            <Trash2 size={14} />
            Borrar Todo
          </button>

          <div className="flex items-center gap-3">
            {parsedData || matrixEvents.length > 0 ? (
              <>
                <button
                  onClick={() => {
                    setParsedData(null);
                    setMatrixEvents([]);
                  }}
                  className="px-4 py-2 hover:bg-white/10 rounded text-slate-300 transition-colors text-sm"
                >
                  Atrás
                </button>
                <button
                  onClick={matrixEvents.length > 0 ? handleSaveBulk : handleSave}
                  className="px-6 py-2 bg-primary hover:bg-blue-600 rounded text-white font-medium shadow-lg shadow-primary/25 transition-all text-sm"
                >
                  Confirmar e Importar
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
