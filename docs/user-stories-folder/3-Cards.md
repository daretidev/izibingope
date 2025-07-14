In the existing Next.js TypeScript project (`izibingope-app`), implement localStorage–based manual entry of bingo cards (“BingoCard”) within a BingoSession:

1. Under `src/services/`, create `bingoCardService.ts` exporting:
   - interface BingoCard { id: string; sessionId: string; name: string; numbers: string[][]; createdAt: string; }
   - interface BingoCardInput { sessionId: string; name: string; numbers: string[][]; }
   - const BINGO_CARD_STORAGE_KEY = 'izibingope_bingo_cards';
   - async function createBingoCard(input: BingoCardInput): Promise<string>
   - async function getBingoCards(sessionId: string): Promise<BingoCard[]>
   - async function getBingoCard(id: string): Promise<BingoCard | undefined>
   - Add `// TODO: swap to Firestore implementation later, keeping these signatures.`

2. Create page `src/pages/bingo-sessions/[id]/cards/index.tsx`:
   - Read `sessionId` from `useRouter()`.
   - useEffect → call getBingoCards(sessionId) and set state.
   - Form to add a new card:
     • Input for alias (`name`).
     • A 5×5 grid of Inputs for `numbers` (string).
     • Button “Add Card” that calls createBingoCard({ sessionId, name, numbers }) then refreshes the list.
   - Render existing cards in a grid of Shadcn/ui Cards, each showing the alias and a mini 5×5 preview. Click navigates to `/bingo-sessions/[id]/cards/[cardId]`.

3. Create detail page `src/pages/bingo-sessions/[id]/cards/[cardId].tsx`:
   - Read `sessionId` and `cardId`.
   - Call getBingoCard(cardId) to fetch.
   - Display editable alias and full 5×5 grid. Include “Save” and “Delete” buttons (use updateBingoCard and deleteBingoCard when implemented).

4. Handle loading and error states: disable form/button while saving, show simple error messages.

Use idiomatic TypeScript, Tailwind CSS utility classes, and Shadcn/ui components throughout.


----------------------------------------


In the existing Next.js + TypeScript project `izibingope-app`, enhance the bingo-card entry UI in `src/pages/bingo-sessions/[id]/cards/index.tsx` to support these features:

1. **“Campo Libre” checkbox**  
   - Add a Shadcn/ui `<Checkbox>` labeled “Campo Libre (centro)” above the 5×5 grid.  
   - Default unchecked: disable the center cell (row 3, col 3) — render it as a grey, non-editable `<Input>` with `disabled`.  
   - When checked: enable that center cell for numeric input.

2. **Bulk-paste support**  
   - Attach an `onPaste` handler to the grid container.  
   - Parse pasted text by whitespace into an array of values.  
   - Determine required count:  
     - If “Campo Libre” **unchecked**, require **24** values (skip center).  
     - If **checked**, require **25**.  
   - Fill inputs in strict row-major order (left→right, top→bottom), automatically skipping the center when unchecked.  
   - Extra values beyond the required count: ignore extras, and if the center was skipped, show inline message “Se omitió el campo central”.  
   - If fewer than required: show “Necesitas X valores”.  
   - Filter out non-numeric entries, count them, and display “X valores inválidos eliminados”.

3. **Visual styling**  
   - Use Tailwind to render the grid: `grid grid-cols-5 gap-2 border-2 p-4`.  
   - Above, display column headers **B I N G O** in bold.  
   - Each cell is a Shadcn/ui `<Input>` with `className="w-12 h-12 text-center rounded-md"`.  
   - Disabled/empty cells use `bg-gray-200`.  
   - On hover/focus: add `ring-2 ring-blue-500`.

4. **Cursor focus & error display**  
   - After auto-filling, move focus to the first empty cell.  
   - Render error messages (in red, `text-red-500`) below the grid.

Implement all in idiomatic TypeScript + React. Use Shadcn/ui components and Tailwind CSS throughout. ```


---------------------------------

In the existing Next.js + TypeScript project `izibingope-app`, enhance the bingo card entry page at `src/pages/bingo-sessions/[id]/cards/index.tsx` to include the following client-side validations:

1. **Column Range Validation**  
   - Column B (index 0): allow only integers 1–15  
   - Column I (index 1): allow only integers 16–30  
   - Column N (index 2): allow only integers 31–45  
   - Column G (index 3): allow only integers 46–60  
   - Column O (index 4): allow only integers 61–75  

2. **Unique Values**  
   - No number may appear more than once in the same card.  
   - On entry or paste, detect duplicates and apply a red border (`border-red-500`) or red background (`bg-red-100`) to duplicate cells.

3. **Integer-Only Format**  
   - Accept only positive whole numbers.  
   - Mark decimals, text, or special characters in red.

4. **Global Range**  
   - All numbers must be between 1 and 75 inclusive.  
   - Values outside this range should be highlighted in red.

**Implementation Details:**
- Apply these checks in both the individual cell `onChange`/`onBlur` handlers and in the bulk-paste `onPaste` flow.
- Invalid cells should use Tailwind CSS classes (`border-red-500`, `bg-red-100`) on the Shadcn/ui `<Input>`.
- Display a summary message under the grid in red text (e.g. “3 invalid entries, 2 duplicates”) when there are any validation errors.
- Preserve the existing “Campo Libre” checkbox behavior, bulk-paste auto-fill, and grid layout.
- Use idiomatic TypeScript, React hooks, and Tailwind utility classes throughout.
---------------------------------------



In the existing Next.js + TypeScript project `izibingope-app`, enhance both the BingoSession page and the card‐creation flow as follows:

1. **Session Page UI & Navigation** (`src/pages/bingo-sessions/[id]/index.tsx`):
   - Replace the single “Manage Bingo Cards” button with a **tabbed interface** using Shadcn/ui Tabs: “Overview” and “Cards”.
   - Under the **Cards** tab:
     • Display all cards as Shadcn/ui `<Card>` thumbnails in a responsive grid.  
     • Each thumbnail shows the card’s alias and a mini 5×5 preview.  
     • On hover, reveal edit (✏️) and delete (🗑️) icons overlayed.  
   - Add a **Floating Action Button** (FAB) in the bottom-right corner with a “+” icon to open the card modal.
   - Implement a **Modal** (Shadcn/ui Dialog or Drawer) for creating/editing cards—no full-page navigation.
   - Show **breadcrumbs** at the top: “Sessions > [session name] > Cards”.
   - Use **skeleton loaders** while the thumbnails load, and **toast notifications** on create/edit/delete actions.

2. **Card Creation Flow** (`src/pages/bingo-sessions/[id]/cards/index.tsx` inside the modal):
   - Replace the 25 standalone inputs with **five row-inputs**:
     • Five `<Input>` or `<Textarea>` fields—each accepts a row’s numbers separated by spaces.
     • Below these, render an **editable preview grid** of 5×5 Shadcn/ui `<Input>` cells showing parsed values.
     • Honor the existing “Campo Libre” checkbox: center cell disabled when unchecked, editable when checked.
   - Maintain **bulk-paste** support on each row-input and on the preview grid.
   - Enforce **real-time validations**:
     • Column ranges B:1–15, I:16–30, N:31–45, G:46–60, O:61–75.  
     • No duplicates in the same card.  
     • Only positive integers; no decimals or text.  
     • Global range 1–75.  
     • Highlight invalid cells with `border-red-500` / `bg-red-100`.  
     • Disable the “Add Card” button until all fields are valid.
   - Style with Tailwind: modal centered with padding, preview grid `grid grid-cols-5 gap-2`, cells `w-12 h-12 text-center rounded-md`, headers bold, disabled cells `bg-gray-200`, hover/focus `ring-2 ring-blue-500`.

Use idiomatic React hooks, TypeScript, Shadcn/ui components and Tailwind utilities throughout.

-----------------------------


In the existing Next.js + TypeScript project `izibingope-app`, update the bingo‐card creation UI at `src/pages/bingo-sessions/[id]/cards/index.tsx` to correctly handle the “Campo Libre” checkbox and validation:

1. **Center Cell (Free Space) Behavior**  
   - When “Campo Libre” is **unchecked**:
     • Render the center cell (`row 3, col 3`) as a disabled Shadcn/ui `<Input>` with `disabled` prop.  
     • Force its value to an empty string (`''`) and apply Tailwind classes `bg-gray-200 text-gray-500 cursor-not-allowed`.  
     • Ensure users cannot focus or type into it.  
   - When “Campo Libre” is **checked**:
     • Enable the center cell as a normal `<Input>`, include it in paste/mapping and validations.

2. **Bulk‐Paste & Row Mapping**  
   - In the `onPaste` or row‐input parsing logic, if “Campo Libre” is **unchecked**, **skip** mapping to the center cell and map remaining values in row-major order.  
   - If “Campo Libre” is **checked**, map all values including the center as before.

3. **Validation Update**  
   - Exclude the center cell from all real-time validations (range, duplicates, integer) when “Campo Libre” is unchecked.  
   - When free is checked, apply the same column-range, global range, integer, and uniqueness rules to the center cell.

4. **Visual Fixes**  
   - Update the preview grid’s Tailwind classes so the disabled center has the proper grey background and border.  
   - Ensure error highlighting (`border-red-500` / `bg-red-100`) never applies to a disabled center cell.  
   - After toggling the checkbox, immediately re-render the grid so the center cell appears/disappears in the validation flow.

Keep all other styling (grid layout, headers, hover/focus rings) and logic intact. Use idiomatic TypeScript and React hooks. ```
