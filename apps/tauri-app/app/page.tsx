"use client";

import { trpc } from "../trpc/client";

export default function Home() {
  const healthQuery = trpc.health.getHealth.useQuery();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="max-w-xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-xl shadow-slate-900/20">
        <h1 className="mb-4 text-3xl font-semibold">Tauri + tRPC</h1>
        <p className="mb-6 text-slate-400">
          This app is configured to call the shared API router from the monorepo.
        </p>
        <div className="space-y-3 rounded-2xl bg-slate-950/80 p-6 text-sm text-slate-300">
          <p>
            <span className="font-semibold">Health status:</span>{" "}
            {healthQuery.isLoading
              ? "Loading..."
              : healthQuery.data?.status ?? "Unable to reach API"}
          </p>
          {healthQuery.error && (
            <p className="text-red-400">{healthQuery.error.message}</p>
          )}
        </div>
      </div>
    </main>
  );
}