#!/bin/bash

# 创建一个临时目录用于打包
mkdir -p dist
rm -rf dist/*

# 复制必要的文件到临时目录
echo "正在准备文件..."
cp manifest.json popup.html popup.js content.js background.js qrcode.min.js dist/
cp -r images dist/

# 移除不必要的文件
rm -f dist/images/icon_base64.js
rm -f dist/images/README.md

# 创建zip文件（Chrome Web Store需要zip格式）
echo "正在创建zip文件..."
cd dist
zip -r ../web-notebook-extension.zip *
cd ..

echo "打包完成！"
echo "您可以在以下位置找到打包好的文件："
echo "- ZIP文件（用于Chrome Web Store提交）: $(pwd)/web-notebook-extension.zip"
echo ""
echo "如果您想创建.crx文件，请按照以下步骤操作："
echo "1. 打开Chrome浏览器，访问 chrome://extensions/"
echo "2. 开启右上角的"开发者模式""
echo "3. 点击"打包扩展程序"按钮"
echo "4. 在"扩展程序根目录"字段中，输入 $(pwd)/dist"
echo "5. 点击"打包扩展程序"按钮"
echo "6. Chrome将生成.crx文件和.pem密钥文件"
echo ""
echo "注意：请妥善保管.pem密钥文件，它用于未来更新您的扩展"

