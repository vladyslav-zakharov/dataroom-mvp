import { useState, useEffect, type FC } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PlusIcon, DatabaseIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ExplorerBreadcrumb from '@/components/explorer/ExplorerBreadcrumb'
import ExplorerGrid from '@/components/explorer/ExplorerGrid'
import CreateFolderDialog from '@/components/explorer/CreateFolderDialog'
import RenameNodeDialog from '@/components/explorer/RenameNodeDialog'
import DeleteNodeDialog from '@/components/explorer/DeleteNodeDialog'
import UploadButton from '@/components/explorer/UploadButton'
import DropZone from '@/components/explorer/DropZone'
import PDFViewerDialog from '@/components/viewer/PDFViewerDialog'
import { useDataroomStore } from '@/store/useDataroomStore'
import type { DataroomNode, FolderNode, FileNode } from '@/types'

const DataroomExplorerPage: FC = () => {
  const { dataroomId, folderId } = useParams<{
    dataroomId: string
    folderId?: string
  }>()

  // All hooks called unconditionally at the top
  const datarooms = useDataroomStore((s) => s.datarooms)
  const nodes = useDataroomStore((s) => s.nodes)
  const getChildren = useDataroomStore((s) => s.getChildren)
  const getPath = useDataroomStore((s) => s.getPath)

  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [renameNode, setRenameNode] = useState<DataroomNode | null>(null)
  const [deleteNode, setDeleteNode] = useState<DataroomNode | null>(null)
  const [viewFile, setViewFile] = useState<FileNode | null>(null)

  // Close all dialogs when navigating between folders in the same route pattern
  useEffect(() => {
    setCreateFolderOpen(false)
    setRenameNode(null)
    setDeleteNode(null)
    setViewFile(null)
  }, [dataroomId, folderId])

  // Resolve the dataroom — show a not-found state if missing
  const dataroom = datarooms.find((d) => d.id === dataroomId)
  if (!dataroom) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <DatabaseIcon className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium text-foreground">Dataroom not found</p>
          <p className="text-sm text-muted-foreground">
            This dataroom may have been deleted or the link is invalid.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted hover:text-foreground transition-all"
        >
          Back to Datarooms
        </Link>
      </div>
    )
  }

  // When a folderId is present, validate it exists in this dataroom
  if (folderId) {
    const folderNode = nodes.find(
      (n) => n.id === folderId && n.dataroomId === dataroomId && n.type === 'folder',
    )
    if (!folderNode) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <DatabaseIcon className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">Folder not found</p>
            <p className="text-sm text-muted-foreground">
              This folder may have been deleted or the link is invalid.
            </p>
          </div>
          <Link
            to={`/dataroom/${dataroomId}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted hover:text-foreground transition-all"
          >
            Back to {dataroom.name}
          </Link>
        </div>
      )
    }
  }

  // The parentId for queries: null means dataroom root, folderId means inside that folder
  const parentId: string | null = folderId ?? null

  // Ancestor path for the breadcrumb (empty array when at root)
  const path = folderId ? getPath(folderId) : []

  // Current folder's children (folders first, then files, alphabetical per group)
  const children = getChildren(dataroomId!, parentId)

  const handleFolderRename = (node: FolderNode) => setRenameNode(node)
  const handleFolderDelete = (node: FolderNode) => setDeleteNode(node)
  const handleFileRename = (node: FileNode) => setRenameNode(node)
  const handleFileDelete = (node: FileNode) => setDeleteNode(node)
  const handleFileClick = (node: FileNode) => setViewFile(node)

  return (
    <>
      <div className="mb-4">
        <ExplorerBreadcrumb dataroom={dataroom} path={path} />
      </div>

      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {path.length > 0 ? path[path.length - 1].name : dataroom.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            New Folder
          </Button>
          <UploadButton dataroomId={dataroomId!} parentId={parentId} />
        </div>
      </div>

      <DropZone dataroomId={dataroomId!} parentId={parentId}>
        <ExplorerGrid
          dataroomId={dataroomId!}
          nodes={children}
          onFileClick={handleFileClick}
          onFolderRename={handleFolderRename}
          onFolderDelete={handleFolderDelete}
          onFileRename={handleFileRename}
          onFileDelete={handleFileDelete}
        />
      </DropZone>

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        dataroomId={dataroomId!}
        parentId={parentId}
      />

      <RenameNodeDialog
        open={renameNode !== null}
        onOpenChange={(open) => { if (!open) setRenameNode(null) }}
        node={renameNode}
      />

      <DeleteNodeDialog
        open={deleteNode !== null}
        onOpenChange={(open) => { if (!open) setDeleteNode(null) }}
        node={deleteNode}
      />

      <PDFViewerDialog
        open={viewFile !== null}
        onOpenChange={(open) => { if (!open) setViewFile(null) }}
        node={viewFile}
      />
    </>
  )
}

export default DataroomExplorerPage
