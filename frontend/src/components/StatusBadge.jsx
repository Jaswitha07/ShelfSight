import React from 'react';

export function StatusBadge({ status, size = 'sm' }) {
  if (!status) return null;

  const s = String(status).toUpperCase();

  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status;

  if (s === 'NORMAL' || s === 'IN_STOCK' || s === 'IN STOCK' || s === 'ONLINE') {
    style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = s === 'ONLINE' ? 'Online' : 'In Stock';
  } else if (s === 'LOW_STOCK' || s === 'LOW STOCK') {
    style = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'Low Stock';
  } else if (s === 'OUT_OF_STOCK' || s === 'OUT OF STOCK') {
    style = 'bg-rose-50 text-rose-700 border-rose-200';
    label = 'Out of Stock';
  } else if (s === 'SIMULATED') {
    style = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    label = 'Simulated Stream';
  } else if (s === 'OFFLINE') {
    style = 'bg-slate-100 text-slate-600 border-slate-300';
    label = 'Offline';
  } else if (s === 'NEW') {
    style = 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse';
    label = 'New Alert';
  } else if (s === 'READ') {
    style = 'bg-blue-50 text-blue-700 border-blue-200';
    label = 'Read';
  } else if (s === 'RESOLVED') {
    style = 'bg-slate-50 text-slate-500 border-slate-200 line-through';
    label = 'Resolved';
  }

  const px = size === 'xs' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${px} ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        s === 'NORMAL' || s === 'ONLINE' ? 'bg-emerald-500' :
        s === 'LOW_STOCK' ? 'bg-amber-500' :
        s === 'OUT_OF_STOCK' || s === 'NEW' ? 'bg-rose-500' :
        s === 'SIMULATED' ? 'bg-indigo-500' : 'bg-slate-400'
      }`}></span>
      {label}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-100 text-violet-800 border border-violet-200 tracking-wide uppercase">
      Demo Data
    </span>
  );
}
