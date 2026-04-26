# Bookmark Navigator

在 Chrome 新标签页展示收藏夹分类导航的插件。

## 功能特性

- 分类展示收藏夹内容
- 搜索功能 - 快速查找书签
- 排序功能 - 按名称或添加时间排序
- 拖拽排版 - 自由调整分类卡片顺序
- 折叠/展开 - 每个分类默认显示 8 个链接，其余需展开
- 重载按钮 - 一键刷新收藏夹数据
- 现代 UI - 使用 TailwindCSS 构建

## 安装方法

1. 克隆本仓库
2. 打开 Chrome，进入 `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `bookmark-navigator` 文件夹

## 开发

```bash
cd bookmark-navigator
npm install
npm run dev    # 监听 TailwindCSS 变化
npm run build  # 构建生产版本
```

## 截图

![Bookmark Navigator](screenshot.png)

## 注意事项

- 首次使用需要授予书签访问权限
- 图标可替换为自定义图标（位于 `src/icons/`）