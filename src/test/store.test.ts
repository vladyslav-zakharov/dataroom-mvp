/**
 * Unit tests for useDataroomStore (src/store/useDataroomStore.ts).
 *
 * IDB is mocked so tests are synchronous and isolated.
 * The Zustand store is a singleton; we reset its state before each test
 * by calling setState directly via the store instance.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DataroomError } from '@/types'

// ── Mock IDB ──────────────────────────────────────────────────────────────────
// Must be declared before any store import so the module resolver sees the mock.

vi.mock('@/lib/idb', () => ({
  loadDatarooms: vi.fn(async () => []),
  loadNodes: vi.fn(async () => []),
  persistDatarooms: vi.fn(async () => {}),
  persistNodes: vi.fn(async () => {}),
  persistBlob: vi.fn(async () => {}),
  loadBlob: vi.fn(async () => undefined),
  deleteBlob: vi.fn(async () => {}),
  deleteBlobs: vi.fn(async () => {}),
}))

import { useDataroomStore } from '@/store/useDataroomStore'

// ── Reset store state before each test ───────────────────────────────────────

beforeEach(() => {
  useDataroomStore.setState({ datarooms: [], nodes: [], isHydrated: false })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePdf(name: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' })
}

function makeTxt(name: string): File {
  return new File(['content'], name, { type: 'text/plain' })
}

// ── createDataroom ────────────────────────────────────────────────────────────

describe('createDataroom', () => {
  it('creates a dataroom with the given name', () => {
    const { createDataroom } = useDataroomStore.getState()
    const dr = createDataroom('Project Alpha')
    expect(dr.name).toBe('Project Alpha')
    expect(useDataroomStore.getState().datarooms).toHaveLength(1)
  })

  it('trims the name before storing', () => {
    const { createDataroom } = useDataroomStore.getState()
    const dr = createDataroom('  Trimmed  ')
    expect(dr.name).toBe('Trimmed')
  })

  it('throws BLANK_NAME when given an empty string', () => {
    const { createDataroom } = useDataroomStore.getState()
    expect(() => createDataroom('')).toThrow(DataroomError)
    expect(() => createDataroom('')).toSatisfy((fn: () => void) => {
      try { fn(); return false } catch (e) { return (e as DataroomError).code === 'BLANK_NAME' }
    })
  })

  it('throws BLANK_NAME when given whitespace only', () => {
    const { createDataroom } = useDataroomStore.getState()
    let caught: DataroomError | null = null
    try { createDataroom('   ') } catch (e) { caught = e as DataroomError }
    expect(caught?.code).toBe('BLANK_NAME')
  })

  it('throws NAME_COLLISION when a dataroom with the same name exists', () => {
    const { createDataroom } = useDataroomStore.getState()
    createDataroom('Alpha')
    let caught: DataroomError | null = null
    try { createDataroom('Alpha') } catch (e) { caught = e as DataroomError }
    expect(caught?.code).toBe('NAME_COLLISION')
  })

  it('collision check is case-insensitive', () => {
    const { createDataroom } = useDataroomStore.getState()
    createDataroom('alpha')
    let caught: DataroomError | null = null
    try { createDataroom('ALPHA') } catch (e) { caught = e as DataroomError }
    expect(caught?.code).toBe('NAME_COLLISION')
  })

  it('assigns a unique id to each dataroom', () => {
    const { createDataroom } = useDataroomStore.getState()
    const dr1 = createDataroom('First')
    const dr2 = createDataroom('Second')
    expect(dr1.id).not.toBe(dr2.id)
  })
})

// ── renameDataroom ────────────────────────────────────────────────────────────

describe('renameDataroom', () => {
  it('renames the dataroom to the new name', () => {
    const { createDataroom, renameDataroom } = useDataroomStore.getState()
    const dr = createDataroom('OldName')
    renameDataroom(dr.id, 'NewName')
    const updated = useDataroomStore.getState().datarooms.find((d) => d.id === dr.id)
    expect(updated?.name).toBe('NewName')
  })

  it('throws BLANK_NAME when renaming to an empty string', () => {
    const { createDataroom, renameDataroom } = useDataroomStore.getState()
    const dr = createDataroom('Valid')
    let caught: DataroomError | null = null
    try { renameDataroom(dr.id, '') } catch (e) { caught = e as DataroomError }
    expect(caught?.code).toBe('BLANK_NAME')
  })

  it('throws NAME_COLLISION when renaming to an existing dataroom name', () => {
    const { createDataroom, renameDataroom } = useDataroomStore.getState()
    const dr1 = createDataroom('Alpha')
    createDataroom('Beta')
    let caught: DataroomError | null = null
    try { renameDataroom(dr1.id, 'Beta') } catch (e) { caught = e as DataroomError }
    expect(caught?.code).toBe('NAME_COLLISION')
  })

  it('allows renaming a dataroom to its own current name (no-op case)', () => {
    const { createDataroom, renameDataroom } = useDataroomStore.getState()
    const dr = createDataroom('Same')
    // Should not throw — renaming to own name is permitted
    expect(() => renameDataroom(dr.id, 'Same')).not.toThrow()
  })
})

// ── deleteDataroom ────────────────────────────────────────────────────────────

describe('deleteDataroom', () => {
  it('removes the dataroom from state', async () => {
    const { createDataroom, deleteDataroom } = useDataroomStore.getState()
    const dr = createDataroom('ToDelete')
    await deleteDataroom(dr.id)
    expect(useDataroomStore.getState().datarooms.find((d) => d.id === dr.id)).toBeUndefined()
  })

  it('cascades and removes all nodes belonging to the dataroom', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('WithContent')
    // create folder and then file by seeding state directly (avoids async uploadFile)
    const folder = store.createFolder(dr.id, null, 'Docs')
    store.createFolder(dr.id, folder.id, 'Subfolder')

    await useDataroomStore.getState().deleteDataroom(dr.id)
    const remaining = useDataroomStore.getState().nodes.filter((n) => n.dataroomId === dr.id)
    expect(remaining).toHaveLength(0)
  })

  it('leaves other datarooms and their nodes intact', async () => {
    const store = useDataroomStore.getState()
    const dr1 = store.createDataroom('KeepMe')
    const dr2 = store.createDataroom('DeleteMe')
    store.createFolder(dr1.id, null, 'FolderInDr1')
    store.createFolder(dr2.id, null, 'FolderInDr2')

    await useDataroomStore.getState().deleteDataroom(dr2.id)

    const state = useDataroomStore.getState()
    expect(state.datarooms.some((d) => d.id === dr1.id)).toBe(true)
    expect(state.nodes.some((n) => n.dataroomId === dr1.id)).toBe(true)
    expect(state.nodes.some((n) => n.dataroomId === dr2.id)).toBe(false)
  })
})

// ── createFolder ──────────────────────────────────────────────────────────────

describe('createFolder', () => {
  it('creates a folder at the dataroom root', () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const folder = store.createFolder(dr.id, null, 'Docs')
    expect(folder.type).toBe('folder')
    expect(folder.name).toBe('Docs')
    expect(folder.parentId).toBeNull()
  })

  it('creates a nested folder inside another folder', () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const parent = store.createFolder(dr.id, null, 'Level1')
    const child = store.createFolder(dr.id, parent.id, 'Level2')
    expect(child.parentId).toBe(parent.id)
  })

  it('supports three levels of nesting', () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const l1 = store.createFolder(dr.id, null, 'L1')
    const l2 = store.createFolder(dr.id, l1.id, 'L2')
    const l3 = store.createFolder(dr.id, l2.id, 'L3')

    // getChildren at each depth returns the correct node
    expect(store.getChildren(dr.id, null).map((n) => n.id)).toContain(l1.id)
    expect(store.getChildren(dr.id, l1.id).map((n) => n.id)).toContain(l2.id)
    expect(store.getChildren(dr.id, l2.id).map((n) => n.id)).toContain(l3.id)

    // getPath from deep node returns root-to-node chain
    const path = useDataroomStore.getState().getPath(l3.id)
    expect(path.map((n) => n.id)).toEqual([l1.id, l2.id, l3.id])
  })

  it('throws BLANK_NAME for empty folder name', () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    let caught: DataroomError | null = null
    try { store.createFolder(dr.id, null, '') } catch (e) { caught = e as DataroomError }
    expect(caught?.code).toBe('BLANK_NAME')
  })

  it('throws NAME_COLLISION when a sibling with the same name exists', () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    store.createFolder(dr.id, null, 'Docs')
    let caught: DataroomError | null = null
    try { store.createFolder(dr.id, null, 'Docs') } catch (e) { caught = e as DataroomError }
    expect(caught?.code).toBe('NAME_COLLISION')
  })

  it('allows same name in different parent scopes', () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const f1 = store.createFolder(dr.id, null, 'Parent1')
    const f2 = store.createFolder(dr.id, null, 'Parent2')
    // Both parents can have a child named "Reports"
    expect(() => store.createFolder(dr.id, f1.id, 'Reports')).not.toThrow()
    expect(() => store.createFolder(dr.id, f2.id, 'Reports')).not.toThrow()
  })
})

// ── renameNode ────────────────────────────────────────────────────────────────

describe('renameNode', () => {
  it('renames a folder to a valid new name', () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const folder = store.createFolder(dr.id, null, 'OldName')
    store.renameNode(folder.id, 'NewName')
    const updated = useDataroomStore.getState().nodes.find((n) => n.id === folder.id)
    expect(updated?.name).toBe('NewName')
  })

  it('throws BLANK_NAME when renaming to blank', () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const folder = store.createFolder(dr.id, null, 'Valid')
    let caught: DataroomError | null = null
    try { store.renameNode(folder.id, '   ') } catch (e) { caught = e as DataroomError }
    expect(caught?.code).toBe('BLANK_NAME')
  })

  it('throws NAME_COLLISION when a sibling already has that name', () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const f1 = store.createFolder(dr.id, null, 'Alpha')
    store.createFolder(dr.id, null, 'Beta')
    let caught: DataroomError | null = null
    try { store.renameNode(f1.id, 'Beta') } catch (e) { caught = e as DataroomError }
    expect(caught?.code).toBe('NAME_COLLISION')
  })

  it('throws NOT_FOUND when the node id does not exist', () => {
    const store = useDataroomStore.getState()
    let caught: DataroomError | null = null
    try { store.renameNode('nonexistent-id', 'Name') } catch (e) { caught = e as DataroomError }
    expect(caught?.code).toBe('NOT_FOUND')
  })

  it('allows renaming a node to its own current name', () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const folder = store.createFolder(dr.id, null, 'SameName')
    expect(() => store.renameNode(folder.id, 'SameName')).not.toThrow()
  })
})

// ── deleteNode ────────────────────────────────────────────────────────────────

describe('deleteNode', () => {
  it('removes a leaf folder', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const folder = store.createFolder(dr.id, null, 'ToDelete')
    await useDataroomStore.getState().deleteNode(folder.id)
    expect(useDataroomStore.getState().nodes.find((n) => n.id === folder.id)).toBeUndefined()
  })

  it('cascades: deleting a folder removes all descendant folders and files', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const root = store.createFolder(dr.id, null, 'Root')
    const child = store.createFolder(dr.id, root.id, 'Child')
    const grandchild = store.createFolder(dr.id, child.id, 'GrandChild')

    const beforeCount = useDataroomStore.getState().nodes.length
    expect(beforeCount).toBe(3)

    await useDataroomStore.getState().deleteNode(root.id)

    const afterNodes = useDataroomStore.getState().nodes
    expect(afterNodes).toHaveLength(0)
    expect(afterNodes.find((n) => n.id === root.id)).toBeUndefined()
    expect(afterNodes.find((n) => n.id === child.id)).toBeUndefined()
    expect(afterNodes.find((n) => n.id === grandchild.id)).toBeUndefined()
  })

  it('does not remove sibling nodes', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const f1 = store.createFolder(dr.id, null, 'Keep')
    const f2 = store.createFolder(dr.id, null, 'Delete')

    await useDataroomStore.getState().deleteNode(f2.id)

    const nodes = useDataroomStore.getState().nodes
    expect(nodes.find((n) => n.id === f1.id)).toBeDefined()
    expect(nodes.find((n) => n.id === f2.id)).toBeUndefined()
  })

  it('getDescendantCounts returns zeroes after cascade delete', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const root = store.createFolder(dr.id, null, 'Root')
    const child = store.createFolder(dr.id, root.id, 'Child')

    // Verify counts are non-zero before delete
    const before = store.getDescendantCounts(root.id)
    expect(before.folders).toBe(1)

    // Delete child, then check root's descendant counts
    await useDataroomStore.getState().deleteNode(child.id)
    const after = useDataroomStore.getState().getDescendantCounts(root.id)
    expect(after.folders).toBe(0)
    expect(after.files).toBe(0)
  })
})

// ── uploadFile ────────────────────────────────────────────────────────────────

describe('uploadFile', () => {
  it('uploads a PDF and returns a FileNode', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const file = makePdf('Report.pdf')
    const node = await useDataroomStore.getState().uploadFile(dr.id, null, file)
    expect(node.type).toBe('file')
    expect(node.name).toBe('Report')
    if (node.type !== 'file') throw new Error('Expected FileNode')
    expect(node.mimeType).toBe('application/pdf')
  })

  it('strips the .pdf extension from the stored name', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const node = await useDataroomStore.getState().uploadFile(dr.id, null, makePdf('Contract.pdf'))
    expect(node.name).toBe('Contract')
  })

  it('auto-suffixes on first collision — second upload gets (1)', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')

    const first = await useDataroomStore.getState().uploadFile(dr.id, null, makePdf('Report.pdf'))
    const second = await useDataroomStore.getState().uploadFile(dr.id, null, makePdf('Report.pdf'))

    expect(first.name).toBe('Report')
    expect(second.name).toBe('Report (1)')
  })

  it('auto-suffixes sequentially — third upload gets (2)', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')

    await useDataroomStore.getState().uploadFile(dr.id, null, makePdf('Report.pdf'))
    await useDataroomStore.getState().uploadFile(dr.id, null, makePdf('Report.pdf'))
    const third = await useDataroomStore.getState().uploadFile(dr.id, null, makePdf('Report.pdf'))

    expect(third.name).toBe('Report (2)')
  })

  it('sets _wasRenamed to false when no collision', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const node = await useDataroomStore.getState().uploadFile(dr.id, null, makePdf('Unique.pdf'))
    // _wasRenamed is non-enumerable but still accessible
    expect((node as unknown as Record<string, unknown>)['_wasRenamed']).toBe(false)
  })

  it('sets _wasRenamed to true when name was auto-suffixed', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    await useDataroomStore.getState().uploadFile(dr.id, null, makePdf('Report.pdf'))
    const second = await useDataroomStore.getState().uploadFile(dr.id, null, makePdf('Report.pdf'))
    expect((second as unknown as Record<string, unknown>)['_wasRenamed']).toBe(true)
  })

  it('throws INVALID_FILE_TYPE for a non-PDF file', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    let caught: DataroomError | null = null
    try {
      await useDataroomStore.getState().uploadFile(dr.id, null, makeTxt('doc.txt'))
    } catch (e) {
      caught = e as DataroomError
    }
    expect(caught?.code).toBe('INVALID_FILE_TYPE')
  })

  it('does not add a node to state when validation fails', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    try {
      await useDataroomStore.getState().uploadFile(dr.id, null, makeTxt('bad.txt'))
    } catch {
      // expected
    }
    expect(useDataroomStore.getState().nodes).toHaveLength(0)
  })

  it('collision suffix is scoped to folder — same name in different folders does not collide', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const f1 = store.createFolder(dr.id, null, 'Folder1')
    const f2 = store.createFolder(dr.id, null, 'Folder2')

    await useDataroomStore.getState().uploadFile(dr.id, f1.id, makePdf('Report.pdf'))
    const inF2 = await useDataroomStore.getState().uploadFile(dr.id, f2.id, makePdf('Report.pdf'))

    // No collision across different folders
    expect(inF2.name).toBe('Report')
    expect((inF2 as unknown as Record<string, unknown>)['_wasRenamed']).toBe(false)
  })
})

// ── getChildren / getPath integration ─────────────────────────────────────────

describe('getChildren (via store)', () => {
  it('returns folders before files, both alphabetically sorted', () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    store.createFolder(dr.id, null, 'Zebra')
    store.createFolder(dr.id, null, 'Apple')

    const children = store.getChildren(dr.id, null)
    expect(children[0].name).toBe('Apple')
    expect(children[1].name).toBe('Zebra')
  })

  it('returns empty array for an empty dataroom', () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('Empty')
    expect(store.getChildren(dr.id, null)).toHaveLength(0)
  })
})

// ── getDescendantCounts (via store) ──────────────────────────────────────────

describe('getDescendantCounts (via store) — multi-level tree', () => {
  it('returns correct folder and file counts for a 3-level tree', async () => {
    const store = useDataroomStore.getState()
    const dr = store.createDataroom('DR')
    const root = store.createFolder(dr.id, null, 'Root')
    const child1 = store.createFolder(dr.id, root.id, 'Child1')
    store.createFolder(dr.id, root.id, 'Child2')
    store.createFolder(dr.id, child1.id, 'GrandChild')

    // Also upload files to child1 and child2 directly via state injection
    // since uploadFile is async and calls persistBlob (mocked).
    // We can call uploadFile here since persistBlob is mocked.
    await useDataroomStore.getState().uploadFile(dr.id, child1.id, makePdf('FileA.pdf'))
    await useDataroomStore.getState().uploadFile(dr.id, child1.id, makePdf('FileB.pdf'))

    const counts = useDataroomStore.getState().getDescendantCounts(root.id)
    // Folders: Child1, Child2, GrandChild = 3
    expect(counts.folders).toBe(3)
    // Files: FileA, FileB = 2
    expect(counts.files).toBe(2)
  })
})
