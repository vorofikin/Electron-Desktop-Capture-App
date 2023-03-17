class Renderer {
  constructor() {
    this.$startButton = document.querySelector("#toggleRecord");
    this.$video = document.querySelector("#video");
    this.$selector = document.querySelector("#selector");
    this.videoSource = "";
    this.$micButton = document.querySelector("#mic");
    this.$micIcon = document.querySelector("#micIcon");
    ipcRenderer
      .invoke("get-config")
      .then((res) => {
        if (res.config.recordAudio) {
          this.$micIcon.className = "bi bi-mic";
          this.$micButton.className = "btn btn-success";
          this.isMicActive = true;
        } else {
          this.$micIcon.className = "bi bi-mic-mute";
          this.$micButton.className = "btn btn-warning";
          this.isMicActive = false;
        }
      })
      .catch((e) => console.log(e));
    this.isMicActive = false;
    this.settingsModal = document.querySelector("#settingsModal");
    this.mediaRecorder = "";
    this.$loader = document.querySelector("#loader");
    this.$errorMessageBox = document.querySelector("#errorMessage");
    this.initEventListeners();
  }

  initEventListeners() {
    this.$startButton.addEventListener("click", async () => {
      this.$errorMessageBox.innerHTML = "";
      const { config } = await ipcRenderer.invoke("get-config");
      if (config.whatToRecord == "Only Audio" && !this.isMicActive) {
        this.$errorMessageBox.innerHTML = `Sorry, but the microphone if off.
        Please, turn on the microphone to record "Only Audio"`;
        return;
      }
      if (this.$startButton.className.includes("btn btn-primary")) {
        this.$startButton.className = "btn btn-danger";
        this.$startButton.innerHTML = "Stop recording";
        this.startRecording();
      } else {
        this.$startButton.className = "btn btn-primary";
        this.$startButton.innerHTML = "Start recording";
        this.mediaRecorder.stop();
      }
    });
    this.$micButton.addEventListener("click", () => {
      if (this.$micIcon.className.includes("mute")) {
        this.$micIcon.className = "bi bi-mic";
        this.$micButton.className = "btn btn-success";
        this.isMicActive = true;
        ipcRenderer.invoke("toggle-record-audio", true);
      } else {
        this.$micIcon.className = "bi bi-mic-mute";
        this.$micButton.className = "btn btn-warning";
        this.isMicActive = false;
        ipcRenderer.invoke("toggle-record-audio", false);
      }
    });
    const $pathInput = document.querySelector("#recordingPath");
    const $formatSelector = document.querySelector("#recordingFormat");
    const $changePathButton = document.querySelector("#changePath");
    const $separateCheckbox = document.querySelector("#separateAudio");
    const $recordSelector = document.querySelector("#whatToRecord");
    const $resolutionSelector = document.querySelector("#resolution");
    this.settingsModal.addEventListener("shown.bs.modal", () => {
      ipcRenderer
        .invoke("get-config")
        .then((res) => {
          $pathInput.placeholder = res.config.sourceDir;
          $formatSelector.value = res.config.recordingFormat;
          $recordSelector.value = res.config.whatToRecord;
          $resolutionSelector.value = res.config.videoSize;
          if (res.config.separateAudioAndVideo) {
            $separateCheckbox.checked = true;
          } else {
            $separateCheckbox.checked = false;
          }
        })
        .catch((e) => console.log(e));
      $changePathButton.addEventListener("click", changePathListener);
      $formatSelector.addEventListener("change", selectFormat);
      $separateCheckbox.addEventListener(
        "click",
        toggleSeparateAudioAndVideoOption
      );
      $recordSelector.addEventListener("change", toggleRecordSelector);
      $resolutionSelector.addEventListener("change", changeResolution);
      this.settingsModal.addEventListener("hidden.bs.modal", () => {
        $changePathButton.removeEventListener("click", changePathListener);
        $formatSelector.removeEventListener("change", selectFormat);
        $separateCheckbox.removeEventListener(
          "click",
          toggleSeparateAudioAndVideoOption
        );
        $recordSelector.removeEventListener("change", toggleRecordSelector);
        $resolutionSelector.removeEventListener("change", changeResolution);
      });
    });

    function changeResolution(e) {
      ipcRenderer.invoke("change-resolution", e.target.value);
    }
    async function changePathListener(e) {
      e.preventDefault();
      const dial = await ipcRenderer.invoke("change-default-path-dialog");
      if (!dial.canceled) {
        $pathInput.placeholder = dial.filePaths[0];
      }
    }

    function toggleRecordSelector(e) {
      ipcRenderer.invoke("toggle-record-selector", e.target.value);
    }

    function selectFormat(e) {
      ipcRenderer.invoke("change-video-format", e.target.value);
      $formatSelector.value = e.target.value;
    }
    function toggleSeparateAudioAndVideoOption() {
      ipcRenderer.invoke(
        "toggle-separate-audio-and-video",
        $separateCheckbox.checked
      );
    }
  }

  async getVideoSources() {
    let { videoSources } = await ipcRenderer.invoke("get-video-sources");
    videoSources.forEach((source) => {
      const option = document.createElement("option");
      option.innerHTML = source.name;
      option.value = source.id;
      this.$selector.appendChild(option);
    });
    this.selectSource(videoSources[0].id);
    await this.startPreview();
    this.$selector.addEventListener("change", (e) => {
      this.selectSource(e.target.value);
      this.startPreview();
    });
  }

  selectSource(source) {
    this.videoSource = source;
  }

  async startPreview() {
    const previewConfig = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: this.videoSource,
        },
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(previewConfig);
    this.$video.srcObject = stream;
    this.$video.play();
  }

  async startRecording() {
    let recordingConfig = {};
    if (this.isMicActive) {
      recordingConfig = {
        audio: {
          mandatory: {
            chromeMediaSource: "desktop",
          },
        },
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
          },
        },
      };
    } else {
      recordingConfig = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: this.videoSource,
          },
        },
      };
    }
    const stream = await navigator.mediaDevices.getUserMedia(recordingConfig);
    const options = { mimeType: "video/webm;codecs=h264" };
    this.mediaRecorder = new MediaRecorder(stream, options);
    let chunks = [];
    this.mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    this.mediaRecorder.start(33);
    this.mediaRecorder.onstop = () => this.stopRecording(chunks);
  }

  async exportAudio(config, fileName) {
    if (!this.isMicActive) {
      return;
    }
    const options = {
      webmPath: path.join(config.sourceDir, fileName),
      audioPath: path.join(
        config.sourceDir,
        `${fileName.split(".")[0]}.${config.audioFormat}`
      ),
    };
    try {
      await ffmpeg.extractAudioFromVideo(options);
    } catch (e) {
      console.log(e);
    }
  }

  async exportVideo(config, options, webmName) {
    options.resolution = config.videoSize;
    try {
      switch (config.recordingFormat) {
        case "webm":
          this.$loader.setAttribute("hidden", "hidden");
          break;
        case "mp4":
          const mp4Name = `${new Date().toGMTString().replaceAll(":", "-")}.${
            config.recordingFormat
          }`;
          options.newPath = path.join(config.sourceDir, mp4Name);
          break;
        case "avi":
          const aviName = `${new Date().toGMTString().replaceAll(":", "-")}.${
            config.recordingFormat
          }`;
          options.newPath = path.join(config.sourceDir, aviName);
          break;
        default:
          break;
      }
      if (config.recordingFormat !== "webm") {
        await ffmpeg.convertVideoToNewFormat(options);
        fs.unlinkSync(path.join(config.sourceDir, webmName));
      }
    } catch (e) {
      console.log(e);
    }
  }

  async deleteAudioFromVideo(sourceDir, fileName, resolution) {
    if (!this.isMicActive) {
      return;
    }
    try {
      await ffmpeg.deleteAudioFromVideo(sourceDir, fileName, resolution);
    } catch (e) {
      console.log(e);
    }
  }

  async stopRecording(chunks) {
    try {
      this.$loader.removeAttribute("hidden");
      const blob = new Blob(chunks, {
        type: "video/webm",
      });
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const webmName = `${new Date().toGMTString().replaceAll(":", "-")}.webm`;
      let options = {};
      const { config } = await ipcRenderer.invoke("get-config");
      fs.writeFileSync(path.join(config.sourceDir, webmName), buffer);
      options.webmPath = path.join(config.sourceDir, webmName);
      switch (config.whatToRecord) {
        case "Only Audio":
          await this.exportAudio(config, webmName);
          fs.unlinkSync(path.join(config.sourceDir, webmName));
          break;
        case "Only Video":
          await this.exportVideo(config, options, webmName);
          await this.deleteAudioFromVideo(
            config.sourceDir,
            `${webmName.split(".")[0]}.${config.recordingFormat}`,
            config.videoSize
          );
          fs.unlinkSync(
            path.join(
              config.sourceDir,
              `${webmName.split(".")[0]}.${config.recordingFormat}`
            )
          );
          break;
        case "Audio & Video":
          await this.exportAudio(config, webmName);
          if (config.separateAudioAndVideo) {
            await this.exportVideo(config, options, webmName);
          }
          break;
        default:
          break;
      }
      ipcRenderer.invoke("success-notification");
    } catch (e) {
      ipcRenderer.invoke("error-notification", e.message);
      console.log(e);
    } finally {
      this.$loader.setAttribute("hidden", "hidden");
    }
  }
}

const render = new Renderer();
render.getVideoSources();
