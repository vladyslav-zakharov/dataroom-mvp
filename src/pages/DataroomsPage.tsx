import { useState, type FC } from 'react'
import { DatabaseIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DataroomCard from '@/components/dataroom/DataroomCard'
import CreateDataroomDialog from '@/components/dataroom/CreateDataroomDialog'
import EmptyState from '@/components/common/EmptyState'
import { useDataroomStore } from '@/store/useDataroomStore'

const DataroomsPage: FC = () => {
  const datarooms = useDataroomStore((s) => s.datarooms)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Datarooms</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your due-diligence document rooms.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          New Dataroom
        </Button>
      </div>

      {datarooms.length === 0 ? (
        <EmptyState
          icon={<DatabaseIcon className="h-7 w-7" aria-hidden="true" />}
          title="No datarooms yet"
          description="Create your first dataroom to start organising due-diligence documents."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              New Dataroom
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {datarooms.map((dr) => (
            <DataroomCard key={dr.id} dataroom={dr} />
          ))}
        </div>
      )}

      <CreateDataroomDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

export default DataroomsPage
