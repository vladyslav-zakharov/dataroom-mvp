/**
 * Dialog for renaming an existing dataroom.
 */
import { useState, useEffect, type FC } from 'react'
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
  currentName: string
}

const RenameDataroomDialog: FC<Props> = ({
  open,
  onOpenChange,
  dataroomId,
  currentName,
}) => {
  const renameDataroom = useDataroomStore((s) => s.renameDataroom)
  const [name, setName] = useState(currentName)
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName(currentName)
      setError(undefined)
    }
  }, [open, currentName])

  const handleOpenChange = (next: boolean) => {
    if (!next) setError(undefined)
    onOpenChange(next)
  }

  const handleSubmit = () => {
    setError(undefined)
    setBusy(true)
    try {
      renameDataroom(dataroomId, name)
      toast.success('Dataroom renamed')
      handleOpenChange(false)
    } catch (err) {
      if (err instanceof DataroomError) {
        if (err.code === 'BLANK_NAME') {
          setError('Name cannot be blank.')
        } else if (err.code === 'NAME_COLLISION') {
          setError('A dataroom with this name already exists.')
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
          <DialogTitle>Rename Dataroom</DialogTitle>
        </DialogHeader>
        <NameInput
          value={name}
          onChange={(v) => {
            setName(v)
            if (error) setError(undefined)
          }}
          error={error}
          placeholder="Dataroom name"
          disabled={busy}
          onEnter={handleSubmit}
          autoFocus
        />
        <DialogFooter>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={busy || name.trim().length === 0 || name.trim() === currentName.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RenameDataroomDialog
