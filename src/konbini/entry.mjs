import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/* ============================================================
   基础：渲染器 / 场景 / 相机 / 控制器
============================================================ */
const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1220);
scene.fog = new THREE.FogExp2(0x0b1424, 0.028);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(16, 8.5, 15);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.0, -3);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 6;
controls.maxDistance = 48;
controls.maxPolarAngle = Math.PI / 2 - 0.03;
controls.update();

/* ============================================================
   工具函数
============================================================ */
function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function tube(a, b, r, mat, parent = scene) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  parent.add(m);
  return m;
}
const rand = (a, b) => a + Math.random() * (b - a);

/* ============================================================
   灯光：冷雨夜 + 暖室内
============================================================ */
scene.add(new THREE.HemisphereLight(0x35507a, 0x0a0e18, 0.5));
const moon = new THREE.DirectionalLight(0x6a86b8, 0.5);
moon.position.set(-14, 22, 10);
scene.add(moon);

const warm1 = new THREE.PointLight(0xffd9a4, 45, 20, 2);
warm1.position.set(-1, 4.2, -9.5);
scene.add(warm1);
const warm2 = new THREE.PointLight(0xffcf96, 28, 14, 2);
warm2.position.set(4.5, 3.6, -7);
scene.add(warm2);

const lampSpot = new THREE.SpotLight(0xbdd7ff, 320, 26, 0.62, 0.55, 2);
lampSpot.position.set(-12, 6.4, 2.2);
lampSpot.target.position.set(-12, 0, 4.5);
lampSpot.castShadow = true;
lampSpot.shadow.mapSize.set(1024, 1024);
scene.add(lampSpot, lampSpot.target);

const vendLight = new THREE.PointLight(0xbfe4ff, 10, 8, 2);
vendLight.position.set(6.8, 1.6, -3.4);
scene.add(vendLight);

/* ============================================================
   方形底座 + 湿地面反射
============================================================ */
const BASE = 36;
const baseSideMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.9 });
box(BASE, 1.2, BASE, baseSideMat, 0, -0.6, 0).receiveShadow = true;

const reflector = new Reflector(new THREE.PlaneGeometry(BASE - 0.1, BASE - 0.1), {
  clipBias: 0.003,
  textureWidth: 1024,
  textureHeight: 1024,
  color: 0x606a78
});
reflector.rotation.x = -Math.PI / 2;
reflector.position.y = 0.01;
scene.add(reflector);

const asphaltTex = makeCanvas(512, 512, (g, w, h) => {
  g.fillStyle = '#161c26'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5200; i++) {
    const v = rand(18, 48) | 0;
    g.fillStyle = `rgb(${v},${v + 3},${v + 8})`;
    g.fillRect(Math.random() * w, Math.random() * h, rand(1, 2.4), rand(1, 2.4));
  }
});
asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping;
asphaltTex.repeat.set(6, 6);
const asphalt = new THREE.Mesh(
  new THREE.PlaneGeometry(BASE - 0.1, BASE - 0.1),
  new THREE.MeshStandardMaterial({ map: asphaltTex, transparent: true, opacity: 0.62, roughness: 0.85, metalness: 0.15 })
);
asphalt.rotation.x = -Math.PI / 2;
asphalt.position.y = 0.03;
asphalt.receiveShadow = true;
scene.add(asphalt);

const roadMat = new THREE.MeshStandardMaterial({ color: 0x10151d, transparent: true, opacity: 0.45, roughness: 0.7 });
box(BASE - 0.1, 0.02, 17, roadMat, 0, 0.045, 9.4).receiveShadow = true;
const lineMat = new THREE.MeshBasicMaterial({ color: 0xc8cdd4, transparent: true, opacity: 0.5 });
for (let i = -4; i <= 4; i++) box(1.8, 0.02, 0.18, lineMat, i * 3.6, 0.06, 9.4);
const curbMat = new THREE.MeshStandardMaterial({ color: 0x3d4654, roughness: 0.8 });
box(BASE - 0.1, 0.22, 0.5, curbMat, 0, 0.11, 0.85).receiveShadow = true;

const walkTex = makeCanvas(256, 256, (g, w, h) => {
  g.fillStyle = '#232a36'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(10,13,20,0.7)'; g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    g.beginPath(); g.moveTo((w / 4) * i, 0); g.lineTo((w / 4) * i, h); g.stroke();
    g.beginPath(); g.moveTo(0, (h / 4) * i); g.lineTo(w, (h / 4) * i); g.stroke();
  }
});
walkTex.wrapS = walkTex.wrapT = THREE.RepeatWrapping;
walkTex.repeat.set(8, 3);
const sidewalk = box(34, 0.24, 6.4,
  new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.35, metalness: 0.35 }),
  0, 0.12, -2.1);
sidewalk.receiveShadow = true;

/* ============================================================
   便利店主体
============================================================ */
const store = new THREE.Group();
scene.add(store);

const SW = 16, SD = 9, SH = 5;
const FLOOR = 0.24;
const FZ = -5;
const BZ = FZ - SD;

const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.85 });
const darkWallMat = new THREE.MeshStandardMaterial({ color: 0x6b7078, roughness: 0.8 });

const floorTex = makeCanvas(256, 256, (g, w, h) => {
  g.fillStyle = '#c8b394'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(120,95,60,0.4)'; g.lineWidth = 2;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(0, (h / 8) * i); g.lineTo(w, (h / 8) * i); g.stroke(); }
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
floorTex.repeat.set(6, 4);
box(SW, 0.1, SD, new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6 }), 0, FLOOR, FZ - SD / 2, store);

box(SW, SH, 0.3, wallMat, 0, FLOOR + SH / 2, BZ, store);
box(0.3, SH, SD, wallMat, -SW / 2, FLOOR + SH / 2, FZ - SD / 2, store);
box(0.3, SH, SD, wallMat, SW / 2, FLOOR + SH / 2, FZ - SD / 2, store);
box(SW + 0.6, 0.35, SD + 0.8, darkWallMat, 0, FLOOR + SH + 0.17, FZ - SD / 2 - 0.1, store);

const ceilLightMat = new THREE.MeshStandardMaterial({
  color: 0xfff4e0, emissive: 0xffe9c4, emissiveIntensity: 2.2
});
for (const [lx, lz] of [[-4, -8], [0.5, -8], [5, -8], [-2, -11.5], [3, -11.5]])
  box(2.4, 0.06, 0.9, ceilLightMat, lx, FLOOR + SH - 0.08, lz, store);

const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.5, metalness: 0.6 });
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0xcfe4f0, transparent: true, opacity: 0.14, roughness: 0.06,
  metalness: 0, side: THREE.DoubleSide, depthWrite: false
});
const colX = [-8, -5.6, -3.2, -0.8, 0.8, 3.2, 5.6, 8];
for (const x of colX) box(0.18, SH - 1.1, 0.24, frameMat, x, FLOOR + (SH - 1.1) / 2, FZ, store);
box(SW, 0.5, 0.24, frameMat, 0, FLOOR + SH - 1.35, FZ, store);
box(SW, 0.12, 0.24, frameMat, 0, FLOOR + 0.06, FZ, store);
for (let i = 0; i < colX.length - 1; i++) {
  const x0 = colX[i], x1 = colX[i + 1];
  if (Math.abs(x0 - 0.8) < 0.01 && Math.abs(x1 - 3.2) < 0.01) continue;
  const w = x1 - x0 - 0.18;
  box(w, SH - 1.6, 0.06, glassMat, (x0 + x1) / 2, FLOOR + (SH - 1.6) / 2 + 0.05, FZ, store);
}
const doorSignTex = makeCanvas(256, 64, (g, w, h) => {
  g.fillStyle = '#12324a'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#8fd8ff'; g.font = 'bold 30px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('自動ドア AUTO', w / 2, h / 2);
});
const doorSign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42),
  new THREE.MeshStandardMaterial({ map: doorSignTex, emissive: 0xffffff, emissiveMap: doorSignTex, emissiveIntensity: 0.9 }));
doorSign.position.set(2, FLOOR + SH - 1.72, FZ + 0.14);
store.add(doorSign);

const doorMat = new THREE.MeshPhysicalMaterial({
  color: 0xd8ecf6, transparent: true, opacity: 0.22, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false
});
const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.4, metalness: 0.7 });
function makeDoorPanel() {
  const g = new THREE.Group();
  box(1.1, SH - 1.72, 0.05, doorMat, 0, 0, 0, g);
  box(1.14, 0.09, 0.08, doorFrameMat, 0, (SH - 1.72) / 2, 0, g);
  box(1.14, 0.09, 0.08, doorFrameMat, 0, -(SH - 1.72) / 2, 0, g);
  box(0.07, SH - 1.72, 0.08, doorFrameMat, 0.55, 0, 0, g);
  box(0.07, SH - 1.72, 0.08, doorFrameMat, -0.55, 0, 0, g);
  return g;
}
const doorL = makeDoorPanel(), doorR = makeDoorPanel();
const DOOR_Y = FLOOR + (SH - 1.72) / 2 + 0.06;
doorL.position.set(1.45, DOOR_Y, FZ);
doorR.position.set(2.55, DOOR_Y, FZ);
store.add(doorL, doorR);

/* ---------- 店招 ---------- */
const signTex = makeCanvas(1024, 160, (g, w, h) => {
  g.fillStyle = '#fdfbf4'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ff8a3c'; g.fillRect(0, 0, w, 26);
  g.fillStyle = '#3fae6a'; g.fillRect(0, 26, w, 14);
  g.fillStyle = '#22344a'; g.font = 'bold 74px "Yu Gothic", sans-serif';
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('夜雨コンビニ', 46, h / 2 + 18);
  g.fillStyle = '#ff8a3c'; g.font = 'bold 56px sans-serif';
  g.textAlign = 'right';
  g.fillText('24h  OPEN', w - 46, h / 2 + 18);
});
box(SW + 0.4, 1.35, 0.5,
  new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 }), 0, FLOOR + SH + 0.55, FZ + 0.05, store);
const signFace = new THREE.Mesh(new THREE.PlaneGeometry(SW + 0.2, 1.15),
  new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 1.5 }));
signFace.position.set(0, FLOOR + SH + 0.55, FZ + 0.32);
store.add(signFace);

/* ---------- 雨棚 ---------- */
const awningTex = makeCanvas(512, 128, (g, w, h) => {
  const cols = ['#f6efe0', '#e0785a'];
  const sw = w / 12;
  for (let i = 0; i < 12; i++) { g.fillStyle = cols[i % 2]; g.fillRect(i * sw, 0, sw, h); }
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, h - 14, w, 14);
});
awningTex.wrapS = THREE.RepeatWrapping;
const awning = new THREE.Mesh(new THREE.PlaneGeometry(SW + 0.6, 2.2),
  new THREE.MeshStandardMaterial({ map: awningTex, roughness: 0.8, side: THREE.DoubleSide }));
awning.position.set(0, FLOOR + SH - 1.15, FZ + 1.15);
awning.rotation.x = -Math.PI / 2 + 0.32;
store.add(awning);
for (const x of [-7.6, 7.6])
  tube(new THREE.Vector3(x, FLOOR + SH - 1.6, FZ), new THREE.Vector3(x, FLOOR + SH - 0.75, FZ + 2.1), 0.04, frameMat, store);

/* ============================================================
   店内
============================================================ */
const shelfFrameMat = new THREE.MeshStandardMaterial({ color: 0x8a8f98, roughness: 0.5, metalness: 0.4 });

function makeShelfUnit(w = 3.6) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) box(w, 0.06, 0.75, shelfFrameMat, 0, 0.35 + i * 0.5, 0, g);
  for (const sx of [-w / 2 + 0.05, w / 2 - 0.05]) box(0.08, 2.0, 0.75, shelfFrameMat, sx, 1.0, 0, g);
  const prodGeo = new THREE.BoxGeometry(0.16, 0.24, 0.16);
  const prodMat = new THREE.MeshStandardMaterial({ roughness: 0.55 });
  const palette = [0xff6b6b, 0xffb84d, 0x69d2e7, 0xa7e07f, 0xf78fb3, 0xf9f871, 0x9b89ff, 0xffffff];
  const inst = new THREE.InstancedMesh(prodGeo, prodMat, 84);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let lvl = 0; lvl < 4; lvl++)
    for (let i = 0; i < 21; i++) {
      dummy.position.set(-w / 2 + 0.22 + i * (w - 0.44) / 20, 0.5 + lvl * 0.5, rand(-0.18, 0.18));
      dummy.rotation.y = rand(-0.2, 0.2);
      dummy.updateMatrix();
      inst.setMatrixAt(n, dummy.matrix);
      inst.setColorAt(n, new THREE.Color(palette[(Math.random() * palette.length) | 0]));
      n++;
    }
  inst.instanceColor.needsUpdate = true;
  g.add(inst);
  return g;
}
const shelfA = makeShelfUnit(); shelfA.position.set(-1.2, FLOOR, -8.6); store.add(shelfA);
const shelfB = makeShelfUnit(); shelfB.position.set(3.4, FLOOR, -8.6); store.add(shelfB);
const shelfC = makeShelfUnit(3.0); shelfC.position.set(5.8, FLOOR, -11); shelfC.rotation.y = Math.PI / 2; store.add(shelfC);

/* ---------- 饮料冰柜 ---------- */
const fridge = new THREE.Group();
fridge.position.set(-4.4, FLOOR, BZ + 0.85);
store.add(fridge);
const fridgeBodyMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.4, metalness: 0.3 });
box(5.6, 2.6, 0.9, fridgeBodyMat, 0, 1.3, 0, fridge);
box(5.2, 2.1, 0.05, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf6ff, emissiveIntensity: 1.6 }),
  0, 1.45, -0.28, fridge);
const canGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8);
const canMat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.5 });
const canCols = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0xe67e22, 0xecf0f1, 0x9b59b6];
const cans = new THREE.InstancedMesh(canGeo, canMat, 72);
{
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let lvl = 0; lvl < 4; lvl++)
    for (let i = 0; i < 18; i++) {
      dummy.position.set(-2.4 + i * 0.28, 0.7 + lvl * 0.45, 0.02);
      dummy.updateMatrix();
      cans.setMatrixAt(n, dummy.matrix);
      cans.setColorAt(n, new THREE.Color(canCols[(Math.random() * canCols.length) | 0]));
      n++;
    }
  cans.instanceColor.needsUpdate = true;
  fridge.add(cans);
}
box(5.4, 2.2, 0.05, glassMat, 0, 1.4, 0.48, fridge);
for (let i = 0; i <= 3; i++) box(0.07, 2.3, 0.09, fridgeBodyMat, -2.7 + i * 1.8, 1.35, 0.48, fridge);
const fridgeSignTex = makeCanvas(512, 80, (g, w, h) => {
  g.fillStyle = '#1d6fd1'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff'; g.font = 'bold 44px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('DRINK つめたい', w / 2, h / 2);
});
const fridgeSign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 0.6),
  new THREE.MeshStandardMaterial({ map: fridgeSignTex, emissive: 0xffffff, emissiveMap: fridgeSignTex, emissiveIntensity: 1.2 }));
fridgeSign.position.set(0, 2.9, 0.4);
fridge.add(fridgeSign);

/* ---------- 收银台 ---------- */
const cashier = new THREE.Group();
cashier.position.set(5.6, FLOOR, -6.6);
store.add(cashier);
const counterMat = new THREE.MeshStandardMaterial({ color: 0xf0e6d2, roughness: 0.6 });
box(2.6, 1.0, 0.8, counterMat, 0, 0.5, 0, cashier);
box(2.7, 0.06, 0.9, new THREE.MeshStandardMaterial({ color: 0x5a4f43, roughness: 0.4 }), 0, 1.03, 0, cashier);
box(0.5, 0.25, 0.45, darkWallMat, -0.6, 1.2, 0, cashier);
const regScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3),
  new THREE.MeshStandardMaterial({ color: 0x223, emissive: 0x7fd8ff, emissiveIntensity: 1.4 }));
regScreen.position.set(-0.6, 1.5, -0.08); regScreen.rotation.x = -0.25;
cashier.add(regScreen);
box(0.5, 0.25, 0.35, new THREE.MeshStandardMaterial({ color: 0xd94f4f, roughness: 0.6 }), 0.7, 1.18, 0.05, cashier);

/* ---------- 关东煮柜台 ---------- */
const oden = new THREE.Group();
oden.position.set(2.6, FLOOR, -6.6);
store.add(oden);
box(1.9, 1.0, 0.8, counterMat, 0, 0.5, 0, oden);
box(2.0, 0.06, 0.9, new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.4 }), 0, 1.03, 0, oden);
const potMat = new THREE.MeshStandardMaterial({ color: 0xb8bec6, roughness: 0.3, metalness: 0.7 });
const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 20), potMat);
pot.position.set(0, 1.15, 0); oden.add(pot);
const broth = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20),
  new THREE.MeshStandardMaterial({ color: 0xb56f2e, roughness: 0.25 }));
broth.rotation.x = -Math.PI / 2; broth.position.set(0, 1.25, 0); oden.add(broth);
for (let i = 0; i < 4; i++) {
  const d = box(0.8, 0.1, 0.03, potMat, 0, 1.2, 0, oden);
  d.rotation.y = (i / 4) * Math.PI;
}
const foodCols = [0xf5e6c8, 0xffffff, 0xe8b04b, 0x8a5a3a];
for (let i = 0; i < 8; i++) {
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshStandardMaterial({ color: foodCols[i % 4], roughness: 0.5 }));
  const a = (i / 8) * Math.PI * 2;
  f.position.set(Math.cos(a) * 0.24, 1.27, Math.sin(a) * 0.24);
  oden.add(f);
}
const odenSignTex = makeCanvas(512, 128, (g, w, h) => {
  g.fillStyle = '#a83226'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffe9b8'; g.font = 'bold 52px "Yu Gothic", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('おでん 各種 120円〜', w / 2, h / 2);
});
const odenSign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45),
  new THREE.MeshStandardMaterial({ map: odenSignTex, emissive: 0xffffff, emissiveMap: odenSignTex, emissiveIntensity: 1.1 }));
odenSign.position.set(0, 2.2, 0.1);
oden.add(odenSign);
for (const sx of [-0.85, 0.85]) tube(new THREE.Vector3(sx, 1.05, 0), new THREE.Vector3(sx, 2.0, 0.05), 0.02, frameMat, oden);

/* ---------- 关东煮蒸汽 ---------- */
const steamTex = makeCanvas(64, 64, (g, w, h) => {
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
});
const STEAM_N = 26;
const steamGeo = new THREE.BufferGeometry();
const steamPos = new Float32Array(STEAM_N * 3);
const steamLife = new Float32Array(STEAM_N);
for (let i = 0; i < STEAM_N; i++) steamLife[i] = Math.random();
const steamMat = new THREE.PointsMaterial({
  map: steamTex, size: 0.45, transparent: true, opacity: 0.35,
  depthWrite: false, color: 0xfff2df
});
const steam = new THREE.Points(steamGeo, steamMat);
steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
scene.add(steam);
const odenWorld = new THREE.Vector3(2.6, FLOOR + 1.3, -6.6);

/* ============================================================
   店外
============================================================ */
/* ---------- 自动售货机 ---------- */
const vend = new THREE.Group();
vend.position.set(6.9, 0, -3.9);
scene.add(vend);
const vendTex = makeCanvas(256, 512, (g, w, h) => {
  g.fillStyle = '#1a4f9c'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, 70);
  g.fillStyle = '#1a4f9c'; g.font = 'bold 34px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('つめた〜い', w / 2, 36);
  const cols = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#ecf0f1', '#e67e22'];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++) {
      g.fillStyle = cols[(r * 5 + c) % cols.length];
      g.fillRect(18 + c * 45, 100 + r * 70, 34, 46);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(18 + c * 45, 100 + r * 70, 8, 46);
    }
  g.fillStyle = '#0d1f3c'; g.fillRect(15, h - 110, w - 30, 90);
  g.fillStyle = '#ffd75e'; g.font = 'bold 22px sans-serif';
  g.fillText('取り出し口', w / 2, h - 65);
});
box(1.4, 2.6, 1.0, new THREE.MeshStandardMaterial({ color: 0x2a6fd8, roughness: 0.4, metalness: 0.2 }), 0, 1.3, 0, vend).castShadow = true;
const vendFace = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.5),
  new THREE.MeshStandardMaterial({ map: vendTex, emissive: 0xffffff, emissiveMap: vendTex, emissiveIntensity: 1.1 }));
vendFace.position.set(0, 1.3, 0.51);
vend.add(vendFace);

/* ---------- 自行车 ---------- */
const bike = new THREE.Group();
bike.position.set(-4.6, 0.24, -3.3);
bike.rotation.y = 0.5;
bike.rotation.z = 0.06;
scene.add(bike);
const bikeMat = new THREE.MeshStandardMaterial({ color: 0x3f6d4e, roughness: 0.4, metalness: 0.5 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.9 });
function wheel(x) {
  const w = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 10, 24), tireMat);
  w.position.set(x, 0.34, 0); bike.add(w);
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16),
    new THREE.MeshBasicMaterial({ color: 0x777d88, wireframe: true }));
  hub.position.set(x, 0.34, 0); bike.add(hub);
}
wheel(-0.55); wheel(0.55);
tube(new THREE.Vector3(-0.55, 0.34, 0), new THREE.Vector3(0.05, 0.85, 0), 0.03, bikeMat, bike);
tube(new THREE.Vector3(0.05, 0.85, 0), new THREE.Vector3(0.5, 0.8, 0), 0.03, bikeMat, bike);
tube(new THREE.Vector3(-0.55, 0.34, 0), new THREE.Vector3(-0.15, 0.55, 0), 0.03, bikeMat, bike);
tube(new THREE.Vector3(-0.15, 0.55, 0), new THREE.Vector3(0.05, 0.85, 0), 0.03, bikeMat, bike);
tube(new THREE.Vector3(0.55, 0.34, 0), new THREE.Vector3(0.5, 0.8, 0), 0.03, bikeMat, bike);
tube(new THREE.Vector3(0.5, 0.8, 0), new THREE.Vector3(0.5, 1.0, 0), 0.025, bikeMat, bike);
tube(new THREE.Vector3(0.34, 1.0, 0), new THREE.Vector3(0.66, 1.0, 0), 0.025, bikeMat, bike);
box(0.28, 0.06, 0.16, new THREE.MeshStandardMaterial({ color: 0x222222 }), 0.02, 0.9, 0, bike);
const basket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.26),
  new THREE.MeshStandardMaterial({ color: 0x888e98, wireframe: true }));
basket.position.set(0.72, 0.85, 0); bike.add(basket);

/* ---------- 伞架 ---------- */
const stand = new THREE.Group();
stand.position.set(-0.6, 0.24, -4.2);
scene.add(stand);
const standMat = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.5, metalness: 0.5 });
box(1.0, 0.08, 0.4, standMat, 0, 0.04, 0, stand);
for (const sx of [-0.45, 0.45]) box(0.05, 0.7, 0.4, standMat, sx, 0.35, 0, stand);
box(1.0, 0.06, 0.4, standMat, 0, 0.68, 0, stand);
function umbrella(color, x, lean) {
  const g = new THREE.Group();
  tube(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.95, 0), 0.015, standMat, g);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, transparent: color === 0xdff4ff, opacity: color === 0xdff4ff ? 0.6 : 1 }));
  canopy.position.y = 0.55; g.add(canopy);
  g.position.set(x, 0.1, 0);
  g.rotation.z = lean;
  stand.add(g);
}
umbrella(0xd94f4f, -0.28, 0.1);
umbrella(0xdff4ff, 0, -0.06);
umbrella(0x2b4a7a, 0.28, 0.14);

/* ---------- 路灯 ---------- */
const lampGroup = new THREE.Group();
lampGroup.position.set(-12, 0, 2.2);
scene.add(lampGroup);
const lampMat = new THREE.MeshStandardMaterial({ color: 0x30353e, roughness: 0.5, metalness: 0.6 });
tube(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 6.2, 0), 0.09, lampMat, lampGroup);
tube(new THREE.Vector3(0, 6.2, 0), new THREE.Vector3(0, 6.4, 1.6), 0.06, lampMat, lampGroup);
box(0.5, 0.18, 0.7, new THREE.MeshStandardMaterial({
  color: 0xd8e8ff, emissive: 0xcfe2ff, emissiveIntensity: 3.0
}), 0, 6.4, 1.8, lampGroup);
const coneGlow = new THREE.Mesh(new THREE.ConeGeometry(2.6, 6.2, 24, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xaac8f0, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }));
coneGlow.position.set(-12, 3.2, 4.0);
scene.add(coneGlow);

/* ---------- 空调外机 ---------- */
box(1.1, 0.7, 0.4, new THREE.MeshStandardMaterial({ color: 0xcfd4da, roughness: 0.6 }),
  -8.9, 0.6, -8, scene);
const fanTex = makeCanvas(128, 128, (g, w, h) => {
  g.fillStyle = '#9aa0a8'; g.beginPath(); g.arc(64, 64, 55, 0, 7); g.fill();
  g.fillStyle = '#6e747c';
  for (let i = 0; i < 5; i++) {
    g.save(); g.translate(64, 64); g.rotate(i * 1.2566);
    g.beginPath(); g.ellipse(20, 0, 28, 12, 0, 0, 7); g.fill(); g.restore();
  }
});
const fan = new THREE.Mesh(new THREE.CircleGeometry(0.26, 20),
  new THREE.MeshStandardMaterial({ map: fanTex, transparent: true }));
fan.rotation.y = Math.PI / 2; fan.position.set(-8.68, 0.6, -8);
scene.add(fan);

/* ---------- 门口地毯 ---------- */
box(1.8, 0.03, 1.0, new THREE.MeshStandardMaterial({ color: 0x2e5641, roughness: 0.95 }),
  2, 0.27, -4.2, scene);

/* ============================================================
   雨 + 屋檐滴水
============================================================ */
const rainTex = makeCanvas(16, 64, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, 'rgba(180,200,230,0)');
  grd.addColorStop(0.5, 'rgba(180,200,230,0.85)');
  grd.addColorStop(1, 'rgba(180,200,230,0)');
  g.fillStyle = grd; g.fillRect(6, 0, 4, h);
});

const RAIN_N = 2600;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_N * 3);
const rainSpd = new Float32Array(RAIN_N);
for (let i = 0; i < RAIN_N; i++) {
  rainPos[i * 3] = rand(-18, 18);
  rainPos[i * 3 + 1] = rand(0, 22);
  rainPos[i * 3 + 2] = rand(-18, 18);
  rainSpd[i] = rand(14, 22);
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
  map: rainTex, size: 0.55, transparent: true, opacity: 0.5,
  depthWrite: false, color: 0x9fb6d8, sizeAttenuation: true
}));
scene.add(rain);

const DRIP_N = 90;
const dripGeo = new THREE.BufferGeometry();
const dripPos = new Float32Array(DRIP_N * 3);
const dripSpd = new Float32Array(DRIP_N);
const dripSrc = [];
for (let i = 0; i < DRIP_N; i++) {
  const fromAwning = i < DRIP_N * 0.6;
  const src = fromAwning
    ? new THREE.Vector3(rand(-8, 8), FLOOR + SH - 0.85, FZ + 2.05)
    : new THREE.Vector3(rand(-8.2, 8.2), FLOOR + SH + 0.1, BZ + rand(-0.2, SD + 0.2));
  dripSrc.push(src);
  dripPos[i * 3] = src.x;
  dripPos[i * 3 + 1] = src.y - Math.random() * src.y;
  dripPos[i * 3 + 2] = src.z;
  dripSpd[i] = rand(6, 10);
}
dripGeo.setAttribute('position', new THREE.BufferAttribute(dripPos, 3));
const drips = new THREE.Points(dripGeo, new THREE.PointsMaterial({
  map: rainTex, size: 0.28, transparent: true, opacity: 0.8,
  depthWrite: false, color: 0xcfe0f5
}));
scene.add(drips);

/* ============================================================
   水洼涟漪
============================================================ */
const puddleSpots = [
  new THREE.Vector3(-3, 0.07, 6), new THREE.Vector3(4.5, 0.07, 9),
  new THREE.Vector3(-9, 0.07, 12), new THREE.Vector3(8, 0.07, 4),
  new THREE.Vector3(0.5, 0.07, 14), new THREE.Vector3(-12, 0.07, 7),
  new THREE.Vector3(2, 0.26, -2.4), new THREE.Vector3(-6, 0.26, -1.8)
];
const puddleMat = new THREE.MeshStandardMaterial({ color: 0x0c1420, roughness: 0.05, metalness: 0.9 });
for (const p of puddleSpots) {
  const pd = new THREE.Mesh(new THREE.CircleGeometry(rand(0.7, 1.3), 24), puddleMat);
  pd.rotation.x = -Math.PI / 2;
  pd.position.copy(p);
  pd.scale.x = rand(1, 1.6);
  scene.add(pd);
}
const RIPPLE_N = 14;
const ripples = [];
const rippleMat = new THREE.MeshBasicMaterial({ color: 0x9fc4e8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
for (let i = 0; i < RIPPLE_N; i++) {
  const r = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 32), rippleMat.clone());
  r.rotation.x = -Math.PI / 2;
  scene.add(r);
  ripples.push({ mesh: r, t: Math.random() * 2, life: rand(1.4, 2.2), spot: puddleSpots[i % puddleSpots.length] });
}

/* ============================================================
   后期泛光
============================================================ */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.7, 0.78);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ============================================================
   交互：视角切换 / 雨水开关 / 雨声 / 点击开门
============================================================ */
const views = {
  outside: {
    pos: new THREE.Vector3(16, 8.5, 15),
    tgt: new THREE.Vector3(0, 2.0, -3),
    min: 6, max: 48
  },
  inside: {
    pos: new THREE.Vector3(5.2, 2.0, -6.4),
    tgt: new THREE.Vector3(-4.5, 1.4, -11.5),
    min: 0.5, max: 12
  }
};
let currentView = 'outside';
let viewAnim = null;
function flyTo(name) {
  const v = views[name];
  currentView = name;
  viewAnim = {
    p0: camera.position.clone(), t0: controls.target.clone(),
    p1: v.pos.clone(), t1: v.tgt.clone(), k: 0
  };
  controls.minDistance = v.min;
  controls.maxDistance = v.max;
  document.getElementById('btn-view').textContent = name === 'inside' ? '🌂 店外视角' : '🏪 店内视角';
}

let rainOn = true;
function toggleRain() {
  rainOn = !rainOn;
  rain.visible = drips.visible = rainOn;
  for (const r of ripples) r.mesh.visible = rainOn;
  document.getElementById('btn-rain').textContent = rainOn ? '🌧 雨：开' : '🌧 雨：关';
  if (rainAudioOn && !rainOn) toggleRainSound();
  if (!rainOn) document.getElementById('btn-sound').textContent = '🔇 雨声：关';
}

// 合成雨声（WebAudio 滤波噪声，无音频文件）
let audioCtx = null, rainBuf = null, rainSrc = null, rainAudioOn = false;
function buildRainSource() {
  rainSrc = audioCtx.createBufferSource();
  rainSrc.buffer = rainBuf;
  rainSrc.loop = true;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 1400;
  const hp = audioCtx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 250;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.16;
  rainSrc.connect(lp); lp.connect(hp); hp.connect(gain); gain.connect(audioCtx.destination);
}
function toggleRainSound() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const len = audioCtx.sampleRate * 2;
    rainBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = rainBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;   // 类粉红噪声
      data[i] = last * 3.2;
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (rainAudioOn) {
    rainSrc.stop();
    rainSrc = null;
    rainAudioOn = false;
    document.getElementById('btn-sound').textContent = '🔇 雨声：关';
  } else {
    if (!rainOn) toggleRain();
    buildRainSource();
    rainSrc.start();
    rainAudioOn = true;
    document.getElementById('btn-sound').textContent = '🔊 雨声：开';
  }
}

// 点击玻璃门开门
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downPos = null;
function doorHit(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects([doorL, doorR], true).length > 0;
}
function openDoor(hold = 3.5) {
  doorTarget = 1;
  doorHold = hold;
  doorTimer = rand(5, 9);
}
renderer.domElement.addEventListener('pointerdown', e => { downPos = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]);
  downPos = null;
  if (moved < 6 && doorHit(e)) openDoor();
});
renderer.domElement.addEventListener('pointermove', e => {
  document.body.style.cursor = doorHit(e) ? 'pointer' : 'default';
});

document.getElementById('btn-view').addEventListener('click', () => {
  flyTo(currentView === 'inside' ? 'outside' : 'inside');
});
document.getElementById('btn-rain').addEventListener('click', toggleRain);
document.getElementById('btn-sound').addEventListener('click', toggleRainSound);
document.getElementById('btn-door').addEventListener('click', () => openDoor(4));

/* ============================================================
   动画循环
============================================================ */
const clock = new THREE.Clock();
let doorTimer = 2.5;
let doorOpen = 0;
let doorTarget = 0;
let doorHold = 0;

/* ============================================================
   可见性暂停：本场景以 iframe 嵌入 spaces 展厅，被切到后台 tab
   （iframe 被父页设为 visibility:hidden）或用户切走浏览器标签时，
   停止渲染但保留 rAF 循环，恢复时无跳变（dt 被钳制 + 不推进 elapsedTime）。
============================================================ */
let sceneVisible = true;    // 合成结果：IO 相交 且 顶层页面可见
let probeIntersecting = true; // IntersectionObserver 单独状态
{
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;';
  document.body.appendChild(probe);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      probeIntersecting = entries[entries.length - 1].isIntersecting;
      sceneVisible = probeIntersecting && !document.hidden;
    }, { threshold: 0 });
    io.observe(probe);
  }
  document.addEventListener('visibilitychange', () => {
    sceneVisible = probeIntersecting && !document.hidden;
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (!sceneVisible) return; // 不可见：不推进时钟、不渲染（恢复后 dt 被钳制，无跳变）
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // ---- 视角飞行动画 ----
  if (viewAnim) {
    viewAnim.k += dt / 1.5;
    const k = Math.min(viewAnim.k, 1);
    const s = k * k * (3 - 2 * k);
    camera.position.lerpVectors(viewAnim.p0, viewAnim.p1, s);
    controls.target.lerpVectors(viewAnim.t0, viewAnim.t1, s);
    if (k >= 1) viewAnim = null;
  }

  // ---- 雨 ----
  if (rainOn) {
    const rp = rainGeo.attributes.position.array;
    for (let i = 0; i < RAIN_N; i++) {
      rp[i * 3 + 1] -= rainSpd[i] * dt;
      rp[i * 3] += dt * 1.6;
      if (rp[i * 3 + 1] < 0) {
        rp[i * 3] = rand(-18, 18);
        rp[i * 3 + 1] = rand(18, 22);
        rp[i * 3 + 2] = rand(-18, 18);
      }
    }
    rainGeo.attributes.position.needsUpdate = true;

    const dp = dripGeo.attributes.position.array;
    for (let i = 0; i < DRIP_N; i++) {
      dp[i * 3 + 1] -= dripSpd[i] * dt;
      const src = dripSrc[i];
      const groundY = (src.z > 0.8 || src.z < -13.5 || Math.abs(src.x) > 8.3) ? 0.06 : 0.28;
      if (dp[i * 3 + 1] < groundY) {
        dp[i * 3] = src.x + rand(-0.05, 0.05);
        dp[i * 3 + 1] = src.y;
        dp[i * 3 + 2] = src.z;
      }
    }
    dripGeo.attributes.position.needsUpdate = true;

    for (const r of ripples) {
      r.t += dt;
      if (r.t >= r.life) {
        r.t = 0;
        r.life = rand(1.2, 2.0);
        r.spot = puddleSpots[(Math.random() * puddleSpots.length) | 0];
      }
      const k = r.t / r.life;
      r.mesh.position.set(r.spot.x, r.spot.y + 0.015, r.spot.z);
      const s = 0.15 + k * 1.6;
      r.mesh.scale.set(s, s, s);
      r.mesh.material.opacity = (1 - k) * 0.55;
    }
  }

  // ---- 蒸汽 ----
  const sp = steamGeo.attributes.position.array;
  for (let i = 0; i < STEAM_N; i++) {
    steamLife[i] += dt * 0.5;
    if (steamLife[i] > 1) steamLife[i] = 0;
    const l = steamLife[i];
    sp[i * 3] = odenWorld.x + Math.sin(l * 6 + i) * 0.12 * l + rand(-0.01, 0.01);
    sp[i * 3 + 1] = odenWorld.y + l * 1.4;
    sp[i * 3 + 2] = odenWorld.z + Math.cos(l * 5 + i * 2) * 0.1 * l;
  }
  steamGeo.attributes.position.needsUpdate = true;
  steamMat.opacity = 0.28 + Math.sin(t * 2) * 0.06;

  // ---- 自动门 ----
  if (doorHold > 0) {
    doorHold -= dt;
    if (doorHold <= 0) doorTarget = 0;
  } else {
    doorTimer -= dt;
    if (doorTimer <= 0) {
      doorTarget = 1;
      doorHold = rand(2.2, 3.5);
      doorTimer = rand(4, 8);
    }
  }
  doorOpen += (doorTarget - doorOpen) * Math.min(1, dt * 5);
  doorL.position.x = 1.45 - doorOpen * 1.05;
  doorR.position.x = 2.55 + doorOpen * 1.05;
  warm2.intensity = 28 + doorOpen * 12;

  fan.rotation.z += dt * 8;
  vendLight.intensity = 10 + Math.sin(t * 30) * 0.4 + Math.sin(t * 7.3) * 0.5;

  controls.update();
  composer.render();
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
