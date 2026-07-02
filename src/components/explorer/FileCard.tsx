/**
 * Single file tile in the explorer grid.
 * onClick is a seam — the PDF viewer stage will hook into it.
 * Exposes onRename / onDelete seams as well.
 */
import type { FC } from 'react'
import { FileTextIcon } from 'lucide-react'
import { formatBytes } from '@/lib/tree'
import type { FileNode } from '@/types'

interface Props {
  node: FileNode
  /** Seam: next stage opens PDF viewer here. */
  onClick?: (node: FileNode) => void
  /** Seam: next stage hooks rename action here. */
  onRename?: (node: FileNode) => void
  /** Seam: next stage hooks delete action here. */
  onDelete?: (node: FileNode) => void
}

const FileCard: FC<Props> = ({ node, onClick }) => {
  return (
    <button
      type="button"
      className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onClick?.(node)}
      aria-label={`Open file ${node.name}`}
    >
      <FileTextIcon
        className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent-foreground"
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{node.name}</span>
        <span className="block text-xs text-muted-foreground group-hover:text-accent-foreground/70">
          {formatBytes(node.size)}
        </span>
      </span>
    </button>
  )
}

export default FileCard
