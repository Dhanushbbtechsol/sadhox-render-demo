import { Can } from "@/components/auth/protected-route";
import { ChangesTable } from "@/components/changes/changes-table";
import { ChangeScheduleCalendar } from "@/components/changes/change-schedule-calendar";

export default function ChangesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Change requests</h1>
        <p className="text-muted-foreground text-sm">
          Request a change for review. Admin or the project Manager can approve
          or reject — there is no schedule or implement step.
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <ChangesTable />
        <Can roles={["Admin", "Agent", "Manager"]}>
          <ChangeScheduleCalendar />
        </Can>
      </div>
    </div>
  );
}
