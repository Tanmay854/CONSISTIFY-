import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Scissors } from "lucide-react";

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

/** Encode an AudioBuffer slice to MP3 (mono/stereo, 128kbps) using lamejs. */
const encodeMp3 = async (buf: AudioBuffer, start: number, end: number, onProgress: (p: number) => void): Promise<Blob> => {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const channels = Math.min(2, buf.numberOfChannels);
  const rate = buf.sampleRate;
  const s0 = Math.floor(start * rate);
  const s1 = Math.min(buf.length, Math.floor(end * rate));
  const enc = new Mp3Encoder(channels, rate, 128);

  const l = buf.getChannelData(0);
  const r = channels > 1 ? buf.getChannelData(1) : null;
  const chunk = 1152 * 20;
  const out: Uint8Array[] = [];
  const to16 = (f: Float32Array, from: number, len: number) => {
    const a = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      const v = Math.max(-1, Math.min(1, f[from + i] || 0));
      a[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    return a;
  };

  for (let i = s0; i < s1; i += chunk) {
    const len = Math.min(chunk, s1 - i);
    const left = to16(l, i, len);
    const right = r ? to16(r, i, len) : null;
    const data = right ? enc.encodeBuffer(left, right) : enc.encodeBuffer(left);
    if (data.length > 0) out.push(new Uint8Array(data));
    onProgress((i - s0) / Math.max(1, s1 - s0));
    // yield to keep UI responsive
    if (((i - s0) / chunk) % 8 === 0) await new Promise((res) => setTimeout(res, 0));
  }
  const last = enc.flush();
  if (last.length > 0) out.push(new Uint8Array(last));
  onProgress(1);
  return new Blob(out as BlobPart[], { type: "audio/mpeg" });
};

const AudioTrimDialog = ({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (f: File) => void;
}) => {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    urlRef.current = URL.createObjectURL(file);
    (async () => {
      try {
        const ab = await file.arrayBuffer();
        const AC: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        const decoded: AudioBuffer = await new Promise((res, rej) => {
          const p = ctx.decodeAudioData(ab.slice(0), res, rej) as unknown as Promise<AudioBuffer> | undefined;
          if (p && typeof p.then === "function") p.then(res, rej);
        });
        if (cancelled) return;
        setBuffer(decoded);
        setEnd(decoded.duration);
        // waveform peaks
        const ch = decoded.getChannelData(0);
        const N = 160;
        const step = Math.floor(ch.length / N) || 1;
        const arr: number[] = [];
        for (let i = 0; i < N; i++) {
          let max = 0;
          for (let j = 0; j < step; j += 8) {
            const v = Math.abs(ch[i * step + j] || 0);
            if (v > max) max = v;
          }
          arr.push(max);
        }
        const peak = Math.max(...arr, 0.01);
        setPeaks(arr.map((v) => v / peak));
        ctx.close();
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not decode audio");
      }
    })();
    return () => {
      cancelled = true;
      try { URL.revokeObjectURL(urlRef.current); } catch { /* empty */ }
    };
  }, [file]);

  // keep playback inside selection
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setCur(a.currentTime);
      if (a.currentTime >= end) { a.pause(); a.currentTime = start; setPlaying(false); }
    };
    a.addEventListener("timeupdate", onTime);
    return () => a.removeEventListener("timeupdate", onTime);
  }, [start, end]);

  const dur = buffer?.duration ?? 0;
  const selLen = Math.max(0, end - start);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); return; }
    if (a.currentTime < start || a.currentTime >= end) a.currentTime = start;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const apply = async () => {
    if (!buffer) return;
    setWorking(true); setErr(null); setProgress(0);
    try {
      audioRef.current?.pause(); setPlaying(false);
      const blob = await encodeMp3(buffer, start, end, setProgress);
      const base = file.name.replace(/\.[^.]+$/, "");
      onDone(new File([blob], `${base}-trimmed.mp3`, { type: "audio/mpeg" }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-xl flex flex-col" style={{ height: "100dvh" }}>
      <header className="px-5 py-3 flex items-center justify-between border-b border-border shrink-0">
        <button onClick={onCancel} aria-label="Cancel"><X size={20} className="text-foreground" /></button>
        <h3 className="text-foreground font-bold text-sm">Trim Audio</h3>
        <span className="w-5" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        <audio ref={audioRef} src={urlRef.current} preload="metadata" />

        {!buffer && !err && <p className="text-muted-foreground text-sm text-center py-10">Loading audio…</p>}
        {err && <p className="text-destructive text-sm text-center">{err}</p>}

        {buffer && (
          <>
            <div className="relative h-24 rounded-xl bg-secondary/40 border border-border/50 overflow-hidden flex items-center gap-[1px] px-1">
              {peaks.map((p, i) => {
                const t = (i / peaks.length) * dur;
                const inSel = t >= start && t <= end;
                return (
                  <div key={i} className="flex-1 rounded-full" style={{
                    height: `${Math.max(3, p * 88)}%`,
                    backgroundColor: inSel ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground) / 0.3)",
                  }} />
                );
              })}
              <div className="absolute inset-y-0 w-[2px] bg-[#facc15]" style={{ left: `${dur ? (cur / dur) * 100 : 0}%` }} />
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono mb-1">
                  <span>Start</span><span>{fmt(start)}</span>
                </div>
                <input type="range" min={0} max={Math.max(0.1, dur)} step={0.1} value={start}
                  onChange={(e) => setStart(Math.min(Number(e.target.value), end - 1))}
                  className="w-full accent-foreground" />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono mb-1">
                  <span>End</span><span>{fmt(end)}</span>
                </div>
                <input type="range" min={0} max={Math.max(0.1, dur)} step={0.1} value={end}
                  onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 1))}
                  className="w-full accent-foreground" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button onClick={toggle}
                className="w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center active:scale-95 transition-transform">
                {playing ? <Pause size={22} className="fill-background" /> : <Play size={22} className="fill-background ml-0.5" />}
              </button>
            </div>

            <p className="text-center text-muted-foreground text-xs font-mono">
              Selection {fmt(selLen)} · Original {fmt(dur)}
            </p>
          </>
        )}
      </div>

      <div className="px-5 pt-3 shrink-0 border-t border-border space-y-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        {working && (
          <div className="h-1 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-foreground transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        <button
          onClick={apply}
          disabled={!buffer || working || selLen < 1}
          className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ backgroundColor: "#facc15", color: "#000" }}
        >
          <Scissors size={16} /> {working ? `Trimming ${Math.round(progress * 100)}%` : "Trim & Upload"}
        </button>
        <button onClick={() => onDone(file)} disabled={working}
          className="w-full h-11 rounded-xl bg-secondary text-foreground text-sm font-semibold disabled:opacity-40">
          Upload full audio
        </button>
      </div>
    </div>
  );
};

export default AudioTrimDialog;
