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

  // 添加一个变量来跟踪当前正在编辑的笔记索引
  let currentEditingIndex = -1;
  // 用于存储二维码实例
  let qrCodeInstance = null;

  // 加载保存的笔记
  loadNotes();

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
    // 显示URL
    qrcodeUrl.textContent = url;
    qrcodeUrl.title = url;

    // 清除之前的二维码
    if (qrCodeInstance) {
      qrCodeInstance.clear();
    }

    // 创建新的二维码
    const qrcodeElement = document.getElementById('qrcode');
    qrcodeElement.innerHTML = '';

    qrCodeInstance = new QRCode(qrcodeElement, {
      text: url,
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

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
    chrome.storage.sync.get('notes', function(data) {
      const notes = data.notes || [];
      notesContainer.innerHTML = '';

      if (notes.length === 0) {
        notesContainer.innerHTML = '<div class="empty-state"><p>暂无笔记</p><p>点击右上角的保存按钮添加新笔记</p></div>';
        return;
      }

      notes.forEach(function(note, index) {
        const noteElement = createNoteElement(note, index);
        notesContainer.appendChild(noteElement);
      });

      // 滚动到最新的笔记
      notesContainer.scrollTop = notesContainer.scrollHeight;
    });
  }

  // 保存新笔记
  function saveNote(text) {
    chrome.storage.sync.get('notes', function(data) {
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
        chrome.storage.sync.set({notes: notes}, function() {
          loadNotes();
        });
      });
    });
  }

  // 更新现有笔记
  function updateNote(index, text) {
    chrome.storage.sync.get('notes', function(data) {
      const notes = data.notes || [];
      if (index >= 0 && index < notes.length) {
        notes[index].text = text;
        notes[index].lastEdited = new Date().toLocaleString();

        chrome.storage.sync.set({notes: notes}, function() {
          loadNotes();
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

    const contentDiv = document.createElement('div');
    contentDiv.className = 'note-content';
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

  // 编辑笔记
  function editNote(index) {
    chrome.storage.sync.get('notes', function(data) {
      const notes = data.notes || [];
      if (index >= 0 && index < notes.length) {
        // 移除之前编辑笔记的高亮
        const previousEditingNote = document.querySelector('.editing-note');
        if (previousEditingNote) {
          previousEditingNote.classList.remove('editing-note');
        }

        // 高亮当前编辑的笔记
        const currentNote = document.querySelector(`.note[data-index="${index}"]`);
        if (currentNote) {
          currentNote.classList.add('editing-note');
        }

        // 设置当前编辑的笔记索引
        currentEditingIndex = index;
        // 将笔记内容填充到输入框
        noteInput.value = notes[index].text;
        // 聚焦输入框
        noteInput.focus();
        // 更改保存按钮提示
        saveNoteBtn.title = '更新笔记';
      }
    });
  }

  // 删除笔记
  function deleteNote(index) {
    chrome.storage.sync.get('notes', function(data) {
      const notes = data.notes || [];
      notes.splice(index, 1);
      chrome.storage.sync.set({notes: notes}, function() {
        loadNotes();
        // 如果正在编辑被删除的笔记，重置编辑状态
        if (currentEditingIndex === index) {
          resetEditMode();
        } else if (currentEditingIndex > index) {
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

