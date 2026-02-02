import { AppState } from "./init";
import mockData from "../mock";
import { changeCard } from "./lottery";

/**
 * 场景转换
 * @param {string} type 场景类型
 */
function switchScreen(type) {
  switch (type) {
    case "enter":
      AppState.elements.btns.enter.classList.remove("none");
      AppState.elements.btns.upload.classList.remove("none");
      AppState.elements.btns.lotteryBar.classList.add("none");
      transform(AppState.threejs.targets.table, 2000);
      break;
    default:
      AppState.elements.btns.enter.classList.add("none");
      AppState.elements.btns.upload.classList.add("none");
      AppState.elements.btns.lotteryBar.classList.remove("none");
      transform(AppState.threejs.targets.sphere, 2000);
      break;
  }
}

/**
 * 创建元素
 * @param {string} css 类名
 * @param {string} text 内容
 * @returns {HTMLElement} 创建的元素
 */
function createElement(css, text) {
  let dom = document.createElement("div");
  dom.className = css || "";
  dom.innerHTML = text || "";
  return dom;
}

/**
 * 创建名牌
 * @param {Array} user 用户数据
 * @param {boolean} isBold 是否加粗
 * @param {number} id 卡片ID
 * @param {boolean} showTable 是否显示表格
 * @returns {HTMLElement} 创建的卡片元素
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
    element.style.backgroundColor = mockData.atmosphereGroupCard();
  } else {
    element.className = "element";
    element.style.backgroundColor = mockData.atmosphereGroupCard();

  }
  //添加公司标识
  // AppState.lottery.COMPANY && element.appendChild(createElement("company", AppState.lottery.COMPANY));

  // 初始时创建空白卡片，不显示用户数据
  element.appendChild(createElement("name", ""));

  // element.appendChild(createElement("details", user[0] + "<br/>" + user[2]));
  return element;
}

/**
 * 移除高亮
 */
function removeHighlight() {
  document.querySelectorAll(".highlight").forEach(node => {
    node.classList.remove("highlight");
  });
}

/**
 * 添加高亮
 */
function addHighlight() {
  document.querySelectorAll(".lightitem").forEach(node => {
    // node.classList.add("highlight");
  });
}

/**
 * 渲染地球等
 * @param {Array} targets 目标位置
 * @param {number} duration 动画持续时间
 */
function transform(targets, duration) {
  // TWEEN.removeAll();
  for (var i = 0; i < AppState.threejs.threeDCards.length; i++) {
    var object = AppState.threejs.threeDCards[i];
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
  }

  new TWEEN.Tween(this)
    .to({}, duration * 2)
    .onUpdate(render)
    .start();
}

/**
 * 旋转地球
 * @returns {Promise} 旋转完成的Promise
 */
function rotateBall() {
  return new Promise((resolve) => {
    AppState.threejs.scene.rotation.y = 0;
    new TWEEN.Tween(AppState.threejs.scene.rotation)
      .to(
        {
          y: Math.PI * (AppState.status.currentPrize && AppState.status.currentPrize.circle || 8)
        },
        AppState.status.currentPrize && AppState.status.currentPrize.ROTATE_TIME || AppState.lottery.ROTATE_TIME
      )
      .onUpdate(render)
      .easing(TWEEN.Easing.Exponential.InOut)
      .start()
      .onComplete(() => {
        resolve();
      });
  });
}

/**
 * 无限旋转地球
 */
function rotateBallInfinitely() {
  AppState.lottery.isRotating = true;

  // 定义单次旋转动画
  const rotateOnce = () => {
    const targetRotation = AppState.threejs.scene.rotation.y + Math.PI * 2; // 旋转一圈
    
    // 创建动画实例
    const tween = new TWEEN.Tween(AppState.threejs.scene.rotation)
      .to({ y: targetRotation }, AppState.lottery.ROTATE_TIME)
      .onUpdate(render)
      .onComplete(() => {
        if (AppState.lottery.isRotating) {
          AppState.lottery.currentTween = rotateOnce().start(); // 继续下一圈
        }
      });

    // 首次旋转使用加速缓动，后续保持线性速度
    if (AppState.lottery.isFirstRotation) {
      tween.easing(TWEEN.Easing.Exponential.In); // 加速缓动
      AppState.lottery.isFirstRotation = false;
    } else {
      tween.easing(TWEEN.Easing.Linear.None); // 匀速缓动
    }

    return tween;
  };

  // 启动首次旋转
  AppState.lottery.currentTween = rotateOnce().start();
}

/**
 * 停止旋转地球
 * @returns {Promise} 停止完成的Promise
 */
function stopRotateBall() {
  return new Promise((resolve) =>{
    AppState.lottery.isRotating = false;
    AppState.lottery.isFirstRotation = true;
    const currentRotationY = AppState.threejs.scene.rotation.y;
    if (AppState.lottery.currentTween) {
        new TWEEN.Tween(AppState.threejs.scene.rotation)
        .to({ y: Math.round(currentRotationY / (2 * Math.PI)) * (2 * Math.PI) }, AppState.lottery.ROTATE_TIME) // 在 500ms 内保持当前位置
        .easing(TWEEN.Easing.Exponential.Out)
        .onUpdate(render)
        .start()
        .onComplete(() => {
          // 动画完成后，确保 rotation.y 为 0
          AppState.threejs.scene.rotation.y = 0;
          resolve();
        });
    } else {
      resolve();
    }
  });
}

/**
 * 窗口大小改变处理
 */
function onWindowResize() {
  // 使用当前窗口大小计算宽高比
  const width = window.innerWidth;
  const height = window.innerHeight;
  AppState.threejs.camera.aspect = width / height;
  AppState.threejs.camera.updateProjectionMatrix();
  AppState.threejs.renderer.setSize(width, height);
  render();
}

/**
 * 动画循环
 */
function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();
  AppState.threejs.controls.update();
}

/**
 * 渲染场景
 */
function render() {
  AppState.threejs.renderer.render(AppState.threejs.scene, AppState.threejs.camera);
}

/**
 * 选择卡片并显示中奖结果
 * @param {number} duration 动画持续时间
 * @returns {Promise} 选择完成的Promise
 */
function selectCard(duration = 600) {
  AppState.status.rotate = false;

  const PER_PAGE = 50; // 每页显示数量
  const totalPages = Math.ceil(AppState.status.currentLuckys.length / PER_PAGE);

  // 获取当前页的数据
  const startIndex = AppState.status.currentPage * PER_PAGE;
  const displayCount = Math.min(PER_PAGE, AppState.status.currentLuckys.length - startIndex);
  const currentPageLuckys = AppState.status.currentLuckys.slice(startIndex, startIndex + displayCount);

  // 先重置所有卡片到初始状态
  AppState.threejs.threeDCards.forEach((object, index) => {
    // 重置卡片内容
    const companyElement = object.element.querySelector('.company');
    if (companyElement) {
      companyElement.textContent = AppState.lottery.COMPANY;
    }
    object.element.classList.remove("prize");
    
    // 重置位置到球体
    const target = AppState.threejs.targets.sphere[index];
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
    const yGap = Math.min(40 * vh / (rows - 1 || 1), maxYGap); // 计算行间距，避免除以零并限制最大间距
    const startY = yGap * (rows - 1) / 2; // 转换为像素
    
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
  let pageInfo = `第${AppState.status.currentPage + 1}/${totalPages}页`;
  let text = currentPageLuckys.map(item => item[1]);
  // 移除气泡通知
  console.log(`恭喜${text.join("、")}获得${AppState.status.currentPrize.title}${totalPages > 1 ? '，' + pageInfo : ''}`);

  const tweens = [];
  const totalCards = AppState.config.ROW_COUNT * AppState.config.COLUMN_COUNT;

  // 为当前页重新分配卡片索引
  const pageSelectedIndexes = new Set();
  while (pageSelectedIndexes.size < displayCount) {
    const cardIndex = Math.floor(Math.random() * totalCards);
    if (!pageSelectedIndexes.has(cardIndex)) {
      pageSelectedIndexes.add(cardIndex);
    }
  }

  // 使用新分配的卡片索引
  Array.from(pageSelectedIndexes).forEach((cardIndex, index) => {
    changeCard(cardIndex, currentPageLuckys[index], true);
    var object = AppState.threejs.threeDCards[cardIndex];

    if (AppState.status.currentPage === 0 && AppState.status.showPrize === true) {
      // 第一页使用动画
      tweens.push(
        new TWEEN.Tween(object.position)
          .to({
            x: locates[index].x,
            y: locates[index].y,
            z: 1400 / AppState.config.Resolution
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
      AppState.status.showPrize = false;
      object.position.x = locates[index].x;
      object.position.y = locates[index].y;
      object.position.z = 1400 / AppState.config.Resolution;
      object.rotation.x = 0;
      object.rotation.y = 0;
      object.rotation.z = 0;
    }

    object.element.classList.add("prize");
  });

  if (AppState.status.currentPage === 0 && tweens.length > 0) {
    // 第一页启动动画
    tweens.forEach(tween => tween.start());
  } else {
    // 其他页直接渲染
    render();
  }

  AppState.status.isLotting = false;

  // 添加翻页按钮
  if (totalPages > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.style.display = AppState.status.currentPage > 0 ? 'inline-block' : 'none';
    prevBtn.onclick = () => {
      if (AppState.status.currentPage > 0) {
        AppState.status.currentPage--;
        selectCard(duration);
      }
    };

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.style.display = AppState.status.currentPage < totalPages - 1 ? 'inline-block' : 'none';
    nextBtn.onclick = () => {
      if (AppState.status.currentPage < totalPages - 1) {
        AppState.status.currentPage++;
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
  if (AppState.status.currentPage === 0 && tweens.length > 0) {
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

export {
  switchScreen,
  transform,
  rotateBall,
  rotateBallInfinitely,
  stopRotateBall,
  onWindowResize,
  animate,
  render,
  selectCard,
  createCard
};