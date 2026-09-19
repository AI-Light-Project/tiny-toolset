/* ============================================================
   重新生成内置数据快照 data.js
   用法（Node 18+，需要能访问外网）：
     node tools/llm-kill-line/build-snapshot.js
     node tools/llm-kill-line/build-snapshot.js --out ./data.js
   ============================================================ */
const fs = require('fs');
const path = require('path');

const SOURCE_URL = 'https://artificialanalysis.ai/zh/leaderboards/models';
const SOURCE_PAGE = 'https://artificialanalysis.ai/zh/leaderboards/models';

const CREATOR_COLORS = {
  OpenAI: '#10a37f', Anthropic: '#d97757', Google: '#4285f4', DeepSeek: '#4d6bfe',
  xAI: '#6b7280', SpaceXAI: '#6b7280', 'Z AI': '#1c7ff8', Alibaba: '#ff6a00', Meta: '#0668e1',
  MiniMax: '#e94b8a', Mistral: '#fa520f', NVIDIA: '#76b900', Kimi: '#5a34d6', Amazon: '#ff9900',
  Xiaomi: '#ff6900', Baidu: '#2932e1', Tencent: '#07c160', Microsoft: '#00a4ef', Cohere: '#39594d',
  IBM: '#0f62fe', ByteDance: '#325ab4', StepFun: '#0aa5a5', Perplexity: '#20808d',
  'LG AI Research': '#a50034', Upstage: '#7c3aed', 'Nous Research': '#c2410c',
  'Allen Institute for AI': '#1f6f8b', 'AI21 Labs': '#e4002b', ServiceNow: '#62d84e'
};
const FALLBACK = ['#e11d48', '#7c3aed', '#0891b2', '#ca8a04', '#15803d', '#b45309', '#9333ea', '#0d9488', '#c026d3', '#4f46e5'];
function colorFor(name) {
  if (CREATOR_COLORS[name]) return CREATOR_COLORS[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

const BENCH = {
  idx: ['AA 智能指数', 'Artificial Analysis 综合 10 项评测的加权总分，越高越强。', '分'],
  gpqa: ['GPQA Diamond', '研究生级物理 / 化学 / 生物选择题正确率。', '%'],
  hle: ["Humanity's Last Exam", '跨学科专家级难题正确率。', '%'],
  tau2: ['τ²-bench（工具调用）', '多轮对话与工具调用中的指令遵循能力。', '%'],
  tbHard: ['Terminal-Bench Hard', '真实终端环境下的 agent 任务完成率。', '%'],
  scicode: ['SciCode', '科研级代码实现能力。', '%'],
  ifbench: ['IFBench（指令遵循）', '精确指令遵循能力。', '%'],
  critpt: ['CritPt（物理推理）', '高难度物理推理。', '%'],
  mmmuPro: ['MMMU-Pro（多模态）', '多模态理解与推理。', '%'],
  gdpval: ['GDPval（真实工作任务）', '真实经济价值工作任务的完成质量。', '%'],
  omniscience: ['AA-Omniscience（知识/幻觉）', '知识广度与幻觉抑制，可为负分。', '分'],
  tps: ['输出速度（非评测项）', '中位输出速度，单位 token / 秒，不是正确率指标。', 'tok/s']
};
const BENCH_SRC = {
  gpqa: 'gpqa', hle: 'hle', tau2: 'tau2', tbHard: 'terminalbenchHard', scicode: 'scicode',
  ifbench: 'ifbench', critpt: 'critpt', mmmuPro: 'mmmuPro', gdpval: 'gdpvalNormalized',
  omniscience: 'omniscience'
};

const num = (v) => { const n = Number(v); return isFinite(n) ? n : null; };
const r1 = (v) => (v == null ? 0 : Math.round(v * 10) / 10);

/* ---- 1. 抓取 ---- */
async function fetchHtml() {
  const res = await fetch(SOURCE_URL, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; tiny-toolset snapshot builder)' }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

/* ---- 2. 解析 Next.js RSC 载荷 ---- */
function sliceArray(s, start) {
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s.charAt(i);
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return s.slice(start, i + 1); }
  }
  return null;
}

function extractModels(html) {
  const re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let m, payload = '';
  while ((m = re.exec(html))) {
    try { payload += JSON.parse('"' + m[1] + '"'); } catch (e) { /* 跳过坏块 */ }
  }
  if (!payload) return null;
  const key = '"models":[';
  let pos = 0;
  while (true) {
    const idx = payload.indexOf(key, pos);
    if (idx < 0) return null;
    pos = idx + 1;
    const raw = sliceArray(payload, payload.indexOf('[', idx + key.length - 1));
    if (!raw || raw.indexOf('intelligenceIndex') < 0) continue;
    try {
      const arr = JSON.parse(raw);
      if (arr && arr.length) return arr;
    } catch (e) { /* 试下一个 */ }
  }
}

/* ---- 3. 生成快照 ---- */
function build(raw) {
  const live = raw.filter((m) => !m.deprecated && num(m.intelligenceIndex) !== null);
  // AA 对「未跑」的评测给 0（而非 null）。这些基准上真实的 0 分不存在，一律按缺失处理，
  // 这样切换 Y 轴时没跑该项的模型会被自动过滤，而不是被画在 0 分位置。
  const benchVal = (k, v) => {
    if (v === null || v === 0) return undefined;
    return k === 'omniscience' ? r1(v) : r1(v * 100);
  };

  const models = live.map((m) => {
    const bm = {};
    for (const k in BENCH_SRC) {
      const v = benchVal(k, num(m[BENCH_SRC[k]]));
      if (v !== undefined) bm[k] = v;
    }
    const nm = m.shortName || m.name;
    const cost = num(m.intelligenceIndexCostPerTask);
    const tps = num(m.medianOutputTokensPerSecond);
    const item = {
      id: m.slug,
      n: nm,
      r: (m.release && m.release.name) || String(nm).replace(/\s*[（(][^）)]*[）)]\s*$/, ''),
      c: m.modelCreatorName || 'Other',
      o: m.isOpenWeights ? 1 : 0,
      ctx: num(m.contextWindowTokens) || 0,
      idx: r1(num(m.intelligenceIndex)),
      cost: cost === null ? null : Math.round(cost * 10000) / 10000,
      in: num(m.price1mInputTokens),
      out: num(m.price1mOutputTokens),
      tps: tps === null ? null : r1(tps),
      bm: bm
    };
    if (m.intelligenceIndexIsEstimated) item.est = 1;
    return item;
  });
  models.sort((a, b) => b.idx - a.idx);

  const cmap = {}, creators = [];
  models.forEach((m) => {
    if (!cmap[m.c]) { cmap[m.c] = { n: m.c, count: 0, color: colorFor(m.c) }; creators.push(cmap[m.c]); }
    cmap[m.c].count++;
  });
  creators.sort((a, b) => b.count - a.count);

  return {
    generated: new Date().toISOString().slice(0, 10),
    indexVersion: 'v4.3',
    source: SOURCE_PAGE,
    bench: BENCH,
    creators: creators,
    models: models
  };
}

(async function main() {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf('--out');
  const outPath = outIdx >= 0 && argv[outIdx + 1]
    ? path.resolve(argv[outIdx + 1])
    : path.join(__dirname, 'data.js');

  console.log('抓取', SOURCE_URL, '…');
  const html = await fetchHtml();
  const raw = extractModels(html);
  if (!raw) throw new Error('未能从页面解析出模型数据（榜单页结构可能已变化）');
  console.log('解析到原始模型', raw.length, '条');

  const snap = build(raw);
  const js = '/* 内置数据快照 —— 由 artificialanalysis.ai 榜单页抓取后精简生成，离线可用。\n' +
    '   字段含义见同目录 README.md；重新生成：node tools/llm-kill-line/build-snapshot.js */\n' +
    'window.AA_SNAPSHOT = ' + JSON.stringify(snap) + ';\n';
  fs.writeFileSync(outPath, js);

  console.log('写入', outPath);
  console.log('模型', snap.models.length, '| 厂商', snap.creators.length,
    '| 有价格', snap.models.filter((m) => m.in > 0 && m.out > 0).length,
    '| 有每任务成本', snap.models.filter((m) => m.cost > 0).length,
    '| 文件', (js.length / 1024).toFixed(1) + ' KB');
})().catch((e) => { console.error('失败：' + e.message); process.exit(1); });
