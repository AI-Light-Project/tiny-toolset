# 工具箱 Tools Hub

> 一个纯前端、离线可用、可扩展的小工具集合。每个工具独立成模块，双击即可打开，零依赖、零上传。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/AI-Light-Project/tiny-toolset)

## ⚡ 一键部署到 Vercel

Fork 本项目（或把仓库连到 Vercel）后导入即可一键部署。无需服务器，免费额度即可使用。

> **注意**：导入时 **Root Directory 保持默认（仓库根目录 `.`）即可** —— 本仓库根目录直接就是站点文件（`index.html` / `assets/` / `tools/`），没有 `tools-hub` 这层子目录。设错会导致 CSS/JS 全部 404。

## 🚀 本地运行

### 方式一：直接打开（推荐，无需任何环境）

双击仓库根目录下的 `index.html`，浏览器会打开工具列表页，点击卡片进入对应工具。单个工具也可单独打开，例如 `tools/image-watermark/index.html`。

### 方式二：本地服务器（可选）

```bash
# 在仓库根目录（index.html 所在目录）执行
python -m http.server 8000
# 浏览器访问 http://localhost:8000
```

> 首页支持搜索（按 `/` 聚焦搜索框，`Esc` 清空）和分类筛选。

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
├── index.html                  # 工具集首页：卡片列表 + 搜索 + 分类
├── README.md                   # 本文件
├── vercel.json                 # Vercel 部署配置（纯静态，无构建）
├── assets/
│   ├── css/
│   │   ├── theme.css           # ★ 设计令牌：全部颜色/字体/圆角/阴影变量（两套主题）
│   │   ├── theme-maximal.css   # 多巴胺主题的质感增强（图案/粗边/堆叠阴影/动画）
│   │   └── hub.css             # 首页布局与组件结构
│   ├── img/                    # 卡通插画素材（Fluent Emoji，MIT，见 CREDITS.md）
│   └── js/
│       ├── tools.js            # ★ 工具注册表（添加工具时改这里）
│       ├── hub.js              # 首页渲染 / 搜索 / 筛选逻辑
│       └── theme.js            # 主题切换器（右上角悬浮按钮）
├── tools/
│   ├── _template/              # 新工具脚手架，复制它开始
│   └── image-watermark/        # 工具一：图片水印
│       ├── index.html          #   入口（可单独打开）
│       ├── style.css
│       ├── app.js
│       └── README.md           #   该工具的详细说明
└── docs/
    └── adding-tools.md         # 添加新工具完整指南
```

## 🧰 工具清单

当前已上线的工具：

| 工具 | 说明 | 入口 |
|---|---|---|
| 💧 图片水印 | 批量加文字 / Logo 水印，九宫格定位 + 平铺防截图 | [打开](tools/image-watermark/index.html) |

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

页面**右上角有悬浮切换按钮**，可在两套主题间切换，选择会自动记忆（localStorage，全站所有页面同步生效）：

| 主题 | 说明 |
|---|---|
| **清爽**（默认） | 浅色中性底、单蓝色强调、细边框，安静耐看 |
| **多巴胺** | 深紫黑底 + 五色系统（品红/青/黄/橙/紫），粗彩边框、堆叠硬阴影、圆点+斜纹+光斑三层图案、漂浮卡通装饰、标题渐变字动画。界面插画来自 Microsoft Fluent Emoji（MIT，见 `assets/img/CREDITS.md`） |

设计要点：

- **令牌集中**：所有颜色/字体/圆角/阴影变量只在 `assets/css/theme.css` 定义，组件样式只消费变量；
  工具自己的 `style.css` 里**禁止**出现 `:root` 颜色定义
- **质感分层**：主题特有的图案、粗边、堆叠阴影、动画放在 `theme-maximal.css`，用 `[data-theme="dopamine"]` 前缀隔离
- **无障碍**：正文对比度保持 AAA（白字 on 深底 19.5:1）；强调色只用于装饰性文字；完整支持
  `prefers-reduced-motion`（关闭持续动画、缩短过渡）；装饰图片均 `aria-hidden`
- **字体**：多巴胺主题的标题字体为 Outfit / Bangers / DM Sans（Google Fonts，异步加载、失败自动回退
  系统字体，离线使用不受影响）

**如何新增一套主题**（以 `pastel` 为例）：

1. `assets/css/theme.css` 里加一个 `[data-theme="pastel"] { ... }` 变量块（覆盖 `:root` 中的同名变量）
2. 需要专属质感就在 `assets/css/theme-maximal.css` 里追加 `[data-theme="pastel"]` 规则
3. `assets/js/theme.js` 的 `THEMES` 数组里加 `{ id: 'pastel', label: '粉彩' }`

切换按钮会自动变成三态循环，无需改任何页面。

## ➕ 添加新工具

完整步骤见 [docs/adding-tools.md](docs/adding-tools.md)，这里是最简流程：

```bash
# 1. 复制模板
cp -r tools/_template tools/my-tool

# 2. 写你的 index.html / style.css / app.js / README.md

# 3. 在 assets/js/tools.js 里追加一条
{
  id: 'my-tool',
  name: '我的工具',
  desc: '一句话说明做什么',
  icon: '🛠️',
  category: '分类名',
  tags: ['标签'],
  path: 'tools/my-tool/index.html',
  version: '0.1.0',
  updated: '2026-09-08',
  features: ['要点一', '要点二']
}
```

刷新首页，新卡片就出现了。

### 三条硬性约定

1. **零依赖、零网络请求** —— 不引 CDN、不调外部 API（Google Fonts 为可选增强，失败自动回退系统字体）
2. **不用 ES module** —— 用普通 `<script src>`，`type="module"` 在 `file://` 下会被 CORS 拦截
3. **数据不出本机** —— 所有处理在浏览器完成

## ☁️ Vercel 部署说明

本项目是纯静态站点（无构建步骤），`vercel.json` 已声明 `buildCommand: null` + `outputDirectory: "."`。

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

**右上角的主题按钮不见了？**
主题脚本 `assets/js/theme.js` 加载失败所致——确认文件存在且没有被浏览器扩展拦截。

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
