import { ChangesTable } from "@/components/changes/changes-table";
import { ChangeScheduleCalendar } from "@/components/changes/change-schedule-calendar";

export default function ChangesPage() {
  return (
    <main className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Change Management</h1>
        <p className="text-muted-foreground text-sm">
          Review scheduled and emergency changes. Approvals are Admin-only.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <ChangesTable />
        <ChangeScheduleCalendar />
      </div>
    </main>
  );
}
