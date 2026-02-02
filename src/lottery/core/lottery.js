import { AppState } from "./init";
import { setPrizeData } from "../prizeList";
import { selectCard } from "./animation";
import mockData from "../mock";

/**
 * 重置卡片状态
 * @returns {Promise} 重置完成的Promise
 */
function resetCard() {
  return new Promise((resolve) => {
    // 重置卡片状态
    AppState.threejs.threeDCards.forEach((object, index) => {
      object.element.classList.remove("prize");
      // 重置卡片内容
      const companyElement = object.element.querySelector('.company');
      if (companyElement) {
        companyElement.textContent = AppState.lottery.COMPANY;
      }
      const nameElement = object.element.querySelector('.name');
      if (nameElement && AppState.status.basicData.users[index % AppState.status.basicData.users.length]) {
        nameElement.textContent = AppState.status.basicData.users[index % AppState.status.basicData.users.length][1];
      }
    });
    resolve();
  });
}

/**
 * 执行抽奖逻辑
 */
function lottery() {
  // 计算需要抽取的人数
  let count = AppState.lottery.EACH_COUNT[AppState.status.currentPrizeIndex];
  // 确保不超过剩余人数
  count = Math.min(count, AppState.status.basicData.leftUsers.length);
  
  // 随机抽取
  AppState.status.currentLuckys = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * AppState.status.basicData.leftUsers.length);
    AppState.status.currentLuckys.push(AppState.status.basicData.leftUsers[randomIndex]);
    AppState.status.basicData.leftUsers.splice(randomIndex, 1);
  }
  
  // 保存中奖记录
  if (!AppState.status.basicData.luckyUsers[AppState.status.currentPrize.type]) {
    AppState.status.basicData.luckyUsers[AppState.status.currentPrize.type] = [];
  }
  AppState.status.basicData.luckyUsers[AppState.status.currentPrize.type] = 
    AppState.status.basicData.luckyUsers[AppState.status.currentPrize.type].concat(AppState.status.currentLuckys);
  
  // 保存到本地存储
  saveMock();
  
  // 更新奖品数据
  setPrizeData(
    AppState.status.currentPrizeIndex, 
    AppState.status.basicData.luckyUsers[AppState.status.currentPrize.type].length, 
    false
  );
  
  // 显示中奖结果
  selectCard().then(() => {
    AppState.status.isLotting = false;
    // 检查是否还有奖品
    if (AppState.status.currentPrizeIndex > 0) {
      AppState.status.currentPrizeIndex--;
      AppState.status.currentPrize = AppState.status.basicData.prizes[AppState.status.currentPrizeIndex];
    }
  });
}

/**
 * 保存抽奖数据到本地存储
 * @returns {Promise} 保存完成的Promise
 */
function saveMock() {
  return new Promise((resolve) => {
    localStorage.setItem("luckyData", JSON.stringify(AppState.status.basicData.luckyUsers));
    localStorage.setItem("leftUsers", JSON.stringify(AppState.status.basicData.leftUsers));
    resolve();
  });
}

/**
 * 重置本地存储中的抽奖数据
 */
function resetMock() {
  localStorage.removeItem("luckyData");
  localStorage.removeItem("leftUsers");
  localStorage.removeItem("setExcel");
  localStorage.removeItem("excelData");
  localStorage.removeItem("customColumns");
  localStorage.removeItem("start");
  localStorage.removeItem("enumCount");
  localStorage.removeItem("title");
  localStorage.removeItem("selectedLabel");
  localStorage.removeItem("labelUseFor");
  localStorage.removeItem("excelColumns");
  localStorage.removeItem("randomResult");
  localStorage.removeItem("count");
}

/**
 * 替换音乐
 * @param {string} type 音乐类型
 */
function replaceMusic(type) {
  // 音乐替换逻辑
}

/**
 * 改变卡片内容和状态
 * @param {number} index 卡片索引
 * @param {Array} user 用户数据
 * @param {boolean} isLucky 是否中奖
 */
function changeCard(index, user, isLucky = false) {
  const object = AppState.threejs.threeDCards[index];
  if (!object) return;
  
  // 更新卡片内容
  const nameElement = object.element.querySelector('.name');
  if (nameElement) {
    nameElement.textContent = user[1];
  }
  
  // 如果是中奖卡片，添加特殊样式
  if (isLucky) {
    object.element.classList.add("prize");
  }
}

/**
 * 生成指定范围内的随机数
 * @param {number} max 最大值（不包含）
 * @returns {number} 随机数
 */
function getRandomNumber(max) {
  return Math.floor(Math.random() * max);
}

/**
 * 无限旋转球体
 */
function rotateBallInfinitely() {
  AppState.lottery.isRotating = true;
  // 这里可以实现球体无限旋转的逻辑
}

/**
 * 停止旋转球体
 * @returns {Promise} 停止完成的Promise
 */
function stopRotateBall() {
  return new Promise((resolve) => {
    AppState.lottery.isRotating = false;
    // 这里可以实现停止球体旋转的逻辑
    resolve();
  });
}

export {
  resetCard,
  lottery,
  saveMock,
  resetMock,
  replaceMusic,
  changeCard,
  getRandomNumber,
  rotateBallInfinitely,
  stopRotateBall
};