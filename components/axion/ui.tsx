'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* ─── Button ─────────────────────────────────────────────────── */

const buttonVariants = cva(
  'group relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold tracking-tight transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-blue-600 text-white shadow-[0_1px_2px_rgba(37,99,235,0.4),0_8px_24px_-6px_rgba(37,99,235,0.5)] hover:bg-blue-500 hover:shadow-[0_2px_4px_rgba(37,99,235,0.4),0_12px_32px_-6px_rgba(37,99,235,0.6)] hover:-translate-y-0.5',
        secondary:
          'bg-white text-slate-900 ring-1 ring-inset ring-slate-200 shadow-sm hover:ring-slate-300 hover:bg-slate-50 hover:-translate-y-0.5',
        light:
          'bg-white text-blue-700 shadow-lg hover:bg-blue-50 hover:-translate-y-0.5',
        ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-7 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

type ButtonProps = {
  href?: string
  className?: string
  children: ReactNode
} & VariantProps<typeof buttonVariants> &
  Omit<ComponentProps<'button'>, 'className' | 'children'>

export function Button({ variant, size, href, className, children, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className)
  if (href) {
    return (
      <a
        href={href}
        className={classes}
        onClick={props.onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined}
      >
        {children}
      </a>
    )
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}

/* ─── Card ───────────────────────────────────────────────────── */

export function Card({
  className,
  children,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-24px_rgba(37,99,235,0.18)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/* ─── Badge ──────────────────────────────────────────────────── */

export function Badge({
  className,
  children,
  ...props
}: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-xs font-medium text-blue-700',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/* ─── Eyebrow label ──────────────────────────────────────────── */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'text-xs font-semibold uppercase tracking-[0.18em] text-blue-600',
        className
      )}
    >
      {children}
    </span>
  )
}
