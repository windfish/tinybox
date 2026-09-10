# 📦 tinybox

一个装满小工具的盒子。纯前端，开箱即用。

每个子项目都是独立的小工具，各自维护依赖，各自构建部署到 GitHub Pages。

## 🧰 工具列表

| 工具 | 目录 | 说明 | 在线体验 |
|------|------|------|----------|
| 🎯 Image Hotspot Editor | [image-hotspot-editor](./image-hotspot-editor) | 可视化图片热区编辑器，一键导出独立 HTML | [立即体验](https://windfish.github.io/tinybox/image-hotspot-editor/) |

## 🚀 本地运行

每个子项目独立运行，以 image-hotspot-editor 为例：

```bash
cd image-hotspot-editor
npm install
npm run dev
```

## 📦 部署

所有工具均部署到 GitHub Pages。

### 部署单个工具

```bash
cd image-hotspot-editor
npm run build
npx gh-pages -d dist -e image-hotspot-editor -r git@github.com:windfish/tinybox.git
```

部署后访问：`https://windfish.github.io/tinybox/<项目名>/`

## 📁 项目结构

```
tinybox/
├── image-hotspot-editor/   # 图片热区编辑器
│   ├── src/
│   └── package.json
├── ...                     # 更多小工具
└── README.md
```

## 📝 License

MIT
