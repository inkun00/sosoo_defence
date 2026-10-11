import type {Phase} from './model';

export type MusicTrack='title'|'opening'|'battle'|'boss'|'boss-dread'|'ending'|'victory'|'defeat';
export interface Voice{instrument:'pluck'|'bell'|'pad'|'strings'|'bass'|'kick'|'snare'|'hat'|'noise'|'sweep';note:number;duration:number;volume:number;endNote?:number;wave?:OscillatorType;cutoff?:number;attack?:number;}
export const TRACKS:Record<MusicTrack,{name:string;bpm:number}>={
 title:{name:'마지막 불꽃 · 성의 부름',bpm:84},opening:{name:'균열과 수호자의 맹세',bpm:96},battle:{name:'소수의 수호자',bpm:124},boss:{name:'균열왕의 행진',bpm:140},'boss-dread':{name:'저주의 성 · 어둠의 맥박',bpm:82},ending:{name:'돌아온 아침',bpm:80},victory:{name:'수호자의 승리',bpm:104},defeat:{name:'다시 밝히는 불꽃',bpm:72}
};
export function adventureMusicTrack(stageId:number,phase:Phase):MusicTrack{
 if(phase==='won')return 'victory';
 if(phase==='lost')return 'defeat';
 if(phase==='review')return 'title';
 if(stageId>=10)return 'boss-dread';
 return phase==='ready'?'title':'battle';
}

// A slow heartbeat under unresolved semitones and tritones replaces the march.
// Long voices fade gently; the quiet middle of each bar leaves shots audible.
function bossDreadStep(step:number):Voice[]{
 const beat=30/TRACKS['boss-dread'].bpm,bar=Math.floor(step/8)%16,slot=step%8,phrase=Math.floor(bar/4),voices:Voice[]=[];
 const add=(instrument:Voice['instrument'],note:number,duration:number,volume:number,shape:Partial<Pick<Voice,'endNote'|'wave'|'cutoff'|'attack'>>={})=>voices.push({instrument,note,duration,volume,...shape});
 if(slot===0){
  add('pad',38,beat*8.4,.033,{attack:.5,cutoff:340});
  add('pad',44,beat*7.8,.019,{attack:.7,cutoff:460});
  add('bass',26,beat*6.5,.084,{attack:.08,endNote:25.8,cutoff:180});
  add('strings',50,beat*7.4,.024,{attack:.5,cutoff:720});
  add('strings',bar%4===1?51:49.84,beat*7.6,.015,{attack:.65,cutoff:620});
 }
 if(slot===0||slot===1||bar%2===0&&(slot===4||slot===5))add('kick',32,slot%4===0?.32:.22,slot%4===0?.105:.059);
 if(slot===2||slot===6){
  const motif=[62,61,56,55],note=motif[bar%4]+(slot===6?-1:0);
  add('strings',note,beat*(phrase===2?2.8:2.2),.022,{attack:.16,cutoff:850,endNote:note-.18});
 }
 if(bar%4===3&&slot===6)add('bell',74,beat*5,.014,{attack:.035,cutoff:1700});
 if(bar%4===2&&slot===5)add('noise',68,beat*4.5,.009,{attack:.4});
 return voices;
}
const minorChords=[[50,57,62,65],[46,53,58,62],[48,55,60,64],[45,52,57,61]];
const majorChords=[[53,60,65,69],[48,55,60,64],[50,57,62,65],[46,53,58,62]];
// A common five-note motif connects the title, combat and dawn arrangements.
const minorMelody=[[74,0,77,76,74,0,69,0],[72,0,74,77,76,0,74,0],[69,0,72,74,72,0,67,0],[69,0,73,76,74,0,0,0]];
const majorMelody=[[77,0,81,79,77,0,72,0],[76,0,79,77,76,0,72,0],[74,0,77,81,79,0,77,0],[74,0,72,70,72,0,77,0]];
export function scoreStep(track:MusicTrack,step:number):Voice[]{
 if(track==='boss-dread')return bossDreadStep(step);
 const beat=30/TRACKS[track].bpm,bar=Math.floor(step/8)%16,slot=step%8,phrase=Math.floor(bar/4),bright=track==='ending'||track==='victory',combat=track==='battle'||track==='boss';
 const chords=bright?majorChords:minorChords,chord=chords[bar%4],melody=(bright?majorMelody:minorMelody)[bar%4],voices:Voice[]=[];
 const add=(instrument:Voice['instrument'],note:number,duration:number,volume:number)=>voices.push({instrument,note,duration,volume});
 if(slot===0){for(const note of chord.slice(1))add(combat?'strings':'pad',note,beat*7.8,combat?.025:.035);add('bass',chord[0]-12,beat*(combat?1.6:5),.095);}
 if(combat&&slot===4)add('bass',chord[0]-12,beat*1.7,.085);
 if(slot%2===0||combat||phrase===2)add('pluck',chord[1+slot%3]+12,beat*1.8,combat?.027:.032);
 const note=melody[slot];if(note&&(track!=='opening'||phrase>0||slot===0))add(bright?'bell':combat?'strings':'bell',note+(phrase===2?12:0),beat*(combat?1.5:2.6),combat?.05:.045);
 if(track==='opening'&&phrase>0&&slot===0)add('kick',36,.32,.10);
 if(combat){if(slot===0||slot===4||(track==='boss'&&slot===6))add('kick',36,.22,.16);if(slot===2||slot===6)add('snare',60,.115,.07);add('hat',90,.035,slot%2?.024:.035);}
 if(track==='ending'&&phrase>0&&slot===0)add('bell',chord[3]+24,beat*5,.035);
 if(track==='victory'&&slot%2===0)add('kick',36,.20,.09);
 if(track==='defeat')return voices.filter(v=>v.instrument==='pad'||v.instrument==='bass'||slot===0).map(v=>({...v,volume:v.volume*.65}));
 return voices;
}
