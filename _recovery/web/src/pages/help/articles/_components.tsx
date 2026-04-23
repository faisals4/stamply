import type { ComponentType, ReactNode } from 'react'

/**
 * Shared UI primitives for help-center articles.
 * Keeps article files short and visually consistent.
 */

export function Step({
  number,
  title,
  icon: Icon,
  children,
}: {
  number: number
  title: string
  icon: ComponentType<{ className?: string }>
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 bg-muted/50 px-6 py-4 border-b border-border/60">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {number}
        </span>
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 p-6 text-foreground/90">{children}</div>
    </section>
  )
}

export function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-lg bg-primary/5 border-s-4 border-primary p-4 text-sm text-foreground/80">
      {children}
    </div>
  )
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-lg bg-amber-500/5 border-s-4 border-amber-500 p-4 text-sm text-foreground/80">
      {children}
    </div>
  )
}

export function UILabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-sm font-semibold text-foreground">
      {children}
    </span>
  )
}

export function InlineButton({
  icon: Icon,
  children,
}: {
  icon?: ComponentType<{ className?: string }>
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  )
}

export function InfoChip({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-foreground/60">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

export function NoteCard({
  emoji,
  title,
  body,
}: {
  emoji: string
  title: string
  body: string
}) {
  return (
    <div className="rounded-lg border border-border/60 p-4 flex items-start gap-3">
      <span className="text-xl shrink-0">{emoji}</span>
      <div>
        <div className="text-sm font-bold text-foreground">{title}</div>
        <div className="text-sm text-foreground/70 mt-1">{body}</div>
      </div>
    </div>
  )
}

export function DetailBlock({
  icon: Icon,
  title,
  details,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  details: string[]
}) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground">{title}</span>
      </div>
      <ul className="list-disc ps-5 space-y-1 text-sm text-foreground/75">
        {details.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
    </div>
  )
}

export function Intro({
  children,
  chips,
}: {
  children: ReactNode
  chips?: ReactNode
}) {
  return (
    <div className="rounded-xl bg-primary/5 p-6 border border-primary/10">
      <p className="text-base text-foreground/80">{children}</p>
      {chips && <div className="mt-4 flex flex-wrap gap-3 text-xs">{chips}</div>}
    </div>
  )
}

export function MockUI({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="mt-4 rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden">
      <div className="bg-muted/60 px-4 py-2 border-b border-border/60">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export function IconRow({
  icon,
  title,
  desc,
}: {
  icon: ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </div>
  )
}
