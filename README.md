# chrome-exts
个人开发的自定义Chrome扩展程序合集，专注于实用性、轻量性和易用性。

## 项目介绍

个人Chrome扩展程序合集，包含各类提升浏览效率、解决日常浏览痛点的小工具。所有扩展均基于Chrome Extension v3开发，代码简洁，无冗余功能。

## 目录

- [bookmark-navigator](#bookmark-navigator) - 收藏夹分类导航
- [extension-1](#extension-1) - 插件模板
- [extension-2](#extension-2) - 插件模板

---

## 已包含插件

### bookmark-navigator

Chrome 新标签页收藏夹导航插件，解决收藏夹过多难以查找的问题。

**功能特性：**
- 分类展示收藏夹内容（使用 Chrome 文件夹结构）
- 搜索功能 - 按标题/URL 快速查找
- 排序功能 - 按名称或添加时间排序
- 拖拽排版 - 自由调整分类卡片顺序
- 折叠/展开 - 每个分类默认显示 8 个链接
- 重载按钮 - 一键刷新收藏夹数据
- 现代深色主题 UI（TailwindCSS）

**技术栈：** Chrome Extension v3 + TailwindCSS（本地编译）

**状态：** 可用

**目录：** `bookmark-navigator/`

---

### extension-1

插件开发模板，基于 Chrome Extension v3。

**状态：** 待开发

**目录：** `extension-1/`

---

### extension-2

插件开发模板，基于 Chrome Extension v3。

**状态：** 待开发

**目录：** `extension-2/`

## 安装方法

1. 下载本仓库到本地（git clone https://github.com/你的用户名/chrome-exts.git）
2. 打开Chrome浏览器，进入「扩展程序」页面（chrome://extensions/）
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择对应插件的目录（如：extension-1）
5. 安装完成，即可在Chrome工具栏使用

## 开发说明

- 所有插件基于 Chrome Extension v3 开发
- 依赖：无额外依赖（如需，可在对应插件目录添加package.json）
- 开发规范：代码简洁、注释清晰，专注核心功能，避免冗余

## 许可证

MIT License

## 反馈

如有问题或建议，欢迎提交 Issues 或 Pull Request.