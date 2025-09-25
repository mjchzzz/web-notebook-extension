// 初始化扩展
chrome.runtime.onInstalled.addListener(function() {
  // 创建右键菜单
  chrome.contextMenus.create({
    id: "saveSelection",
    title: "保存选中内容到笔记本",
    contexts: ["selection"]
  });

  // 初始化存储
  chrome.storage.sync.get('notes', function(data) {
    if (!data.notes) {
      chrome.storage.sync.set({notes: []});
    }
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "saveSelection") {
    const selectedText = info.selectionText;

    if (selectedText) {
      saveQuickNote(selectedText, tab.url, tab.title);
    }
  }
});

// 监听来自content.js的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // 处理快速保存请求
  if (request.action === "quickSave") {
    saveQuickNote(request.text, request.url, request.title);
    // 显示简单的提示（不需要notifications权限）
    chrome.action.setBadgeText({ text: "已存" });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });

    // 2秒后清除徽章
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, 2000);
  }

  // 处理文本选中事件
  if (request.action === "textSelected") {
    // 可以在这里添加额外的处理逻辑
  }
});

// 保存快速笔记
function saveQuickNote(text, url, title) {
  chrome.storage.sync.get('notes', function(data) {
    const notes = data.notes || [];
    const newNote = {
      text: text,
      date: new Date().toLocaleString(),
      url: url,
      title: title
    };

    notes.push(newNote);
    chrome.storage.sync.set({notes: notes});
  });
}

