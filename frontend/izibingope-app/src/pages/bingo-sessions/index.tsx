import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  createBingoSession,
  getBingoSessions,
  BingoSession,
} from "@/services/bingoSessionService";

export default function BingoSessionsPage() {
  const [sessions, setSessions] = useState<BingoSession[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBingoSessions();
      setSessions(data);
    } catch (e) {
      setError("Error loading sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createBingoSession(sessionName.trim());
      setSessionName("");
      await fetchSessions();
    } catch (e) {
      setError("Error creating session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Bingo Sessions</h1>
      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <Input
          placeholder="Session name"
          value={sessionName}
          onChange={e => setSessionName(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !sessionName.trim()}>
          {loading ? "Creating..." : "Create Session"}
        </Button>
      </form>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="grid gap-4">
        {sessions.length === 0 && !loading && (
          <div className="text-muted-foreground">No sessions yet.</div>
        )}
        {sessions.map(session => (
          <Card
            key={session.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(`/bingo-sessions/${session.id}`)}
          >
            <CardContent className="py-4 flex flex-col gap-1">
              <span className="font-semibold text-lg">{session.name}</span>
              <span className="text-xs text-muted-foreground">
                Created: {new Date(session.createdAt).toLocaleString()}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 