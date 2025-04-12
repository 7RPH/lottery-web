import "./index.css";
import "../css/animate.min.css";
import initCanvas from "./canvas.js";
import {
  addQipao,
  setPrizes,
  showPrizeList,
  setPrizeData,
  resetPrize
} from "./prizeList";
import { NUMBER_MATRIX } from "./config.js";
import mockData, { parseExcelWithMapping } from "./mock";
// import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {normalfont, boldfont, simfangfont, timesnewromanfont} from './customfont.js';

var callAddFont = function () {
  this.addFileToVFS('FSGB2312-normal.ttf', normalfont);
  this.addFont('FSGB2312-normal.ttf', 'FSGB2312', 'normal');
  this.addFileToVFS('FSGB2312-bold.ttf', boldfont);
  this.addFont('FSGB2312-bold.ttf', 'FSGB2312', 'bold');

  this.addFileToVFS('SimFang.ttf', simfangfont);
  this.addFont('SimFang.ttf', 'SimFang', 'normal');
  this.addFileToVFS('TimesNewRoman.ttf', timesnewromanfont);
  this.addFont('TimesNewRoman.ttf', 'TimesNewRoman', 'normal');
};
jsPDF.API.events.push(['addFonts', callAddFont])



let ROTATE_TIME = 1000;
const BASE_HEIGHT = 1080;

let TOTAL_CARDS,
  nowScenes,
  btns = {
    enter: document.querySelector("#enter"),
    lotteryBar: document.querySelector("#lotteryBar"),
    upload: document.querySelector("#uploadButton")
  },
  prizes,
  EACH_COUNT,
  ROW_COUNT = 7,
  COLUMN_COUNT = 17,
  COMPANY,
  HIGHLIGHT_CELL = [],
  // 当前的比例
  Resolution = window.devicePixelRatio || 1,
  currentTween = null,
  isRotating = false,
  isFirstRotation = true,
  enumNum = 0;

let camera,
  scene,
  renderer,
  controls,
  threeDCards = [],
  targets = {
    table: [],
    sphere: []
  };

let selectedCardIndex = [],
  rotate = false,
  basicData = {
    prizes: [], //奖品信息
    users: [], //所有人员
    luckyUsers: {}, //已中奖人员
    leftUsers: [] //未中奖人员
  },
  interval,
  // 当前抽的奖项，从最低奖开始抽，直到抽到大奖
  currentPrizeIndex,
  //当前选择的奖品
  currentPrize,
  // 正在抽奖
  isLotting = false,
  currentLuckys = [];

let currentPage = 0; // 添加全局变量，记录当前页码
let showPrize = false; // 添加全局变量，记录是否显示卡片动画


// 添加变量跟踪弹窗状态
let exportModalVisible = false;
let currentExportModal = null;
// initAll();

/**
 * 初始化所有DOM
 */
function initAll() {
  initStyle()
  startMock()
}

function initStyle() {
  if (mockData.bgVideo) {
    bgVideo.innerHTML = `<video class="bg-video" src="${mockData.bgVideo}" loop="" muted=""
    autoplay=""></video>`
  }
  body.style.backgroundImage = mockData.background//背景颜色
}
function startMock() {
  if (localStorage.getItem("count")) {
    mockData.prizes[1].count = parseInt(localStorage.getItem("count"));
    mockData.EACH_COUNT[1] = parseInt(localStorage.getItem("count"));
  }

  // 检查是否有自定义标题
  const customTitle = localStorage.getItem('title');
  if (customTitle) {
    mockData.prizes[1].title = customTitle;
  }

  prizes = mockData.prizes;//奖项
  EACH_COUNT = mockData.EACH_COUNT;//抽奖公式["1","2"] 一等奖1,二等奖3 
  COMPANY = mockData.COMPANY;//公司名
  HIGHLIGHT_CELL = createHighlight();
  basicData.prizes = prizes;//基础奖项配置
  setPrizes(prizes);

  TOTAL_CARDS = ROW_COUNT * COLUMN_COUNT;

  // 读取当前已设置的抽奖结果
  basicData.leftUsers = mockData.leftUsers;//左边用户
  basicData.luckyUsers = mockData.luckyData;//已抽奖用户

  let prizeIndex = basicData.prizes.length - 1
  for (; prizeIndex > -1; prizeIndex--) {
    if (
      mockData.luckyData[prizeIndex] &&
      mockData.luckyData[prizeIndex].length >=
      basicData.prizes[prizeIndex].count
    ) {
      continue;
    }
    currentPrizeIndex = prizeIndex;
    currentPrize = basicData.prizes[currentPrizeIndex];
    break;
  }
  // console.error(currentPrizeIndex, currentPrize);
  showPrizeList(currentPrizeIndex);
  let curLucks = basicData.luckyUsers[currentPrize.type];
  setPrizeData(currentPrizeIndex, curLucks ? curLucks.length : 0, true);

  //setuser
  if (!localStorage.getItem("setExcel")) {
    basicData.users = mockData.getUsers();
    localStorage.setItem("allUser", JSON.stringify(basicData.users));
  } else {
    basicData.users = JSON.parse(localStorage.getItem("allUser"));
    // localStorage.removeItem("setExcel");
  }


  initCards();
  // startMaoPao();
  animate();
  shineCard();

}

function initCards() {
  let member = basicData.users;
  // console.log("initCards", member);
  // 添加保护性检查
  if (!Array.isArray(member)) {
    return;
  }
  let showCards = [],
    length = member.length,
    vh = window.innerHeight / 100,
    vw = window.innerWidth / 100;

  let isBold = false,
    showTable = basicData.leftUsers.length === basicData.users.length,
    index = 0,
    totalMember = member.length,
    position = {
      x: (8 * COLUMN_COUNT - 7) / 2 * vw,
      y: (16 * ROW_COUNT - 2) / 2 * vh
    };

  camera = new THREE.PerspectiveCamera(
    45,
    mockData.width / mockData.height,
    1,
    10000
  );
  camera.position.z = 4000 / Resolution;

  scene = new THREE.Scene();

  for (let i = 0; i < ROW_COUNT; i++) {
    for (let j = 0; j < COLUMN_COUNT; j++) {
      isBold = HIGHLIGHT_CELL.includes(j + "-" + i);
      var element = createCard(
        member[index % length],
        isBold,
        index,
        showTable
      );

      var object = new THREE.CSS3DObject(element);
      object.position.x = Math.random() * 4000 - 2000;
      object.position.y = Math.random() * 4000 - 2000;
      object.position.z = Math.random() * 4000 - 2000;

      scene.add(object);
      threeDCards.push(object);

      var object = new THREE.Object3D();
      object.position.x = j * 8 * vw - position.x;
      object.position.y = -(i * 18 * vh) + position.y;
      targets.table.push(object);
      index++;
    }
  }

  // sphere

  var vector = new THREE.Vector3();

  for (var i = 0, l = threeDCards.length; i < l; i++) {
    var phi = Math.acos(-1 + (2 * i) / l);
    var theta = Math.sqrt(l * Math.PI) * phi;
    var object = new THREE.Object3D();
    object.position.setFromSphericalCoords(1200 / Resolution, phi, theta);
    vector.copy(object.position).multiplyScalar(2);
    object.lookAt(vector);
    targets.sphere.push(object);
  }

  renderer = new THREE.CSS3DRenderer();
  renderer.setSize(mockData.width, mockData.height);
  document.getElementById("container").appendChild(renderer.domElement);

  controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 0.5;
  controls.minDistance = 500;
  controls.maxDistance = 6000;
  controls.addEventListener("change", render);

  bindEvent();

  if (showTable) {
    switchScreen("enter");
  } else {
    switchScreen("lottery");
  }
}

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
      if (isLotting) {
        addQipao("抽慢一点点～～抽奖还没结束");
        return false;
      }
      let perCount = EACH_COUNT[currentPrizeIndex],
        leftCount = basicData.leftUsers.length
      const notAllowed = perCount > leftCount

      if (notAllowed) {
        addQipao("池中已经没有人拉,请重置抽奖人员池");
        return false;
      }

      //骇客
      // console.log(currentPrize);


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
        replaceMusic(currentPrize.awards)

        break;
      case "enter":
        removeHighlight();
        addQipao(`马上抽取[${currentPrize.title}],不要走开。`);
        // rotate = !rotate;
        rotate = true;
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
        addQipao("重置所有数据，重新抽奖");
        addHighlight();
        resetCard();
        // 重置所有数据
        currentLuckys = [];
        basicData.leftUsers = Object.assign([], basicData.users);
        basicData.luckyUsers = {};
        currentPrizeIndex = basicData.prizes.length - 1;
        currentPrize = basicData.prizes[currentPrizeIndex];

        resetPrize(currentPrizeIndex);
        resetMock();
        switchScreen("enter");
        break;
      // 抽奖
      case "lottery":
        // isLotting = true;
        // showPrize = true;
        // // 重新抽奖则直接进行抽取，不对上一次的抽奖数据进行保存
        // // 抽奖
        // resetCard().then(res => {
        //   // 抽奖
        //   lottery();
        // });
        if (isRotating) {
          isLotting = true;
          showPrize = true;
          // 重新抽奖则直接进行抽取，不对上一次的抽奖数据进行保存
          // 抽奖
          // resetCard().then(res => {
          e.target.textContent = "抽签";
          // 抽奖
          lottery();
          // });
        } else {
          resetCard().then(res => {
            e.target.textContent = "停止";
            rotateBallInfinitely();
          });
        }
        break;
        // if (localStorage.getItem("randomResult")) {
        //   addQipao(`没有可以抽取的奖品了`);
        //   window.alert(
        //     "抽签已经结束,如果需要重新抽签，请点击重新抽签按钮"
        //   );
        //   isLotting = false;  // 重置抽奖状态
        //   return;  // 使用return而不是break
        // }
        // console.log("hereeeeeeeee");
        // // 每次抽奖前先保存上一次的抽奖数据
        // // saveData();
        // //feat@把保存移除到roll点以后执行 
        // saveMock()
        // //feat@是否还有礼物

        // //更新状态
        // isLotting = true;
        // replaceMusic(currentPrize.enter)
        // mockData.setSecret(currentPrize, basicData)
        // //更新剩余抽奖数目的数据显示
        // changePrize();
        // resetCard().then(res => {
        //   // 抽奖
        //   lottery();
        // })
        // addQipao(`正在抽取[${currentPrize.title}],调整好姿势`);
        // break;
      // 重新抽奖
      case "reLottery":
        if (currentLuckys.length === 0) {
          addQipao(`当前还没有抽奖，无法重新抽取喔~~`);
          return;
        }
        // setErrorData(currentLuckys);
        addQipao(`重新抽取[${currentPrize.title}],做好准备`);
        isLotting = true;
        // 重新抽奖则直接进行抽取，不对上一次的抽奖数据进行保存
        // 抽奖
        resetCard().then(res => {
          // 抽奖
          lottery();
        });
        break;

      case "result":
        saveMock().then(res => {
          resetCard().then(res => {
            // 将之前的记录置空
            currentLuckys = [];
          });
        });
        // layer.open({
        //   type: 1, 
        //   content: '<div></div>' //这里content是一个普通的String
        // });

        break;

    }
  });

  window.addEventListener("resize", onWindowResize, false);

  // // 添加新列名
  // addColumnBtn.addEventListener('click', () => {
  //   const columnName = newColumnInput.value.trim();
  //   if (!columnName) return;

  //   if (customColumns.has(columnName)) {
  //     alert('该列名已存在');
  //     return;
  //   }

  //   customColumns.add(columnName);

  //   // 创建列名标签
  //   const tag = document.createElement('span');
  //   tag.className = 'column-tag';
  //   tag.innerHTML = `
  //     ${columnName}
  //     <span class="remove-btn">×</span>
  //   `;

  //   // 删除列名
  //   tag.querySelector('.remove-btn').addEventListener('click', () => {
  //     customColumns.delete(columnName);
  //     tag.remove();
  //   });

  //   customColumnsList.appendChild(tag);
  //   newColumnInput.value = '';
  // });

  // // 回车添加列名
  // newColumnInput.addEventListener('keypress', (e) => {
  //   if (e.key === 'Enter') {
  //     addColumnBtn.click();
  //   }
  // });

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
  
  // 事件绑定
  // excelBtn.addEventListener('click', (e) => {
  //   // 阻止事件冒泡
  //   console.log("cilck export excel btn");
  //   e.stopPropagation();
  //   // 收起动画
  //   // closeModal(modalOverlay, modalContent, buttonRect, () => {
  //     exportExcelOnly();
  //   // });
  // });
  
  // pdfBtn.addEventListener('click', (e) => {
  //   // 阻止事件冒泡
  //   e.stopPropagation();
  //   // 收起动画
  //   // closeModal(modalOverlay, modalContent, buttonRect, () => {
  //     exportPDFOnly();
  //   // });
  // });


  // 阻止点击内容时触发背景点击事件
  modalContent.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// 关闭模态框的动画函数
function closeModal(content, buttonRect, callback) {
  // 反向动画 - 收缩回按钮位置
  // content.style.top = `${buttonRect.top}px`;
  // content.style.left = `${buttonRect.left + buttonRect.width/2}px`;
  content.style.opacity = '0';
  content.style.transition = 'all 0.3s ease-in';
  content.style.transform = 'translate(-50%, 0) scale(0.5)';
  
  // 重置弹窗状态
  exportModalVisible = false;
  currentExportModal = null;
  // 动画完成后移除元素
  setTimeout(() => {
    content.style.display = 'none';
    if (callback) callback();
  }, 300);
}

// 仅导出Excel文件
async function exportExcelOnly() {
  try {
    // 读取原始Excel文件
    let originalData = JSON.parse(localStorage.getItem("excelData"));
    if (!originalData) {
      alert('没有找到原始数据，请重新上传Excel文件');
      return;
    }

    // 获取列名
    const originColumns = originalData.shift();
    const customColumns = JSON.parse(localStorage.getItem("customColumns"));

    // 为每行数据添加自定义列和随机值
    const exportData = originalData.map((row, index) => {
      const newRow = {};
      for (let i = 0; i < originColumns.length; i++) {
        newRow[originColumns[i]] = row[i];
      }
      // 添加自定义列
      customColumns.forEach((colName) => {
        newRow[colName] = getRandomResult(index);
      });

      return newRow;
    });

    // 排序
    exportData.sort((a, b) => {
      return a[customColumns[0]] - b[customColumns[0]]; 
    });
    
    // 补0
    let startNumber = parseInt(localStorage.getItem("start"));
    let signCount = parseInt(localStorage.getItem("enumCount"));
    let title = localStorage.getItem("title");
    let maxDigits = String(signCount + startNumber).length;
    exportData.forEach((row) => {
      customColumns.forEach(customColumn => {
        row[customColumn] = String(row[customColumn]).padStart(maxDigits, '0');
      });
    });

    // 创建新的 ExcelJS 工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);
    const headers = [...originColumns, ...customColumns];
    let nowCell = worksheet.getCell("A1");
    worksheet.mergeCells(1, 1, 1, headers.length)
    
    // 添加表头
    nowCell.value = title;
    worksheet.addRow(headers);

    // 添加数据
    exportData.forEach(row => {
      const rowData = headers.map(col => row[col] || '');
      worksheet.addRow(rowData);
    });

    // 样式设置
    worksheet.eachRow((row, rowNumber) =>{
      row.font = {name: '仿宋_GB2312', size: 14, bold: false}
      row.font.size = rowNumber > 1? 14:18;
      row.font.bold = rowNumber > 2? false:true;
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    })
    
    worksheet.columns.forEach(column => {
      const lengths = column.values.map(v => {
        if (!v) return 0;
        const str = v.toString();
        let length = 0;
        for (let char of str) {
          // 判断字符是否为中文
          if (/[\u4e00-\u9fa5]/.test(char)) {
            length += 2; // 中文字符宽度为2
          } else {
            length += 1; // 英文字符宽度为1
          }
        }
        return length;
      });
      const maxLength = Math.max(...lengths.filter(v => typeof v === 'number')) + 10;
      column.width = maxLength;
      column.alignment = {vertical: "middle", horizontal: "center"};
    });

    // 导出Excel文件
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveFile(excelBlob, `${title}.xlsx`);

  } catch (error) {
    alert('导出Excel失败: ' + error.message);
    console.error(error);
  }
}

// 仅导出PDF文件
async function exportPDFOnly() {
  try {
    // 读取原始Excel文件
    let originalData = JSON.parse(localStorage.getItem("excelData"));
    if (!originalData) {
      alert('没有找到原始数据，请重新上传Excel文件');
      return;
    }

    // 获取列名
    const originColumns = originalData.shift();
    const customColumns = JSON.parse(localStorage.getItem("customColumns"));

    // 为每行数据添加自定义列和随机值
    const exportData = originalData.map((row, index) => {
      const newRow = {};
      for (let i = 0; i < originColumns.length; i++) {
        newRow[originColumns[i]] = row[i];
      }
      // 添加自定义列
      customColumns.forEach((colName) => {
        newRow[colName] = getRandomResult(index);
      });

      return newRow;
    });

    // 排序
    exportData.sort((a, b) => {
      return a[customColumns[0]] - b[customColumns[0]]; 
    });
    
    // 补0
    let startNumber = parseInt(localStorage.getItem("start"));
    let signCount = parseInt(localStorage.getItem("enumCount"));
    let title = localStorage.getItem("title");
    let maxDigits = String(signCount + startNumber).length;
    exportData.forEach((row) => {
      customColumns.forEach(customColumn => {
        row[customColumn] = String(row[customColumn]).padStart(maxDigits, '0');
      });
    });

    const headers = [...originColumns, ...customColumns];
    
    // 导出PDF
    exportToPDF(headers, exportData, title);

    } catch (error) {
    alert('导出PDF失败: ' + error.message);
    console.error(error);
  }
}

// 保留原来的exportToExcel作为备用，可以去掉
function exportToExcel() {
  showExportOptions();
}

// 创建PDF文件并导出
function exportToPDF(headers, data, title) {
  // 创建PDF文档，设置为横向A4大小
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'pt',
    format: 'a4'
  });
  // 设置文档属性
  pdf.setProperties({
    title: title,
    creator: '抽签系统',
    subject: '抽签结果'
  });
  
  // 添加文档标题
  pdf.setFont('FSGB2312', 'bold');
  pdf.setFontSize(18); // 与Excel标题字体大小一致
  pdf.text(title, pdf.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
  
  // 准备表格数据
  const tableData = data.map(row => headers.map(header => row[header] || ''));
  
  // 获取自定义列以设置居中对齐
  const customColumns = JSON.parse(localStorage.getItem("customColumns"));
  const columnStyles = {};
  
  // 为所有列设置样式
  headers.forEach((header, i) => {
    // 基本样式：所有单元格都有边框
    columnStyles[i] = { 
      cellWidth: 'auto',
      cellPadding: 2,
      lineWidth: 0.5, // 细边框
      lineColor: [0, 0, 0], // 黑色边框
      font: 'FSGB2312'
    };
    
    // 为数字列设置居中对齐
    if (customColumns.includes(header)) {
      columnStyles[i].halign = 'center';
    }
  });
  
  // 创建表格
  autoTable(pdf, {
    head: [headers],
    body: tableData,
    startY: 40,
    styles: {
      fillColor: [255, 255, 255], // 白色背景
      font: 'FSGB2312', // 使用与Excel相同的中文字体
      fontSize: 14, // 与Excel正文字体大小一致
      cellPadding: 3,
      lineWidth: 0.5, // 细边框
      lineColor: [0, 0, 0], // 黑色边框
      textColor: [0, 0, 0], 
      valign: 'middle', // 垂直居中, 
      halign: 'center'
    },
    headStyles: {
      halign: 'center', 
      valign: 'middle', 
      fillColor: [255, 255, 255], // 白色背景
      textColor: [0, 0, 0], // 黑色文字
      fontStyle: 'bold',
      lineWidth: 0.5, // 细边框
      lineColor: [0, 0, 0], // 黑色边框
      font: 'FSGB2312',
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255] // 确保交替行也是白色
    },
    columnStyles: columnStyles,
    rowPageBreak: 'avoid',
    didDrawPage: (data) => {
      // 获取当前页码
      const currentPage = pdf.internal.getCurrentPageInfo().pageNumber;
      
      // 根据页码设置不同的上边距
      if (currentPage > 1) {
        // 从第二页开始使用较小的上边距
        data.settings.margin.top = 35;
        
        // 因为是新页面，需要设置表头的Y位置
        data.cursor.y = 35;
      }
      // 添加页脚
      pdf.setFontSize(10);
      pdf.text(
        `${title} - 第 ${pdf.internal.getNumberOfPages()} 页`, 
        pdf.internal.pageSize.getWidth() / 2, 
        pdf.internal.pageSize.getHeight() - 10, 
        { align: 'center' }
      );
    },
    didParseCell: function(data) {
      if (data.section == 'body') {
        // 检测是否包含中文字符
      const hasChinese = /[\u4E00-\u9FA5]/.test(data.cell.text);
      // 设置字体
      data.cell.styles.font = hasChinese ? 'SimFang' : 'TimesNewRoman';
      }
    },
    // 表格绘制完成后执行
    didDrawCell: (data) => {
      // 为单元格添加边框
      const cell = data.cell;
      if (cell.section === 'body') {
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.5);
        pdf.line(cell.x, cell.y, cell.x + cell.width, cell.y); // 上边框
        pdf.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height); // 下边框
        pdf.line(cell.x, cell.y, cell.x, cell.y + cell.height); // 左边框
        pdf.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height); // 右边框
      }
    },
    willDrawCell: (data) => {
      // 根据内容自动调整列宽
      const cell = data.cell;
      if (cell.text) {
        // 特殊处理中文字符，使其有更合适的宽度
        const text = cell.text.toString();
        let count = 0;
        for (let i = 0; i < text.length; i++) {
          count += /[\u4e00-\u9fa5]/.test(text[i]) ? 2 : 1;
        }
      }
    },
    // 设置页边距，确保符合A4打印要求
    margin: { top: 40, right: 30, bottom: 25, left: 30 },
    // 确保表格适应页面宽度
    tableWidth: 'auto',
    // 自动分页处理
    showHead: 'everyPage'
  });
  
  // 保存PDF文件
  pdf.save(`${title}.pdf`);
}

// 辅助函数：保存文件
function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 获取用户中奖的奖项名称
function getPrizeName(row) {
  // 根据用户选择的数据列获取识符
    const selectedColumn = document.querySelector('select[name="dataColumn"]').value;
  const identifier = row[Object.keys(row)[selectedColumn]];

  // 在中奖记录中查找
  for (const [type, users] of Object.entries(basicData.luckyUsers)) {
    if (users.some(u => u[0] === String(identifier))) {
      const prize = basicData.prizes.find(p => p.type === parseInt(type));
      return prize ? prize.title : '未中奖';
    }
  }
  return '未中奖';
}

// 获取抽签结果
function getRandomResult(index) {
  const arr = JSON.parse(localStorage.getItem("randomResult"));
  const append = parseInt(localStorage.getItem("start"));
  // console.log(arr, index);
  return arr[index] + append - 1;
}

//场景转换
function switchScreen(type) {
  switch (type) {
    case "enter":
      btns.enter.classList.remove("none");
      btns.upload.classList.remove("none");
      btns.lotteryBar.classList.add("none");
      transform(targets.table, 2000);
      break;
    default:
      btns.enter.classList.add("none");
      btns.upload.classList.add("none");
      btns.lotteryBar.classList.remove("none");
      transform(targets.sphere, 2000);
      break;
  }
}

/**
 * 创建元素
 */
function createElement(css, text) {
  let dom = document.createElement("div");
  dom.className = css || "";
  dom.innerHTML = text || "";
  return dom;
}

/**
 * 创建名牌
 */
function createCard(user, isBold, id, showTable) {
  var element = createElement();
  element.id = "card-" + id;

  if (isBold) {
    element.className = "element lightitem";

    if (showTable) {
      // element.classList.add("highlight");
    }
    //feat@刷新后不显示默认背景色
    element.style.backgroundColor = mockData.atmosphereGroupCard()
  } else {
    element.className = "element";
    element.style.backgroundColor = mockData.atmosphereGroupCard()

  }
  //添加公司标识
  COMPANY && element.appendChild(createElement("company", COMPANY));

  element.appendChild(createElement("name", user[1]));

  // element.appendChild(createElement("details", user[0] + "<br/>" + user[2]));
  return element;
}

function removeHighlight() {
  document.querySelectorAll(".highlight").forEach(node => {
    node.classList.remove("highlight");
  });
}

function addHighlight() {
  document.querySelectorAll(".lightitem").forEach(node => {
    // node.classList.add("highlight");
  });
}

/**
 * 渲染地球等
 */
function transform(targets, duration) {
  // TWEEN.removeAll();
  for (var i = 0; i < threeDCards.length; i++) {
    var object = threeDCards[i];
    var target = targets[i];

    new TWEEN.Tween(object.position)
      .to(
        {
          x: target.position.x,
          y: target.position.y,
          z: target.position.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    new TWEEN.Tween(object.rotation)
      .to(
        {
          x: target.rotation.x,
          y: target.rotation.y,
          z: target.rotation.z
        },
        Math.random() * duration + duration
      )
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();

    // new TWEEN.Tween(object.rotation)
    //     .to({
    //         x: target.rotation.x,
    //         y: target.rotation.y,
    //         z: target.rotation.z
    //     }, Math.random() * duration + duration)
    //     .easing(TWEEN.Easing.Exponential.InOut)
    //     .start();
  }

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start();
}

//旋转地球
function rotateBall() {
  return new Promise((resolve, reject) => {
    // console.log(Math.PI);
    scene.rotation.y = 0;
    new TWEEN.Tween(scene.rotation)
      .to(
        {
          y: Math.PI * (currentPrize && currentPrize.circle || 8)
        },
        currentPrize && currentPrize.ROTATE_TIME || ROTATE_TIME
      )
      .onUpdate(render)
      .easing(TWEEN.Easing.Exponential.InOut)
      .start()
      .onComplete(() => {
        resolve();
      });
  });
}

// 无限旋转
function rotateBallInfinitely() {
  isRotating = true;

  // 定义单次旋转动画
  const rotateOnce = () => {
    const targetRotation = scene.rotation.y + Math.PI * 2; // 旋转一圈
    
    // 创建动画实例
    const tween = new TWEEN.Tween(scene.rotation)
      .to({ y: targetRotation }, ROTATE_TIME)
      .onUpdate(render)
      .onComplete(() => {
        if (isRotating) {
          currentTween = rotateOnce().start(); // 继续下一圈
        }
      });

    // 首次旋转使用加速缓动，后续保持线性速度
    if (isFirstRotation) {
      tween.easing(TWEEN.Easing.Exponential.In); // 加速缓动
      isFirstRotation = false;
    } else {
      tween.easing(TWEEN.Easing.Linear.None); // 匀速缓动
    }

    return tween;
  };

  // 启动首次旋转
  currentTween = rotateOnce().start();
}

// 停止旋转
function stopRotateBall() {
  return new Promise((resolve, reject) =>{
    isRotating = false;
    isFirstRotation = true;
    const currentRotationY = scene.rotation.y;
    if (currentTween) {
        new TWEEN.Tween(scene.rotation)
        .to({ y: Math.round(currentRotationY / (2 * Math.PI)) * (2 * Math.PI) }, ROTATE_TIME) // 在 500ms 内保持当前位置
        .easing(TWEEN.Easing.Exponential.Out)
        .onUpdate(render)
        .start()
        .onComplete(() => {
          // 动画完成后，确保 rotation.y 为 0
          scene.rotation.y = 0;
          resolve();
        });
        // .start();
    }
    
  })
  
}


function onWindowResize() {
  camera.aspect = mockData.width / mockData.height;
  camera.updateProjectionMatrix();
  renderer.setSize(mockData.width, mockData.height);
  render();
}

function animate() {
  // 让场景通过x轴或者y轴旋转
  // rotate && (scene.rotation.y += 0.088);

  requestAnimationFrame(animate);
  TWEEN.update();
  controls.update();

  // 渲染循环
  // render();
}

function render() {
  renderer.render(scene, camera);
}

function selectCard(duration = 600) {
  rotate = false;

  const PER_PAGE = 50; // 每页显示数量
  const totalPages = Math.ceil(currentLuckys.length / PER_PAGE);

  // 获取当前页的数据
  const startIndex = currentPage * PER_PAGE;
  const displayCount = Math.min(PER_PAGE, currentLuckys.length - startIndex);
  const currentPageLuckys = currentLuckys.slice(startIndex, startIndex + displayCount);

  // 先重置所有卡片到初始状态
  threeDCards.forEach((object, index) => {
    // 重置卡片内容
    const companyElement = object.element.querySelector('.company');
    if (companyElement) {
      companyElement.textContent = COMPANY;
    }
    object.element.classList.remove("prize");
    
    // 重置位置到球体
    const target = targets.sphere[index];
    object.position.x = target.position.x;
    object.position.y = target.position.y;
    object.position.z = target.position.z;
    object.rotation.x = target.rotation.x;
    object.rotation.y = target.rotation.y;
    object.rotation.z = target.rotation.z;
  });

  // 计算新的位置
  const vh = window.innerHeight / 100;
  const vw = window.innerWidth / 100;
  let width = 8 * vh,
    tag = -(displayCount - 1) / 2,
    locates = [];

  // 计算位置信息，每行最多显示10个
  const ROW_MAX_COUNT = 10;
  if (displayCount > ROW_MAX_COUNT) {
    const rows = Math.ceil(displayCount / ROW_MAX_COUNT);
    const maxYGap = 20 * vh; // 设置最大行间距
    const yGap = Math.min(40 * vh / (rows - 1), maxYGap); // 计算行间距，避免除以零并限制最大间距
    // const yGap = 40 * vh / (rows - 1); // 30vh 转换为像素
    const startY =  yGap * (rows - 1) / 2; // 转换为像素
    // 设置坐标，TWEEN坐标原点在屏幕中心，从左往右x增加，从上到下y减少
    for (let row = 0; row < rows; row++) {
      const countInRow = Math.min(ROW_MAX_COUNT, displayCount - row * ROW_MAX_COUNT);
      const startX = -(countInRow - 1) / 2;

      for (let col = 0; col < countInRow; col++) {
        locates.push({
          x: (startX + col) * width * 2,
          y: (startY - row * yGap) * 2 + 5 * vh // 转换为像素
        });
      }
    }
  } else {
    for (let i = 0; i < displayCount; i++) {
      locates.push({
        x: tag * width * 2,
        y: -5 * vh // 转换为像素
      });
      tag++;
    }
  }

  // 显示分页信息
  let pageInfo = `第${currentPage + 1}/${totalPages}页`;
  let text = currentPageLuckys.map(item => item[1]);
  addQipao(`恭喜${text.join("、")}获得${currentPrize.title}${totalPages > 1 ? '，' + pageInfo : ''}`);

  const tweens = [];
  const totalCards = ROW_COUNT * COLUMN_COUNT;

  // 为当前页重新分配卡片索引
  const pageSelectedIndexes = new Set();
  while (pageSelectedIndexes.size < displayCount) {
    const cardIndex = random(totalCards);
    if (!pageSelectedIndexes.has(cardIndex)) {
      pageSelectedIndexes.add(cardIndex);
    }
  }

  // 使用新分配的卡片索引
  Array.from(pageSelectedIndexes).forEach((cardIndex, index) => {
    changeCard(cardIndex, currentPageLuckys[index], true);
    var object = threeDCards[cardIndex];

    if (currentPage === 0 && showPrize === true) {
      // 第一页使用动画
      tweens.push(
        new TWEEN.Tween(object.position)
          .to({
            x: locates[index].x,
            y: locates[index].y,
            z: 1400 / Resolution
          }, Math.random() * duration + duration)
          .easing(TWEEN.Easing.Exponential.InOut)
      );

      tweens.push(
        new TWEEN.Tween(object.rotation)
          .to({
            x: 0,
            y: 0,
            z: 0
          }, Math.random() * duration + duration)
          .easing(TWEEN.Easing.Exponential.InOut)
      );
    } else {
      // 其他页直接设置位置
      showPrize = false;
      object.position.x = locates[index].x;
      object.position.y = locates[index].y;
      object.position.z = 1400 / Resolution;
      object.rotation.x = 0;
      object.rotation.y = 0;
      object.rotation.z = 0;
    }

    object.element.classList.add("prize");
  });

  if (currentPage === 0 && tweens.length > 0) {
    // 第一页启动动画
    tweens.forEach(tween => tween.start());
  } else {
    // 其他页直接渲染
    render();
  }

  isLotting = false;

  // 添加翻页按钮
  if (totalPages > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.style.display = currentPage > 0 ? 'inline-block' : 'none';
    prevBtn.onclick = () => {
      if (currentPage > 0) {
        currentPage--;
        selectCard(duration);
      }
    };

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.style.display = currentPage < totalPages - 1 ? 'inline-block' : 'none';
    nextBtn.onclick = () => {
      if (currentPage < totalPages - 1) {
        currentPage++;
        selectCard(duration);
      }
    };

    // 移除旧的按钮
    const oldBtns = document.querySelectorAll('.page-btn');
    oldBtns.forEach(btn => btn.remove());

    // 添加新按钮
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      position: fixed; 
      bottom: 10vh;
      left: 50%; 
      transform: translateX(-50%); 
      z-index: 1000;
      display: flex;
      gap: 1vh;
      width: auto;
      justify-content: center;
    `;
    btnContainer.classList.add('page-btn');
    btnContainer.appendChild(prevBtn);
    btnContainer.appendChild(nextBtn);
    document.body.appendChild(btnContainer);
  }

  // 返回 Promise
  if (currentPage === 0 && tweens.length > 0) {
    return new Promise((resolve) => {
      new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start()
        .onComplete(resolve);
    });
  } else {
    return Promise.resolve();
  }
}

function selectCardWithAnimate(duration = 600) {
  rotate = false;

  const PER_PAGE = 50; // 每页显示数量
  const totalPages = Math.ceil(currentLuckys.length / PER_PAGE);

  // 获取当前页的数据
  const startIndex = currentPage * PER_PAGE;
  const displayCount = Math.min(PER_PAGE, currentLuckys.length - startIndex);
  const currentPageLuckys = currentLuckys.slice(startIndex, startIndex + displayCount);

  // 先重置所有卡片位置
  return resetCardPositions().then(() => {
    // 将 vh 转换为像素
    const vh = window.innerHeight / 100; // 1vh 的像素值
    let width = 8 * vh, // 8vh 转换为像素
      tag = -(displayCount - 1) / 2,
      locates = [];

    // 计算位置信息，每行最多显示10个
    const ROW_MAX_COUNT = 10;
    if (displayCount > ROW_MAX_COUNT) {
      const rows = Math.ceil(displayCount / ROW_MAX_COUNT);
      const maxYGap = 20 * vh; // 设置最大行间距
      const yGap = Math.min(40 * vh / (rows - 1), maxYGap); // 计算行间距，避免除以零并限制最大间距
      // const yGap = 40 * vh / (rows - 1); // 30vh 转换为像素
      const startY =  yGap * (rows - 1) / 2; // 转换为像素
      // 设置坐标，TWEEN坐标原点在屏幕中心，从左往右x增加，从上到下y减少
      for (let row = 0; row < rows; row++) {
        const countInRow = Math.min(ROW_MAX_COUNT, displayCount - row * ROW_MAX_COUNT);
        const startX = -(countInRow - 1) / 2;

        for (let col = 0; col < countInRow; col++) {
          locates.push({
            x: (startX + col) * width * 2,
            y: (startY - row * yGap) * 2 + 5 * vh // 转换为像素
          });
        }
      }
    } else {
      for (let i = 0; i < displayCount; i++) {
        locates.push({
          x: tag * width * 2,
          y: -5 * vh // 转换为像素
        });
        tag++;
      }
    }

    // 显示分页信息
    let pageInfo = `第${currentPage + 1}/${totalPages}页`;
    let text = currentPageLuckys.map(item => item[1]);
    addQipao(`恭喜${text.join("、")}获得${currentPrize.title}${totalPages > 1 ? '，' + pageInfo : ''}`);

    const tweens = [];
    const totalCards = ROW_COUNT * COLUMN_COUNT;

    // 为当前页重新分配卡片索引
    const pageSelectedIndexes = new Set();
    while (pageSelectedIndexes.size < displayCount) {
      const cardIndex = random(totalCards);
      if (!pageSelectedIndexes.has(cardIndex)) {
        pageSelectedIndexes.add(cardIndex);
      }
    }

    // 使用新分配的卡片索引
    Array.from(pageSelectedIndexes).forEach((cardIndex, index) => {
      changeCard(cardIndex, currentPageLuckys[index], true);
      var object = threeDCards[cardIndex];

      tweens.push(
        new TWEEN.Tween(object.position)
          .to({
            x: locates[index].x,
            y: locates[index].y,
            z: 1400 / Resolution
          }, Math.random() * duration + duration)
          .easing(TWEEN.Easing.Exponential.InOut)
      );

      tweens.push(
        new TWEEN.Tween(object.rotation)
          .to({
            x: 0,
            y: 0,
            z: 0
          }, Math.random() * duration + duration)
          .easing(TWEEN.Easing.Exponential.InOut)
      );

      object.element.classList.add("prize");
    });

    tweens.forEach(tween => tween.start());

    return new Promise((resolve) => {
      new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start()
        .onComplete(() => {
          isLotting = false;

          // 添加翻页按钮
          if (totalPages > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '上一页';
            prevBtn.style.display = currentPage > 0 ? 'inline-block' : 'none';
            prevBtn.onclick = () => {
              if (currentPage > 0) {
                currentPage--;
                selectCardWithAnimate(duration);
              }
            };

            const nextBtn = document.createElement('button');
            nextBtn.textContent = '下一页';
            nextBtn.style.display = currentPage < totalPages - 1 ? 'inline-block' : 'none';
            nextBtn.onclick = () => {
              if (currentPage < totalPages - 1) {
                currentPage++;
                selectCardWithAnimate(duration);
              }
            };

            // 移除旧的按钮
            const oldBtns = document.querySelectorAll('.page-btn');
            oldBtns.forEach(btn => btn.remove());

            // 添加新按钮
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = `
              position: fixed; 
              bottom: 11vh;
              left: 50%; 
              transform: translateX(-50%); 
              z-index: 1000;
              display: flex;
              gap: 1vh;
              width: auto;
              justify-content: center;
            `;
            btnContainer.classList.add('page-btn');
            btnContainer.appendChild(prevBtn);
            btnContainer.appendChild(nextBtn);
            document.body.appendChild(btnContainer);
          }
          resolve();
        });
    });
  });
}

// 添加新函数：重置卡片位置
function resetCardPositions(duration = 500) {
  return new Promise((resolve) => {
    const tweens = [];
    threeDCards.forEach((object, index) => {
      const target = targets.sphere[index];

      // 只重置公司标识
      const companyElement = object.element.querySelector('.company');
      if (companyElement) {
        companyElement.textContent = COMPANY;
      }

      tweens.push(
        new TWEEN.Tween(object.position)
          .to({
            x: target.position.x,
            y: target.position.y,
            z: target.position.z
          }, duration)
          .easing(TWEEN.Easing.Exponential.InOut)
      );

      tweens.push(
        new TWEEN.Tween(object.rotation)
          .to({
            x: target.rotation.x,
            y: target.rotation.y,
            z: target.rotation.z
          }, duration)
          .easing(TWEEN.Easing.Exponential.InOut)
      );

      object.element.classList.remove("prize");
    });

    tweens.forEach(tween => tween.start());

    new TWEEN.Tween(this)
      .to({}, duration)
      .onUpdate(render)
      .start()
      .onComplete(resolve);
  });
}

/**
 * 重置抽奖牌内容
 */
function resetCard(duration = 500) {
  currentPage = 0; // 重置页码
  
  // 移除翻页按钮
  const oldBtns = document.querySelectorAll('.page-btn');
  oldBtns.forEach(btn => btn.remove());
  
  // 即使当前没有中奖者，也要重置所有卡片
  return new Promise((resolve, reject) => {
    const tweens = [];
    
    // 重置所有卡片
    threeDCards.forEach((object, index) => {
      const target = targets.sphere[index];
      
      // 重置卡片内容
      const companyElement = object.element.querySelector('.company');
      if (companyElement) {
        companyElement.textContent = COMPANY;
      }
      object.element.classList.remove("prize");

      // 添加位置和旋转的动画
      tweens.push(
        new TWEEN.Tween(object.position)
          .to({
            x: target.position.x,
            y: target.position.y,
            z: target.position.z
          }, Math.random() * duration + duration)
          .easing(TWEEN.Easing.Exponential.InOut)
      );

      tweens.push(
        new TWEEN.Tween(object.rotation)
          .to({
            x: target.rotation.x,
            y: target.rotation.y,
            z: target.rotation.z
          }, Math.random() * duration + duration)
          .easing(TWEEN.Easing.Exponential.InOut)
      );
    });

    // 启动所有动画
    tweens.forEach(tween => tween.start());

    // 等待动画完成
    new TWEEN.Tween(this)
      .to({}, duration * 2)
      .onUpdate(render)
      .start()
      .onComplete(() => {
        // 清空当前中奖者和选中卡片索引
        currentLuckys = [];
        selectedCardIndex = [];
        resolve();
      });
  });
}

/**
 * 抽奖
 */
function lottery() {
  stopRotateBall().then(() => {
    currentLuckys = [];
    selectedCardIndex = [];

    // let perCount = EACH_COUNT[currentPrizeIndex],
    let perCount = parseInt(localStorage.getItem("enumCount")),
      luckyData = basicData.luckyUsers[currentPrize.type],
      leftCount = basicData.leftUsers.length,
      leftPrizeCount = currentPrize.count - (luckyData ? luckyData.length : 0);

    const cloneLeftUsers = basicData.leftUsers;

    if (leftCount === 0) {
      addQipao("已抽签完毕，现在重新设置所有人员可以进行二次抽签！");
      basicData.leftUsers = basicData.users;
      leftCount = basicData.leftUsers.length;
    }
    currentLuckys = lotteryRan(leftCount, perCount).map((value, index) => {
      cloneLeftUsers[index][2] = value;
      return cloneLeftUsers[index];
    });
    currentLuckys.sort((a, b) => a[2] - b[2]);
    console.log(currentLuckys)
    // 随机选择要展示的卡片
    const totalCards = ROW_COUNT * COLUMN_COUNT;
    const usedIndexes = new Set();

    for (let i = 0; i < Math.min(EACH_COUNT[currentPrizeIndex], totalCards); i++) {
      let cardIndex;
      do {
        cardIndex = random(totalCards);
      } while (usedIndexes.has(cardIndex));

      usedIndexes.add(cardIndex);
      selectedCardIndex.push(cardIndex);
    }

    selectCard();
  });
}


function lotteryRanApi(dataLength, signCount){
  return fetch('http://localhost:3000/api/test', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'dataLength': dataLength,
      'signCount': signCount,
      'fileName': excelFilePath
    })
})
    .then(response => response.json())
    .then(data => {
        console.log(' POST 响应数据:', data['res']);
        localStorage.setItem("randomResult", JSON.stringify(data['res']));
        return Promise.resolve();
    })
    .catch(error => {
        return Promise.reject(error);
    });
  // return Promise.resolve();
}

function lotteryRan(dataLength, signCount) {
  // 从localStorage中获取selectedLabel参数
  const selectedLabel = parseInt(localStorage.getItem("selectedLabel")) || -1;
  
  // 如果用户设置了label
  if (selectedLabel > -1) {
    // 获取Excel数据
    signCount = parseInt(localStorage.getItem("count"));
    localStorage.setItem("enumCount", JSON.stringify(signCount));
    const excelData = JSON.parse(localStorage.getItem("excelData")) || [];
    if (excelData.length <= 1) return []; // 如果没有数据，返回空数组
    
    // 获取标签列数据（跳过表头）
    const labelData = excelData.slice(1).map(row => row[selectedLabel]);
    // 创建标签到索引的映射
    const labelToIndices = {};
    labelData.forEach((label, index) => {
      if (!labelToIndices[label]) {
        labelToIndices[label] = [];
      }
      labelToIndices[label].push(index);
    });
    // 获取所有唯一的标签
    const uniqueLabels = Object.keys(labelToIndices);
    
    // 为每个标签生成随机签号，并确保相同标签的数据是连续的
    const result = [];
    
    // 随机打乱标签顺序，使不同标签的排列也是随机的
    const shuffledLabels = [...uniqueLabels];
    for (let i = shuffledLabels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledLabels[i], shuffledLabels[j]] = [shuffledLabels[j], shuffledLabels[i]];
    }
    
    // 按打乱后的标签顺序添加索引
    shuffledLabels.forEach(label => {
      const indices = labelToIndices[label];
      const selectedIndices = [...indices];
      for (let i = selectedIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedIndices[i], selectedIndices[j]] = [selectedIndices[j], selectedIndices[i]];
      }
      result.push(...selectedIndices);
    });
    let arr = Array.from({ length: signCount }, (_, i) => result.indexOf(i) + 1);
    // for (let i = 0; i < arr.length; i++) {
    //   [arr[i], arr[j]] = [arr[j], arr[i]];
    // }
    // 保存随机结果到localStorage
    localStorage.setItem("randomResult", JSON.stringify(arr));
    return arr;
  } else {
    // 原有的随机逻辑，不按标签分组
    if (signCount >= dataLength) {
      // 生成1到signCount的数组并洗牌，然后截取前dataLength个元素
      let arr = Array.from({ length: signCount }, (_, i) => i + 1);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      localStorage.setItem("randomResult", JSON.stringify(arr.slice(0, dataLength)));
      return arr.slice(0, dataLength);
    } else {
      // 修改逻辑：随机选择 r 个签号分配额外的重复次数
      const q = Math.floor(dataLength / signCount);
      const r = dataLength % signCount;
      // 1. 生成所有签号的数组并随机打乱，用于选择额外重复的签号
      const allSigns = Array.from({ length: signCount }, (_, i) => i + 1);
      for (let i = allSigns.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allSigns[i], allSigns[j]] = [allSigns[j], allSigns[i]];
      }
      const extraSigns = allSigns.slice(0, r); // 随机选取 r 个签号
      // 2. 填充数组：被选中的签号重复 q+1 次，其余重复 q 次
      let arr = [];
      for (const sign of allSigns) {
        const repeatCount = extraSigns.includes(sign) ? q + 1 : q;
        arr.push(...Array(repeatCount).fill(sign));
      }
      // 3. 再次洗牌确保最终结果的随机性
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      localStorage.setItem("randomResult", JSON.stringify(arr));
      return arr;
    }
  }
}
// lotteryRa(30,5)


/**
 * @description: mock数据保存
 * @param {*}
 * @return {*}
 * @Date: 2022-01-11 16:02:49
 */
function saveMock() {
  if (!currentPrize) {
    //若奖品抽完，则不再记录数据，但是还是可以进行抽奖
    return;
  }
  //当前选中奖品类型
  let type = currentPrize.type,
    //幸运用户建立池子
    curLucky = basicData.luckyUsers[type] || [];
  //幸运用户入池
  curLucky = curLucky.concat(currentLuckys);
  // 上述合并
  basicData.luckyUsers[type] = curLucky;

  //feat@把roll点的人员池子功能迁移到此处
  // console.log(curLucky.map(item => item[0]), "幸运用户");
  basicData.leftUsers = basicData.leftUsers.filter(human => !curLucky.map(item => item[0]).includes(human[0]))

  //奖品树小于等于幸运用户数,商品抽满了
  if (currentPrize.count <= curLucky.length) {
    //下一个奖品
    currentPrizeIndex--;
    //到0为止
    if (currentPrizeIndex <= -1) {
      currentPrizeIndex = 0;
    }
    //选择奖品更新为下一个
    currentPrize = basicData.prizes[currentPrizeIndex];


  }

  // console.error(basicData);
  return Promise.resolve();


}


function changePrize() {
  let luckys = basicData.luckyUsers[currentPrize.type];
  let luckyCount = (luckys ? luckys.length : 0) + EACH_COUNT[currentPrizeIndex];
  // 修改左侧prize的数目和百分比
  setPrizeData(currentPrizeIndex, luckyCount);
}

/**
 * 随机抽奖
 */
function random(num) {
  // Math.floor取到0-num-1之间数字的概率是相等的
  return Math.floor(Math.random() * num);
}

/**
 * 切换名牌人员信息
 */
// function changeCard(cardIndex, user) {
//   let card = threeDCards[cardIndex].element;

//   card.innerHTML = `<div class="company">${COMPANY}</div><div class="name">${
//     user[1]
//   }</div><div class="details">${user[0]}<br/>${user[2] || "PSST"}</div>`;
// }
function changeCard(cardIndex, user, showIndex = false) {
  let card = threeDCards[cardIndex].element;
  let startNumber = parseInt(localStorage.getItem("start"));
  let signCount = parseInt(localStorage.getItem("enumCount"));
  let maxDigits = String(signCount + startNumber).length;
  let index = showIndex ? String(user[2] + startNumber - 1).padStart(maxDigits, '0') : COMPANY;
  const nameDom = `<div class="name">${user[1]
    }</div>`
  const companyDom = `<div class="company">${index}</div>`;
  card.innerHTML = nameDom + (COMPANY ? companyDom : '');
}

/**
 * 切换名牌背景
 */
function shine(cardIndex, color) {
  let card = threeDCards[cardIndex].element;
  card.style.backgroundColor =
    color || mockData.atmosphereGroupCard();
}

/**
 * 随机切换背景和人员信息
 */
function shineCard() {
  let maxCard = 10,
    maxUser;
  let shineCard = 10 + random(maxCard);

  setInterval(() => {
    // 正在抽奖或者正在展示结果时停止闪烁
    if (isLotting || document.querySelector(".prize")) {
      return;
    }
    maxUser = basicData.leftUsers.length;
    for (let i = 0; i < shineCard; i++) {
      let index = random(maxUser),
        cardIndex = random(TOTAL_CARDS);
      // 当前显示的已抽中名单不进行随机切换
      if (selectedCardIndex.includes(cardIndex)) {
        continue;
      }
      shine(cardIndex);
      changeCard(cardIndex, basicData.leftUsers[index]);
    }
  }, 500);
}

function resetMock() {
  localStorage.clear();
  location.reload()
  // initAll()


}

function createHighlight() {
  let year = new Date().getFullYear() + "";
  let step = 4,
    xoffset = 1,
    yoffset = 1,
    highlight = [];

  year.split("").forEach(n => {
    highlight = highlight.concat(
      NUMBER_MATRIX[n].map(item => {
        return `${item[0] + xoffset}-${item[1] + yoffset}`;
      })
    );
    xoffset += step;
  });

  return highlight;
}
/**
 * @description: 替换音乐
 * @param {*} scenes 场景值对应音乐名
 * @return {*}
 * @Date: 2022-01-19 14:46:05
 */
function replaceMusic(scenes) {
  // if (nowScenes == scenes) return
  // let music = document.querySelector("#music");
  // music.src = `./data/${scenes}.m4a`
  // musicBox.click()
  // nowScenes = scenes

}

let onload = window.onload;

window.onload = function () {
  // 清理可能存在的残留动画和卡片
  function cleanupPreviousState() {
    // 清理 Three.js 场景
    if (scene) {
      while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
      }
    }

    // 重置相关数组和变量
    threeDCards = [];
    targets.table = [];
    targets.sphere = [];

    // 清除可能存在的动画
    TWEEN.removeAll();
  }

  // 检查所有资源是否加载完成
  Promise.all([
    new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    }),
    new Promise(resolve => {
      cleanupPreviousState(); // 在初始化前清理
      initAll();
      resolve();
    })
  ]).then(() => {
    const loading = document.getElementById('initialLoading');
    loading.style.opacity = '0';
    setTimeout(() => {
      loading.style.display = 'none';
    }, 300); // 等待淡出动画完成后再隐藏
  });
};

function isValidValue(value) {
  if (value === null || value === undefined) {
      return false;
  }
  if (typeof value === 'string') {
      return value.trim() !== ''; // 剔除纯空格、制表符等不可见字符
  }
  return true; // 数字、布尔值、日期等非字符串类型直接视为有效
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
        
        // 读取数据到数组
        const jsonData = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          let hasValidData = false;
            // 遍历所有单元格（包括空单元格）
            row.eachCell({ includeEmpty: true }, (cell) => {
                // 检查值的有效性
                if (isValidValue(cell.value)) {
                    hasValidData = true;
                }
            });
          if (hasValidData) {
            console.log(`Row ${rowNumber} 数据:`, row.values);
            const rowData = [];
            row.eachCell({ includeEmpty: true }, (cell) => {
              rowData.push(cell.text);
            });
            jsonData.push(rowData);
          }
        });
        
        if (jsonData.length === 0) {
          reject(new Error('Excel文件为空'));
          return;
        }
        
        localStorage.setItem("excelData", JSON.stringify(jsonData));
        
        // 获取第一行作为列名
        const columns = jsonData[0];
        localStorage.setItem("count", jsonData.length - 1);
        
        if (!columns || columns.length === 0) {
          reject(new Error('未找到列名'));
          return;
        }
        
        resolve(columns);
      } catch (error) {
        reject(new Error(`Excel文件解析失败: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
// // 预览Excel文件，获取列名
// async function previewExcel(file) {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       try {
//         const data = e.target.result;
//         // console.log('File data:', data); // 调试日志

//         const workbook = XLSX.read(data, { type: 'array' });
//         // console.log('Workbook:', workbook); // 调试日志

//         const firstSheetName = workbook.SheetNames[0];
//         if (!firstSheetName) {
//           reject(new Error('Excel文件没有工作表'));
//           return;
//         }

//         const worksheet = workbook.Sheets[firstSheetName];
//         if (!worksheet) {
//           reject(new Error('无法读取工作表数据'));
//           return;
//         }

//         const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
//         // console.log('Parsed data:', jsonData); // 调试日志

//         if (!jsonData || jsonData.length === 0) {
//           reject(new Error('Excel文件为空'));
//           return;
//         }
//         localStorage.setItem("excelData", JSON.stringify(jsonData));
//         // 获取第一行作为列名
//         const columns = jsonData[0];
//         localStorage.setItem("count", jsonData.length - 1);
//         if (!columns || columns.length === 0) {
//           reject(new Error('未找到列名'));
//           return;
//         }

//         resolve(columns);
//       } catch (error) {
//         // console.error('Excel解析错误:', error); // 调试日志
//         reject(new Error(`Excel文件解析失败: ${error.message}`));
//       }
//     };

//     reader.onerror = (error) => {
//       // console.error('文件读取错误:', error); // 调试日志
//       reject(new Error('文件读取失败'));
//     };

//     reader.readAsArrayBuffer(file);
//   });
// }
