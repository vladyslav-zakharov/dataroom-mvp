/**
 * Modal dialog for creating a new dataroom.
 * Handles blank-name and name-collision validation inline.
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
  onCreated?: (id: string) => void
}

const CreateDataroomDialog: FC<Props> = ({ open, onOpenChange, onCreated }) => {
  const createDataroom = useDataroomStore((s) => s.createDataroom)
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
      const dataroom = createDataroom(name)
      toast.success(`"${dataroom.name}" created`)
      onCreated?.(dataroom.id)
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
          <DialogTitle>New Dataroom</DialogTitle>
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
            disabled={busy || name.trim().length === 0}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateDataroomDialog
