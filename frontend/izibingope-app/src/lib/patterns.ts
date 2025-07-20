// Definición de patrones de bingo y utilidades

export type PatternType = "full" | "row" | "col" | "l" | "u" | "c" | "corners" | "cross" | "x" | "custom";

export type PatternCell = [number, number]; // [row, col]

// Devuelve las coordenadas del patrón según el tipo (siempre excluye la celda central)
export function getPatternCoords(pattern: PatternType): PatternCell[] {
  switch (pattern) {
    case "full":
      return Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => [r, c] as PatternCell)
      ).flat().filter(([r, c]) => !(r === 2 && c === 2));
    case "row":
      return Array.from({ length: 5 }, (_, c) => [0, c] as PatternCell);
    case "col":
      return Array.from({ length: 5 }, (_, r) => [r, 0] as PatternCell);
    case "l":
      return [
        ...Array.from({ length: 5 }, (_, r) => [r, 0] as PatternCell), // primera columna
        ...Array.from({ length: 5 }, (_, c) => [4, c] as PatternCell)  // última fila
      ].filter(([r, c], idx, arr) => arr.findIndex(([r2, c2]) => r2 === r && c2 === c) === idx)
        .filter(([r, c]) => !(r === 2 && c === 2));
    case "u":
      return [
        ...Array.from({ length: 5 }, (_, r) => [r, 0] as PatternCell), // primera columna
        ...Array.from({ length: 5 }, (_, r) => [r, 4] as PatternCell), // última columna
        ...Array.from({ length: 5 }, (_, c) => [4, c] as PatternCell)  // última fila
      ].filter(([r, c], idx, arr) => arr.findIndex(([r2, c2]) => r2 === r && c2 === c) === idx)
        .filter(([r, c]) => !(r === 2 && c === 2));
    case "c":
      return [
        ...Array.from({ length: 5 }, (_, r) => [r, 0] as PatternCell), // primera columna
        ...Array.from({ length: 5 }, (_, c) => [0, c] as PatternCell), // primera fila
        ...Array.from({ length: 5 }, (_, c) => [4, c] as PatternCell)  // última fila
      ].filter(([r, c], idx, arr) => arr.findIndex(([r2, c2]) => r2 === r && c2 === c) === idx)
        .filter(([r, c]) => !(r === 2 && c === 2));
    case "corners":
      return [ [0,0], [0,4], [4,0], [4,4] ];
    case "cross":
      return [
        ...Array.from({ length: 5 }, (_, i) => [2, i] as PatternCell), // fila central
        ...Array.from({ length: 5 }, (_, i) => [i, 2] as PatternCell)  // columna central
      ].filter(([r, c], idx, arr) => arr.findIndex(([r2, c2]) => r2 === r && c2 === c) === idx)
        .filter(([r, c]) => !(r === 2 && c === 2));
    case "x":
      return [
        ...Array.from({ length: 5 }, (_, i) => [i, i] as PatternCell), // diagonal principal
        ...Array.from({ length: 5 }, (_, i) => [i, 4 - i] as PatternCell) // diagonal secundaria
      ].filter(([r, c], idx, arr) => arr.findIndex(([r2, c2]) => r2 === r && c2 === c) === idx)
        .filter(([r, c]) => !(r === 2 && c === 2));
    case "custom":
      return []; // No implementado
    default:
      return [];
  }
} 