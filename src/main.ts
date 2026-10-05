const mode=new URLSearchParams(location.search).get('mode');
if(mode==='duel')import('./multiplayer/controller');
else if(mode==='adventure')import('./controller');
else import('./title');
