import { notFound } from 'next/navigation'
import { EntryTerminal } from '@/components/terminal/EntryTerminal'
import { loadTerminalData, parseDayParam, resolveTerminal } from '@/lib/terminal'

// The employee-facing entry terminal. Deliberately outside the dashboard shell:
// no sidebar, no navigation, no money. One screen, opened from a personal link
// with no account and no password.
export const dynamic = 'force-dynamic'

export default async function TerminalPage({ params }: PageProps<'/[lang]/t/[token]'>) {
  const { token } = await params
  const session = await resolveTerminal(token)
  if (!session) notFound()

  const day = parseDayParam(null)
  const data = await loadTerminalData(session, day)

  return <EntryTerminal token={token} initial={data} />
}
