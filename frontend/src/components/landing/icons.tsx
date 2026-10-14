import type { SVGProps } from 'react'

/**
 * ShopKart line icons: 24-unit grid, 1.5 stroke, round caps/joins, `currentColor`.
 * Drawn in-house so value props and categories share one consistent voice.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number }

function Icon({ size = 24, className, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  )
}

/* ——— Value props ——— */

export const TruckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 15.75h-.5A1.5 1.5 0 0 1 3 14.25v-7a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5v8.5" />
    <path d="M9 15.75h6" />
    <path d="M14 9.25h3.4a1.5 1.5 0 0 1 1.2.6l2.1 2.8a1.5 1.5 0 0 1 .3.9v.7a1.5 1.5 0 0 1-1.5 1.5H19" />
    <circle cx="7" cy="15.75" r="2" />
    <circle cx="17" cy="15.75" r="2" />
  </Icon>
)

export const RupeeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9.25" />
    <path d="M8.75 7.75h6.5" />
    <path d="M8.75 10.5h6.5" />
    <path d="M8.75 7.75h1.75a2.75 2.75 0 0 1 0 5.5H8.75l4.75 3.75" />
  </Icon>
)

export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 5.5c.55 3.85 2.65 5.95 6.5 6.5-3.85.55-5.95 2.65-6.5 6.5-.55-3.85-2.65-5.95-6.5-6.5 3.85-.55 5.95-2.65 6.5-6.5z" />
    <path d="M18.75 3.25v3.5M17 5h3.5" />
  </Icon>
)

export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.25l7 2.75v5.25c0 4.4-2.9 8.1-7 9.5-4.1-1.4-7-5.1-7-9.5V6z" />
    <path d="M9.25 12.1l2 2 3.75-4" />
  </Icon>
)

export const BoxIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.25l7.75 4.25v9L12 20.75 4.25 16.5v-9z" />
    <path d="M4.25 7.5L12 11.75l7.75-4.25" />
    <path d="M12 11.75v9" />
    <path d="M8.1 5.35l7.8 4.3" />
  </Icon>
)

export const LeafIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.75 18.25C5.75 9.9 10.4 5.25 18.75 5.25c0 8.35-4.65 13-13 13z" />
    <path d="M5.75 18.25L13 11" />
    <path d="M4 20l1.75-1.75" />
  </Icon>
)

/* ——— Categories ——— */

export const StickerIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.25 13.5V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25h7.5z" />
    <path d="M20.25 13.5h-4.5a2.25 2.25 0 0 0-2.25 2.25v4.5" />
  </Icon>
)

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19.25s-7.25-4.3-7.25-9.5A4 4 0 0 1 12 7.4a4 4 0 0 1 7.25 2.35c0 5.2-7.25 9.5-7.25 9.5z" />
    <path d="M7.9 10.1a1.9 1.9 0 0 1 1.6-1.6" />
  </Icon>
)

export const PenIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15.5 4.5l4 4L9 19l-4.75.75L5 15z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
)

export const PlantIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7.75 14.25h8.5l-1.1 5.1a1.1 1.1 0 0 1-1.08.9H9.93a1.1 1.1 0 0 1-1.08-.9z" />
    <path d="M12 14.25V9.5" />
    <path d="M12 11.25c0-2.75-1.6-4.5-4.5-4.5 0 2.75 1.6 4.5 4.5 4.5z" />
    <path d="M12 9.5c0-2.75 1.6-4.75 4.5-4.75 0 2.75-1.6 4.75-4.5 4.75z" />
  </Icon>
)

export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6.75" y="3" width="10.5" height="18" rx="2.5" />
    <path d="M10.75 17.75h2.5" />
  </Icon>
)

export const CandyIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4.25" />
    <path d="M7.75 12L4 8.75v6.5z" />
    <path d="M16.25 12L20 8.75v6.5z" />
    <path d="M10.5 8.1c.9 1.2 1.4 2.5 1.4 3.9s-.5 2.7-1.4 3.9" />
  </Icon>
)

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14" />
    <path d="M13.5 6.5L19 12l-5.5 5.5" />
  </Icon>
)

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Icon>
)
