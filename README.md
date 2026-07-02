# Dataroom MVP

A frontend-only single-page application for M&A due-diligence document management. Users create isolated datarooms, organise PDF files into nested folder hierarchies, rename or delete any item, and view PDFs inline — all state persisting locally in IndexedDB with no backend required.

---

## Prerequisites

- Node.js 18 or later (developed on v22)
- npm 9 or later (bundled with Node)

## Setup

```bash
git clone https://github.com/vladyslav-zakharov/dataroom-mvp.git
cd dataroom-mvp
npm install
```

## Commands

```bash
npm run dev      # start dev server at http://localhost:5173
npm run build    # type-check then bundle to dist/
npm run test     # run the full test suite once (96 tests)
npm run preview  # serve the production build locally
```

---

## Features

The following maps directly to the brief's functional requirements.

**Dataroom management**
- Create a dataroom (name is required, duplicates are blocked)
- Rename a dataroom inline
- Delete a dataroom with cascading removal of all its files and folders

**Folder operations (within a dataroom)**
- Create a folder at any nesting level
- Rename a folder
- Delete a folder; a confirmation dialog shows the descendant count before committing

**File operations**
- Upload one or more PDFs via a button or drag-and-drop onto the current folder
- Rename a file
- Delete a file
- View a PDF inline without leaving the app

**Navigation**
- Breadcrumb trail updates as you navigate into nested folders
- All routes are deep-linkable; navigating to a deleted dataroom or folder shows a not-found state with a back link

---

## Design decisions

### Data model: flat list with `parentId` rather than a nested tree

All nodes (folders and files) live in a single `DataroomNode[]` array. Each node carries `dataroomId` and `parentId` — a null `parentId` means the node is at the dataroom root.

The alternative would be a recursive tree object (`{ children: Node[] }`). A flat list was chosen for three reasons:

1. **IDB serialisation is trivial.** The whole list serialises as one JSON blob under the key `"list"`. A nested tree would need either recursive serialisation or one IDB entry per node.
2. **Mutations are simple.** Moving a node between parents is a single field update on one element; in a nested tree it requires splicing from one subtree and inserting into another.
3. **Queries stay pure.** `getChildren`, `getPath`, and `getDescendantIds` are pure functions that take `nodes[]` and return a result. They are independently testable with no store coupling.

The trade-off: reads that need the full subtree (deletion cascade, descendant counts) must walk the list. At the scale of a typical dataroom (hundreds of nodes) this is negligible.

### Storage: IndexedDB over localStorage

PDF blobs cannot be stored in `localStorage`, which is limited to string values and typically capped at 5 MB. IndexedDB stores `Blob` objects natively and handles files that are tens or hundreds of megabytes.

Three object stores share one database (`dataroom-mvp`): `datarooms` and `nodes` each hold their respective JSON arrays under the key `"list"`; `blobs` holds each raw PDF keyed by a UUID (`blobKey`). Keeping blobs separate means metadata reads never touch binary data, and blob deletion can be targeted without rewriting any list.

idb-keyval was chosen for its minimal API surface. The idb.ts wrapper writes a thin custom open/transaction layer on top rather than using idb-keyval's `createStore` helper directly, to avoid a version-conflict race when multiple stores share the same database name.

### Name-collision UX: block on manual input, auto-suffix on upload

| Operation | Behaviour |
|---|---|
| Create dataroom / folder, rename any item | Block — surface an inline error, the user must choose a different name |
| Upload a file | Auto-suffix — `Report.pdf` becomes `Report (1).pdf` silently; a toast appears if the name was changed |

The asymmetry is intentional. When a person types a name they can read an error and correct it in one step. When a user drops ten files onto a folder the expectation (set by every desktop OS) is that the upload completes and the conflict is resolved automatically. Blocking a multi-file upload midway would be more disruptive than the name change.

### Routing

react-router-dom v7 with `BrowserRouter` and two route patterns:

```
/                                        DataroomsPage
/dataroom/:dataroomId                    DataroomExplorerPage at root
/dataroom/:dataroomId/folder/:folderId   DataroomExplorerPage in a folder
```

Both explorer routes render the same page component, which reads `folderId` from params (`undefined` at root, a string inside a folder). This avoids duplicating page logic while keeping URLs deep-linkable.

---

## Tech stack

| | |
|---|---|
| React 19 | UI, StrictMode enabled |
| TypeScript 6 | `erasableSyntaxOnly: true` |
| Vite 8 | Bundler and dev server |
| Tailwind CSS 4 | Via `@tailwindcss/vite` plugin, no config file |
| shadcn/ui (base-nova) | Component primitives in `src/components/ui/` |
| Zustand 5 | Global store (`useDataroomStore`) |
| idb-keyval 6 | IndexedDB persistence |
| react-router-dom 7 | Client-side routing |
| sonner | Toast notifications |
| Vitest 4 + Testing Library | Unit and component tests |

---

## Known limitations

These were consciously deferred, not overlooked, given the time-boxed scope.

- **No authentication.** All data is local to the browser; there are no user accounts or access controls.
- **No search.** There is no way to search across datarooms or filter files by name.
- **Single-browser only.** Data lives in the local browser's IndexedDB; it does not sync across devices or tabs.
- **PDF-only uploads.** The file type is validated on upload; other document types are rejected.
- **No move operation.** Nodes can be renamed and deleted but cannot be moved between folders or datarooms.
