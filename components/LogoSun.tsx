"use client";

import { useEffect, useRef } from "react";

/*
 * The mark as a sun: rays out of the wordmark, turning clockwise.
 *
 * Rendered by `app/page.tsx` rather than by the layout, so the shader and the
 * loop are in the index's own chunk. It is decoration, and a page you have
 * come to in order to study should not have something moving at the top of it
 * — nor carry the code for it.
 *
 * A fixed, full-viewport canvas rather than a box inside the header, because
 * rays that stop at the header's border read as a rectangle of weather rather
 * than as light. It sits behind the page's text on `-z-10`, which works
 * because the shell in `app/layout.tsx` is `relative z-10` and so opens a
 * stacking context of its own: the canvas goes behind everything in the shell
 * and still in front of the body's paper.
 */

/** Radians a second. A full turn takes a little over three minutes — slow
    enough that you notice it has moved rather than watch it moving. */
const SPEED = 0.033;

/** CSS pixels of paper between the mark's frame and the first ray. */
const PAD = 6;

/** The frame's corner radius over its height, from `tools/wordmark.py`, which
    draws it at RADIUS 16 on a HEIGHT of 76. Taken as a ratio rather than as
    8px because the header could set the mark at another size, and the hole
    has to stay the shape of the thing it is a hole for. */
const MARK_ROUND = 16 / 76;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/*
 * One sector per ray, the ray centred in it and a fixed share of it wide, so
 * every ray is the same and they are evenly spaced.
 *
 * The version before this summed three harmonics (23, 37 and 53) and cut the
 * sum at a level, which gave rays of mixed widths — and, because a ray whose
 * peak only just cleared that level never reached full strength, a second
 * fainter tone as well. A copy of it is in the scratchpad as
 * `LogoSun.three-tone-uneven.tsx`.
 *
 * `atan` grows anticlockwise, so adding time turns the pattern clockwise.
 */
const FRAG = `
precision mediump float;

uniform vec2 uSun;     // mark centre, device pixels, y up from the bottom
uniform float uTime;   // seconds; held at 0 when motion is reduced
uniform vec2 uHalf;    // half the mark's frame, already padded
uniform float uRound;  // that frame's corner radius, padded to match
uniform vec3 uPaper;
uniform vec3 uMark;

const float TAU = 6.2831853;

// How many rays, and how much of each ray's sector the ray itself takes. At
// 0.5 a ray is exactly as wide as the paper beside it.
const float RAYS = 20.0;
const float DUTY = 0.55;

// How far from the paper towards the mark's cream the rays are taken. The
// whole figure is this one flat colour, so it is the only thing setting how
// loud the sun is, and it is meant to be barely there.
const float TINT = 0.20;

void main() {
  vec2 d = gl_FragCoord.xy - uSun;
  float r = length(d);
  float a = atan(d.y, d.x) + uTime * ${SPEED.toFixed(3)};

  // Position within this ray's sector, and how far that is off its centre.
  float off = abs(fract(a * RAYS / TAU) - 0.5);

  // An edge that hard would crawl with jaggies as it turns, so it is softened
  // by about a pixel and no more. A pixel covers roughly 1/r radians this far
  // out, which is this much of a sector.
  float px = (RAYS / TAU) / max(r, 1.0);
  float ray = 1.0 - smoothstep(DUTY * 0.5 - px, DUTY * 0.5 + px, off);

  // The rays start at the mark's own frame rather than at a circle round it:
  // the standard rounded-box distance, negative inside the padded frame and
  // positive out on the paper, cut over a pixel and a half of it so the
  // corners come out round rather than stepped.
  vec2 q = abs(d) - uHalf + uRound;
  float box = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - uRound;
  float lit = smoothstep(0.0, 1.5, box);

  // No outer falloff: they are rays, and they leave by the edge of the window.
  //
  // Written premultiplied, which is what the canvas is composited as. Straight
  // alpha here made every softened pixel — the ray edges, the frame's corners
  // — come out white rather than a step between the two tones, because the
  // compositor read a full-strength cream as though it had already been scaled
  // down by its own alpha and added the paper underneath on top of it.
  float alpha = ray * lit;
  gl_FragColor = vec4(mix(uPaper, uMark, TINT) * alpha, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/** `#rrggbb` from the theme to the 0..1 triple a uniform wants. */
function rgb(value: string): [number, number, number] {
  const hex = value.trim().replace("#", "");
  const n = parseInt(hex, 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function LogoSun() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;

    const gl = (el.getContext("webgl2", { alpha: true, antialias: false }) ||
      el.getContext("webgl", {
        alpha: true,
        antialias: false,
      })) as WebGLRenderingContext | null;
    // No WebGL, no sun. Nothing else on the page depends on it.
    if (!gl) return;

    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!vert || !frag || !program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    // One triangle big enough to cover the clip cube, rather than two making a
    // quad: same pixels, no seam down the diagonal.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    // The premultiplied pair, to match what the shader writes.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const at = (name: string) => gl.getUniformLocation(program, name);
    const uSun = at("uSun");
    const uTime = at("uTime");
    const uHalf = at("uHalf");
    const uRound = at("uRound");

    const theme = getComputedStyle(document.documentElement);
    gl.uniform3fv(at("uPaper"), rgb(theme.getPropertyValue("--color-paper")));
    gl.uniform3fv(at("uMark"), rgb(theme.getPropertyValue("--color-mark")));

    // Device pixels are capped: this is a wash of colour behind the page, and
    // a retina phone gains nothing from four times the fragments.
    const ratio = () => Math.min(window.devicePixelRatio || 1, 1.5);

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = ratio();
      width = Math.round(window.innerWidth * dpr);
      height = Math.round(window.innerHeight * dpr);
      el.width = width;
      el.height = height;
      gl.viewport(0, 0, width, height);
    };

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    const draw = (seconds: number) => {
      const dpr = ratio();
      // The wordmark is in the header, which this component knows nothing
      // about, so ask the page where it currently is. One rect read a frame,
      // and it does have to be every frame: the header scrolls away up the
      // page and the sun goes with it.
      const mark = document
        .querySelector("[data-wordmark]")
        ?.getBoundingClientRect();
      if (!mark) return;

      gl.uniform2f(
        uSun,
        (mark.left + mark.width / 2) * dpr,
        // gl_FragCoord counts up from the bottom of the canvas.
        height - (mark.top + mark.height / 2) * dpr,
      );
      gl.uniform2f(
        uHalf,
        (mark.width / 2 + PAD) * dpr,
        (mark.height / 2 + PAD) * dpr,
      );
      // The frame's radius scales with the mark, and the padding rounds off by
      // its own width again, so the gap round the mark keeps an even thickness
      // instead of pinching at the corners.
      gl.uniform1f(uRound, (mark.height * MARK_ROUND + PAD) * dpr);
      gl.uniform1f(uTime, still.matches ? 0 : seconds);
      // The browser drops the drawing buffer after it has composited a frame,
      // so this is usually clearing something already blank — but that is its
      // choice and not a promise, and the beams are blended: a buffer that did
      // survive would light itself over and over until it was white.
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      draw((now - start) / 1000);
      // Reduced motion still gets the light, it just does not turn: one frame,
      // redrawn only when the page moves under it.
      frame = still.matches ? 0 : requestAnimationFrame(loop);
    };

    // Nothing when the loop is already running, which is why scrolling can
    // ask for a frame without having to know whether it will get a free one.
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };
    // Sizing the canvas throws its buffer away and takes a new one, so it
    // happens when the window changes and not on every scroll event.
    const onResize = () => {
      resize();
      kick();
    };

    resize();
    frame = requestAnimationFrame(loop);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", kick, { passive: true });
    still.addEventListener("change", kick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", kick);
      still.removeEventListener("change", kick);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full print:hidden"
    />
  );
}
