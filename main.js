const { app, BrowserWindow } = require('electron')
const path = require('path')
const url = require('url')

// 保持对window对象的全局引用，如果不这样做，
// 当JavaScript对象被垃圾回收时，window窗口将自动关闭
let mainWindow

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true, // 在Electron 9中，默认值依然为false
      contextIsolation: false, // 在Electron 9中不是必需的，但为了兼容性设置为false
      enableRemoteModule: true // 在Electron 9中需要手动启用
    },
    
    // frame: false,  // 隐藏标题，包括进程名，最小化，最大化，关闭等，同时会隐藏工具栏
    // titleBarStyle: 'hidden',  // hidden：隐藏标题，包括进程名，最小化，最大化，关闭等，同时会隐藏工具栏
    // fullscreen: true,
    icon: 'build/icon.png'//这里是自动生成的图标，默认情况下不需要改
  })

  // 加载应用的index.html
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  mainWindow.setMenu(null)  // 只隐藏工具栏
  mainWindow.maximize()   // 窗口模式最大化
  // win.webContents.openDevTools()  // 开发时可以打开开发者工具
  // 监听窗口关闭事件
  mainWindow.on('closed', function () {
    // 取消引用window对象，如果你的应用支持多窗口的话，
    // 通常会把多个window对象存放在一个数组里面，
    // 与此同时，你应该删除相应的元素。
    mainWindow = null
  })
}

// Electron初始化完成并准备创建浏览器窗口时调用此方法
app.on('ready', createWindow)

// 所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  // 在macOS上，除非用户用Cmd + Q确定地退出，
  // 否则绝大部分应用及其菜单栏会保持活动。
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // 在macOS上，当点击dock图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口。
  if (mainWindow === null) createWindow()
})