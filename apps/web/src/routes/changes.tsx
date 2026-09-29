import { ChangesTable } from "@/components/changes/changes-table";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Schedule calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar mode="single" selected={new Date("2026-09-28")} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
