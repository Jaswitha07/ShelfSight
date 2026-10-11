import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({
  title = 'No items found',
  description = 'No records match the current filter or search criteria.',
  icon: Icon = PackageOpen,
  actionText,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
      <div className="p-3 bg-slate-50 text-slate-400 rounded-full mb-3 border border-slate-100">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
