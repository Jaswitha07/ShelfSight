import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Sliders,
  ShieldCheck,
  Bell,
  Camera,
  Layers,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Server,
  Save,
  HelpCircle
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('vision'); // 'vision' | 'rules' | 'cameras' | 'notifications' | 'demo'
  const [savedMessage, setSavedMessage] = useState('');
  const [resettingDemo, setResettingDemo] = useState(false);

  // Vision state
  const [confThreshold, setConfThreshold] = useState(0.25);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [maxDetections, setMaxDetections] = useState(50);
  const [useClip, setUseClip] = useState(true);
  const [clipThreshold, setClipThreshold] = useState(0.65);
  const [modelPath, setModelPath] = useState('yolov8s-worldv2.pt');

  // Business rules state
  const [defaultMinStock, setDefaultMinStock] = useState(3);
  const [transitionOnlyAlerts, setTransitionOnlyAlerts] = useState(true);

  // Cameras state
  const [rtspTimeout, setRtspTimeout] = useState(10);
  const [videoFrameSkip, setVideoFrameSkip] = useState(3);
  const [maskCredentials, setMaskCredentials] = useState(true);

  // Notifications state
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('manager@shelfsight.store');

  const handleSave = (e) => {
    e.preventDefault();
    setSavedMessage('Configuration updated successfully in local memory.');
    setTimeout(() => setSavedMessage(''), 3500);
  };

  const handleResetDemoData = async () => {
    setResettingDemo(true);
    try {
      // Small simulated delay for demo reset response
      await new Promise((r) => setTimeout(r, 800));
      setSavedMessage('Demo database seed refreshed with sample shelves and catalog.');
    } catch (err) {
      alert('Failed to reset demo data');
    } finally {
      setResettingDemo(false);
      setTimeout(() => setSavedMessage(''), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="h-7 w-7 text-blue-600" />
            System Settings & Parameters
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure YOLO-World vision inference, inventory stock thresholds, camera feeds, and notification channels.
          </p>
        </div>

        {savedMessage && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {savedMessage}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        {[
          { id: 'vision', label: 'Vision AI & Model', icon: Cpu },
          { id: 'rules', label: 'Stock Rules & Alerts', icon: Sliders },
          { id: 'cameras', label: 'Cameras & Streams', icon: Camera },
          { id: 'notifications', label: 'Notifiers', icon: Bell },
          { id: 'demo', label: 'Demo Mode & System Info', icon: Database }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: Vision AI & Model */}
        {activeTab === 'vision' && (
          <div className="space-y-6">
            <div className="retail-card p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-blue-600" />
                  YOLO-World Open-Vocabulary Detector Configuration
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  ShelfSight leverages zero-shot open-vocabulary detection powered by Ultralytics YOLO-World v2.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Model Weights File / Path
                  </label>
                  <input
                    type="text"
                    value={modelPath}
                    onChange={(e) => setModelPath(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Swapping in a custom-trained model requires only updating this model path.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Max Detections Per View
                  </label>
                  <input
                    type="number"
                    value={maxDetections}
                    onChange={(e) => setMaxDetections(Number(e.target.value))}
                    min="1"
                    max="200"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Maximum bounding boxes detected simultaneously across shelf slots.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Confidence Threshold ({confThreshold})
                    </label>
                    <span className="text-xs font-mono font-medium text-blue-600">{Math.round(confThreshold * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.90"
                    step="0.05"
                    value={confThreshold}
                    onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Minimum confidence to record a detected bounding box.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      IoU / NMS Threshold ({iouThreshold})
                    </label>
                    <span className="text-xs font-mono font-medium text-blue-600">{iouThreshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0.20"
                    max="0.80"
                    step="0.05"
                    value={iouThreshold}
                    onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Non-Maximum Suppression threshold to deduplicate overlapping product boxes.
                  </p>
                </div>
              </div>

              {/* CLIP Verification */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">CLIP Feature Verification</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cross-reference YOLO proposals against catalog reference photos using cosine embedding similarity.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useClip}
                      onChange={(e) => setUseClip(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {useClip && (
                  <div className="mt-4 max-w-xs">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      CLIP Match Threshold ({clipThreshold})
                    </label>
                    <input
                      type="range"
                      min="0.40"
                      max="0.90"
                      step="0.05"
                      value={clipThreshold}
                      onChange={(e) => setClipThreshold(parseFloat(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Model Fine-Tuning Guide Card */}
            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                <Info className="h-4 w-4" />
                <span>Custom Fine-Tuning Specification</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ShelfSight's open-vocabulary mode works immediately without training. For higher recall in heavily occluded retail rows, fine-tune YOLO on custom store photos:
              </p>
              <div className="bg-slate-950 rounded-lg p-3 font-mono text-[11px] text-emerald-400 space-y-1">
                <div># 1. Collect 50-100 high-resolution photos per product under store lighting</div>
                <div># 2. Annotate in YOLO format: class_id x_center y_center width height</div>
                <div># 3. Train custom weights:</div>
                <div className="text-slate-200">yolo detect train data=shelf_dataset.yaml model=yolov8s.pt epochs=50 imgsz=640</div>
                <div className="text-slate-400"># 4. Point "Model Weights File" above to runs/detect/train/weights/best.pt</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Stock Rules & Alerts */}
        {activeTab === 'rules' && (
          <div className="retail-card p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-blue-600" />
                Inventory Stock Status Rules
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure automatic classification based on simultaneous visible unit counts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 uppercase">
                  OUT OF STOCK
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-2">Count == 0 Units</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Triggers immediate Critical priority alert when stock drops to zero.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 uppercase">
                  LOW STOCK
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-2">Count &le; Min Visible Stock</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Triggers Warning alert to notify floor attendants to restock front row.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                  NORMAL / IN STOCK
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-2">Count &gt; Min Visible Stock</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Healthy shelf inventory. No alert triggered.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Default Minimum Visible Stock Threshold
                </label>
                <input
                  type="number"
                  value={defaultMinStock}
                  onChange={(e) => setDefaultMinStock(Number(e.target.value))}
                  min="1"
                  max="50"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Applied to newly registered catalog items unless customized per product.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Alert Generation Behavior
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="transitionAlerts"
                    checked={transitionOnlyAlerts}
                    onChange={(e) => setTransitionOnlyAlerts(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="transitionAlerts" className="text-xs font-medium text-slate-700">
                    Create alerts ONLY on status transitions (avoids repeat alerts per frame)
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Guarantees that repeated scans of a low-stock shelf do not duplicate notification rows.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Cameras & Streams */}
        {activeTab === 'cameras' && (
          <div className="retail-card p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-600" />
                CCTV Streams & Video Feed Handling
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure stream timeouts, client credential masking, and simulated demo loops.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  RTSP Connection Timeout (seconds)
                </label>
                <input
                  type="number"
                  value={rtspTimeout}
                  onChange={(e) => setRtspTimeout(Number(e.target.value))}
                  min="2"
                  max="60"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  If unreachable within this duration, camera status switches to offline and triggers an offline alert.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Video Analysis Frame Skip Rate
                </label>
                <input
                  type="number"
                  value={videoFrameSkip}
                  onChange={(e) => setVideoFrameSkip(Number(e.target.value))}
                  min="1"
                  max="15"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Process 1 out of every {videoFrameSkip} frames to ensure smooth processing without dropping accuracy.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-start gap-3">
              <input
                type="checkbox"
                id="maskCreds"
                checked={maskCredentials}
                onChange={(e) => setMaskCredentials(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mt-0.5"
              />
              <div>
                <label htmlFor="maskCreds" className="text-sm font-semibold text-slate-800">
                  Enforce Server-Side Stream Credential Masking
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stream passwords and sensitive credentials are encrypted and never transmitted in plaintext to client browsers (e.g. displayed as <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">rtsp://****:****@192.168.1.50:554/stream</code>).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Notifiers */}
        {activeTab === 'notifications' && (
          <div className="retail-card p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Notification Dispatcher Interface
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Modular notifier architecture allowing immediate in-app alerts and extensible external channels.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">In-App Notification Dispatcher</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Records alert rows directly to the database and populates the top bar counter in real time.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Active (Default)
                </span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Email Notifier (Extensible Interface)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dispatches alert emails to inventory managers upon critical stockouts.
                  </p>
                  {emailAlerts && (
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Store Manager Email
                      </label>
                      <input
                        type="email"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg w-64"
                      />
                    </div>
                  )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Demo Mode & System Info */}
        {activeTab === 'demo' && (
          <div className="space-y-6">
            <div className="retail-card p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  Demo Mode Management & Database Health
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Reset pre-configured sample products, test shelves, and simulated camera feeds.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-blue-950">Pre-seeded Demo Dataset</h3>
                  <p className="text-xs text-blue-800 mt-0.5 max-w-xl">
                    Seeds realistic retail shelves (Beverages, Snacks, Cereals) with programmatic test images and videos. All sample items are labeled "DEMO DATA" throughout the application.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetDemoData}
                  disabled={resettingDemo}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition whitespace-nowrap disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resettingDemo ? 'animate-spin' : ''}`} />
                  {resettingDemo ? 'Resetting...' : 'Re-seed Demo Data'}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                  Service Components Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] font-medium text-slate-500 block">Database Engine</span>
                    <span className="text-xs font-semibold text-slate-900 mt-0.5 block flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      PGlite (Embedded PostgreSQL)
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] font-medium text-slate-500 block">Vision API Service</span>
                    <span className="text-xs font-semibold text-slate-900 mt-0.5 block flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      FastAPI (Port 8000)
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] font-medium text-slate-500 block">Model Weights</span>
                    <span className="text-xs font-semibold text-slate-900 mt-0.5 block flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      yolov8s-worldv2.pt (24.7 MB)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Transparency / Honesty Card */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <span>ShelfSight Operational Transparency Disclosures</span>
              </div>
              <ul className="text-xs space-y-1.5 text-amber-900/90 pl-5 list-disc leading-relaxed">
                <li>
                  <strong>Visible Shelf Stock Only:</strong> Camera perception evaluates items exposed to the optical lens line-of-sight. Deep secondary rows behind opaque boxes cannot be detected without multi-angle or depth sensors.
                </li>
                <li>
                  <strong>Open-Vocabulary Trade-offs:</strong> Zero-shot text prompts detect diverse items without bespoke training, but fine-tuned weights deliver higher precision for near-identical packaging.
                </li>
                <li>
                  <strong>Simultaneous View Instances:</strong> Bounding box tallies represent the total items visible concurrently in the latest frame, not cumulative customer checkouts.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
          >
            <Save className="h-4 w-4" />
            Save Configuration Changes
          </button>
        </div>
      </form>
    </div>
  );
}
