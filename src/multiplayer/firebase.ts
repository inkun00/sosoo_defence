import {initializeApp} from 'firebase/app';
import {getAuth,connectAuthEmulator} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore';
import {getFunctions,connectFunctionsEmulator} from 'firebase/functions';
const env=(import.meta as ImportMeta&{env:Record<string,string|boolean>}).env;
// A public Config switch enables the fully deployed integration. Legacy
// per-service flags remain supported when this switch is absent.
const connected=env.VITE_FIREBASE_ENABLED===undefined?null:env.VITE_FIREBASE_ENABLED==='true';
const local=new URLSearchParams(location.search).get('emulator')==='1'&&['localhost','127.0.0.1'].includes(location.hostname);
const config=local?{apiKey:'demo-decimal-key',authDomain:'demo-decimal-defense.firebaseapp.com',projectId:'demo-decimal-defense',appId:'demo-decimal-app'}:{apiKey:String(env.VITE_FIREBASE_API_KEY||''),authDomain:String(env.VITE_FIREBASE_AUTH_DOMAIN||''),projectId:String(env.VITE_FIREBASE_PROJECT_ID||''),appId:String(env.VITE_FIREBASE_APP_ID||'')};
export const firebaseConfigured=Object.values(config).every(Boolean)&&(local||(connected??(env.VITE_FIREBASE_AUTH_READY!=='false'))),firebaseEmulator=local;
export const lobbyReady=local||(connected??(env.VITE_FIREBASE_LOBBY_READY==='true'));
export const recordsReady=local||(connected??(env.VITE_FIREBASE_RECORDS_READY!=='false'));
const app=firebaseConfigured?initializeApp(config):null;
export const auth=app?getAuth(app):null,firestore=app?getFirestore(app):null,functions=app?getFunctions(app,'asia-northeast3'):null;
if(local&&auth&&firestore&&functions){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(firestore,'127.0.0.1',8080);connectFunctionsEmulator(functions,'127.0.0.1',5001);}
