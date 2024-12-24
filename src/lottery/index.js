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
import * as XLSX from 'xlsx';

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
  Resolution = 1;

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

initAll();

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
  console.error(currentPrizeIndex, currentPrize);
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
  console.log("initCards", member);
  // 添加保护性检查
  if (!Array.isArray(member)) {
    return;
  }
  let showCards = [],
    length = member.length;

  let isBold = false,
    showTable = basicData.leftUsers.length === basicData.users.length,
    index = 0,
    totalMember = member.length,
    position = {
      x: (140 * COLUMN_COUNT - 20) / 2,
      y: (180 * ROW_COUNT - 20) / 2
    };

  camera = new THREE.PerspectiveCamera(
    45,
    mockData.width / mockData.height,
    1,
    10000
  );
  camera.position.z = 3000;

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
      object.position.x = j * 140 - position.x;
      object.position.y = -(i * 180) + position.y;
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
    object.position.setFromSphericalCoords(800 * Resolution, phi, theta);
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
  const columnsContainer = document.querySelector('.columns-container');
  const newColumnInput = document.getElementById('newColumnName');
  const addColumnBtn = document.getElementById('addColumn');
  const customColumnsList = document.getElementById('customColumns');
  const customColumns = new Set(); // 存储自定义列名

  let isBoxVisible = false;
  // 文件选择处理
  const customColumnsWrapper = document.querySelector('.custom-columns-wrapper');

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
      fileName.textContent = '未选择文件';
      uploadExcel.disabled = true;
      columnSelection.classList.add('hidden');
      customColumnsWrapper.classList.add('hidden');
      document.querySelector('.title-input-wrapper').classList.add('hidden');
      return;
    }

    fileName.textContent = file.name;
    document.querySelector('.title-input-wrapper').classList.remove('hidden');

    try {
      // 预览Excel文件，获取列名
      const columns = await previewExcel(file);

      // 清空之前的选项
      columnsContainer.innerHTML = '';

      // 创建单个列选择
      const item = document.createElement('div');
      item.className = 'column-item';
      item.innerHTML = `
      <label>选择数据列:</label>
      <select name="dataColumn">
        <option value="">请选择</option>
        ${columns.map((col, index) => `
          <option value="${index}">${col}</option>
        `).join('')}
      </select>
    `;
      columnsContainer.appendChild(item);

      columnSelection.classList.remove('hidden');
      customColumnsWrapper.classList.remove('hidden');
      uploadExcel.disabled = false;

    } catch (error) {
      alert(error.message);
      fileName.textContent = '文件解析失败';
      uploadExcel.disabled = true;
      columnSelection.classList.add('hidden');
      customColumnsWrapper.classList.add('hidden');
    }
  });

  // 上传按钮处理
  uploadExcel.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    // 获取用户选择的列
    const selectedColumn = document.querySelector('select[name="dataColumn"]').value;
    const customColumns = Array.from(document.querySelectorAll('.column-tag')).map(tag => tag.textContent.replace('×', '').trim());
    localStorage.setItem("customColumns", JSON.stringify(customColumns));

    // 验证是否选择了列
    if (selectedColumn === '') {
      alert('请选择数据列');
      return;
    }
    // 验证是否设置了自定义列
    if (customColumns.length === 0) {
      alert('请设置自定义列');
      return;
    }

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
      uploadBox.style.transform = 'translate(-50%, -120%) scale(1)';
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
      console.log(currentPrize);


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
          "是否确认重置数据，重置后，当前已抽的奖项全部清空？"
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

        //更新状态
        isLotting = true;
        // 每次抽奖前先保存上一次的抽奖数据
        // saveData();
        //feat@把保存移除到roll点以后执行 
        saveMock()
        //feat@是否还有礼物
        if (!currentPrizeIndex) {
          addQipao(`没有可以抽取的奖品了`);

          let doREset = window.confirm(
            "抽签已经结束,是否重新抽签？"
          );
          if (!doREset) {
            return;
          } else {
            document.getElementById("reLottery").click()
          }


          return
        }
        replaceMusic(currentPrize.enter)
        mockData.setSecret(currentPrize, basicData)
        //更新剩余抽奖数目的数据显示
        changePrize();
        resetCard().then(res => {
          // 抽奖
          lottery();
        })
        addQipao(`正在抽取[${currentPrize.title}],调整好姿势`);
        break;
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

  // 添加新列名
  addColumnBtn.addEventListener('click', () => {
    const columnName = newColumnInput.value.trim();
    if (!columnName) return;

    if (customColumns.has(columnName)) {
      alert('该列名已存在');
      return;
    }

    customColumns.add(columnName);

    // 创建列名标签
    const tag = document.createElement('span');
    tag.className = 'column-tag';
    tag.innerHTML = `
      ${columnName}
      <span class="remove-btn">×</span>
    `;

    // 删除列名
    tag.querySelector('.remove-btn').addEventListener('click', () => {
      customColumns.delete(columnName);
      tag.remove();
    });

    customColumnsList.appendChild(tag);
    newColumnInput.value = '';
  });

  // 回车添加列名
  newColumnInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addColumnBtn.click();
    }
  });

  const exportButton = document.getElementById('exportResult');
  exportButton.addEventListener('click', exportToExcel);
}

function exportToExcel() {
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

    // 创建新的工作表
    const newWs = XLSX.utils.json_to_sheet(exportData);

    // 创建新的工作簿并添加工作表
    const newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, newWs, '抽签结果');

    // 导出文件
    XLSX.writeFile(newWb, '抽签结果.xlsx');

  } catch (error) {
    alert('导出失败：' + error.message);
    console.error('导出错误:', error);
  }
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
  // console.log(arr, index);
  return arr.indexOf(index) + 1; // 生成1-100的随机数
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
      element.classList.add("highlight");
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
    node.classList.add("highlight");
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
    console.log(Math.PI);
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

  // 先重置所有卡片位置
  return resetCardPositions().then(() => {
    let width = 70,
      tag = -(displayCount - 1) / 2,
      locates = [];

    // 计算位置信息，每行最多显示10个
    const ROW_MAX_COUNT = 10;
    if (displayCount > ROW_MAX_COUNT) {
      const rows = Math.ceil(displayCount / ROW_MAX_COUNT);
      const yGap = 300 / (rows - 1);
      const startY = 90 * (rows - 1) / 2;

      for (let row = 0; row < rows; row++) {
        const countInRow = Math.min(ROW_MAX_COUNT, displayCount - row * ROW_MAX_COUNT);
        const startX = -(countInRow - 1) / 2;

        for (let col = 0; col < countInRow; col++) {
          locates.push({
            x: (startX + col) * width * 2,
            y: (startY - row * yGap) * 2 - 50
          });
        }
      }
    } else {
      for (let i = 0; i < displayCount; i++) {
        locates.push({
          x: tag * width * 2,
          y: -50
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
      changeCard(cardIndex, currentPageLuckys[index], startIndex + index + 1);
      var object = threeDCards[cardIndex];

      tweens.push(
        new TWEEN.Tween(object.position)
          .to({
            x: locates[index].x,
            y: locates[index].y,
            z: 1700
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

  if (currentLuckys.length === 0) {
    return Promise.resolve();
  }

  // 重置所有卡片的位置和样式
  return new Promise((resolve, reject) => {
    const tweens = [];
    selectedCardIndex.forEach(index => {
      let object = threeDCards[index],
        target = targets.sphere[index];

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

    tweens.forEach(tween => tween.start());

    new TWEEN.Tween(this)
      .to({}, duration * 2)
      .onUpdate(render)
      .start()
      .onComplete(() => {
        selectedCardIndex.forEach(index => {
          let object = threeDCards[index];
          object.element.classList.remove("prize");
        });

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
  rotateBall().then(() => {
    currentLuckys = [];
    selectedCardIndex = [];

    let perCount = EACH_COUNT[currentPrizeIndex],
      luckyData = basicData.luckyUsers[currentPrize.type],
      leftCount = basicData.leftUsers.length,
      leftPrizeCount = currentPrize.count - (luckyData ? luckyData.length : 0);

    const cloneLeftUsers = basicData.leftUsers;

    if (leftCount === 0) {
      addQipao("已抽签完毕，现在重新设置所有人员可以进行二次抽签！");
      basicData.leftUsers = basicData.users;
      leftCount = basicData.leftUsers.length;
    }
    currentLuckys = lotteryRan(leftCount, perCount).map(index => {
      return cloneLeftUsers[index];
    });

    // 随机选择要展示的卡片
    const totalCards = ROW_COUNT * COLUMN_COUNT;
    const usedIndexes = new Set();

    for (let i = 0; i < Math.min(perCount, totalCards); i++) {
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

function lotteryRan(number, time) {
  // 创建一个包含从 0 到 number - 1 的数组
  let arr = Array.from({ length: number }, (_, i) => i);

  // 洗牌数组
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]; // 交换元素
  }
  console.log(arr.slice(0, time));
  localStorage.setItem("randomResult", JSON.stringify(arr.slice(0, time)));
  // 返回前 time 个元素
  return arr.slice(0, time);
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
  console.log(curLucky.map(item => item[0]), "幸运用户");
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
  let index = showIndex ? showIndex : COMPANY;
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
    // 正在抽奖停止闪烁
    if (isLotting) {
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

// 预览Excel文件，获取列名
async function previewExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        console.log('File data:', data); // 调试日志

        const workbook = XLSX.read(data, { type: 'array' });
        console.log('Workbook:', workbook); // 调试日志

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error('Excel文件没有工作表'));
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          reject(new Error('无法读取工作表数据'));
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Parsed data:', jsonData); // 调试日志

        if (!jsonData || jsonData.length === 0) {
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
        console.error('Excel解析错误:', error); // 调试日志
        reject(new Error(`Excel文件解析失败: ${error.message}`));
      }
    };

    reader.onerror = (error) => {
      console.error('文件读取错误:', error); // 调试日志
      reject(new Error('文件读取失败'));
    };

    reader.readAsArrayBuffer(file);
  });
}
