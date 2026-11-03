import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

const baseField =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-400 transition disabled:bg-slate-50 disabled:text-slate-500'

type FieldShellProps = { label?: string; hint?: string; error?: string; required?: boolean; className?: string; children: ReactNode }

export function Field({ label, hint, error, required, className, children }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-red-600 font-medium mt-1">{error}</p>}
    </div>
  )
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        baseField,
        (hasError || invalid) && 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/30',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  hasError?: boolean
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, hasError, invalid, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        baseField,
        'pr-8',
        (hasError || invalid) && 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/30',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = 'Select'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  hasError?: boolean
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        baseField,
        'resize-y',
        (hasError || invalid) && 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/30',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md'
  loading?: boolean
  className?: string
  children: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>

const variants: Record<string, string> = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700 disabled:bg-teal-600/50',
  secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
  outline: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      // Default 'button' mencegah submit tak sengaja saat dipakai di dalam form.
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading && <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
      {children}
    </button>
  )
}

export function Spinner({ label = 'Memuat data...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
      <span className="w-6 h-6 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ title = 'Belum ada data', description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <div className="py-12 px-6 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl">◎</div>
      <p className="mt-3 font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message = 'Data tidak dapat dimuat. Silakan coba kembali.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="py-12 px-6 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 flex items-center justify-center text-red-500 text-xl">!</div>
      <p className="mt-3 font-medium text-slate-800">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Coba Lagi
        </Button>
      )}
    </div>
  )
}

export function AccessDeniedState({
  title = 'Akses ditolak',
  message = 'Anda tidak memiliki akses ke data atau halaman ini.',
  action,
}: {
  title?: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className="py-12 px-6 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 text-xl font-bold">
        !
      </div>
      <p className="mt-3 font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}