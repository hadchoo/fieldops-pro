export const inputClassName = 'block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-3 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-500 aria-invalid:border-red-500'

export function buttonClassName(variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary') {
  const colors = {
    primary: 'border-transparent bg-teal-700 text-white shadow-xs hover:bg-teal-800',
    secondary: 'border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50',
    ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100',
    danger: 'border-transparent bg-red-600 text-white hover:bg-red-700',
  }
  return `inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${colors[variant]}`
}
