import { Activity, Download, Settings } from "lucide-react";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";

const shellItems = [
  { label: "All Tasks", value: "0" },
  { label: "Active", value: "0" },
  { label: "Completed", value: "0" },
  { label: "Failed", value: "0" },
];

export function App(): ReactElement {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-[240px_1fr]">
        <aside className="border-r bg-card px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Download aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold leading-none">Tide X</span>
              <span className="text-sm text-muted-foreground">
                Download manager
              </span>
            </div>
          </div>

          <nav className="mt-8 flex flex-col gap-1" aria-label="Task filters">
            {shellItems.map((item) => (
              <button
                className="flex h-9 cursor-pointer items-center justify-between rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={item.label}
                type="button"
              >
                <span>{item.label}</span>
                <span className="font-mono text-xs">{item.value}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="flex h-16 items-center justify-between border-b px-6">
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold leading-none">Tasks</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                aria2 runtime integration is ready for implementation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Settings data-icon="inline-start" aria-hidden="true" />
                Settings
              </Button>
              <Button size="sm">
                <Download data-icon="inline-start" aria-hidden="true" />
                Add Download
              </Button>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-[1fr_320px] gap-0">
            <div className="flex min-w-0 flex-col p-6">
              <div className="rounded-md border bg-card p-8 text-center">
                <Activity className="mx-auto text-muted-foreground" />
                <h2 className="mt-4 text-base font-medium">
                  No download tasks
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Add a URL, torrent file, Magnet link, or Metalink to start
                  building the task queue.
                </p>
              </div>
            </div>

            <aside className="border-l bg-card p-5">
              <h2 className="text-sm font-medium">Runtime</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The secure IPC surface is available. aria2 runtime services are
                implemented in the next task group.
              </p>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
