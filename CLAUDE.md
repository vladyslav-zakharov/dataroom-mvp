# Dataroom MVP — Claude Context

## Project purpose

Frontend-only SPA for M&A due-diligence document management: create datarooms, nest folders, upload/view/rename/delete PDF files. All state persists in IndexedDB (no backend).

---

## Tech stack

| Tool | Version | Notes |
|---|---|---|
| Vite | ^8 | `defineConfig` from `vitest/config` (not `vite`) |
| React | ^19 | StrictMode enabled |
| TypeScript | ^6 | `erasableSyntaxOnly: true` — no parameter-properties in constructors |
| Tailwind CSS | ^4 | Via `@tailwindcss/vite` plugin (no `tailwind.config.js`) |
| shadcn/ui | 4.x (base-nova style) | Components in `src/components/ui/` |
| react-router-dom | ^7 | BrowserRouter, declarative `<Routes>` |
| Zustand | ^5 | `useDataroomStore` in `src/store/` |
| idb-keyval | ^6 | Three separate IDB stores: datarooms, nodes, blobs |
| Vitest | ^4 | jsdom env, globals, `@testing-library/react` |

---

## Commands

```bash
npm run dev        # start dev server on :5173
npm run build      # tsc -b && vite build
npm run test       # vitest run (single pass)
npm run test:watch # vitest (watch mode)
```

---

## File structure

```
src/
  types/          index.ts — Dataroom, DataroomNode (FolderNode | FileNode), DataroomError
  store/          useDataroomStore.ts — Zustand store, full API
  lib/
    idb.ts        IndexedDB read/write helpers (idb-keyval)
    tree.ts       Pure tree utilities: getChildren, getPath, getDescendants, resolveUploadName, formatBytes, siblingNames
    utils.ts      shadcn cn() helper
  components/
    ui/           shadcn components (do not edit manually — re-add via npx shadcn@latest add)
    layout/       AppShell.tsx
    dataroom/     DataroomCard, CreateDataroomDialog, etc. (next stage)
    explorer/     ExplorerTable, FileRow, FolderRow, etc. (next stage)
    actions/      RenameDialog, DeleteDialog, UploadButton, etc. (next stage)
    viewer/       PDFViewer (next stage)
    common/       Shared primitives
  pages/
    DataroomsPage.tsx
    DataroomExplorerPage.tsx
  test/
    setup.ts      @testing-library/jest-dom import
```

---

## Data model (`src/types/index.ts`)

```ts
interface Dataroom { id, name, createdAt, updatedAt }

type DataroomNode = FolderNode | FileNode

interface FolderNode { id, dataroomId, parentId, name, type: 'folder', createdAt, updatedAt }
interface FileNode   { id, dataroomId, parentId, name, type: 'file',
                       mimeType: 'application/pdf', size, blobKey, createdAt, updatedAt }
```

`parentId === null` means the node lives at the dataroom root.
`blobKey` is a UUID used to look up the PDF Blob in the `blobs` IDB store.

---

## Store API contract (`src/store/useDataroomStore.ts`)

**State**
```ts
datarooms: Dataroom[]
nodes:     DataroomNode[]
isHydrated: boolean
```

**Lifecycle**
```ts
hydrate(): Promise<void>
```
Call once on mount (`useEffect`). Sets `isHydrated = true` when done.

**Dataroom mutations**
```ts
createDataroom(name: string): Dataroom
// Throws DataroomError('BLANK_NAME') on blank, DataroomError('NAME_COLLISION') on duplicate

renameDataroom(id: string, newName: string): void
// Same validation as createDataroom

deleteDataroom(id: string): Promise<void>
// Cascades: deletes all nodes + blobs under that dataroom
```

**Node mutations**
```ts
createFolder(dataroomId: string, parentId: string | null, name: string): DataroomNode
// Throws DataroomError('BLANK_NAME' | 'NAME_COLLISION')

renameNode(id: string, newName: string): void
// Throws DataroomError('BLANK_NAME' | 'NAME_COLLISION' | 'NOT_FOUND')

deleteNode(id: string): Promise<void>
// Cascades: deletes all descendant nodes + their blobs

uploadFile(dataroomId: string, parentId: string | null, file: File): Promise<DataroomNode>
// Validates file.type === 'application/pdf' — throws DataroomError('INVALID_FILE_TYPE') otherwise
// Auto-resolves name collisions: "Report" → "Report (1)" → "Report (2)"
// Returns the FileNode; caller checks node._wasRenamed (non-enumerable) to decide whether to toast
```

**Queries**
```ts
getChildren(dataroomId: string, parentId: string | null): DataroomNode[]
// Folders first, then files, alphabetical within each group

getPath(nodeId: string): DataroomNode[]
// Ancestor chain root-to-node, inclusive, for breadcrumbs

getDescendantCounts(nodeId: string): { folders: number; files: number }
// Used in delete-confirmation dialogs

getFileBlob(nodeId: string): Promise<Blob>
// Throws DataroomError('NOT_FOUND') if node or blob missing
```

---

## Name collision rules

| Operation | Rule |
|---|---|
| `createDataroom` / `renameDataroom` | BLOCK — throw `DataroomError('NAME_COLLISION')`, surface as inline form error |
| `createFolder` / `renameNode` | BLOCK — same |
| `uploadFile` | AUTO-SUFFIX (" (1)", " (2)"…) — never block; caller toasts if renamed |

Names are always trimmed before comparison. Blank/whitespace-only = `DataroomError('BLANK_NAME')`.

---

## IDB store layout

| idb-keyval store | Keys | Values |
|---|---|---|
| `dataroom-mvp / datarooms` | `"list"` | `Dataroom[]` |
| `dataroom-mvp / nodes` | `"list"` | `DataroomNode[]` |
| `dataroom-mvp / blobs` | `blobKey` (UUID) | `Blob` (raw PDF) |

---

## Routing

```
/                                       DataroomsPage
/dataroom/:dataroomId                   DataroomExplorerPage (root)
/dataroom/:dataroomId/folder/:folderId  DataroomExplorerPage (nested folder)
```

---

## Component / naming conventions

- Props interface named `Props` (not `ComponentNameProps`) for single-component files — `FC<Props>`.
- shadcn components: never edit `src/components/ui/` by hand; use `npx shadcn@latest add <name>`.
- No `console.log` in production code.
- All async state (loading / error / empty) handled at every branch.
- Use `@/` path alias — no `../../../` chains.
- `crypto.randomUUID()` for all IDs — no `uuid` package.
- All mutations write through to IDB immediately (fire-and-forget `void persistX()`).
- Mutations that involve blob deletion are `async` and awaited to prevent orphaned blobs.

---

## TypeScript notes

- TS 6 with `erasableSyntaxOnly: true` — **do not** use constructor parameter-property shorthand (`public readonly foo: T` in constructor params). Declare the property and assign in body.
- `vitest/config` exports `defineConfig` — import from there, not from `vite`, so the `test` property is typed.
