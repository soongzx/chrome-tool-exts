# chrome-exts

Chrome Extension v3 项目，每个插件独立目录。

## 项目结构

- `extension-N/` - 插件目录，包含 `manifest.json` (v3) 和 `src/`
- `src/` - 源码目录，含 `background.js`、`content.js`、`popup/` 和 `icons/`
- `docs/` - 补充文档

## 开发

无需构建，Chrome 直接加载插件目录即可测试：

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择插件目录

## 规范

- manifest 统一使用 Chrome Extension v3
- 仅申请必要权限
- 代码简洁，专注单一功能