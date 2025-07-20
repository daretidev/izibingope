import React, { useState } from "react";

/**
 * Componente interactivo para dibujar un patrón de bingo 5x5.
 * Props:
 * - initialPattern?: boolean[][] (opcional)
 * - onChange?: (pattern: boolean[][]) => void (opcional)
 */
export const PatternGrid: React.FC<{
  initialPattern?: boolean[][];
  onChange?: (pattern: boolean[][]) => void;
}> = ({ initialPattern, onChange }) => {
  // Estado local del patrón (5x5)
  const [pattern, setPattern] = useState<boolean[][]>(
    initialPattern && initialPattern.length === 5 && initialPattern[0].length === 5
      ? initialPattern.map(row => [...row])
      : Array(5).fill(null).map(() => Array(5).fill(false))
  );

  // Contar seleccionadas
  const selectedCount = pattern.flat().filter(Boolean).length;

  // Toggle de celda
  const toggleCell = (row: number, col: number) => {
    setPattern(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = !next[row][col];
      onChange?.(next);
      return next;
    });
  };

  // Seleccionar todo
  const selectAll = () => {
    const next = Array(5).fill(null).map(() => Array(5).fill(true));
    setPattern(next);
    onChange?.(next);
  };

  // Limpiar todo
  const clearAll = () => {
    const next = Array(5).fill(null).map(() => Array(5).fill(false));
    setPattern(next);
    onChange?.(next);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-5 gap-2">
        {pattern.map((row, rowIdx) =>
          row.map((isActive, colIdx) => (
            <button
              key={rowIdx + '-' + colIdx}
              className={`
                w-12 h-12 sm:w-14 sm:h-14 rounded-md border-2
                ${isActive ? 'bg-primary border-primary shadow-lg scale-105 text-white' : 'bg-white border-gray-300 text-gray-400'}
                transition-all duration-150
                active:scale-95
                focus:outline-none focus:ring-2 focus:ring-primary/50
              `}
              onClick={() => toggleCell(rowIdx, colIdx)}
              aria-pressed={isActive}
              tabIndex={0}
              type="button"
            >
              {isActive ? <span className="font-bold text-lg">✔</span> : null}
            </button>
          ))
        )}
      </div>
      <div className="flex gap-2 mt-2">
        <button
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs font-medium"
          onClick={selectAll}
          type="button"
        >
          Seleccionar todo
        </button>
        <button
          className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs font-medium"
          onClick={clearAll}
          type="button"
        >
          Limpiar
        </button>
      </div>
      <div className="text-xs text-muted-foreground">
        {selectedCount} celdas seleccionadas
      </div>
    </div>
  );
}; 