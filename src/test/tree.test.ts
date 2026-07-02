/**
 * Unit tests for pure tree utility functions in src/lib/tree.ts
 */
import { describe, it, expect } from 'vitest'
import type { DataroomNode, FolderNode, FileNode } from '@/types'
import {
  resolveUploadName,
  validateName,
  getChildren,
  getPath,
  getDescendantIds,
  getDescendantCounts,
  siblingNames,
  formatBytes,
} from '@/lib/tree'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFolder(
  id: string,
  name: string,
  dataroomId = 'dr1',
  parentId: string | null = null,
): FolderNode {
  return {
    id,
    dataroomId,
    parentId,
    name,
    type: 'folder',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

function makeFile(
  id: string,
  name: string,
  dataroomId = 'dr1',
  parentId: string | null = null,
): FileNode {
  return {
    id,
    dataroomId,
    parentId,
    name,
    type: 'file',
    mimeType: 'application/pdf',
    size: 1024,
    blobKey: `blob-${id}`,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

// ── resolveUploadName ─────────────────────────────────────────────────────────

describe('resolveUploadName', () => {
  it('returns the desired name when no collision exists', () => {
    const result = resolveUploadName('Report', new Set(['OtherDoc']))
    expect(result).toBe('Report')
  })

  it('appends (1) when the base name is taken', () => {
    // siblingNames returns lowercased names — match that contract
    const result = resolveUploadName('Report', new Set(['report']))
    expect(result).toBe('Report (1)')
  })

  it('appends (2) when both Report and Report (1) are taken', () => {
    const result = resolveUploadName('Report', new Set(['report', 'report (1)']))
    expect(result).toBe('Report (2)')
  })

  it('strips existing (N) suffix and increments from 1', () => {
    // uploading "Report (1)" when "Report (1)" already exists
    const result = resolveUploadName('Report (1)', new Set(['report (1)']))
    expect(result).toBe('Report (2)')
  })

  it('handles empty sibling set — returns name unchanged', () => {
    expect(resolveUploadName('Doc', new Set())).toBe('Doc')
  })
})

// ── validateName ──────────────────────────────────────────────────────────────

describe('validateName', () => {
  it('returns trimmed name for a valid string', () => {
    expect(validateName('  Hello  ')).toBe('Hello')
  })

  it('returns null for an empty string', () => {
    expect(validateName('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(validateName('   ')).toBeNull()
  })

  it('preserves internal spaces', () => {
    expect(validateName(' My Report ')).toBe('My Report')
  })
})

// ── getChildren ───────────────────────────────────────────────────────────────

describe('getChildren', () => {
  const nodes: DataroomNode[] = [
    makeFolder('f1', 'Beta'),
    makeFolder('f2', 'Alpha'),
    makeFile('fi1', 'Zeta'),
    makeFile('fi2', 'Gamma'),
    // node in a different dataroom — should be ignored
    makeFolder('f3', 'Other', 'dr2', null),
    // child of a subfolder — should not appear at root
    makeFolder('f4', 'Nested', 'dr1', 'f1'),
  ]

  it('returns folders before files', () => {
    const children = getChildren(nodes, 'dr1', null)
    const types = children.map((n) => n.type)
    expect(types).toEqual(['folder', 'folder', 'file', 'file'])
  })

  it('sorts folders alphabetically', () => {
    const children = getChildren(nodes, 'dr1', null)
    const folderNames = children.filter((n) => n.type === 'folder').map((n) => n.name)
    expect(folderNames).toEqual(['Alpha', 'Beta'])
  })

  it('sorts files alphabetically', () => {
    const children = getChildren(nodes, 'dr1', null)
    const fileNames = children.filter((n) => n.type === 'file').map((n) => n.name)
    expect(fileNames).toEqual(['Gamma', 'Zeta'])
  })

  it('excludes nodes from other datarooms', () => {
    const children = getChildren(nodes, 'dr1', null)
    expect(children.every((n) => n.dataroomId === 'dr1')).toBe(true)
  })

  it('returns empty array when no children exist', () => {
    expect(getChildren(nodes, 'dr1', 'f2')).toHaveLength(0)
  })

  it('returns children of a subfolder', () => {
    const children = getChildren(nodes, 'dr1', 'f1')
    expect(children).toHaveLength(1)
    expect(children[0].id).toBe('f4')
  })
})

// ── getPath ───────────────────────────────────────────────────────────────────

describe('getPath', () => {
  // tree: root → f1 → f2 → f3 (3 levels deep)
  const nodes: DataroomNode[] = [
    makeFolder('f1', 'Level1', 'dr1', null),
    makeFolder('f2', 'Level2', 'dr1', 'f1'),
    makeFolder('f3', 'Level3', 'dr1', 'f2'),
  ]

  it('returns single-element path for a root node', () => {
    const path = getPath(nodes, 'f1')
    expect(path.map((n) => n.id)).toEqual(['f1'])
  })

  it('returns path in root-to-node order for depth-2 node', () => {
    const path = getPath(nodes, 'f2')
    expect(path.map((n) => n.id)).toEqual(['f1', 'f2'])
  })

  it('returns path in root-to-node order for depth-3 node', () => {
    const path = getPath(nodes, 'f3')
    expect(path.map((n) => n.id)).toEqual(['f1', 'f2', 'f3'])
  })

  it('returns empty array when node is not found', () => {
    expect(getPath(nodes, 'nonexistent')).toHaveLength(0)
  })

  it('includes the node itself at the end of the path', () => {
    const path = getPath(nodes, 'f3')
    expect(path[path.length - 1].id).toBe('f3')
  })
})

// ── getDescendantIds ──────────────────────────────────────────────────────────

describe('getDescendantIds', () => {
  // tree: f1 → [f2, fi1]; f2 → [f3, fi2]
  const nodes: DataroomNode[] = [
    makeFolder('f1', 'Root', 'dr1', null),
    makeFolder('f2', 'Child', 'dr1', 'f1'),
    makeFile('fi1', 'FileA', 'dr1', 'f1'),
    makeFolder('f3', 'GrandChild', 'dr1', 'f2'),
    makeFile('fi2', 'FileB', 'dr1', 'f2'),
  ]

  it('returns all descendant ids for a node with children', () => {
    const ids = getDescendantIds(nodes, 'f1')
    expect(ids.sort()).toEqual(['f2', 'f3', 'fi1', 'fi2'].sort())
  })

  it('returns empty array for a leaf node', () => {
    expect(getDescendantIds(nodes, 'fi1')).toHaveLength(0)
  })

  it('does not include the node itself', () => {
    const ids = getDescendantIds(nodes, 'f1')
    expect(ids).not.toContain('f1')
  })
})

// ── getDescendantCounts ───────────────────────────────────────────────────────

describe('getDescendantCounts', () => {
  // tree: f1 → [f2, fi1]; f2 → [f3, fi2, fi3]
  const nodes: DataroomNode[] = [
    makeFolder('f1', 'Root', 'dr1', null),
    makeFolder('f2', 'Child', 'dr1', 'f1'),
    makeFile('fi1', 'FileA', 'dr1', 'f1'),
    makeFolder('f3', 'GrandChild', 'dr1', 'f2'),
    makeFile('fi2', 'FileB', 'dr1', 'f2'),
    makeFile('fi3', 'FileC', 'dr1', 'f2'),
  ]

  it('counts all descendant folders and files separately', () => {
    const counts = getDescendantCounts(nodes, 'f1')
    expect(counts.folders).toBe(2) // f2, f3
    expect(counts.files).toBe(3)   // fi1, fi2, fi3
  })

  it('returns correct counts for an intermediate node', () => {
    const counts = getDescendantCounts(nodes, 'f2')
    expect(counts.folders).toBe(1) // f3
    expect(counts.files).toBe(2)   // fi2, fi3
  })

  it('returns zero counts for a leaf file', () => {
    const counts = getDescendantCounts(nodes, 'fi1')
    expect(counts.folders).toBe(0)
    expect(counts.files).toBe(0)
  })

  it('returns zero counts for an empty folder', () => {
    const counts = getDescendantCounts(nodes, 'f3')
    expect(counts.folders).toBe(0)
    expect(counts.files).toBe(0)
  })
})

// ── siblingNames ──────────────────────────────────────────────────────────────

describe('siblingNames', () => {
  const nodes: DataroomNode[] = [
    makeFolder('f1', 'Alpha', 'dr1', null),
    makeFolder('f2', 'Beta', 'dr1', null),
    makeFile('fi1', 'Gamma', 'dr1', null),
    makeFolder('f3', 'Delta', 'dr1', 'f1'), // child of f1, not root sibling
  ]

  it('returns all sibling names at root level (lowercased)', () => {
    const names = siblingNames(nodes, 'dr1', null)
    expect(names).toEqual(new Set(['alpha', 'beta', 'gamma']))
  })

  it('excludes the node itself when excludeId is provided', () => {
    const names = siblingNames(nodes, 'dr1', null, 'f1')
    expect(names.has('alpha')).toBe(false)
    expect(names.has('beta')).toBe(true)
  })

  it('returns names scoped to the correct parent (lowercased)', () => {
    const names = siblingNames(nodes, 'dr1', 'f1')
    expect(names).toEqual(new Set(['delta']))
  })

  it('returns empty set when no siblings exist', () => {
    const names = siblingNames(nodes, 'dr1', 'f2')
    expect(names.size).toBe(0)
  })
})

// ── formatBytes ───────────────────────────────────────────────────────────────

describe('formatBytes', () => {
  it('formats bytes under 1 KB', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })

  it('formats gigabytes', () => {
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe('1.50 GB')
  })

  it('formats exactly 1 KB boundary', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
  })
})
