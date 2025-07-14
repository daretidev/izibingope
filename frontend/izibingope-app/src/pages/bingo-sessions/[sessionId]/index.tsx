import { useEffect, useState } from "react";
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

function Breadcrumbs({ sessionName }: { sessionName: string }) {
  return (
    <nav className="mb-6 text-sm text-muted-foreground flex items-center gap-2">
      <Link href="/bingo-sessions" className="hover:underline">Sessions</Link>
      <span>&gt;</span>
      <span className="font-semibold text-foreground">{sessionName}</span>
      <span>&gt;</span>
      <span>Cards</span>
    </nav>
  );
}

function CardThumbnail({ card, onEdit, onDelete, loading }: {
  card: BingoCard;
  onEdit: () => void;
  onDelete: () => void;
  loading: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Card
      className="relative group cursor-pointer hover:shadow-lg transition-shadow"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CardContent className="py-4">
        <div className="flex justify-between items-start mb-3">
          <span className="font-semibold">{card.name}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(card.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1 text-xs">
          {card.numbers.map((row, rowIndex) =>
            row.map((number, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="bg-muted p-1 text-center rounded min-h-[24px] flex items-center justify-center"
              >
                {number || "•"}
              </div>
            ))
          )}
        </div>
        {/* Overlay icons */}
        {hovered && !loading && (
          <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/30 rounded transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="text-white hover:text-blue-300 text-xl"
              title="Edit"
            >
              ✏️
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="text-white hover:text-red-400 text-xl"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cards">Cards</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardContent className="py-6">
              <h1 className="text-2xl font-bold mb-2">{session?.name}</h1>
              <div className="text-sm text-muted-foreground mb-4">
                Created: {session && new Date(session.createdAt).toLocaleString()}
              </div>
              <p>Manage bingo cards for this session.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cards">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-20">
            {loading
              ? skeletons.map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded" />
                ))
              : cards.map(card => (
                  <CardThumbnail
                    key={card.id}
                    card={card}
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
            <DialogContent className="max-w-2xl w-full p-0 flex items-center justify-center min-h-[80vh] sm:min-h-[unset] mt-12 sm:mt-0">
              <div className="w-full max-w-lg p-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
} 