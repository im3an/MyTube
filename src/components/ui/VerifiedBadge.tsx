/**
 * Small verified badge for overlay on thumbnails and avatars.
 * Grey circular badge with white checkmark (YouTube-style).
 */
export function VerifiedBadge({
  size = 'sm',
  className = '',
}: {
  size?: 'xs' | 'sm' | 'md'
  className?: string
}) {
  const sizes = {
    xs: 'size-3.5',
    sm: 'size-4',
    md: 'size-5',
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gray-900/90 text-white ${sizes[size]} ${className}`}
      aria-label="Verified"
    >
      <svg
        viewBox="0 0 10 10"
        className="size-[55%]"
        fill="none"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.95829 3.68932C7.02509 3.58439 7.04747 3.45723 7.02051 3.3358C6.99356 3.21437 6.91946 3.10862 6.81454 3.04182C6.70961 2.97502 6.58245 2.95264 6.46102 2.97959C6.33959 3.00655 6.23384 3.08064 6.16704 3.18557L4.33141 6.06995L3.49141 5.01995C3.41375 4.92281 3.30069 4.8605 3.17709 4.84673C3.05349 4.83296 2.92949 4.86885 2.83235 4.94651C2.73522 5.02417 2.67291 5.13723 2.65914 5.26083C2.64536 5.38443 2.68125 5.50843 2.75891 5.60557L4.00891 7.16807C4.0555 7.22638 4.11533 7.27271 4.18344 7.30323C4.25154 7.33375 4.32595 7.34757 4.40047 7.34353C4.47499 7.3395 4.54747 7.31773 4.61188 7.28004C4.67629 7.24234 4.73077 7.18981 4.77079 7.12682L6.95829 3.68932Z"
          fill="currentColor"
        />
      </svg>
    </span>
  )
}
