import React, { useState } from 'react';
import { Eye, Info, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export function ShelfNotice() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-xl p-3.5 mb-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-sm">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              ShelfSight Inventory Monitoring Notice
              <span className="text-xs font-normal text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-300/60">
                Visible Stock Principle
              </span>
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              This system measures <strong>visible shelf-facing stock</strong> only. Items positioned behind front-facing merchandise or obscured by shelf fixtures are not counted.
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-white/60 transition-colors"
        >
          {expanded ? 'Hide principles' : 'Detection principles'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-emerald-200/60 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/70">
            <span className="font-semibold text-emerald-900 block mb-1">1. Simultaneous Visible Count</span>
            All unit counts reflect unique, simultaneously visible instances in the current shelf view. Video analysis does <strong>never</strong> sum detections cumulatively across frames.
          </div>
          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/70">
            <span className="font-semibold text-emerald-900 block mb-1">2. Open-Vocabulary Recognition</span>
            Uses YOLO-World to detect any describable product package zero-shot without training. Accuracy on dense shelves or look-alike items can be fine-tuned via stage 2 reference matching.
          </div>
          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/70">
            <span className="font-semibold text-emerald-900 block mb-1">3. Status Transition Alerts</span>
            Alerts are triggered strictly on status transitions into Low Stock or Out of Stock to prevent notification fatigue.
          </div>
        </div>
      )}
    </div>
  );
}
