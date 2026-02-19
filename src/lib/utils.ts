import { twMerge, twJoin } from 'tailwind-merge'

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(twJoin(inputs))
}
