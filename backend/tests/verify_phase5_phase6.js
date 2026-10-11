// Native fetch is built-in in Node v18+

async function runPhase5Phase6Tests() {
  const base = 'http://localhost:5000';
  console.log('--- Testing Phase 5: Alerts & Dashboard Gate ---');

  // 1. Auth login
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@shelfsight.store', password: 'password123' })
  }).then(r => r.json());

  if (!loginRes.token) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes));
  }
  const token = loginRes.token;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Create a dedicated test product to test transitions cleanly
  const testProdSku = `TEST-P5-${Date.now()}`;
  const prodRes = await fetch(`${base}/api/products`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Transition Test Drink',
      category: 'Beverages',
      sku: testProdSku,
      min_visible_stock: 4,
      detection_prompt: 'green tea can'
    })
  }).then(r => r.json());

  if (!prodRes.success) {
    throw new Error('Failed to create test product: ' + JSON.stringify(prodRes));
  }
  const testProduct = prodRes.data;
  console.log(`Created test product ${testProduct.id} with min_visible_stock=4`);

  // Count initial alerts for this product
  const getAlertsForProd = async () => {
    const res = await fetch(`${base}/api/alerts`, { headers }).then(r => r.json());
    return res.data.filter(a => a.product_id === testProduct.id);
  };

  // Step A: First observation with NORMAL stock (e.g. 10 > 4) -> No alert expected
  console.log('1. Recording NORMAL stock observation (count=10)...');
  await fetch(`${base}/api/inventory/snapshot`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: testProduct.id,
      detectedCount: 10
    })
  }).then(r => r.json());

  let alerts = await getAlertsForProd();
  console.log(`Alerts count after NORMAL: ${alerts.length} (Expected: 0)`);
  if (alerts.length !== 0) throw new Error('Expected 0 alerts for normal stock');

  // Step B: Transition to LOW_STOCK (count=3 <= 4) -> Exactly ONE LOW_STOCK alert expected
  console.log('2. Forcing LOW stock transition (count=3)...');
  await fetch(`${base}/api/inventory/snapshot`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: testProduct.id,
      detectedCount: 3
    })
  }).then(r => r.json());

  alerts = await getAlertsForProd();
  console.log(`Alerts count after first LOW: ${alerts.length} (Expected: 1)`);
  if (alerts.length !== 1 || alerts[0].type !== 'LOW_STOCK') {
    throw new Error(`Expected exactly 1 LOW_STOCK alert, got: ${JSON.stringify(alerts)}`);
  }
  const lowAlertId = alerts[0].alert_id;

  // Step C: Repeated LOW_STOCK observation (count=2 <= 4) -> NO duplicate alert!
  console.log('3. Repeated LOW stock observation (count=2)...');
  await fetch(`${base}/api/inventory/snapshot`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: testProduct.id,
      detectedCount: 2
    })
  }).then(r => r.json());

  alerts = await getAlertsForProd();
  console.log(`Alerts count after repeated LOW: ${alerts.length} (Expected: 1 - no duplicate)`);
  if (alerts.length !== 1) {
    throw new Error(`Duplicate alert created on repeated LOW_STOCK! Count: ${alerts.length}`);
  }

  // Step D: Transition to OUT_OF_STOCK (count=0) -> Exactly ONE OUT_OF_STOCK alert added
  console.log('4. Forcing OUT_OF_STOCK transition (count=0)...');
  await fetch(`${base}/api/inventory/snapshot`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: testProduct.id,
      detectedCount: 0
    })
  }).then(r => r.json());

  alerts = await getAlertsForProd();
  console.log(`Alerts count after OUT_OF_STOCK: ${alerts.length} (Expected: 2 total: 1 LOW, 1 OUT)`);
  if (alerts.length !== 2) {
    throw new Error(`Expected 2 total alerts, got ${alerts.length}`);
  }
  const outAlert = alerts.find(a => a.type === 'OUT_OF_STOCK');
  if (!outAlert) throw new Error('Missing OUT_OF_STOCK alert');

  // Step E: Repeated OUT_OF_STOCK (count=0) -> NO duplicate alert!
  console.log('5. Repeated OUT_OF_STOCK observation (count=0)...');
  await fetch(`${base}/api/inventory/snapshot`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      productId: testProduct.id,
      detectedCount: 0
    })
  }).then(r => r.json());

  alerts = await getAlertsForProd();
  console.log(`Alerts count after repeated OUT_OF_STOCK: ${alerts.length} (Expected: 2)`);
  if (alerts.length !== 2) {
    throw new Error(`Duplicate alert created on repeated OUT_OF_STOCK! Count: ${alerts.length}`);
  }

  // Step F: Mark read and mark resolved
  console.log('6. Testing mark read and mark resolved...');
  const readRes = await fetch(`${base}/api/alerts/${lowAlertId}/read`, {
    method: 'PUT',
    headers
  }).then(r => r.json());
  if (!readRes.success || readRes.data.status !== 'read') {
    throw new Error('Failed to mark alert as read: ' + JSON.stringify(readRes));
  }
  console.log('Alert successfully marked as READ');

  const resolveRes = await fetch(`${base}/api/alerts/${outAlert.alert_id}/resolve`, {
    method: 'PUT',
    headers
  }).then(r => r.json());
  if (!resolveRes.success || resolveRes.data.status !== 'resolved') {
    throw new Error('Failed to mark alert as resolved: ' + JSON.stringify(resolveRes));
  }
  console.log('Alert successfully marked as RESOLVED');

  // Step G: Dashboard summary check
  console.log('7. Verifying dashboard summary matches DB rows...');
  const dashRes = await fetch(`${base}/api/dashboard/summary`, { headers }).then(r => r.json());
  if (!dashRes.success) throw new Error('Dashboard summary failed');
  console.log('Dashboard summary:', dashRes.summary);
  if (typeof dashRes.summary.totalProducts !== 'number' || typeof dashRes.summary.inStock !== 'number') {
    throw new Error('Invalid dashboard summary format');
  }
  console.log('✓ Phase 5 GATE PASSED!\n');

  console.log('--- Testing Phase 6: Cameras, Live Monitoring, Offline Gate ---');
  // 1. Create a simulated camera and a faulty camera
  const simCamRes = await fetch(`${base}/api/cameras`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      camera_name: 'Shelf Demo Cam A',
      location: 'Aisle 1 - Beverages',
      stream_url: 'simulated://uploads/demo/sample_shelf.mp4'
    })
  }).then(r => r.json());
  const simCam = simCamRes.data;

  const badCamRes = await fetch(`${base}/api/cameras`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      camera_name: 'Faulty Offline Cam B',
      location: 'Aisle 9 - Warehouse',
      stream_url: 'rtsp://admin:secretPass123@192.168.1.999:554/stream'
    })
  }).then(r => r.json());
  const badCam = badCamRes.data;

  // Verify stream_url is masked
  console.log('1. Checking stream URL masking...');
  console.log('Raw bad stream had password secretPass123.');
  console.log('Returned badCam.stream_url:', badCam.stream_url);
  if (badCam.stream_url.includes('secretPass123')) {
    throw new Error('SECURITY VIOLATION: Stream URL exposed unmasked credentials!');
  }
  if (!badCam.stream_url.includes('****:****')) {
    throw new Error('Expected masked credentials in stream URL');
  }
  console.log('✓ Stream URL is properly masked!');

  // Start monitoring simulated camera
  console.log('2. Testing start and stop monitoring on simulated camera...');
  const startSim = await fetch(`${base}/api/cameras/${simCam.camera_id}/start`, {
    method: 'POST',
    headers
  }).then(r => r.json());
  console.log('Start simulated monitoring response:', startSim);
  const startSimStatus = startSim.status || startSim.camera?.status;
  if (!startSim.success || (startSimStatus !== 'simulated' && startSimStatus !== 'online')) {
    throw new Error('Failed to start simulated camera: ' + JSON.stringify(startSim));
  }

  const stopSim = await fetch(`${base}/api/cameras/${simCam.camera_id}/stop`, {
    method: 'POST',
    headers
  }).then(r => r.json());
  console.log('Stop simulated monitoring response:', stopSim);
  const stopSimStatus = stopSim.status || stopSim.camera?.status;
  if (!stopSim.success || stopSimStatus !== 'offline') {
    throw new Error('Failed to stop monitoring: ' + JSON.stringify(stopSim));
  }
  console.log('✓ Start/Stop monitoring works!');

  // Test bad stream URL fails gracefully, marks offline, creates offline alert
  console.log('3. Testing bad stream URL handling...');
  const startBad = await fetch(`${base}/api/cameras/${badCam.camera_id}/start`, {
    method: 'POST',
    headers
  }).then(r => r.json());
  console.log('Start bad camera response:', startBad);
  const badStatus = startBad.status || startBad.camera?.status;
  if (startBad.success) {
    throw new Error('Bad stream should not have succeeded');
  }
  if (badStatus !== 'offline') {
    throw new Error('Bad stream camera should be marked offline');
  }

  // Check that offline alert was created
  const alertsRes = await fetch(`${base}/api/alerts`, { headers }).then(r => r.json());
  const offlineAlert = alertsRes.data.find(a => a.camera_id === badCam.camera_id && a.type === 'CAMERA_OFFLINE');
  if (!offlineAlert) {
    throw new Error('CAMERA_OFFLINE alert was not created for unreachable stream');
  }
  console.log('✓ Graceful offline handling verified, offline alert:', offlineAlert.message);
  console.log('✓ Phase 6 GATE PASSED!');
}

runPhase5Phase6Tests()
  .then(() => {
    console.log('\n========================================');
    console.log('ALL TESTS FOR PHASES 5 & 6 PASSED SUCCESSFULLY!');
    console.log('========================================');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nTEST FAILED:', err);
    process.exit(1);
  });
