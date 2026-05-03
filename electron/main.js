const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

const isDev = !app.isPackaged;
let nextProcess = null;

app.setName("EchoAmp");

function startNextServer() {
  if (isDev) return Promise.resolve("http://localhost:3000");

  return new Promise((resolve) => {
    const appPath = app.getAppPath();
    const nextBin = path.join(appPath, "node_modules", "next", "dist", "bin", "next");

    nextProcess = spawn(process.execPath, [nextBin, "start", "-p", "3000"], {
      cwd: appPath,
      env: {
        ...process.env,
        NODE_ENV: "production",
        ELECTRON_RUN_AS_NODE: "1",
      },
      stdio: "ignore",
    });

    setTimeout(() => resolve("http://localhost:3000"), 2500);
  });
}

async function createWindow() {
  const url = isDev ? "http://localhost:3000" : await startNextServer();

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: "EchoAmp",
    backgroundColor: "#0f0f0f",
    icon: path.join(__dirname, "assets", "EchoAmp.icns"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(url);
}

Menu.setApplicationMenu(
  Menu.buildFromTemplate([
    {
      label: "EchoAmp",
      submenu: [
        { role: "about", label: "About EchoAmp" },
        { type: "separator" },
        { role: "hide", label: "Hide EchoAmp" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit", label: "Quit EchoAmp" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ])
);

app.whenReady().then(createWindow);

app.on("before-quit", () => {
  if (nextProcess) nextProcess.kill();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
