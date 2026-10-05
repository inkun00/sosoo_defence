if(new URLSearchParams(location.search).get('mode')==='duel')import('./multiplayer/controller');
else import('./controller');
