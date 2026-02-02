const { app, BrowserWindow } = require('electron')
const path = require('path')

// 添加一个标志变量来跟踪是否是首次启动
let isFirstLaunch = true;

async function clearLocalStorage() {
  const tempWin = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  await tempWin.loadFile('dist/index.html');
  await tempWin.webContents.executeJavaScript(`
    localStorage.clear();
  `);
  tempWin.close();
}

async function createWindow () {
  // 如果是首次启动，先清除缓存
  if (isFirstLaunch) {
    await clearLocalStorage();
    isFirstLaunch = false;
  }
  const win = new BrowserWindow({
    // width: 1920,
    // height: 1080,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    
    // frame: false,  // 隐藏标题，包括进程名，最小化，最大化，关闭等，同时会隐藏工具栏
    // titleBarStyle: 'hidden',  // hidden：隐藏标题，包括进程名，最小化，最大化，关闭等，同时会隐藏工具栏
    // fullscreen: true,
    icon: 'build/icon.png'//这里是自动生成的图标，默认情况下不需要改
  })

  win.loadFile('dist/index.html')  // 加载打包后的 index.html
  win.setMenu(null)  // 只隐藏工具栏
  win.maximize()   // 窗口模式最大化
  // win.webContents.openDevTools()  // 开发时可以打开开发者工具
  // 监听窗口关闭事件
  win.on('close', () => {
    // 在窗口关闭前清除 localStorage
    win.webContents.executeJavaScript(`
      localStorage.clear();
    `);
  });
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})