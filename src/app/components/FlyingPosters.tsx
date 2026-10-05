'use client';

import { useEffect, useRef } from 'react';
import { Renderer, Camera, Transform, Plane, Program, Mesh, Texture } from 'ogl';
import type { Renderer as RendererType } from 'ogl';

import './FlyingPosters.css';

type ScreenSize = { width: number; height: number };
type GL = RendererType['gl'];

const vertexShader = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform float uPosition;
uniform float uTime;
uniform float uSpeed;
uniform vec3 distortionAxis;
uniform vec3 rotationAxis;
uniform float uDistortion;

varying vec2 vUv;
varying vec3 vNormal;

float PI = 3.141592653589793238;
mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat4(
      oc * axis.x * axis.x + c,         oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
      oc * axis.x * axis.y + axis.z * s,oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
      oc * axis.z * axis.x - axis.y * s,oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
      0.0,                              0.0,                                0.0,                                1.0
    );
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
  mat4 m = rotationMatrix(axis, angle);
  return (m * vec4(v, 1.0)).xyz;
}

float qinticInOut(float t) {
  return t < 0.5
    ? 16.0 * pow(t, 5.0)
    : -0.5 * abs(pow(2.0 * t - 2.0, 5.0)) + 1.0;
}

void main() {
  vUv = uv;

  float norm = 0.5;
  vec3 newpos = position;
  float offset = (dot(distortionAxis, position) + norm / 2.) / norm;
  float localprogress = clamp(
    (fract(uPosition * 5.0 * 0.01) - 0.01 * uDistortion * offset) / (1. - 0.01 * uDistortion),
    0.,
    2.
  );
  localprogress = qinticInOut(localprogress) * PI;
  newpos = rotate(newpos, rotationAxis, localprogress);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newpos, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform vec2 uImageSize;
uniform vec2 uPlaneSize;
uniform sampler2D tMap;

varying vec2 vUv;

void main() {
  vec2 imageSize = uImageSize;
  vec2 planeSize = uPlaneSize;

  float imageAspect = imageSize.x / imageSize.y;
  float planeAspect = planeSize.x / planeSize.y;
  vec2 scale = vec2(1.0, 1.0);

  if (planeAspect > imageAspect) {
      scale.x = imageAspect / planeAspect;
  } else {
      scale.y = planeAspect / imageAspect;
  }

  vec2 uv = vUv * scale + (1.0 - scale) * 0.5;

  gl_FragColor = texture2D(tMap, uv);
}
`;

function AutoBind(
  self: object,
  { include, exclude }: { include?: (string | RegExp)[]; exclude?: (string | RegExp)[] } = {}
): void {
  const getAllProperties = (object: object): Set<[object, string | symbol]> => {
    const properties = new Set<[object, string | symbol]>();
    let proto: object | null = object;
    do {
      for (const key of Reflect.ownKeys(proto)) {
        properties.add([proto, key]);
      }
      proto = Reflect.getPrototypeOf(proto);
    } while (proto && proto !== Object.prototype);
    return properties;
  };

  const filter = (key: string | symbol) => {
    const match = (pattern: string | RegExp) =>
      typeof pattern === 'string' ? key === pattern : pattern.test(String(key));

    if (include) return include.some(match);
    if (exclude) return !exclude.some(match);
    return true;
  };

  for (const [object, key] of getAllProperties(self.constructor.prototype)) {
    if (key === 'constructor' || !filter(key)) continue;
    const descriptor = Reflect.getOwnPropertyDescriptor(object, key);
    if (descriptor && typeof descriptor.value === 'function') {
      const holder = self as Record<string | symbol, unknown>;
      holder[key] = (descriptor.value as (...args: unknown[]) => unknown).bind(self);
    }
  }
}

function lerp(p1: number, p2: number, t: number) {
  return p1 + (p2 - p1) * t;
}

function map(num: number, min1: number, max1: number, min2: number, max2: number, round = false) {
  const num1 = (num - min1) / (max1 - min1);
  const num2 = num1 * (max2 - min2) + min2;
  return round ? Math.round(num2) : num2;
}

type MediaParams = {
  gl: GL;
  geometry: Plane;
  scene: Transform;
  screen: ScreenSize;
  viewport: ScreenSize;
  image: string;
  length: number;
  index: number;
  planeWidth: number;
  planeHeight: number;
  distortion: number;
};

class Media {
  extra = 0;
  gl: GL;
  geometry: Plane;
  scene: Transform;
  screen: ScreenSize;
  viewport: ScreenSize;
  image: string;
  length: number;
  index: number;
  planeWidth: number;
  planeHeight: number;
  distortion: number;
  program!: Program;
  plane!: Mesh;
  padding = 0;
  height = 0;
  heightTotal = 0;
  y = 0;

  constructor({ gl, geometry, scene, screen, viewport, image, length, index, planeWidth, planeHeight, distortion }: MediaParams) {
    this.gl = gl;
    this.geometry = geometry;
    this.scene = scene;
    this.screen = screen;
    this.viewport = viewport;
    this.image = image;
    this.length = length;
    this.index = index;
    this.planeWidth = planeWidth;
    this.planeHeight = planeHeight;
    this.distortion = distortion;

    this.createShader();
    this.createMesh();
    this.onResize();
  }

  createShader() {
    const texture = new Texture(this.gl, {
      generateMipmaps: false,
    });

    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      fragment: fragmentShader,
      vertex: vertexShader,
      uniforms: {
        tMap: { value: texture },
        uPosition: { value: 0 },
        uPlaneSize: { value: [0, 0] },
        uImageSize: { value: [0, 0] },
        uSpeed: { value: 0 },
        rotationAxis: { value: [0, 1, 0] },
        distortionAxis: { value: [1, 1, 0] },
        uDistortion: { value: this.distortion },
        uViewportSize: { value: [this.viewport.width, this.viewport.height] },
        uTime: { value: 0 },
      },
      cullFace: false,
    });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSize.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program,
    });
    this.plane.setParent(this.scene);
  }

  setScale() {
    this.plane.scale.x = (this.viewport.width * this.planeWidth) / this.screen.width;
    this.plane.scale.y = (this.viewport.height * this.planeHeight) / this.screen.height;

    this.plane.position.x = 0;
    this.plane.program.uniforms.uPlaneSize.value = [this.plane.scale.x, this.plane.scale.y];
  }

  onResize({ screen, viewport }: { screen?: ScreenSize; viewport?: ScreenSize } = {}) {
    if (screen) this.screen = screen;
    if (viewport) {
      this.viewport = viewport;
      this.plane.program.uniforms.uViewportSize.value = [this.viewport.width, this.viewport.height];
    }
    this.setScale();

    this.padding = 5;
    this.height = this.plane.scale.y + this.padding;
    this.heightTotal = this.height * this.length;

    this.y = -this.heightTotal / 2 + (this.index + 0.5) * this.height;
  }

  update(scroll: { current: number }) {
    this.plane.position.y = this.y - scroll.current - this.extra;

    const position = map(this.plane.position.y, -this.viewport.height, this.viewport.height, 5, 15);

    this.program.uniforms.uPosition.value = position;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = scroll.current;

    const planeHeight = this.plane.scale.y;
    const viewportHeight = this.viewport.height;

    const topEdge = this.plane.position.y + planeHeight / 2;
    const bottomEdge = this.plane.position.y - planeHeight / 2;

    if (topEdge < -viewportHeight / 2) {
      this.extra -= this.heightTotal;
    } else if (bottomEdge > viewportHeight / 2) {
      this.extra += this.heightTotal;
    }
  }
}

type CanvasParams = {
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  items: string[];
  planeWidth: number;
  planeHeight: number;
  distortion: number;
  scrollEase: number;
  cameraFov: number;
  cameraZ: number;
};

class PosterCanvas {
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  items: string[];
  planeWidth: number;
  planeHeight: number;
  distortion: number;
  scroll: { ease: number; current: number; target: number; last: number };
  cameraFov: number;
  cameraZ: number;
  screen: ScreenSize = { width: 1, height: 1 };
  viewport: ScreenSize = { width: 1, height: 1 };
  renderer!: Renderer;
  gl!: GL;
  camera!: Camera;
  scene!: Transform;
  planeGeometry!: Plane;
  medias?: Media[];
  isDown = false;
  start = 0;
  dragStart = 0;
  offset = 0;
  idle = 0;
  lastTime = performance.now();
  alive = true;
  raf = 0;

  constructor({ container, canvas, items, planeWidth, planeHeight, distortion, scrollEase, cameraFov, cameraZ }: CanvasParams) {
    this.container = container;
    this.canvas = canvas;
    this.items = items;
    this.planeWidth = planeWidth;
    this.planeHeight = planeHeight;
    this.distortion = distortion;
    this.scroll = {
      ease: scrollEase,
      current: 0,
      target: 0,
      last: 0,
    };
    this.cameraFov = cameraFov;
    this.cameraZ = cameraZ;

    AutoBind(this);

    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();

    this.createGeometry();
    this.createMedias();
    this.update();
    this.addEventListeners();
  }

  createRenderer() {
    this.renderer = new Renderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });
    this.gl = this.renderer.gl;
  }

  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = this.cameraFov;
    this.camera.position.z = this.cameraZ;
  }

  createScene() {
    this.scene = new Transform();
  }

  createGeometry() {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 1,
      widthSegments: 100,
    });
  }

  createMedias() {
    this.medias = this.items.map((image, index) => {
      return new Media({
        gl: this.gl,
        geometry: this.planeGeometry,
        scene: this.scene,
        screen: this.screen,
        viewport: this.viewport,
        image,
        length: this.items.length,
        index,
        planeWidth: this.planeWidth,
        planeHeight: this.planeHeight,
        distortion: this.distortion,
      });
    });
  }

  onResize() {
    const rect = this.container.getBoundingClientRect();
    this.screen = {
      width: rect.width,
      height: rect.height,
    };

    this.renderer.setSize(this.screen.width, this.screen.height);

    this.camera.perspective({
      aspect: this.gl.canvas.width / this.gl.canvas.height,
    });

    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;

    this.viewport = { height, width };

    if (this.medias) {
      this.medias.forEach((media) => media.onResize({ screen: this.screen, viewport: this.viewport }));
    }
  }

  onTouchDown(e: MouseEvent | TouchEvent) {
    this.isDown = true;
    this.dragStart = this.offset;
    this.start = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;
  }

  onTouchMove(e: MouseEvent | TouchEvent) {
    if (!this.isDown) return;
    const y = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;
    this.offset = this.dragStart + (this.start - y) * 0.1;
  }

  onTouchUp() {
    this.isDown = false;
  }

  // Posters advance with the section's own position in the viewport, so normal
  // page scrolling drives the effect, plus a gentle drift to keep it alive.
  updateAutoTarget() {
    const rect = this.container.getBoundingClientRect();
    const viewH = window.innerHeight || 1;
    const progress = (viewH - rect.top) / (viewH + rect.height);
    const range = this.medias?.[0]?.heightTotal ?? 0;
    this.scroll.target = progress * range + this.idle + this.offset;
  }

  update() {
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.idle += dt * 0.6;
    this.updateAutoTarget();
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);

    if (this.medias) {
      this.medias.forEach((media) => media.update(this.scroll));
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    if (this.alive) this.raf = requestAnimationFrame(this.update);
  }

  // Listeners are scoped to the container so the posters never hijack page scrolling.
  addEventListeners() {
    window.addEventListener('resize', this.onResize);

    this.container.addEventListener('mousedown', this.onTouchDown);
    this.container.addEventListener('mousemove', this.onTouchMove);
    window.addEventListener('mouseup', this.onTouchUp);

    this.container.addEventListener('touchstart', this.onTouchDown);
    this.container.addEventListener('touchmove', this.onTouchMove);
    this.container.addEventListener('touchend', this.onTouchUp);
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mouseup', this.onTouchUp);

    this.container.removeEventListener('mousedown', this.onTouchDown);
    this.container.removeEventListener('mousemove', this.onTouchMove);

    this.container.removeEventListener('touchstart', this.onTouchDown);
    this.container.removeEventListener('touchmove', this.onTouchMove);
    this.container.removeEventListener('touchend', this.onTouchUp);
  }
}

type FlyingPostersProps = {
  items?: string[];
  planeWidth?: number;
  planeHeight?: number;
  distortion?: number;
  scrollEase?: number;
  cameraFov?: number;
  cameraZ?: number;
  className?: string;
};

export default function FlyingPosters({
  items = [],
  planeWidth = 320,
  planeHeight = 320,
  distortion = 3,
  scrollEase = 0.06,
  cameraFov = 45,
  cameraZ = 20,
  className = '',
}: FlyingPostersProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<PosterCanvas | null>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    instanceRef.current = new PosterCanvas({
      container: containerRef.current,
      canvas: canvasRef.current,
      items,
      planeWidth,
      planeHeight,
      distortion,
      scrollEase,
      cameraFov,
      cameraZ,
    });

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [items, planeWidth, planeHeight, distortion, scrollEase, cameraFov, cameraZ]);

  return (
    <div ref={containerRef} className={`posters-container ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} className="posters-canvas" />
    </div>
  );
}
