/**
 * Dialog for renaming a folder or file within the explorer.
 * Shared by both FolderCard and FileCard action menus.
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
import type { DataroomNode } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: DataroomNode | null
}

const RenameNodeDialog: FC<Props> = ({ open, onOpenChange, node }) => {
  const renameNode = useDataroomStore((s) => s.renameNode)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open && node) {
      setName(node.name)
      setError(undefined)
    }
  }, [open, node])

  const handleOpenChange = (next: boolean) => {
    if (!next) setError(undefined)
    onOpenChange(next)
  }

  const handleSubmit = () => {
    if (!node) return
    setError(undefined)
    setBusy(true)
    try {
      renameNode(node.id, name)
      const label = node.type === 'folder' ? 'Folder' : 'File'
      toast.success(`${label} renamed`)
      handleOpenChange(false)
    } catch (err) {
      if (err instanceof DataroomError) {
        if (err.code === 'BLANK_NAME') {
          setError('Name cannot be blank.')
        } else if (err.code === 'NAME_COLLISION') {
          setError('An item with this name already exists here.')
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

  const label = node?.type === 'folder' ? 'Folder' : 'File'
  const unchanged = name.trim() === node?.name.trim()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {label}</DialogTitle>
        </DialogHeader>
        <NameInput
          value={name}
          onChange={(v) => {
            setName(v)
            if (error) setError(undefined)
          }}
          error={error}
          placeholder={`${label} name`}
          disabled={busy}
          onEnter={handleSubmit}
          autoFocus
        />
        <DialogFooter>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={busy || name.trim().length === 0 || unchanged}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RenameNodeDialog
