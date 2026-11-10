import { useEffect, useRef, useState } from "react";
import { AppButton, Icon } from "./ui";
export function VoiceInput({projectId,onThoughts,onAdvance,onActiveChange}:{projectId:string;onThoughts:(thoughts:string[],advance:boolean)=>void;onAdvance:()=>boolean;onActiveChange:(active:boolean)=>void}) {
 const recorder=useRef<MediaRecorder|null>(null), audio=useRef<Blob|null>(null), timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [status,setStatus]=useState("idle"),[error,setError]=useState("");
 const callbacks=useRef({onThoughts,onAdvance,onActiveChange});callbacks.current={onThoughts,onAdvance,onActiveChange};
 const canvasRef=useRef<HTMLCanvasElement|null>(null);
 const contextRef=useRef<AudioContext|null>(null);
 const frameRef=useRef<number>(0);
 const advanceRef=useRef(false);
 function animate(stream:MediaStream) {
  const context=new AudioContext(); contextRef.current=context;
  const analyser=context.createAnalyser(); analyser.fftSize=256;
  context.createMediaStreamSource(stream).connect(analyser);
  const samples=new Uint8Array(analyser.frequencyBinCount);
  function draw(){
   const canvas=canvasRef.current, paint=canvas?.getContext("2d");
   if(canvas&&paint){
    const ratio=window.devicePixelRatio||1; const width=canvas.clientWidth, height=canvas.clientHeight;
    canvas.width=width*ratio;canvas.height=height*ratio;paint.scale(ratio,ratio);
    analyser.getByteTimeDomainData(samples);paint.clearRect(0,0,width,height);
    paint.strokeStyle="#6948bb";paint.lineWidth=3;paint.lineCap="round";
    const bars=48, gap=width/bars;
    for(let i=0;i<bars;i++){const value=Math.abs(samples[Math.floor(i*samples.length/bars)]-128)/128;const size=Math.max(3,Math.min(height-12,value*height*3));const x=gap*(i+.5);paint.beginPath();paint.moveTo(x,(height-size)/2);paint.lineTo(x,(height+size)/2);paint.stroke();}
   }
   frameRef.current=requestAnimationFrame(draw);
  }
  void context.resume();draw();
 }

 function release(){cancelAnimationFrame(frameRef.current);void contextRef.current?.close();contextRef.current=null;recorder.current?.stream.getTracks().forEach(t=>t.stop());if(timer.current)clearTimeout(timer.current);}
 useEffect(()=>()=>{release();callbacks.current.onActiveChange(false)},[]);
 async function process(advance:boolean){setStatus("processing");setError("");try{const form=new FormData();form.append("audio",audio.current!);form.append("projectId",projectId);const response=await fetch("/api/voice-thoughts",{method:"POST",body:form});if(!response.ok){const failure=await response.json() as {error?:string};throw Error(failure.error || "Could not process recording.");}const result=await response.json() as {thoughts:string[]};audio.current=null;callbacks.current.onThoughts(result.thoughts,advance);setStatus("idle");callbacks.current.onActiveChange(false);if(advance){if(callbacks.current.onAdvance())setTimeout(()=>void start(),100);}}catch(error){setStatus("error");setError(`${error instanceof Error ? error.message : "Could not process recording."} Retry or discard it.`);}}
 async function start(){setError("");setStatus("connecting");callbacks.current.onActiveChange(true);try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const r=new MediaRecorder(stream);recorder.current=r;const chunks:Blob[]=[];r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};r.onstop=()=>{audio.current=new Blob(chunks,{type:r.mimeType});release();void process(advanceRef.current)};r.start();setStatus("recording");animate(stream);timer.current=setTimeout(()=>stop(false),300000);}catch{release();setStatus("idle");callbacks.current.onActiveChange(false);setError("Allow microphone access to record.");}}
 function stop(advance:boolean){advanceRef.current=advance;if(recorder.current?.state==="recording"){setStatus("processing");recorder.current.stop();}}
 useEffect(()=>{function key(e:KeyboardEvent){if(status==="recording"&&e.key==="Enter"&&!e.repeat&&!e.isComposing&&!(e.target instanceof HTMLElement&&e.target.closest("textarea,input,button"))){e.preventDefault();stop(true)}}window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[status]);
 return <>{status!=="idle"&&<div className="voice-waveform"><canvas ref={canvasRef} aria-hidden="true"/><span role="status">{status==="recording"?"Listening · Enter for next image":status==="connecting"?"Preparing microphone…":status==="processing"?"Turning your recording into thoughts…":"Recording saved · retry processing below"}</span></div>}<AppButton className="mic-button" disabled={status==="processing"||status==="connecting"||status==="error"} onClick={()=>status==="recording"?stop(false):void start()}><Icon name="mic" size={16}/>{status==="recording"?"Stop":status==="processing"?"Processing…":"Speak"}</AppButton><span role="status">{status==="recording"?"Recording · Enter for next image":error}</span>{status==="error"&&<><AppButton onClick={()=>void process(advanceRef.current)}>Retry</AppButton><AppButton onClick={()=>{audio.current=null;setStatus("idle");setError("");onActiveChange(false)}}>Discard</AppButton></>}</>;
}
