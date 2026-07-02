/**
 * Confirmation alert-dialog for deleting a folder or file.
 * For folders, shows exact descendant counts (folders + files to be removed).
 * For files, confirms the single file deletion.
 */
import { useState, type FC } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { useDataroomStore } from '@/store/useDataroomStore'
import type { DataroomNode } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: DataroomNode | null
}

const DeleteNodeDialog: FC<Props> = ({ open, onOpenChange, node }) => {
  const deleteNode = useDataroomStore((s) => s.deleteNode)
  const getDescendantCounts = useDataroomStore((s) => s.getDescendantCounts)
  const [busy, setBusy] = useState(false)

  if (!node) return null

  const buildDescription = () => {
    if (node.type === 'file') {
      return 'This action cannot be undone. The file will be permanently deleted.'
    }
    // Folder — count descendants
    const { folders, files } = getDescendantCounts(node.id)
    const parts: string[] = []
    if (folders > 0) parts.push(`${folders} nested folder${folders !== 1 ? 's' : ''}`)
    if (files > 0) parts.push(`${files} file${files !== 1 ? 's' : ''}`)
    if (parts.length === 0) {
      return 'This action cannot be undone. The empty folder will be permanently deleted.'
    }
    return `This action cannot be undone. Deleting this folder will also permanently remove ${parts.join(' and ')}.`
  }

  const handleConfirm = async () => {
    setBusy(true)
    try {
      await deleteNode(node.id)
      const label = node.type === 'folder' ? 'Folder' : 'File'
      toast.success(`${label} "${node.name}" deleted`)
      onOpenChange(false)
    } catch {
      toast.error('Failed to delete. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const label = node.type === 'folder' ? 'folder' : 'file'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label} &ldquo;{node.name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>{buildDescription()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteNodeDialog
