const video = document.getElementById("video");
const statusText = document.getElementById("status");
const fileInput = document.getElementById("fileInput");
const signalData = document.getElementById("signalData");

let selectedFile = null;
let lastX = 0;

// CAMERA
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream);

// FILE SELECT
fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0];
  statusText.innerText = "File selected: " + selectedFile.name;
});

// WEBRTC
let pc = new RTCPeerConnection();
let dataChannel = pc.createDataChannel("fileChannel");

dataChannel.onmessage = (event) => {
  let blob = new Blob([event.data]);
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "received_file";
  link.click();
};

async function createOffer() {
  let offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  signalData.value = JSON.stringify(offer);
}

async function joinOffer() {
  let offer = JSON.parse(signalData.value);
  await pc.setRemoteDescription(offer);

  let answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  signalData.value = JSON.stringify(answer);
}

async function acceptAnswer() {
  let answer = JSON.parse(signalData.value);
  await pc.setRemoteDescription(answer);
  statusText.innerText = "Connected";
}

function triggerSend() {
  if (!selectedFile) return;

  let reader = new FileReader();
  reader.onload = () => {
    dataChannel.send(reader.result);
  };
  reader.readAsArrayBuffer(selectedFile);
}

// HAND TRACKING
const hands = new Hands({
  locateFile: file =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.7
});

hands.onResults(results => {
  if (results.multiHandLandmarks.length > 0) {
    let x = results.multiHandLandmarks[0][0].x;

    if (x - lastX > 0.15) {
      triggerSend();
    }

    lastX = x;
  }
});

const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  }
});
camera.start();