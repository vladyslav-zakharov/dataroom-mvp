/**
 * Generic empty-state slot: icon area + title + description + optional action.
 */
import type { FC, ReactNode } from 'react'

interface Props {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

const EmptyState: FC<Props> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
      {icon}
    </div>
    <div className="flex flex-col gap-1">
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
)

export default EmptyState
