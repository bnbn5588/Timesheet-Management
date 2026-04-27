import { cn } from '@/lib/utils'

type BadgeVariant = 'pending' | 'approved' | 'rejected' | 'default'

const variantClasses: Record<BadgeVariant, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  approved: 'bg-green-100 text-green-800 border border-green-200',
  rejected: 'bg-red-100 text-red-800 border border-red-200',
  default: 'bg-gray-100 text-gray-700 border border-gray-200',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  }
  return <Badge variant={variantMap[status] ?? 'default'}>{status}</Badge>
}
