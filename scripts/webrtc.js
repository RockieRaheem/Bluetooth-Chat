let localConnection, remoteConnection, dataChannel, onMessageCallback;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

function handleDataChannelEvents(channel) {
  channel.onopen = () => {
    console.log("Data channel open!");
    // You can call a callback or update the UI here
    if (onMessageCallback) onMessageCallback("__CONNECTED__");
  };
  channel.onclose = () => {
    console.log("Data channel closed!");
  };
}

// In createOffer:
export async function createOffer(setOffer) {
  localConnection = new RTCPeerConnection(rtcConfig);
  dataChannel = localConnection.createDataChannel("chat");
  dataChannel.onmessage = (e) => onMessageCallback && onMessageCallback(e.data);
  handleDataChannelEvents(dataChannel);

  await localConnection.setLocalDescription(await localConnection.createOffer());

  localConnection.onicecandidate = null; // We'll use icegatheringstatechange instead

  localConnection.addEventListener("icegatheringstatechange", () => {
    if (localConnection.iceGatheringState === "complete") {
      setOffer(JSON.stringify(localConnection.localDescription));
    }
  });
}

// In receiveOffer:
export async function receiveOffer(offerString, setAnswer) {
  remoteConnection = new RTCPeerConnection(rtcConfig);
  remoteConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.onmessage = (e) => onMessageCallback && onMessageCallback(e.data);
    handleDataChannelEvents(dataChannel);
  };

  const offer = JSON.parse(offerString);
  await remoteConnection.setRemoteDescription(offer);
  await remoteConnection.setLocalDescription(await remoteConnection.createAnswer());

  remoteConnection.onicecandidate = null;

  remoteConnection.addEventListener("icegatheringstatechange", () => {
    if (remoteConnection.iceGatheringState === "complete") {
      setAnswer(JSON.stringify(remoteConnection.localDescription));
    }
  });
}

export async function finalizeConnection(answerString) {
  const answer = JSON.parse(answerString);
  await localConnection.setRemoteDescription(answer);
}

export function sendPeerMessage(msg) {
  if (dataChannel && dataChannel.readyState === "open") dataChannel.send(msg);
}

export function setOnMessage(cb) {
  onMessageCallback = cb;
}
