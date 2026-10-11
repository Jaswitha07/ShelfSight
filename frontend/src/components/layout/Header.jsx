import React, { useState, useEffect } from 'react';
import { Menu, Bell, User, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { alertsAPI } from '../../services/api';
import { Link } from 'react-router-dom';

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    async function fetchAlertCount() {
      try {
        const res = await alertsAPI.list({ limit: 10 });
        if (res.stats) {
          setUnreadAlerts(parseInt(res.stats.new_count || '0', 10));
        }
      } catch (err) {
        // silent
      }
    }
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            aria-label="Toggle Navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              YOLO-World Active
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Zero-Shot Detection
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/alerts"
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            title="Alerts Center"
          >
            <Bell className="h-5 w-5" />
            {unreadAlerts > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </Link>

          <div className="h-5 w-px bg-slate-200"></div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs border border-blue-200">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name || 'Store Manager'}</p>
                <p className="text-[10px] text-slate-500 capitalize">{user?.role || 'Admin'}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
