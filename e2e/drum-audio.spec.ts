import {expect,test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

// Render the real implementation and shipped MP3, not a mocked gain node.
test('soft bass stays audible with the same attack spectrum and lower level than B',async({page})=>{
  await page.goto('/');
  const code=stripTypeScriptTypes(readFileSync(new URL('../src/playback/drumSampler.ts',import.meta.url),'utf8'));
  const result=await page.evaluate(async code=>{
    const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
    const {createDrumSampler}=await import(url);URL.revokeObjectURL(url);
    const originalRandom=Math.random;Math.random=()=>.5;
    const output=[];
    try{
      for(const soft of [false,true]){
        const ctx=new OfflineAudioContext(1,44100*2,44100);
        let decoded=0,fallbacks=0;
        const decode=ctx.decodeAudioData.bind(ctx);
        ctx.decodeAudioData=async bytes=>{const r=await decode(bytes);decoded++;return r;};
        const sampler=createDrumSampler(ctx,{schedule(){fallbacks++;},cancel(){},resume:async()=>{},getCurrentTime:()=>0});
        for(let i=0;i<200 && decoded<3;i++) await new Promise(r=>setTimeout(r,10));
        await new Promise(r=>setTimeout(r,0));
        sampler.schedule({atMs:0,stroke:'bass',hand:'R',...(soft?{dynamics:'soft'}:{})},.1,.8);
        const samples=(await ctx.startRendering()).getChannelData(0);
        let energy=0,peak=0,first=-1;
        samples.forEach((v,i)=>{energy+=v*v;peak=Math.max(peak,Math.abs(v));if(first<0 && Math.abs(v)>.005)first=i/44100;});
        output.push({rms:Math.sqrt(energy/samples.length),peak,first,fallbacks});
      }
    }finally{Math.random=originalRandom;}
    return output;
  },code);
  expect(result.every(r=>r.fallbacks===0&&r.rms>.025&&r.peak<1)).toBe(true);
  expect(result[1].rms/result[0].rms).toBeCloseTo(.7,2);
  expect(Math.abs(result[1].first-result[0].first)).toBeLessThan(.005);
});
