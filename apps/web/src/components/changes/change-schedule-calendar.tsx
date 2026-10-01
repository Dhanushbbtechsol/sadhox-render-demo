import { useMemo, useState } from "react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChanges } from "@/hooks/use-changes";
import type { ChangeRecord } from "@/types/api";
import { cn } from "@/lib/utils";

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function overlapsDay(change: ChangeRecord, day: Date) {
  if (!change.scheduledStart || !change.scheduledEnd) return false;
  const start = new Date(change.scheduledStart);
  const end = new Date(change.scheduledEnd);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return start <= dayEnd && end >= dayStart;
}

export function ChangeScheduleCalendar() {
  const { data = [], isLoading } = useChanges();
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const scheduledByDay = useMemo(() => {
    const map = new Map<string, ChangeRecord[]>();
    for (const change of data) {
      if (!change.scheduledStart) continue;
      const start = new Date(change.scheduledStart);
      const end = new Date(change.scheduledEnd || change.scheduledStart);
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const last = new Date(end);
      last.setHours(0, 0, 0, 0);
      while (cursor <= last) {
        const key = dayKey(cursor);
        const list = map.get(key) ?? [];
        list.push(change);
        map.set(key, list);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [data]);

  const selectedDayChanges = useMemo(() => {
    if (!selected) return [];
    return data.filter((change) => overlapsDay(change, selected));
  }, [data, selected]);

  return (
    <Card className="h-fit w-full shrink-0">
      <CardHeader>
        <CardTitle className="text-base">Maintenance calendar</CardTitle>
        <p className="text-muted-foreground text-xs">
          Days with scheduled windows are highlighted.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading schedule…</p>
        ) : (
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            className="w-full [--cell-size:--spacing(8)]"
            classNames={{
              root: "w-full",
            }}
            modifiers={{
              scheduled: (date) => scheduledByDay.has(dayKey(date)),
            }}
            modifiersClassNames={{
              scheduled: "bg-primary/15 font-semibold text-primary",
            }}
          />
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">
            {selected
              ? `Windows on ${selected.toLocaleDateString()}`
              : "Select a day"}
          </p>
          {!selectedDayChanges.length ? (
            <p className="text-muted-foreground text-xs">No maintenance windows.</p>
          ) : (
            <ul className="space-y-2">
              {selectedDayChanges.map((change) => (
                <li key={change.id}>
                  <Link
                    to={`/changes/${change.id}`}
                    className={cn(
                      "border-border/80 hover:bg-accent/50 block rounded-lg border px-3 py-2 transition-colors",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-medium leading-snug">
                        {change.title}
                      </span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {change.type}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">
                      {new Date(change.scheduledStart).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" – "}
                      {new Date(change.scheduledEnd).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
