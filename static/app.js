let connected = false;
const usernameInput = document.getElementById('username');
const button = document.getElementById('join_leave');
const container = document.getElementById('container');
const count = document.getElementById('count');
let room;
let dataTrack;
let videoTrack;
let audioTrack;

function updateParticipantCount() {
    if (!connected)
        count.innerHTML = 'Disconnected.';
    else
        count.innerHTML = (room.participants.size + 1) + ' participants online.';
};

function disconnect() {
    room.disconnect();
    while (container.lastChild.id != 'local')
        container.removeChild(container.lastChild);
    button.innerHTML = 'Join call';
    connected = false;
    updateParticipantCount();
};

function participantConnected(participant) {
    let participantDiv = document.createElement('div');
    participantDiv.setAttribute('id', participant.sid);
    participantDiv.setAttribute('class', 'participant');

    let tracksDiv = document.createElement('div');
    participantDiv.appendChild(tracksDiv);

    let labelDiv = document.createElement('div');
    labelDiv.innerHTML = participant.identity;
    labelDiv.setAttribute('class', 'nameLabel');
    participantDiv.appendChild(labelDiv);

    container.appendChild(participantDiv);

    participant.tracks.forEach(publication => {
        if (publication.isSubscribed)
            trackSubscribed(tracksDiv, publication.track);
    });
    participant.on('trackSubscribed', track => trackSubscribed(tracksDiv, track));
    participant.on('trackUnsubscribed', trackUnsubscribed);

    updateParticipantCount();
};

function participantDisconnected(participant) {
    document.getElementById(participant.sid).remove();
    updateParticipantCount();
};

function attachRemoteDataTrack(div,track) {
    let dataDiv = document.createElement('div');
    dataDiv.setAttribute('id', track.sid);
    dataDiv.setAttribute('class', "emoji");
    div.appendChild(dataDiv);
};

function animateDataLabel(div, startClass)
{
    setTimeout(function(){ div.classList.remove(startClass); }, 1000);
    div.classList.add(startClass);
}
function addToLocalDataLabel(newText)
{
    let localDataLabel = document.getElementById("datalocal");

    localDataLabel.innerHTML = newText;
    animateDataLabel(localDataLabel, "appear");

}

function addToRemoteDataLabel(newText, dataTrackSID)
{
    let remoteDataLabel = document.getElementById(dataTrackSID);
    remoteDataLabel.innerHTML = newText;
    animateDataLabel(remoteDataLabel, "appear");
}

function sendDataToRoom(data)
{
    dataTrack.send(JSON.stringify({
        emojiData: data
      }));

}

function emojiButtonHandler(event){
    let emojiButton = event.target;
    let emojiText = emojiButton.innerHTML;
    addToLocalDataLabel(emojiText);
    sendDataToRoom(emojiText);
}

function activateEmojiButtons()
{
    let emojiButtonGroup = document.getElementsByClassName("emojibuttons");
    let emojiButton;
    for (let i = 0; i < emojiButtonGroup.length; i++)
    {
        emojiButton = emojiButtonGroup[i];
        emojiButton.addEventListener('click', emojiButtonHandler);
    }
}
//function attachDataTrack
function trackSubscribed(div, track) {
  console.log("Inside this "+ track.kind);
  if (track.kind === 'data') {
    console.log(track + " "+ track.sid);
    track.on('message', (data,track) => {
        addToRemoteDataLabel(JSON.parse(data).emojiData, track.sid);
//        console.log(data.emojiData+ " " +track.sid+" "+ data["emojiData"]);
    });
    // Attaching the data track to a label
    attachRemoteDataTrack(div,track);

  }else{
    div.appendChild(track.attach());
  }
};

function trackUnsubscribed(track) {
    if(track.kind === 'data')
    {
        document.getElementById(track.sid).remove();
    }else
    {
        track.detach().forEach(element => element.remove());
    }
};

function addLocalVideo() {
    Twilio.Video.createLocalVideoTrack().then(track => {
        let video = document.getElementById('local').firstChild;
        videoTrack = track;
        video.appendChild(track.attach());
    });
};

function addLocalAudio() {
    Twilio.Video.createLocalAudioTrack().then(track => {
        audioTrack = track;
    });
};

function addLocalData() {
    var localDataTrack = new Twilio.Video.LocalDataTrack();
    dataTrack = localDataTrack;
    let localFeedDiv = document.getElementById('local').firstChild;
    console.log("This is local data after sid: "+ localDataTrack.id);
};

function connectButtonHandler(event) {
    event.preventDefault();
    if (!connected) {
        let username = usernameInput.value;
        if (!username) {
            alert('Enter your name before connecting');
            return;
        }
        button.disabled = true;
        button.innerHTML = 'Connecting...';
        connect(username).then(() => {
            button.innerHTML = 'Leave call';
            button.disabled = false;
        }).catch(() => {
            alert('Connection failed. Is the backend running?');
            button.innerHTML = 'Join call';
            button.disabled = false;
        });
    }
    else {
        disconnect();
        button.innerHTML = 'Join call';
        connected = false;
    }
};

function connect(username) {
    let promise = new Promise((resolve, reject) => {
        // get a token from the back end
        fetch('/login', {
            method: 'POST',
            body: JSON.stringify({'username': username})
        }).then(res => res.json()).then(data => {
            // join video call
            return Twilio.Video.connect(data.token, {tracks: [dataTrack, videoTrack, audioTrack], video:true, audio:true});
        }).then(_room => {
            room = _room;
            room.participants.forEach(participantConnected);
            room.on('participantConnected', participantConnected);
            room.on('participantDisconnected', participantDisconnected);
            connected = true;
            updateParticipantCount();
            resolve();
        }).catch(() => {
            reject();
        });
    });
    return promise;
};

addLocalVideo();
addLocalAudio();
addLocalData();
activateEmojiButtons();
button.addEventListener('click', connectButtonHandler);