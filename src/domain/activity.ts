// Recent-activity feed for the dashboard, derived from what actually happened:
// trip timeline events and wallet transactions, newest first.
function when(date: string | undefined, time?: string) {
  if (!date || date === 'Today' || date === 'Just now') return Date.now();
  const stamp = Date.parse([date, time].filter(Boolean).join(' '));
  return Number.isNaN(stamp) ? Date.parse(date) || 0 : stamp;
}

function tripTone(item: ActivityTimelineItem) {
  if (item.state === 'cancelled') return 'var(--tk-danger)';
  if (item.title === 'Trip Completed') return 'var(--tk-success)';
  return 'var(--tk-blue)';
}

export function recentActivity({ trips = [], transactions = [] }: { trips?: ActivityTrip[]; transactions?: ActivityTransaction[] }, limit = 5) {
  const tripEvents = trips.flatMap((trip) => (trip.timeline || [])
    .filter((item) => item.state !== 'pending')
    .map((item) => ({
      id: `${trip.id}-${item.title}-${item.date}-${item.time}`,
      text: `${trip.id}: ${item.title}`,
      time: [item.date, item.time].filter(Boolean).join(' · '),
      at: when(item.date, item.time),
      tone: tripTone(item),
    })));
  const walletEvents = transactions.map((txn) => ({
    id: txn.id,
    text: txn.desc,
    time: txn.date,
    at: when(txn.date),
    tone: txn.amount >= 0 ? 'var(--tk-success)' : 'var(--tk-purple)',
  }));
  return [...tripEvents, ...walletEvents].sort((a, b) => b.at - a.at).slice(0, limit);
}

interface ActivityTimelineItem { title: string; state: string; date?: string; time?: string; }
interface ActivityTrip { id: string; timeline?: ActivityTimelineItem[]; }
interface ActivityTransaction { id: string; desc: string; date: string; amount: number; }
