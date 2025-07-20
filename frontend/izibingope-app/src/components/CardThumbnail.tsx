import { Card, CardContent } from "@/components/ui/card";
import { DrawnNumber } from "@/services/drawnNumberService";
import { BingoCard } from "@/services/bingoCardService";
import React, { useState } from "react";

interface CardThumbnailProps {
  card: BingoCard;
  onEdit: () => void;
  onDelete: () => void;
  loading: boolean;
  drawnNumbers?: DrawnNumber[];
  patternCells?: [number, number][];
  matchedCount?: number;
  totalCount?: number;
  remaining?: number;
  isMaxProgress?: boolean;
}

export const CardThumbnail: React.FC<CardThumbnailProps> = ({ card, onEdit, onDelete, loading, drawnNumbers, patternCells, matchedCount, totalCount, remaining, isMaxProgress }) => {
  const [hovered, setHovered] = useState(false);
  // Para resaltar celdas del patrón
  const isPatternCell = (row: number, col: number) => patternCells?.some(([r, c]) => r === row && c === col);
  // Borde verde si bingo, azul si es la más avanzada
  const borderClass = remaining === 0 && typeof remaining === 'number'
    ? 'border-2 border-green-500'
    : isMaxProgress ? 'border-2 border-blue-500 bg-blue-50' : '';
  return (
    <Card
      className={`relative group cursor-pointer hover:shadow-lg transition-shadow ${borderClass} focus:ring-2 focus:ring-blue-500 hover:ring-2 hover:ring-blue-500`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      tabIndex={0}
    >
      <CardContent className="py-4">
        <div className="flex justify-between items-start mb-3">
          <span className="font-semibold">{card.name}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(card.createdAt).toLocaleDateString()}
          </span>
        </div>
        {/* Badge de progreso */}
        {typeof matchedCount === 'number' && typeof totalCount === 'number' && (
          <div className="absolute top-2 right-2">
            <span
              className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded shadow"
              title={`Faltan ${totalCount - matchedCount} casillas para completar`}
              aria-label={`Tarjeta ${card.name}: ${matchedCount} de ${totalCount} completadas`}
            >
              {matchedCount}/{totalCount}
            </span>
          </div>
        )}
        <div className="grid grid-cols-5 gap-1 text-xs mb-2">
          {card.numbers.map((row, rowIndex) =>
            row.map((number, colIndex) => {
              const isMarked = drawnNumbers?.some(n => n.value === Number(number));
              const highlight = isPatternCell(rowIndex, colIndex) ? 'bg-yellow-100' : '';
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`p-1 text-center rounded min-h-[24px] flex items-center justify-center transition ${isMarked ? 'bg-green-400 text-white font-bold' : highlight || 'bg-muted'}`}
                >
                  {number || "•"}
                </div>
              );
            })
          )}
        </div>
        {/* Barra de progreso */}
        {typeof matchedCount === 'number' && typeof totalCount === 'number' && totalCount > 0 && (
          <div
            className="w-full h-1 bg-gray-200 rounded-full mb-1"
            title={`Faltan ${totalCount - matchedCount} casillas para completar`}
          >
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(matchedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
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
}; 