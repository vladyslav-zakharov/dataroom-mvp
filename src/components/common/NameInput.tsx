/**
 * Controlled name input with inline error display.
 * Shared by CreateDataroomDialog, RenameDialog, CreateFolderDialog.
 */
import type { FC, KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  disabled?: boolean
  onEnter?: () => void
  autoFocus?: boolean
}

const NameInput: FC<Props> = ({
  value,
  onChange,
  error,
  placeholder = 'Name',
  disabled,
  onEnter,
  autoFocus,
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault()
      onEnter()
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        className={cn(error && 'border-destructive focus-visible:ring-destructive/20')}
      />
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default NameInput
