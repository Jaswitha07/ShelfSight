import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Bell, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DemoBadge } from './StatusBadge';

export function Topbar({ unreadAlertsCount = 0 }) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Store Ops Active</span>
        </div>
        <div className="hidden sm:block h-4 w-px bg-slate-200"></div>
        <DemoBadge />
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Alert Bell */}
        <Link
          to="/alerts"
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="Alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
          )}
        </Link>

        {/* User dropdown & logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold text-xs border border-emerald-300">
            {user?.username ? user.username.slice(0, 2).toUpperCase() : 'SM'}
          </div>
          <div className="hidden md:block text-left">
            <span className="text-xs font-semibold text-slate-800 block leading-tight">{user?.username || 'Store Manager'}</span>
            <span className="text-[11px] text-slate-500 block leading-tight capitalize">{user?.role?.replace('_', ' ') || 'Store Manager'}</span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors ml-1"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
