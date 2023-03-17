const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  dialog,
  Notification,
} = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");

let win;
const createWindow = () => {
  win = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  win.webContents.openDevTools();
  win.loadFile(path.join("src", "index.html"));
  win.removeMenu();
  createRuntimeConfig();
};

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

const createRuntimeConfig = () => {
  if (fs.existsSync(path.join(__dirname, "runtime_config.json"))) {
    return;
  }
  const config = {
    sourceDir: path.join(os.userInfo().homedir, "desktopCaptureApp"),
    recordingFormat: "webm",
    separateAudioAndVideo: false,
    audioFormat: "ogg",
    whatToRecord: "Audio & Video",
    videoSize: "1920x1080",
  };
  fs.writeFileSync(
    path.join(__dirname, "runtime_config.json"),
    JSON.stringify(config, null, 2)
  );
};

ipcMain.handle("get-video-sources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["window", "screen"],
  });
  return {
    videoSources: sources,
  };
});

ipcMain.handle("change-default-path-dialog", async () => {
  const dial = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
  });
  if (!dial.canceled) {
    const config = getConfig();
    config.sourceDir = dial.filePaths[0];
    fs.writeFileSync(
      path.join(__dirname, "runtime_config.json"),
      JSON.stringify(config, null, 2)
    );
  }
  return dial;
});

ipcMain.handle("get-config", () => {
  const userConfig = getConfig();
  return {
    config: userConfig,
  };
});

ipcMain.handle("change-video-format", (event, format) => {
  const config = getConfig();
  config.recordingFormat = format;
  fs.writeFileSync(
    path.join(__dirname, "runtime_config.json"),
    JSON.stringify(config, null, 2)
  );
});

ipcMain.handle("toggle-separate-audio-and-video", (event, state) => {
  const config = getConfig();
  config.separateAudioAndVideo = state;
  fs.writeFileSync(
    path.join(__dirname, "runtime_config.json"),
    JSON.stringify(config, null, 2)
  );
});

ipcMain.handle("toggle-record-audio", (event, state) => {
  const config = getConfig();
  config.recordAudio = state;
  fs.writeFileSync(
    path.join(__dirname, "runtime_config.json"),
    JSON.stringify(config, null, 2)
  );
});

ipcMain.handle("toggle-record-selector", (event, state) => {
  const config = getConfig();
  config.whatToRecord = state;
  fs.writeFileSync(
    path.join(__dirname, "runtime_config.json"),
    JSON.stringify(config, null, 2)
  );
});

ipcMain.handle("change-resolution", (event, resolution) => {
  const config = getConfig();
  config.videoSize = resolution;
  fs.writeFileSync(
    path.join(__dirname, "runtime_config.json"),
    JSON.stringify(config, null, 2)
  );
});

ipcMain.handle("success-notification", () => {
  new Notification({
    title: "Video Saved Successfully",
    body: "Your video was saved successfully",
  }).show();
});

ipcMain.handle("error-notification", (event, msg) => {
  new Notification({
    title: "Error has occurred",
    body: msg,
  }).show();
});

const getConfig = () => {
  const config = JSON.parse(
    fs.readFileSync(path.join(__dirname, "runtime_config.json"), {
      encoding: "utf-8",
    })
  );
  return config;
};
