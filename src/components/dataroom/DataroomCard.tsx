/**
 * Single card in the Datarooms grid.
 * Clicking the card body navigates to the dataroom.
 * The three-dot menu provides rename and delete actions.
 */
import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontalIcon, PencilIcon, Trash2Icon, DatabaseIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import RenameDataroomDialog from '@/components/dataroom/RenameDataroomDialog'
import DeleteDataroomDialog from '@/components/dataroom/DeleteDataroomDialog'
import { useDataroomStore } from '@/store/useDataroomStore'
import { cn } from '@/lib/utils'
import type { Dataroom } from '@/types'

interface Props {
  dataroom: Dataroom
}

const DataroomCard: FC<Props> = ({ dataroom }) => {
  const navigate = useNavigate()
  const nodes = useDataroomStore((s) => s.nodes)

  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Count all items at the root level for the card summary
  const rootItems = nodes.filter(
    (n) => n.dataroomId === dataroom.id && n.parentId === null,
  )

  // For the delete dialog, count all descendants of each root node plus the root items
  const allItems = nodes.filter((n) => n.dataroomId === dataroom.id)
  const folderCount = allItems.filter((n) => n.type === 'folder').length
  const fileCount = allItems.filter((n) => n.type === 'file').length

  const formattedDate = new Date(dataroom.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const itemLabel = rootItems.length === 1 ? '1 item' : `${rootItems.length} items`

  return (
    <>
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md hover:ring-foreground/20 focus-within:ring-2 focus-within:ring-ring"
        role="article"
      >
        <CardHeader>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <DatabaseIcon className="h-4 w-4" aria-hidden="true" />
          </div>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      'inline-flex size-7 items-center justify-center rounded-[min(var(--radius-md),12px)]',
                      'text-muted-foreground hover:bg-muted hover:text-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                    aria-label={`Actions for ${dataroom.name}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                }
              >
                <MoreHorizontalIcon className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => setRenameOpen(true)}
                >
                  <PencilIcon className="h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2Icon className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
          <CardTitle
            className="cursor-pointer"
            onClick={() => navigate(`/dataroom/${dataroom.id}`)}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate(`/dataroom/${dataroom.id}`)
              }
            }}
          >
            {dataroom.name}
          </CardTitle>
          <CardDescription>{itemLabel}</CardDescription>
        </CardHeader>
        <CardContent
          className="cursor-pointer"
          onClick={() => navigate(`/dataroom/${dataroom.id}`)}
        >
          <p className="text-xs text-muted-foreground">Created {formattedDate}</p>
        </CardContent>
      </Card>

      <RenameDataroomDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        dataroomId={dataroom.id}
        currentName={dataroom.name}
      />

      <DeleteDataroomDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        dataroomId={dataroom.id}
        dataroomName={dataroom.name}
        folderCount={folderCount}
        fileCount={fileCount}
      />
    </>
  )
}

export default DataroomCard
