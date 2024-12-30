const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow () {
  const win = new BrowserWindow({
    // width: 1920,
    // height: 1080,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false,
    titleBarStyle: 'hidden',
    fullscreen: true,
    icon: 'build/icon.png'//这里是自动生成的图标，默认情况下不需要改
  })

  // 加载打包后的 index.html
  win.loadFile('dist/index.html')
  win.setMenu(null)
//   win.maximize()
  // 开发时可以打开开发者工具
//   win.webContents.openDevTools()
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