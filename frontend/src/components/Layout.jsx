import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ShelfNotice } from './ShelfNotice';
import { alertsApi } from '../utils/api';

export function Layout({ children }) {
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    async function fetchAlertStats() {
      try {
        const res = await alertsApi.list({ limit: 1 });
        if (res.stats) {
          setUnreadAlerts(parseInt(res.stats.new_count || '0', 10));
        }
      } catch (err) {
        // silent catch
      }
    }
    fetchAlertStats();
    const interval = setInterval(fetchAlertStats, 20000); // 20s refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <Sidebar unreadAlertsCount={unreadAlerts} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar unreadAlertsCount={unreadAlerts} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <ShelfNotice />
          {children}
        </main>
      </div>
    </div>
  );
}
