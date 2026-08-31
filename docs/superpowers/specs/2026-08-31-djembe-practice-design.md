# iPad 非洲鼓离线练习网站设计

## 目标

为家庭成员提供一款 iPad 横屏优先的非洲鼓练习 PWA。练习者可以跟随原歌曲和可独立静音的示范鼓声看谱，使用 R/L 左右手提示、倍速、小节循环和一小节倒数；安装和导入歌曲后可离线使用。

## 产品边界

- 首版曲目库规模按 10 至 30 首设计。
- 首版自带一首无版权练习伴奏和完整谱面。
- 真实歌曲由用户在 iPad 上从“文件”App导入，文件仅保存在本机 IndexedDB。
- 首版不包含编谱器、录音评分、账号、云同步或多人协作。
- GitHub 只保存源码、谱面和无版权示例资产，真实商业歌曲永不提交。

## 页面与交互

### 曲目库

曲目库显示曲名、作者、BPM、拍号、时长和本地音频状态。示例曲目可直接打开；真实曲目在未导入时显示“选择歌曲文件”。用户可以删除某首本地音频而不删除鼓谱。页面显示本地存储用量和持久存储状态。

### 横屏练习页

顶部显示返回、曲名、当前小节和离线状态。中部一次显示四小节，当前鼓点整格高亮，下一鼓点弱提示，进入下一组时整页切换。每个鼓点显示中文音色、B/T/S 和 R/L。底部固定控制台提供播放、进度、倍速、循环起止、原曲与示范鼓声的开关及音量。

竖屏保持功能完整，但展示横屏提示并改为单列小节。触控目标最小 44 CSS px，支持 reduced motion 和清晰焦点状态。

## 架构

- React + TypeScript + Vite 构建静态单页 PWA。
- 曲目以 `SongDefinition` 数据注册；谱面事件带精确毫秒时间。
- `HTMLAudioElement.currentTime` 是原曲存在时的唯一主时间轴。
- 无原曲的示例/鼓声练习使用可暂停的 performance clock。
- Web Audio API 合成 bass、tone、slap，短时前瞻调度以避免主线程抖动。
- IndexedDB 保存用户导入音频，Service Worker 只缓存应用外壳、谱面和示例资源。
- Screen Wake Lock 在播放时申请，暂停或页面隐藏时释放，恢复可见且仍播放时重新申请。

## 数据接口

```ts
type Stroke = "bass" | "tone" | "slap";
type Hand = "R" | "L";

interface HitEvent {
  atMs: number;
  stroke: Stroke;
  hand: Hand;
}

interface Bar {
  number: number;
  startMs: number;
  endMs: number;
  beats: number;
  hits: HitEvent[];
}

interface SongDefinition {
  id: string;
  title: string;
  artist?: string;
  bpm: number;
  timeSignature: [number, number];
  audioOffsetMs: number;
  expectedDurationMs: number;
  builtInAudioUrl?: string;
  bars: Bar[];
}
```

导入音频记录由 `songId` 唯一定位，保存 Blob、文件名、MIME、大小、时长和更新时间。曲目版本更新不得删除或迁移该记录，除非未来显式升级存储 schema。

## 错误与恢复

- 文件类型不支持：拒绝导入并列出 MP3、M4A、AAC。
- 时长偏差超过 5 秒或曲目时长的 3%：要求用户确认，不静默绑定。
- 存储空间不足：导入前比较估算配额，失败后保留旧音频并提供清理入口。
- 自动播放受阻：保持暂停状态并提示再次点击播放。
- 音频解码失败：删除本次临时对象 URL，不覆盖已有音频。
- 离线缺失：允许查看谱面和示范鼓声，并提示重新导入原曲。
- 更新失败：继续使用当前 Service Worker 缓存，不阻断练习。

## 验收

桌面自动化覆盖模型、时间轴、循环、分页、存储、界面和 PWA；真实 iPad 的 HTTPS 验收覆盖主屏幕安装、导入、飞行模式重启、双音轨、倍速、循环、旋转及前后台恢复。连续播放十五分钟时，视觉与音频的可感知偏差目标不超过约 100 ms。
