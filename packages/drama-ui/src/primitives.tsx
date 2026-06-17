import * as React from 'react'

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export type DramaButtonVariant = 'solid' | 'outline' | 'ghost' | 'danger'
export type DramaButtonSize = 'xs' | 'sm' | 'md'

export interface DramaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DramaButtonVariant
  size?: DramaButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, DramaButtonProps>(function Button({
  className,
  variant = 'solid',
  size = 'md',
  type = 'button',
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('drama-button', className)}
      data-variant={variant}
      data-size={size}
      {...props}
    />
  )
})

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: React.ReactNode
  size?: 'sm' | 'md'
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({
  className,
  icon,
  label,
  size = 'md',
  title,
  type = 'button',
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cn('drama-icon-button', className)}
      data-size={size}
      {...props}
    >
      {icon}
    </button>
  )
})

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone
  dot?: boolean
}

export function StatusBadge({
  className,
  tone = 'neutral',
  dot = false,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn('drama-status-badge', className)} data-tone={tone} {...props}>
      {dot ? <span className="drama-status-badge-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

export interface PanelHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode
  badge?: React.ReactNode
  actions?: React.ReactNode
}

export function PanelHeader({
  className,
  title,
  badge,
  actions,
  children,
  ...props
}: PanelHeaderProps) {
  return (
    <header className={cn('drama-panel-header', className)} {...props}>
      <div className="drama-panel-header-main">
        {children ?? (
          <>
            {title ? <div className="drama-panel-header-title">{title}</div> : null}
            {badge}
          </>
        )}
      </div>
      {actions ? <div className="drama-panel-header-actions">{actions}</div> : null}
    </header>
  )
}

export interface WorkbenchToolButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string
  active?: boolean
}

export const WorkbenchToolButton = React.forwardRef<HTMLButtonElement, WorkbenchToolButtonProps>(function WorkbenchToolButton({
  active = false,
  className,
  icon,
  label,
  title,
  type = 'button',
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('drama-workbench-tool-button', className)}
      data-active={active ? 'true' : undefined}
      aria-pressed={active}
      title={title ?? label}
      {...props}
    >
      <span className="drama-workbench-tool-button-icon" aria-hidden="true">{icon}</span>
      <span className="drama-workbench-tool-button-label">{label}</span>
    </button>
  )
})
