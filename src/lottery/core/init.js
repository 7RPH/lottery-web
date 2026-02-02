import initCanvas from "../canvas.js";
import { setPrizes, showPrizeList, setPrizeData } from "../prizeList";
import { NUMBER_MATRIX } from "../config.js";
import mockData, { getUsers } from "../mock";
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { normalfont, boldfont } from '../font.js';
import { bindEvent } from './event.js';
import { switchScreen, createCard } from './animation.js';

// 应用状态管理
const AppState = {
  // 配置参数
  config: {
    ROTATE_TIME: 1000,
    BASE_HEIGHT: 1080,
    ROW_COUNT: 7,
    COLUMN_COUNT: 17,
    Resolution: window.devicePixelRatio || 1
  },
  
  // DOM元素
  elements: {
    btns: {
      enter: document.querySelector("#enter"),
      lotteryBar: document.querySelector("#lotteryBar"),
      upload: document.querySelector("#uploadButton")
    }
  },
  
  // 抽奖相关数据
  lottery: {
    prizes: [],
    EACH_COUNT: [],
    COMPANY: '',
    HIGHLIGHT_CELL: [],
    TOTAL_CARDS: 0,
    currentTween: null,
    isRotating: false,
    isFirstRotation: true,
    enumNum: 0
  },
  
  // Three.js相关
  threejs: {
    camera: null,
    scene: null,
    renderer: null,
    controls: null,
    threeDCards: [],
    targets: {
      table: [],
      sphere: []
    }
  },
  
  // 抽奖状态
  status: {
    selectedCardIndex: [],
    rotate: false,
    basicData: {
      prizes: [], //奖品信息
      users: [], //所有人员
      luckyUsers: {}, //已中奖人员
      leftUsers: [] //未中奖人员
    },
    interval: null,
    currentPrizeIndex: 0,
    currentPrize: null,
    isLotting: false,
    currentLuckys: [],
    currentPage: 0,
    showPrize: false,
    exportModalVisible: false,
    currentExportModal: null
  }
};

// 初始化所有DOM
function initAll() {
  initStyle();
  startMock();
}

function initStyle() {
  if (mockData.bgVideo) {
    const bgVideo = document.getElementById('bgVideo');
    if (bgVideo) {
      bgVideo.innerHTML = `<video class="bg-video" src="${mockData.bgVideo}" loop="" muted=""
      autoplay=""></video>`;
    }
  }
  const body = document.body;
  if (body) {
    body.style.backgroundImage = mockData.background; //背景颜色
  }
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

  AppState.lottery.prizes = mockData.prizes; //奖项
  AppState.lottery.EACH_COUNT = mockData.EACH_COUNT; //抽奖公式["1","2"] 一等奖1,二等奖3 
  AppState.lottery.COMPANY = mockData.COMPANY; //公司名
  AppState.lottery.HIGHLIGHT_CELL = createHighlight();
  AppState.status.basicData.prizes = AppState.lottery.prizes; //基础奖项配置
  setPrizes(AppState.lottery.prizes);

  AppState.lottery.TOTAL_CARDS = AppState.config.ROW_COUNT * AppState.config.COLUMN_COUNT;

  // 读取当前已设置的抽奖结果
  AppState.status.basicData.leftUsers = mockData.leftUsers; //左边用户
  AppState.status.basicData.luckyUsers = mockData.luckyData; //已抽奖用户

  let prizeIndex = AppState.status.basicData.prizes.length - 1;
  for (; prizeIndex > -1; prizeIndex--) {
    if (
      mockData.luckyData[prizeIndex] &&
      mockData.luckyData[prizeIndex].length >=
      AppState.status.basicData.prizes[prizeIndex].count
    ) {
      continue;
    }
    AppState.status.currentPrizeIndex = prizeIndex;
    AppState.status.currentPrize = AppState.status.basicData.prizes[prizeIndex];
    break;
  }
  
  showPrizeList(AppState.status.currentPrizeIndex);
  let curLucks = AppState.status.basicData.luckyUsers[AppState.status.currentPrize.type];
  setPrizeData(AppState.status.currentPrizeIndex, curLucks ? curLucks.length : 0, true);

  //setuser
  if (!localStorage.getItem("setExcel")) {
    AppState.status.basicData.users = getUsers();
    localStorage.setItem("allUser", JSON.stringify(AppState.status.basicData.users));
  } else {
    AppState.status.basicData.users = JSON.parse(localStorage.getItem("allUser"));
  }

  initCards();
  animate();
  shineCard();
  
  // 隐藏加载动画
  setTimeout(() => {
    const loadingElement = document.getElementById('initialLoading');
    if (loadingElement) {
      loadingElement.style.opacity = '0';
      setTimeout(() => {
        loadingElement.style.visibility = 'hidden';
      }, 300);
    }
  }, 1000);
}

function initCards() {
  // 为Electron应用做准备，使用固定长宽比
  const resolution = window.devicePixelRatio || 1; // 考虑屏幕缩放值
  const FIXED_ASPECT_RATIO = 16 / 9; // 固定16:9长宽比
  
  let member = AppState.status.basicData.users;
  
  // 添加保护性检查
  if (!Array.isArray(member)) {
    console.error('用户数据格式错误，不是数组');
    return;
  }
  
  let length = member.length,
    windowWidth = window.innerWidth,
    windowHeight = window.innerHeight;

  let isBold = false,
    showTable = AppState.status.basicData.leftUsers.length === AppState.status.basicData.users.length,
    index = 0;

  // 计算固定长宽比的渲染区域大小
  let renderWidth, renderHeight;
  if (windowWidth / windowHeight > FIXED_ASPECT_RATIO) {
    // 窗口比16:9宽，以高度为基准
    renderHeight = windowHeight;
    renderWidth = renderHeight * FIXED_ASPECT_RATIO;
  } else {
    // 窗口比16:9高，以宽度为基准
    renderWidth = windowWidth;
    renderHeight = renderWidth / FIXED_ASPECT_RATIO;
  }

  // 计算相机宽高比，使用固定长宽比
  const aspectRatio = FIXED_ASPECT_RATIO;
  
  // 初始化Three.js场景
  AppState.threejs.scene = new THREE.Scene();
  
  // 创建相机
  AppState.threejs.camera = new THREE.PerspectiveCamera(
    45,
    aspectRatio,
    1,
    10000
  );
  
  // 创建渲染器
  AppState.threejs.renderer = new THREE.CSS3DRenderer({
    antialias: true
  });
  // 使用计算出的渲染区域大小
  AppState.threejs.renderer.setSize(renderWidth, renderHeight);
  AppState.threejs.renderer.domElement.style.position = 'absolute';
  AppState.threejs.renderer.domElement.style.top = '50%';
  AppState.threejs.renderer.domElement.style.left = '50%';
  // 使用视口单位设置渲染器大小，确保响应式适配
  const renderWidthPercent = (renderWidth / window.innerWidth) * 100;
  const renderHeightPercent = (renderHeight / window.innerHeight) * 100;
  AppState.threejs.renderer.domElement.style.width = `${renderWidthPercent}vw`;
  AppState.threejs.renderer.domElement.style.height = `${renderHeightPercent}vh`;
  AppState.threejs.renderer.domElement.style.transform = 'translate(-50%, -50%)';
  AppState.threejs.renderer.domElement.style.backgroundColor = 'transparent';
  AppState.threejs.renderer.domElement.style.zIndex = '1';
  
  // 添加渲染器到容器
  const container = document.getElementById("container");
  if (container) {
    // 清空容器
    container.innerHTML = '';
    // 设置容器样式
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.backgroundColor = 'transparent';
    container.style.overflow = 'hidden';
    container.style.zIndex = '0';
    // 添加渲染器
    container.appendChild(AppState.threejs.renderer.domElement);
  }
  
  // 计算卡片大小和位置
  const { cardWidth, cardHeight, horizontalSpacing, verticalSpacing, totalWidth, totalHeight } = calculateCardLayout();
  
  // 创建卡片
  createCards(cardWidth, cardHeight);
  
  // 应用卡片位置
  applyCardPositions(cardWidth, cardHeight, horizontalSpacing, verticalSpacing, totalWidth, totalHeight);
  
  // 调整相机位置
  adjustCameraPosition(totalWidth, totalHeight);
  
  // 创建控件
  AppState.threejs.controls = new THREE.TrackballControls(AppState.threejs.camera, AppState.threejs.renderer.domElement);
  AppState.threejs.controls.rotateSpeed = 0.5;
  AppState.threejs.controls.minDistance = 500;
  AppState.threejs.controls.maxDistance = 6000;
  AppState.threejs.controls.addEventListener("change", render);

  // 绑定事件
  bindEvent();

  // 恢复switchScreen函数的调用，启用卡片动画
  if (showTable) {
    switchScreen("enter");
  } else {
    switchScreen("lottery");
  }
  
  // 添加窗口大小改变事件监听
  window.addEventListener('resize', onWindowResize);
  
  // 创建卡片
  function createCards(cardWidth, cardHeight) {
    // 清空之前的卡片
    AppState.threejs.threeDCards = [];
    
    // 计算视口单位，用于设置卡片样式
    const vw = window.innerWidth / 100;
    const vh = window.innerHeight / 100;
    
    // 计算卡片尺寸的视口百分比
    const cardWidthPercent = (cardWidth / window.innerWidth) * 100;
    const cardHeightPercent = (cardHeight / window.innerHeight) * 100;
    
    for (let i = 0; i < AppState.config.ROW_COUNT; i++) {
      for (let j = 0; j < AppState.config.COLUMN_COUNT; j++) {
        isBold = AppState.lottery.HIGHLIGHT_CELL.includes(j + "-" + i);
        var element = createCard(
          member[index % length],
          isBold,
          index,
          showTable
        );

        // 设置卡片样式，确保可见
        const cardWidthPercent = (cardWidth / window.innerWidth) * 100;
        const cardHeightPercent = (cardHeight / window.innerHeight) * 100;
        element.style.width = cardWidthPercent + 'vw';
        element.style.height = cardHeightPercent + 'vh';
        element.style.border = '1px solid #fff';
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
        element.style.color = '#fff';
        element.style.fontSize = '1.4vh'; // 使用视口单位设置字体大小
        element.style.textAlign = 'center';

        var object = new THREE.CSS3DObject(element);
        
        // 添加到场景
        AppState.threejs.scene.add(object);
        AppState.threejs.threeDCards.push(object);
        index++;
      }
    }
  }
}

// 窗口大小改变处理函数（移到外部，确保能正确访问最新的 Three.js 实例）
function onWindowResize() {
  // 输出日志，验证函数是否被调用
  console.log('onWindowResize called:', window.innerWidth, 'x', window.innerHeight);
  
  // 确保 AppState.threejs 已经初始化
  if (!AppState.threejs || !AppState.threejs.renderer || !AppState.threejs.camera || !AppState.threejs.controls) {
    console.log('AppState.threejs not initialized');
    return;
  }
  
  const currentWindowWidth = window.innerWidth;
  const currentWindowHeight = window.innerHeight;
  const currentFixedAspectRatio = 16 / 9;
  
  // 重新计算固定长宽比的渲染区域大小
  let currentRenderWidth, currentRenderHeight;
  if (currentWindowWidth / currentWindowHeight > currentFixedAspectRatio) {
    // 窗口比16:9宽，以高度为基准
    currentRenderHeight = currentWindowHeight;
    currentRenderWidth = currentRenderHeight * currentFixedAspectRatio;
  } else {
    // 窗口比16:9高，以宽度为基准
    currentRenderWidth = currentWindowWidth;
    currentRenderHeight = currentRenderWidth / currentFixedAspectRatio;
  }
  
  // 更新渲染器
  AppState.threejs.renderer.setSize(currentRenderWidth, currentRenderHeight);
  // 使用视口单位设置渲染器大小，确保响应式适配
  const renderWidthPercent = (currentRenderWidth / currentWindowWidth) * 100;
  const renderHeightPercent = (currentRenderHeight / currentWindowHeight) * 100;
  AppState.threejs.renderer.domElement.style.width = `${renderWidthPercent}vw`;
  AppState.threejs.renderer.domElement.style.height = `${renderHeightPercent}vh`;
  
  // 更新相机
  AppState.threejs.camera.aspect = currentFixedAspectRatio;
  AppState.threejs.camera.updateProjectionMatrix();
  
  // 更新控件
  AppState.threejs.controls.handleResize();
  
  // 重新计算布局
  const { cardWidth, cardHeight, horizontalSpacing, verticalSpacing, totalWidth, totalHeight } = calculateCardLayout();
  
  // 重新计算球体目标位置，确保在窗口大小改变时球体形状保持不变
  recalculateSphereTargets();
  
  // 重新应用卡片位置
  applyCardPositions(cardWidth, cardHeight, horizontalSpacing, verticalSpacing, totalWidth, totalHeight);
  
  // 重新更新卡片大小和样式
  updateCardStyles(cardWidth, cardHeight);
  
  // 重新调整相机位置
  adjustCameraPosition(totalWidth, totalHeight);
  
  // 重新渲染
  render();
}

// 计算卡片布局函数（移到外部，确保能被 onWindowResize 函数访问）
function calculateCardLayout() {
  // 计算固定长宽比的渲染区域大小，用于后续的总宽度检查
  const FIXED_ASPECT_RATIO = 16 / 9;
  let renderWidth, renderHeight;
  const currentWindowWidth = window.innerWidth;
  const currentWindowHeight = window.innerHeight;
  
  if (currentWindowWidth / currentWindowHeight > FIXED_ASPECT_RATIO) {
    // 窗口比16:9宽，以高度为基准
    renderHeight = currentWindowHeight;
    renderWidth = renderHeight * FIXED_ASPECT_RATIO;
  } else {
    // 窗口比16:9高，以宽度为基准
    renderWidth = currentWindowWidth;
    renderHeight = renderWidth / FIXED_ASPECT_RATIO;
  }
  
  // 固定卡片宽高比
  const CARD_ASPECT_RATIO = 1 / 1.8; // 卡片固定长宽比
  
  // 使用视口单位来计算卡片大小，确保在不同分辨率下保持相对大小
  // 考虑行列数和窗口大小，使用视口百分比
  const vw = renderWidth / 100;
  const vh = renderHeight / 100;
  
  // 增加视口百分比，使卡片更大
  const maxCardWidth = vw * 85 / AppState.config.COLUMN_COUNT;
  // 基于视口高度和行数计算卡片高度
  const maxCardHeight = vh * 85 / AppState.config.ROW_COUNT;
  
  // 计算基于宽度的最大卡片高度
  const widthBasedMaxCardHeight = maxCardWidth / CARD_ASPECT_RATIO;
  // 计算基于高度的最大卡片宽度
  const heightBasedMaxCardWidth = maxCardHeight * CARD_ASPECT_RATIO;
  
  // 选择合适的卡片宽度，确保不超过宽度和高度的限制
  let cardWidth = Math.min(maxCardWidth, heightBasedMaxCardWidth);
  
  // 添加最小卡片宽度限制，避免在极端情况下卡片变得太小导致重合
  const minCardWidth = 20; // 最小卡片宽度（像素）
  cardWidth = Math.max(cardWidth, minCardWidth);
  
  // 严格按照固定长宽比计算卡片高度
  let cardHeight = cardWidth / CARD_ASPECT_RATIO;
  
  // 调整间距大小，使其更加美观
  // 使用固定的最小间距，确保即使卡片很小也有足够的间距
  const minHorizontalSpacing = 5; // 最小水平间距（像素）
  const minVerticalSpacing = 5; // 最小垂直间距（像素）
  let horizontalSpacing = Math.max(cardWidth * 0.15, minHorizontalSpacing);
  let verticalSpacing = Math.max(cardHeight * 0.15, minVerticalSpacing);
  
  // 计算总宽度和总高度
  let totalWidth = (cardWidth + horizontalSpacing) * AppState.config.COLUMN_COUNT - horizontalSpacing;
  const totalHeight = (cardHeight + verticalSpacing) * AppState.config.ROW_COUNT - verticalSpacing;
  
  // 确保总宽度不超过渲染区域宽度，避免卡片显示不全或重合
  const maxTotalWidth = renderWidth * 0.9; // 留出10%的边距
  if (totalWidth > maxTotalWidth) {
    // 根据最大总宽度重新计算卡片宽度和间距
    const scaleFactor = maxTotalWidth / totalWidth;
    cardWidth *= scaleFactor;
    // 确保卡片宽度不小于最小限制
    cardWidth = Math.max(cardWidth, minCardWidth);
    // 严格按照固定长宽比重新计算卡片高度
    cardHeight = cardWidth / CARD_ASPECT_RATIO;
    // 重新计算间距
    horizontalSpacing = Math.max(cardWidth * 0.15, minHorizontalSpacing);
    verticalSpacing = Math.max(cardHeight * 0.15, minVerticalSpacing);
    // 重新计算总宽度
    totalWidth = (cardWidth + horizontalSpacing) * AppState.config.COLUMN_COUNT - horizontalSpacing;
  }
  
  return { cardWidth, cardHeight, horizontalSpacing, verticalSpacing, totalWidth, totalHeight };
}

// 应用卡片位置函数（移到外部，确保能被 onWindowResize 函数访问）
function applyCardPositions(cardWidth, cardHeight, horizontalSpacing, verticalSpacing, totalWidth, totalHeight) {
  // 确保 AppState.threejs 已经初始化
  if (!AppState.threejs || !AppState.threejs.threeDCards) {
    return;
  }
  
  // 计算起始位置，确保卡片居中显示
  const startX = -totalWidth / 2;
  const startY = -totalHeight / 2;
  
  // 清空目标位置数组
  AppState.threejs.targets.table = [];
  
  // 设置卡片位置
  let cardIndex = 0;
  for (let i = 0; i < AppState.config.ROW_COUNT; i++) {
    for (let j = 0; j < AppState.config.COLUMN_COUNT; j++) {
      if (cardIndex < AppState.threejs.threeDCards.length) {
        const object = AppState.threejs.threeDCards[cardIndex];
        
        // 计算卡片位置
        const x = startX + j * (cardWidth + horizontalSpacing);
        const y = startY + i * (cardHeight + verticalSpacing);
        
        // 设置卡片位置
        object.position.x = x;
        object.position.y = y;
        object.position.z = 0;
        
        // 添加到目标位置数组
        const target = new THREE.Object3D();
        target.position.x = x;
        target.position.y = y;
        target.position.z = 0;
        AppState.threejs.targets.table.push(target);
        
        cardIndex++;
      }
    }
  }
  
  // 更新球体目标位置
  AppState.threejs.targets.sphere = [];
  var vector = new THREE.Vector3();
  const resolution = window.devicePixelRatio || 1;
  
  // 计算球体大小，根据窗口大小和卡片数量动态调整
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const cardCount = AppState.threejs.threeDCards.length;
  
  // 基于窗口大小计算球体半径，确保在不同分辨率下都能正确显示
  // 使用窗口对角线长度的一部分来计算球体半径，这样在任何窗口比例下都能获得合适的大小
  const windowDiagonal = Math.sqrt(windowWidth * windowWidth + windowHeight * windowHeight);
  // 基于窗口对角线长度的40%计算球体半径，进一步增加球体大小，使卡片分布更稀疏
  const baseSphereRadius = windowDiagonal * 0.4;
  const sphereRadius = baseSphereRadius / resolution;
  
  console.log('Sphere radius:', sphereRadius, 'based on window size:', windowWidth, 'x', windowHeight, 'diagonal:', windowDiagonal, 'baseRadius:', baseSphereRadius);
  
  for (var i = 0, l = cardCount; i < l; i++) {
    var phi = Math.acos(-1 + (2 * i) / l);
    var theta = Math.sqrt(l * Math.PI) * phi;
    var object = new THREE.Object3D();
    object.position.setFromSphericalCoords(sphereRadius, phi, theta);
    vector.copy(object.position).multiplyScalar(2);
    object.lookAt(vector);
    AppState.threejs.targets.sphere.push(object);
  }
  
  // 重新渲染
  render();
}

// 调整相机位置函数（移到外部，确保能被 onWindowResize 函数访问）
function adjustCameraPosition(totalWidth, totalHeight) {
  // 确保 AppState.threejs 已经初始化
  if (!AppState.threejs || !AppState.threejs.camera) {
    return;
  }
  
  // 计算所需的相机距离，确保所有卡片都在视野内
  const fov = 45; // 相机视场角
  const FIXED_ASPECT_RATIO = 16 / 9;
  
  // 计算基于卡片布局的最大尺寸
  const maxDimension = Math.max(totalWidth, totalHeight);
  
  // 计算基于球体大小的相机距离（如果存在球体目标位置）
  let sphereBasedDistance = 0;
  if (AppState.threejs.targets && AppState.threejs.targets.sphere && AppState.threejs.targets.sphere.length > 0) {
    // 计算球体的最大半径
    let maxSphereRadius = 0;
    AppState.threejs.targets.sphere.forEach(target => {
      const distance = Math.sqrt(target.position.x ** 2 + target.position.y ** 2 + target.position.z ** 2);
      if (distance > maxSphereRadius) {
        maxSphereRadius = distance;
      }
    });
    // 基于球体半径计算相机距离
    if (maxSphereRadius > 0) {
      sphereBasedDistance = maxSphereRadius * 1; // 球体半径的2倍，减少相机距离，使球体在视觉上更大
    }
  }
  
  // 选择较大的相机距离，确保能看到所有内容
  const layoutBasedDistance = (maxDimension / 2) / Math.tan((fov * Math.PI / 180) / 2);
  const distance = Math.max(layoutBasedDistance, sphereBasedDistance) * 1.2; // 增加20%的安全余量
  
  console.log('Camera distance:', distance, 'layoutBased:', layoutBasedDistance, 'sphereBased:', sphereBasedDistance);
  
  // 设置相机位置
  AppState.threejs.camera.position.z = distance;
  
  // 更新相机投影矩阵，使用固定的长宽比
  AppState.threejs.camera.aspect = FIXED_ASPECT_RATIO;
  AppState.threejs.camera.updateProjectionMatrix();
}

// 创建高亮单元格
function createHighlight() {
  const highlightCells = [];
  // 这里可以根据需要实现创建高亮单元格的逻辑
  return highlightCells;
}

// 渲染函数
function render() {
  if (AppState.threejs.renderer && AppState.threejs.scene && AppState.threejs.camera) {
    AppState.threejs.renderer.render(AppState.threejs.scene, AppState.threejs.camera);
  }
}

// 动画函数
function animate() {
  requestAnimationFrame(animate);
  // 更新TWEEN动画
  if (typeof TWEEN !== 'undefined') {
    TWEEN.update();
  }
  // 更新控制器
  if (AppState.threejs.controls) {
    AppState.threejs.controls.update();
  }
  // 渲染场景
  render();
}

// 卡片发光效果
function shineCard() {
  // 这里可以根据需要实现卡片发光效果的逻辑
}

// 更新卡片样式函数（确保在窗口大小改变时更新卡片大小和样式）
function updateCardStyles(cardWidth, cardHeight) {
  // 确保 AppState.threejs 已经初始化
  if (!AppState.threejs || !AppState.threejs.threeDCards) {
    console.log('AppState.threejs.threeDCards not initialized');
    return;
  }
  
  console.log('Updating card styles:', cardWidth, 'x', cardHeight);
  
  // 计算卡片尺寸的视口百分比
  const cardWidthPercent = (cardWidth / window.innerWidth) * 100;
  const cardHeightPercent = (cardHeight / window.innerHeight) * 100;
  
  // 更新所有卡片的大小和样式
  AppState.threejs.threeDCards.forEach((object, index) => {
    if (object && object.element) {
      const element = object.element;
      // 更新卡片大小
      element.style.width = cardWidthPercent + 'vw';
      element.style.height = cardHeightPercent + 'vh';
      // 更新字体大小，确保在不同分辨率下都能正确显示
      element.style.fontSize = '1.4vh';
    }
  });
}

// 重新计算球体目标位置函数（确保在窗口大小改变时球体形状保持不变）
function recalculateSphereTargets() {
  // 确保 AppState.threejs 已经初始化
  if (!AppState.threejs || !AppState.threejs.threeDCards) {
    console.log('AppState.threejs.threeDCards not initialized');
    return;
  }
  
  console.log('Recalculating sphere targets...');
  
  // 计算球体大小，根据窗口大小和卡片数量动态调整
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const cardCount = AppState.threejs.threeDCards.length;
  const resolution = window.devicePixelRatio || 1;
  
  // 基于窗口大小计算球体半径，确保在不同分辨率下都能正确显示
  const windowDiagonal = Math.sqrt(windowWidth * windowWidth + windowHeight * windowHeight);
  const baseSphereRadius = windowDiagonal * 0.4;
  const sphereRadius = baseSphereRadius / resolution;
  
  console.log('New sphere radius:', sphereRadius, 'based on window size:', windowWidth, 'x', windowHeight);
  
  // 更新球体目标位置
  AppState.threejs.targets.sphere = [];
  var vector = new THREE.Vector3();
  
  for (var i = 0, l = cardCount; i < l; i++) {
    var phi = Math.acos(-1 + (2 * i) / l);
    var theta = Math.sqrt(l * Math.PI) * phi;
    var object = new THREE.Object3D();
    object.position.setFromSphericalCoords(sphereRadius, phi, theta);
    vector.copy(object.position).multiplyScalar(2);
    object.lookAt(vector);
    AppState.threejs.targets.sphere.push(object);
  }
  
  console.log('Sphere targets recalculated:', AppState.threejs.targets.sphere.length, 'targets');
}

export {
  initAll,
  initCards,
  AppState
};