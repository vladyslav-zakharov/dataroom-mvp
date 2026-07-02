/**
 * Confirmation alert-dialog for deleting a dataroom.
 * Shows how many folders and files will be removed.
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  dataroomId: string
  dataroomName: string
  /** Pre-computed counts so the dialog doesn't need to call the store query itself. */
  folderCount: number
  fileCount: number
}

const DeleteDataroomDialog: FC<Props> = ({
  open,
  onOpenChange,
  dataroomId,
  dataroomName,
  folderCount,
  fileCount,
}) => {
  const deleteDataroom = useDataroomStore((s) => s.deleteDataroom)
  const [busy, setBusy] = useState(false)

  const buildSummary = () => {
    const parts: string[] = []
    if (folderCount > 0) parts.push(`${folderCount} folder${folderCount !== 1 ? 's' : ''}`)
    if (fileCount > 0) parts.push(`${fileCount} file${fileCount !== 1 ? 's' : ''}`)
    if (parts.length === 0) return 'It contains no items.'
    return `It contains ${parts.join(' and ')}, which will also be permanently deleted.`
  }

  const handleConfirm = async () => {
    setBusy(true)
    try {
      await deleteDataroom(dataroomId)
      toast.success(`"${dataroomName}" deleted`)
      onOpenChange(false)
    } catch {
      toast.error('Failed to delete dataroom')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{dataroomName}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. {buildSummary()}
          </AlertDialogDescription>
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

export default DeleteDataroomDialog
