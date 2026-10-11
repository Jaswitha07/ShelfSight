import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera,
  Check,
  RefreshCw,
  Clock,
  Eye,
  ShieldAlert
} from 'lucide-react';
import { alertsAPI } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'new' | 'read' | 'resolved'
  const [actionLoading, setActionLoading] = useState(null);

  const loadAlerts = async () => {
    try {
      const res = await alertsAPI.list({ status: statusFilter || undefined, limit: 100 });
      if (res.success) {
        setAlerts(res.data);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [statusFilter]);

  const handleMarkRead = async (id) => {
    setActionLoading(id);
    try {
      await alertsAPI.markRead(id);
      loadAlerts();
    } catch (err) {
      alert('Failed to mark alert as read');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (id) => {
    setActionLoading(id);
    try {
      await alertsAPI.markResolved(id);
      loadAlerts();
    } catch (err) {
      alert('Failed to resolve alert');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !stats) {
    return <LoadingSpinner message="Loading Store Stock Alerts..." />;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock & Hardware Alerts Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated alerts dispatched only on status transitions (LOW_STOCK, OUT_OF_STOCK, CAMERA_OFFLINE)
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
          Refresh Alerts
        </button>
      </div>

      {/* KPI Stats Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => setStatusFilter('')}
            className={`retail-card p-4 cursor-pointer transition ${statusFilter === '' ? 'ring-2 ring-blue-500 bg-blue-50/20' : ''}`}
          >
            <span className="text-xs text-slate-500 font-medium">Total Alerts</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total || 0}</p>
          </div>

          <div
            onClick={() => setStatusFilter('new')}
            className={`retail-card p-4 cursor-pointer transition ${statusFilter === 'new' ? 'ring-2 ring-rose-500 bg-rose-50/20' : ''}`}
          >
            <span className="text-xs text-rose-600 font-semibold">New / Unread</span>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.new_count || 0}</p>
          </div>

          <div
            onClick={() => setStatusFilter('read')}
            className={`retail-card p-4 cursor-pointer transition ${statusFilter === 'read' ? 'ring-2 ring-slate-500 bg-slate-50/20' : ''}`}
          >
            <span className="text-xs text-slate-500 font-medium">Read / In Review</span>
            <p className="text-2xl font-bold text-slate-700 mt-1">{stats.read_count || 0}</p>
          </div>

          <div
            onClick={() => setStatusFilter('resolved')}
            className={`retail-card p-4 cursor-pointer transition ${statusFilter === 'resolved' ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''}`}
          >
            <span className="text-xs text-emerald-600 font-semibold">Resolved</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.resolved_count || 0}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2">
        {[
          { label: 'All Alerts', val: '' },
          { label: 'New / Action Required', val: 'new' },
          { label: 'Read', val: 'read' },
          { label: 'Resolved History', val: 'resolved' },
        ].map((tab) => (
          <button
            key={tab.val}
            onClick={() => setStatusFilter(tab.val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === tab.val
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="retail-card p-12 text-center text-slate-400">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-base font-semibold text-slate-700">No alerts found</p>
            <p className="text-xs text-slate-400 mt-1">There are no active alerts in this category.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.alert_id}
              className={`retail-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${
                alert.status === 'new'
                  ? 'border-l-4 border-l-rose-500 bg-rose-50/20'
                  : alert.status === 'resolved'
                  ? 'opacity-70 bg-slate-50/50'
                  : ''
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={alert.type} size="sm" />
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    alert.status === 'new' ? 'bg-rose-100 text-rose-800' :
                    alert.status === 'read' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {alert.status}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {alert.product_name ? `${alert.product_name} (${alert.product_sku})` : alert.camera_name || 'System'}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-medium">
                  {alert.message}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                  <span>ID: {alert.alert_id}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                  {alert.camera_location && (
                    <span>Location: {alert.camera_location}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {alert.status === 'new' && (
                  <button
                    onClick={() => handleMarkRead(alert.alert_id)}
                    disabled={actionLoading === alert.alert_id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                    Mark Read
                  </button>
                )}

                {alert.status !== 'resolved' && (
                  <button
                    onClick={() => handleResolve(alert.alert_id)}
                    disabled={actionLoading === alert.alert_id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm shadow-emerald-500/20"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
