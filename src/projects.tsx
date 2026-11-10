import {createContext,useContext} from "react";
export type Project = {id:string;name:string;challenge:string;updatedAt:string};
export type Session = Record<string, unknown>;
export const SessionContext=createContext<{data:Session;set:(key:string,value:unknown)=>void}>({data:{},set:()=>{}});
export function useField<T,>(key:string, initial:T):[T,(value:T|((old:T)=>T))=>void] {const c=useContext(SessionContext); const value=(c.data[key] ?? initial) as T; return [value,v=>c.set(key,typeof v==="function"?(v as (old:T)=>T)(value):v)];}
export async function api<T>(url:string,method="GET",body?:unknown):Promise<T>{const r=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw Error(r.status===409?"conflict":`Request failed (${r.status})`);return r.json();}
