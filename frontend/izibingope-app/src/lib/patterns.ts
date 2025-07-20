// Definición de patrones de bingo y utilidades

export type PatternType = "full" | "row" | "corners" | "cross" | "x" | "custom";

export type PatternCell = [number, number]; // [row, col]

// Devuelve las coordenadas del patrón según el tipo y si hay campo libre
export function getPatternCoords(pattern: PatternType, campoLibre: boolean): PatternCell[] {
  switch (pattern) {
    case "full":
      return Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => [r, c] as PatternCell)
      ).flat().filter(([r, c]) => campoLibre || !(r === 2 && c === 2));
    case "row":
      return Array.from({ length: 5 }, (_, c) => [0, c] as PatternCell);
    case "corners":
      return [ [0,0], [0,4], [4,0], [4,4] ];
    case "cross":
      return [
        ...Array.from({ length: 5 }, (_, i) => [2, i] as PatternCell), // fila central
        ...Array.from({ length: 5 }, (_, i) => [i, 2] as PatternCell)  // columna central
      ].filter(([r, c], idx, arr) => arr.findIndex(([r2, c2]) => r2 === r && c2 === c) === idx)
        .filter(([r, c]) => campoLibre || !(r === 2 && c === 2));
    case "x":
      return [
        ...Array.from({ length: 5 }, (_, i) => [i, i] as PatternCell), // diagonal principal
        ...Array.from({ length: 5 }, (_, i) => [i, 4 - i] as PatternCell) // diagonal secundaria
      ].filter(([r, c], idx, arr) => arr.findIndex(([r2, c2]) => r2 === r && c2 === c) === idx)
        .filter(([r, c]) => campoLibre || !(r === 2 && c === 2));
    case "custom":
      return []; // No implementado
    default:
      return [];
  }
} 