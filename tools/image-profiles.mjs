// Atlas dimensions retain whole grid cells; backgrounds keep their resolution.
// Alpha stays lossless, including every resized sprite's transparent outline.
export function imageProfile(name){
 const profile={quality:80,alphaQuality:100,effort:6};
 if(name.startsWith('story-')||name==='title-castle-v1')return {...profile,quality:76};
 if(name.startsWith('heroes-level-'))return {...profile,width:768};
 if(name==='worksheet-heroes-v1')return {...profile,width:768};
 if(name.startsWith('hero-effect-'))return {...profile,width:96,quality:88,trim:true};
 if(name.startsWith('cpu-opponent-'))return {...profile,width:768};
 if(name==='hero-collection-panel-v1')return {...profile,width:1152,quality:82};
 if(name==='hero-collection-card-v1')return {...profile,width:384,quality:84};
 if(name.startsWith('fx-flight-'))return {...profile,width:768};
 if(name==='fx-impact-v1'||name==='fx-utility-v1')return {...profile,width:1152};
 if(name==='title-wordmark-v1')return {...profile,quality:88,width:960,trim:true};
 if(name==='menu-button-v1')return {...profile,quality:86,width:960};
 if(name==='hero-eggs-v1')return {...profile,width:960};
 if(name==='icons'||name==='ui')return {...profile,quality:88,width:512};
 if(name==='terrain')return {...profile,width:768};
 if(name==='props'||name.startsWith('tower-heads-')||name==='turret-parts-v1')return {...profile,width:768};
 if(name==='slime'||name==='monster-beetle')return {...profile,width:768};
 if(name.startsWith('monster-'))return {...profile,width:1024};
 if(name.endsWith('-loop-v1')||name==='wall-collapse-v1')return {...profile,width:768};
 return profile;
}
export function transformedImage(sharp,input,profile){
 const pipeline=sharp(input);
 if(profile.trim)pipeline.trim({threshold:1});
 return pipeline.resize({width:profile.width,withoutEnlargement:true});
}
