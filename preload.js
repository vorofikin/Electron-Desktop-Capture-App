const { contextBridge, ipcRenderer, desktopCapturer } = require("electron");
const fs = require("fs");
const path = require("path");
const ffmpegStatic = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const Worker = require("web-worker");

contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});

contextBridge.exposeInMainWorld("fs", {
  writeFileSync: (path, data) => fs.writeFileSync(path, data),
  readFileSync: (path) => fs.readFileSync(path),
  unlinkSync: (path) => fs.unlinkSync(path),
});

contextBridge.exposeInMainWorld("ipcRenderer", {
  invoke: (msg, data) => ipcRenderer.invoke(msg, data),
});

contextBridge.exposeInMainWorld("Buffer", {
  from: (arr) => Buffer.from(arr),
});

contextBridge.exposeInMainWorld("path", {
  join: (...args) => path.join(...args),
});

contextBridge.exposeInMainWorld(`ffmpeg`, {
  changeResolutionWebm: (sourceDir, fileName, resolution) => {
    ffmpeg.setFfmpegPath(ffmpegStatic);
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(path.join(sourceDir, fileName))
        .size(resolution)
        .saveToFile(
          path.join(
            sourceDir,
            `${fileName.split(".")[0]}_resized.${fileName.split(".").pop()}`
          )
        )
        .on("end", () => {
          console.log("end");
          resolve();
        })
        .on("error", (e) => {
          console.log(e);
          reject(e);
        });
    });
  },
  convertVideoToNewFormat: (data) => {
    ffmpeg.setFfmpegPath(ffmpegStatic);
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(data.webmPath)
        .size(data.resolution)
        .saveToFile(data.newPath)
        .on("end", () => {
          console.log("end");
          resolve();
        })
        .on("error", (e) => {
          console.log(e);
          reject(e);
        });
    });
  },
  extractAudioFromVideo: (data) => {
    ffmpeg.setFfmpegPath(ffmpegStatic);
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(data.webmPath)
        .noVideo()
        .audioCodec("libmp3lame")
        .saveToFile(data.audioPath)
        .on("end", () => {
          resolve();
        })
        .on("error", (e) => {
          reject(e);
        });
    });
  },
  deleteAudioFromVideo: (sourceDir, fileName, resolution) => {
    ffmpeg.setFfmpegPath(ffmpegStatic);
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(path.join(sourceDir, fileName))
        .noAudio()
        .size(resolution)
        .saveToFile(
          path.join(
            sourceDir,
            `${fileName.split(".")[0]}_Only Video.${fileName.split(".").pop()}`
          )
        )
        .on("end", () => {
          resolve();
        })
        .on("error", (e) => {
          reject(e);
        });
    });
  },
});

contextBridge.exposeInMainWorld("web", {
  worker: (path) => {
    const worker = new Worker(path);
    return worker;
  },
  postMessage: (msg) => this.worker().postMessage(msg),
});
