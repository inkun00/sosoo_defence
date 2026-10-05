const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const {ensure}=require('firebase-tools/lib/ensureApiEnabled');
const {Client}=require('firebase-tools/lib/apiv2');
const identity=require('firebase-tools/lib/gcp/identityPlatform');
const project='sosoo-defense-20261005';
(async()=>{const account=getGlobalDefaultAccount();if(!account)throw Error('Firebase CLI login required');await requireAuth({project,user:account.user,tokens:account.tokens},true);
 for(const api of ['firestore.googleapis.com','identitytoolkit.googleapis.com']){await ensure(project,api,'game-setup',true);console.log('API enabled:',api);}
 const client=new Client({urlPrefix:'https://identitytoolkit.googleapis.com',apiVersion:'v2'});
 try{await identity.getConfig(project);}catch(e){if(/CONFIGURATION_NOT_FOUND|404|not found/i.test(e.message))await client.post(`projects/${project}/identityPlatform:initializeAuth`,{});else throw e;}
 const config=await identity.updateConfig(project,{signIn:{email:{enabled:true,passwordRequired:true}},authorizedDomains:['localhost','127.0.0.1',`${project}.firebaseapp.com`,`${project}.web.app`]},'signIn.email,authorizedDomains');
 console.log(JSON.stringify({project,emailPasswordEnabled:config.signIn?.email?.enabled,domains:config.authorizedDomains,tier:config.subtype||config.tier||null}));
 const billing=await require('firebase-tools/lib/gcp/cloudbilling').checkBillingEnabled(project);console.log('Billing enabled:',billing);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
