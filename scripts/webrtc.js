let localConnection, remoteConnection, dataChannel, onMessageCallback;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

export async function createOffer(setOffer) {
  localConnection = new RTCPeerConnection(rtcConfig);
  dataChannel = localConnection.createDataChannel("chat");
  dataChannel.onmessage = (e) => onMessageCallback && onMessageCallback(e.data);

  const offer = await localConnection.createOffer();
  await localConnection.setLocalDescription(offer);

  localConnection.onicecandidate = (event) => {
    if (event.candidate === null)
      setOffer(JSON.stringify(localConnection.localDescription));
  };
}

export async function receiveOffer(offerString, setAnswer) {
  remoteConnection = new RTCPeerConnection(rtcConfig);
  remoteConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.onmessage = (e) =>
      onMessageCallback && onMessageCallback(e.data);
  };

  const offer = JSON.parse(offerString);
  await remoteConnection.setRemoteDescription(offer);
  const answer = await remoteConnection.createAnswer();
  await remoteConnection.setLocalDescription(answer);

  remoteConnection.onicecandidate = (event) => {
    if (event.candidate === null)
      setAnswer(JSON.stringify(remoteConnection.localDescription));
  };
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
