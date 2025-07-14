import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getBingoSession, BingoSession } from "@/services/bingoSessionService";
import { Card, CardContent } from "@/components/ui/card";

export default function BingoSessionDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [session, setSession] = useState<BingoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof id !== "string") return;
    setLoading(true);
    setError(null);
    getBingoSession(id)
      .then((s) => {
        setSession(s ?? null);
        setLoading(false);
      })
      .catch(() => {
        setError("Error loading session");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-8">Loading…</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!session) return <div className="p-8 text-muted-foreground">Session not found.</div>;

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <Card>
        <CardContent className="py-6">
          <h1 className="text-2xl font-bold mb-2">{session.name}</h1>
          <div className="text-sm text-muted-foreground mb-4">
            Created: {new Date(session.createdAt).toLocaleString()}
          </div>
          <div className="mt-4">Manage bingo cards here</div>
        </CardContent>
      </Card>
    </div>
  );
} 