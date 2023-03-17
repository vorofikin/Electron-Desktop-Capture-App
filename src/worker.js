const fs = require('fs');
const path = require('path');
let mediaRecorder;
let chunks = [];
console.log(navigator);
const startStream = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({audio: true})
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.start(100);
      mediaRecorder.onstop = () => {
        stopRecording(chunks);
      };
      setTimeout(mediaRecorder.stop, 5000);
    })
    .catch(e => console.log(e));
}

const stopRecording = async (chunks) => {
  console.log('stop');
  const blob = new Blob(chunks, {type: 'audio/ogg; codecs=opus'});
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(path.join('E:\\OBS2', 'audio.ogg'), buffer);
}

startStream();
