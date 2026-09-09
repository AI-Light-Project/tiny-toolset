# 新工具模板

这是创建新工具的脚手架。整个目录可以直接复制，改完就能用。

## 使用步骤

1. 复制整个 `_template` 目录到 `tools/` 下，重命名为你的工具 id（小写字母 + 连字符，如 `image-resize`）：

   ```bash
   cp -r tools/_template tools/image-resize
   ```

2. 改 `index.html`：修改 `<title>`、`<h1>`、`<p class="sub">`，然后写你自己的界面结构。

3. 改 `style.css`：配色变量已经和工具集首页统一，一般不用动；只在需要新组件时追加样式。

4. 改 `app.js`：把 `transform()` 换成真正的业务逻辑。

5. 在 `assets/js/tools.js` 里追加一条注册信息，首页就会自动出现卡片：

   ```js
   {
     id: 'image-resize',
     name: '图片尺寸调整',
     desc: '一句话说明这个工具做什么。',
     icon: '🖼️',
     category: '图片处理',
     tags: ['图片', '批量'],
     path: 'tools/image-resize/index.html',
     version: '0.1.0',
     updated: '2026-09-08',
     illustration: 'assets/img/crayon.png',   // 可选：卡片插画（见 assets/img/CREDITS.md）
     features: ['要点一', '要点二', '要点三']
   }
   ```

6. 把本文件顶部的标题改成你的工具名，补充「功能」和「使用方法」两节。

7. 在仓库根目录 `README.md` 的工具清单里补一行。

## 目录约定

```
tools/<tool-id>/
├── index.html   # 入口，双击即可打开（已接入全局主题系统）
├── style.css    # 样式：只消费 theme.css 的变量，禁止自定义 :root 颜色
├── app.js       # 逻辑
└── README.md    # 该工具的功能说明与使用方法
```

## 三条硬性约定

- **零依赖、零网络请求**：不引 CDN、不调外部 API，断网也能用（Google Fonts 为可选增强，失败自动回退）。
- **不用 ES module**：`<script src="app.js">` 普通引入，否则 `file://` 下会被 CORS 拦截。
- **数据不出本机**：所有处理在浏览器完成，不上传任何文件或文本。

## 主题支持

模板已接入主题系统（右上角悬浮按钮切换，两页面共用同一份 `localStorage`）：

- 颜色/字体/圆角/阴影全部来自 `assets/css/theme.css` 的变量（`--bg`、`--panel`、`--primary`、`--a1`~`--a5` 等）
- 组件样式里**不要**定义 `:root` 颜色变量，否则会覆盖全局主题导致切换失效
- 需要主题专属质感时，把规则写在 `assets/css/theme-maximal.css` 里并用 `[data-theme="xxx"]` 前缀
