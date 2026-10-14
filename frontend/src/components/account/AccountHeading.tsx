import type { ReactNode } from 'react'

export function AccountHeading({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[2rem] leading-[1.05] font-medium sm:text-[2.6rem]">{title}</h1>
        {sub ? <p className="mt-2 text-[15px] text-muted">{sub}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
