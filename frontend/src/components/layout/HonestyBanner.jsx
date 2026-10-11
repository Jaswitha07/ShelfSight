import React, { useState } from 'react';
import { Info, X, AlertTriangle } from 'lucide-react';

export default function HonestyBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900">
      <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-amber-800 uppercase tracking-wider text-[11px]">System Disclosure:</span>
            <span>(1) ShelfSight measures <strong>visible shelf stock only</strong> (not hidden rear stock).</span>
            <span className="hidden md:inline">•</span>
            <span>(2) <strong>Open-vocabulary YOLO-World</strong> needs zero training, but custom models yield higher precision on crowded shelves.</span>
            <span className="hidden lg:inline">•</span>
            <span>(3) Counts represent <strong>simultaneous visible units per camera frame</strong>, never a cumulative sum.</span>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-500 hover:text-amber-800 p-0.5 rounded transition shrink-0"
          title="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
