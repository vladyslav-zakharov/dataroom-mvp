/**
 * Lightweight component smoke tests.
 * Focus: empty states render correctly and dialogs reject blank input.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ── Mock IDB (same as store tests) ────────────────────────────────────────────

vi.mock('@/lib/idb', () => ({
  loadDatarooms: vi.fn(async () => []),
  loadNodes: vi.fn(async () => []),
  persistDatarooms: vi.fn(async () => {}),
  persistNodes: vi.fn(async () => {}),
  persistBlob: vi.fn(async () => {}),
  loadBlob: vi.fn(async () => undefined),
  deleteBlob: vi.fn(async () => {}),
  deleteBlobs: vi.fn(async () => {}),
}))

// ── Mock sonner toast so we don't need its animation/portal infrastructure ────

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

import { useDataroomStore } from '@/store/useDataroomStore'
import EmptyState from '@/components/common/EmptyState'
import NameInput from '@/components/common/NameInput'
import CreateDataroomDialog from '@/components/dataroom/CreateDataroomDialog'
import CreateFolderDialog from '@/components/explorer/CreateFolderDialog'

beforeEach(() => {
  useDataroomStore.setState({ datarooms: [], nodes: [], isHydrated: false })
})

// ── EmptyState ─────────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        icon={<span>icon</span>}
        title="No datarooms yet"
        description="Create your first dataroom"
      />,
    )
    expect(screen.getByText('No datarooms yet')).toBeInTheDocument()
    expect(screen.getByText('Create your first dataroom')).toBeInTheDocument()
  })

  it('renders the action when provided', () => {
    render(
      <EmptyState
        icon={<span>icon</span>}
        title="Empty"
        description="desc"
        action={<button>Add item</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument()
  })

  it('does not render action slot when omitted', () => {
    render(<EmptyState icon={<span>icon</span>} title="Empty" description="desc" />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

// ── NameInput ─────────────────────────────────────────────────────────────────

describe('NameInput', () => {
  it('renders with the given value', () => {
    render(<NameInput value="Hello" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('Hello')
  })

  it('displays the error message when error prop is set', () => {
    render(<NameInput value="" onChange={() => {}} error="Name cannot be blank." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Name cannot be blank.')
  })

  it('does not show error when error prop is absent', () => {
    render(<NameInput value="" onChange={() => {}} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('calls onChange when the user types', () => {
    const onChange = vi.fn()
    render(<NameInput value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New' } })
    expect(onChange).toHaveBeenCalledWith('New')
  })

  it('calls onEnter when Enter key is pressed', () => {
    const onEnter = vi.fn()
    render(<NameInput value="text" onChange={() => {}} onEnter={onEnter} />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(onEnter).toHaveBeenCalledOnce()
  })

  it('does not call onEnter for other keys', () => {
    const onEnter = vi.fn()
    render(<NameInput value="text" onChange={() => {}} onEnter={onEnter} />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    expect(onEnter).not.toHaveBeenCalled()
  })
})

// ── CreateDataroomDialog ──────────────────────────────────────────────────────

describe('CreateDataroomDialog', () => {
  it('renders the dialog title when open', () => {
    render(<CreateDataroomDialog open onOpenChange={() => {}} />)
    expect(screen.getByText('New Dataroom')).toBeInTheDocument()
  })

  it('shows an inline error when submitting a blank name', () => {
    render(<CreateDataroomDialog open onOpenChange={() => {}} />)
    // The Create button is disabled while name is empty; bypass via Enter key
    const input = screen.getByPlaceholderText('Dataroom name')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('alert')).toHaveTextContent('Name cannot be blank.')
  })

  it('shows a collision error when submitting a duplicate name', () => {
    // Seed store with an existing dataroom
    useDataroomStore.getState().createDataroom('Existing')

    render(<CreateDataroomDialog open onOpenChange={() => {}} />)
    const input = screen.getByPlaceholderText('Dataroom name')
    fireEvent.change(input, { target: { value: 'Existing' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('alert')).toHaveTextContent('already exists')
  })

  it('clears the error message when the user starts typing again', () => {
    render(<CreateDataroomDialog open onOpenChange={() => {}} />)
    const input = screen.getByPlaceholderText('Dataroom name')
    fireEvent.keyDown(input, { key: 'Enter' }) // trigger blank error
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'x' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('Create button is disabled while name input is empty', () => {
    render(<CreateDataroomDialog open onOpenChange={() => {}} />)
    const btn = screen.getByRole('button', { name: 'Create' })
    expect(btn).toBeDisabled()
  })

  it('Create button becomes enabled when a non-empty name is typed', () => {
    render(<CreateDataroomDialog open onOpenChange={() => {}} />)
    const input = screen.getByPlaceholderText('Dataroom name')
    fireEvent.change(input, { target: { value: 'My Room' } })
    expect(screen.getByRole('button', { name: 'Create' })).not.toBeDisabled()
  })
})

// ── CreateFolderDialog ────────────────────────────────────────────────────────

describe('CreateFolderDialog', () => {
  const defaultProps = {
    open: true as const,
    onOpenChange: () => {},
    dataroomId: 'dr1',
    parentId: null,
  }

  beforeEach(() => {
    // Seed store so there is a dataroom for dr1 context
    useDataroomStore.setState({
      datarooms: [
        { id: 'dr1', name: 'Test DR', createdAt: '', updatedAt: '' },
      ],
      nodes: [],
      isHydrated: true,
    })
  })

  it('renders the dialog title', () => {
    render(<CreateFolderDialog {...defaultProps} />)
    expect(screen.getByText('New Folder')).toBeInTheDocument()
  })

  it('shows blank-name error when submitted without input', () => {
    render(<CreateFolderDialog {...defaultProps} />)
    fireEvent.keyDown(screen.getByPlaceholderText('Folder name'), { key: 'Enter' })
    expect(screen.getByRole('alert')).toHaveTextContent('cannot be blank')
  })

  it('shows collision error when a sibling with the same name exists', () => {
    // Seed a sibling folder
    useDataroomStore.getState().createFolder('dr1', null, 'Existing')

    render(<CreateFolderDialog {...defaultProps} />)
    const input = screen.getByPlaceholderText('Folder name')
    fireEvent.change(input, { target: { value: 'Existing' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('alert')).toHaveTextContent('already exists')
  })

  it('Create button is disabled while input is empty', () => {
    render(<CreateFolderDialog {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
  })
})
