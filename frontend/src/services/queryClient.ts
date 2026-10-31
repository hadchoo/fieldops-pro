import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (count, error) => {
        const status = (error as { status?: number }).status
        return count < 1 && (!status || status >= 500)
      },
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
})
