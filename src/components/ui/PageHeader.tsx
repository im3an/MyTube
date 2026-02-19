import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from '@untitledui/icons'
import { Avatar } from '@/components/base/avatar/avatar'
import type { AvatarProps } from '@/components/base/avatar/avatar'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  avatar?: Pick<AvatarProps, 'src' | 'alt' | 'initials' | 'size'>
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  avatar,
}: PageHeaderProps) {
  return (
    <div className="animate-fade-in space-y-3">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />
              )}
              {item.href ? (
                <Link
                  to={item.href}
                  className="text-gray-400 transition-colors duration-200 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-gray-700 dark:text-gray-200">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {avatar && (
            <Avatar
              src={avatar.src}
              alt={avatar.alt}
              initials={avatar.initials}
              size={avatar.size ?? 'xl'}
              className="shrink-0"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
