/**
 * Single folder tile in the explorer grid.
 * Clicking navigates into the folder.
 * Exposes onRename / onDelete seams for the next stage's context-menu.
 */
import type { FC } from 'react'
import { FolderIcon } from 'lucide-react'
import type { FolderNode } from '@/types'

interface Props {
  node: FolderNode
  onClick: (node: FolderNode) => void
  /** Seam: next stage hooks rename action here. */
  onRename?: (node: FolderNode) => void
  /** Seam: next stage hooks delete action here. */
  onDelete?: (node: FolderNode) => void
}

const FolderCard: FC<Props> = ({ node, onClick }) => {
  return (
    <button
      type="button"
      className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onClick(node)}
      aria-label={`Open folder ${node.name}`}
    >
      <FolderIcon
        className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent-foreground"
        aria-hidden="true"
      />
      <span className="truncate font-medium">{node.name}</span>
    </button>
  )
}

export default FolderCard
