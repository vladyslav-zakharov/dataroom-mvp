/**
 * Drag-and-drop zone that wraps the explorer grid area.
 * Validates dropped files (PDF, ≤25 MB) and delegates to the same
 * validateAndUpload logic as UploadButton via a shared callback prop.
 * Shows a visible drop overlay while dragging.
 */
import { useState, useCallback, useRef, type FC, type ReactNode, type DragEvent } from 'react'
import { UploadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useDataroomStore } from '@/store/useDataroomStore'
import { DataroomError } from '@/types'
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_LABEL } from '@/lib/upload'

interface Props {
  dataroomId: string
  parentId: string | null
  children: ReactNode
}

const DropZone: FC<Props> = ({ dataroomId, parentId, children }) => {
  const uploadFile = useDataroomStore((s) => s.uploadFile)
  const [dragging, setDragging] = useState(false)
  // Track nested drag-enter/leave with a stable ref to avoid flicker.
  // Must be useRef so the counter survives re-renders (e.g. those triggered
  // by a file drop updating the store mid-drag).
  const dragCounterRef = useRef(0)

  const processFile = useCallback(
    async (file: File) => {
      const isPdf = file.type === 'application/pdf'
      if (!isPdf) {
        toast.error('Only PDF files are supported', {
          description: `"${file.name}" is not a PDF file.`,
        })
        return
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error('File too large', {
          description: `"${file.name}" exceeds the ${MAX_FILE_SIZE_LABEL} limit.`,
        })
        return
      }

      try {
        const node = await uploadFile(dataroomId, parentId, file)
        const wasRenamed =
          (node as unknown as Record<string, unknown>)['_wasRenamed'] === true
        if (wasRenamed) {
          toast.success(`Uploaded as "${node.name}"`, {
            description: `Renamed to avoid a conflict with an existing file.`,
          })
        } else {
          toast.success(`"${node.name}" uploaded`)
        }
      } catch (err) {
        if (err instanceof DataroomError && err.code === 'INVALID_FILE_TYPE') {
          toast.error('Only PDF files are supported', {
            description: `"${file.name}" could not be uploaded.`,
          })
        } else {
          toast.error('Upload failed', {
            description: 'An unexpected error occurred. Please try again.',
          })
        }
      }
    },
    [dataroomId, parentId, uploadFile],
  )

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (dragCounterRef.current === 1) {
      setDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setDragging(false)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    // Process each dropped file sequentially
    for (const file of files) {
      await processFile(file)
    }
  }

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {dragging && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[1px]"
          aria-hidden="true"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UploadIcon className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="font-medium text-primary">Drop PDF files here</p>
            <p className="text-sm text-muted-foreground">Maximum {MAX_FILE_SIZE_LABEL} per file</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default DropZone
