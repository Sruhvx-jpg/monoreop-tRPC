import { AnalyticsDashboard } from "@repo/innjest/client";

export default function AnalyticsPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return <AnalyticsDashboard apiBase={apiBase} />;
}
