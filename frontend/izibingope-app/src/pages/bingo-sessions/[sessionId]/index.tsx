import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast, Toaster } from "sonner";
import { getBingoSession, BingoSession } from "@/services/bingoSessionService";
import { getBingoCards, deleteBingoCard, createBingoCard, updateBingoCard, BingoCard } from "@/services/bingoCardService";

import { Plus, Gamepad2, Trash2, Grid3X3, Grid, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { DrawnNumbersInput } from "@/components/DrawnNumbersInput";
import { CardThumbnail } from "@/components/CardThumbnail";
import { useDrawnNumbers } from "@/hooks/useDrawnNumbers";

import { getPatternCoords, PatternType } from "@/lib/patterns";
import { Switch } from "@/components/ui/switch";

function Breadcrumbs({ sessionName }: { sessionName: string }) {
  return (
    <nav className="mb-6 text-sm text-muted-foreground flex items-center gap-2">
      <Link href="/bingo-sessions" className="hover:underline">Sessions</Link>
      <span>&gt;</span>
      <span className="font-semibold text-foreground">{sessionName}</span>
    </nav>
  );
}

// Eliminar la función local CardThumbnail (de la línea 28 a la 84 aprox)

// --- Card Form Modal Component ---
interface CardFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialCard?: BingoCard | null;
  onClose: () => void;
  onSave: (card: Partial<BingoCard> & { numbers: string[][] }) => Promise<void>;
  loading: boolean;
}

const columnRanges = [
  { min: 1, max: 15, letter: 'B' },
  { min: 16, max: 30, letter: 'I' },
  { min: 31, max: 45, letter: 'N' },
  { min: 46, max: 60, letter: 'G' },
  { min: 61, max: 75, letter: 'O' },
];

function CardFormModal({ open, mode, initialCard, onClose, onSave, loading }: CardFormModalProps) {
  const [name, setName] = useState(initialCard?.name || "");
  const [rowInputs, setRowInputs] = useState<string[]>(
    initialCard?.numbers?.map(row => row.join(" ")) || Array(5).fill("")
  );
  const [numbers, setNumbers] = useState<string[][]>(
    initialCard?.numbers || Array(5).fill(null).map(() => Array(5).fill(""))
  );
  const [validationErrors, setValidationErrors] = useState<{ row: number; col: number; type: string; message: string }[]>([]);
  const [touched, setTouched] = useState(false);

  // Parse row inputs into numbers grid
  useEffect(() => {
    const parsed: string[][] = Array(5).fill(null).map(() => Array(5).fill(""));
    for (let r = 0; r < 5; r++) {
      const vals = rowInputs[r].split(/\s+/).filter(Boolean);
      for (let c = 0; c < 5; c++) {
        // Special handling for center cell in row 3
        if (r === 2 && c === 2 && vals[c] === '-') {
          parsed[r][c] = '-';
        } else {
          parsed[r][c] = vals[c] || "";
        }
      }
    }
    setNumbers(parsed);
  }, [rowInputs]);

  // Keep rowInputs in sync if editing an existing card
  useEffect(() => {
    if (initialCard && open && mode === 'edit') {
      setName(initialCard.name);
      setRowInputs(initialCard.numbers.map(row => row.join(" ")));
      setNumbers(initialCard.numbers);
    }
    if (mode === 'create' && open) {
      setName("");
      setRowInputs(Array(5).fill(""));
      setNumbers(Array(5).fill(null).map(() => Array(5).fill("")));
      setTouched(false);
    }
  }, [initialCard, open, mode]);

  // --- Validation logic ---
  function validateAllCells(nums: string[][]): { row: number; col: number; type: string; message: string }[] {
    const errors: { row: number; col: number; type: string; message: string }[] = [];
    const seen = new Map<string, [number, number][]>();
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const val = nums[r][c];
        if (!val.trim()) continue;
        // Allow "-" in center cell (row 2, col 2)
        if (r === 2 && c === 2 && val === '-') {
          continue; // Skip validation for center cell with "-"
        }
        
        // Integer only
        const num = parseInt(val);
        if (isNaN(num) || !/^[0-9]+$/.test(val) || !Number.isInteger(num) || num <= 0) {
          errors.push({ row: r, col: c, type: 'format', message: 'Solo enteros positivos' });
          continue;
        }
        // Global range
        if (num < 1 || num > 75) {
          errors.push({ row: r, col: c, type: 'global-range', message: 'Fuera de 1-75' });
        }
        // Column range
        const range = columnRanges[c];
        if (num < range.min || num > range.max) {
          errors.push({ row: r, col: c, type: 'range', message: `Columna ${range.letter}: ${range.min}-${range.max}` });
        }
        // Duplicates
        if (!seen.has(val)) seen.set(val, []);
        seen.get(val)!.push([r, c]);
      }
    }
    // Mark duplicates
    for (const [val, positions] of seen.entries()) {
      if (positions.length > 1) {
        for (const [r, c] of positions) {
          errors.push({ row: r, col: c, type: 'duplicate', message: `Duplicado: ${val}` });
        }
      }
    }
    return errors;
  }

  useEffect(() => {
    setValidationErrors(validateAllCells(numbers));
  }, [numbers]);

  // --- Handlers ---
  const handleRowInput = (rowIdx: number, value: string) => {
    const newRows = [...rowInputs];
    newRows[rowIdx] = value;
    setRowInputs(newRows);
    setTouched(true);
  };
  const handleGridInput = (row: number, col: number, value: string) => {
    const newNums = numbers.map(arr => [...arr]);
    newNums[row][col] = value;
    setNumbers(newNums);
    setRowInputs(newNums.map(row => row.join(" ")));
    setTouched(true);
  };
  const handlePasteRow = (rowIdx: number, e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.preventDefault();
    const vals = e.clipboardData.getData('text').split(/\s+/).filter(Boolean);
    const newRows = [...rowInputs];
    
    // Special handling for row 3 (index 2) to preserve "-" in center position
    if (rowIdx === 2 && vals.length >= 5) {
      const processedVals = vals.slice(0, 5);
      // Ensure center position (index 2) can be "-"
      if (processedVals[2] === '-') {
        newRows[rowIdx] = processedVals.join(" ");
      } else {
        newRows[rowIdx] = processedVals.join(" ");
      }
    } else {
      newRows[rowIdx] = vals.slice(0, 5).join(" ");
    }
    
    setRowInputs(newRows);
    setTouched(true);
  };
  const handlePasteGrid = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      const clipText = e.clipboardData.getData('text');
      
      // Dividir por líneas y limpiar
      const rows = clipText
        .split(/[\n\r]+/)
        .map(row => row.trim())
        .filter(row => row.length > 0)
        .slice(0, 5); // Máximo 5 filas

      const newNums = Array(5).fill(null).map(() => Array(5).fill(""));
      let invalidCount = 0;
      
      // Procesar cada fila
      rows.forEach((row, rowIndex) => {
        const numbers = row
          .split(/[\s,\t]+/)
          .map(n => n.trim())
          .filter(n => n.length > 0 && !isNaN(Number(n)))
          .slice(0, 5); // Máximo 5 números por fila

        // Procesar cada número
        numbers.forEach((numStr, colIndex) => {
          // Allow "-" in center cell
          if (rowIndex === 2 && colIndex === 2 && numStr === '-') {
            newNums[rowIndex][colIndex] = numStr;
            return;
          }

          const num = Number(numStr);
          const expectedRange = columnRanges[colIndex];

          // Verificar si el número está en el rango correcto para su columna
          if (num >= expectedRange.min && num <= expectedRange.max) {
            newNums[rowIndex][colIndex] = numStr;
          } else {
            invalidCount++;
          }
        });
      });

      setNumbers(newNums);
      setRowInputs(newNums.map(row => row.join(" ")));
      setTouched(true);

      // Mostrar mensaje si hay números fuera de rango
      if (invalidCount > 0) {
        toast.warning(`${invalidCount} número(s) ignorados por estar fuera de rango.\nRecuerda: B(1-15) I(16-30) N(31-45) G(46-60) O(61-75)`);
      }
    } catch (error) {
      console.error('Error al pegar números:', error);
      toast.error('Error al pegar los números. Verifica el formato.');
    }
  };
  const isValid = name.trim() && validationErrors.length === 0 && numbers.flat().every(v => v.trim());

  // --- Render ---
  return (
    <form
      className="flex flex-col gap-4 sm:gap-6"
      onSubmit={async e => {
        e.preventDefault();
        if (!isValid) return;
        await onSave({ name, numbers });
        onClose();
      }}
    >
      <div className="flex flex-col gap-2">
        <label className="font-medium text-sm sm:text-base">Alias del cartón (puedes agregar el codigo central)</label>
        <Input value={name} onChange={e => setName(e.target.value)} disabled={loading} />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-medium text-sm sm:text-base">Filas (separa los números por espacio, en la fila 3 agrega "-" para el centro)</label>
        {Array(5).fill(0).map((_, r) => (
          <Input
            key={r}
            value={rowInputs[r]}
            onChange={e => handleRowInput(r, e.target.value)}
            onPaste={e => handlePasteRow(r, e)}
            placeholder={r === 2 ? `Fila ${r + 1} (ej: 1 16 - 46 61)` : `Fila ${r + 1}`}
            className="font-mono text-sm"
            disabled={loading}
          />
        ))}
      </div>
      <div>
        <label className="font-medium mb-2 block text-sm sm:text-base">Vista previa editable</label>
        <div
          className="grid grid-cols-5 gap-1 sm:gap-2 border-2 p-2 sm:p-4 max-w-xs mx-auto"
          onPaste={handlePasteGrid}
          tabIndex={0}
        >
          <div className="col-span-5 grid grid-cols-5 gap-1 sm:gap-2 mb-2">
            {columnRanges.map((col, i) => (
              <div key={col.letter} className="w-10 sm:w-12 h-6 sm:h-8 flex items-center justify-center font-bold text-xs sm:text-sm">
                {col.letter}
                <div className="text-[10px] sm:text-xs text-muted-foreground ml-1">{col.min}-{col.max}</div>
              </div>
            ))}
          </div>
          {numbers.map((row, r) =>
            row.map((val, c) => {
              const isCenter = r === 2 && c === 2;
              const isDisabled = false; // Allow editing center cell
              const hasError = validationErrors.some(e => e.row === r && e.col === c);
              return (
                <Input
                  key={`${r}-${c}`}
                  value={val}
                  onChange={e => handleGridInput(r, c, e.target.value)}
                  disabled={loading || isDisabled}
                  className={`w-10 h-10 sm:w-12 sm:h-12 text-center rounded-md text-xs sm:text-sm ${isDisabled ? 'bg-gray-200' : ''} ${hasError ? 'border-red-500 bg-red-100' : ''} hover:ring-2 hover:ring-blue-500 focus:ring-2 focus:ring-blue-500`}
                  placeholder={isCenter ? "-" : "0"}
                />
              );
            })
          )}
        </div>
        {validationErrors.length > 0 && touched && (
          <div className="text-red-500 text-xs sm:text-sm mt-2">
            {validationErrors.length} error(es) de validación. Corrige los campos en rojo.
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading} size="sm" className="text-xs sm:text-sm">Cancelar</Button>
        <Button type="submit" disabled={!isValid || loading} size="sm" className="text-xs sm:text-sm">{mode === 'create' ? 'Agregar' : 'Guardar'}</Button>
      </div>
    </form>
  );
}

// --- Main Page Component ---
export default function BingoSessionDetail() {
  const router = useRouter();
  const { sessionId } = router.query; // Cambiado de id a sessionId para que coincida con el nombre del archivo
  const [session, setSession] = useState<BingoSession | null>(null);
  const [cards, setCards] = useState<BingoCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>("create");
  const [selectedCard, setSelectedCard] = useState<BingoCard | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [patternModalOpen, setPatternModalOpen] = useState(false);
  // Unificar estado de números extraídos
  const {
    drawnNumbers,
    loading: drawnLoading,
    error: drawnError,
    addNumber,
    removeNumber,
    removeLastNumber,
    refresh: refreshDrawnNumbers,
  } = useDrawnNumbers(typeof sessionId === 'string' ? sessionId : undefined);


  // --- Estado para el patrón de juego ---
  const patternOptions = [
    { value: "full", label: "Full Card", icon: "🃏" },
    { value: "row", label: "First Row", icon: "📊" },
    { value: "corners", label: "Four Corners", icon: "🔲" },
    { value: "cross", label: "Cross", icon: "➕" },
    { value: "x", label: "X", icon: "❌" },
    { value: "custom", label: "Custom", icon: "⚙️" },
  ];
  const [pattern, setPattern] = useState<string>("full");

  // Persistencia en localStorage
  useEffect(() => {
    if (typeof sessionId !== "string") return;
    const saved = localStorage.getItem(`izibingope_pattern_${sessionId}`);
    if (saved && patternOptions.some(opt => opt.value === saved)) {
      setPattern(saved);
    }
  }, [sessionId]);

  useEffect(() => {
    if (typeof sessionId !== "string") return;
    localStorage.setItem(`izibingope_pattern_${sessionId}`, pattern);
  }, [pattern, sessionId]);

  // Fetch session and cards
  // Detectar si la ruta está lista
  const isRouteReady = router.isReady;

  useEffect(() => {
    const loadData = async () => {
      console.log('Route ready:', isRouteReady, 'SessionID:', sessionId, 'Type:', typeof sessionId);
      
      // Esperamos a que la ruta esté lista y tengamos un ID
      if (!isRouteReady || typeof sessionId !== "string") {
        console.log('Waiting for route to be ready...');
        return; // No cambiamos el estado loading aquí
      }

      try {
        setLoading(true);
        console.log('Fetching session and cards data for SessionID:', sessionId);
        
        // Cargar datos en paralelo
        const [sessionData, cardsData] = await Promise.all([
          getBingoSession(sessionId),
          getBingoCards(sessionId)
        ]);
        
        console.log('Session data:', sessionData);
        console.log('Cards data:', cardsData);
        
        if (!sessionData) {
          console.log('No session found for SessionID:', sessionId);
          toast.error('Sesión no encontrada');
          router.push('/bingo-sessions');
          return;
        }
        
        setSession(sessionData);
        setCards(cardsData);
      } catch (error) {
        console.error('Error loading session data:', error);
        toast.error('Error cargando los datos de la sesión');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionId, isRouteReady, router]);



  // Handlers
  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedCard(null);
    setModalOpen(true);
  };
  const handleOpenEdit = (card: BingoCard) => {
    setModalMode("edit");
    setSelectedCard(card);
    setModalOpen(true);
  };
  const handleDelete = async (card: BingoCard) => {
    if (!confirm("Are you sure you want to delete this card?")) return;
    setDeletingId(card.id);
    try {
      await deleteBingoCard(card.id);
      setCards(cards => cards.filter(c => c.id !== card.id));
      toast.success("Card deleted");
    } catch {
      toast.error("Error deleting card");
    } finally {
      setDeletingId(null);
    }
  };

  // Skeletons
  const skeletons = Array(6).fill(0);

  // --- Lógica de progreso para cada tarjeta ---
  const cardsWithProgress = useMemo(() => {
    return cards.map(card => {
      let patternCells = getPatternCoords(pattern as PatternType);
      const cardNumbers = card.numbers;
      const patternValues = patternCells.map(([r, c]) => cardNumbers[r][c]);
      const drawnValues = drawnNumbers.map(n => n.value);
      const matchedCount = patternValues.filter(val => val && drawnValues.includes(Number(val))).length;
      const totalCount = patternValues.length;
      const remaining = totalCount - matchedCount;
      const percent = totalCount > 0 ? matchedCount / totalCount : 0;
      return { card, matchedCount, totalCount, remaining, percent, patternCells };
    });
  }, [cards, drawnNumbers, pattern]);

  // Calcular el máximo porcentaje de avance
  const maxPercent = useMemo(() => {
    return cardsWithProgress.reduce((max, c) => c.percent > max ? c.percent : max, 0);
  }, [cardsWithProgress]);

  const [compactView, setCompactView] = useState(false);

  // Calcular BINGOs completados directamente en el render
  const completedBingos = useMemo(() => {
    if (!cards.length || !drawnNumbers.length) return new Set<string>();
    
    const completed = new Set<string>();
    
    cards.forEach(card => {
      const patternCells = getPatternCoords(pattern as PatternType);
      const cardNumbers = card.numbers;
      const patternValues = patternCells.map(([r, c]) => cardNumbers[r][c]);
      const drawnValues = drawnNumbers.map(n => n.value);
      const matchedCount = patternValues.filter(val => val && drawnValues.includes(Number(val))).length;
      const totalCount = patternValues.length;
      const remaining = totalCount - matchedCount;
      
      if (remaining === 0 && typeof remaining === 'number') {
        completed.add(card.id);
      }
    });
    
    return completed;
  }, [cards, drawnNumbers, pattern]);

  // Ordenar siempre por progreso (más aciertos primero)
  const sortedCardsWithProgress = useMemo(() => {
    return [...cardsWithProgress].sort((a, b) => b.percent - a.percent);
  }, [cardsWithProgress]);

  // Si la ruta no está lista, mostramos un skeleton general
  if (!router.isReady) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4">
        <Skeleton className="h-8 w-64 mb-6" /> {/* Breadcrumb skeleton */}
        <Skeleton className="h-12 w-full mb-6" /> {/* Tabs skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {skeletons.map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 relative">
      <Toaster position="top-right" />
      {session && <Breadcrumbs sessionName={session.name} />}
      
      {/* Botones de acción superiores */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setPatternModalOpen(true)}
            className="flex flex-col items-center justify-center gap-2 p-4 w-20 h-20 min-w-20 min-h-20"
          >
            <Gamepad2 className="w-6 h-6" />
            <span className="text-xs font-medium text-center leading-tight">
              {patternOptions.find(opt => opt.value === pattern)?.label?.includes(' ') 
                ? patternOptions.find(opt => opt.value === pattern)?.label?.split(' ').map((word, i) => (
                    <span key={i} className="block">{word}</span>
                  ))
                : patternOptions.find(opt => opt.value === pattern)?.label || "Tipo de\njuego"
              }
            </span>
          </Button>
          
          {pattern && pattern !== "" && (
            <Button
              variant="outline"
              disabled={drawnNumbers.length === 0}
              onClick={async () => {
                if (!window.confirm('¿Seguro que quieres limpiar todos los números extraídos?')) return;
                if (typeof sessionId === 'string') {
                  localStorage.setItem('izibingope_drawn_numbers', JSON.stringify(
                    JSON.parse(localStorage.getItem('izibingope_drawn_numbers') || '[]').filter((n: any) => n.sessionId !== sessionId)
                  ));
                  refreshDrawnNumbers();
                }
              }}
              className="flex flex-col items-center justify-center gap-2 p-4 w-20 h-20 min-w-20 min-h-20"
            >
              <Trash2 className={`w-6 h-6 ${drawnNumbers.length === 0 ? 'text-muted-foreground' : ''}`} />
              <span className="text-xs font-medium text-center leading-tight">
                <span className="block">Limpiar</span>
                <span className="block">números</span>
              </span>
            </Button>
          )}
        </div>
        
        <Button
          onClick={handleOpenCreate}
          className="flex flex-col items-center justify-center gap-2 p-4 w-20 h-20 min-w-20 min-h-20"
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs font-medium text-center leading-tight">
            <span className="block">Agregar</span>
            <span className="block">Tarjeta</span>
          </span>
        </Button>
      </div>

      {/* PASO 2: Controles de números extraídos (solo visibles si hay tipo de juego seleccionado) */}
      {pattern && pattern !== "" && (
        <div className="mb-8">
          <DrawnNumbersInput
            sessionId={sessionId as string}
            drawnNumbers={drawnNumbers}
            loading={drawnLoading}
            error={drawnError}
            addNumber={addNumber}
            removeNumber={removeNumber}
            removeLastNumber={removeLastNumber}
            compactView={compactView}
            onCompactViewChange={setCompactView}
          />
          
          {/* Contador de BINGOs */}
          {completedBingos.size > 0 && (
            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full mb-4">
              <span className="text-lg">🎉</span>
              <span className="text-sm font-medium">
                {completedBingos.size} BINGO{completedBingos.size > 1 ? 'S' : ''} completado{completedBingos.size > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
      {/* Si patrón es custom, mostrar placeholder */}
      {pattern === "custom" ? (
        <div className="mb-8 flex items-center gap-4">
          <span className="text-muted-foreground">Custom pattern coming soon</span>
          <Button disabled>Define Pattern</Button>
        </div>
      ) : null}
      
      {/* PASO 3: Grid de tarjetas siempre visible */}
      <div className={`grid gap-4 mb-8 ${
        compactView 
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' 
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
      }`}>
        {loading
          ? skeletons.map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded" />
            ))
          : sortedCardsWithProgress.map(({ card, matchedCount, totalCount, remaining, patternCells, percent }, i) => (
              <CardThumbnail
                key={card.id}
                card={card}
                matchedCount={matchedCount}
                totalCount={totalCount}
                remaining={remaining}
                patternCells={patternCells}
                drawnNumbers={drawnNumbers}
                isMaxProgress={percent === maxPercent && maxPercent > 0}
                onEdit={() => handleOpenEdit(card)}
                onDelete={() => handleDelete(card)}
                loading={deletingId === card.id}
                compact={compactView}
                isBingo={completedBingos.has(card.id)}
              />
            ))}
      </div>

      {/* Modal for create/edit card */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md w-full p-4 max-h-[90vh] overflow-y-auto sm:max-w-md">
          <div className="w-full">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{modalMode === 'create' ? 'Agregar nueva tarjeta' : 'Editar tarjeta'}</DialogTitle>
            </DialogHeader>
            <CardFormModal
              open={modalOpen}
              mode={modalMode}
              initialCard={selectedCard}
              onClose={() => setModalOpen(false)}
              onSave={async (card) => {
                setModalSaving(true);
                try {
                  if (modalMode === 'create' && typeof sessionId === 'string') {
                    await createBingoCard({ ...card, sessionId, name: card.name ?? '' });
                    setCards(await getBingoCards(sessionId));
                  } else if (modalMode === 'edit' && selectedCard) {
                    await updateBingoCard(selectedCard.id, { ...card, name: card.name ?? '' });
                    const updatedCards = await getBingoCards(sessionId as string);
                    setCards(updatedCards);
                  }
                  toast.success('Tarjeta guardada');
                } catch (error) {
                  console.error('Error saving card:', error);
                  toast.error('Error al guardar la tarjeta');
                } finally {
                  setModalSaving(false);
                  setModalOpen(false);
                }
              }}
              loading={modalSaving}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para seleccionar tipo de juego */}
      <Dialog open={patternModalOpen} onOpenChange={setPatternModalOpen}>
        <DialogContent className="max-w-md w-full p-6">
          <DialogHeader>
            <DialogTitle>Seleccionar Tipo de Juego</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {patternOptions.map((option) => (
              <Button
                key={option.value}
                variant={pattern === option.value ? "default" : "outline"}
                className="flex flex-col items-center justify-center gap-3 p-4 w-24 h-24 min-w-24 min-h-24"
                onClick={() => {
                  setPattern(option.value);
                  setPatternModalOpen(false);
                }}
              >
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-3xl">{option.icon}</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-xs font-medium text-center leading-tight">
                    {option.label.includes(' ') 
                      ? option.label.split(' ').map((word, i) => (
                          <span key={i} className="block">{word}</span>
                        ))
                      : option.label
                    }
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 