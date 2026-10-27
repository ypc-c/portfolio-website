'use strict';
/* =============================================================================
   js/chiptune.js
   8-bit 音乐（WebAudio 合成）与音乐按钮
   上下文：core.js 提供的 $ / $$ / store / toast 为全局共享，本文件依赖其先加载。
   ============================================================================= */

/* ================= 8-bit 音乐 ================= */
const Chiptune = (() => {
  let ctx = null, master = null, noiseBuf = null;
  let playing = false, timer = null, step = 0, nextT = 0;
  const TEMPO = 0.135;
  const NOTE = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 };
  function f(n){
    const m = n.match(/^([A-G]#?)(-?\d)$/);
    return 440 * Math.pow(2, (NOTE[m[1]] + (parseInt(m[2], 10) + 1) * 12 - 69) / 12);
  }
  const LEAD = [
    'G4','C5','E5','G5','E5','C5','E5','G5',
    'A4','C5','E5','A5','E5','C5','E5','A5',
    'F4','A4','C5','F5','C5','A4','C5','F5',
    'G4','B4','D5','G5','F5','D5','B4','G4'
  ];
  const BASS = ['C3','C3','G2','G2','A2','A2','F2','F2','F2','F2','C3','C3','G2','G2','B2','B2'];
  function ensure(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if(ctx.state === 'suspended') ctx.resume();
    return true;
  }
  function tone(freq, t, dur, type, vol){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, hp){
    const s = ctx.createBufferSource(), g = ctx.createGain(), f1 = ctx.createBiquadFilter();
    s.buffer = noiseBuf;
    f1.type = 'highpass'; f1.frequency.value = hp || 3000;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f1); f1.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }
  function kick(t){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.12);
  }
  function schedule(){
    while(nextT < ctx.currentTime + 0.14){
      const t = nextT, i = step;
      const lf = f(LEAD[i]);
      tone(lf, t, TEMPO * 0.92, 'square', 0.085);
      if(i % 2 === 0) tone(f(BASS[i / 2]), t, TEMPO * 1.8, 'triangle', 0.14);
      noise(t, 0.03, 0.028, 6000);
      if(i % 8 === 4) noise(t, 0.07, 0.06, 1800);
      if(i % 4 === 0) kick(t);
      nextT += TEMPO;
      step = (step + 1) % 32;
    }
  }
  function start(){
    if(!ensure()) return false;
    playing = true; step = 0; nextT = ctx.currentTime + 0.06;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.3);
    timer = setInterval(schedule, 30);
    return true;
  }
  function stop(){
    playing = false;
    if(timer){ clearInterval(timer); timer = null; }
    if(ctx){
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    }
  }
  function sfx(kind){
    if(!ensure()) return;
    const t = ctx.currentTime + 0.01;
    if(kind === 'coin'){ tone(880, t, 0.07, 'square', 0.12); tone(1318, t + 0.07, 0.1, 'square', 0.12); }
    else if(kind === 'hit'){ tone(220, t, 0.16, 'sawtooth', 0.16); noise(t, 0.12, 0.1, 900); }
    else if(kind === 'over'){ tone(392, t, 0.14, 'square', 0.12); tone(311, t + 0.15, 0.14, 'square', 0.12); tone(233, t + 0.3, 0.24, 'square', 0.12); }
    else if(kind === 'start'){ tone(523, t, 0.08, 'square', 0.1); tone(659, t + 0.08, 0.08, 'square', 0.1); tone(784, t + 0.16, 0.12, 'square', 0.1); }
  }
  return {
    toggle(){ return playing ? (stop(), false) : (start(), true); },
    isPlaying(){ return playing; },
    sfx
  };
})();
(function musicButton(){
  const btn = $('#btn-music');
  function render(on){
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? '音乐：开' : '音乐：关';
  }
  render(store.get('pw_music', false));
  btn.addEventListener('click', () => {
    const on = Chiptune.toggle();
    render(on);
    store.set('pw_music', on);
    toast(on ? '音乐播放中' : '音乐已暂停');
  });
})();
