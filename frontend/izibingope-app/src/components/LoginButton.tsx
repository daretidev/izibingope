import { Button } from "./ui/button";
import { useSession, signIn, signOut } from "next-auth/react";

export function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <Button disabled>Loading…</Button>;
  }

  if (!session) {
    return (
      <Button onClick={() => signIn("google")}>Sign in with Google</Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-foreground">{session.user?.name}</span>
      <Button variant="secondary" onClick={() => signOut()}>Sign out</Button>
    </div>
  );
} 