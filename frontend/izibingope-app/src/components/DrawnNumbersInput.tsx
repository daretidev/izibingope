import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useDrawnNumbers } from "@/hooks/useDrawnNumbers";
import React, { useState } from "react";

interface DrawnNumbersInputProps {
  sessionId: string;
  onChange?: () => void;
  drawnNumbers?: import("@/services/drawnNumberService").DrawnNumber[];
  loading?: boolean;
  error?: string | null;
  addNumber?: (value: number) => Promise<void>;
  removeNumber?: (value: number) => Promise<void>;
  removeLastNumber?: () => Promise<void>;
}

export const DrawnNumbersInput: React.FC<DrawnNumbersInputProps> = ({ sessionId, onChange, drawnNumbers: drawnNumbersProp, loading: loadingProp, error: errorProp, addNumber: addNumberProp, removeNumber: removeNumberProp, removeLastNumber: removeLastNumberProp }) => {
  // Si se pasan props, usarlas; si no, usar el hook (compatibilidad)
  const hook = useDrawnNumbers(sessionId);
  const drawnNumbers = drawnNumbersProp ?? hook.drawnNumbers;
  const loading = loadingProp ?? hook.loading;
  const error = errorProp ?? hook.error;
  const addNumber = addNumberProp ?? hook.addNumber;
  const removeNumber = removeNumberProp ?? hook.removeNumber;
  const removeLastNumber = removeLastNumberProp ?? hook.removeLastNumber;
  const [input, setInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleAdd = async () => {
    setLocalError(null);
    if (!input.trim()) return;
    const value = Number(input);
    if (!Number.isInteger(value) || value < 1 || value > 75) {
      setLocalError("Debe ser un número entre 1 y 75");
      return;
    }
    try {
      await addNumber(value);
      setInput("");
      toast.success("Número agregado");
      onChange?.();
    } catch (e: any) {
      setLocalError(e.message || "Error al agregar número");
      toast.error(e.message || "Error al agregar número");
    }
  };

  const handleRemove = async (value: number) => {
    try {
      await removeNumber(value);
      toast.success(`Número ${value} eliminado`);
      onChange?.();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar el número");
    }
  };

  const handleUndo = async () => {
    try {
      await removeLastNumber();
      toast.success("Último número eliminado");
      onChange?.();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar el último número");
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-end gap-2 mb-2">
        <Input
          type="number"
          min={1}
          max={75}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Número extraído (1-75)"
          className="w-32"
          disabled={loading}
        />
        <Button
          onClick={handleAdd}
          disabled={loading || !input.trim() || Number(input) < 1 || Number(input) > 75 || drawnNumbers.some(n => n.value === Number(input))}
        >
          {loading ? "Agregando..." : "Agregar número"}
        </Button>
        <Button
          variant="outline"
          onClick={handleUndo}
          disabled={loading || drawnNumbers.length === 0}
        >
          Deshacer último
        </Button>
      </div>
      {(localError || error) && <div className="text-red-500 text-sm mt-1">{localError || error}</div>}
      {loading ? (
        <div className="flex gap-2 mt-2">
          <span className="animate-pulse text-muted-foreground">Cargando números...</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-2">
          {drawnNumbers.map(n => (
            <Badge
              key={n.value}
              className="bg-green-400 text-white border-green-600 cursor-pointer hover:bg-green-500 transition"
              onClick={() => handleRemove(n.value)}
              title="Eliminar este número"
              tabIndex={0}
              role="button"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleRemove(n.value); }}
            >
              {n.value}
              <span className="ml-1 text-xs">✕</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}; 