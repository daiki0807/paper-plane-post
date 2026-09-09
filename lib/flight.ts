export type Mode = 'practice' | 'adventure';
export const destinations = [
  { name: 'うさぎ', animal: '🐰', distance: 26, color: '#df7659', letter: 'お手紙、ありがとう！ お花がさいたよ。' },
  { name: 'きつね', animal: '🦊', distance: 46, color: '#d2902c', letter: 'ありがとう！ こんど、いっしょにあそぼうね。' },
  { name: 'くま', animal: '🐻', distance: 66, color: '#4b8095', letter: 'お手紙、うれしいな。 またとばしてね！' },
] as const;
export const WINDS = [2, -1, 1, -2, 0] as const;
export function windFor(mode: Mode, delivery: number) { return mode === 'practice' ? 1 : WINDS[delivery % WINDS.length]; }
export function flightDistance(stretch: number, wind: number) { return Math.max(0, Math.min(83, stretch * 7 + wind * 3)); }
export function outcome(distance: number, target: number) { return Math.abs(distance - target) <= 4 ? 'success' : distance < target ? 'short' : 'long'; }
export function groundPoint(distance: number) { return { x: 18 + distance * .91, y: 79 - distance * .65 }; }
export function flightPoint(distance: number, progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  const point = groundPoint(distance * t);
  return { ...point, y: point.y - Math.sin(Math.PI * t) * 17 };
}
export function windLabel(wind: number) { return wind === 0 ? '風なし' : `${wind > 0 ? 'おい風' : 'むかい風'}・${Math.abs(wind) === 1 ? 'よわい' : 'つよい'}`; }
