import {expect,test} from '@playwright/test';

test('notation lyrics, their sweep and the playhead share the same horizontal grid',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'开始练习 鼓楼',exact:true}).click();
  await page.getByLabel('播放进度').fill('60000');
  const measure=()=>page.evaluate(()=>{
    const active=document.querySelector('.score-bar--active')!;
    const n=active.querySelector('.score-bar__no')!.textContent;
    const lyrics=document.querySelector(`[data-lyric-bar="${n}"]`)!;
    const line=active.querySelector('.score-playhead')!.getBoundingClientRect();
    const cursor=lyrics.querySelector('.score-lyric-cursor')!.getBoundingClientRect();
    const progress=lyrics.querySelector('.score-lyric-progress')!.getBoundingClientRect();
    const a=active.querySelector('.score-bar__grid')!.getBoundingClientRect();
    const b=lyrics.querySelector('.score-notation-grid')!.getBoundingClientRect();
    return {line:line.x+line.width/2,cursor:cursor.x+cursor.width/2,end:progress.right,grid:a.x-b.x,
      sweep:lyrics.querySelector('.score-lyric__sweep')!.getAttribute('style')};
  });
  for(const viewport of [{width:1194,height:834},{width:834,height:1194}]){
    await page.setViewportSize(viewport);
    const before=await measure();
    expect(Math.abs(before.line-before.cursor)).toBeLessThan(1);
    expect(Math.abs(before.line-before.end)).toBeLessThan(1);
    expect(Math.abs(before.grid)).toBeLessThan(1);
    await page.getByRole('button',{name:'画面提前量增加'}).click();
    const after=await measure();
    expect(after.line).toBeGreaterThan(before.line);
    expect(after.sweep).not.toBe(before.sweep);
    expect(Math.abs(after.line-after.cursor)).toBeLessThan(1);
  }
  // Adjacent sixteenths form one beam, with a visible gap between the two levels.
  const group=page.locator('.score-group').filter({has:page.locator('[data-beam-level="2"]')}).first();
  const primary=await group.locator('[data-beam-level="1"]').boundingBox();
  const secondary=await group.locator('[data-beam-level="2"]').first().boundingBox();
  expect(secondary!.y-(primary!.y+primary!.height)).toBeGreaterThanOrEqual(3);
  expect(await group.locator('[data-beam-level="2"]').count()).toBe(1);
});

test('all ten songs keep legible, non-overlapping lyrics in both iPad orientations',async({page})=>{
  await page.goto('/');
  const titles=await page.getByRole('button',{name:/开始练习 /}).allTextContents();
  expect(titles.length).toBeGreaterThanOrEqual(10);
  for(const size of [{width:1194,height:834},{width:834,height:1194}]){
    await page.setViewportSize(size);
    const labels=await page.getByRole('button',{name:/开始练习 /}).evaluateAll(els=>els.map(el=>el.getAttribute('aria-label')!));
    for(const label of labels){
      await page.getByRole('button',{name:label,exact:true}).click();
      const overlaps=await page.evaluate(()=>[...document.querySelectorAll('.score-lyrics--notation')].flatMap(row=>{
        const chars=[...row.querySelectorAll('.score-lyric__char')].map(el=>({text:el.textContent,r:el.getBoundingClientRect()}));
        return chars.flatMap((c,i)=>i&&c.r.left<chars[i-1].r.right-.5?[chars[i-1].text!+c.text]:[]);
      }));
      expect(overlaps,`${label} at ${size.width}px`).toEqual([]);
      await page.getByRole('button',{name:'返回曲目库',exact:true}).click();
    }
  }
});
