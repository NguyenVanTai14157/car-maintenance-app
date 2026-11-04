import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { subscribeChanges,isRealtimeConnected } from '../services/realtime';
import { useSession } from './session';
export function useData(path:string){
 const {user}=useSession();
 const key=`${user?.id||'guest'}:${path}`;
 const [result,setResult]=useState<{key:string;data:any;error:string}|null>(null);
 const generation=useRef(0);
 const reload=useCallback(async()=>{
  if(!user)return;
  const request=++generation.current;
  try{const data=await api(path);if(request===generation.current)setResult({key,data,error:''});}
  catch(e:any){if(request===generation.current)setResult(previous=>({key,data:previous?.key===key?previous.data:null,error:e.message}));}
 },[path,user,key]);
 useEffect(()=>{
  if(!user)return;
  let debounce:ReturnType<typeof setTimeout>|undefined;
  let running=false,again=false,disposed=false;
  const load=async()=>{
   if(disposed)return;
   if(running){again=true;return;}
   running=true;
   try{do{again=false;await reload();}while(again&&!disposed);}finally{running=false;}
  };
  void load();
  const resource=path.split('/')[1];
  const stop=subscribeChanges(resources=>{
   if(resources.includes('*')||resources.includes(resource)){
    if(debounce)clearTimeout(debounce);
    debounce=setTimeout(()=>void load(),100);
   }
  });
  // Fallback only while disconnected; connection/reconnection always resyncs.
  const timer=setInterval(()=>{if(!isRealtimeConnected())void load();},30000);
  return()=>{disposed=true;stop();clearInterval(timer);if(debounce)clearTimeout(debounce);};
 },[path,reload,user]);
 return{data:result?.key===key?result.data:null,error:result?.key===key?result.error:'',loading:result?.key!==key,reload};
}
