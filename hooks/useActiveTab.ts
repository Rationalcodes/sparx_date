import {useState,useEffect} from "react";

export function useActiveTab(key:string , defaultValue:string){
   
    const[tab,setTab]=useState<string>(() => {
         if(typeof window !=='undefined'){
        const saved=localStorage.getItem(key);
        return saved??defaultValue;
         }
         return defaultValue
    })
useEffect(()=>{
    localStorage.setItem(key,tab);
},[key,tab])
return[tab,setTab] as const
}