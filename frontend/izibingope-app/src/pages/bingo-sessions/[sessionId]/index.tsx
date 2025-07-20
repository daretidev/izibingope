import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast, Toaster } from "sonner";
import { getBingoSession, BingoSession } from "@/services/bingoSessionService";
import { getBingoCards, deleteBingoCard, createBingoCard, updateBingoCard, BingoCard, BingoCardInput } from "@/services/bingoCardService";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  addDrawnNumber,
  getDrawnNumbers,
  removeLastDrawnNumber,
  DrawnNumber,
} from "@/services/drawnNumberService";
import { DrawnNumbersInput } from "@/components/DrawnNumbersInput";
import { CardThumbnail } from "@/components/CardThumbnail";
import { useDrawnNumbers } from "@/hooks/useDrawnNumbers";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [campoLibre, setCampoLibre] = useState(false);
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
        parsed[r][c] = vals[c] || "";
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
      setCampoLibre(false);
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
        if (!val.trim() || (!campoLibre && r === 2 && c === 2)) continue;
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
  }, [numbers, campoLibre]);

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
    newRows[rowIdx] = vals.slice(0, 5).join(" ");
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
          // Saltar la celda central si no hay campo libre
          if (!campoLibre && rowIndex === 2 && colIndex === 2) {
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
  const isValid = name.trim() && validationErrors.length === 0 && numbers.flat().filter((v, i) => !(i === 12 && !campoLibre)).every(v => v.trim());

  // --- Render ---
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={async e => {
        e.preventDefault();
        if (!isValid) return;
        await onSave({ name, numbers });
        onClose();
      }}
    >
      <div className="flex flex-col gap-2">
        <label className="font-medium">Alias del cartón</label>
        <Input value={name} onChange={e => setName(e.target.value)} disabled={loading} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="campo-libre" checked={campoLibre} onCheckedChange={v => setCampoLibre(!!v)} />
        <label htmlFor="campo-libre" className="text-sm font-medium">Campo Libre (centro)</label>
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-medium">Filas (separa los números por espacio)</label>
        {Array(5).fill(0).map((_, r) => (
          <Input
            key={r}
            value={rowInputs[r]}
            onChange={e => handleRowInput(r, e.target.value)}
            onPaste={e => handlePasteRow(r, e)}
            placeholder={`Fila ${r + 1}`}
            className="font-mono"
            disabled={loading}
          />
        ))}
      </div>
      <div>
        <label className="font-medium mb-2 block">Vista previa editable</label>
        <div
          className="grid grid-cols-5 gap-2 border-2 p-4 max-w-xs mx-auto"
          onPaste={handlePasteGrid}
          tabIndex={0}
        >
          <div className="col-span-5 grid grid-cols-5 gap-2 mb-2">
            {columnRanges.map((col, i) => (
              <div key={col.letter} className="w-12 h-8 flex items-center justify-center font-bold text-sm">
                {col.letter}
                <div className="text-xs text-muted-foreground ml-1">{col.min}-{col.max}</div>
              </div>
            ))}
          </div>
          {numbers.map((row, r) =>
            row.map((val, c) => {
              const isCenter = r === 2 && c === 2;
              const isDisabled = !campoLibre && isCenter;
              const hasError = validationErrors.some(e => e.row === r && e.col === c);
              return (
                <Input
                  key={`${r}-${c}`}
                  value={val}
                  onChange={e => handleGridInput(r, c, e.target.value)}
                  disabled={loading || isDisabled}
                  className={`w-12 h-12 text-center rounded-md ${isDisabled ? 'bg-gray-200' : ''} ${hasError ? 'border-red-500 bg-red-100' : ''} hover:ring-2 hover:ring-blue-500 focus:ring-2 focus:ring-blue-500`}
                  placeholder={isDisabled ? "FREE" : "0"}
                />
              );
            })
          )}
        </div>
        {validationErrors.length > 0 && touched && (
          <div className="text-red-500 text-sm mt-2">
            {validationErrors.length} error(es) de validación. Corrige los campos en rojo.
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={!isValid || loading}>{mode === 'create' ? 'Agregar' : 'Guardar'}</Button>
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
  const [tab, setTab] = useState("cards");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>("create");
  const [selectedCard, setSelectedCard] = useState<BingoCard | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
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
  const [drawInput, setDrawInput] = useState("");
  const [drawError, setDrawError] = useState<string | null>(null);
  const [drawLoading, setDrawLoading] = useState(false);

  // --- Estado para el patrón de juego ---
  const patternOptions = [
    { value: "full", label: "Full Card" },
    { value: "row", label: "First Row" },
    { value: "corners", label: "Four Corners" },
    { value: "cross", label: "Cross" },
    { value: "x", label: "X" },
    { value: "custom", label: "Custom" },
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

  const handleAddDrawnNumber = async () => {
    setDrawError(null);
    if (!drawInput.trim()) return;
    const value = Number(drawInput);
    if (!Number.isInteger(value) || value < 1 || value > 75) {
      setDrawError("Debe ser un número entre 1 y 75");
      return;
    }
    setDrawLoading(true);
    try {
      await addNumber(value);
      setDrawInput("");
      toast.success("Número agregado");
    } catch (e: any) {
      setDrawError(e.message || "Error al agregar número");
      toast.error(e.message || "Error al agregar número");
    } finally {
      // getDrawnNumbers(sessionId as string).then(setDrawnNumbers); // This is now handled by useDrawnNumbers
      setDrawLoading(false);
    }
  };

  const handleUndoDrawnNumber = async () => {
    setDrawLoading(true);
    try {
      await removeLastNumber();
      toast.success("Último número eliminado");
    } catch {
      toast.error("No hay números para eliminar");
    } finally {
      // getDrawnNumbers(sessionId as string).then(setDrawnNumbers); // This is now handled by useDrawnNumbers
      setDrawLoading(false);
    }
  };

  const handleDrawInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddDrawnNumber();
    }
  };

  const handleRemoveDrawnNumber = async (value: number) => {
    setDrawLoading(true);
    try {
      // Eliminar solo ese número para esta sesión
      const numbers = await getDrawnNumbers(sessionId as string);
      const filtered = numbers.filter(n => n.value !== value);
      // Guardar el array filtrado en localStorage
      localStorage.setItem('izibingope_drawn_numbers', JSON.stringify([
        ...numbers.filter(n => n.sessionId !== sessionId),
        ...filtered
      ]));
      toast.success(`Número ${value} eliminado`);
      // setDrawnNumbers(filtered); // This is now handled by useDrawnNumbers
    } catch {
      toast.error("Error al eliminar el número");
    } finally {
      setDrawLoading(false);
    }
  };

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

  // --- Lógica de progreso para cada tarjeta ---
  const cardsWithProgress = useMemo(() => {
    return cards.map(card => {
      const campoLibre = card.numbers[2][2]?.toUpperCase() === 'FREE' || card.numbers[2][2] === '-';
      let patternCells = getPatternCoords(pattern as PatternType, campoLibre);
      if (campoLibre) {
        patternCells = patternCells.filter(([r, c]) => !(r === 2 && c === 2));
      }
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

  const [sortByProgress, setSortByProgress] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<string[]>([]); // guardar solo los ids

  // Guardar el orden original al cargar las tarjetas
  useEffect(() => {
    if (cards.length && !originalOrder.length) {
      setOriginalOrder(cards.map(c => c.id));
    }
  }, [cards, originalOrder.length]);

  // Ordenar por progreso si el toggle está activo
  const sortedCardsWithProgress = useMemo(() => {
    if (sortByProgress) {
      return [...cardsWithProgress].sort((a, b) => b.percent - a.percent);
    } else {
      // Restaurar orden original
      return originalOrder.length
        ? originalOrder.map(id => cardsWithProgress.find(c => c.card.id === id)!).filter(Boolean)
        : cardsWithProgress;
    }
  }, [sortByProgress, cardsWithProgress, originalOrder]);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 relative">
      <Toaster position="top-right" />
      {session && <Breadcrumbs sessionName={session.name} />}
      <h1 className="text-2xl font-bold mb-2">{session?.name}</h1>
      <div className="text-sm text-muted-foreground mb-6">
        Creado: {session && new Date(session.createdAt).toLocaleString()}
      </div>
      <DrawnNumbersInput
        sessionId={sessionId as string}
        drawnNumbers={drawnNumbers}
        loading={drawnLoading}
        error={drawnError}
        addNumber={addNumber}
        removeNumber={removeNumber}
        removeLastNumber={removeLastNumber}
      />
      {/* Selector de patrón y toggle de orden */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label htmlFor="pattern-select" className="text-sm font-medium min-w-[110px]">Tipo de juego</label>
        <Select
          value={pattern}
          onValueChange={setPattern}
        >
          <SelectTrigger id="pattern-select" className="w-44" aria-label="Tipo de juego">
            <SelectValue placeholder="Selecciona patrón" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {patternOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Switch
          id="sort-by-progress"
          checked={sortByProgress}
          onCheckedChange={setSortByProgress}
        />
        <label htmlFor="sort-by-progress" className="text-sm font-medium select-none cursor-pointer">
          Ordenar por progreso
        </label>
        <Button
          variant="destructive"
          onClick={async () => {
            if (!window.confirm('¿Seguro que quieres limpiar todos los números extraídos?')) return;
            // Limpiar todos los números de la sesión actual
            if (typeof sessionId === 'string') {
              localStorage.setItem('izibingope_drawn_numbers', JSON.stringify(
                JSON.parse(localStorage.getItem('izibingope_drawn_numbers') || '[]').filter((n: any) => n.sessionId !== sessionId)
              ));
              refreshDrawnNumbers();
            }
          }}
        >
          Limpiar números extraídos
        </Button>
      </div>
      {/* Si patrón es custom, mostrar placeholder */}
      {pattern === "custom" ? (
        <div className="mb-8 flex items-center gap-4">
          <span className="text-muted-foreground">Custom pattern coming soon</span>
          <Button disabled>Define Pattern</Button>
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-20">
        {loading
          ? skeletons.map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded" />
            ))
          : sortedCardsWithProgress.map(({ card, matchedCount, totalCount, remaining, patternCells, percent }) => (
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
              />
            ))}
      </div>
      {/* Floating Action Button */}
      <Button
        className="fixed bottom-8 right-8 z-50 rounded-full w-16 h-16 shadow-lg flex items-center justify-center text-3xl"
        onClick={handleOpenCreate}
        aria-label="Add Card"
        variant="default"
      >
        <Plus className="w-8 h-8" />
      </Button>
      {/* Modal for create/edit card */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md w-full p-4 max-h-[90vh] overflow-y-auto">
          <div className="w-full">
            <DialogHeader>
              <DialogTitle>{modalMode === 'create' ? 'Agregar nueva tarjeta' : 'Editar tarjeta'}</DialogTitle>
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
    </div>
  );
} 