<script setup lang="ts">
// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import { computed, ref, watch } from 'vue'
import { usePreferredReducedMotion, useRafFn } from '@vueuse/core'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type Side = 'left' | 'right'
type Stroke = 'forehand' | 'backhand'
type Ease = 'smooth' | 'in' | 'out'
interface Point { x: number; y: number }
// One stroke keyframe, `at` seconds from contact. The players are seen from
// above like the court: angles are in degrees around the body, 0 = towards the
// net and positive towards the player's right (racket side of a right-hander).
interface StrokeKey {
  at: number
  /** Direction of the racket hand from the body centre. */
  hand: number
  /** Distance of the racket hand from the body centre. */
  reach: number
  /** Direction the racket points from the hand. */
  racket: number
  /** Shoulder rotation; positive brings the right shoulder back. */
  turn: number
  /** Direction of the free hand when it is off the racket. */
  free: number
  /** 1 when the free hand holds the racket (ready position, backhand). */
  onRacket: number
  ease?: Ease
}
interface Point3 { x: number; y: number; z: number }
interface Pose {
  /** Drawing data, already projected to the screen. */
  shadow: string
  legs: string
  torso: string
  shoulders: string
  racketArm: string
  freeArm: string
  handle: string
  racketFace: string
  head: { x: number; y: number; r: number }
  /** Racket centre in court coordinates, where the ball is met. */
  racketHead: Point3
}

// -----------------------------------------------------------------------------
// Rally model
// Everything is drawn top-down in centimetres (ITF court: 2377 x 1097, singles
// 823, service lines 640 from the net). Players are exaggerated in size so they
// read at this scale. Shots alternate every SHOT seconds: the hitter swings,
// the ball bounces once past the net and reaches the other racket exactly at
// contact, while each player runs to the next hit spot.
// -----------------------------------------------------------------------------
const SHOT = 1.6
// The ball reaches the bounce in BOUNCE_TIME of the shot but covers
// BOUNCE_DISTANCE of the court: fast off the racket, slower after the bounce.
const BOUNCE_TIME = 0.56
const BOUNCE_DISTANCE = 0.72
const GRAVITY = 7000
// Heights (cm) of the figure; exaggerated like the widths so it reads at
// this scale. The racket meets the ball at hand height.
const HIP_Z = 150
const SHOULDER_Z = 235
const HEAD_Z = 285
const HAND_Z = 175
const BASELINE_X: Record<Side, number> = { left: -190, right: 2567 }
const HIT_SPOTS: Record<Side, number[]> = { left: [330, 820, 180], right: [800, 260, 920] }
const COURT_CENTER_Y = 548.5
const STEP_IN = 70
const SHOULDER = 52
const BONE = 78
const RACKET_LENGTH = 150
const DEG = Math.PI / 180

const READY: Omit<StrokeKey, 'at'> = { hand: 0, reach: 95, racket: 0, turn: 0, free: 0, onRacket: 1 }
// Forehand: unit turn with the racket back on the right and the free arm
// towards the ball, swing round the right side to contact in front, finish
// across the body over the left shoulder.
const FOREHAND: StrokeKey[] = [
  { at: -0.9, ...READY },
  { at: -0.5, hand: 115, reach: 105, racket: 165, turn: 55, free: -15, onRacket: 0 },
  { at: -0.2, hand: 125, reach: 110, racket: 178, turn: 60, free: -10, onRacket: 0 },
  { at: 0, hand: 45, reach: 125, racket: 15, turn: 5, free: -60, onRacket: 0, ease: 'in' },
  { at: 0.15, hand: -35, reach: 110, racket: -70, turn: -35, free: -100, onRacket: 0, ease: 'out' },
  { at: 0.3, hand: -95, reach: 95, racket: -150, turn: -55, free: -110, onRacket: 0.5 },
  { at: 0.9, ...READY },
]
// Two-handed backhand: the same path on the left side, both hands on the grip.
const BACKHAND: StrokeKey[] = FOREHAND.map((key) => ({
  ...key,
  hand: -key.hand,
  racket: -key.racket,
  turn: -key.turn,
  free: -key.free,
  onRacket: 1,
}))

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount
const smooth = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t) }
const easeIn = (value: number) => clamp01(value) ** 2
const easeOut = (value: number) => 1 - (1 - clamp01(value)) ** 2
const mod = (value: number, size: number) => ((value % size) + size) % size
const EASINGS: Record<Ease, (value: number) => number> = { smooth, in: easeIn, out: easeOut }

function sideOffset(side: Side): number {
  return side === 'left' ? 0 : SHOT
}

// Index and time of the side's hit closest to `t` (each side hits every 2 shots).
function nearestHit(side: Side, t: number): { index: number; time: number } {
  const index = Math.round((t - sideOffset(side)) / (2 * SHOT))
  return { index, time: sideOffset(side) + index * 2 * SHOT }
}

function hitSpot(side: Side, index: number): number {
  const spots = HIT_SPOTS[side]
  return spots[mod(index, spots.length)]!
}

// Facing the net, the left player's right is down the screen, the right
// player's is up: the ball on that side is a forehand.
function strokeFor(side: Side, index: number): Stroke {
  const facing = side === 'left' ? 1 : -1
  return (hitSpot(side, index) - COURT_CENTER_Y) * facing > 0 ? 'forehand' : 'backhand'
}

// Lateral position: hold after the follow-through, run, then set before the next hit.
function lateral(side: Side, t: number): number {
  const local = t - sideOffset(side)
  const index = Math.floor(local / (2 * SHOT))
  const since = local - index * 2 * SHOT
  const progress = smooth((since - 0.35) / (2 * SHOT - 0.35 - 0.55))
  return lerp(hitSpot(side, index), hitSpot(side, index + 1), progress)
}

function strokeKey(stroke: Stroke, delta: number): Omit<StrokeKey, 'at'> {
  const keys = stroke === 'forehand' ? FOREHAND : BACKHAND
  if (delta <= keys[0]!.at || delta >= keys[keys.length - 1]!.at) return READY
  const next = keys.findIndex((key) => key.at > delta)
  const from = keys[next - 1]!
  const to = keys[next]!
  const amount = EASINGS[to.ease ?? 'smooth']((delta - from.at) / (to.at - from.at))
  return {
    hand: lerp(from.hand, to.hand, amount),
    reach: lerp(from.reach, to.reach, amount),
    racket: lerp(from.racket, to.racket, amount),
    turn: lerp(from.turn, to.turn, amount),
    free: lerp(from.free, to.free, amount),
    onRacket: lerp(from.onRacket, to.onRacket, amount),
  }
}

// Local frame: x towards the net, y towards the player's right.
function polar(origin: Point, length: number, degrees: number): Point {
  return { x: origin.x + length * Math.cos(degrees * DEG), y: origin.y + length * Math.sin(degrees * DEG) }
}

// Two-bone reach from shoulder to hand, elbow bent away from the body.
function elbowFor(shoulder: Point, hand: Point): Point {
  const dx = hand.x - shoulder.x
  const dy = hand.y - shoulder.y
  const length = Math.hypot(dx, dy) || 1
  const along = Math.min(length, BONE * 2 - 0.5) / 2
  const across = Math.sqrt(BONE * BONE - along * along)
  const mid = { x: shoulder.x + (dx / length) * along, y: shoulder.y + (dy / length) * along }
  const normal = { x: -dy / length, y: dx / length }
  const outward = normal.x * mid.x + normal.y * mid.y >= 0 ? 1 : -1
  return { x: mid.x + normal.x * across * outward, y: mid.y + normal.y * across * outward }
}

// -----------------------------------------------------------------------------
// Camera
// A perspective camera behind the near sideline, tilted CAMERA_TILT degrees
// from straight above, looks across the court.
// -----------------------------------------------------------------------------
const CAMERA_TILT = 32
const CAMERA_DISTANCE = 4200
const pitch = (90 - CAMERA_TILT) * DEG
const target: Point3 = { x: 1188.5, y: 548.5, z: 0 }
// On the centre line, so the perspective stays symmetric.
const CAMERA_OFFSET_X = 0
const camera: Point3 = {
  x: target.x + CAMERA_OFFSET_X,
  y: target.y + CAMERA_DISTANCE * Math.cos(pitch),
  z: CAMERA_DISTANCE * Math.sin(pitch),
}
const forward = { y: -Math.cos(pitch), z: -Math.sin(pitch) }
const up = { y: -Math.sin(pitch), z: Math.cos(pitch) }

function project(point: Point3): Point & { scale: number } {
  const dx = point.x - camera.x
  const dy = point.y - camera.y
  const dz = point.z - camera.z
  const depth = dy * forward.y + dz * forward.z
  const scale = CAMERA_DISTANCE / depth
  return { x: target.x + dx * scale, y: target.y - (dy * up.y + dz * up.z) * scale, scale }
}

function path(points: Point3[], closed = false): string {
  return points
    .map((point, index) => {
      const screen = project(point)
      return `${index ? 'L' : 'M'}${screen.x.toFixed(1)} ${screen.y.toFixed(1)}`
    })
    .join('') + (closed ? 'Z' : '')
}

function ground(x: number, y: number, z = 0): Point3 {
  return { x, y, z }
}

function rectangle(x: number, y: number, width: number, height: number): string {
  return path([ground(x, y), ground(x + width, y), ground(x + width, y + height), ground(x, y + height)], true)
}

function ellipse(center: Point3, rx: number, ry: number, degrees: number, toWorld: (point: Point) => Point): string {
  const angle = degrees * DEG
  const points = Array.from({ length: 20 }, (_, index) => {
    const t = (index / 20) * Math.PI * 2
    const local = {
      x: center.x + rx * Math.cos(t) * Math.cos(angle) - ry * Math.sin(t) * Math.sin(angle),
      y: center.y + rx * Math.cos(t) * Math.sin(angle) + ry * Math.sin(t) * Math.cos(angle),
    }
    const world = toWorld(local)
    return { x: world.x, y: world.y, z: center.z }
  })
  return path(points, true)
}

// Static court geometry, projected once.
const SURROUND = { x: -420, y: -260, width: 3217, height: 1617 }
const corners = [
  ground(SURROUND.x, SURROUND.y),
  ground(SURROUND.x + SURROUND.width, SURROUND.y),
  ground(SURROUND.x + SURROUND.width, SURROUND.y + SURROUND.height),
  ground(SURROUND.x, SURROUND.y + SURROUND.height),
].map(project)
const viewBox = (() => {
  const xs = corners.map((corner) => corner.x)
  const ys = [...corners.map((corner) => corner.y), project(ground(1188.5, -91, 107)).y]
  const minX = Math.min(...xs)
  const minY = Math.min(...ys) - 20
  return `${minX.toFixed(0)} ${minY.toFixed(0)} ${(Math.max(...xs) - minX).toFixed(0)} ${(Math.max(...ys) - minY).toFixed(0)}`
})()
const courtGeometry = {
  surround: rectangle(SURROUND.x, SURROUND.y, SURROUND.width, SURROUND.height),
  surface: rectangle(0, 0, 2377, 1097),
  lines: [
    rectangle(0, 0, 2377, 1097),
    path([ground(0, 137), ground(2377, 137)]),
    path([ground(0, 960), ground(2377, 960)]),
    path([ground(548.5, 137), ground(548.5, 960)]),
    path([ground(1828.5, 137), ground(1828.5, 960)]),
    path([ground(548.5, 548.5), ground(1828.5, 548.5)]),
    path([ground(0, 548.5), ground(30, 548.5)]),
    path([ground(2347, 548.5), ground(2377, 548.5)]),
  ].join(''),
  // Net: 107 cm at the posts, 91.4 cm at the centre strap.
  netBand: path([
    ground(1188.5, -91), ground(1188.5, 1188),
    ground(1188.5, 1188, 107), ground(1188.5, 548.5, 91.4), ground(1188.5, -91, 107),
  ], true),
  netTop: path([ground(1188.5, -91, 107), ground(1188.5, 548.5, 91.4), ground(1188.5, 1188, 107)]),
  posts: path([ground(1188.5, -91), ground(1188.5, -91, 107)]) + path([ground(1188.5, 1188), ground(1188.5, 1188, 107)]),
}

function pose(side: Side, t: number): Pose {
  const hit = nearestHit(side, t)
  const delta = t - hit.time
  const key = strokeKey(strokeFor(side, hit.index), delta)
  const speed = Math.abs(lateral(side, t + 0.02) - lateral(side, t - 0.02)) / 0.04
  const run = clamp01(speed / 520)
  const phase = t * 12
  const lunge = 1 - smooth(Math.abs(delta) / 0.45)

  const center: Point = { x: 0, y: 0 }
  const rightShoulder = polar(center, SHOULDER, 90 - key.turn)
  const leftShoulder = polar(center, SHOULDER, -90 - key.turn)
  const hand = polar(center, key.reach, key.hand)
  const racketCenter = polar(hand, RACKET_LENGTH, key.racket)
  const grip = polar(hand, 22, key.racket)
  const freeOff = polar(center, 120, key.free)
  const freeHand = {
    x: lerp(freeOff.x, grip.x, key.onRacket),
    y: lerp(freeOff.y, grip.y, key.onRacket),
  }
  // Feet: strides while running, a split step forward into the shot.
  const stride = Math.sin(phase) * 34 * run
  const lift = Math.max(0, Math.cos(phase)) * 30 * run
  const leftFoot = { x: 10 + lunge * 45 + stride, y: -34 }
  const rightFoot = { x: -10 - stride, y: 34 }

  // Local frame (x to the net, y to the player's right) to court coordinates.
  const facing = side === 'left' ? 1 : -1
  const feet = { x: BASELINE_X[side] + facing * STEP_IN * lunge, y: lateral(side, t) }
  const world = (point: Point): Point => ({ x: feet.x + facing * point.x, y: feet.y + facing * point.y })
  const at = (point: Point, z: number): Point3 => ({ ...world(point), z })

  const hip = at({ x: 6 + lunge * 10, y: 0 }, HIP_Z - lunge * 18)
  const neck = at({ x: 10 + lunge * 18, y: 0 }, SHOULDER_Z - lunge * 18)
  const shoulderZ = SHOULDER_Z - lunge * 18
  const headCenter = project(at({ x: 14 + lunge * 22, y: 0 }, HEAD_Z - lunge * 18))
  const racketWorld = world(racketCenter)

  return {
    shadow: ellipse({ x: 0, y: 0, z: 0 }, 75, 60, 0, world),
    legs: path([at(leftFoot, Math.max(0, -lift)), at({ x: leftFoot.x * 0.6 + 12, y: -20 }, HIP_Z * 0.5 + lift), hip])
      + path([at(rightFoot, lift * 0.5), at({ x: rightFoot.x * 0.6 + 12, y: 20 }, HIP_Z * 0.5), hip]),
    torso: path([hip, neck]),
    shoulders: path([at(leftShoulder, shoulderZ), at(rightShoulder, shoulderZ)]),
    racketArm: path([at(rightShoulder, shoulderZ), at(elbowFor(rightShoulder, hand), (shoulderZ + HAND_Z) / 2), at(hand, HAND_Z)]),
    freeArm: path([at(leftShoulder, shoulderZ), at(elbowFor(leftShoulder, freeHand), (shoulderZ + HAND_Z) / 2), at(freeHand, HAND_Z)]),
    handle: path([at(hand, HAND_Z), at(polar(hand, RACKET_LENGTH - 48, key.racket), HAND_Z)]),
    racketFace: ellipse({ ...racketCenter, z: HAND_Z }, 48, 34, key.racket, world),
    head: { x: headCenter.x, y: headCenter.y, r: 30 * headCenter.scale },
    racketHead: { ...racketWorld, z: HAND_Z },
  }
}

// Ball of shot k: from the hitter's racket to the receiver's racket at their
// contact, with one bounce after the net. Flight is ballistic under constant
// gravity; the bounce costs both vertical and horizontal speed.
function ball(t: number): { ball: Point; radius: number; shadow: Point; shadowScale: number; lift: number } {
  const shot = Math.floor(t / SHOT)
  const hitter: Side = mod(shot, 2) === 0 ? 'left' : 'right'
  const receiver: Side = hitter === 'left' ? 'right' : 'left'
  const start = pose(hitter, shot * SHOT).racketHead
  const end = pose(receiver, (shot + 1) * SHOT).racketHead
  const progress = t / SHOT - shot
  const before = BOUNCE_TIME
  const after = 1 - BOUNCE_TIME
  const travelled = progress < before
    ? BOUNCE_DISTANCE * progress / before
    : BOUNCE_DISTANCE + (1 - BOUNCE_DISTANCE) * (progress - before) / after
  let height: number
  if (progress < before) {
    const launch = (GRAVITY * before * before / 2 - start.z) / before
    height = start.z + launch * progress - GRAVITY * progress * progress / 2
  } else {
    const since = progress - before
    const rebound = end.z / after + GRAVITY * after / 2
    height = rebound * since - GRAVITY * since * since / 2
  }
  const x = lerp(start.x, end.x, travelled)
  const y = lerp(start.y, end.y, travelled)
  const screen = project({ x, y, z: height })
  const shadow = project({ x, y, z: 0 })
  return { ball: screen, radius: 40 * screen.scale, shadow, shadowScale: shadow.scale, lift: clamp01(height / 400) }
}

// -----------------------------------------------------------------------------
// State and animation loop
// -----------------------------------------------------------------------------
const reducedMotion = usePreferredReducedMotion()
const time = ref(SHOT * 0.45)
let startedAt: number | null = null

const { pause, resume } = useRafFn(({ timestamp }) => {
  startedAt ??= timestamp - time.value * 1000
  time.value = (timestamp - startedAt) / 1000
}, { immediate: false })

watch(reducedMotion, (preference) => {
  if (preference === 'reduce') {
    pause()
  } else {
    startedAt = null
    resume()
  }
}, { immediate: true })

// -----------------------------------------------------------------------------
// Derived state
// -----------------------------------------------------------------------------
const players = computed(() => [pose('left', time.value), pose('right', time.value)])
const rally = computed(() => ball(time.value))
const spin = computed(() => (time.value * 540) % 360)
</script>

<template>
  <svg class="court" :viewBox="viewBox" role="presentation">
    <!-- Section: Court -->
    <path class="court-surround" :d="courtGeometry.surround" />
    <path class="court-surface" :d="courtGeometry.surface" />
    <path class="court-lines" :d="courtGeometry.lines" />

    <!-- Section: Ball shadow (on the ground, under the net and players) -->
    <ellipse
      class="ball-shadow"
      :cx="rally.shadow.x"
      :cy="rally.shadow.y"
      :rx="(44 - rally.lift * 12) * rally.shadowScale"
      :ry="(20 - rally.lift * 6) * rally.shadowScale"
      :opacity="1 - rally.lift * 0.55"
    />

    <!-- Section: Players (feet on the court, heights projected by the camera) -->
    <g v-for="(player, index) in players" :key="index" class="player">
      <path class="player-shadow" :d="player.shadow" />
      <path :d="player.legs" />
      <path :d="player.torso" class="player-torso" />
      <path :d="player.freeArm" />
      <path :d="player.shoulders" class="player-shoulders" />
      <path :d="player.racketArm" />
      <path :d="player.handle" class="player-handle" />
      <path :d="player.racketFace" class="player-racket" />
      <circle class="player-head" :cx="player.head.x" :cy="player.head.y" :r="player.head.r" />
    </g>

    <!-- Section: Net -->
    <path class="court-net-band" :d="courtGeometry.netBand" />
    <path class="court-net" :d="courtGeometry.netTop" />
    <path class="court-posts" :d="courtGeometry.posts" />

    <!-- Section: Ball -->
    <g class="ball" :transform="`translate(${rally.ball.x} ${rally.ball.y}) rotate(${spin}) scale(${rally.radius / 44})`">
      <circle r="44" />
      <path d="M-30 -32C-8 -12 -8 12 -30 32M30 -32C8 -12 8 12 30 32" />
    </g>
  </svg>
</template>

<style scoped>
.court { display: block; width: 100%; height: auto; }
.court-surround { fill: var(--showcase-deep); opacity: 0.55; }
.court-surface { fill: var(--showcase-main); }
.court-lines { fill: none; stroke: rgb(var(--color-white-rgb) / 80%); stroke-width: 10; stroke-linejoin: round; }
.court-net-band { fill: rgb(var(--color-white-rgb) / 28%); stroke: none; }
.court-net { fill: none; stroke: rgb(var(--color-white-rgb) / 95%); stroke-width: 10; stroke-linecap: round; }
.court-posts { stroke: rgb(var(--color-white-rgb) / 95%); stroke-width: 12; stroke-linecap: round; }
.player { fill: none; stroke: var(--color-white); stroke-width: 16; stroke-linecap: round; stroke-linejoin: round; }
.player-torso { stroke-width: 24; }
.player-shoulders { stroke-width: 26; }
.player-head { fill: var(--color-white); stroke: none; }
.player-handle { stroke-width: 9; }
.player-racket { stroke-width: 8; fill: rgb(var(--color-white-rgb) / 20%); }
.player-shadow { fill: rgb(var(--color-black-rgb) / 22%); stroke: none; }
.ball circle { fill: var(--showcase-accent); }
.ball path { fill: none; stroke: var(--showcase-deep); stroke-width: 6; stroke-linecap: round; opacity: 0.55; }
.ball-shadow { fill: rgb(var(--color-black-rgb) / 35%); }
</style>
