# Izibingope App

## Development

```bash
npm run dev
# or
yarn dev
```

## Production Build

```bash
npm run build && npm run start
```

## Deploy to Vercel

- One-click: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
- Or via CLI:

```bash
vercel --prod
```

## Google OAuth Setup (NextAuth.js)

1. **Create a `.env.local` file in `frontend/izibingope-app/` with:**
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   NEXTAUTH_URL=http://localhost:3000
   ```
   - Get your credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Usage:**
   - Click "Sign in with Google" to authenticate.
   - Once signed in, your name and a "Sign out" button will appear.
   - Click "Sign out" to end your session.

## Bingo Sessions Feature

### Overview
A localStorage-based bingo session management system with an API designed to be easily migrated to Firestore later.

### Files Added/Modified

#### Service Layer
- **`src/services/bingoSessionService.ts`**
  - `BingoSession` interface with `id`, `name`, `createdAt`
  - `createBingoSession(name: string): Promise<string>` - Creates new session with unique ID
  - `getBingoSessions(): Promise<BingoSession[]>` - Retrieves all sessions
  - `getBingoSession(id: string): Promise<BingoSession | undefined>` - Gets specific session
  - Uses localStorage key: `izibingope_bingo_sessions`

#### Pages
- **`src/pages/bingo-sessions/index.tsx`**
  - Session creation form with input and button
  - Displays all sessions in shadcn/ui Cards
  - Clickable cards navigate to session detail
  - Handles loading states and error handling
  - Responsive design with Tailwind CSS

- **`src/pages/bingo-sessions/[id].tsx`**
  - Dynamic route for individual session details
  - Displays session name and creation date
  - Placeholder for future bingo card management
  - Error handling for missing sessions

#### Updated Components
- **`src/pages/index.tsx`**
  - Added "Ir a Bingo Sessions" button linking to `/bingo-sessions`
  - Uses Next.js Link and shadcn/ui Button
  - Maintains existing framer-motion animations

### Usage
1. Navigate to `/bingo-sessions` or click the button on the home page
2. Create a new session by entering a name and clicking "Create Session"
3. Click on any session card to view details
4. Sessions are stored in browser localStorage

### Technical Details
- **TypeScript**: Fully typed interfaces and functions
- **Error Handling**: Comprehensive error states and loading indicators
- **UI Components**: Uses shadcn/ui Button, Input, Card components
- **Styling**: Tailwind CSS utility classes throughout
- **Future-Proof**: API signatures designed for Firestore migration

## Project Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── ExampleButton.tsx
│   └── LoginButton.tsx
├── pages/
│   ├── api/auth/     # NextAuth.js API routes
│   ├── bingo-sessions/
│   │   ├── index.tsx # Session list & creation
│   │   └── [id].tsx  # Session detail
│   ├── _app.tsx      # SessionProvider wrapper
│   └── index.tsx     # Home page
├── services/
│   └── bingoSessionService.ts
├── hooks/            # Custom React hooks
├── styles/           # Additional styles
└── lib/              # Utility functions
```

## Added Dependencies

- **[shadcn/ui](https://ui.shadcn.com/):** Modern, accessible React UI components built on top of Radix UI and Tailwind CSS.
- **[framer-motion](https://www.framer.com/motion/):** Production-ready animation library for React.
- **[next-auth](https://next-auth.js.org/):** Authentication for Next.js, supporting OAuth providers like Google.

## Development Notes

### Authentication
- NextAuth.js configured with Google OAuth
- Session management with `SessionProvider`
- Login/logout functionality with `LoginButton` component

### Bingo Sessions
- localStorage-based data persistence
- Unique ID generation using timestamp + random string
- Form validation and error handling
- Responsive UI with shadcn/ui components

### Animations
- Framer-motion animations on home page
- Smooth transitions and hover effects
- Optimized performance with proper easing

---

This project uses Next.js, TypeScript, and Tailwind CSS. UI components are organized in `src/components/`.
