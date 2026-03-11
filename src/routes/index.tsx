import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  getTodayUpdates,
  getWeekUpdatesSummary,
  getMonthUpdatesSummary
} from "@/server/queries";
import { UpdateList } from "@/components/update-list";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/")({
  component: HomePage
});

function groupUpdatesByDate(updates: { id: string | number, created_at: Date | string }[]) {
  const grouped: Record<string, number> = {};
  for (const update of updates) {
    const d = new Date(update.created_at);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    grouped[dateStr] = (grouped[dateStr] || 0) + 1;
  }
  return grouped;
}

function getCurrentWeekDays() {
  const days = [];
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Monday as first day of week
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateNum = d.getDate();
    const isToday = d.toDateString() === new Date().toDateString();
    days.push({ dateStr, dayName, dateNum, isToday });
  }
  return days;
}

function getCurrentMonthDays() {
  const days = [];
  const curr = new Date();
  const year = curr.getFullYear();
  const month = curr.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Determine starting weekday (Monday = 0 for our grid alignment)
  const startWeekday = firstDay.getDay();
  const startDay = (startWeekday + 6) % 7;

  // Padding for beginning of month
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  // Days of month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateNum = d.getDate();
    const isToday = d.toDateString() === new Date().toDateString();
    days.push({ dateStr, dayName, dateNum, isToday });
  }

  // Padding for end of month to complete the row
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  return days;
}

function HomePage() {
  const todayQuery = useQuery({
    queryKey: ["updates", "today"],
    queryFn: () => getTodayUpdates()
  });

  const weekQuery = useQuery({
    queryKey: ["updates", "week", "summary"],
    queryFn: () => getWeekUpdatesSummary()
  });

  const monthQuery = useQuery({
    queryKey: ["updates", "month", "summary"],
    queryFn: () => getMonthUpdatesSummary()
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* Premium Hero Section */}
      <section className="relative w-full py-24 md:py-32 lg:py-48 overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-60 dark:opacity-30 pointer-events-none" />
        <div className="absolute top-40 -right-40 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] opacity-60 dark:opacity-30 pointer-events-none" />

        <div className="container relative z-10">
          <div className="flex flex-col items-center space-y-10 text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-md shadow-sm"
            >
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              The latest AI updates
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="space-y-6"
            >
              <h1 className="text-5xl font-heading font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1]">
                Your <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-indigo-400 to-purple-400">Daily Dose</span> of AI News
              </h1>
              <p className="mx-auto max-w-2xl text-muted-foreground md:text-xl/relaxed lg:text-2xl/relaxed leading-relaxed font-light">
                Catch up on the world's most important AI breakthroughs in 3 minutes or less. Stay ahead of the curve.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="container py-16 md:py-24 space-y-20">
        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-border/40 pb-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-heading font-bold tracking-tight">Today's Updates</h2>
              <p className="text-muted-foreground text-lg">The most important AI news from today.</p>
            </div>
          </div>
          <UpdateList
            updates={todayQuery.data ?? []}
            isLoading={todayQuery.isLoading}
          />
        </section>

        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-border/40 pb-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-heading font-bold tracking-tight">This Week</h2>
              <p className="text-muted-foreground text-lg">Catch up on what you missed this week.</p>
            </div>
          </div>

          {weekQuery.isLoading ? (
            <Skeleton className="w-full h-32 rounded-xl" />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4"
            >
              {getCurrentWeekDays().map((day, idx) => {
                const count = groupUpdatesByDate(weekQuery.data ?? [])[day.dateStr] || 0;
                return (
                  <motion.div
                    key={day.dateStr}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 + 0.2 }}
                  >
                    <Link
                      to="/date/$date"
                      params={{ date: day.dateStr }}
                      className={`flex flex-col items-center justify-center p-4 h-full rounded-xl border transition-all hover:shadow-md ${count > 0 ? 'bg-card hover:border-primary/50 cursor-pointer hover:-translate-y-1' : 'bg-muted/10 opacity-70 hover:opacity-100 cursor-pointer'} ${day.isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                    >
                      <span className="text-sm text-muted-foreground uppercase">{day.dayName}</span>
                      <span className="text-3xl font-bold mt-1">{day.dateNum}</span>
                      <span className={`text-xs font-medium mt-2 px-2 py-0.5 rounded-full ${count > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {count} {count === 1 ? 'update' : 'updates'}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>

        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-border/40 pb-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-heading font-bold tracking-tight">This Month</h2>
              <p className="text-muted-foreground text-lg">The biggest AI stories of the month.</p>
            </div>
          </div>

          {monthQuery.isLoading ? (
            <Skeleton className="w-full h-64 rounded-xl" />
          ) : (
            <div className="grid grid-cols-7 gap-3">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(dayName => (
                <div key={dayName} className="text-center font-semibold text-xs text-muted-foreground pb-2">{dayName}</div>
              ))}
              {getCurrentMonthDays().map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="p-3" />;
                const count = groupUpdatesByDate(monthQuery.data ?? [])[day.dateStr] || 0;
                return (
                  <Link
                    key={day.dateStr}
                    to="/date/$date"
                    params={{ date: day.dateStr }}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all hover:shadow-md ${count > 0 ? 'bg-card hover:border-primary/50 relative overflow-hidden cursor-pointer' : 'bg-muted/10 opacity-60 hover:opacity-100 cursor-pointer'} ${day.isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                  >
                    {count > 0 && <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/20" />}
                    <span className="text-lg font-bold">{day.dateNum}</span>
                    {count > 0 ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(var(--primary),0.8)]" title={`${count} updates`} />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-transparent mt-2 flex-shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

