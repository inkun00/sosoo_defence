export const ROOM_LIFETIME=5*60*1000;
export const ROOM_LEASE=45*1000;
export interface ListedRoom{id:string;title:string;hostName:string;hostUid:string;level:number;protected:boolean;createdAt:number;expiresAt:number;players:number;internet:boolean;}
export function validRoomId(value:unknown):value is string{return typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);}
export function roomOptions(value:unknown){
 const v=value as {title?:unknown;access?:unknown;password?:unknown;internet?:unknown};
 if(!v||typeof v.title!=='string'||v.title.trim().length<2||v.title.trim().length>24||!['public','password'].includes(String(v.access))||typeof v.internet!=='boolean')throw Error('방 이름과 공개 여부를 확인해 주세요.');
 const password=v.access==='password'?v.password:'';
 if(typeof password!=='string'||v.access==='password'&&(password.length<4||password.length>32))throw Error('방 비밀번호는 4~32글자로 입력해 주세요.');
 return {title:v.title.trim(),protected:v.access==='password',password,internet:v.internet};
}
export function roomOpen(room:{expiresAt:number},serverNow:number){return room.expiresAt>serverNow;}
export function publicRoom(id:string,value:Record<string,any>,now:number):ListedRoom{return {id,title:value.title,hostName:value.hostName,hostUid:value.hostUid,level:value.level,protected:value.protected,createdAt:value.createdAt,expiresAt:value.expiresAt,players:value.guestUntil>now?2:1,internet:value.internet};}
