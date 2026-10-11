import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera,
  Bell,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Video,
  Clock
} from 'lucide-react';
import { dashboardAPI, alertsAPI } from '../services/api';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await dashboardAPI.getSummary();
      if (res.success) {
        setData(res);
        setError(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickResolve = async (alertId) => {
    try {
      await alertsAPI.markResolved(alertId);
      fetchDashboard();
    } catch (err) {
      console.error('Failed to resolve alert', err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Store Dashboard..." />;
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
        <h3 className="font-semibold text-base">Error Loading Dashboard</h3>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { summary, statusDistribution, categoryBreakdown, timeline, recentAlerts, recentDetections } = data;

  const STATUS_COLORS = {
    'Normal / In Stock': '#10b981',
    'Low Stock': '#f59e0b',
    'Out of Stock': '#ef4444',
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Shelf Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time visible inventory and camera shelf monitoring metrics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboard();
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            Refresh Data
          </button>
          <Link
            to="/live"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
          >
            <Video className="h-3.5 w-3.5" />
            Open Live Camera
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Products"
          value={summary.totalProducts}
          icon={Package}
          color="slate"
        />
        <StatCard
          title="In Stock"
          value={summary.inStock}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Low Stock"
          value={summary.lowStock}
          icon={AlertTriangle}
          color="amber"
          alert={summary.lowStock > 0}
        />
        <StatCard
          title="Out of Stock"
          value={summary.outOfStock}
          icon={XCircle}
          color="rose"
          alert={summary.outOfStock > 0}
        />
        <StatCard
          title="Active Cameras"
          value={`${summary.activeCameras}/${summary.totalCameras}`}
          icon={Camera}
          color="blue"
        />
        <StatCard
          title="Open Alerts"
          value={summary.unresolvedAlerts}
          icon={Bell}
          color={summary.unresolvedAlerts > 0 ? 'rose' : 'slate'}
          alert={summary.unresolvedAlerts > 0}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Pie */}
        <div className="retail-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Inventory Status Distribution</h2>
            <span className="text-xs text-slate-400">Latest Snapshots</span>
          </div>

          <div className="h-64">
            {summary.totalProducts === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active products registered
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex justify-around pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">In Stock: {summary.inStock}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-600">Low: {summary.lowStock}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-600">Out: {summary.outOfStock}</span>
            </div>
          </div>
        </div>

        {/* Observations Activity Chart */}
        <div className="retail-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Detection & Stock Events Timeline</h2>
              <p className="text-xs text-slate-500">Visible units counted and stock alerts raised over time</p>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
              Automated Snapshots
            </span>
          </div>

          <div className="h-64">
            {timeline.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No detection history available yet. Run an Image or Video analysis.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time_bucket" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="total_visible_units" name="Visible Units" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="low_stock_events" name="Low Stock Alerts" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="out_of_stock_events" name="Out of Stock Alerts" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Alerts & Recent Detections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="retail-card p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-rose-500" />
              <h2 className="text-sm font-semibold text-slate-900">Recent Stock & Camera Alerts</h2>
            </div>
            <Link to="/alerts" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 max-h-72">
            {recentAlerts.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">All shelves healthy! No active alerts.</p>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.alert_id}
                  className="flex items-start justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={alert.type} size="sm" />
                      <span className="text-xs font-medium text-slate-800">{alert.product_name || alert.camera_name || 'System'}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-tight">{alert.message}</p>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  {alert.status !== 'resolved' && (
                    <button
                      onClick={() => handleQuickResolve(alert.alert_id)}
                      className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition shrink-0 ml-2"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Detections */}
        <div className="retail-card p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-slate-900">Latest Shelf Observations</h2>
            </div>
            <Link to="/inventory" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Inventory Log <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-3 flex-1 overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50/70 border-b border-slate-200/60">
                <tr>
                  <th className="py-2 px-2.5">Product</th>
                  <th className="py-2 px-2.5">Visible Count</th>
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5">Camera</th>
                  <th className="py-2 px-2.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDetections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No snapshots recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentDetections.map((det) => (
                    <tr key={det.snapshot_id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-2.5 font-medium text-slate-800">
                        {det.product_name}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-slate-900">
                        {det.detected_count} units
                      </td>
                      <td className="py-2 px-2.5">
                        <StatusBadge status={det.status} size="sm" />
                      </td>
                      <td className="py-2 px-2.5 text-slate-500">
                        {det.camera_name || 'Upload'}
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-400">
                        {new Date(det.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
