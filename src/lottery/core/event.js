import { resetPrize } from "../prizeList";
import mockData from "../mock";
import { parseExcelWithMapping } from "../mock";
import { exportExcelOnly, exportPDFOnly } from "../utils/export";
import { resetCard, lottery, rotateBallInfinitely, stopRotateBall } from "./lottery";
import { switchScreen, onWindowResize } from "./animation";
import { AppState } from "./init";
import ExcelJS from 'exceljs';

function bindEvent() {
  // console.log('Binding events...'); // 调试日志

  const fileInput = document.getElementById('fileInput');
  const uploadExcel = document.getElementById('uploadExcel');
  const uploadButton = document.getElementById('uploadButton');
  const uploadBox = document.getElementById('uploadBox');
  const fileName = document.querySelector('.file-name');
  const columnSelection = document.getElementById('columnSelection');
  // const columnsContainer = document.querySelector('.columns-container');
  const newColumnInput = document.getElementById('newColumnName');
  const enumNumInput = document.getElementById('enum');
  const startNumInput = document.getElementById('startNumber');

  const excelBtn = document.getElementById("exportExcel");
  const pdfBtn = document.getElementById("exportPDF");
  const dataLabels = document.getElementById("dataLabels");
  let isBoxVisible = false;
  // 文件选择处理
  // const customColumnsWrapper = document.querySelector('.custom-columns-wrapper');

  excelBtn.addEventListener('click', async () => {
    // 阻止事件冒泡
    console.log("cilck export excel btn");
    // e.stopPropagation();
    // 收起动画
    // closeModal(modalOverlay, modalContent, buttonRect, () => {
      exportExcelOnly();
    // });
  });
  
  pdfBtn.addEventListener('click', async () => {
    // 阻止事件冒泡
    // e.stopPropagation();
    // 收起动画
    // closeModal(modalOverlay, modalContent, buttonRect, () => {
      exportPDFOnly();
    // });
  });

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
      fileName.textContent = '未选择文件';
      uploadExcel.disabled = true;
      columnSelection.classList.add('hidden');
      // customColumnsWrapper.classList.add('hidden');
      document.querySelector('.title-input-wrapper').classList.add('hidden');
      return;
    }

    fileName.textContent = file.name;
    document.querySelector('.title-input-wrapper').classList.remove('hidden');
    document.getElementById("uploadExcel").classList.remove('hidden');
    // document.querySelector('.enum-input-wrapper').classList.remove('hidden');
    // document.querySelector('.start-input-wrapper').classList.remove('hidden');
    try {
      // 预览Excel文件，获取列名
      const columns = await previewExcel(file);
      localStorage.setItem("excelColumns", JSON.stringify(columns));
      // 清空之前的选项
      // columnsContainer.innerHTML = '';
      dataLabels.innerHTML = '';
      
      // 获取总数据条数
      const excelData = JSON.parse(localStorage.getItem("excelData"));
      const totalCount = excelData ? excelData.length - 1 : 0; // 减去表头
      localStorage.setItem("count", totalCount.toString());
      
      // 设置默认值
      enumNumInput.value = localStorage.getItem("count");
      startNumInput.value = 1;
      newColumnInput.value = "考号";
      // 创建单个列选择
      const truncateColumnName = (columnName, maxLength = 11) => {
        if (columnName.length > maxLength) {
          return columnName.substring(0, maxLength) + '...';
        }
        return columnName;
      };
      const item = document.createElement('div');
      const labels = document.createElement('div');
      const labelUseFor = document.getElementById("labelUseForDiv");
      item.className = 'column-item';
      labels.className = 'column-item';
      item.innerHTML = `
      <select name="dataColumn">
        <option value="">请选择</option>
        ${columns.map((col, index) => `
          <option value="${index}" title="${col}">${truncateColumnName(col)}</option>
        `).join('')}
      </select>
      `;
      labels.innerHTML = `
      <select name="dataLabel">
        <option value="">无</option>
        ${columns.map((col, index) => `
          <option value="${index}" title="${col}">${truncateColumnName(col)}</option>
        `).join('')}
      </select>
      `;
      // columnsContainer.appendChild(item);
      dataLabels.appendChild(labels);
      // 添加标签选择事件监听
      const labelSelect = labels.querySelector('select[name="dataLabel"]');
      labelSelect.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        if (selectedValue === '') {
          // 如果选择"无"，隐藏标签用途
          labelUseFor.classList.add("hidden");
          // enumNumInput.disabled = false;
          // enumNumInput.value = localStorage.getItem("count") || '';
        } else {
          // 如果选择了标签，显示标签用途设置
          labelUseFor.classList.remove("hidden");
          // enumNumInput.value = localStorage.getItem("count") || '';
          // enumNumInput.disabled = true;
        }
      });
      // 添加标签选择事件监听
      const labelUseSelect = labelUseFor.querySelector('select[name="labelUseFor"]');
      labelUseSelect.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        if (selectedValue === '数据均分') {
          // 如果选择"数据均分"，启用输入框并恢复默认值
          enumNumInput.disabled = false;
          enumNumInput.value = enumNum;
        } else {
          // 如果选择了数据聚合，设置签数值为默认值数据总数并禁用输入框
          enumNum = enumNumInput.value;
          enumNumInput.value = localStorage.getItem("count") || '';
          enumNumInput.disabled = true;
        }
      });
      columnSelection.classList.remove('hidden');
      // customColumnsWrapper.classList.remove('hidden');
      uploadExcel.disabled = false;

    } catch (error) {
      alert(error.message);
      fileName.textContent = '文件解析失败';
      uploadExcel.disabled = true;
      columnSelection.classList.add('hidden');
      // customColumnsWrapper.classList.add('hidden');
    }
  });

  // 上传按钮处理
  uploadExcel.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    // 获取用户设置数据
    localStorage.setItem("enumCount", enumNumInput.value);
    localStorage.setItem("start", startNumInput.value);

    // 获取用户选择的列
    // const selectedColumn = document.querySelector('select[name="dataColumn"]').value;
    // patch 把用户选择的列默认为姓名
    const selectedColumn = JSON.parse(localStorage.getItem("excelColumns")).indexOf("姓名");
    const selectedLabel = parseInt(document.querySelector('select[name="dataLabel"]').value);
    // const customColumns = Array.from(document.querySelectorAll('.column-tag')).map(tag => tag.textContent.replace('×', '').trim());
    const customColumns = [newColumnInput.value];
    localStorage.setItem("customColumns", JSON.stringify(customColumns));
    
    if (selectedLabel !== -1) {
      localStorage.setItem("selectedLabel", JSON.stringify(selectedLabel));
      localStorage.setItem("labelUseFor", document.querySelector('select[name="labelUseFor"]').value);
    }
    // // 验证是否选择了列
    // if (selectedColumn === '') {
    //   alert('请选择数据列');
    //   return;
    // }
    // 验证是否设置了自定义列
    // if (customColumns.length === 0) {
    //   alert('请设置自定义列');
    //   return;
    // }

    const prizeTitle = document.getElementById('prizeTitle').value.trim();
    if (prizeTitle) {
      localStorage.setItem('title', prizeTitle);
    }

    try {
      await parseExcelWithMapping(file, selectedColumn);
      hideUploadBox();
      localStorage.setItem("setExcel", true);
      location.reload();
    } catch (error) {
      alert(error.message);
    }
  });

  uploadButton.addEventListener('click', (event) => {
    event.stopPropagation(); // 阻止事件冒泡

    // 如果弹窗已经显示，则隐藏它
    if (isBoxVisible) {
      hideUploadBox();
      return;
    }

    // 显示弹窗
    const rect = uploadButton.getBoundingClientRect();
    uploadBox.style.left = `${rect.left + rect.width / 2}px`;
    uploadBox.style.top = `${rect.top}px`;
    uploadBox.style.transform = 'translate(-50%, 0) scale(0.5)';
    uploadBox.style.opacity = '0';
    uploadBox.style.display = 'block';

    requestAnimationFrame(() => {
      uploadBox.style.transition = 'all 0.3s ease-out';
      uploadBox.style.transform = 'translate(-50%, -105%) scale(1)';
      uploadBox.style.opacity = '1';
    });

    isBoxVisible = true;
  });

  // 点击上传框内部时阻止事件冒泡
  uploadBox.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  // 点击任何地方都会触发隐藏
  document.addEventListener('click', () => {
    if (isBoxVisible) {
      hideUploadBox();
    }
  });

  // 封装隐藏弹窗的函数
  function hideUploadBox() {
    uploadBox.style.transition = 'all 0.3s ease-in';
    uploadBox.style.transform = 'translate(-50%, 0) scale(0.5)';
    uploadBox.style.opacity = '0';

    setTimeout(() => {
      uploadBox.style.display = 'none';
    }, 300);

    isBoxVisible = false;
  }

  document.querySelector("#menu").addEventListener("click", function (e) {
    e.stopPropagation();
    // 如果正在抽奖，则禁止一切操作'
    let target = e.target.id;
    if (target === 'enter') {
      if (!localStorage.getItem("setExcel")) {
        window.alert("请先设置数据");
        return false;
      }
    }
    if (!['reset', 'back'].includes(target)) {
      if (AppState.status.isLotting) {
        console.log("抽慢一点点～～抽奖还没结束");
        return false;
      }
      let perCount = AppState.lottery.EACH_COUNT[AppState.status.currentPrizeIndex],
        leftCount = AppState.status.basicData.leftUsers.length;
      const notAllowed = perCount > leftCount;

      if (notAllowed) {
        console.log("池中已经没有人拉,请重置抽奖人员池");
        return false;
      }

      //骇客
      // console.log(AppState.status.currentPrize);

    }

    switch (target) {
      // 显示数字墙
      case "welcome":
        switchScreen("enter");
        rotate = false;
        break;
      //返回首页
      case "back":

        switchScreen("enter");

        rotate = false;
        break;
      // 进入抽奖
      case "awards":
        replaceMusic(AppState.status.currentPrize.awards);

        break;
      case "enter":
        removeHighlight();
        console.log(`马上抽取[${AppState.status.currentPrize.title}],不要走开。`);
        AppState.status.rotate = true;
        switchScreen("lottery");
        break;
      // 重置
      case "reset":
        let doREset = window.confirm(
          "是否确认重置数据，重置后，当前已设置的数据全部清空？"
        );
        if (!doREset) {
          return;
        }
        console.log("重置所有数据，重新抽奖");
        addHighlight();
        resetCard().then(res => {
          // 重置所有数据
          AppState.status.currentLuckys = [];
          AppState.status.basicData.leftUsers = Object.assign([], AppState.status.basicData.users);
          AppState.status.basicData.luckyUsers = {};
          AppState.status.currentPrizeIndex = AppState.status.basicData.prizes.length - 1;
          AppState.status.currentPrize = AppState.status.basicData.prizes[AppState.status.currentPrizeIndex];

          resetPrize(AppState.status.currentPrizeIndex);
          resetMock();
          switchScreen("enter");
        });
        break;
      // 抽奖
      case "lottery":
        if (AppState.lottery.isRotating) {
          AppState.status.isLotting = true;
          AppState.status.showPrize = true;
          e.target.textContent = "抽签";
          stopRotateBall().then(() => {
            lottery();
          });
        } else {
          resetCard().then(res => {
            e.target.textContent = "停止";
            rotateBallInfinitely();
          });
        }
        break;
      // 重新抽奖
      case "reLottery":
        if (AppState.status.currentLuckys.length === 0) {
          console.log(`当前还没有抽奖，无法重新抽取喔~~`);
          return;
        }
        console.log(`重新抽取[${AppState.status.currentPrize.title}],做好准备`);
        AppState.status.isLotting = true;
        resetCard().then(res => {
          lottery();
        });
        break;

      case "result":
        saveMock().then(res => {
          resetCard().then(res => {
            // 将之前的记录置空
            AppState.status.currentLuckys = [];
          });
        });
        break;

    }
  });

  window.addEventListener("resize", onWindowResize, false);

  const exportButton = document.getElementById('exportResult');
  exportButton.addEventListener('click', showExportOptions);
}

// 显示导出选项对话框
function showExportOptions() {
  // 如果弹窗已经存在，则关闭它
  if (exportModalVisible && currentExportModal) {
    const exportButton = document.getElementById('exportResult');
    const buttonRect = exportButton.getBoundingClientRect();
    closeModal(currentExportModal.content, buttonRect);
    return;
  }
  // 获取导出按钮位置信息，用于动画
  const exportButton = document.getElementById('exportResult');
  const buttonRect = exportButton.getBoundingClientRect();
  
  // // 创建弹窗
  // const modalOverlay = document.getElementById('overDelay');
  // modalOverlay.style.position = 'fixed';
  // modalOverlay.style.top = '0';
  // modalOverlay.style.left = '0';
  // modalOverlay.style.width = '100%';
  // modalOverlay.style.height = '100%';
  // modalOverlay.style.zIndex = '5000';
  // modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)'; // 初始透明
  // modalOverlay.style.transition = 'background-color 0.3s ease-out';

  const modalContent = document.getElementById("exportBox");
  
  // 设置初始位置和大小（从按钮位置开始）
  modalContent.style.top = `${buttonRect.bottom}px`;
  modalContent.style.left = `${buttonRect.left + buttonRect.width/2}px`;
  modalContent.style.opacity = '0';
  modalContent.style.position = 'fixed'; // 确保使用fixed定位
  modalContent.style.transform = 'translate(-50%, 0) scale(0.5)';
  modalContent.style.zIndex = '9999'; // 确保内容在最上层
  modalContent.style.display = 'block';

  // Excel导出按钮
  // const excelBtn = document.getElementById("exportExcel");
  // excelBtn.style.marginRight = `${0.4 * Resolution}vh`;
  // excelBtn.style.flex = '1';
  // excelBtn.style.fontSize = `${1.25 * Resolution}vh`; // 增大标题字体
  // excelBtn.style.padding = `${0.25 * Resolution}vh ${0.4 * Resolution}vh`; // 增加按钮内边距
  
  // PDF导出按钮
  // const pdfBtn = document.getElementById("exportPDF");
  // pdfBtn.style.flex = '1';
  // pdfBtn.style.fontSize = `${1.25 * Resolution}vh`; // 增大标题字体
  // pdfBtn.style.padding = `${0.25 * Resolution}vh ${0.4 * Resolution}vh`; // 增加按钮内边距
  
  // 组装DOM
  // document.body.appendChild(modalOverlay);

  // 保存当前弹窗引用
  currentExportModal = {
    // overlay: modalOverlay,
    content: modalContent
  };
  exportModalVisible = true;

  // 应用动画效果 - 从按钮展开到完整大小
  setTimeout(() => {
    // modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';

    // // 计算新位置，向上移动
    // const newTop = buttonRect.top - (10 * Resolution * window.innerHeight / 100); // 向上移动15vh
    // const newLeft = buttonRect.left - (5 * Resolution * window.innerWidth / 100); // 中心对齐

    // modalContent.style.top = `${Math.max(2 * Resolution * window.innerHeight / 100, newTop)}px`; // 不要太靠近顶部
    // modalContent.style.left = `${newLeft}px`;
    // modalContent.style.width = `${20 * Resolution}vw`;
    // modalContent.style.height = `${8 * Resolution}vh`; // 增加高度
    modalContent.style.opacity = '1';
    modalContent.style.transition = 'all 0.3s ease-out';
    modalContent.style.transform = 'translate(-50%, -205%) scale(1)';
  }, 10);
  
  // 阻止点击内容时触发背景点击事件
  modalContent.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// 关闭模态框的动画函数
function closeModal(content, buttonRect, callback) {
  // 反向动画 - 收缩回按钮位置
  content.style.opacity = '0';
  content.style.transition = 'all 0.3s ease-in';
  content.style.transform = 'translate(-50%, 0) scale(0.5)';
  
  // 重置弹窗状态
  AppState.status.exportModalVisible = false;
  AppState.status.currentExportModal = null;
  // 动画完成后移除元素
  setTimeout(() => {
    content.style.display = 'none';
    if (callback) callback();
  }, 300);
}

// 重置Mock数据
function resetMock() {
  // 这里可以根据需要实现重置Mock数据的逻辑
}

// 保存Mock数据
function saveMock() {
  return new Promise((resolve) => {
    // 这里可以根据需要实现保存Mock数据的逻辑
    resolve();
  });
}

// 移除高亮
function removeHighlight() {
  // 这里可以根据需要实现移除高亮的逻辑
}

// 添加高亮
function addHighlight() {
  // 这里可以根据需要实现添加高亮的逻辑
}

// 替换音乐
function replaceMusic(music) {
  // 这里可以根据需要实现替换音乐的逻辑
}

// 预览Excel文件，获取列名
async function previewExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);
        
        // 获取第一个工作表
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          reject(new Error('Excel文件没有工作表'));
          return;
        }
        
        // 读取第一行作为列名
        const firstRow = worksheet.getRow(1);
        if (!firstRow) {
          reject(new Error('Excel文件没有数据'));
          return;
        }
        
        // 提取列名
        const columns = [];
        firstRow.eachCell((cell, colNumber) => {
          if (cell.value) {
            columns.push(String(cell.value));
          } else {
            columns.push(`列${colNumber}`);
          }
        });
        
        // 保存原始数据到localStorage
        const excelData = [];
        worksheet.eachRow((row, rowNumber) => {
          const rowData = [];
          row.eachCell((cell) => {
            rowData.push(cell.value ? String(cell.value) : '');
          });
          excelData.push(rowData);
        });
        localStorage.setItem("excelData", JSON.stringify(excelData));
        
        resolve(columns);
      } catch (error) {
        reject(new Error('Excel文件解析失败: ' + error.message));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export { bindEvent };