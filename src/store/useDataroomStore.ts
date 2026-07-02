import { create } from 'zustand'
import type { Dataroom, DataroomNode, FileNode } from '@/types'
import { DataroomError } from '@/types'
import {
  loadDatarooms,
  loadNodes,
  loadBlob,
  persistBlob,
  persistDatarooms,
  persistNodes,
  deleteBlobs,
} from '@/lib/idb'
import {
  getChildren,
  getDescendantCounts,
  getDescendantIds,
  getPath,
  resolveUploadName,
  siblingNames,
  validateName,
} from '@/lib/tree'

// ── State & actions interface ─────────────────────────────────────────────────

export interface DataroomStore {
  // State
  datarooms: Dataroom[]
  nodes: DataroomNode[]
  isHydrated: boolean

  // Lifecycle
  hydrate: () => Promise<void>

  // Dataroom mutations
  createDataroom: (name: string) => Dataroom
  renameDataroom: (id: string, newName: string) => void
  deleteDataroom: (id: string) => Promise<void>

  // Node mutations
  createFolder: (dataroomId: string, parentId: string | null, name: string) => DataroomNode
  renameNode: (id: string, newName: string) => void
  deleteNode: (id: string) => Promise<void>
  uploadFile: (dataroomId: string, parentId: string | null, file: File) => Promise<DataroomNode>

  // Queries (derived — could also be selectors; kept here for API stability)
  getChildren: (dataroomId: string, parentId: string | null) => DataroomNode[]
  getPath: (nodeId: string) => DataroomNode[]
  getDescendantCounts: (nodeId: string) => { folders: number; files: number }
  getFileBlob: (nodeId: string) => Promise<Blob>
}

// ── Store implementation ──────────────────────────────────────────────────────

export const useDataroomStore = create<DataroomStore>()((set, get) => ({
  datarooms: [],
  nodes: [],
  isHydrated: false,

  // ── Lifecycle ────────────────────────────────────────────────────────────

  hydrate: async () => {
    const [datarooms, nodes] = await Promise.all([loadDatarooms(), loadNodes()])
    set({ datarooms, nodes, isHydrated: true })
  },

  // ── Dataroom mutations ───────────────────────────────────────────────────

  createDataroom: (name: string): Dataroom => {
    const trimmed = validateName(name)
    if (!trimmed) {
      throw new DataroomError('BLANK_NAME', 'Dataroom name cannot be blank.')
    }
    const { datarooms } = get()
    const collision = datarooms.some(
      (d) => d.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (collision) {
      throw new DataroomError('NAME_COLLISION', `A dataroom named "${trimmed}" already exists.`)
    }
    const now = new Date().toISOString()
    const dataroom: Dataroom = {
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    }
    const next = [...datarooms, dataroom]
    set({ datarooms: next })
    void persistDatarooms(next)
    return dataroom
  },

  renameDataroom: (id: string, newName: string): void => {
    const trimmed = validateName(newName)
    if (!trimmed) {
      throw new DataroomError('BLANK_NAME', 'Dataroom name cannot be blank.')
    }
    const { datarooms } = get()
    const collision = datarooms.some(
      (d) => d.id !== id && d.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (collision) {
      throw new DataroomError('NAME_COLLISION', `A dataroom named "${trimmed}" already exists.`)
    }
    const next = datarooms.map((d) =>
      d.id === id ? { ...d, name: trimmed, updatedAt: new Date().toISOString() } : d,
    )
    set({ datarooms: next })
    void persistDatarooms(next)
  },

  deleteDataroom: async (id: string): Promise<void> => {
    const { nodes } = get()
    // Collect all nodes under this dataroom
    const affected = nodes.filter((n) => n.dataroomId === id)
    const blobKeys = affected
      .filter((n): n is FileNode => n.type === 'file')
      .map((n) => n.blobKey)

    const nextNodes = nodes.filter((n) => n.dataroomId !== id)
    const nextDatarooms = get().datarooms.filter((d) => d.id !== id)

    set({ datarooms: nextDatarooms, nodes: nextNodes })
    await Promise.all([
      persistDatarooms(nextDatarooms),
      persistNodes(nextNodes),
      deleteBlobs(blobKeys),
    ])
  },

  // ── Node mutations ───────────────────────────────────────────────────────

  createFolder: (
    dataroomId: string,
    parentId: string | null,
    name: string,
  ): DataroomNode => {
    const trimmed = validateName(name)
    if (!trimmed) {
      throw new DataroomError('BLANK_NAME', 'Folder name cannot be blank.')
    }
    const { nodes } = get()
    const siblings = siblingNames(nodes, dataroomId, parentId)
    if (siblings.has(trimmed)) {
      throw new DataroomError(
        'NAME_COLLISION',
        `An item named "${trimmed}" already exists here.`,
      )
    }
    const now = new Date().toISOString()
    const folder: DataroomNode = {
      id: crypto.randomUUID(),
      dataroomId,
      parentId,
      name: trimmed,
      type: 'folder',
      createdAt: now,
      updatedAt: now,
    }
    const next = [...nodes, folder]
    set({ nodes: next })
    void persistNodes(next)
    return folder
  },

  renameNode: (id: string, newName: string): void => {
    const trimmed = validateName(newName)
    if (!trimmed) {
      throw new DataroomError('BLANK_NAME', 'Name cannot be blank.')
    }
    const { nodes } = get()
    const node = nodes.find((n) => n.id === id)
    if (!node) {
      throw new DataroomError('NOT_FOUND', `Node ${id} not found.`)
    }
    const siblings = siblingNames(nodes, node.dataroomId, node.parentId, id)
    if (siblings.has(trimmed)) {
      throw new DataroomError(
        'NAME_COLLISION',
        `An item named "${trimmed}" already exists here.`,
      )
    }
    const next = nodes.map((n) =>
      n.id === id ? { ...n, name: trimmed, updatedAt: new Date().toISOString() } : n,
    )
    set({ nodes: next })
    void persistNodes(next)
  },

  deleteNode: async (id: string): Promise<void> => {
    const { nodes } = get()
    const descendantIds = getDescendantIds(nodes, id)
    const allIds = new Set([id, ...descendantIds])
    const blobKeys = nodes
      .filter((n): n is FileNode => n.type === 'file' && allIds.has(n.id))
      .map((n) => n.blobKey)

    const next = nodes.filter((n) => !allIds.has(n.id))
    set({ nodes: next })
    await Promise.all([persistNodes(next), deleteBlobs(blobKeys)])
  },

  uploadFile: async (
    dataroomId: string,
    parentId: string | null,
    file: File,
  ): Promise<DataroomNode> => {
    if (file.type !== 'application/pdf') {
      throw new DataroomError(
        'INVALID_FILE_TYPE',
        `Only PDF files are supported. Received: ${file.type || 'unknown'}`,
      )
    }
    const { nodes } = get()
    const baseName = file.name.replace(/\.pdf$/i, '') || 'Untitled'
    const siblings = siblingNames(nodes, dataroomId, parentId)

    // Auto-suffix on collision (non-blocking, toast handled by caller)
    const resolvedName = resolveUploadName(baseName, siblings)
    const wasRenamed = resolvedName !== baseName

    const blobKey = crypto.randomUUID()
    const now = new Date().toISOString()
    const fileNode: FileNode = {
      id: crypto.randomUUID(),
      dataroomId,
      parentId,
      name: resolvedName,
      type: 'file',
      mimeType: 'application/pdf',
      size: file.size,
      blobKey,
      createdAt: now,
      updatedAt: now,
    }

    // Persist blob first, then update state
    await persistBlob(blobKey, file)
    const next = [...nodes, fileNode]
    set({ nodes: next })
    await persistNodes(next)

    // Attach rename info as a non-enumerable property for the caller to toast
    Object.defineProperty(fileNode, '_wasRenamed', {
      value: wasRenamed,
      enumerable: false,
    })

    return fileNode
  },

  // ── Queries ──────────────────────────────────────────────────────────────

  getChildren: (dataroomId: string, parentId: string | null): DataroomNode[] => {
    return getChildren(get().nodes, dataroomId, parentId)
  },

  getPath: (nodeId: string): DataroomNode[] => {
    return getPath(get().nodes, nodeId)
  },

  getDescendantCounts: (nodeId: string): { folders: number; files: number } => {
    return getDescendantCounts(get().nodes, nodeId)
  },

  getFileBlob: async (nodeId: string): Promise<Blob> => {
    const { nodes } = get()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || node.type !== 'file') {
      throw new DataroomError('NOT_FOUND', `File node ${nodeId} not found.`)
    }
    const blob = await loadBlob(node.blobKey)
    if (!blob) {
      throw new DataroomError('NOT_FOUND', `Blob for node ${nodeId} not found in storage.`)
    }
    return blob
  },
}))
