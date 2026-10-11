import React, { useState, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  SlidersHorizontal,
  Plus,
  Eye,
  ClipboardList,
  Tag,
  Check,
  PackageCheck,
  FolderPlus
} from 'lucide-react';
import { visionAPI, camerasAPI, shelvesAPI } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function ImageAnalysis() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedShelf, setSelectedShelf] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('annotated'); // 'original' | 'annotated' | 'side-by-side'
  const [inspectionTab, setInspectionTab] = useState('visible-items'); // 'visible-items' | 'planogram'
  const [registeringItem, setRegisteringItem] = useState(null);
  const [registeredSuccess, setRegisteredSuccess] = useState({});

  // Pre-available shelf presets
  const shelfPresets = [
    {
      id: 'snack-shelf',
      name: 'Aisle 1: Snacks & Chips Shelf',
      subtitle: 'Red Chips, Blue Chips, Soda, Purple Dip',
      url: '/uploads/demo/sample_shelf.jpg',
      icon: '🍿'
    },
    {
      id: 'beverage-shelf',
      name: 'Aisle 2: Beverage Cooler Shelf',
      subtitle: 'Lime Soda, Energy Drinks, Cola, Water',
      url: '/uploads/demo/sample_beverage_shelf.jpg',
      icon: '🥤'
    },
    {
      id: 'grocery-shelf',
      name: 'Aisle 3: Cereals & Pantry Shelf',
      subtitle: 'Honey Oat Cereal, Muesli, Pasta, Tomato Sauce',
      url: '/uploads/demo/sample_grocery_shelf.jpg',
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
      if (file.size > 10 * 1024 * 1024) {
        setError('File exceeds 10MB limit. Please upload an image under 10MB.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResults(null);
      setError(null);
    }
  };

  const handleLoadPreset = async (preset) => {
    setError(null);
    try {
      const response = await fetch(preset.url);
      if (!response.ok) throw new Error(`Could not load preset image: ${preset.url}`);
      const blob = await response.blob();
      const filename = preset.url.split('/').pop() || 'sample_shelf.jpg';
      const file = new File([blob], filename, { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreviewUrl(preset.url);
      setResults(null);
    } catch (err) {
      setError(`Failed to load preset "${preset.name}": ` + err.message);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select or upload an image first.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      if (selectedCamera) formData.append('camera_id', selectedCamera);
      if (selectedShelf) formData.append('shelf_id', selectedShelf);

      const res = await visionAPI.analyzeImage(formData);
      if (res.success && res.data) {
        setResults(res.data);
        // Default to visible items seen!
        setInspectionTab('visible-items');
      } else {
        setError(res.error || 'Image analysis failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Vision service error.');
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

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Image Shelf Detection</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Checks retail shelves dynamically according to all physically visible items
          </p>
        </div>

        {selectedFile && (
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Clear / Select New Image
          </button>
        )}
      </div>

      {/* Pre-Available Shelf Presets Bar */}
      <div className="retail-card p-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 border border-blue-100">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Pre-Available Shelf Cameras & Preset Images (1-Click Test)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {shelfPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleLoadPreset(preset)}
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
            <p className="font-semibold">Analysis Error</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Upload and Configuration Form */}
      <div className="retail-card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Source Camera
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
              Assigned Shelf
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
                  Inspecting Shelf Items...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" />
                  Analyze Shelf Image
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center transition cursor-pointer relative bg-slate-50/50">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center">
            <Upload className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {selectedFile ? selectedFile.name : 'Click or drag any shelf image to inspect'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports JPEG, PNG, WebP (Max 10MB) - Detects any visible retail shelf items
            </p>
          </div>
        </div>
      </div>

      {/* Visual Image Comparison Section */}
      {previewUrl && (
        <div className="retail-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">Visual Shelf Inspection Feed</h2>
            </div>

            {results && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setViewMode('annotated')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    viewMode === 'annotated' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Annotated Items
                </button>
                <button
                  onClick={() => setViewMode('original')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    viewMode === 'original' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setViewMode('side-by-side')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    viewMode === 'side-by-side' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Side-by-Side
                </button>
              </div>
            )}
          </div>

          {/* Image Display */}
          <div className="overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center p-2">
            {viewMode === 'side-by-side' && results?.annotated_image ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                <div className="relative">
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white rounded text-[11px] font-mono">Original Shelf</div>
                  <img src={previewUrl} alt="Original Shelf" className="w-full rounded object-contain max-h-[480px]" />
                </div>
                <div className="relative">
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600/90 text-white rounded text-[11px] font-mono">Annotated Visible Items</div>
                  <img src={results.annotated_image} alt="Annotated Shelf" className="w-full rounded object-contain max-h-[480px]" />
                </div>
              </div>
            ) : viewMode === 'annotated' && results?.annotated_image ? (
              <img src={results.annotated_image} alt="Annotated Shelf" className="w-full rounded object-contain max-h-[540px]" />
            ) : (
              <img src={previewUrl} alt="Shelf Preview" className="w-full rounded object-contain max-h-[540px]" />
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-between pt-2">
            <span>Detection: <strong>Zero-Shot YOLO-World Open-Vocabulary</strong></span>
            <span>Detects all physical units present on shelf</span>
          </div>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="space-y-4">
          {/* High-Level Shelf Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="retail-card p-4 border-l-4 border-l-blue-500">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Units Seen</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {results.total_items_seen || (results.visible_items?.reduce((s, i) => s + i.count, 0)) || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Physical units visible</p>
            </div>

            <div className="retail-card p-4 border-l-4 border-l-emerald-500">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distinct Item Types</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {results.visible_items?.length || Object.keys(results.counts || {}).length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Product classifications</p>
            </div>

            <div className="retail-card p-4 border-l-4 border-l-amber-500">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shelf Distribution</p>
              <p className="text-sm font-bold text-slate-800 mt-1">
                T: {results.shelf_summary?.shelf_levels?.top ?? '-'} | M: {results.shelf_summary?.shelf_levels?.middle ?? '-'} | B: {results.shelf_summary?.shelf_levels?.bottom ?? '-'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Top / Middle / Bottom</p>
            </div>

            <div className="retail-card p-4 border-l-4 border-l-indigo-500">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catalog Status</p>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {results.visible_items?.filter(i => i.is_registered).length || 0} Monitored / {results.visible_items?.filter(i => !i.is_registered).length || 0} New
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tracked vs newly seen</p>
            </div>
          </div>

          {/* Mode Switch Tabs: Visible Items Seen (Default) vs Predefined Planogram */}
          <div className="retail-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectionTab('visible-items')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs transition ${
                    inspectionTab === 'visible-items'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  Check According to Items Seen on Shelf ({results.visible_items?.length || 0})
                </button>
                <button
                  onClick={() => setInspectionTab('planogram')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs transition ${
                    inspectionTab === 'planogram'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  Predefined Planogram Audit ({Object.keys(results.counts || {}).length})
                </button>
              </div>

              <span className="text-xs text-slate-500">
                {inspectionTab === 'visible-items'
                  ? 'Showing all items identified directly from this shelf scene'
                  : 'Comparing against predefined database product list'}
              </span>
            </div>

            {/* TAB 1: ALL VISIBLE ITEMS SEEN ON THE SHELF */}
            {inspectionTab === 'visible-items' && (
              <div className="space-y-3">
                {(!results.visible_items || results.visible_items.length === 0) ? (
                  <div className="p-8 text-center text-slate-400">
                    <p className="text-sm">No items were detected on the shelf with sufficient confidence.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Item Seen on Shelf</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Visible Units</th>
                          <th className="py-2.5 px-3">Shelf Tier</th>
                          <th className="py-2.5 px-3">Confidence</th>
                          <th className="py-2.5 px-3">Catalog Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {results.visible_items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: item.color || '#3b82f6' }}
                                />
                                <span className="font-semibold text-slate-900 text-sm">
                                  {item.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                                {item.category || 'General Retail'}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 text-sm">
                              {item.count} units
                            </td>
                            <td className="py-3 px-3 text-slate-600 font-medium">
                              {item.shelf_level || 'Middle Shelf'}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600">
                              {((item.confidence || 0) * 100).toFixed(1)}%
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
                                  Newly Seen
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

            {/* TAB 2: PREDEFINED PLANOGRAM AUDIT */}
            {inspectionTab === 'planogram' && (
              <div className="table-container">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Catalog Product Name</th>
                      <th className="py-2.5 px-3">Simultaneous Count</th>
                      <th className="py-2.5 px-3">Min Desired Stock</th>
                      <th className="py-2.5 px-3">Inventory Status</th>
                      <th className="py-2.5 px-3">Confidence</th>
                      <th className="py-2.5 px-3">Boxes Visible</th>
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
                          {((item.confidence || 0) * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {item.boxes ? item.boxes.length : 0} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {results.snapshots && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  {results.snapshots.length} observation(s) saved to database history
                </span>
                {results.alerts_created && results.alerts_created.length > 0 && (
                  <span className="text-rose-600 font-medium">
                    {results.alerts_created.length} transition alert(s) generated
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
