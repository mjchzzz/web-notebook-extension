# 贡献指南

感谢您考虑为网页笔记本项目做出贡献！以下是一些指导方针，帮助您参与到项目中来。

## 如何贡献

1. **报告Bug**
   - 使用[GitHub Issues](https://github.com/mjchzzz/web-notebook-extension/issues)提交bug报告
   - 清晰描述问题，包括复现步骤
   - 如果可能，提供截图或错误日志

2. **提出新功能**
   - 在提交新功能请求前，请先检查是否已有类似请求
   - 详细描述新功能的工作方式和解决的问题
   - 如果可能，提供草图或流程图

3. **提交代码**
   - Fork仓库
   - 创建您的特性分支：`git checkout -b feature/amazing-feature`
   - 提交您的更改：`git commit -m 'Add some amazing feature'`
   - 推送到分支：`git push origin feature/amazing-feature`
   - 提交Pull Request

## 开发设置

1. 克隆仓库：
   ```bash
   git clone https://github.com/mjchzzz/web-notebook-extension.git
   cd web-notebook-extension
   ```

2. 安装开发版扩展：
   - 在Chrome浏览器中访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目目录

3. 测试更改：
   - 修改代码后，在扩展页面点击刷新按钮应用更改
   - 或者使用 `./package_extension.sh` 脚本重新打包扩展

## 代码风格指南

- 使用2个空格进行缩进
- 使用分号结束语句
- 变量和函数使用驼峰命名法
- 添加适当的注释，特别是对于复杂的逻辑
- 保持代码简洁，避免不必要的复杂性

## Pull Request流程

1. 确保您的PR描述清晰地说明了更改内容和原因
2. 如果您的PR解决了特定的issue，请在描述中引用该issue（例如 "Fixes #123"）
3. 确保您的代码通过所有测试
4. 审核者可能会要求进行更改，请保持积极响应
5. 一旦获得批准，您的PR将被合并

## 行为准则

- 尊重所有贡献者
- 接受建设性批评
- 专注于最适合项目的方向
- 在所有互动中表现出同理心

感谢您的贡献！

