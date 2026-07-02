/**
 * Modal PDF viewer.
 * Creates an object URL from the stored blob and renders it in an <iframe>.
 * Revokes the URL on close to prevent memory leaks.
 * Shows a clear error state if the blob is missing or corrupt.
 */
import { useState, useEffect, useRef, useCallback, type FC } from 'react'
import { DownloadIcon, AlertCircleIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDataroomStore } from '@/store/useDataroomStore'
import type { FileNode } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: FileNode | null
}

type ViewerState =
  | { status: 'loading' }
  | { status: 'ready'; url: string; fileName: string }
  | { status: 'error'; message: string }

const PDFViewerDialog: FC<Props> = ({ open, onOpenChange, node }) => {
  const getFileBlob = useDataroomStore((s) => s.getFileBlob)
  const [state, setState] = useState<ViewerState>({ status: 'loading' })
  // Keep a stable reference to the last non-null node so the dialog title
  // doesn't flash "PDF Viewer" during the close animation.
  const nodeRef = useRef<FileNode | null>(node)
  if (node !== null) nodeRef.current = node
  const displayNode = nodeRef.current

  // Load blob and create object URL when the dialog opens with a valid node.
  // Revoke the previous URL before creating a new one.
  useEffect(() => {
    if (!open || !node) return

    let objectUrl: string | null = null
    let cancelled = false

    setState({ status: 'loading' })

    getFileBlob(node.id)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setState({ status: 'ready', url: objectUrl, fileName: node.name })
      })
      .catch(() => {
        if (cancelled) return
        setState({
          status: 'error',
          message:
            'The file could not be loaded. It may have been corrupted or failed to save.',
        })
      })

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [open, node, getFileBlob])

  // Revoke URL on close (handles user dismissal between renders)
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && state.status === 'ready') {
        URL.revokeObjectURL(state.url)
        setState({ status: 'loading' })
      }
      onOpenChange(next)
    },
    [onOpenChange, state],
  )

  const handleDownload = () => {
    if (state.status !== 'ready') return
    const a = document.createElement('a')
    a.href = state.url
    a.download = state.fileName.endsWith('.pdf')
      ? state.fileName
      : `${state.fileName}.pdf`
    a.click()
  }

  const title = displayNode?.name ?? 'PDF Viewer'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex flex-col sm:max-w-3xl h-[90vh] max-h-[90vh] p-0 gap-0"
        showCloseButton={true}
      >
        <DialogHeader className="flex-row items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <DialogTitle className="truncate text-sm font-medium">{title}</DialogTitle>
          {state.status === 'ready' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="shrink-0 mr-8"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Download
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30">
          {state.status === 'loading' && (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin"
                  role="status"
                  aria-label="Loading PDF"
                />
                <p className="text-sm text-muted-foreground">Loading PDF…</p>
              </div>
            </div>
          )}

          {state.status === 'error' && (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center px-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertCircleIcon className="h-7 w-7" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-foreground">Unable to display PDF</p>
                  <p className="text-sm text-muted-foreground max-w-xs">{state.message}</p>
                </div>
              </div>
            </div>
          )}

          {state.status === 'ready' && (
            <iframe
              src={state.url}
              title={title}
              className="h-full w-full border-0"
              aria-label={`PDF viewer for ${title}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PDFViewerDialog
