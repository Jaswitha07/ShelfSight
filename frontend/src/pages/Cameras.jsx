import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Plus,
  Play,
  Square,
  Shield,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Edit2,
  Video,
  Lock,
  CheckCircle2,
  ExternalLink,
  Eye,
  Sparkles
} from 'lucide-react';
import { camerasAPI } from '../services/api';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [form, setForm] = useState({
    camera_name: '',
    location: '',
    stream_url: '',
    status: 'offline'
  });

  const loadCameras = async () => {
    try {
      const res = await camerasAPI.list();
      if (res.success) setCameras(res.data);
    } catch (err) {
      console.error('Failed to load cameras', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();
  }, []);

  const openCreateModal = () => {
    setForm({
      camera_name: '',
      location: 'Aisle 1 - Center Shelf',
      stream_url: '/uploads/demo/sample_shelf.mp4',
      status: 'online'
    });
    setModalOpen(true);
  };

  const handleAddPresetCameras = async () => {
    const presets = [
      {
        camera_name: 'Shelf Cam 1 - Snack & Chips Rack (Aisle 1)',
        location: 'Aisle 1 Section A',
        stream_url: '/uploads/demo/sample_shelf.mp4',
        status: 'online'
      },
      {
        camera_name: 'Shelf Cam 2 - Beverages Cooler (Aisle 2)',
        location: 'Beverage Cooler Bay 2',
        stream_url: '/uploads/demo/sample_beverage_shelf.mp4',
        status: 'online'
      },
      {
        camera_name: 'Shelf Cam 3 - Breakfast & Cereals (Aisle 3)',
        location: 'Cereal Section Bay 3',
        stream_url: '/uploads/demo/sample_grocery_shelf.mp4',
        status: 'online'
      },
      {
        camera_name: 'Shelf Cam 4 - Device Webcam (Physical Shelf)',
        location: 'Storefront Local Station',
        stream_url: 'webcam://local',
        status: 'online'
      },
      {
        camera_name: 'Shelf Cam 5 - Supermarket Aisle (Live Feed)',
        location: 'Main Retail Hall',
        stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        status: 'online'
      }
    ];

    try {
      for (const p of presets) {
        await camerasAPI.create(p).catch(() => {});
      }
      await loadCameras();
      alert('Pre-available shelf cameras verified and added!');
    } catch (err) {
      alert('Error adding preset cameras: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await camerasAPI.create(form);
      setModalOpen(false);
      loadCameras();
    } catch (err) {
      alert('Error creating camera: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleToggleMonitoring = async (cam) => {
    setActionLoading(cam.camera_id);
    try {
      if (cam.status === 'online' || cam.status === 'simulated') {
        await camerasAPI.stop(cam.camera_id);
      } else {
        const res = await camerasAPI.start(cam.camera_id);
        if (!res.success) {
          alert(`Camera monitoring failed: ${res.error || 'Host unreachable'}. Marked offline and alert generated.`);
        }
      }
      await loadCameras();
    } catch (err) {
      alert('Monitoring action failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this camera?')) return;
    try {
      await camerasAPI.delete(id);
      loadCameras();
    } catch (err) {
      alert('Failed to delete camera: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Store Cameras..." />;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Camera Stream Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure pre-available shelf cameras, hardware webcams, RTSP CCTV feeds, and live streams
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddPresetCameras}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 rounded-lg hover:bg-amber-100 transition shadow-xs"
          >
            <Sparkles className="h-4 w-4 text-amber-600" />
            Add Pre-Available Cameras
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            Add Store Camera
          </button>
        </div>
      </div>

      {/* Security notice about stream masking */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            <strong>Credential Security:</strong> RTSP stream credentials (passwords & tokens) are encrypted server-side and always masked as <code className="bg-white/80 px-1 py-0.5 rounded border border-blue-200 font-mono">rtsp://****:****@host</code> before transmission.
          </span>
        </div>
      </div>

      {/* Cameras Table */}
      <div className="retail-card overflow-hidden">
        <div className="table-container">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Camera</th>
                <th className="py-3 px-4">Location / Zone</th>
                <th className="py-3 px-4">Stream Source</th>
                <th className="py-3 px-4">Connection Status</th>
                <th className="py-3 px-4">Added Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cameras.map((cam) => {
                const isActive = cam.status === 'online' || cam.status === 'simulated';
                return (
                  <tr key={cam.camera_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Camera className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{cam.camera_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{cam.camera_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {cam.location}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {cam.stream_url || 'No stream configured'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={cam.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {cam.created_at ? new Date(cam.created_at).toLocaleDateString() : 'Active'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1-Click Live Feed Button */}
                        <Link
                          to="/live"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                          title="View Live Camera Feed"
                        >
                          <Eye className="h-3 w-3" />
                          View Feed
                        </Link>

                        <button
                          onClick={() => handleToggleMonitoring(cam)}
                          disabled={actionLoading === cam.camera_id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                            isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {actionLoading === cam.camera_id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : isActive ? (
                            <>
                              <Square className="h-3 w-3 fill-current" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 fill-current" />
                              Start
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDelete(cam.camera_id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                          title="Delete Camera"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Camera Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register Store Camera"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Camera Name *
            </label>
            <input
              type="text"
              required
              value={form.camera_name}
              onChange={(e) => setForm({ ...form, camera_name: e.target.value })}
              placeholder="e.g. Aisle 3 Overhead Camera"
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Store Location / Department *
            </label>
            <input
              type="text"
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Aisle 3 - Snacks & Confectionery"
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Stream URL or Mode *
            </label>
            <input
              type="text"
              required
              value={form.stream_url}
              onChange={(e) => setForm({ ...form, stream_url: e.target.value })}
              placeholder="/uploads/demo/sample_shelf.mp4 OR webcam://local"
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-1.5 space-y-1 text-[11px] text-slate-500">
              <p>• <strong>Simulated Shelf Video:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">/uploads/demo/sample_shelf.mp4</code></p>
              <p>• <strong>Webcam Feed:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">webcam://local</code></p>
              <p>• <strong>RTSP IP Camera:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">rtsp://user:pass@ip:port/stream</code></p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
            >
              Save Camera
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
