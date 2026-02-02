/*
 * @Description: 请输入....
 * @Author: Gavin
 * @Date: 2022-01-11 15:24:49
 * @LastEditTime: 2022-06-21 18:34:34
 * @LastEditors: Gavin
 */
// import * as XLSX from 'xlsx';
import ExcelJS from "exceljs"

// 默认数据，当没有上传 Excel 时使用
// const defaultData = [
//   ["周俊","周俊","未分组"],["罗慧","罗慧","未分组"],["蔡华","蔡华","未分组"],["柯鹏","柯鹏","未分组"],["程洁","程洁","未分组"],["温婷婷","温婷婷","未分组"],["陈霞","陈霞","未分组"],["孟桂芝","孟桂芝","未分组"],["祝晨","祝晨","未分组"],["袁凤英","袁凤英","未分组"],["应阳","应阳","未分组"],["任勇","任勇","未分组"],["盛瑜","盛瑜","未分组"],["张云","张云","未分组"],["王红梅","王红梅","未分组"],["薛丹丹","薛丹丹","未分组"],["侯畅","侯畅","未分组"],["孟鑫","孟鑫","未分组"],["刘勇","刘勇","未分组"],["宋岩","宋岩","未分组"],["陈秀云","陈秀云","未分组"],["刘伟","刘伟","未分组"],["刘飞","刘飞","未分组"],["赵丹丹","赵丹丹","未分组"],["袁冬梅","袁冬梅","未分组"],["杨雪","杨雪","未分组"],["隆雪梅","隆雪梅","未分组"],["单洁","单洁","未分组"],["邢桂兰","邢桂兰","未分组"],["邱丹丹","邱丹丹","未分组"],["李秀梅","李秀梅","未分组"],["何婷婷","何婷婷","未分组"],["赵桂芳","赵桂芳","未分组"],["沈兰英","沈兰英","未分组"],["程秀荣","程秀荣","未分组"],["李建军","李建军","未分组"],["陈秀荣","陈秀荣","未分组"],["林娟","林娟","未分组"],["唐兰英","唐兰英","未分组"],["王桂香","王桂香","未分组"],["熊桂香","熊桂香","未分组"],["罗桂荣","罗桂荣","未分组"],["向杨","向杨","未分组"],["李琳","李琳","未分组"],["王玉","王玉","未分组"],["盛琳","盛琳","未分组"],["瞿海燕","瞿海燕","未分组"],["张雪","张雪","未分组"],["王玉华","王玉华","未分组"],["吕兰英","吕兰英","未分组"],["卢楠","卢楠","未分组"],["王佳","王佳","未分组"],["桂秀兰","桂秀兰","未分组"],["周莹","周莹","未分组"],["陈瑜","陈瑜","未分组"],["林杨","林杨","未分组"],["严刚","严刚","未分组"],["曾明","曾明","未分组"],["王坤","王坤","未分组"],["汤琳","汤琳","未分组"],["孙超","孙超","未分组"],["赵璐","赵璐","未分组"],["崔璐","崔璐","未分组"],["何英","何英","未分组"],["马洁","马洁","未分组"],["韦利","韦利","未分组"],["卢淑兰","卢淑兰","未分组"],["陈兰英","陈兰英","未分组"],["夏浩","夏浩","未分组"],["刘淑兰","刘淑兰","未分组"],["章静","章静","未分组"],["赵杨","赵杨","未分组"],["郭成","郭成","未分组"],["许婷婷","许婷婷","未分组"],["黄宇","黄宇","未分组"],["蒋莹","蒋莹","未分组"],["周雪","周雪","未分组"],["童宁","童宁","未分组"],["李凤英","李凤英","未分组"],["朱丽娟","朱丽娟","未分组"],["李秀芳","李秀芳","未分组"]
// ];
const defaultData = [["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""], ["","",""]];

let currentData = [...defaultData];

// // 解析 Excel 文件
// export function parseExcel(file) {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
    
//     reader.onload = (e) => {
//       try {
//         const data = e.target.result;
//         const workbook = XLSX.read(data, { type: 'array' });
//         const firstSheetName = workbook.SheetNames[0];
//         const worksheet = workbook.Sheets[firstSheetName];
        
//         // 将 Excel 数据转换为数组
//         const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
//         // 过滤掉空行和处理数据格式
//         const processedData = jsonData
//           .filter(row => row.length >= 3 && row[0] && row[1] && row[2])
//           .map(row => [
//             String(row[0]), // 工号
//             String(row[1]), // 姓名
//             String(row[2])  // 部门
//           ]);

//         if (processedData.length === 0) {
//           reject(new Error('Excel 文件中没有有效数据'));
//           return;
//         }

//         // 更新当前数据
//         currentData = processedData;
//         let storeData = getUsers();
//         console.log('上传excel更新数据', storeData);
//         localStorage.setItem("allUser", JSON.stringify(storeData));
//         localStorage.setItem("leftUsers", JSON.stringify(storeData));
//         // console.log(currentData);
//         resolve(processedData);
//       } catch (error) {
//         reject(new Error('Excel 文件解析失败: ' + error.message));
//       }
//     };

//     reader.onerror = () => {
//       reject(new Error('文件读取失败'));
//     };

//     reader.readAsArrayBuffer(file);
//   });
// }

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
    title: "抽签标题",
    text: "",
    img: "./img/huawei.png",
    enter: "1st-lottery",//抽奖进行时音乐
    awards: "1st-BJ-BGM",//颁奖音乐
    // ROTATE_TIME: 20000,
    // circle: 8 * 6

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
const width = window.innerWidth * 1.2
const height = window.innerWidth * .75 * .75
/**
 * 一次抽取的奖品个数与prizes对应
 */
const EACH_COUNT = [1, 100, 1, 5, 5];

// export function parseExcelWithMapping(file, selectedColumn) {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
    
//     reader.onload = async (e) => {
//       try {
//         const data = e.target.result;
//         const workbook = new ExcelJS.Workbook();
//         await workbook.xlsx.load(data);
        
//         // 获取第一个工作表
//         const worksheet = workbook.worksheets[0];
//         if (!worksheet) {
//           reject(new Error('Excel文件没有工作表'));
//           return;
//         }
        
//         // 读取数据并处理
//         const processedData = [];
//         let isFirstRow = true;
        
//         worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
//           // 跳过表头
//           if (isFirstRow) {
//             isFirstRow = false;
//             return;
//           }
          
//           const cellValue = row.getCell(parseInt(selectedColumn) + 1).value;
//           if (cellValue) {
//             processedData.push([
//               String(cellValue), // 选中的列
//               String(cellValue), // 重复一次作为显示名称
//               "未分组" // 默认分组
//             ]);
//           }
//         });
        
//         if (processedData.length === 0) {
//           reject(new Error('Excel 文件中没有有效数据'));
//           return;
//         }
        
        // // 更新当前数据
        // currentData = processedData;
        // localStorage.setItem("allUser", JSON.stringify(processedData));
        // localStorage.setItem("leftUsers", JSON.stringify(processedData));
        
        // resolve(processedData);
//       } catch (error) {
//         reject(new Error('Excel 文件解析失败: ' + error.message));
//       }
//     };
    
//     reader.onerror = () => {
//       reject(new Error('文件读取失败'));
//     };
    
//     reader.readAsArrayBuffer(file);
//   });
// }

export function parseExcelWithMapping(file, selectedColumn) {
  return new Promise((resolve, reject) => {
    try {
      const processedData = [];
      selectedColumn = parseInt(selectedColumn);
      const excelData = JSON.parse(localStorage.getItem("excelData")).slice(1);
      excelData.forEach(row => {
        processedData.push([
          row[selectedColumn], row[selectedColumn], 
          "未分组" // 默认分组
        ]);
      });
      // 更新当前数据
      localStorage.setItem("allUser", JSON.stringify(processedData));
      localStorage.setItem("leftUsers", JSON.stringify(processedData));
      
      resolve(processedData);
    } catch (error) {
      reject(new Error('Excel 数据获取失败: ' + error.message));
    }
  })   
}

export default { EACH_COUNT, prizes, COMPANY, getUsers, luckyData, leftUsers, awardList, excludeUser, atmosphereGroupCard, background, setSecret, width, height }