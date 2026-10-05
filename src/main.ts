const mode=new URLSearchParams(location.search).get('mode');
if(mode==='duel')import('./multiplayer/controller');
else if(mode==='adventure')import('./controller');
else if(mode==='worksheet')import('./worksheet-controller');
else import('./title');
