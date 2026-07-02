/**
 * Single file tile in the explorer grid.
 * Clicking the main area opens the PDF viewer.
 * Three-dot menu exposes rename and delete actions.
 */
import type { FC } from 'react'
import { FileTextIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { formatBytes } from '@/lib/tree'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { FileNode } from '@/types'

interface Props {
  node: FileNode
  onClick?: (node: FileNode) => void
  onRename?: (node: FileNode) => void
  onDelete?: (node: FileNode) => void
}

const FileCard: FC<Props> = ({ node, onClick, onRename, onDelete }) => {
  return (
    <div className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground">
      {/* Main clickable area */}
      <button
        type="button"
        className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded min-w-0"
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

      {/* Actions menu */}
      {(onRename || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className={cn(
                  'shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100',
                  'inline-flex size-7 items-center justify-center rounded-[min(var(--radius-md),12px)]',
                  'text-muted-foreground hover:bg-muted hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
                aria-label={`Actions for ${node.name}`}
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <MoreHorizontalIcon className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onRename && (
              <DropdownMenuItem onSelect={() => onRename(node)}>
                <PencilIcon className="h-4 w-4" />
                Rename
              </DropdownMenuItem>
            )}
            {onRename && onDelete && <DropdownMenuSeparator />}
            {onDelete && (
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(node)}>
                <Trash2Icon className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export default FileCard
