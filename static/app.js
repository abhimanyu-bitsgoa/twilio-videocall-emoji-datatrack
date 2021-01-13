let connected = false;
const usernameInput = document.getElementById('username');
const button = document.getElementById('join_leave');
const container = document.getElementById('container');
const count = document.getElementById('count');
let room, dataTrack;
// No change from Base Application
function addLocalVideo() {
    Twilio.Video.createLocalVideoTrack().then(track => {
        let video = document.getElementById('local').firstChild;
        video.appendChild(track.attach());
    });
};

function addLocalData() {
    // Creates a Local Data Track
    var localDataTrack = new Twilio.Video.LocalDataTrack();
    dataTrack = localDataTrack;
};
// No change from Base Application
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
            return Twilio.Video.connect(data.token);
        }).then(_room => {
            room = _room;
            // Publishing the local Data Track to the Room
            room.localParticipant.publishTrack(dataTrack);
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
// No change from Base Application
function disconnect() {
    room.disconnect();
    while (container.lastChild.id != 'local')
        container.removeChild(container.lastChild);
    button.innerHTML = 'Join call';
    connected = false;
    updateParticipantCount();
};
// No change from Base Application
function updateParticipantCount() {
    if (!connected)
        count.innerHTML = 'Disconnected.';
    else
        count.innerHTML = (room.participants.size + 1) + ' participants online.';
};

function participantConnected(participant) {
    let participantDiv = document.createElement('div');
    participantDiv.setAttribute('id', participant.sid);
    participantDiv.setAttribute('class', 'participant');

    let tracksDiv = document.createElement('div');
    participantDiv.appendChild(tracksDiv);

    let labelDiv = document.createElement('div');
    labelDiv.innerHTML = participant.identity;
    labelDiv.setAttribute('class', 'nameLabel'); // Add formatting to name of participant
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
// No change
function participantDisconnected(participant) {
    document.getElementById(participant.sid).remove();
    updateParticipantCount();
};

function trackSubscribed(div, track) {
  if (track.kind === 'data') {
    // Registering addToRemoteDataLabel(...) event handler Remote Data Track receive
    track.on('message', data => {
        addToRemoteDataLabel(JSON.parse(data).emojiData, track.sid);
    });
    // Attaching the data track to a display label
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

function attachRemoteDataTrack(div,track) {
    let dataDiv = document.createElement('div');
    dataDiv.setAttribute('id', track.sid);
    dataDiv.setAttribute('class', "emoji");
    div.appendChild(dataDiv);
};

function addToRemoteDataLabel(newText, dataTrackSID)
{
    let remoteDataLabel = document.getElementById(dataTrackSID);
    remoteDataLabel.innerHTML = newText;
    animateDataLabel(remoteDataLabel, "appear");
}

function animateDataLabel(div, startClass)
{
    setTimeout(function(){ div.classList.remove(startClass); }, 1000);
    div.classList.add(startClass);
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

function emojiButtonHandler(event){
    let emojiButton = event.target;
    let emojiText = emojiButton.innerHTML;
    addToLocalDataLabel(emojiText);
    sendDataToRoom(emojiText);
}

function addToLocalDataLabel(newText)
{
    let localDataLabel = document.getElementById("datalocal");
    localDataLabel.innerHTML = newText;
    animateDataLabel(localDataLabel, "appear");
}

function sendDataToRoom(data)
{
    dataTrack.send(JSON.stringify({
        emojiData: data
      }));
}

addLocalVideo();
addLocalData();
activateEmojiButtons();
button.addEventListener('click', connectButtonHandler);