import { Clock } from "lucide-react";

export default function SchedulesPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/50">
          <Clock className="h-5 w-5 text-neutral-600" />
        </div>
        <h2 className="text-base font-medium text-neutral-300">
          Schedule Manager
        </h2>
        <p className="mt-1 text-sm text-neutral-600">Coming in Phase 2</p>
      </div>
    </div>
  );
}
