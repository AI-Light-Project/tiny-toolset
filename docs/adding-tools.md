# 添加新工具指南

工具集采用**模块化**结构：每个工具是一个自包含目录，互不影响。加一个新工具只需改一个文件（注册表）+ 新增一个目录。

## 一分钟流程

```bash
# 1. 复制模板
cp -r tools/_template tools/my-tool

# 2. 改代码（index.html / style.css / app.js / README.md）

# 3. 登记：在 assets/js/tools.js 的 window.TOOLS 数组里追加一条
```

完成后刷新首页即可看到新卡片，无需构建、无需安装依赖。

## 目录规范

```
tools-hub/
├── index.html                 # 首页（工具列表 + 搜索 + 分类）
├── assets/
│   ├── css/hub.css            # 首页样式
│   └── js/
│       ├── tools.js           # ★ 工具注册表（添加工具必须改这里）
│       └── hub.js             # 首页渲染与搜索逻辑
├── tools/
│   ├── _template/             # 新工具脚手架
│   └── <tool-id>/             # 每个工具一个目录，命名用小写+连字符
│       ├── index.html         # 入口，可单独双击打开
│       ├── style.css
│       ├── app.js
│       └── README.md          # 该工具的功能说明与使用方法
└── docs/
    └── adding-tools.md        # 本文件
```

## 注册表字段

`assets/js/tools.js` 中每条记录的字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✓ | 唯一标识，需与目录名一致 |
| `name` | ✓ | 展示名称 |
| `desc` | ✓ | 一句话描述，会显示在卡片上 |
| `icon` | ✓ | 一个 emoji |
| `category` | ✓ | 分类名，首页会自动生成分类筛选按钮 |
| `tags` | | 标签数组，可被搜索命中 |
| `path` | ✓ | 相对首页的入口路径 |
| `version` | | 语义化版本 |
| `updated` | | 更新日期 `YYYY-MM-DD` |
| `features` | | 功能要点数组，卡片上最多展示 3 条 |

> 注册表用 JS（`window.TOOLS`）而不是 JSON 文件，是因为用 `file://` 直接双击首页时，
> `fetch()` 读取本地 JSON 会被浏览器的 CORS 策略拦截。改成 `<script src>` 引入则没有这个问题。

## 开发约定

1. **零依赖**：不引 CDN、不装 npm 包，断网可用。
2. **不用 ES module**：`<script src="app.js"></script>` 普通引入即可（`type="module"` 在 `file://` 下会被 CORS 拦截）。
3. **数据不出本机**：所有计算在浏览器完成。
4. **沿用设计变量**：`style.css` 顶部已经备好 `--primary`、`--text-sub` 等变量，和首页风格保持一致。
5. **每个工具页都要放返回入口**：`<a class="back-home" href="../../index.html">←</a>`。

## 本地预览

直接双击 `index.html` 就能用。如果想用本地服务器（某些浏览器对 `file://` 有额外限制）：

```bash
cd tools-hub
python -m http.server 8000
# 打开 http://localhost:8000
```

## 提交前自检清单

- [ ] `node --check tools/<tool-id>/app.js` 无报错
- [ ] `window.TOOLS` 里已登记，且 `path` 与实际文件路径一致
- [ ] 单独打开 `tools/<tool-id>/index.html` 也能正常工作（不要依赖首页）
- [ ] 页面里有返回工具集的入口
- [ ] 已写 `tools/<tool-id>/README.md`
- [ ] 根目录 `README.md` 的工具清单已同步
