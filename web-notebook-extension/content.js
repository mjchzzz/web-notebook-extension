// 监听来自popup.js的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getSelection") {
    // 获取用户在页面上选中的文本
    const selectedText = window.getSelection().toString();
    console.log("content.js: 选中的文本是:", selectedText);
    sendResponse({selectedText: selectedText});
  }
  return true; // 这行很重要，确保异步响应能正常工作
});

// 创建右键菜单选项的处理函数
document.addEventListener('mouseup', function(event) {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    // 通知后台脚本有文本被选中
    chrome.runtime.sendMessage({
      action: "textSelected",
      text: selectedText
    });
  }
});

// 添加快捷键支持
document.addEventListener('keydown', function(event) {
  // Ctrl+Shift+S (Windows/Linux) 或 Command+Shift+S (Mac) 快速保存选中内容
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 's') {
    event.preventDefault();
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      chrome.runtime.sendMessage({
        action: "quickSave",
        text: selectedText,
        url: window.location.href,
        title: document.title
      });
    }
  }
});

