
import mockData from './mock'
import DanMu from './components/DanMu'
const MAX_TOP = 300,
  MAX_WIDTH = document.body.clientWidth;

let defaultType = 0;

let prizes;
const DEFAULT_MESS = [
  "我是该抽中一等奖还是一等奖呢，纠结ing...",
  "听说要提前一个月吃素才能中大奖喔！",
  "好想要一等奖啊！！！",
  "一等奖有没有人想要呢？",
  "五等奖也不错，只要自己能中奖就行",
  "祝大家新年快乐！",
  "中不中奖不重要，大家吃好喝好。",
  "新年，祝福大家事事顺遂。",
  "作为专业陪跑的我，我就看看你们有谁跟我一样",
  "新的一年祝福大家越来越好！",
  "来年再战！！！"
];

let lastDanMuList = [];

let prizeElement = {},
  lasetPrizeIndex = 0;

function setPrizes(pri) {
  prizes = pri;
  defaultType = prizes[0]["type"];
  lasetPrizeIndex = pri.length - 1;
}

function showPrizeList(currentPrizeIndex) {
  let currentPrize = prizes[currentPrizeIndex];
  if (currentPrize.type === defaultType) {
    currentPrize.count === "不限制";
  }
  let htmlCode = `<div class="prize-mess"><div  class="prize-shine">正在抽取</div>
  
  <label id="prizeType" class="prize-shine">${currentPrize.text}</label><div id="prizeText" class="prize-shine">${currentPrize.title}</div><div><span  class="prize-shine">剩余</span><label id="prizeLeft" class="prize-shine">${currentPrize.count}</label><span  class="prize-shine">个</span></div></div><ul class="prize-list">`;
  htmlCode = `<ul class="prize-list">`;
  prizes.forEach(item => {
    if (item.type === defaultType) {
      return true;
    }
    htmlCode += `<li id="prize-item-${item.type}" class="prize-item ${
      item.type == currentPrize.type ? "shine" : ""
    }">
                        <span></span><span></span><span></span><span></span>

                        <div class="prize-text">
                            <div class="prize-title">${item.text} ${
      item.title
    }</div>
                        </div>
                    </li>`;
  });
  htmlCode += `</ul>`;

  document.querySelector("#prizeBar").innerHTML = htmlCode;
}

function resetPrize(currentPrizeIndex) {
  prizeElement = {};
  lasetPrizeIndex = currentPrizeIndex;
  showPrizeList(currentPrizeIndex);
}

let setPrizeData = (function () {
  return function (currentPrizeIndex, count, isInit) {
    let currentPrize = prizes[currentPrizeIndex],
      type = currentPrize.type,
      elements = prizeElement[type],
      totalCount = currentPrize.count;

    if (!elements) {
      elements = {
        box: document.querySelector(`#prize-item-${type}`),
        bar: document.querySelector(`#prize-bar-${type}`),
        text: document.querySelector(`#prize-count-${type}`)
      };
      prizeElement[type] = elements;
    }

    if (!prizeElement.prizeType) {
      prizeElement.prizeType = document.querySelector("#prizeType");
      prizeElement.prizeLeft = document.querySelector("#prizeLeft");
      prizeElement.prizeText = document.querySelector("#prizeText");
    }

    if (isInit) {
      for (let i = prizes.length - 1; i > currentPrizeIndex; i--) {
        let type = prizes[i]["type"];
        document.querySelector(`#prize-item-${type}`).className =
          "prize-item done";
        document.querySelector(`#prize-bar-${type}`).style.width = "0";
        document.querySelector(`#prize-count-${type}`).textContent =
          "0" + "/" + prizes[i]["count"];
      }
    }

    if (lasetPrizeIndex !== currentPrizeIndex) {
      let lastPrize = prizes[lasetPrizeIndex],
        lastBox = document.querySelector(`#prize-item-${lastPrize.type}`);
      lastBox.classList.remove("shine");
      lastBox.classList.add("done");
      elements.box && elements.box.classList.add("shine");
      prizeElement.prizeType.textContent = currentPrize.text;
      prizeElement.prizeText.textContent = currentPrize.title;

      lasetPrizeIndex = currentPrizeIndex;
    }

    if (currentPrizeIndex === 0) {
      prizeElement.prizeType.textContent = mockData.prizes[0].title;
      prizeElement.prizeText.textContent = mockData.prizes[0].text;
      prizeElement.prizeLeft.textContent = 999
      console.log("mockData.prizes[0].title", mockData.prizes[0].title)
      return;
    }

    count = totalCount - count;
    count = count < 0 ? 0 : count;
    let percent = (count / totalCount).toFixed(2);
    elements.bar && (elements.bar.style.width = percent * 100 + "%");
    elements.text && (elements.text.textContent = count + "/" + totalCount);
    // prizeElement.prizeLeft.textContent = count;
  };
})();

function startMaoPao() {
  let len = DEFAULT_MESS.length,
    count = 5,
    index = ~~(Math.random() * len),
    danmuList = [],
    total = 0;

  function restart() {
    total = 0;
    danmuList.forEach(item => {
      let text =
        lastDanMuList.length > 0
          ? lastDanMuList.shift()
          : DEFAULT_MESS[index++];
      item.start(text);
      index = index > len ? 0 : index;
    });
  }

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      danmuList.push(
        new DanMu({
          text: DEFAULT_MESS[index++],
          onComplete: function () {
            setTimeout(() => {
              this.start(DEFAULT_MESS[index++]);
              index = index > len ? 0 : index;
            }, 1000);
          }
        })
      );
      index = index > len ? 0 : index;
    }, 1500 * i);
  }
}

function addDanMu(text) {
  lastDanMuList.push(text);
}

export {
  startMaoPao,
  showPrizeList,
  setPrizeData,
  addDanMu,
  setPrizes,
  resetPrize
};
