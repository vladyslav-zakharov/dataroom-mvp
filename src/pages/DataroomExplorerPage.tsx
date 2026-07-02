import type { FC } from 'react'
import { useParams } from 'react-router-dom'

const DataroomExplorerPage: FC = () => {
  const { dataroomId, folderId } = useParams<{
    dataroomId: string
    folderId?: string
  }>()

  return (
    <div>
      <p className="text-muted-foreground text-sm font-mono">
        dataroomId: {dataroomId}
        {folderId ? ` / folderId: ${folderId}` : ''}
      </p>
      {/* Feature implementation in the next build stage */}
    </div>
  )
}

export default DataroomExplorerPage
