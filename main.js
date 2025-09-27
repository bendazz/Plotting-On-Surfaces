// Three.js plotting setup reused from bendazz/Surfaces with the same visual method,
// adapted to a practice mode focused ONLY on paraboloids.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const app = document.getElementById('app');

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(app.clientWidth, app.clientHeight);
renderer.setClearColor(0xffffff, 1);
app.appendChild(renderer.domElement);

// Scene & Camera
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(50, app.clientWidth / app.clientHeight, 0.1, 1000);
// Right-handed Z-up
camera.up.set(0, 0, 1);
camera.position.set(20, 16, 22);
scene.add(camera);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(5, 4, 8);
scene.add(dirLight);

// Axes
const AXIS_EXTENT = 100;
const AXIS_THICKNESS = 0.04;

function createAxis({ axis, color, extent = AXIS_EXTENT, thickness = AXIS_THICKNESS }) {
  const length = extent * 2;
  let geom;
  if (axis === 'x') geom = new THREE.BoxGeometry(length, thickness, thickness);
  else if (axis === 'y') geom = new THREE.BoxGeometry(thickness, length, thickness);
  else if (axis === 'z') geom = new THREE.BoxGeometry(thickness, thickness, length);
  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(0, 0, 0);
  mesh.renderOrder = 1;
  return mesh;
}

scene.add(
  createAxis({ axis: 'x', color: 0xff0000 }),
  createAxis({ axis: 'y', color: 0x00ff00 }),
  createAxis({ axis: 'z', color: 0x0000ff })
);

// Subtle XY plane
const planeSize = AXIS_EXTENT * 2;
const planeGeom = new THREE.PlaneGeometry(planeSize, planeSize);
const planeMat = new THREE.MeshBasicMaterial({
  color: 0x8f96a3,
  opacity: 0.12,
  transparent: true,
  side: THREE.DoubleSide,
});
planeMat.depthWrite = false;
const xyPlane = new THREE.Mesh(planeGeom, planeMat);
xyPlane.position.set(0, 0, 0);
xyPlane.renderOrder = 0;
scene.add(xyPlane);

// XY Grid
const gridSize = AXIS_EXTENT * 2;
const gridDivisions = AXIS_EXTENT * 2;
const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x6f7785, 0xb5bcc6);
grid.rotation.x = Math.PI / 2;
grid.renderOrder = 0.6;
if (Array.isArray(grid.material)) {
  grid.material.forEach(m => { m.opacity = 0.95; m.transparent = true; m.polygonOffset = false; });
} else {
  grid.material.opacity = 0.95;
  grid.material.transparent = true;
  grid.material.polygonOffset = false;
}
scene.add(grid);

// --- Surface generation (paraboloid only) ---
let surfaceMesh = null;

function buildParaboloid({ a, b, c, R, segments }) {
  const seg = Math.max(4, Math.min(256, segments));
  const positions = new Float32Array((seg + 1) * (seg + 1) * 3);
  const indices = new Uint32Array(seg * seg * 6);

  const step = (2 * R) / seg;
  let p = 0;
  for (let iy = 0; iy <= seg; iy++) {
    const y = -R + iy * step;
    for (let ix = 0; ix <= seg; ix++) {
      const x = -R + ix * step;
      const z = a * x * x + b * y * y + c;
      positions[p++] = x; positions[p++] = y; positions[p++] = z;
    }
  }

  let t = 0;
  const row = seg + 1;
  for (let iy = 0; iy < seg; iy++) {
    for (let ix = 0; ix < seg; ix++) {
      const aIdx = iy * row + ix;
      const bIdx = aIdx + 1;
      const cIdx = aIdx + row;
      const dIdx = cIdx + 1;
      indices[t++] = aIdx; indices[t++] = cIdx; indices[t++] = bIdx;
      indices[t++] = bIdx; indices[t++] = cIdx; indices[t++] = dIdx;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({
    color: 0x3a8ee6,
    specular: 0x99c2ff,
    shininess: 20,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  if (surfaceMesh) scene.remove(surfaceMesh);
  surfaceMesh = new THREE.Mesh(geo, mat);
  surfaceMesh.renderOrder = 0.9;
  scene.add(surfaceMesh);
}

// Practice state for paraboloid z = a x^2 + b y^2 + c
let paraboloidParams = { a: 0.5, b: 0.5, c: 0.0 };

function paraboloidEquationText({ a, b, c }) {
  return `z = ${a.toFixed(2)} x² + ${b.toFixed(2)} y² + ${c.toFixed(2)}`;
}

// UI elements for practice mode
const rSlider = document.getElementById('rSlider');
const rValue = document.getElementById('rValue');
const problemEquation = document.getElementById('problemEquation');
const givenXY = document.getElementById('givenXY');
const inputX = document.getElementById('inputX');
const inputY = document.getElementById('inputY');
const inputZ = document.getElementById('inputZ');
const submitBtn = document.getElementById('submitBtn');
const newProblemBtn = document.getElementById('newProblemBtn');
const feedback = document.getElementById('feedback');

function getRenderParams() {
  const R = parseFloat(rSlider.value);
  const segments = Math.round(R * 4);
  return { R, segments };
}

function updateRReadout() {
  const R = parseFloat(rSlider.value);
  rValue.textContent = R.toFixed(0);
}

// Current given (x,y)
let given = { x: 0, y: 0 };

function generateProblem() {
  const rnd = (min, max) => Math.random() * (max - min) + min;

  // Enforce same-sign a and b (zeros allowed)
  const sign = Math.random() < 0.5 ? 1 : -1;
  let aMag = +(rnd(0.2, 1.2).toFixed(2));
  let bMag = +(rnd(0.2, 1.2).toFixed(2));
  if (Math.random() < 0.25) aMag = 0;
  if (Math.random() < 0.25) bMag = 0;
  if (aMag < 0.1 && bMag < 0.1) aMag = 0.2;
  const a = +(sign * aMag).toFixed(2);
  const b = +(sign * bMag).toFixed(2);
  const c = +(rnd(-2.0, 2.0).toFixed(2));
  paraboloidParams = { a, b, c };

  const R = parseFloat(rSlider.value);
  const zCap = Math.max(3, 0.5 * R);

  // Choose (x,y) so |z| stays moderate
  let gx = 0, gy = 0;
  let ok = false;
  for (let tries = 0; tries < 200; tries++) {
    const x = +(rnd(-0.7 * R, 0.7 * R).toFixed(1));
    const y = +(rnd(-0.7 * R, 0.7 * R).toFixed(1));
    const z = computeZ(paraboloidParams, x, y);
    if (Math.abs(z) <= zCap) { gx = x; gy = y; ok = true; break; }
  }
  if (!ok) {
    gx = +(rnd(-0.2 * R, 0.2 * R).toFixed(1));
    gy = +(rnd(-0.2 * R, 0.2 * R).toFixed(1));
  }
  given = { x: gx, y: gy };

  // Update UI
  problemEquation.textContent = paraboloidEquationText(paraboloidParams);
  givenXY.textContent = `Given: x = ${gx}, y = ${gy}`;
  inputX.value = '';
  inputY.value = '';
  inputZ.value = '';
  feedback.textContent = '';

  // Rebuild surface
  const { R: RR, segments } = getRenderParams();
  buildParaboloid({ ...paraboloidParams, R: RR, segments });

  // Remove any prior marker
  clearMarker();
}

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.enableZoom = true;
controls.minDistance = 2;
controls.maxDistance = 1000;
controls.target.set(0, 0, 0);
controls.update();

const HOME = {
  position: new THREE.Vector3(20, 16, 22),
  target: new THREE.Vector3(0, 0, 0),
  up: new THREE.Vector3(0, 0, 1),
};

function resetView() {
  camera.up.copy(HOME.up);
  camera.position.copy(HOME.position);
  controls.target.copy(HOME.target);
  controls.update();
}

document.getElementById('homeBtn')?.addEventListener('click', resetView);

// Resize - observe the app container size, not full window
function resizeToContainer() {
  const w = app.clientWidth;
  const h = app.clientHeight;
  if (h === 0 || w === 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

const ro = new ResizeObserver(() => resizeToContainer());
ro.observe(app);
window.addEventListener('resize', resizeToContainer);
resizeToContainer();

// Plotting of the student's point as a small sphere
let pointMarker = null;
function clearMarker() {
  if (pointMarker) {
    scene.remove(pointMarker);
    pointMarker.geometry.dispose?.();
    pointMarker.material.dispose?.();
    pointMarker = null;
  }
}

function plotMarker(x, y, z, ok) {
  clearMarker();
  // Fixed large marker radius for high visibility regardless of R
  const radius = 1.2;
  const geom = new THREE.SphereGeometry(radius, 24, 16);
  // Always use red so it stands out clearly
  const color = 0xef4444; /* red */
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.25,
    metalness: 0.0,
    roughness: 0.5,
  });
  pointMarker = new THREE.Mesh(geom, mat);
  pointMarker.position.set(x, y, z);
  pointMarker.renderOrder = 1.2;
  scene.add(pointMarker);
}

function computeZ({ a, b, c }, x, y) {
  return a * x * x + b * y * y + c;
}

function handleSubmit() {
  const x = parseFloat(inputX.value);
  const y = parseFloat(inputY.value);
  const z = parseFloat(inputZ.value);
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) {
    feedback.textContent = 'Please enter numbers for x, y, and z.';
    return;
  }
  // Require x,y match the given pair (within small tolerance) and z matches the computed value
  const tolXY = 1e-6; // exact since given values are to 0.1
  const tolZ = 1e-2;  // accept small rounding error
  const correctZ = computeZ(paraboloidParams, x, y);
  const xyOk = Math.abs(x - given.x) < tolXY && Math.abs(y - given.y) < tolXY;
  const zOk = Math.abs(z - correctZ) <= tolZ;
  const ok = xyOk && zOk;
  plotMarker(x, y, z, ok);
  if (!xyOk && !zOk) {
    feedback.textContent = `Incorrect x,y and z. Hint: plug the given x,y into the equation to compute z.`;
  } else if (!xyOk) {
    feedback.textContent = `Incorrect x,y. Use the given pair: x = ${given.x}, y = ${given.y}.`;
  } else if (!zOk) {
    feedback.textContent = `Incorrect z. For x=${x}, y=${y}, z should be ${correctZ.toFixed(2)}.`;
  } else {
    feedback.textContent = 'Correct!';
  }
}

function handleRChange() {
  updateRReadout();
  const { R, segments } = getRenderParams();
  buildParaboloid({ ...paraboloidParams, R, segments });
}

rSlider.addEventListener('input', handleRChange);
submitBtn.addEventListener('click', handleSubmit);
newProblemBtn.addEventListener('click', generateProblem);

// Initial setup
updateRReadout();
generateProblem();

// Render loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
