import manifest from './art-urls.json';
export function artURL(name:string){const art=manifest[name as keyof typeof manifest];if(!art)throw Error('Unknown image: '+name);return art;}
if(typeof document!=='undefined'){
 for(const [css,name]of [['--title-art','title-castle-v1'],['--menu-art','menu-button-v1'],['--egg-art','hero-eggs-v1']])document.documentElement.style.setProperty(css,`url("${artURL(name)}")`);
}
