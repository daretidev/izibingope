import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createBingoCard,
  getBingoCards,
  BingoCard,
  BingoCardInput,
} from "@/services/bingoCardService";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  addDrawnNumber,
  getDrawnNumbers,
  removeLastDrawnNumber,
  DrawnNumber,
} from "@/services/drawnNumberService";
import { DrawnNumbersInput } from "@/components/DrawnNumbersInput";
import { CardThumbnail } from "@/components/CardThumbnail";
import { useDrawnNumbers } from "@/hooks/useDrawnNumbers";
import { Alert } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ValidationError {
  row: number;
  col: number;
  type: 'range' | 'duplicate' | 'format' | 'global-range';
  message: string;
}

export default function BingoCardsPage() {
  const router = useRouter();
  const { id: sessionId } = router.query;
  const [cards, setCards] = useState<BingoCard[]>([]);
  const [cardName, setCardName] = useState("");
  const [numbers, setNumbers] = useState<string[][]>(
    Array(5).fill(null).map(() => Array(5).fill(""))
  );
  const [campoLibre, setCampoLibre] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const { drawnNumbers } = useDrawnNumbers(typeof sessionId === 'string' ? sessionId : undefined);
  const [sortByProgress, setSortByProgress] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<BingoCard[]>([]);

  // Estado para patrón y lógica de juego
  const [selectedPattern, setSelectedPattern] = useState<string>("full");
  const hasPattern = !!selectedPattern;
  const hasCards = cards.length > 0;
  const canPlay = hasPattern && hasCards;

  // Guardar el orden original al cargar las tarjetas
  useEffect(() => {
    if (cards.length && !originalOrder.length) {
      setOriginalOrder(cards);
    }
  }, [cards, originalOrder.length]);

  // --- Lógica de progreso para cada tarjeta ---
  const cardsWithProgress = useMemo(() => {
    return cards.map(card => {
      const campoLibre = card.numbers[2][2]?.toUpperCase() === 'FREE' || card.numbers[2][2] === '-';
      // Aquí puedes usar la lógica de patrón que ya tienes si la necesitas
      // Por ahora, solo ejemplo: matchedCount = cantidad de números en drawnNumbers
      const allNumbers = card.numbers.flat().filter(n => n && n !== '-' && n.toUpperCase() !== 'FREE');
      const matchedCount = allNumbers.filter(n => drawnNumbers.some(d => d.value === Number(n))).length;
      const totalCount = allNumbers.length;
      return { card, matchedCount, totalCount };
    });
  }, [cards, drawnNumbers]);

  // Ordenar por progreso si el toggle está activo
  const sortedCards = useMemo(() => {
    if (sortByProgress) {
      return [...cardsWithProgress].sort((a, b) => {
        const percA = a.totalCount ? a.matchedCount / a.totalCount : 0;
        const percB = b.totalCount ? b.matchedCount / b.totalCount : 0;
        return percB - percA;
      });
    } else {
      // Restaurar orden original
      return originalOrder.length ? originalOrder.map(card => cardsWithProgress.find(c => c.card.id === card.id)!).filter(Boolean) : cardsWithProgress;
    }
  }, [sortByProgress, cardsWithProgress, originalOrder]);

  // Column range definitions
  const columnRanges = [
    { min: 1, max: 15, letter: 'B' },
    { min: 16, max: 30, letter: 'I' },
    { min: 31, max: 45, letter: 'N' },
    { min: 46, max: 60, letter: 'G' },
    { min: 61, max: 75, letter: 'O' },
  ];

  // Helper to get a fresh grid with Campo Libre logic
  const getInitialNumbers = (campoLibre: boolean) =>
    Array(5).fill(null).map((_, r) =>
      Array(5).fill('').map((_, c) =>
        !campoLibre && r === 2 && c === 2 ? '' : ''
      )
    );

  // --- Helper to get row input string from grid, always showing '-' in center if Campo Libre is off ---
  function getRowInputFromGrid(rowIdx: number, grid: string[][], campoLibre: boolean): string {
    if (!campoLibre && rowIdx === 2) {
      // Always show '-' in the center
      return [grid[rowIdx][0], grid[rowIdx][1], '-', grid[rowIdx][3], grid[rowIdx][4]].join(' ');
    }
    return grid[rowIdx].join(' ');
  }

  /**
   * Handles manual cell input change, updating the numbers grid and triggering validation.
   */
  const handleNumberChange = (row: number, col: number, value: string) => {
    const newNumbers = numbers.map(arr => [...arr]);
    if (!campoLibre && row === 2 && col === 2) {
      newNumbers[row][col] = '-';
    } else {
      newNumbers[row][col] = value;
    }
    setNumbers(newNumbers);
    setTimeout(() => {
      setValidationErrors(validateAllCells(newNumbers, campoLibre));
    }, 100);
  };

  /**
   * Maps a row input string to the numbers grid, handling Campo Libre logic.
   * - If Campo Libre is off and rowIdx === 2, always set the center cell (col 2) to '-'.
   *   - If user enters 4+ values: [A, B, ...X..., C, D] => [A, B, '-', C, D] (take first 2 and last 2, ignore the rest)
   * @param rowIdx Row index (0-4)
   * @param value Input string (space-separated numbers)
   * @param campoLibre Whether the center cell is enabled
   * @param prevGrid Previous grid state
   * @returns Updated grid for the row
   */
  function mapRowInputToGrid(rowIdx: number, value: string, campoLibre: boolean, prevGrid: string[][]): string[][] {
    let vals = value.split(/\s+/).filter(Boolean);
    const newGrid = prevGrid.map(arr => [...arr]);
    if (!campoLibre && rowIdx === 2) {
      // Take first 2 and last 2 values, center is '-'
      const mapped = [vals[0] || '', vals[1] || '', '-', vals[vals.length - 2] || '', vals[vals.length - 1] || ''];
      for (let c = 0; c < 5; c++) {
        newGrid[rowIdx][c] = mapped[c];
      }
    } else {
      for (let c = 0; c < 5; c++) {
        newGrid[rowIdx][c] = vals[c] || '';
      }
    }
    return newGrid;
  }

  /**
   * Handles manual row input change, updating the numbers grid and triggering validation.
   */
  const handleRowInput = (rowIdx: number, value: string) => {
    const newNumbers = mapRowInputToGrid(rowIdx, value, campoLibre, numbers);
    setNumbers(newNumbers);
    setTimeout(() => {
      setValidationErrors(validateAllCells(newNumbers, campoLibre));
    }, 100);
  };

  /**
   * Handles paste event on a row input, updating the numbers grid and triggering validation.
   */
  const handlePasteRow = (rowIdx: number, e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.preventDefault();
    const vals = e.clipboardData.getData('text');
    const newNumbers = mapRowInputToGrid(rowIdx, vals, campoLibre, numbers);
    setNumbers(newNumbers);
    setTimeout(() => {
      setValidationErrors(validateAllCells(newNumbers, campoLibre));
    }, 100);
  };

  // --- Validation logic ---
  function validateAllCells(nums: string[][], campoLibre: boolean): ValidationError[] {
    const errors: ValidationError[] = [];
    const seen = new Map<string, [number, number][]>();
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!campoLibre && r === 2 && c === 2) continue; // skip center if not free
        const val = nums[r][c];
        if (!val.trim()) continue;
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

  const fetchCards = async () => {
    if (typeof sessionId !== "string") return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBingoCards(sessionId);
      setCards(data);
    } catch (e) {
      setError("Error loading cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchCards();
    }
  }, [sessionId]);

  // When Campo Libre toggles, reset center cell and re-validate
  useEffect(() => {
    setNumbers(prev => {
      const newGrid = prev.map(row => [...row]);
      if (!campoLibre) newGrid[2][2] = '-';
      return newGrid;
    });
    // Re-validate
    setValidationErrors(validateAllCells(numbers, campoLibre));
  }, [campoLibre]);

  // Eliminar las siguientes líneas:
  // - useEffect(() => {
  // -   if (typeof sessionId === "string") {
  // -     setDrawLoading(true);
  // -     getDrawnNumbers(sessionId)
  // -       .then(setDrawnNumbers)
  // -       .catch(() => setDrawnNumbers([]))
  // -       .finally(() => setDrawLoading(false));
  // -   }
  // - }, [sessionId]);

  // Eliminar las siguientes líneas:
  // - const handleAddDrawnNumber = async () => {
  // -   setDrawError(null);
  // -   if (!drawInput.trim()) return;
  // -   const value = Number(drawInput);
  // -   if (!Number.isInteger(value) || value < 1 || value > 75) {
  // -     setDrawError("Debe ser un número entre 1 y 75");
  // -     return;
  // -   }
  // -   setDrawLoading(true);
  // -   try {
  // -     await addDrawnNumber(sessionId as string, value);
  // -     setDrawInput("");
  // -     toast.success("Número agregado");
  // -   } catch (e: any) {
  // -     setDrawError(e.message || "Error al agregar número");
  // -     toast.error(e.message || "Error al agregar número");
  // -   } finally {
  // -     getDrawnNumbers(sessionId as string).then(setDrawnNumbers);
  // -     setDrawLoading(false);
  // -   }
  // - };

  // Eliminar las siguientes líneas:
  // - const handleUndoDrawnNumber = async () => {
  // -   setDrawLoading(true);
  // -   try {
  // -     await removeLastDrawnNumber(sessionId as string);
  // -     toast.success("Último número eliminado");
  // -   } catch {
  // -     toast.error("No hay números para eliminar");
  // -   } finally {
  // -     getDrawnNumbers(sessionId as string).then(setDrawnNumbers);
  // -     setDrawLoading(false);
  // -   }
  // - };

  // Eliminar las siguientes líneas:
  // - const handleDrawInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // -   if (e.key === "Enter") {
  // -     handleAddDrawnNumber();
  // -   }
  // - };

  // --- Cell class logic ---
  const getCellClassName = (row: number, col: number, value: string): string => {
    const isCenter = row === 2 && col === 2;
    const isDisabled = !campoLibre && isCenter;
    let className = `w-12 h-12 text-center rounded-md ${isDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''} ${!value && isDisabled ? 'bg-gray-200' : ''} hover:ring-2 hover:ring-blue-500 focus:ring-2 focus:ring-blue-500`;
    // Only apply error highlight if not disabled center
    const hasError = !isDisabled && validationErrors.some(error => error.row === row && error.col === col);
    if (hasError) {
      className += ' border-red-500 bg-red-100';
    }
    return className;
  };

  // --- Paste logic ---
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const values = pastedText.split(/\s+/).filter(val => val.trim() !== '');
    const requiredCount = campoLibre ? 25 : 24;
    const numericValues = values.filter(val => /^\d+$/.test(val.trim()));
    const invalidCount = values.length - numericValues.length;
    if (numericValues.length < requiredCount) {
      setPasteError(`Necesitas ${requiredCount} valores. Solo se proporcionaron ${numericValues.length}.`);
      return;
    }
    const newNumbers = Array(5).fill(null).map(() => Array(5).fill(""));
    let valueIndex = 0;
    let skippedCenter = false;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (!campoLibre && row === 2 && col === 2) {
          newNumbers[row][col] = '-'; // SIEMPRE guion
          skippedCenter = true;
        } else if (valueIndex < numericValues.length) {
          newNumbers[row][col] = numericValues[valueIndex];
          valueIndex++;
        }
      }
    }
    setNumbers(newNumbers);
    setPasteError(null);
    const errors = validateAllCells(newNumbers, campoLibre);
    setValidationErrors(errors);

    // Show messages
    let message = "";
    if (invalidCount > 0) {
      message += `${invalidCount} valores inválidos eliminados. `;
    }
    if (skippedCenter && numericValues.length > requiredCount) {
      message += "Se omitió el campo central. ";
    }
    if (errors.length > 0) {
      const rangeErrors = errors.filter(e => e.type === 'range').length;
      const duplicateErrors = errors.filter(e => e.type === 'duplicate').length;
      const formatErrors = errors.filter(e => e.type === 'format').length;
      const globalRangeErrors = errors.filter(e => e.type === 'global-range').length;
      
      const errorParts = [];
      if (rangeErrors > 0) errorParts.push(`${rangeErrors} fuera de rango`);
      if (duplicateErrors > 0) errorParts.push(`${duplicateErrors} duplicados`);
      if (formatErrors > 0) errorParts.push(`${formatErrors} formato inválido`);
      if (globalRangeErrors > 0) errorParts.push(`${globalRangeErrors} fuera de 1-75`);
      
      if (errorParts.length > 0) {
        message += `Errores: ${errorParts.join(', ')}`;
      }
    }
    if (message) {
      setPasteError(message);
    }

    // Focus first empty cell
    setTimeout(() => {
      const firstEmptyInput = gridRef.current?.querySelector('input[value=""]') as HTMLInputElement;
      if (firstEmptyInput) {
        firstEmptyInput.focus();
      }
    }, 100);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim() || typeof sessionId !== "string") return;
    
    // Final validation before creating
    const errors = validateAllCells(numbers, campoLibre);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setError("Please fix validation errors before creating the card");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const input: BingoCardInput = {
        sessionId,
        name: cardName.trim(),
        numbers,
      };
      await createBingoCard(input);
      setCardName("");
      setNumbers(Array(5).fill(null).map(() => Array(5).fill("")));
      setCampoLibre(false);
      setPasteError(null);
      setValidationErrors([]);
      await fetchCards();
    } catch (e) {
      setError("Error creating card");
    } finally {
      setLoading(false);
    }
  };

  const getValidationSummary = (): string => {
    if (validationErrors.length === 0) return "";
    
    const rangeErrors = validationErrors.filter(e => e.type === 'range').length;
    const duplicateErrors = validationErrors.filter(e => e.type === 'duplicate').length;
    const formatErrors = validationErrors.filter(e => e.type === 'format').length;
    const globalRangeErrors = validationErrors.filter(e => e.type === 'global-range').length;
    
    const parts = [];
    if (rangeErrors > 0) parts.push(`${rangeErrors} fuera de rango`);
    if (duplicateErrors > 0) parts.push(`${duplicateErrors} duplicados`);
    if (formatErrors > 0) parts.push(`${formatErrors} formato inválido`);
    if (globalRangeErrors > 0) parts.push(`${globalRangeErrors} fuera de 1-75`);
    
    return parts.join(', ');
  };

  if (typeof sessionId !== "string") {
    return <div className="p-8">Loading session...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <DrawnNumbersInput sessionId={sessionId as string} />
      <h1 className="text-2xl font-bold mb-2">Bingo Cards</h1>
      <div className="text-sm text-muted-foreground mb-6">
        {/* Aquí podrías mostrar la fecha de la sesión si está disponible */}
      </div>
      {/* Selector de patrón arriba, justo después del título y fecha */}
      <div className="mb-6 flex items-center gap-4">
        <label htmlFor="pattern-select" className="text-sm font-medium min-w-[110px]">Tipo de juego</label>
        <Select
          value={selectedPattern}
          onValueChange={setSelectedPattern}
        >
          <SelectTrigger id="pattern-select" className="w-44" aria-label="Tipo de juego">
            <SelectValue placeholder="Selecciona patrón" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="full">Full Card</SelectItem>
              <SelectItem value="row">First Row</SelectItem>
              <SelectItem value="corners">Four Corners</SelectItem>
              <SelectItem value="cross">Cross</SelectItem>
              <SelectItem value="x">X</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {/* Grid de tarjetas siempre visible debajo del selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.length === 0 && !loading && (
          <div className="col-span-full text-center text-muted-foreground py-8">
            No cards yet. Create your first bingo card above.
          </div>
        )}
        {cards.map((card) => (
          <CardThumbnail
            key={card.id}
            card={card}
            drawnNumbers={drawnNumbers}
            onEdit={() => router.push(`/bingo-sessions/${sessionId}/cards/${card.id}`)}
            onDelete={() => {}}
            loading={false}
          />
        ))}
      </div>
      {/* Controles de juego condicionales o Alert debajo del grid */}
      {canPlay ? (
        <>
          {/* Aquí van los controles: input, agregar número, deshacer, limpiar, badges, toggle de orden */}
          {/* Create Card Form */}
          <Card className="mb-8">
            <CardContent className="py-6">
              <h2 className="text-lg font-semibold mb-4">Create New Card</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Card Name</label>
                  <Input
                    placeholder="Enter card name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="campo-libre"
                    checked={campoLibre}
                    onCheckedChange={(checked) => setCampoLibre(checked as boolean)}
                    disabled={loading}
                  />
                  <label htmlFor="campo-libre" className="text-sm font-medium">
                    Campo Libre (centro)
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Numbers (5x5 Grid)</label>
                  <div 
                    ref={gridRef}
                    className="grid grid-cols-5 gap-2 border-2 p-4 max-w-xs"
                    onPaste={handlePaste}
                    tabIndex={0}
                  >
                    {/* Column Headers */}
                    <div className="col-span-5 grid grid-cols-5 gap-2 mb-2">
                      {['B', 'I', 'N', 'G', 'O'].map((letter, index) => (
                        <div key={letter} className="w-12 h-8 flex items-center justify-center font-bold text-sm">
                          {letter}
                          <div className="text-xs text-muted-foreground ml-1">
                            {columnRanges[index].min}-{columnRanges[index].max}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Numbers Grid */}
                    {numbers.map((row, rowIndex) =>
                      row.map((number, colIndex) => {
                        const isCenter = rowIndex === 2 && colIndex === 2;
                        const isDisabled = !campoLibre && isCenter;
                        
                        return (
                          <Input
                            key={`${rowIndex}-${colIndex}`}
                            value={isDisabled ? '-' : number}
                            onChange={(e) => handleNumberChange(rowIndex, colIndex, e.target.value)}
                            disabled={loading || isDisabled}
                            className={getCellClassName(rowIndex, colIndex, number)}
                            placeholder={isDisabled ? "FREE" : "0"}
                          />
                        );
                      })
                    )}
                  </div>
                  
                  {pasteError && (
                    <div className="text-red-500 text-sm mt-2">{pasteError}</div>
                  )}
                  
                  {getValidationSummary() && (
                    <div className="text-red-500 text-sm mt-2">
                      Errores de validación: {getValidationSummary()}
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={loading || !cardName.trim() || validationErrors.length > 0}>
                  {loading ? "Creating..." : "Add Card"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {error && <div className="text-red-500 mb-4">{error}</div>}

          {/* Toggle de orden por progreso */}
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant={sortByProgress ? "default" : "outline"}
              onClick={() => setSortByProgress(v => !v)}
            >
              Ordenar por progreso
            </Button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCards.length === 0 && !loading && (
              <div className="col-span-full text-center text-muted-foreground py-8">
                No cards yet. Create your first bingo card above.
              </div>
            )}
            {sortedCards.map(({ card, matchedCount, totalCount }) => (
              <CardThumbnail
                key={card.id}
                card={card}
                matchedCount={matchedCount}
                totalCount={totalCount}
                drawnNumbers={drawnNumbers}
                onEdit={() => router.push(`/bingo-sessions/${sessionId}/cards/${card.id}`)}
                onDelete={() => {}}
                loading={false}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="flex justify-center my-12">
          <Alert variant="default">
            Selecciona un modo de juego y agrega al menos una tarjeta para empezar a jugar.
          </Alert>
        </div>
      )}
    </div>
  );
} 