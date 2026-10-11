import React, { useState, useEffect } from 'react';
import {
  Upload,
  Film,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Video,
  Clock,
  Gauge,
  Sliders,
  Eye,
  ClipboardList,
  FolderPlus,
  Check
} from 'lucide-react';
import { visionAPI, camerasAPI, shelvesAPI } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function VideoAnalysis() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedShelf, setSelectedShelf] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [videoTab, setVideoTab] = useState('visible-items'); // 'visible-items' | 'planogram'
  const [registeringItem, setRegisteringItem] = useState(null);
  const [registeredSuccess, setRegisteredSuccess] = useState({});

  const videoPresets = [
    {
      id: 'snack-video',
      name: 'Aisle 1: Snacks CCTV Video',
      subtitle: 'Red Chips, Blue Chips, Soda, Purple Dip (MP4)',
      url: '/uploads/demo/sample_shelf.mp4',
      icon: '🍿'
    },
    {
      id: 'beverage-video',
      name: 'Aisle 2: Beverage Cooler Video',
      subtitle: 'Lime Soda, Cola, Water Bottles (MP4)',
      url: '/uploads/demo/sample_beverage_shelf.mp4',
      icon: '🥤'
    },
    {
      id: 'grocery-video',
      name: 'Aisle 3: Cereals & Pantry Video',
      subtitle: 'Oat Cereal, Muesli, Pasta, Jars (MP4)',
      url: '/uploads/demo/sample_grocery_shelf.mp4',
      icon: '🥣'
    }
  ];

  useEffect(() => {
    async function loadMeta() {
      try {
        const [cRes, sRes] = await Promise.all([camerasAPI.list(), shelvesAPI.list()]);
        if (cRes.success && cRes.data.length > 0) {
          setCameras(cRes.data);
          setSelectedCamera(cRes.data[0].camera_id);
        }
        if (sRes.success && sRes.data.length > 0) {
          setShelves(sRes.data);
          setSelectedShelf(sRes.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load metadata', err);
      }
    }
    loadMeta();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setError('Video exceeds 100MB limit. Please upload a smaller video.');
        return;
      }
      setSelectedFile(file);
      setResults(null);
      setError(null);
    }
  };

  const handleLoadPresetVideo = async (preset) => {
    setError(null);
    try {
      const response = await fetch(preset.url);
      if (!response.ok) throw new Error(`Could not load video preset: ${preset.url}`);
      const blob = await response.blob();
      const filename = preset.url.split('/').pop() || 'sample_shelf.mp4';
      const file = new File([blob], filename, { type: 'video/mp4' });
      setSelectedFile(file);
      setResults(null);
    } catch (err) {
      setError(`Failed to load video preset "${preset.name}": ` + err.message);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select or upload a shelf video first.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      if (selectedCamera) formData.append('camera_id', selectedCamera);
      if (selectedShelf) formData.append('shelf_id', selectedShelf);

      const res = await visionAPI.analyzeVideo(formData);
      if (res.success && res.data) {
        setResults(res.data);
        setVideoTab('visible-items');
      } else {
        setError(res.error || 'Video analysis failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Vision pipeline error.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRegisterDetectedItem = async (item) => {
    setRegisteringItem(item.name);
    try {
      const payload = {
        name: item.name,
        category: item.category || 'General Retail',
        detection_prompt: item.name.toLowerCase(),
        min_visible_stock: 3,
        shelf_id: selectedShelf || null
      };

      const res = await visionAPI.registerItem(payload);
      if (res.success) {
        setRegisteredSuccess(prev => ({ ...prev, [item.name]: true }));
      } else {
        alert(res.error || 'Failed to register product');
      }
    } catch (err) {
      alert('Error registering item: ' + (err.response?.data?.error || err.message));
    } finally {
      setRegisteringItem(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Video Shelf Analysis & Tracking</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Frame-skipping object detection with persistent simultaneous count tracking
          </p>
        </div>

        {selectedFile && (
          <button
            onClick={() => { setSelectedFile(null); setResults(null); setError(null); }}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Clear Selected Video
          </button>
        )}
      </div>

      {/* Pre-Available Shelf Video Presets */}
      <div className="retail-card p-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 border border-blue-100">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Pre-Available Shelf Camera Videos (1-Click Test)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {videoPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleLoadPresetVideo(preset)}
              className="flex items-start gap-3 p-3 text-left rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition group"
            >
              <span className="text-2xl shrink-0 p-1 bg-slate-50 rounded-lg group-hover:scale-110 transition">
                {preset.icon}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition truncate">
                  {preset.name}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {preset.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Processing Error</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Upload and Configuration Form */}
      <div className="retail-card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Camera
            </label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {cameras.map((c) => (
                <option key={c.camera_id} value={c.camera_id}>
                  {c.camera_name} ({c.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Shelf
            </label>
            <select
              value={selectedShelf}
              onChange={(e) => setSelectedShelf(e.target.value)}
              className="w-full py-2 px-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {shelves.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.location})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !selectedFile}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Processing Video Frames...
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  Start Video Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Video Upload Dropzone */}
        <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center transition cursor-pointer relative bg-slate-50/50">
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center">
            <Upload className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {selectedFile ? selectedFile.name : 'Click or drag a shelf video to upload'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports MP4, WebM, AVI (Max 100MB)
            </p>
          </div>
        </div>
      </div>

      {/* Video Results Player & Tracking Summary */}
      {results && (
        <div className="space-y-6">
          {/* Tracking Diagnostics Bar */}
          {results.tracking_summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="retail-card p-4">
                <span className="text-xs text-slate-500 font-medium">Processed Frames</span>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {results.tracking_summary.processed_frames} / {results.tracking_summary.total_frames}
                </p>
              </div>

              <div className="retail-card p-4">
                <span className="text-xs text-slate-500 font-medium">Video FPS</span>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {results.tracking_summary.fps?.toFixed(1) || '25.0'} FPS
                </p>
              </div>

              <div className="retail-card p-4">
                <span className="text-xs text-slate-500 font-medium">Video Duration</span>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {results.tracking_summary.duration_seconds}s
                </p>
              </div>

              <div className="retail-card p-4">
                <span className="text-xs text-slate-500 font-medium">Counting Standard</span>
                <p className="text-xs font-semibold text-emerald-600 mt-1">
                  Peak Simultaneous Units
                </p>
              </div>
            </div>
          )}

          {/* Video Player */}
          {results.annotated_video && (
            <div className="retail-card p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Play className="h-4 w-4 text-blue-600" />
                  Processed Annotated Video Playback
                </h3>
                <span className="text-xs text-slate-500 font-mono">Annotated with YOLO-World Bounding Boxes</span>
              </div>

              <div className="rounded-xl overflow-hidden bg-slate-950 aspect-video max-h-[500px] flex items-center justify-center">
                <video
                  src={results.annotated_video}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Dual Tab Table */}
          <div className="retail-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVideoTab('visible-items')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs transition ${
                    videoTab === 'visible-items'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  Items Detected in Video ({results.visible_items?.length || 0})
                </button>
                <button
                  onClick={() => setVideoTab('planogram')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs transition ${
                    videoTab === 'planogram'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  Predefined Planogram Audit ({Object.keys(results.counts || {}).length})
                </button>
              </div>

              <span className="text-xs text-slate-500">
                Peak simultaneous instances detected in video
              </span>
            </div>

            {/* TAB 1: VISIBLE ITEMS */}
            {videoTab === 'visible-items' && (
              <div className="space-y-3">
                {(!results.visible_items || results.visible_items.length === 0) ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No distinct shelf items found in video frames.</p>
                ) : (
                  <div className="table-container">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Item Name</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Peak Visible Count</th>
                          <th className="py-2.5 px-3">Confidence</th>
                          <th className="py-2.5 px-3">Catalog Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {results.visible_items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3 font-semibold text-slate-900 text-sm">
                              {item.name}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                                {item.category || 'General Retail'}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 text-sm">
                              {item.count} units
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600">
                              {((item.confidence || 0.85) * 100).toFixed(1)}%
                            </td>
                            <td className="py-3 px-3">
                              {item.is_registered ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="h-3 w-3" />
                                  Monitored Product
                                </span>
                              ) : registeredSuccess[item.name] ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="h-3 w-3" />
                                  Added to Catalog!
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Eye className="h-3 w-3" />
                                  Seen in Video
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {!item.is_registered && !registeredSuccess[item.name] ? (
                                <button
                                  onClick={() => handleRegisterDetectedItem(item)}
                                  disabled={registeringItem === item.name}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition disabled:opacity-50"
                                >
                                  {registeringItem === item.name ? (
                                    <>
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                      Adding...
                                    </>
                                  ) : (
                                    <>
                                      <FolderPlus className="h-3.5 w-3.5" />
                                      + Monitor Item
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-mono">Active</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PLANOGRAM AUDIT */}
            {videoTab === 'planogram' && (
              <div className="table-container">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Simultaneous Visible Count</th>
                      <th className="py-2.5 px-3">Min Desired Stock</th>
                      <th className="py-2.5 px-3">Stock Status</th>
                      <th className="py-2.5 px-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(results.counts || {}).map(([productId, item]) => (
                      <tr key={productId} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 text-sm">
                          {item.count} units
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {item.min_visible_stock ?? 3} units
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge
                            status={
                              item.count === 0 ? 'OUT_OF_STOCK' :
                              item.count <= (item.min_visible_stock ?? 3) ? 'LOW_STOCK' : 'NORMAL'
                            }
                          />
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : '90.0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {results.alerts_created && results.alerts_created.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-rose-600 font-medium">
                <span>{results.alerts_created.length} stock transition alert(s) dispatched to store manager</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
