import { useEffect, useState, useRef } from "react";
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Bingo Cards</h1>
        <Button
          variant="outline"
          onClick={() => router.push(`/bingo-sessions/${sessionId}`)}
        >
          Back to Session
        </Button>
      </div>

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

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.length === 0 && !loading && (
          <div className="col-span-full text-center text-muted-foreground py-8">
            No cards yet. Create your first bingo card above.
          </div>
        )}
        {cards.map((card) => (
          <Card
            key={card.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(`/bingo-sessions/${sessionId}/cards/${card.id}`)}
          >
            <CardContent className="py-4">
              <div className="flex justify-between items-start mb-3">
                <span className="font-semibold">{card.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(card.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              {/* Mini Grid Preview */}
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 