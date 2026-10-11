import React, { useState, useEffect } from 'react';
import {
  Boxes,
  History,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera,
  RefreshCw,
  Clock,
  Layers
} from 'lucide-react';
import { inventoryAPI } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'history'
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    try {
      const [invRes, histRes] = await Promise.all([
        inventoryAPI.list(),
        inventoryAPI.history({ limit: 100 })
      ]);
      if (invRes.success) setInventory(invRes.data);
      if (histRes.success) setHistory(histRes.data);
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCurrent = inventory.filter((item) => {
    const matchesSearch = item.product_name.toLowerCase().includes(search.toLowerCase()) ||
                          item.sku.toLowerCase().includes(search.toLowerCase()) ||
                          (item.shelf_name && item.shelf_name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || item.current_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredHistory = history.filter((item) => {
    return item.product_name.toLowerCase().includes(search.toLowerCase()) ||
           item.sku.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return <LoadingSpinner message="Loading Store Inventory Snapshots..." />;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shelf Inventory & History</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Current visible stock levels and complete historical audit trail per camera view
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
          Refresh Snapshots
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('current')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'current'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="h-4 w-4" />
          Current Visible Stock ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="h-4 w-4" />
          Observation History Log ({history.length})
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="retail-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, SKU, shelf..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {activeTab === 'current' && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">Status:</span>
            {['ALL', 'NORMAL', 'LOW_STOCK', 'OUT_OF_STOCK'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Items' : st === 'NORMAL' ? 'In Stock' : st === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Current Visible Inventory */}
      {activeTab === 'current' && (
        <div className="retail-card overflow-hidden">
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Visible Stock</th>
                  <th className="py-3 px-4">Min Threshold</th>
                  <th className="py-3 px-4">Inventory Status</th>
                  <th className="py-3 px-4">Shelf / Location</th>
                  <th className="py-3 px-4">Last Camera</th>
                  <th className="py-3 px-4 text-right">Last Observed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCurrent.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No inventory records match your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCurrent.map((item) => (
                    <tr key={item.product_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.product_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{item.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {item.category}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-bold text-slate-900">{item.current_count}</span>
                        <span className="text-slate-400 ml-1">visible</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.min_visible_stock} units
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={item.current_status} />
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.shelf_name || 'Shelf 1'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.camera_name || 'Upload/CCTV'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {item.last_detected_at
                          ? new Date(item.last_detected_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                          : 'Not observed yet'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Historical Snapshot Log */}
      {activeTab === 'history' && (
        <div className="retail-card overflow-hidden">
          <div className="table-container">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Snapshot ID</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Count</th>
                  <th className="py-3 px-4">Status Computed</th>
                  <th className="py-3 px-4">Camera Source</th>
                  <th className="py-3 px-4">Shelf</th>
                  <th className="py-3 px-4">Detection Confidence</th>
                  <th className="py-3 px-4 text-right">Observation Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No historical observations recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((snap) => (
                    <tr key={snap.snapshot_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {snap.snapshot_id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {snap.product_name}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {snap.detected_count} units
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={snap.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {snap.camera_name || snap.source_type}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {snap.shelf_name || 'Shelf 1'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {((snap.confidence || 0.9) * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(snap.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
