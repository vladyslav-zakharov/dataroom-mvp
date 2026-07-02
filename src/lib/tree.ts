/**
 * Pure utility functions for operating on the flat node list.
 * No side effects; no store imports.
 */
import type { DataroomNode, FileNode, FolderNode } from '@/types'

// ── Collision resolution ──────────────────────────────────────────────────────

/**
 * Given a desired name and the set of existing sibling names, returns a name
 * that does not collide:
 *   - "Report"     → "Report (1)" if "Report" taken
 *   - "Report (1)" → "Report (2)" if both taken
 * This is the AUTO-SUFFIX path used for file uploads.
 */
/**
 * Resolves an upload name that does not collide with any sibling.
 * `existingSiblingNames` must be a Set of lower-cased sibling names (as
 * returned by `siblingNames()`). Comparison is case-insensitive; the returned
 * name preserves the original casing of `desired`.
 */
export function resolveUploadName(desired: string, existingSiblingNames: Set<string>): string {
  if (!existingSiblingNames.has(desired.toLowerCase())) return desired

  // Strip an existing " (N)" suffix so we always start from the base name
  const baseMatch = desired.match(/^(.*) \((\d+)\)$/)
  const base = baseMatch ? baseMatch[1] : desired

  let counter = 1
  let candidate = `${base} (${counter})`
  while (existingSiblingNames.has(candidate.toLowerCase())) {
    counter++
    candidate = `${base} (${counter})`
  }
  return candidate
}

/**
 * Returns the trimmed name if valid, otherwise null.
 * Used for BLOCK-on-collision paths (rename / create-folder).
 */
export function validateName(raw: string): string | null {
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

// ── Tree traversal ───────────────────────────────────────────────────────────

/** Direct children of a parent within a dataroom, folders first then files, alphabetical within each group. */
export function getChildren(
  nodes: DataroomNode[],
  dataroomId: string,
  parentId: string | null,
): DataroomNode[] {
  const children = nodes.filter(
    (n) => n.dataroomId === dataroomId && n.parentId === parentId,
  )
  const folders = children
    .filter((n): n is FolderNode => n.type === 'folder')
    .sort((a, b) => a.name.localeCompare(b.name))
  const files = children
    .filter((n): n is FileNode => n.type === 'file')
    .sort((a, b) => a.name.localeCompare(b.name))
  return [...folders, ...files]
}

/** Ancestor chain from root → node (the node itself is included at the end). */
export function getPath(nodes: DataroomNode[], nodeId: string): DataroomNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const path: DataroomNode[] = []
  let current = byId.get(nodeId)
  while (current) {
    path.unshift(current)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return path
}

/** All descendant node ids (recursive). */
export function getDescendantIds(nodes: DataroomNode[], nodeId: string): string[] {
  const result: string[] = []
  const queue: string[] = [nodeId]
  while (queue.length > 0) {
    const id = queue.shift()!
    const children = nodes.filter((n) => n.parentId === id)
    for (const child of children) {
      result.push(child.id)
      queue.push(child.id)
    }
  }
  return result
}

/** Count descendant folders and files separately. */
export function getDescendantCounts(
  nodes: DataroomNode[],
  nodeId: string,
): { folders: number; files: number } {
  const ids = getDescendantIds(nodes, nodeId)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  let folders = 0
  let files = 0
  for (const id of ids) {
    const node = byId.get(id)
    if (node?.type === 'folder') folders++
    else if (node?.type === 'file') files++
  }
  return { folders, files }
}

/**
 * Sibling names for a given parent scope, lower-cased for case-insensitive
 * collision checks — consistent with the dataroom-level name collision rules.
 * Callers must compare with `trimmed.toLowerCase()`.
 */
export function siblingNames(
  nodes: DataroomNode[],
  dataroomId: string,
  parentId: string | null,
  excludeId?: string,
): Set<string> {
  return new Set(
    nodes
      .filter(
        (n) =>
          n.dataroomId === dataroomId &&
          n.parentId === parentId &&
          n.id !== excludeId,
      )
      .map((n) => n.name.toLowerCase()),
  )
}

// ── Formatting ───────────────────────────────────────────────────────────────

/** Human-readable byte size (e.g. "1.2 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
