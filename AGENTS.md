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

## 版本号规则

**每次推送更改时必须递增插件版本号。**

- 各插件维护各自的版本号（`manifest.json` 和 `package.json`）
- 版本号格式：`major.minor.patch`（如 1.0.0 → 1.0.1）
- 只修改被修改的插件版本号

## Git 提交规则

**所有提交必须使用 `main` 分支，禁止创建其他分支进行提交。**

提交流程：
1. 直接在 `main` 分支上进行开发
2. 完成后直接提交到 `main` 分支
3. 推送到远程：`git push origin main`

如需临时保存进度，使用 git stash 而不是创建新分支。