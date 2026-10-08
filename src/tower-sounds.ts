import type {Voice} from './music';

export interface SoundVoice extends Voice{
 endNote?:number;wave?:OscillatorType;cutoff?:number;attack?:number;
}
export type EffectNote=[delay:number,voice:SoundVoice];
const note=(instrument:Voice['instrument'],pitch:number,duration:number,volume:number,delay=0,shape:Omit<SoundVoice,keyof Voice>={}):EffectNote=>[delay,{instrument,note:pitch,duration,volume,...shape}];

// Each weapon has its own timbre and rhythm. Higher grades add quiet layers
// and longer tails, rather than making every shot louder. Times are seconds.
const shots:Record<string,EffectNote[]>={
 basic:[note('sweep',61,.14,.105,0,{endNote:44}),note('noise',68,.055,.055)],
 double:[note('kick',49,.13,.09,0,{endNote:35}),note('kick',46,.13,.075,.065,{endNote:32}),note('noise',65,.07,.06)],
 needle:[note('noise',109,.025,.045),note('sweep',101,.085,.065,0,{endNote:76,wave:'triangle'})],
 pebble:[note('noise',64,.07,.06),note('pluck',65,.14,.075,0,{wave:'triangle'}),note('pluck',72,.09,.035,.045,{wave:'triangle'})],
 frost:[note('noise',94,.14,.045,0,{attack:.025}),note('sweep',78,.15,.055,0,{endNote:102}),note('bell',91,.32,.05,.025),note('bell',98,.24,.026,.085)],
 ice:[note('noise',83,.12,.065),note('sweep',85,.18,.065,0,{endNote:61,wave:'triangle'}),note('bell',94,.4,.045,.025),note('bell',101,.28,.025,.095),note('sweep',79,.16,.025,.045,{endNote:103})],
 catapult:[note('noise',56,.16,.045),note('sweep',63,.29,.045,0,{endNote:41,wave:'sawtooth',cutoff:1600}),note('kick',43,.28,.105,.035,{endNote:28}),note('noise',45,.28,.055,.07),note('bass',40,.28,.035,.075)],
 lightning:[note('noise',105,.035,.065),note('noise',98,.04,.045,.035),note('noise',110,.045,.03,.075),note('sweep',88,.18,.06,0,{endNote:40,wave:'sawtooth',cutoff:7000}),note('bell',98,.29,.03,.045),note('bass',43,.32,.04)],
 crystal:[note('noise',88,.06,.05),note('bell',86,.42,.055),note('bell',93,.39,.035,.025),note('bell',98,.36,.025,.05),note('sweep',74,.22,.04,0,{endNote:98}),note('bell',105,.35,.018,.19)],
 sniper:[note('noise',108,.035,.075),note('kick',55,.16,.08,0,{endNote:38}),note('sweep',105,.26,.04,.018,{endNote:65,wave:'triangle'}),note('noise',90,.1,.02,.085),note('bell',93,.23,.018,.17),note('bell',81,.24,.012,.285)],
 siege:[note('kick',43,.38,.115,0,{endNote:25}),note('noise',58,.2,.06),note('bass',36,.42,.045,.025),note('sweep',62,.23,.035,0,{endNote:30,wave:'triangle'}),note('noise',43,.24,.025,.115),note('bass',31,.3,.022,.26)],
 rune:[note('sweep',68,.27,.05,0,{endNote:104,wave:'triangle'}),note('noise',96,.055,.045),note('bell',81,.54,.045,.015),note('bell',88,.5,.032,.035),note('bell',93,.47,.027,.055),note('bass',45,.35,.04),note('bell',100,.41,.021,.205),note('bell',105,.36,.014,.4)]
};

export function towerShotScore(typeId='basic'):readonly EffectNote[]{return Object.hasOwn(shots,typeId)?shots[typeId]:shots.basic;}
export function towerShotDuration(typeId:string){return Math.max(...towerShotScore(typeId).map(([delay,v])=>delay+v.duration))+.04;}
