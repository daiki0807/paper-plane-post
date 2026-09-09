'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronRight, CircleHelp, Flag, Mail, MapPin, RotateCcw, Send, Sparkles, Star, Wind } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { destinations, flightDistance, flightPoint, groundPoint, outcome, windFor, windLabel, type Mode } from '@/lib/flight';

type Result = { stretch: number; wind: number; distance: number; verdict: ReturnType<typeof outcome> };
export default function Home() {
  const [mode, setMode] = useState<Mode>('practice');
  const [delivery, setDelivery] = useState(0);
  const [stretch, setStretch] = useState(3);
  const [flying, setFlying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [previous, setPrevious] = useState<Result | null>(null);
  const [help, setHelp] = useState(false);
  const [stamps, setStamps] = useState<number[]>([]);
  const [imageReady, setImageReady] = useState(false);
  const [imageError, setImageError] = useState(false);
  const flightLock = useRef(false);
  const frame = useRef(0);
  const activeDistance = useRef(0);
  const target = destinations[delivery % 3];
  const wind = windFor(mode, delivery);
  const success = result?.verdict === 'success';
  const currentDistance = flying ? activeDistance.current : result?.distance ?? 0;
  const plane = flightPoint(currentDistance, flying ? progress : result ? 1 : 0);
  const ground = groundPoint(currentDistance * (flying ? progress : result ? 1 : 0));
  const targetPoint = groundPoint(target.distance);
  const practiceComplete = mode === 'practice' && stamps.length === 3;
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function switchMode(next: Mode) {
    if (flightLock.current || next === mode) return;
    setMode(next); setDelivery(0); setResult(null); setPrevious(null); setStamps([]); setProgress(0); setStretch(3);
  }
  function launch(chosenStretch: number = stretch): Promise<Result | null> {
    if (flightLock.current || success || !imageReady) return Promise.resolve(null);
    setStretch(chosenStretch);
    flightLock.current = true;
    const distance = flightDistance(chosenStretch, wind);
    const snapshot: Result = { stretch: chosenStretch, wind, distance, verdict: outcome(distance, target.distance) };
    activeDistance.current = distance;
    setPrevious(result); setResult(null); setFlying(true); setProgress(0);
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 650 : 2900;
    return new Promise(resolve => {
    let start = 0;
    const animate = (time: number) => {
      if (!start) start = time;
      const t = Math.min((time - start) / duration, 1);
      setProgress(t);
      if (t < 1) frame.current = requestAnimationFrame(animate);
      else {
        setFlying(false); setResult(snapshot); flightLock.current = false;
        if (snapshot.verdict === 'success') setStamps(old => old.includes(delivery % 3) ? old : [...old, delivery % 3]);
        requestAnimationFrame(() => resolve(snapshot));
      }
    };
    frame.current = requestAnimationFrame(animate);
    });
  }
  function nextDelivery() {
    if (flightLock.current) return;
    if (practiceComplete) { switchMode('adventure'); return; }
    setDelivery(v => v + 1); setResult(null); setPrevious(null); setProgress(0);
  }
  const agentApi = useRef({ launch, nextDelivery, getState: () => ({ mode, wind, windLabel: windLabel(wind), target: target.name, stretch, flying, result, stamps }) });
  agentApi.current = { launch, nextDelivery, getState: () => ({ mode, wind, windLabel: windLabel(wind), target: target.name, stretch, flying, result, stamps }) };
  useEffect(() => {
    type Tool = { name: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean }; execute: (input: unknown) => unknown };
    const context = (document as Document & { modelContext?: { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Tool) => { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser capability. */ } };
    register({ name: 'read_postal_game', description: 'Read the current wind, recipient, rubber setting, flight result, and stamps.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => agentApi.current.getState() });
    register({ name: 'fly_paper_plane', description: 'Set rubber stretch and fly a letter through the same game action as the launch button. Waits until the flight finishes. If a delivery has succeeded, advance it first.', inputSchema: { type: 'object', properties: { stretch: { type: 'integer', minimum: 1, maximum: 10 } }, required: ['stretch'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async input => {
      if (!input || typeof input !== 'object' || !('stretch' in input) || Object.keys(input).length !== 1) throw new Error('Provide only stretch.');
      const value = (input as { stretch: unknown }).stretch;
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10) throw new Error('Stretch must be an integer from 1 to 10.');
      const flight = await agentApi.current.launch(value);
      if (!flight) throw new Error('Wait for the town or flight to finish, or advance the successful delivery.');
      return flight;
    } });
    register({ name: 'advance_postal_delivery', description: 'After a successful delivery, move to the next recipient; after all three practice deliveries enter adventure mode.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async () => {
      const state = agentApi.current.getState();
      if (state.flying || state.result?.verdict !== 'success') throw new Error('Complete this delivery first.');
      agentApi.current.nextDelivery();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return agentApi.current.getState();
    } });
    return () => lifecycle.abort();
  }, []);
  const path = Array.from({ length: 41 }, (_, i) => {
    const p = flightPoint(currentDistance, (i / 40) * (flying ? progress : 1));
    return `${i ? 'L' : 'M'} ${p.x * 10} ${p.y * 6.6667}`;
  }).join(' ');

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Send size={25} fill="currentColor" /></span><div><span className="eyebrow">かぜのまち</span><h1>紙ひこうき郵便局</h1></div></div>
        <button className="help-button" onClick={() => setHelp(true)}><CircleHelp size={20}/><span>あそびかた</span></button>
      </header>
      <div className="game-heading">
        <Tabs value={mode} onValueChange={v => switchMode(v as Mode)} className="mode-tabs">
          <TabsList aria-label="あそぶモード"><TabsTrigger value="practice" disabled={flying}><Flag size={17}/>れんしゅう</TabsTrigger><TabsTrigger value="adventure" disabled={flying}><Sparkles size={17}/>風のぼうけん</TabsTrigger></TabsList>
        </Tabs>
        <p className="mode-note">{mode === 'practice' ? '風はいつも同じ。ゴムをかえてみよう。' : '配達ごとに風がかわるよ。とばす前に見てね。'}</p>
      </div>

      <div className="play-layout">
        <section className={`town-section ${success ? 'celebrating' : ''}`} aria-label="紙ひこうきが飛ぶ、どうぶつのまち">
          <div className="town-world">
            <img className="town-art" src="./town.png" alt="斜め上から見た、木々と小川に囲まれた立体的などうぶつのまち" draggable={false} onLoad={() => setImageReady(true)} onError={() => setImageError(true)}/>
            {!imageReady && <div className="image-status">{imageError ? <>まちをひらけませんでした。<button onClick={() => window.location.reload()}>もう一度ひらく</button></> : 'まちをひらいているよ…'}</div>}
            <div className="wind-card"><span className="wind-icon"><Wind size={25}/></span><div><span className="mini-label">いまの風</span><strong>{windLabel(wind)}</strong></div><span className={`wind-direction ${wind < 0 ? 'reverse' : ''}`}>{wind === 0 ? '—' : <ArrowRight size={25}/>}</span></div>
            <span className="town-name"><span/> こもれびタウン</span>
            <svg className="flight-overlay" viewBox="0 0 1000 666.67" aria-hidden="true">
              <path d={`M 180 526.67 L ${targetPoint.x * 10} ${targetPoint.y * 6.6667}`} stroke="white" strokeWidth="2" strokeDasharray="3 11" opacity=".65" />
              {(flying || result) && <path d={path} stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="3 10"/>}
            </svg>
            {destinations.map((home, i) => {
              const point = groundPoint(home.distance);
              const selected = i === delivery % 3;
              return <div key={home.name} className={`destination ${selected ? 'selected' : ''}`} style={{ left: `${point.x}%`, top: `${point.y}%` }}>
                <div className="landing-ring"/>
                <div className="home-label"><span className="animal" aria-hidden="true">{home.animal}</span><span>{home.name}さん</span>{stamps.includes(i) && <Check size={16}/>}</div>
                {selected && <span className="destination-tag"><MapPin size={13}/>ここに とどけよう</span>}
              </div>;
            })}
            <div className="launch-label" style={{ left: '18%', top: '85%' }}><Mail size={15}/>ここから</div>
            {previous && <div className="previous-marker" style={{ left: `${groundPoint(previous.distance).x}%`, top: `${groundPoint(previous.distance).y}%` }}><span/>前の着地点</div>}
            <div className="plane-shadow" style={{ left: `${ground.x}%`, top: `${ground.y}%`, opacity: flying ? .19 : .3, transform: `translate(-50%,-50%) scale(${flying ? .8 : 1})` }}/>
            <div className={`paper-plane ${flying ? 'airborne' : ''} ${success ? 'landed-success' : ''}`} style={{ left: `${plane.x}%`, top: `${plane.y}%`, transform: `translate(-50%, -50%) rotate(${flying ? -8 + progress * 17 : 8}deg) scale(${flying ? 1.15 : 1})` }}><Send aria-hidden="true" strokeWidth={1.3} fill="#fffdf4" color="#3d7b84"/></div>
            {success && <div className="delivery-bubble" style={{ left: `${targetPoint.x}%`, top: `${targetPoint.y - 17}%` }}><Mail size={19}/>とどいた！<Sparkles size={18}/></div>}
            <div className="map-caption"><span className="map-dot"/>黄色のわっかが、手紙をとどける場所だよ。</div>
          </div>
          <div className="field-footer"><span><Send size={16}/>{flying ? 'すーっと、風にのって…' : success ? 'お手紙、とどけてくれてありがとう！' : 'ゴムをひいて、手紙をとばそう。'}</span><span className="mail-count"><Mail size={15}/>{stamps.length} / 3</span></div>
        </section>

        <aside className="control-panel" aria-label="紙ひこうきのそうさ">
          <div className="mission"><span className="section-label">こんどの おとどけ先</span><div className="recipient"><span className="recipient-face" aria-hidden="true">{target.animal}</span><div><h2>{target.name}さん</h2><span>{delivery % 3 === 0 ? 'ちかくのおうち' : delivery % 3 === 1 ? 'まんなかのおうち' : 'とおくのおうち'}</span></div><span className="letter-badge"><Mail size={23}/></span></div></div>
          <div className="stretch-control">
            <div className="control-title"><label id="stretch-label">ゴムをひく長さ</label><span className="stretch-value">{stretch}<small>めもり</small></span></div>
            <div className="rubber-diagram" aria-hidden="true"><svg viewBox="0 0 270 70"><path d={`M 22 18 L ${40 + stretch * 18} 36 L 22 54`} stroke="#ddad69" strokeWidth="6" fill="none" strokeLinecap="round"/><path d="M 22 14 L 22 58" stroke="#55767a" strokeWidth="9" strokeLinecap="round"/><circle cx={40 + stretch * 18} cy="36" r="7" fill="#ed795a"/></svg><span>← ひっぱる長さ →</span></div>
            <Slider aria-labelledby="stretch-label" value={[stretch]} min={1} max={10} step={1} onValueChange={value => setStretch(Array.isArray(value) ? value[0] : value)} disabled={flying || success} className="stretch-slider"/>
            <div className="range-labels"><span>みじかい</span><span>ながい</span></div>
            <div className="quick-powers">{[{p:3,t:'みじかく'},{p:6,t:'まんなか'},{p:9,t:'ながく'}].map(({p,t}) => <button key={p} aria-pressed={stretch === p} disabled={flying || success} onClick={() => setStretch(p)}>{t}</button>)}</div>
          </div>
          <div className={`feedback ${success ? 'success' : ''}`} role="status" aria-live="polite" aria-atomic="true">
            {flying ? <><strong>手紙を はこんでいるよ</strong><p>どこまで とぶかな？</p></> : success ? <><strong><Check size={19}/>おとどけ せいこう！</strong><p>{target.letter}</p></> : result ? <><strong>{result.verdict === 'short' ? 'あと少し！ とどかなかったね' : 'おっと！ とびこしたね'}</strong><p>ゴムを{result.verdict === 'short' ? 'もう少し長く' : '少し短く'}すると、どうなるかな？</p></> : <><strong>黄色のわっかを ねらおう</strong><p>{mode === 'practice' && delivery === 0 ? 'まずは「3めもり」で とばしてみよう。' : '風を見て、ゴムの長さを えらぼう。'}</p></>}
          </div>
          {success ? <button className="fly-button next" onClick={nextDelivery}>{practiceComplete ? '風のぼうけんへ' : 'つぎのお手紙へ'}<ArrowRight size={23}/></button> : <button className="fly-button" disabled={flying || !imageReady} onClick={() => void launch()}><Send size={23}/>{flying ? 'とんでいるよ…' : result ? 'もう一度 とばす' : 'とばす！'}</button>}
          <div className="last-flight">{result || previous ? <><RotateCcw size={14}/><span>前のきろく：{(result ?? previous)!.stretch}めもり・{(result ?? previous)!.distance}歩ぶん</span></> : <><span className="tiny-dot"/>なんどでも やりなおせるよ</>}</div>
        </aside>
      </div>
      <footer className="bottom-bar"><div className="stamp-book"><span>おとどけスタンプ</span><div>{destinations.map((d,i) => <span className={`stamp ${stamps.includes(i) ? 'earned' : ''}`} key={d.name} aria-label={`${d.name}さん ${stamps.includes(i) ? '配達ずみ' : 'これから'}`}>{stamps.includes(i) ? <Star size={18} fill="currentColor"/> : <Mail size={17}/>}</span>)}</div>{practiceComplete && <strong>3つ とどいたね！</strong>}</div><span className="learning-note">風とゴムの力で、どこまでとぶかな。</span></footer>
      <Dialog open={help} onOpenChange={setHelp}><DialogContent className="help-dialog" showCloseButton={false}><DialogTitle>紙ひこうき郵便局の あそびかた</DialogTitle><DialogDescription>どうぶつたちに、手紙をとどけよう。</DialogDescription><ol className="help-steps"><li><span>1</span><div><strong>とどけ先と、風を見る</strong><p>黄色のわっかを ねらおう。</p></div></li><li><span>2</span><div><strong>ゴムをひく長さを えらぶ</strong><p>丸いボタンを動かすか、下の3つのボタンをおしてね。</p></div></li><li><span>3</span><div><strong>「とばす！」をおす</strong><p>とどかなかったら、長さをかえて もう一度！</p></div></li></ol><p className="help-science">れんしゅうは風が同じ。ぼうけんは、配達ごとに風がかわるよ。とばしている間と、やりなおすときは同じ風だよ。</p><details><summary>先生へ</summary><p>風とゴムの働きを考えるため、飛び方を簡略化したゲームです。実際の紙飛行機は形や姿勢などでも飛び方が変わります。ゴムの1〜10はゲーム内の目盛りです。風とゴムを同時に変えず、結果を比べる声かけにお使いください。記録はこの画面を開いている間だけ残ります。</p></details><DialogClose className="fly-button">あそぶ<ChevronRight size={20}/></DialogClose></DialogContent></Dialog>
    </main>
  );
}
