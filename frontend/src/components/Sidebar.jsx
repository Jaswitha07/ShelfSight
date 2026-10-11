import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  Image,
  Film,
  Package,
  Camera,
  Layers,
  Bell,
  Settings,
  Store,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/live', label: 'Live Monitoring', icon: Video, badge: 'Live' },
  { to: '/analysis/image', label: 'Image Analysis', icon: Image },
  { to: '/analysis/video', label: 'Video Analysis', icon: Film },
  { to: '/products', label: 'Products & Prompts', icon: Package },
  { to: '/cameras', label: 'Cameras & Feeds', icon: Camera },
  { to: '/inventory', label: 'Inventory & History', icon: Layers },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings & Tuning', icon: Settings },
];

export function Sidebar({ unreadAlertsCount = 0 }) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-slate-900 text-lg tracking-tight block">ShelfSight</span>
          <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider block">Retail Vision AI</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.to === '/alerts' && unreadAlertsCount > 0 ? (
                <span className="px-1.5 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full">
                  {unreadAlertsCount}
                </span>
              ) : item.badge ? (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Detector Engine</span>
          <span className="font-semibold text-slate-700">YOLO-World</span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
          <span>Ref Matcher</span>
          <span className="font-semibold text-emerald-600">CLIP ViT-B-32</span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
          <span>Database</span>
          <span className="font-semibold text-slate-700">PostgreSQL</span>
        </div>
      </div>
    </aside>
  );
}
