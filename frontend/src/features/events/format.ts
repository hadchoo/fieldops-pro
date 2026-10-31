const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatEventDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : dateTimeFormatter.format(date)
}

export const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

export const eventStatuses = ['planned', 'active', 'completed', 'cancelled'] as const

export function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).replaceAll('_', ' ')
}
