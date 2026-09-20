import { expect, test } from '@playwright/test';

for (const title of ['桥边姑娘', '鼓楼']) {
  test(`${title}: playhead crosses sounding glyph centres including subdivisions`, async ({page}) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('djembe.visualLeadMs', '600');
      localStorage.removeItem('djembe.visualLeadMs.centered');
    });
    await page.reload();
    await page.getByRole('button', {name:`开始练习 ${title}`,exact:true}).click();
    await expect(page.getByLabel('画面提前量', {exact:true})).toHaveText('提前 0ms');
    const progress=page.getByLabel('播放进度');
    await progress.evaluate(el=>el.setAttribute('step','1'));
    const probes=await page.locator('.score-note').evaluateAll(notes=>{
      const result:number[]=[];
      for(const duration of ['quarter','eighth','sixteenth']) {
        const hits=notes.filter(n=>n.getAttribute('data-duration')===duration)
          .map(n=>n.querySelector('[data-hit-at]')?.getAttribute('data-hit-at'))
          .filter((t):t is string=>!!t).map(Number);
        if(hits.length) result.push(hits[0],hits[Math.floor(hits.length/2)],hits.at(-1)!);
      }
      return [...new Set(result)];
    });
    expect(probes.length).toBeGreaterThanOrEqual(6);
    for(const viewport of [{width:1194,height:834},{width:834,height:1194}]) {
      await page.setViewportSize(viewport);
      for(const t of probes) {
        await progress.fill(String(t));
        const note=page.locator(`[data-hit-at="${t}"]`);
        await expect(note).toHaveAttribute('data-state','current');
        const delta=await note.evaluate(el=>{
          const glyph=el.querySelector('.score-char__letter')!.getBoundingClientRect();
          const cursor=document.querySelector('.score-playhead')!.getBoundingClientRect();
          return Math.abs(glyph.x+glyph.width/2-cursor.x-cursor.width/2);
        });
        expect(delta,`${title} ${t}ms ${viewport.width}px`).toBeLessThan(1.5);
      }
    }
  });
}
