/*
 * @Description: 请输入....
 * @Author: Gavin
 * @Date: 2022-01-11 15:24:49
 * @LastEditTime: 2022-06-21 18:34:34
 * @LastEditors: Gavin
 */
import * as XLSX from 'xlsx';

// 默认数据，当没有上传 Excel 时使用
const defaultData = [
  ["000016", "佐助", "技术部"]
  , ["000022", "赵云", "技术部"]
  , ["000019", "金角大王", "技术部"]
  , ["000021", "行者孙", "技术部"]
  , ["000004", "杨幂", "技术部"]
  , ["000023", "金克丝", "技术部"]
  , ["000017", "白骨精", "技术部"]
  , ["000024", "蔚", "技术部"]
  , ["000002", "柯镇恶", "技术部"]
  , ["000008", "欧阳锋", "技术部"]
  , ["000009", "周楠", "技术部"]
  , ["000015", "卢本伟", "技术部"]
  , ["000013", "鸣人", "技术部"]
  , ["000003", "黄药师", "技术部"]
  , ["000010", "艾薇儿", "技术部"]
  , ["000011", "贾斯丁比伯", "技术部"]
  , ["000020", "银角大王", "技术部"]
  , ["000001", "周芷若", "技术部"]
  , ["000005", "张无忌", "技术部"]
];

let currentData = [...defaultData];

// 解析 Excel 文件
export function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 将 Excel 数据转换为数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // 过滤掉空行和处理数据格式
        const processedData = jsonData
          .filter(row => row.length >= 3 && row[0] && row[1] && row[2])
          .map(row => [
            String(row[0]), // 工号
            String(row[1]), // 姓名
            String(row[2])  // 部门
          ]);

        if (processedData.length === 0) {
          reject(new Error('Excel 文件中没有有效数据'));
          return;
        }

        // 更新当前数据
        currentData = processedData;
        let storeData = getUsers();
        console.log('上传excel更新数据', storeData);
        localStorage.setItem("allUser", JSON.stringify(storeData));
        localStorage.setItem("leftUsers", JSON.stringify(storeData));
        // console.log(currentData);
        resolve(processedData);
      } catch (error) {
        reject(new Error('Excel 文件解析失败: ' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsArrayBuffer(file);
  });
}

function randomsort(a, b) {
  return Math.random() > .5 ? -1 : 1;
}

// 导出当前数据（随机排序后）
export const getUsers = () => currentData.sort(randomsort);

// 导出其他必要的常量
export const COMPANY = "ID";

/**
 * 奖品设置
 * type: 唯一标识，0是默认特别奖的占位符，其它奖品不可使用
 * count: 奖品数量
 * title: 奖品描述
 * text: 奖品标题
 * img: 图片地址
 * ROTATE_TIME:转的球速度越大越慢
 * circle:旋转圈数最好8*x倍数
 * enter: //抽奖进行时音乐
 * awards: //颁奖音乐
 */
const prizes = [
  {
    type: 0,
    count: 1000,
    title: "抽奖结束",
    text: "需要重新抽奖请配置后重置"
  },
  {
    type: 1,
    count: 100,
    text: "抽签",
    title: "",
    img: "./img/huawei.png",
    enter: "1st-lottery",//抽奖进行时音乐
    awards: "1st-BJ-BGM",//颁奖音乐
    ROTATE_TIME: 20000,
    circle: 8 * 6

  // },
  // {
  //   type: 2,
  //   count: 2,
  //   text: "二等奖 ",
  //   title: "价值3799元",
  //   img: "./img/mbp.jpg",
  //   enter: "other-lottery",//抽奖进行时音乐
  //   awards: "other-BJ-BGM",//颁奖音乐
  //   ROTATE_TIME: 20000,
  //   circle: 8 * 3
  // },
  // {
  //   type: 3,
  //   count: 5,
  //   text: "三等奖  ",
  //   title: "价值1200元",
  //   img: "./img/ipad.jpg",
  //   enter: "other-lottery",//抽奖进行时音乐
  //   awards: "other-BJ-BGM",//颁奖音乐
  //   ROTATE_TIME: 10000,
  //   circle: 8 * 3
  // },
  // {
  //   type: 4,
  //   count: 10,
  //   text: "四等奖",
  //   title: "价值300-600元不等",
  //   img: "./img/edifier.jpg",
  //   enter: "other-lottery",//抽奖进行时音乐
  //   awards: "other-BJ-BGM",//颁奖音乐
  //   ROTATE_TIME: 10000,
  //   circle: 8 * 1
  }

];
let luckyData = JSON.parse(localStorage.getItem("luckyData")) || {};

let leftUsers = JSON.parse(localStorage.getItem("leftUsers")) || getUsers();

let awardList = JSON.parse(localStorage.getItem("awardList")) || {}

//不能说的秘密
const excludeUser = [["000005", "张无忌", "技术部"]]
/**
 * @description: 不能说的秘密
 * @param {*} nowItem 当前奖品
 * @param {*} basicData 当前奖池人员
 * @return {*}
 * @Date: 2022-01-13 15:13:31
 */
function setSecret(nowItem, basicData) {
  if (nowItem.type != 4) {
    // console.log(mockData.excludeUser);
    const excludeId = excludeUser.map(item => item[0])
    // console.log(excludeId, basicData.leftUsers);
    basicData.leftUsers = basicData.leftUsers.filter(human => !excludeId.includes(human[0]))
    // console.log(basicData.leftUsers);
  }
}
//颜色
const rgba = "0,127,127"
//透明度
const opacity = () => Math.random() * 0.7 + 0.25
//气氛组卡片
const atmosphereGroupCard = () => `rgba(${rgba},${opacity()})`
//背景色
const background = ""
//背景动态壁纸模式 不用时可以设置为null或者注释
// const bgVideo="//game.gtimg.cn/images/lol/act/a20220121lunarpass/bg.mp4"
const width = window.innerWidth * .75
const height = window.innerWidth * .75 * .75
/**
 * 一次抽取的奖品个数与prizes对应
 */
const EACH_COUNT = [1, 1, 1, 5, 5];

export function parseExcelWithMapping(file, selectedColumn) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 将 Excel 数据转换为数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // 过滤掉空行并只保留选中的列
        const processedData = jsonData
          .slice(1) // 跳过表头
          .filter(row => row[selectedColumn])
          .map(row => [
            String(row[selectedColumn]), // 选中的列
            String(row[selectedColumn]), // 重复一次作为显示名称
            "未分组" // 默认分组
          ]);

        if (processedData.length === 0) {
          reject(new Error('Excel 文件中没有有效数据'));
          return;
        }

        // 更新当前数据
        currentData = processedData;
        // let storeData = getUsers();
        localStorage.setItem("allUser", JSON.stringify(processedData));
        localStorage.setItem("leftUsers", JSON.stringify(processedData));
        
        resolve(processedData);
      } catch (error) {
        reject(new Error('Excel 文件解析失败: ' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsArrayBuffer(file);
  });
}

export default { EACH_COUNT, prizes, COMPANY, getUsers, luckyData, leftUsers, awardList, excludeUser, atmosphereGroupCard, background, setSecret, width, height }