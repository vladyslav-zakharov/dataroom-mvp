/**
 * Breadcrumb trail: Home / DataroomName / FolderA / FolderB
 * Each segment (except the last) is a navigable link.
 */
import type { FC } from 'react'
import { Link } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { Dataroom, DataroomNode } from '@/types'

interface Props {
  dataroom: Dataroom
  /** Ancestor path from getPath — root-to-current, inclusive. Null when at dataroom root. */
  path: DataroomNode[]
}

const ExplorerBreadcrumb: FC<Props> = ({ dataroom, path }) => {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Dashboard home */}
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link to="/" />}>Datarooms</BreadcrumbLink>
        </BreadcrumbItem>

        {/* Dataroom root */}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {path.length === 0 ? (
            <BreadcrumbPage>{dataroom.name}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<Link to={`/dataroom/${dataroom.id}`} />}>
              {dataroom.name}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {/* Folder ancestors */}
        {path.map((node, idx) => {
          const isLast = idx === path.length - 1
          return (
            <span key={node.id} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{node.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={<Link to={`/dataroom/${dataroom.id}/folder/${node.id}`} />}
                  >
                    {node.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default ExplorerBreadcrumb
