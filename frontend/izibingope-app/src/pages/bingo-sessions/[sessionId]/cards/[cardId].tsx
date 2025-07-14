import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getBingoCard, deleteBingoCard, BingoCard } from "@/services/bingoCardService";

export default function BingoCardDetail() {
  const router = useRouter();
  const { id: sessionId, cardId } = router.query;
  const [card, setCard] = useState<BingoCard | null>(null);
  const [cardName, setCardName] = useState("");
  const [numbers, setNumbers] = useState<string[][]>(
    Array(5).fill(null).map(() => Array(5).fill(""))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof cardId !== "string") return;
    
    setLoading(true);
    setError(null);
    getBingoCard(cardId)
      .then((cardData) => {
        if (cardData) {
          setCard(cardData);
          setCardName(cardData.name);
          setNumbers(cardData.numbers);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Error loading card");
        setLoading(false);
      });
  }, [cardId]);

  const handleNumberChange = (row: number, col: number, value: string) => {
    const newNumbers = [...numbers];
    newNumbers[row][col] = value;
    setNumbers(newNumbers);
  };

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    setError(null);
    try {
      // TODO: Implement updateBingoCard function
      console.log("Saving card:", { id: card.id, name: cardName, numbers });
      setSaving(false);
    } catch (e) {
      setError("Error saving card");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!card || typeof cardId !== "string") return;
    if (!confirm("Are you sure you want to delete this card?")) return;
    
    setSaving(true);
    setError(null);
    try {
      await deleteBingoCard(cardId);
      router.push(`/bingo-sessions/${sessionId}/cards`);
    } catch (e) {
      setError("Error deleting card");
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading card...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!card) return <div className="p-8 text-muted-foreground">Card not found.</div>;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Edit Bingo Card</h1>
        <Button
          variant="outline"
          onClick={() => router.push(`/bingo-sessions/${sessionId}/cards`)}
        >
          Back to Cards
        </Button>
      </div>

      <Card>
        <CardContent className="py-6">
          <div className="space-y-6">
            {/* Card Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Card Name</label>
              <Input
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                disabled={saving}
                placeholder="Enter card name"
              />
            </div>

            {/* Numbers Grid */}
            <div>
              <label className="block text-sm font-medium mb-2">Numbers (5x5 Grid)</label>
              <div className="grid grid-cols-5 gap-2 max-w-xs">
                {numbers.map((row, rowIndex) =>
                  row.map((number, colIndex) => (
                    <Input
                      key={`${rowIndex}-${colIndex}`}
                      value={number}
                      onChange={(e) => handleNumberChange(rowIndex, colIndex, e.target.value)}
                      disabled={saving}
                      className="w-12 h-12 text-center rounded-md"
                      placeholder="0"
                    />
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving ? "Deleting..." : "Delete Card"}
              </Button>
            </div>

            {/* Card Info */}
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <p>Created: {new Date(card.createdAt).toLocaleString()}</p>
                <p>Card ID: {card.id}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 