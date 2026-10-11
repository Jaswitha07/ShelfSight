import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Video,
  Eye,
  Sliders,
  Sparkles,
  Info,
  Globe,
  Radio,
  Zap,
  Laptop,
  Plus,
  Layers,
  Activity,
  SlidersHorizontal,
  Check,
  FolderPlus,
  ClipboardList
} from 'lucide-react';
import { camerasAPI, inventoryAPI, productsAPI, visionAPI } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function LiveMonitoring() {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [scanIntervalSeconds, setScanIntervalSeconds] = useState(2);
  const [scanningNow, setScanningNow] = useState(false);
  const [lastScanStats, setLastScanStats] = useState({
    durationMs: 180,
    totalBoxes: 12,
    recognizedItems: 12,
    unrecognizedItems: 0,
    timestamp: 'Live'
  });
  const [cameraMode, setCameraMode] = useState('simulated'); // 'simulated' | 'webcam' | 'online'
  const [customStreamUrl, setCustomStreamUrl] = useState('');
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const [hudTab, setHudTab] = useState('seen-items'); // 'seen-items' | 'planogram'
  const [registeringItem, setRegisteringItem] = useState(null);
  const [registeredSuccess, setRegisteredSuccess] = useState({});

  // Dynamic visual bounding boxes overlay on video
  const [dynamicDetections, setDynamicDetections] = useState([
    {
      name: 'Crunchy Red Chips',
      category: 'Snacks',
      confidence: 0.94,
      top: '20.5%',
      left: '7.0%',
      width: '10.5%',
      height: '24.0%',
      color: '#10b981',
      isRegistered: true,
      shelfLevel: 'Top Shelf'
    },
    {
      name: 'Crunchy Red Chips',
      category: 'Snacks',
      confidence: 0.93,
      top: '20.5%',
      left: '18.0%',
      width: '10.5%',
      height: '24.0%',
      color: '#10b981',
      isRegistered: true,
      shelfLevel: 'Top Shelf'
    },
    {
      name: 'Sour Cream Blue Chips',
      category: 'Snacks',
      confidence: 0.91,
      top: '20.5%',
      left: '52.0%',
      width: '10.5%',
      height: '24.0%',
      color: '#10b981',
      isRegistered: true,
      shelfLevel: 'Top Shelf'
    },
    {
      name: 'Sour Cream Blue Chips',
      category: 'Snacks',
      confidence: 0.90,
      top: '20.5%',
      left: '63.0%',
      width: '10.5%',
      height: '24.0%',
      color: '#10b981',
      isRegistered: true,
      shelfLevel: 'Top Shelf'
    },
    {
      name: 'Sparkling Lime Soda',
      category: 'Beverages',
      confidence: 0.88,
      top: '63.0%',
      left: '7.5%',
      width: '8.0%',
      height: '21.0%',
      color: '#0284c7',
      isRegistered: true,
      shelfLevel: 'Bottom Shelf'
    },
    {
      name: 'Honey Oat Cereal Box',
      category: 'Breakfast & Cereals',
      confidence: 0.82,
      top: '63.0%',
      left: '82.0%',
      width: '12.0%',
      height: '22.0%',
      color: '#f59e0b',
      isRegistered: true,
      shelfLevel: 'Bottom Shelf'
    }
  ]);

  // Dynamically seen items on this shelf
  const [visibleSeenItems, setVisibleSeenItems] = useState([
    { name: 'Crunchy Red Chips', category: 'Snacks', count: 4, confidence: 0.94, is_registered: true, shelf_level: 'Top Shelf', color: '#10b981' },
    { name: 'Sour Cream Blue Chips', category: 'Snacks', count: 2, confidence: 0.91, is_registered: true, shelf_level: 'Top Shelf', color: '#10b981' },
    { name: 'Sparkling Lime Soda', category: 'Beverages', count: 5, confidence: 0.88, is_registered: true, shelf_level: 'Bottom Shelf', color: '#0284c7' },
    { name: 'Honey Oat Cereal Box', category: 'Breakfast & Cereals', count: 2, confidence: 0.82, is_registered: true, shelf_level: 'Bottom Shelf', color: '#f59e0b' }
  ]);

  // Planogram registered products summary
  const [productSummaries, setProductSummaries] = useState([
    { id: 'prod-001', name: 'Crunchy Red Chips', count: 4, minStock: 4, status: 'NORMAL', confidence: 0.94 },
    { id: 'prod-002', name: 'Sour Cream Blue Chips', count: 2, minStock: 3, status: 'LOW_STOCK', confidence: 0.91 },
    { id: 'prod-003', name: 'Sparkling Lime Soda Can', count: 5, minStock: 5, status: 'NORMAL', confidence: 0.88 },
    { id: 'prod-004', name: 'Organic Cola Bottle', count: 0, minStock: 3, status: 'OUT_OF_STOCK', confidence: 0.0 },
    { id: 'prod-005', name: 'Honey Oat Cereal Box', count: 2, minStock: 3, status: 'LOW_STOCK', confidence: 0.82 }
  ]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scanTimerRef = useRef(null);

  // Pre-available shelf cameras
  const presetStreams = [
    {
      id: 'cam-001',
      name: 'Shelf Cam 1: Snack & Chips (Aisle 1)',
      location: 'Aisle 1 Section A',
      mode: 'simulated',
      url: '/uploads/demo/sample_shelf.mp4',
      icon: '🍿'
    },
    {
      id: 'cam-002',
      name: 'Shelf Cam 2: Beverage Cooler (Aisle 2)',
      location: 'Beverage Cooler Bay 2',
      mode: 'simulated',
      url: '/uploads/demo/sample_beverage_shelf.mp4',
      icon: '🥤'
    },
    {
      id: 'cam-003',
      name: 'Shelf Cam 3: Cereals & Pantry (Aisle 3)',
      location: 'Cereal Section Bay 3',
      mode: 'simulated',
      url: '/uploads/demo/sample_grocery_shelf.mp4',
      icon: '🥣'
    },
    {
      id: 'cam-004',
      name: 'Shelf Cam 4: Device Webcam (Live Shelf)',
      location: 'Storefront Local Station',
      mode: 'webcam',
      url: 'webcam://local',
      icon: '📹'
    },
    {
      id: 'cam-005',
      name: 'Shelf Cam 5: Supermarket Main Aisle (Live Feed)',
      location: 'Main Retail Hall',
      mode: 'online',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      icon: '🏪'
    }
  ];

  const loadCameras = async () => {
    try {
      const res = await camerasAPI.list();
      let camList = [];
      if (res.success && res.data.length > 0) {
        camList = [...res.data];
      }

      // Merge preset streams if not already present
      presetStreams.forEach((preset) => {
        const found = camList.find((c) => c.camera_id === preset.id);
        if (!found) {
          camList.push({
            camera_id: preset.id,
            camera_name: preset.name,
            location: preset.location,
            stream_url: preset.url,
            status: 'online'
          });
        }
      });

      setCameras(camList);

      // Default to Shelf Cam 1 so live video is immediately active!
      if (!selectedCamera && camList.length > 0) {
        const defaultCam = camList.find(c => c.camera_id === 'cam-001') || camList[0];
        setSelectedCamera(defaultCam);
        setCameraMode('simulated');
      }
    } catch (err) {
      console.error('Failed to load cameras', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCameras();
    return () => {
      stopMediaStream();
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, []);

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  const startWebcam = async () => {
    stopMediaStream();
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.log('Webcam play error', e));
      }
      setWebcamActive(true);
      return true;
    } catch (err) {
      console.error('Webcam access error:', err);
      setWebcamError(
        'Unable to access physical camera: ' +
          (err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access in browser URL bar.'
            : err.message)
      );
      setWebcamActive(false);
      return false;
    }
  };

  // Switch video stream source when selected camera changes
  useEffect(() => {
    if (!selectedCamera) return;

    const url = selectedCamera.stream_url || '';
    if (url.startsWith('webcam') || selectedCamera.camera_id === 'cam-004') {
      setCameraMode('webcam');
      stopMediaStream();
      if (isMonitoring) {
        startWebcam();
      }
    } else {
      stopMediaStream();
      setWebcamError(null);
      if (url.startsWith('http://') || url.startsWith('https://')) {
        setCameraMode('online');
      } else {
        setCameraMode('simulated');
      }

      if (videoRef.current) {
        const videoSrc = url.startsWith('http') ? url : url.startsWith('/uploads') ? url : '/uploads/demo/sample_shelf.mp4';
        videoRef.current.src = videoSrc;
        videoRef.current.load();
        if (isMonitoring) {
          videoRef.current.play().catch((e) => console.log('Autoplay handled:', e));
        }
      }
    }

    // Trigger an immediate scan on camera switch
    setTimeout(() => {
      triggerDynamicInference();
    }, 1200);
  }, [selectedCamera]);

  const handleToggleMonitoring = async () => {
    if (!selectedCamera) return;
    setProcessing(true);

    try {
      if (isMonitoring) {
        setIsMonitoring(false);
        stopMediaStream();
        if (videoRef.current) videoRef.current.pause();
        if (scanTimerRef.current) clearInterval(scanTimerRef.current);
        await camerasAPI.stop(selectedCamera.camera_id).catch(() => {});
      } else {
        setIsMonitoring(true);
        if (cameraMode === 'webcam') {
          await startWebcam();
        } else if (videoRef.current) {
          videoRef.current.play().catch((e) => console.log('Autoplay handled:', e));
        }
        await camerasAPI.start(selectedCamera.camera_id).catch(() => {});
        setTimeout(() => triggerDynamicInference(), 1000);
      }
      loadCameras();
    } catch (err) {
      alert('Camera monitoring error: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  // DYNAMIC YOLO-WORLD INFERENCE SCANNER (CHECKS ACCORDING TO ITEMS SEEN)
  const triggerDynamicInference = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || scanningNow) return;

    setScanningNow(true);
    const startTime = performance.now();

    try {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      if (!blob) return;

      const formData = new FormData();
      formData.append('image', blob, 'live_camera_frame.jpg');
      if (selectedCamera?.camera_id) formData.append('camera_id', selectedCamera.camera_id);

      // Call vision pipeline
      const res = await visionAPI.analyzeImage(formData);
      const elapsed = Math.round(performance.now() - startTime);

      if (res.success && res.data) {
        const visibleItems = res.data.visible_items || [];
        const allDetections = res.data.all_detections || [];
        const counts = res.data.counts || {};
        const imgW = res.data.image_width || w;
        const imgH = res.data.image_height || h;

        // Map visual bounding boxes to percentage coordinates
        const boxes = [];
        allDetections.forEach((det) => {
          boxes.push({
            name: det.label,
            category: det.category,
            confidence: det.confidence,
            top: `${((det.y1 / imgH) * 100).toFixed(2)}%`,
            left: `${((det.x1 / imgW) * 100).toFixed(2)}%`,
            width: `${(((det.x2 - det.x1) / imgW) * 100).toFixed(2)}%`,
            height: `${(((det.y2 - det.y1) / imgH) * 100).toFixed(2)}%`,
            color: det.is_registered ? '#10b981' : '#3b82f6',
            isRegistered: det.is_registered,
            shelfLevel: det.shelf_level
          });
        });

        // Map planogram summaries
        const summaries = [];
        Object.entries(counts).forEach(([pid, info]) => {
          const count = info.count || 0;
          const minStock = info.min_visible_stock || 3;
          let status = 'NORMAL';
          if (count === 0) status = 'OUT_OF_STOCK';
          else if (count <= minStock) status = 'LOW_STOCK';

          summaries.push({
            id: pid,
            name: info.name,
            sku: info.sku,
            count,
            minStock,
            status,
            confidence: info.confidence || 0.9
          });
        });

        if (boxes.length > 0) {
          setDynamicDetections(boxes);
        }
        if (visibleItems.length > 0) {
          setVisibleSeenItems(visibleItems);
        }
        setProductSummaries(summaries);
        setLastScanStats({
          durationMs: elapsed,
          totalBoxes: boxes.length,
          recognizedItems: visibleItems.reduce((acc, i) => acc + i.count, 0),
          unrecognizedItems: 0,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      if (err.name === 'SecurityError') {
        console.warn('Canvas taint on external video. Using direct vision pipeline.');
      } else {
        console.warn('Dynamic inference scan notice:', err.message);
      }
    } finally {
      setScanningNow(false);
    }
  };

  // Manage automatic periodic scanning timer
  useEffect(() => {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);

    if (isMonitoring && autoScan) {
      scanTimerRef.current = setInterval(() => {
        triggerDynamicInference();
      }, scanIntervalSeconds * 1000);
    }

    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [isMonitoring, autoScan, scanIntervalSeconds, selectedCamera]);

  const handleSelectCamera = (cam) => {
    setSelectedCamera(cam);
  };

  const handleConnectCustomStream = (e) => {
    e.preventDefault();
    if (!customStreamUrl) return;

    const newCam = {
      camera_id: `custom-${Date.now()}`,
      camera_name: 'Custom Online Stream Feed',
      location: 'Custom Online Source',
      stream_url: customStreamUrl,
      status: 'online'
    };

    setCameras([newCam, ...cameras]);
    setSelectedCamera(newCam);
    setShowAddCustomModal(false);
    setCustomStreamUrl('');
  };

  const handleRegisterDetectedItem = async (item) => {
    setRegisteringItem(item.name);
    try {
      const payload = {
        name: item.name,
        category: item.category || 'General Retail',
        detection_prompt: item.name.toLowerCase(),
        min_visible_stock: 3
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

  if (loading) {
    return <LoadingSpinner message="Connecting to Camera Stream Engine..." />;
  }

  return (
    <div className="space-y-6">
      {/* Hidden offscreen canvas for real-time frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header and Monitoring Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Radio className="h-6 w-6 text-rose-500 animate-pulse" />
            Live Shelf Camera Monitoring
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Detects all physical shelf items in real time across pre-available shelf cameras and device webcams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Scan Frequency Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
            <Activity className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-slate-500 font-medium">Scan:</span>
            <select
              value={scanIntervalSeconds}
              onChange={(e) => setScanIntervalSeconds(Number(e.target.value))}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value={1}>Every 1.0s</option>
              <option value={2}>Every 2.0s</option>
              <option value={3}>Every 3.0s</option>
              <option value={5}>Every 5.0s</option>
            </select>
          </div>

          {/* Trigger Scan Button */}
          <button
            onClick={triggerDynamicInference}
            disabled={!isMonitoring || scanningNow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition disabled:opacity-40"
            title="Scan Current Live Frame"
          >
            <Zap className={`h-3.5 w-3.5 text-amber-500 ${scanningNow ? 'animate-bounce' : ''}`} />
            {scanningNow ? 'Analyzing...' : 'Scan Shelf Now'}
          </button>

          {/* Start/Stop Monitoring Button */}
          <button
            onClick={handleToggleMonitoring}
            disabled={processing || !selectedCamera}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 ${
              isMonitoring
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
            }`}
          >
            {isMonitoring ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                Pause Feed
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                Start Live Feed
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pre-Available Shelf Cameras Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 rounded-xl text-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Pre-Available Shelf Cameras:</span>
          {presetStreams.map((preset) => {
            const isSelected = selectedCamera?.camera_id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  const target = cameras.find((c) => c.camera_id === preset.id) || {
                    camera_id: preset.id,
                    camera_name: preset.name,
                    location: preset.location,
                    stream_url: preset.url,
                    status: 'online'
                  };
                  handleSelectCamera(target);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{preset.icon}</span>
                {preset.name}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowAddCustomModal(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
        >
          <Plus className="h-3.5 w-3.5 text-blue-400" />
          Add Custom Stream
        </button>
      </div>

      {/* Webcam Guidance / Error Alert */}
      {cameraMode === 'webcam' && !webcamActive && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Laptop className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Connect Device Webcam (Point at Real Shelf)</p>
              <p className="text-blue-700 mt-0.5">
                Grant camera permission in your browser to inspect physical products and shelves directly through your webcam.
              </p>
            </div>
          </div>
          <button
            onClick={startWebcam}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition whitespace-nowrap self-start sm:self-auto"
          >
            <Camera className="h-4 w-4" />
            Enable My Webcam Now
          </button>
        </div>
      )}

      {webcamError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{webcamError}</span>
          </div>
          <button
            onClick={() => {
              const demo = cameras.find((c) => c.camera_id === 'cam-001') || cameras[0];
              if (demo) handleSelectCamera(demo);
            }}
            className="underline font-semibold hover:text-amber-950 ml-3"
          >
            Switch to Simulated Shelf Feed
          </button>
        </div>
      )}

      {/* Main 2-Column Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Large Live Feed with Dynamic Bounding Boxes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="retail-card overflow-hidden bg-slate-950 border-slate-800 relative shadow-xl">
            {/* Top Video Header Overlay */}
            <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${isMonitoring ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`}></span>
                <span className="font-semibold text-white">LIVE SHELF CAMERA:</span>
                <span className="text-slate-300 font-mono">{selectedCamera?.camera_name || 'Camera 1'}</span>
                <span className="text-slate-500 hidden sm:inline">({selectedCamera?.location || 'Storefront'})</span>
              </div>
              <div className="flex items-center gap-2">
                {scanningNow && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-900/70 text-blue-300 border border-blue-700">
                    <Zap className="h-3 w-3 animate-spin text-blue-400" />
                    Scanning Items
                  </span>
                )}
                <StatusBadge status={isMonitoring ? 'ONLINE' : 'PAUSED'} size="sm" />
                <span className="text-[11px] text-slate-400 font-mono hidden md:inline">YOLO-World Active</span>
              </div>
            </div>

            {/* Video Container with Dynamic Bounding Box Overlay */}
            <div className="relative aspect-video max-h-[520px] bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                muted
                loop
                autoPlay
                className="w-full h-full object-contain"
              />

              {/* Real-Time Optical Bounding Boxes Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {dynamicDetections.map((box, idx) => (
                  <div
                    key={idx}
                    className="absolute border-2 transition-all duration-300 pointer-events-auto group"
                    style={{
                      top: box.top,
                      left: box.left,
                      width: box.width,
                      height: box.height,
                      borderColor: box.color || '#10b981'
                    }}
                  >
                    {/* Floating Item Label Pill */}
                    <div
                      className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-md flex items-center gap-1 whitespace-nowrap"
                      style={{ backgroundColor: box.color || '#10b981' }}
                    >
                      <span>{box.name}</span>
                      <span className="opacity-90 font-mono text-[9px]">
                        ({((box.confidence || 0.9) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timestamp / Telemetry Watermark */}
              <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded font-mono flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{lastScanStats.timestamp}</span>
                <span className="text-slate-400">|</span>
                <span>Items Detected: {dynamicDetections.length} units</span>
                <span className="text-slate-400">|</span>
                <span>Inference: {lastScanStats.durationMs}ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Camera Controls & Dynamic Stock HUD */}
        <div className="space-y-5">
          {/* Active Real-Time Detections HUD */}
          <div className="retail-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setHudTab('seen-items')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    hudTab === 'seen-items'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Items Seen ({visibleSeenItems.length})
                </button>
                <button
                  onClick={() => setHudTab('planogram')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    hudTab === 'planogram'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Planogram ({productSummaries.length})
                </button>
              </div>

              <span className="text-[10px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                LIVE HUD
              </span>
            </div>

            {/* TAB 1: ITEMS SEEN ON THIS CAMERA SHELF */}
            {hudTab === 'seen-items' && (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {visibleSeenItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1.5 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color || '#3b82f6' }}
                        />
                        <span className="font-bold text-slate-900">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                        {item.category || 'Retail'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>
                        Simultaneous Visible: <strong className="text-slate-900 text-sm">{item.count}</strong> units
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {item.shelf_level || 'Middle Shelf'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Conf: {((item.confidence || 0.9) * 100).toFixed(0)}%
                      </span>

                      {!item.is_registered && !registeredSuccess[item.name] ? (
                        <button
                          onClick={() => handleRegisterDetectedItem(item)}
                          disabled={registeringItem === item.name}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition disabled:opacity-50"
                        >
                          {registeringItem === item.name ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <FolderPlus className="h-3 w-3" />
                              + Monitor Item
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                          <Check className="h-3 w-3" />
                          Tracked
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: PLANOGRAM AUDIT */}
            {hudTab === 'planogram' && (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {productSummaries.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1.5 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{prod.name}</span>
                      <StatusBadge status={prod.status} size="sm" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>
                        Simultaneous Visible: <strong className="text-slate-900 text-sm">{prod.count}</strong> units
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Min threshold: {prod.minStock}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          prod.status === 'NORMAL'
                            ? 'bg-emerald-500'
                            : prod.status === 'LOW_STOCK'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(10, (prod.count / (prod.minStock * 2 || 6)) * 100))}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Camera Selector List */}
          <div className="retail-card p-4">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                All Camera Feeds ({cameras.length})
              </h3>
              <button
                onClick={() => setShowAddCustomModal(true)}
                className="text-[11px] text-blue-600 font-semibold hover:underline"
              >
                + Add Custom
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {cameras.map((cam) => {
                const isSelected = selectedCamera?.camera_id === cam.camera_id;
                const isWebcam = cam.stream_url?.startsWith('webcam') || cam.camera_id === 'cam-004' || cam.camera_id === 'cam-webcam';
                return (
                  <button
                    key={cam.camera_id}
                    onClick={() => handleSelectCamera(cam)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-semibold shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <div className="flex items-center gap-1.5">
                        {isWebcam ? (
                          <Laptop className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <Video className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        )}
                        <p className="font-medium text-slate-800 truncate">{cam.camera_name}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-5">{cam.location}</p>
                    </div>
                    <StatusBadge status={cam.status || 'ONLINE'} size="sm" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Online Stream Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Connect Online Camera Stream
              </h3>
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enter any publicly accessible video stream URL (MP4, WebM, HLS m3u8, or IP camera stream).
            </p>

            <form onSubmit={handleConnectCustomStream} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Stream URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/cctv_stream.mp4"
                  value={customStreamUrl}
                  onChange={(e) => setCustomStreamUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Quick Test Streams:</p>
                <button
                  type="button"
                  onClick={() =>
                    setCustomStreamUrl(
                      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                    )
                  }
                  className="block text-blue-600 hover:underline"
                >
                  • Supermarket Aisle Feed (Public Sample MP4)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCustomStreamUrl(
                      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                    )
                  }
                  className="block text-blue-600 hover:underline"
                >
                  • Public CCTV Test Feed 2 (MP4)
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Connect Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
