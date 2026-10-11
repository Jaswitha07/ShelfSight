import React from 'react';

export default function StatusBadge({ status, size = 'md' }) {
  if (!status) return null;
  const normalized = status.toUpperCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status;

  if (normalized === 'NORMAL' || normalized === 'IN_STOCK' || normalized === 'ONLINE') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = normalized === 'ONLINE' ? 'Online' : 'In Stock';
  } else if (normalized === 'LOW_STOCK') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
    label = 'Low Stock';
  } else if (normalized === 'OUT_OF_STOCK' || normalized === 'OFFLINE') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
    label = normalized === 'OFFLINE' ? 'Offline' : 'Out of Stock';
  } else if (normalized === 'SIMULATED') {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
    label = 'Simulated Stream';
  } else if (normalized === 'NEW') {
    styles = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    label = 'New';
  } else if (normalized === 'READ') {
    styles = 'bg-slate-100 text-slate-700 border-slate-200';
    label = 'Read';
  } else if (normalized === 'RESOLVED') {
    styles = 'bg-emerald-50 text-emerald-600 border-emerald-200';
    label = 'Resolved';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${styles} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        normalized === 'NORMAL' || normalized === 'ONLINE' ? 'bg-emerald-500' :
        normalized === 'LOW_STOCK' ? 'bg-amber-500' :
        normalized === 'OUT_OF_STOCK' || normalized === 'OFFLINE' || normalized === 'NEW' ? 'bg-rose-500' :
        normalized === 'SIMULATED' ? 'bg-blue-500' : 'bg-slate-400'
      }`} />
      {label}
    </span>
  );
}
