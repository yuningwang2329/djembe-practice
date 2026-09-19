import { expect,test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const recordings=JSON.parse(readFileSync(new URL('../src/data/recordingLyrics.json',import.meta.url),'utf8')) as Record<string,{cues:{startMs:number;endMs:number;text:string}[]}>;
const titles:Record<string,string>={
 'qiao-bian-gu-niang':'桥边姑娘','gu-lou-zhao-lei':'鼓楼','da-yu-zhou-shen':'大鱼',
 tongnian:'童年',shuishou:'水手',lasa:'坐上火车去拉萨','ping-guo-xiang':'苹果香',
 'huo-hong-de-sa-ri-lang':'火红的萨日朗','zhan-zai-cao-yuan-wang-bei-jing':'站在草原望北京',
 'wo-shi-ren-jian-chou-chang-ke':'我是人间惆怅客',
};
const audit=JSON.parse(readFileSync(new URL('../docs/recording-lyric-audit.json',import.meta.url),'utf8')) as Record<string,{title:string}>;

// Runtime agreement is distinct from acoustic accuracy; acoustic evidence is in the audit report.
for (const [id,recording] of Object.entries(recordings)) {
  const song={title:titles[id],lyrics:recording.cues};
  test(`${song.title}: first, middle and last lyric follow media position, not visual lead`,async({page})=>{
    await page.goto('/');
    await page.getByRole('button',{name:`开始练习 ${song.title}`,exact:true}).click();
    const progress=page.getByLabel('播放进度');
    const cues=song.lyrics!;
    for (const i of [0,Math.floor(cues.length/2),cues.length-1]) {
      const cue=cues[i];
      const position=Math.ceil((cue.startMs+100)/10)*10;
      await progress.fill(String(position));
      const active=page.locator('.score-lyric[data-state="current"]');
      await expect(active.first()).toHaveAttribute('data-cue-start',String(cue.startMs));
      expect(await active.evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('data-cue-start')))])).toEqual([String(cue.startMs)]);
      await page.getByRole('button',{name:'画面提前量增加'}).click();
      await expect(active.first()).toHaveAttribute('data-cue-start',String(cue.startMs));
      expect(Number(await progress.inputValue())).toBe(position);
    }
    const displayed=await page.locator('.score-lyric__char').allTextContents();
    expect(displayed.join('')).toBe(cues.map(c=>c.text.replace(/\s/g,'')).join(''));
    await progress.fill(String(Math.ceil((cues.at(-1)!.endMs+100)/10)*10));
    await expect(page.locator('.score-lyric[data-state="current"]')).toHaveCount(0);
  });
  if(process.env.LOCAL_AUDIO_DIR) test(`${song.title}: actual private MP3 plays at three positions and survives offline reload`,async({page,context})=>{
    await page.addInitScript(()=>{
      const Original=window.Audio;
      window.Audio=class extends Original {
        constructor(src?:string){super(src);(window as any).__practiceAudio=this;}
      };
    });
    await page.goto('/');
    await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>undefined));
    await page.getByRole('button',{name:`开始练习 ${song.title}`,exact:true}).click();
    await page.getByLabel('导入原歌曲').setInputFiles(resolve(process.env.LOCAL_AUDIO_DIR!,audit[id].title));
    await expect(page.getByText('已保存到此 iPad · 离线可用')).toBeVisible();
    await expect(page.getByText(/与校准用的原文件不同/)).toHaveCount(0);
    const cues=song.lyrics;
    for(const [i,rate] of [[0,1],[Math.floor(cues.length/2),.75],[cues.length-1,1.25]]) {
      const target=Math.ceil((cues[i].startMs+100)/10)*10;
      const currentRate=Number((await page.getByLabel('当前速度').textContent())!.replace('×',''));
      for(let n=0;n<Math.round(Math.abs(rate-currentRate)/.05);n++) await page.getByRole('button',{name:rate>currentRate?'加速':'减速',exact:true}).click();
      await page.getByLabel('播放进度').fill(String(target));
      await page.getByRole('button',{name:'开始播放',exact:true}).click();
      await expect.poll(()=>page.evaluate(()=>(window as any).__practiceAudio.currentTime*1000)).toBeGreaterThan(target+180);
      const measured=await page.evaluate(()=>{
        const a=(window as any).__practiceAudio as HTMLAudioElement;
        const progress=document.querySelector<HTMLInputElement>('[aria-label="播放进度"]')!;
        return {delta:Math.abs(Number(progress.value)-a.currentTime*1000),rate:a.playbackRate};
      });
      expect(measured.delta).toBeLessThan(120);
      expect(measured.rate).toBeCloseTo(rate,3);
      await page.getByRole('button',{name:'暂停播放',exact:true}).click();
    }
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('button',{name:`开始练习 ${song.title}`,exact:true}).click();
    await expect(page.getByText('已保存到此 iPad · 离线可用')).toBeVisible();
    const target=Math.ceil(cues[0].startMs/10)*10;
    await page.getByLabel('播放进度').fill(String(target));
    await page.getByRole('button',{name:'开始播放',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>(window as any).__practiceAudio.currentTime*1000)).toBeGreaterThan(target+180);
  });
}
