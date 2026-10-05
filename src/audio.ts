export class Sound{
 context?:AudioContext;music=false;sfx=true;private timer?:number;private note=0;
 resume(){this.context??=new AudioContext();void this.context.resume();}
 tone(freq:number,duration=.12,volume=.025){if(!this.context)return;const c=this.context,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration);}
 play(type:string){if(!this.sfx)return;if(type==='shot')this.tone(280,.06,.008);else if(type==='kill')this.tone(640,.17);else if(type==='wall')this.tone(880,.25);else if(type==='invalid')this.tone(150,.08,.009);}
 setMusic(enabled:boolean){this.music=enabled;if(this.timer)clearInterval(this.timer);if(enabled){const notes=[261.6,329.6,392,329.6,293.7,349.2,440,349.2];this.timer=window.setInterval(()=>{if(document.hidden)return;this.tone(notes[this.note++%notes.length],.7,.007);},760);}}
}
