import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin Reports",
  description: "Cohort analytics and export actions",
};

export default function AdminReportsPage() {
  return (
    <main className="container mx-auto px-4 py-8 md:px-6 md:py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cohort-level reports and export tasks.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Cohort Summary</CardTitle>
              <CardDescription>Institution-wide evaluation stats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span>Average Score</span>
                <span className="font-medium">74.8</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Completed Evaluations</span>
                <span className="font-medium">1,104</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Batch Export</CardTitle>
              <CardDescription>Generate semester report files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Export all evaluations for current semester in PDF format.</p>
              <Button className="w-full">Start Export</Button>
              <Button variant="outline" className="w-full">Check Export Status</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}