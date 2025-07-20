import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente a /bingo-sessions
    router.replace('/bingo-sessions');
  }, [router]);

  // Mostrar un loading mientras se redirige
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirigiendo a Bingo Sessions...</p>
      </div>
    </div>
  );
} 