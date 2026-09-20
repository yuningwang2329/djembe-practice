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
    const sweepElement=lyrics.querySelector<HTMLElement>('.score-lyric__sweep')!;
    const sweepRect=sweepElement.getBoundingClientRect();
    const remaining=Number(/inset\(0(?:px)? ([\d.]+)%/.exec(sweepElement.style.clipPath)![1]);
    const a=active.querySelector('.score-bar__grid')!.getBoundingClientRect();
    const b=lyrics.querySelector('.score-notation-grid')!.getBoundingClientRect();
    return {line:line.x+line.width/2,end:sweepRect.right-sweepRect.width*remaining/100,grid:a.x-b.x,
      sweep:lyrics.querySelector('.score-lyric__sweep')!.getAttribute('style')};
  });
  for(const viewport of [{width:1194,height:834},{width:834,height:1194}]){
    await page.setViewportSize(viewport);
    const before=await measure();
    expect(Math.abs(before.line-before.end)).toBeLessThan(1);
    expect(Math.abs(before.grid)).toBeLessThan(1);
    await page.getByRole('button',{name:'画面提前量增加'}).click();
    const after=await measure();
    expect(after.line).toBeGreaterThan(before.line);
    expect(after.sweep).not.toBe(before.sweep);
    expect(Math.abs(after.line-after.end)).toBeLessThan(1);
  }
  // Adjacent sixteenths form one beam, with a visible gap between the two levels.
  const group=page.locator('.score-group').filter({has:page.locator('[data-beam-level="2"]')}).first();
  const primary=await group.locator('[data-beam-level="1"]').boundingBox();
  const secondary=await group.locator('[data-beam-level="2"]').first().boundingBox();
  expect(secondary!.y-(primary!.y+primary!.height)).toBeGreaterThanOrEqual(3);
  expect(await group.locator('[data-beam-level="2"]').count()).toBe(1);
});

test('screenshot regression: lyric progress is ink only, without a second ruler or ghost glyphs',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'开始练习 桥边姑娘',exact:true}).click();
  await page.getByLabel('播放进度').fill('34000');
  for(const viewport of [{width:1470,height:736},{width:1194,height:834},{width:834,height:1194}]){
    await page.setViewportSize(viewport);
    await expect(page.locator('.score-playhead')).toHaveCount(1);
    await expect(page.locator('.score-lyric-progress, .score-lyric-cursor')).toHaveCount(0);
    const result=await page.evaluate(()=>{
      const block=document.querySelector('.score-bar--active')!.closest('.score-page__block')!;
      const paragraph=block.querySelector('.score-lyric--notation')!;
      const base=paragraph.querySelector('.score-lyric__char')!.getBoundingClientRect();
      const ink=paragraph.querySelector('.score-lyric__ink-char')!.getBoundingClientRect();
      const past=document.querySelector('.score-lyric__sweep[data-row-active="false"]')!;
      return {offsets:[base.x-ink.x,base.y-ink.y,base.width-ink.width,base.height-ink.height],pastVisibility:getComputedStyle(past).visibility};
    });
    expect(result.offsets.every(n=>Math.abs(n)<.5)).toBe(true);
    expect(result.pastVisibility).toBe('hidden');
    await page.screenshot({path:`test-results/lyrics-clean-${viewport.width}.png`});
  }
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
