/**
 * Upload button with hidden file-picker fallback.
 * Validates file type (must be application/pdf) and size (max 25 MB).
 * Surfaces a toast on success, auto-rename, and errors.
 * The 25 MB limit is chosen to stay well within typical browser IndexedDB quotas
 * while being generous enough for real due-diligence documents.
 */
import { useRef, useState, type FC } from 'react'
import { UploadIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useDataroomStore } from '@/store/useDataroomStore'
import { DataroomError } from '@/types'
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_LABEL } from '@/lib/upload'

interface Props {
  dataroomId: string
  parentId: string | null
}

const UploadButton: FC<Props> = ({ dataroomId, parentId }) => {
  const uploadFile = useDataroomStore((s) => s.uploadFile)
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const validateAndUpload = async (file: File) => {
    // Strict MIME type check — matches the store's validation so extension-only
    // files (empty MIME) are rejected here before reaching the store.
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

    setUploading(true)
    try {
      const node = await uploadFile(dataroomId, parentId, file)
      // Non-enumerable _wasRenamed flag set by the store
      const wasRenamed = (node as unknown as Record<string, unknown>)['_wasRenamed'] === true
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
    } finally {
      setUploading(false)
      // Reset so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await validateAndUpload(file)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
      />
      <Button
        variant="default"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Upload PDF file"
      >
        <UploadIcon className="h-4 w-4" aria-hidden="true" />
        {uploading ? 'Uploading…' : 'Upload PDF'}
      </Button>
    </>
  )
}

export default UploadButton
