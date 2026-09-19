# 工具箱 Tools Hub

> 一个纯前端、离线可用、可扩展的小工具集合。每个工具独立成模块，双击即可打开，零依赖、零上传。
>
> 当前版本 **v0.0.1**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/AI-Light-Project/tiny-toolset)

## ⚡ 一键部署到 Vercel

Fork 本项目（或把仓库连到 Vercel）后导入即可一键部署。无需服务器，免费额度即可使用。

> **注意**：导入时 **Root Directory 保持默认（仓库根目录 `.`）即可** —— 本仓库根目录直接就是站点文件（`index.html` / `assets/` / `tools/`），没有 `tools-hub` 这层子目录。设错会导致 CSS/JS 全部 404。

## 🚀 本地运行

### 方式一：直接打开（推荐，无需任何环境）

双击仓库根目录下的 `index.html`，浏览器会打开工具列表页，点击卡片进入对应工具。单个工具也可单独打开，例如 `tools/image-watermark/`（目录形式，部署后由 Vercel 自动定位 index.html）。

### 方式二：本地服务器（可选）

```bash
# 在仓库根目录（index.html 所在目录）执行
python -m http.server 8000
# 浏览器访问 http://localhost:8000
```

> 首页采用「分类 → 工具」两级结构：点分类圆形图标查看该分类下的工具——**清爽主题为下拉展开，多巴胺主题为炸开散列**。搜索框支持按 `/` 聚焦、`Esc` 清空；右上角**齿轮**进入「页面设置」（主题切换 / 关于 / 清除本地数据）。

## ✨ 核心特性

| | |
|---|---|
| **零依赖** | 不装 npm 包、不引 CDN，仓库 clone 下来就能跑 |
| **零上传** | 所有处理都在浏览器本地完成，图片/文本不经过任何服务器 |
| **模块化** | 每个工具一个目录，自包含，删掉任何一个都不影响其他工具 |
| **易扩展** | 加新工具 = 复制模板 + 改代码 + 在注册表加一条记录 |

## 📦 项目结构

```
tiny-toolset/                # 即本仓库根目录（克隆后所在目录）
├── index.html                  # 工具集首页：分类网格 + 两级工具视图 + 搜索 + 设置面板
├── README.md                   # 本文件
├── vercel.json                 # Vercel 部署配置（纯静态，无构建）
├── assets/
│   ├── css/
│   │   ├── theme.css           # ★ 设计令牌：全部颜色/字体/圆角/阴影变量（两套主题）
│   │   ├── theme-maximal.css   # 多巴胺主题的质感增强（图案/粗边/堆叠阴影/动画）
│   │   └── hub.css             # 首页布局与组件结构
│   ├── img/                    # 卡通插画素材（Fluent Emoji，MIT，见 CREDITS.md）
│   └── js/
│       ├── tools.js            # ★ 工具注册表 + 分类体系（添加工具时改这里）
│       ├── hub.js              # 首页交互：分类两级视图 / 搜索 / 抽屉 / 设置面板
│       └── theme.js            # 主题 API（主题入口统一在首页设置面板，工具页跟随）
├── tools/
│   ├── _template/              # 新工具脚手架，复制它开始
│   ├── image-watermark/        # 工具一：图片水印
│   │   ├── index.html          #   入口（可单独打开）
│   │   ├── style.css
│   │   ├── app.js
│   │   └── README.md           #   该工具的详细说明
│   └── llm-kill-line/          # 工具二：大语言模型斩杀线
│       ├── index.html
│       ├── style.css
│       ├── app.js
│       ├── data.js             #   内置数据快照（离线可用）
│       ├── build-snapshot.js   #   重新抓取并生成 data.js（Node 脚本，非站点资源）
│       └── README.md
└── docs/
    └── adding-tools.md         # 添加新工具完整指南
```

## 🧰 工具清单

当前已上线的工具：

| 工具 | 说明 | 入口 |
|---|---|---|
| 💧 图片水印 | 批量加文字 / Logo 水印，九宫格定位 + 平铺防截图 | [打开](tools/image-watermark/) |
| 🎯 LLM 斩杀线 | 大模型「成本 × 表现」散点图，一键找出更便宜且更强的替代者 | [打开](tools/llm-kill-line/) |

### 🎯 大语言模型斩杀线

把各家大模型的「成本 × 表现」画成散点图，点中任意一个模型即可找出所有**更便宜且更强**的竞品。
[→ 详细文档](tools/llm-kill-line/README.md)

**功能**

- 数据来自 Artificial Analysis 榜单：内置快照秒开，启动后自动尝试抓取实时数据，失败自动回退并标注来源与日期
- X 轴可切换混合价 / 输入价 / 输出价 / 每任务成本，Y 轴有 12 项评测基准可选，均标注单位与口径
- 按厂商多选筛选 + 搜索 + 全选/清空/仅主流，散点按厂商着色并带图例
- 点击模型画出十字斩杀线，自动划分四象限，侧栏列出被斩杀模型与差价
- 支持对数刻度、滚轮缩放、拖拽平移、悬停明细，桌面与移动端自适应

### 💧 图片水印工具

批量给图片添加文字或 Logo 水印，支持九宫格定位与平铺防盗图。
[→ 详细文档](tools/image-watermark/README.md)

**功能**

- 文字水印 / 图片 Logo 水印两种模式
- 自定义内容、字体、字号、颜色、不透明度、旋转角度，另有描边与投影
- 九宫格 9 个方位定位，或平铺全图（可调间距、支持交错排列）防截图盗用
- 批量处理多张图片，一键打包为 ZIP 下载
- 导入导出支持 JPG / PNG / WebP（兼容 BMP / GIF 导入）
- 按原图分辨率导出，质量无明显损失；水印按图片短边百分比自适应缩放

**使用方法**

1. 打开工具，在左侧添加图片（点击选择 / 拖拽 / `Ctrl+V` 粘贴均可）
2. 中间区域预览，点击缩略图可切换当前编辑的图片
3. 在右侧调整水印参数，预览实时更新
4. 点「导出当前图片」保存单张，或「批量导出全部」打包下载所有图片

> 默认水印文字是「仅供本人使用 · 请勿转载」，记得改成你自己的。

## 🎨 主题系统

主题统一在**首页右上角齿轮 → 页面设置**里切换。工具页不再单独放主题按钮（固定在右上角的悬浮按钮会压住工具页顶栏右侧的操作按钮），而是直接跟随这里的选择。选择自动记忆（localStorage，全站所有页面同步生效）：

| 主题 | 说明 |
|---|---|
| **清爽**（默认） | 浅色中性底、单蓝色强调、细边框，安静耐看 |
| **多巴胺** | 深紫黑底 + 五色系统（品红/青/黄/橙/紫），粗彩边框、堆叠硬阴影、圆点+斜纹+光斑三层图案、标题渐变字动画、首页品牌插画浮动。界面插画来自 Microsoft Fluent Emoji（MIT，见 `assets/img/CREDITS.md`） |

设计要点：

- **令牌集中**：所有颜色/字体/圆角/阴影变量只在 `assets/css/theme.css` 定义，组件样式只消费变量；
  工具自己的 `style.css` 里**禁止**出现 `:root` 颜色定义
- **质感分层**：主题特有的图案、粗边、堆叠阴影、动画放在 `theme-maximal.css`，用 `[data-theme="dopamine"]` 前缀隔离
- **无障碍**：正文对比度保持 AAA（白字 on 深底 19.5:1）；强调色只用于装饰性文字；完整支持
  `prefers-reduced-motion`（关闭持续动画、缩短过渡）；装饰图片均 `aria-hidden`
- **字体**：多巴胺主题的标题字体为 Outfit / Bangers / DM Sans（Google Fonts，异步加载、失败自动回退
  系统字体，离线使用不受影响）
- **首页交互随主题变化**：清爽主题点分类为「下拉展开」，多巴胺主题为「炸开散列」（工具气泡散在分类四周）

**如何新增一套主题**（以 `pastel` 为例）：

1. `assets/css/theme.css` 里加一个 `[data-theme="pastel"] { ... }` 变量块（覆盖 `:root` 中的同名变量）
2. 需要专属质感就在 `assets/css/theme-maximal.css` 里追加 `[data-theme="pastel"]` 规则
3. `assets/js/theme.js` 的 `THEMES` 数组里加 `{ id: 'pastel', label: '粉彩' }`

设置面板里的主题分段控件会自动多出一档，无需改任何页面。

### ⚠️ 改了主题文件记得升版本号

各页面对主题三件套的引用都带 `?v=` 查询串：

```html
<link rel="stylesheet" href="assets/css/theme.css?v=20260919">
<link rel="stylesheet" href="assets/css/theme-maximal.css?v=20260919">
<script src="assets/js/theme.js?v=20260919"></script>
```

改完 `assets/css/theme*.css` 或 `assets/js/theme.js` 后，**把所有 HTML 里这几处的 `?v=` 一起改成新值**。

不这么做的后果是"新旧混搭"：浏览器可能拿到**旧 JS + 新 CSS**（或反过来）——
比如旧 `theme.js` 注入的元素碰上已删掉样式的新 CSS，就会失去定位、堆在页面角落，
表现成一个"神秘的左下角按钮/图案"。版本号能让浏览器强制重新拉取，避免这类错配。

> 顺带一提：`theme.js` 每次 `apply()` 都会清掉旧版本注入的 `.theme-toggle` / `#fx-layer` 残留，
> 并且 CSS 里保留了这两个选择器的兜底定位样式，所以即便真的混搭了，也不会再堆在角落。

## ➕ 添加新工具

完整步骤见 [docs/adding-tools.md](docs/adding-tools.md)，这里是最简流程：

```bash
# 1. 复制模板
cp -r tools/_template tools/my-tool

# 2. 写你的 index.html / style.css / app.js / README.md

# 3. 在 assets/js/tools.js 的 window.TOOLS 里追加一条
{
  id: 'my-tool',
  name: '我的工具',
  desc: '一句话说明做什么',
  icon: '🛠️',
  category: '文字处理',
  categoryId: 'text',            # 归属分类，对应 window.CATEGORIES 里的 id
  tags: ['标签'],
  path: 'tools/my-tool/',        # 目录形式，以 / 结尾
  version: '0.1.0',
  updated: '2026-09-08',
  features: ['要点一', '要点二']
}
```

刷新首页，新分类磁贴与工具就会自动出现。若要用全新分类，先在 `window.CATEGORIES`
里加一条（`{ id, name, icon, color }`，`color` 取 1~4 对应 `--cat-1~4` 配色）。

### 三条硬性约定

1. **零依赖、零网络请求** —— 不引 CDN、不调外部 API（Google Fonts 为可选增强，失败自动回退系统字体）
2. **不用 ES module** —— 用普通 `<script src>`，`type="module"` 在 `file://` 下会被 CORS 拦截
3. **数据不出本机** —— 所有处理在浏览器完成

## ☁️ Vercel 部署说明

本项目是纯静态站点（无构建步骤），`vercel.json` 已声明 `buildCommand: null` + `outputDirectory: "."`。

> **关键**：`vercel.json` 里必须保留 `trailingSlash: true`。否则 Vercel 的 `cleanUrls` 会把 `tools/<tool>/index.html`
> 重定向成无尾斜杠的 `tools/<tool>`，浏览器误把工具名当文件，导致同目录的 `style.css` / `app.js` 被解析到上一级 `tools/` 而 404。
> 工具页内部一律用 `../../assets/...` 引用仓库根资源、用 `style.css` / `app.js` 引用同目录资源，配合尾斜杠即可在 `file://` 与部署后都正常。

### 方式一：GitHub 导入（推荐）

1. 在 Vercel 新建项目，导入本仓库 `AI-Light-Project/tiny-toolset`
2. **Root Directory（根目录）保持默认（`.`）** —— 仓库根目录直接就是站点文件，没有 `tools-hub` 这层子目录
3. Framework Preset 选 **Other**，Build Command / Output Directory 保持默认即可
4. 点击 Deploy，几秒后即可通过分配的 `*.vercel.app` 域名访问

### 方式二：Vercel CLI

```bash
npm i -g vercel
# 在仓库根目录（即 index.html 所在目录）执行
vercel
```

### 部署后访问

- 首页：`https://your-project.vercel.app/`
- 工具页：`https://your-project.vercel.app/tools/image-watermark/`

### 注意事项

- **相对路径**：站点全程使用相对路径，挂在任意子路径下也能正常工作
- **小程序不部署**：`weapp/`（微信小程序版）不属于 Web 站点，仅存在于 `wechat-miniprogram` 分支，不会随 master 部署
- **免费额度**：Vercel Hobby 计划每月 100GB 带宽，个人使用完全足够

## ❓ 常见问题

**双击打开后首页是空白？**
检查是否用 `file://` 协议打开且浏览器拦截了本地脚本。换用上面的「本地服务器」方式访问即可。

**工具页右上角没有主题按钮？**
这是有意为之：**全站唯一的主题入口是首页「齿轮 → 页面设置」**，工具页只负责跟随。
`theme.js` 不会再往任何页面注入悬浮按钮（固定定位的按钮会压住工具页顶栏右侧的操作区）。

**左下角出现过一个怪东西 —— 点它能切主题，或者是一堆星星/彩虹挤在一起？**
这是**浏览器缓存导致的 JS / CSS 版本混搭**，不是页面本身的设计：

- 旧 `theme.js` 会往页面注入悬浮主题按钮和漂浮装饰插画；新版不再注入。
- 如果浏览器缓存了旧 `theme.js`、却拿到了新版 CSS（新版已删掉这些元素的样式），
  这些元素就会失去 `position: fixed/absolute`，退化成普通元素被堆在 `<body>` 末尾 —— **即左下角**。
- 点它能切主题，正是因为那确实是个真的主题按钮。

**解决办法：强制刷新一次**（Windows `Ctrl + Shift + R` / macOS `Cmd + Shift + R`），
或直接在无痕窗口打开。新版 `theme.js` 不注入任何元素，还会主动清理旧残留，所以刷新后就彻底干净了。

> 现在主题三件套的引用都带了 `?v=` 版本号（见上文「改了主题文件记得升版本号」），
> 改版后会强制重新拉取，日后不会再出现这种新旧混搭。
若首页设置面板里也切不动主题，则是 `assets/js/theme.js` 加载失败——确认文件存在且没有被浏览器扩展拦截。

**多巴胺主题下标题字体不对？**
那是 Google Fonts 没加载出来（离线或网络受限），已自动回退到系统字体，功能不受影响；联网后刷新即恢复。

**批量导出时浏览器卡住？**
图片很大或数量很多时属正常现象，界面上有进度提示，等待完成即可。建议一次不超过 100 张。

**导出的图片没有水印？**
检查：① 水印不透明度是否被调到很低；② 图片 Logo 模式是否已选择 Logo 文件；③ 文字内容是否为空。

**WebP 导出失败？**
个别旧浏览器不支持 WebP 编码，会自动回退为 PNG。

## 📄 许可

内部自用工具集，随意取用与修改。
