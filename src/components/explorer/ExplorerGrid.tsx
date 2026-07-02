/**
 * Renders the child nodes of the current folder:
 * folders first (alphabetical), then files (alphabetical).
 * Delegates each item to FolderCard / FileCard.
 */
import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import FolderCard from '@/components/explorer/FolderCard'
import FileCard from '@/components/explorer/FileCard'
import EmptyState from '@/components/common/EmptyState'
import { FolderOpenIcon } from 'lucide-react'
import type { DataroomNode, FolderNode, FileNode } from '@/types'

interface Props {
  dataroomId: string
  nodes: DataroomNode[]
  /** Seam: next stage passes a handler to open the PDF viewer. */
  onFileClick?: (node: FileNode) => void
  /** Seam: next stage passes rename/delete handlers. */
  onFolderRename?: (node: FolderNode) => void
  onFolderDelete?: (node: FolderNode) => void
  onFileRename?: (node: FileNode) => void
  onFileDelete?: (node: FileNode) => void
}

const ExplorerGrid: FC<Props> = ({
  dataroomId,
  nodes,
  onFileClick,
  onFolderRename,
  onFolderDelete,
  onFileRename,
  onFileDelete,
}) => {
  const navigate = useNavigate()

  const folders = nodes.filter((n): n is FolderNode => n.type === 'folder')
  const files = nodes.filter((n): n is FileNode => n.type === 'file')

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpenIcon className="h-7 w-7" aria-hidden="true" />}
        title="This folder is empty"
        description="Create a folder or upload a PDF file to get started."
      />
    )
  }

  const handleFolderClick = (node: FolderNode) => {
    navigate(`/dataroom/${dataroomId}/folder/${node.id}`)
  }

  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
      {folders.map((node) => (
        <FolderCard
          key={node.id}
          node={node}
          onClick={handleFolderClick}
          onRename={onFolderRename}
          onDelete={onFolderDelete}
        />
      ))}
      {files.map((node) => (
        <FileCard
          key={node.id}
          node={node}
          onClick={onFileClick}
          onRename={onFileRename}
          onDelete={onFileDelete}
        />
      ))}
    </div>
  )
}

export default ExplorerGrid
