// ===== WEBRTC =====
let peer = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

let channel;

async function createOffer() {
  channel = peer.createDataChannel("file");

  channel.onopen = () => {
    document.getElementById("status").innerText = "Connected ✅";
  };

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);

  await waitIce();

  document.getElementById("offerBox").value =
    JSON.stringify(peer.localDescription);
}

async function setAnswer() {
  const answer = JSON.parse(document.getElementById("answerBox").value);
  await peer.setRemoteDescription(answer);
}

function sendFile() {

  if (!channel || channel.readyState !== "open") return;

  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    channel.send(JSON.stringify({ name: file.name }));
    channel.send(reader.result);
  };

  reader.readAsArrayBuffer(file);

  console.log("FILE SENT");
}

function waitIce() {
  return new Promise(resolve => {
    if (peer.iceGatheringState === "complete") resolve();
    else {
      peer.onicegatheringstatechange = () => {
        if (peer.iceGatheringState === "complete") resolve();
      };
    }
  });
}

// ===== HAND GESTURE =====
let sent = false;

navigator.mediaDevices.getUserMedia({ video: true })
.then(stream => {

  const video = document.getElementById("video");
  video.srcObject = stream;

  const hands = new Hands({
    locateFile: f =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
  });

  hands.setOptions({
    maxNumHands: 1,
    minDetectionConfidence: 0.7
  });

  hands.onResults(results => {

    const hand =
      results.multiHandLandmarks &&
      results.multiHandLandmarks.length > 0;

    if (hand && !sent) {

      if (channel && channel.readyState === "open") {
        sendFile();   // 🔥 AUTO SEND
        sent = true;
      }

    }

    if (!hand) {
      sent = false;
    }

  });

  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 300,
    height: 200
  });

  camera.start();

});
