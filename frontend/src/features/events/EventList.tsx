import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../components/ui'
import type { EventRecord } from '../../types/api'
import { formatEventDate } from './format'

export default function EventList({ events }: { events: EventRecord[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            to={`/events/${event.id}`}
            className="group flex items-start gap-4 rounded-xl px-4 py-5 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 sm:px-6"
          >
            <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 sm:flex" aria-hidden="true"><CalendarDays size={20} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h3 className="break-words font-semibold text-slate-900 group-hover:text-teal-700">{event.title}</h3>
                <StatusBadge status={event.status} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                <time dateTime={event.start_at}>{formatEventDate(event.start_at)}</time>
                <span className="px-1.5" aria-hidden="true">→</span>
                <time dateTime={event.end_at}>{formatEventDate(event.end_at)}</time>
              </p>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500"><MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="break-words">{event.location || 'Location to be confirmed'}</span></p>
            </div>
            <ArrowUpRight size={18} className="mt-1 shrink-0 text-slate-400 group-hover:text-teal-700" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
