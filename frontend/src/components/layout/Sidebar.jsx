import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  Camera,
  Image as ImageIcon,
  Film,
  Package,
  Boxes,
  Bell,
  Settings,
  ShieldCheck,
  X
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Live Monitoring', href: '/live', icon: Video },
  { name: 'Image Analysis', href: '/vision/image', icon: ImageIcon },
  { name: 'Video Analysis', href: '/vision/video', icon: Film },
  { name: 'Products Catalog', href: '/products', icon: Package },
  { name: 'Cameras', href: '/cameras', icon: Camera },
  { name: 'Inventory & History', href: '/inventory', icon: Boxes },
  { name: 'Alerts Center', href: '/alerts', icon: Bell },
  { name: 'System Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">ShelfSight</span>
              <span className="ml-1.5 text-[10px] uppercase font-semibold text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/60">
                AI Vision
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info badge */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Retail Shelf Monitor</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 leading-snug">
              Counts simultaneous visible units. No cloud APIs required.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
