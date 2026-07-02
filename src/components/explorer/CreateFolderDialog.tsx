/**
 * Dialog for creating a new folder within the current explorer context.
 */
import { useState, type FC } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import NameInput from '@/components/common/NameInput'
import { useDataroomStore } from '@/store/useDataroomStore'
import { DataroomError } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  dataroomId: string
  parentId: string | null
}

const CreateFolderDialog: FC<Props> = ({ open, onOpenChange, dataroomId, parentId }) => {
  const createFolder = useDataroomStore((s) => s.createFolder)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setName('')
    setError(undefined)
    setBusy(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = () => {
    setError(undefined)
    setBusy(true)
    try {
      const folder = createFolder(dataroomId, parentId, name)
      toast.success(`Folder "${folder.name}" created`)
      handleOpenChange(false)
    } catch (err) {
      if (err instanceof DataroomError) {
        if (err.code === 'BLANK_NAME') {
          setError('Folder name cannot be blank.')
        } else if (err.code === 'NAME_COLLISION') {
          setError('A folder or file with this name already exists here.')
        } else {
          setError(err.message)
        }
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
        </DialogHeader>
        <NameInput
          value={name}
          onChange={(v) => {
            setName(v)
            if (error) setError(undefined)
          }}
          error={error}
          placeholder="Folder name"
          disabled={busy}
          onEnter={handleSubmit}
          autoFocus
        />
        <DialogFooter>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={busy || name.trim().length === 0}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateFolderDialog
