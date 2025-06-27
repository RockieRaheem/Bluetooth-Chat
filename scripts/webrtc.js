let localConnection, remoteConnection, dataChannel, onMessageCallback;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

function handleDataChannelEvents(channel) {
  channel.onopen = () => {
    console.log("Data channel open!");
    if (onMessageCallback) onMessageCallback("__CONNECTED__");
    // Send my user info to the peer
    if (window.auth && window.auth.getCurrentUser) {
      const me = window.auth.getCurrentUser();
      channel.send(JSON.stringify({ type: "user-info", user: me }));
    }
  };
  channel.onclose = () => {
    console.log("Data channel closed!");
  };
}

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

export async function receiveOffer(offerString, setAnswer) {
  if (!offerString) {
    alert("Please paste a valid offer before clicking Receive Offer.");
    return;
  }
  let offer;
  try {
    offer = JSON.parse(offerString);
  } catch (e) {
    alert("Invalid offer format. Please check and try again.");
    return;
  }

  remoteConnection = new RTCPeerConnection(rtcConfig);
  remoteConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.onmessage = (e) => onMessageCallback && onMessageCallback(e.data);
    handleDataChannelEvents(dataChannel);
  };

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
  if (!answerString) {
    alert("Please paste a valid answer before clicking Finalize Connection.");
    return;
  }
  let answer;
  try {
    answer = JSON.parse(answerString);
  } catch (e) {
    alert("Invalid answer format. Please check and try again.");
    return;
  }
  await localConnection.setRemoteDescription(answer);
}

export function sendPeerMessage(msg) {
  if (dataChannel && dataChannel.readyState === "open") dataChannel.send(msg);
}

export function setOnMessage(cb) {
  onMessageCallback = cb;
}
