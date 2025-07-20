import { useCallback, useEffect, useState } from "react";
import {
  DrawnNumber,
  getDrawnNumbers,
  addDrawnNumber,
  removeLastDrawnNumber,
} from "@/services/drawnNumberService";

export function useDrawnNumbers(sessionId?: string) {
  const [drawnNumbers, setDrawnNumbers] = useState<DrawnNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!sessionId) return;
    setLoading(true);
    getDrawnNumbers(sessionId)
      .then(setDrawnNumbers)
      .catch(() => setDrawnNumbers([]))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addNumber = useCallback(async (value: number) => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      await addDrawnNumber(sessionId, value);
      refresh();
    } catch (e: any) {
      setError(e.message || "Error al agregar número");
    } finally {
      setLoading(false);
    }
  }, [sessionId, refresh]);

  const removeNumber = useCallback(async (value: number) => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const numbers = await getDrawnNumbers(sessionId);
      const filtered = numbers.filter(n => n.value !== value);
      localStorage.setItem('izibingope_drawn_numbers', JSON.stringify([
        ...numbers.filter(n => n.sessionId !== sessionId),
        ...filtered
      ]));
      setDrawnNumbers(filtered);
    } catch (e: any) {
      setError(e.message || "Error al eliminar número");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const removeLastNumber = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      await removeLastDrawnNumber(sessionId);
      refresh();
    } catch (e: any) {
      setError(e.message || "Error al eliminar el último número");
    } finally {
      setLoading(false);
    }
  }, [sessionId, refresh]);

  return {
    drawnNumbers,
    loading,
    error,
    addNumber,
    removeNumber,
    removeLastNumber,
    refresh,
  };
} 