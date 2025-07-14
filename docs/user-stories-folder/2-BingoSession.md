In the existing Next.js TypeScript project (`izibingope-app`), implement a localStorage–based “BingoSession” service with an API that matches a future Firestore implementation.

1. Create `src/services/bingoSessionService.ts` exporting:
   - interface BingoSession { id: string; name: string; createdAt: string; }
   - const BINGO_SESSION_STORAGE_KEY = 'izibingope_bingo_sessions';
   - async function createBingoSession(name: string): Promise<string>  
     • Generate a unique ID (e.g., with Date.now() or uuid).  
     • Read array from localStorage (parse JSON or default []).  
     • Push { id, name, createdAt: new Date().toISOString() }.  
     • Save back to localStorage.  
     • Return new session ID.
   - async function getBingoSessions(): Promise<BingoSession[]>  
     • Read and parse from localStorage or return [].
   - async function getBingoSession(id: string): Promise<BingoSession | undefined>  
     • Call getBingoSessions() and find by id.
   - Add at top: `// TODO: swap to Firestore implementation later, keeping these signatures.`

2. In `src/pages/bingo-sessions/index.tsx`:
   - useEffect → call getBingoSessions(), store in state.
   - Render a Shadcn/ui form:  
     • Input for “Session name”  
     • Button “Create Session” that calls createBingoSession() then refreshes state.
   - List sessions in Cards: show name and formatted createdAt; clicking routes to `/bingo-sessions/[id]`.

3. In `src/pages/bingo-sessions/[id].tsx`:
   - Read `id` from useRouter().  
   - Call getBingoSession(id) and display session.name with placeholder “Manage bingo cards here”.

4. Handle loading/error states (e.g., disable button while creating).

Use idiomatic TypeScript, Tailwind utility classes, and Shadcn/ui components throughout.
