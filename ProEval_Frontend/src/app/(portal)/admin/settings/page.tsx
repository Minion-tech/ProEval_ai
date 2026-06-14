import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Admin Settings",
  description: "System-wide evaluation and policy settings",
};

export default function AdminSettingsPage() {
  return (
    <main className="container mx-auto px-4 py-8 md:px-6 md:py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Core thresholds and academic controls.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Evaluation Rules</CardTitle>
            <CardDescription>Editable defaults used across all evaluations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxTeamMembers">Max Team Members</Label>
                <Input id="maxTeamMembers" defaultValue="3" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="growthBonus">Growth Bonus Max</Label>
                <Input id="growthBonus" defaultValue="10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passThreshold">Pass Threshold</Label>
                <Input id="passThreshold" defaultValue="40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="distinctionThreshold">Distinction Threshold</Label>
                <Input id="distinctionThreshold" defaultValue="75" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year</Label>
                <Input id="academicYear" defaultValue="2025-2026" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Current Semester</Label>
                <Input id="semester" defaultValue="6" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button>Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
