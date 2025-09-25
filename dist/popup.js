document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const notesContainer = document.getElementById('notes-container');
  const noteInput = document.getElementById('note-input');
  const saveNoteBtn = document.getElementById('save-note');
  const grabSelectionBtn = document.getElementById('grab-selection');
  const clearAllBtn = document.getElementById('clear-all');
  const generateQRCodeBtn = document.getElementById('generate-qrcode');
  const qrcodeModal = document.getElementById('qrcode-modal');
  const qrcodeClose = document.getElementById('qrcode-close');
  const qrcodeUrl = document.getElementById('qrcode-url');
  const searchInput = document.getElementById('search-input');
  const themeToggle = document.getElementById('theme-toggle');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const exportBtn = document.getElementById('export-btn');
  const exportModal = document.getElementById('export-modal');
  const exportData = document.getElementById('export-data');
  const copyExportBtn = document.getElementById('copy-export');
  const importDataBtn = document.getElementById('import-data');
  const closeExportBtn = document.getElementById('close-export');
  const storageInfoBtn = document.getElementById('storage-info-btn');

  // 添加一个变量来跟踪当前正在编辑的笔记索引
  let currentEditingIndex = -1;
  // 用于存储二维码实例
  let qrCodeInstance = null;
  // 分页变量
  let currentPage = 0;
  const notesPerPage = 5;
  // 存储所有笔记
  let allNotes = [];
  // 存储当前显示的笔记（可能是搜索结果或分页结果）
  let displayedNotes = [];
  // 拖拽相关变量
  let draggedItem = null;
  let draggedIndex = -1;
  let dragOverIndex = -1;
  // 主题设置
  let isDarkTheme = false;

  // 检查存储状态
  checkStorageStatus();

  // 加载主题设置
  loadThemeSettings();

  // 加载保存的笔记
  loadNotes();

  // 检查存储状态的函数
  function checkStorageStatus() {
    console.log("正在检查存储状态...");

    // 检查存储权限
    if (!chrome.storage || !chrome.storage.sync) {
      console.error("存储API不可用，请检查扩展权限");
      showStorageError("存储API不可用，请检查扩展权限");
      return;
    }

    // 尝试读取存储的笔记
    chrome.storage.sync.get(['notes', 'theme'], function(data) {
      if (chrome.runtime.lastError) {
        console.error("读取存储时出错:", chrome.runtime.lastError.message);
        showStorageError("读取存储时出错: " + chrome.runtime.lastError.message);
        return;
      }

      console.log("存储读取成功:", data);
      const notes = data.notes || [];
      console.log(`找到 ${notes.length} 条笔记`);

      // 尝试写入测试数据
      const testKey = '_storage_test_' + Date.now();
      chrome.storage.sync.set({[testKey]: true}, function() {
        if (chrome.runtime.lastError) {
          console.error("写入测试数据时出错:", chrome.runtime.lastError.message);
          showStorageError("写入存储时出错: " + chrome.runtime.lastError.message);
          return;
        }

        // 清除测试数据
        chrome.storage.sync.remove(testKey, function() {
          console.log("存储测试完成，一切正常");
        });
      });
    });
  }

  // 显示存储错误信息
  function showStorageError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.backgroundColor = '#ffebee';
    errorDiv.style.color = '#c62828';
    errorDiv.style.padding = '10px';
    errorDiv.style.marginBottom = '10px';
    errorDiv.style.borderRadius = '4px';
    errorDiv.style.fontSize = '12px';
    errorDiv.textContent = "存储错误: " + message;

    // 添加重试按钮
    const retryBtn = document.createElement('button');
    retryBtn.textContent = "重试";
    retryBtn.style.marginLeft = '10px';
    retryBtn.style.padding = '3px 8px';
    retryBtn.style.backgroundColor = '#c62828';
    retryBtn.style.color = 'white';
    retryBtn.style.border = 'none';
    retryBtn.style.borderRadius = '3px';
    retryBtn.style.cursor = 'pointer';
    retryBtn.onclick = function() {
      errorDiv.remove();
      checkStorageStatus();
      loadNotes();
    };

    errorDiv.appendChild(retryBtn);

    // 添加到页面
    notesContainer.parentNode.insertBefore(errorDiv, notesContainer);
  }

  // 保存笔记按钮点击事件
  saveNoteBtn.addEventListener('click', function() {
    const noteText = noteInput.value.trim();
    if (noteText) {
      if (currentEditingIndex >= 0) {
        // 更新现有笔记
        updateNote(currentEditingIndex, noteText);
        // 重置编辑状态
        resetEditMode();
      } else {
        // 保存新笔记
        saveNote(noteText);
        noteInput.value = '';
      }
    }
  });

  // 获取选中内容按钮点击事件
  grabSelectionBtn.addEventListener('click', function() {
    console.log("获取选中内容按钮被点击");
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        console.error("没有找到活动标签页");
        return;
      }

      console.log("正在向content script发送消息，标签页ID:", tabs[0].id);
      chrome.tabs.sendMessage(tabs[0].id, {action: "getSelection"}, function(response) {
        console.log("收到响应:", response);
        if (chrome.runtime.lastError) {
          console.error("发送消息时出错:", chrome.runtime.lastError.message);
          return;
        }

        if (response && response.selectedText) {
          const selectedText = response.selectedText.trim();
          console.log("选中的文本:", selectedText);
          if (selectedText) {
            const currentText = noteInput.value;
            noteInput.value = currentText ? currentText + '\n\n' + selectedText : selectedText;
          }
        } else {
          console.log("没有收到响应或响应中没有选中文本");
          alert("未能获取选中内容。请确保您已在网页上选中了文本。");
        }
      });
    });
  });

  // 生成二维码按钮点击事件
  generateQRCodeBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs.length > 0) {
        const currentUrl = tabs[0].url;
        showQRCode(currentUrl, tabs[0].title);
      }
    });
  });

  // 显示二维码
  function showQRCode(url, title) {
    console.log("显示二维码，URL:", url);

    // 显示URL
    qrcodeUrl.textContent = url;
    qrcodeUrl.title = url;

    // 清除之前的二维码
    if (qrCodeInstance) {
      try {
        qrCodeInstance.clear();
      } catch (e) {
        console.error("清除二维码时出错:", e);
      }
    }

    // 创建新的二维码
    const qrcodeElement = document.getElementById('qrcode');
    qrcodeElement.innerHTML = '';

    try {
      // 确保QRCode对象存在
      if (typeof QRCode === 'undefined') {
        throw new Error("QRCode库未加载");
      }

      qrCodeInstance = new QRCode(qrcodeElement, {
        text: url,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
      console.log("二维码创建成功");
    } catch (error) {
      console.error("创建二维码时出错:", error);
      qrcodeElement.innerHTML = '<div style="color: red;">二维码生成失败: ' + error.message + '</div>';
    }

    // 显示模态框
    qrcodeModal.style.display = 'flex';
  }

  // 关闭二维码模态框
  qrcodeClose.addEventListener('click', function() {
    qrcodeModal.style.display = 'none';
  });

  // 点击模态框背景关闭
  qrcodeModal.addEventListener('click', function(e) {
    if (e.target === qrcodeModal) {
      qrcodeModal.style.display = 'none';
    }
  });

  // 清空所有笔记按钮点击事件
  clearAllBtn.addEventListener('click', function() {
    if (confirm('确定要删除所有笔记吗？')) {
      chrome.storage.sync.set({notes: []}, function() {
        if (chrome.runtime.lastError) {
          console.error("清空笔记时出错:", chrome.runtime.lastError.message);
          showStorageError("清空笔记时出错: " + chrome.runtime.lastError.message);
          return;
        }
        console.log("所有笔记已清空");
        allNotes = [];
        displayedNotes = [];
        currentPage = 0;
        loadNotes();
        // 如果正在编辑，重置编辑状态
        resetEditMode();
      });
    }
  });

  // 重置编辑模式
  function resetEditMode() {
    if (currentEditingIndex >= 0) {
      // 移除之前编辑笔记的高亮
      const previousEditingNote = document.querySelector('.editing-note');
      if (previousEditingNote) {
        previousEditingNote.classList.remove('editing-note');
      }

      // 重置编辑状态
      currentEditingIndex = -1;
      saveNoteBtn.title = '保存笔记';
      noteInput.value = '';
    }
  }

  // 加载保存的笔记
  function loadNotes() {
    console.log("正在加载笔记...");
    chrome.storage.sync.get('notes', function(data) {
      if (chrome.runtime.lastError) {
        console.error("加载笔记时出错:", chrome.runtime.lastError.message);
        showStorageError("加载笔记时出错: " + chrome.runtime.lastError.message);
        return;
      }

      allNotes = data.notes || [];
      console.log(`加载了 ${allNotes.length} 条笔记:`, allNotes);

      // 如果有搜索关键词，过滤笔记
      const searchTerm = searchInput.value.trim().toLowerCase();
      if (searchTerm) {
        displayedNotes = allNotes.filter(note =>
          note.text.toLowerCase().includes(searchTerm) ||
          (note.title && note.title.toLowerCase().includes(searchTerm))
        );
      } else {
        displayedNotes = [...allNotes];
      }

      // 渲染当前页的笔记
      renderCurrentPage();
    });
  }

  // 渲染当前页的笔记
  function renderCurrentPage() {
    notesContainer.innerHTML = '';

    // 计算总页数
    const totalPages = Math.ceil(displayedNotes.length / notesPerPage);

    // 确保当前页在有效范围内
    currentPage = Math.max(0, Math.min(currentPage, totalPages - 1));

    // 如果没有笔记，显示空状态
    if (displayedNotes.length === 0) {
      notesContainer.innerHTML = '<div class="empty-state"><p>暂无笔记</p><p>点击右上角的保存按钮添加新笔记</p></div>';
      updatePagination(0, 0);
      return;
    }

    // 计算当前页的笔记范围
    const startIndex = currentPage * notesPerPage;
    const endIndex = Math.min(startIndex + notesPerPage, displayedNotes.length);
    const pageNotes = displayedNotes.slice(startIndex, endIndex);

    // 创建笔记元素
    pageNotes.forEach((note, index) => {
      const globalIndex = startIndex + index;
      const noteElement = createNoteElement(note, globalIndex);
      notesContainer.appendChild(noteElement);
    });

    // 更新分页控件
    updatePagination(currentPage, totalPages);

    // 滚动到顶部
    notesContainer.scrollTop = 0;
  }

  // 更新分页控件
  function updatePagination(page, totalPages) {
    if (totalPages <= 1) {
      document.getElementById('pagination').style.display = 'none';
      return;
    }

    document.getElementById('pagination').style.display = 'flex';
    pageInfo.textContent = `${page + 1} / ${totalPages}`;
    prevPageBtn.disabled = page === 0;
    nextPageBtn.disabled = page >= totalPages - 1;
  }

  // 上一页按钮点击事件
  prevPageBtn.addEventListener('click', function() {
    if (currentPage > 0) {
      currentPage--;
      renderCurrentPage();
    }
  });

  // 下一页按钮点击事件
  nextPageBtn.addEventListener('click', function() {
    const totalPages = Math.ceil(displayedNotes.length / notesPerPage);
    if (currentPage < totalPages - 1) {
      currentPage++;
      renderCurrentPage();
    }
  });

  // 搜索输入事件
  searchInput.addEventListener('input', function() {
    const searchTerm = this.value.trim().toLowerCase();

    if (searchTerm) {
      displayedNotes = allNotes.filter(note =>
        note.text.toLowerCase().includes(searchTerm) ||
        (note.title && note.title.toLowerCase().includes(searchTerm))
      );
    } else {
      displayedNotes = [...allNotes];
    }

    currentPage = 0; // 重置到第一页
    renderCurrentPage();
  });

  // 主题切换按钮点击事件
  themeToggle.addEventListener('click', function() {
    toggleTheme();
  });

  // 切换主题
  function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    applyTheme();
    saveThemeSettings();
  }

  // 应用主题
  function applyTheme() {
    if (isDarkTheme) {
      document.body.classList.add('dark-theme');
      themeToggle.textContent = '☀️';
      themeToggle.title = '切换到亮色主题';
    } else {
      document.body.classList.remove('dark-theme');
      themeToggle.textContent = '🌓';
      themeToggle.title = '切换到暗色主题';
    }
  }

  // 保存主题设置
  function saveThemeSettings() {
    chrome.storage.sync.set({theme: isDarkTheme}, function() {
      if (chrome.runtime.lastError) {
        console.error("保存主题设置时出错:", chrome.runtime.lastError.message);
      } else {
        console.log("主题设置已保存:", isDarkTheme);
      }
    });
  }

  // 加载主题设置
  function loadThemeSettings() {
    chrome.storage.sync.get('theme', function(data) {
      if (!chrome.runtime.lastError && data.theme !== undefined) {
        isDarkTheme = data.theme;
        applyTheme();
      } else {
        // 默认使用系统主题
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          isDarkTheme = true;
          applyTheme();
        }
      }
    });
  }

  // 导出按钮点击事件
  exportBtn.addEventListener('click', function() {
    showExportModal();
  });

  // 显示导出模态框
  function showExportModal() {
    chrome.storage.sync.get('notes', function(data) {
      if (chrome.runtime.lastError) {
        alert("获取笔记数据失败: " + chrome.runtime.lastError.message);
        return;
      }

      const notes = data.notes || [];
      exportData.value = JSON.stringify(notes, null, 2);
      exportModal.style.display = 'flex';
    });
  }

  // 复制导出数据按钮点击事件
  copyExportBtn.addEventListener('click', function() {
    exportData.select();
    document.execCommand('copy');
    alert('数据已复制到剪贴板');
  });

  // 导入数据按钮点击事件
  importDataBtn.addEventListener('click', function() {
    try {
      const importedData = JSON.parse(exportData.value);

      if (!Array.isArray(importedData)) {
        throw new Error('导入的数据格式不正确，应为笔记数组');
      }

      // 验证每个笔记对象的格式
      importedData.forEach(note => {
        if (!note.text || typeof note.text !== 'string') {
          throw new Error('笔记格式不正确，缺少text字段');
        }
      });

      if (confirm(`确定要导入 ${importedData.length} 条笔记吗？这将覆盖当前的所有笔记。`)) {
        chrome.storage.sync.set({notes: importedData}, function() {
          if (chrome.runtime.lastError) {
            alert("导入笔记失败: " + chrome.runtime.lastError.message);
            return;
          }

          alert(`成功导入 ${importedData.length} 条笔记`);
          exportModal.style.display = 'none';
          loadNotes();
        });
      }
    } catch (error) {
      alert("导入数据格式错误: " + error.message);
    }
  });

  // 关闭导出模态框按钮点击事件
  closeExportBtn.addEventListener('click', function() {
    exportModal.style.display = 'none';
  });

  // 点击导出模态框背景关闭
  exportModal.addEventListener('click', function(e) {
    if (e.target === exportModal) {
      exportModal.style.display = 'none';
    }
  });

  // 存储信息按钮点击事件
  storageInfoBtn.addEventListener('click', function() {
    showStorageInfo();
  });

  // 显示存储信息
  function showStorageInfo() {
    chrome.storage.sync.get(null, function(items) {
      if (chrome.runtime.lastError) {
        console.error("获取所有存储项时出错:", chrome.runtime.lastError.message);
        alert("获取存储信息失败: " + chrome.runtime.lastError.message);
        return;
      }

      let storageInfo = "存储信息:\n\n";
      let totalBytes = 0;

      for (let key in items) {
        const itemStr = JSON.stringify(items[key]);
        const bytes = new Blob([itemStr]).size;
        totalBytes += bytes;
        storageInfo += `${key}: ${bytes} 字节\n`;

        if (key === 'notes') {
          const notes = items[key];
          storageInfo += `- 笔记数量: ${notes ? notes.length : 0}\n`;
          if (notes && notes.length > 0) {
            storageInfo += `- 第一条笔记: ${notes[0].text.substring(0, 20)}...\n`;
            storageInfo += `- 最后一条笔记: ${notes[notes.length-1].text.substring(0, 20)}...\n`;
          }
        }
      }

      storageInfo += `\n总存储使用: ${totalBytes} 字节 (限制: 102400 字节)`;
      alert(storageInfo);
    });
  }

  // 保存新笔记
  function saveNote(text) {
    console.log("正在保存新笔记:", text);
    chrome.storage.sync.get('notes', function(data) {
      if (chrome.runtime.lastError) {
        console.error("获取现有笔记时出错:", chrome.runtime.lastError.message);
        showStorageError("保存笔记时出错: " + chrome.runtime.lastError.message);
        return;
      }

      const notes = data.notes || [];
      const newNote = {
        text: text,
        date: new Date().toLocaleString(),
        url: '',
        lastEdited: null
      };

      // 获取当前标签页的URL
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          newNote.url = tabs[0].url;
          newNote.title = tabs[0].title;
        }

        notes.push(newNote);
        console.log("正在保存笔记数组:", notes);
        chrome.storage.sync.set({notes: notes}, function() {
          if (chrome.runtime.lastError) {
            console.error("保存笔记时出错:", chrome.runtime.lastError.message);
            showStorageError("保存笔记时出错: " + chrome.runtime.lastError.message);
            return;
          }
          console.log("笔记保存成功");
          allNotes = notes;
          // 如果有搜索关键词，更新显示的笔记
          const searchTerm = searchInput.value.trim().toLowerCase();
          if (searchTerm) {
            displayedNotes = allNotes.filter(note =>
              note.text.toLowerCase().includes(searchTerm) ||
              (note.title && note.title.toLowerCase().includes(searchTerm))
            );
          } else {
            displayedNotes = [...allNotes];
          }
          // 跳转到最后一页显示新笔记
          currentPage = Math.ceil(displayedNotes.length / notesPerPage) - 1;
          renderCurrentPage();
        });
      });
    });
  }

  // 更新现有笔记
  function updateNote(index, text) {
    console.log(`正在更新笔记 #${index}:`, text);
    chrome.storage.sync.get('notes', function(data) {
      if (chrome.runtime.lastError) {
        console.error("获取现有笔记时出错:", chrome.runtime.lastError.message);
        showStorageError("更新笔记时出错: " + chrome.runtime.lastError.message);
        return;
      }

      const notes = data.notes || [];
      if (index >= 0 && index < notes.length) {
        notes[index].text = text;
        notes[index].lastEdited = new Date().toLocaleString();

        chrome.storage.sync.set({notes: notes}, function() {
          if (chrome.runtime.lastError) {
            console.error("更新笔记时出错:", chrome.runtime.lastError.message);
            showStorageError("更新笔记时出错: " + chrome.runtime.lastError.message);
            return;
          }
          console.log("笔记更新成功");
          allNotes = notes;
          // 如果有搜索关键词，更新显示的笔记
          const searchTerm = searchInput.value.trim().toLowerCase();
          if (searchTerm) {
            displayedNotes = allNotes.filter(note =>
              note.text.toLowerCase().includes(searchTerm) ||
              (note.title && note.title.toLowerCase().includes(searchTerm))
            );
          } else {
            displayedNotes = [...allNotes];
          }
          renderCurrentPage();
        });
      }
    });
  }

  // 创建笔记元素
  function createNoteElement(note, index) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note';
    noteDiv.dataset.index = index;

    // 如果是当前正在编辑的笔记，添加编辑中的样式
    if (index === currentEditingIndex) {
      noteDiv.classList.add('editing-note');
    }

    // 添加拖拽功能
    noteDiv.draggable = true;
    noteDiv.addEventListener('dragstart', handleDragStart);
    noteDiv.addEventListener('dragover', handleDragOver);
    noteDiv.addEventListener('dragleave', handleDragLeave);
    noteDiv.addEventListener('drop', handleDrop);
    noteDiv.addEventListener('dragend', handleDragEnd);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'note-content';

    // 默认折叠长笔记
    const isLongNote = note.text.length > 150;
    if (isLongNote) {
      contentDiv.classList.add('collapsed');
    }

    contentDiv.textContent = note.text;

    contentDiv.addEventListener('click', function(e) {
      // 如果点击的是笔记内容而不是操作按钮
      if (e.target === contentDiv) {
        editNote(index);
      }
    });

    // 创建操作按钮区域
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'note-actions';

    // 添加展开/折叠按钮
    if (isLongNote) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'toggle-btn';
      toggleBtn.innerHTML = '⤵️';
      toggleBtn.title = '展开/折叠笔记';
      toggleBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 阻止事件冒泡
        toggleNoteContent(contentDiv);
      });
      actionsDiv.appendChild(toggleBtn);
    }

    // 添加复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '📋';
    copyBtn.title = '复制笔记内容';
    copyBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 阻止事件冒泡
      copyNoteContent(note.text);
    });
    actionsDiv.appendChild(copyBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.innerHTML = '✎';
    editBtn.title = '编辑笔记';
    editBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 阻止事件冒泡
      editNote(index);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = '删除笔记';
    deleteBtn.addEventListener('click', function(e) {
      e.stopPropagation(); // 阻止事件冒泡
      deleteNote(index);
    });

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    // 创建元数据区域，使用更紧凑的布局
    const metaDiv = document.createElement('div');
    metaDiv.className = 'note-meta';

    // 左侧显示来源
    const sourceDiv = document.createElement('div');
    sourceDiv.className = 'note-meta-source';
    if (note.url) {
      const urlLink = document.createElement('a');
      urlLink.href = note.url;
      urlLink.textContent = note.title || note.url;
      urlLink.title = note.url; // 添加完整URL作为提示
      urlLink.target = '_blank';
      sourceDiv.appendChild(document.createTextNode('来源: '));
      sourceDiv.appendChild(urlLink);
    }

    // 右侧显示时间
    const timeDiv = document.createElement('div');
    timeDiv.className = 'note-meta-time';

    // 格式化日期，只显示月日和时间
    const formatDate = (dateStr) => {
      try {
        const date = new Date(dateStr);
        return `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      } catch (e) {
        return dateStr;
      }
    };

    const dateText = formatDate(note.date);
    timeDiv.textContent = note.lastEdited ? `编辑: ${formatDate(note.lastEdited)}` : dateText;

    metaDiv.appendChild(sourceDiv);
    metaDiv.appendChild(timeDiv);

    noteDiv.appendChild(contentDiv);
    noteDiv.appendChild(metaDiv);
    noteDiv.appendChild(actionsDiv);

    return noteDiv;
  }

  // 展开/折叠笔记内容
  function toggleNoteContent(contentDiv) {
    if (contentDiv.classList.contains('collapsed')) {
      contentDiv.classList.remove('collapsed');
    } else {
      contentDiv.classList.add('collapsed');
    }
  }

  // 复制笔记内容
  function copyNoteContent(text) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);

    // 显示复制成功提示
    const toast = document.createElement('div');
    toast.textContent = '已复制到剪贴板';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    toast.style.color = 'white';
    toast.style.padding = '8px 16px';
    toast.style.borderRadius = '4px';
    toast.style.fontSize = '12px';
    toast.style.zIndex = '1000';
    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 2000);
  }

  // 拖拽开始
  function handleDragStart(e) {
    draggedItem = this;
    draggedIndex = parseInt(this.dataset.index);
    setTimeout(() => {
      this.classList.add('dragging');
    }, 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
  }

  // 拖拽经过
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.currentTarget;
    dragOverIndex = parseInt(target.dataset.index);

    // 高亮拖拽目标
    if (draggedItem !== target) {
      target.style.borderTop = dragOverIndex < draggedIndex ? '2px solid var(--primary-color)' : 'none';
      target.style.borderBottom = dragOverIndex > draggedIndex ? '2px solid var(--primary-color)' : 'none';
    }

    return false;
  }

  // 拖拽离开
  function handleDragLeave(e) {
    e.currentTarget.style.borderTop = 'none';
    e.currentTarget.style.borderBottom = 'none';
  }

  // 拖拽放下
  function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();

    if (draggedItem !== this) {
      // 获取拖拽的笔记和目标笔记的索引
      const fromIndex = draggedIndex;
      const toIndex = parseInt(this.dataset.index);

      // 更新笔记顺序
      reorderNotes(fromIndex, toIndex);
    }

    return false;
  }

  // 拖拽结束
  function handleDragEnd() {
    // 清除所有拖拽样式
    const notes = document.querySelectorAll('.note');
    notes.forEach(note => {
      note.classList.remove('dragging');
      note.style.borderTop = 'none';
      note.style.borderBottom = 'none';
    });

    draggedItem = null;
    draggedIndex = -1;
    dragOverIndex = -1;
  }

  // 重新排序笔记
  function reorderNotes(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;

    chrome.storage.sync.get('notes', function(data) {
      if (chrome.runtime.lastError) {
        console.error("获取笔记进行排序时出错:", chrome.runtime.lastError.message);
        return;
      }

      const notes = data.notes || [];

      // 获取全局索引对应的实际笔记索引
      const startIndex = currentPage * notesPerPage;
      const realFromIndex = displayedNotes[fromIndex].text === notes[fromIndex].text ?
                           fromIndex : notes.findIndex(n => n.text === displayedNotes[fromIndex].text);
      const realToIndex = displayedNotes[toIndex].text === notes[toIndex].text ?
                         toIndex : notes.findIndex(n => n.text === displayedNotes[toIndex].text);

      if (realFromIndex === -1 || realToIndex === -1) {
        console.error("找不到要重新排序的笔记");
        return;
      }

      // 移动笔记
      const [movedNote] = notes.splice(realFromIndex, 1);
      notes.splice(realToIndex, 0, movedNote);

      // 保存更新后的笔记数组
      chrome.storage.sync.set({notes: notes}, function() {
        if (chrome.runtime.lastError) {
          console.error("保存重新排序的笔记时出错:", chrome.runtime.lastError.message);
          return;
        }

        console.log(`笔记从位置 ${realFromIndex} 移动到位置 ${realToIndex}`);

        // 更新本地笔记数组
        allNotes = notes;

        // 如果有搜索关键词，更新显示的笔记
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm) {
          displayedNotes = allNotes.filter(note =>
            note.text.toLowerCase().includes(searchTerm) ||
            (note.title && note.title.toLowerCase().includes(searchTerm))
          );
        } else {
          displayedNotes = [...allNotes];
        }

        // 重新渲染当前页
        renderCurrentPage();

        // 如果正在编辑的笔记被移动，更新编辑索引
        if (currentEditingIndex === realFromIndex) {
          currentEditingIndex = realToIndex;
        } else if (currentEditingIndex > realFromIndex && currentEditingIndex <= realToIndex) {
          currentEditingIndex--;
        } else if (currentEditingIndex < realFromIndex && currentEditingIndex >= realToIndex) {
          currentEditingIndex++;
        }
      });
    });
  }

  // 编辑笔记
  function editNote(index) {
    console.log(`正在编辑笔记 #${index}`);
    chrome.storage.sync.get('notes', function(data) {
      if (chrome.runtime.lastError) {
        console.error("获取笔记进行编辑时出错:", chrome.runtime.lastError.message);
        showStorageError("编辑笔记时出错: " + chrome.runtime.lastError.message);
        return;
      }

      const notes = data.notes || [];
      // 找到对应的全局索引
      const startIndex = currentPage * notesPerPage;
      const globalIndex = index;
      const realIndex = notes.findIndex(n => n.text === displayedNotes[globalIndex].text);

      if (realIndex >= 0 && realIndex < notes.length) {
        // 移除之前编辑笔记的高亮
        const previousEditingNote = document.querySelector('.editing-note');
        if (previousEditingNote) {
          previousEditingNote.classList.remove('editing-note');
        }

        // 高亮当前编辑的笔记
        const currentNote = document.querySelector(`.note[data-index="${globalIndex}"]`);
        if (currentNote) {
          currentNote.classList.add('editing-note');
        }

        // 设置当前编辑的笔记索引
        currentEditingIndex = realIndex;
        // 将笔记内容填充到输入框
        noteInput.value = notes[realIndex].text;
        // 聚焦输入框
        noteInput.focus();
        // 更改保存按钮提示
        saveNoteBtn.title = '更新笔记';
      }
    });
  }

  // 删除笔记
  function deleteNote(index) {
    console.log(`正在删除笔记 #${index}`);
    chrome.storage.sync.get('notes', function(data) {
      if (chrome.runtime.lastError) {
        console.error("获取笔记进行删除时出错:", chrome.runtime.lastError.message);
        showStorageError("删除笔记时出错: " + chrome.runtime.lastError.message);
        return;
      }

      const notes = data.notes || [];
      // 找到对应的全局索引
      const globalIndex = index;
      const realIndex = notes.findIndex(n => n.text === displayedNotes[globalIndex].text);

      if (realIndex === -1) {
        console.error("找不到要删除的笔记");
        return;
      }

      notes.splice(realIndex, 1);
      chrome.storage.sync.set({notes: notes}, function() {
        if (chrome.runtime.lastError) {
          console.error("删除笔记时出错:", chrome.runtime.lastError.message);
          showStorageError("删除笔记时出错: " + chrome.runtime.lastError.message);
          return;
        }
        console.log("笔记删除成功");

        // 更新本地笔记数组
        allNotes = notes;

        // 如果有搜索关键词，更新显示的笔记
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm) {
          displayedNotes = allNotes.filter(note =>
            note.text.toLowerCase().includes(searchTerm) ||
            (note.title && note.title.toLowerCase().includes(searchTerm))
          );
        } else {
          displayedNotes = [...allNotes];
        }

        // 如果当前页没有笔记了，回到上一页
        const totalPages = Math.ceil(displayedNotes.length / notesPerPage);
        if (currentPage >= totalPages && currentPage > 0) {
          currentPage--;
        }

        renderCurrentPage();

        // 如果正在编辑被删除的笔记，重置编辑状态
        if (currentEditingIndex === realIndex) {
          resetEditMode();
        } else if (currentEditingIndex > realIndex) {
          // 如果正在编辑的笔记索引大于被删除的索引，需要调整
          currentEditingIndex--;
        }
      });
    });
  }

  // 按下Enter键保存笔记
  noteInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveNoteBtn.click();
    }
  });
});

