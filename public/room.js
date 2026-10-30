const socket = io();
let player;
let currentRoomId = new URLSearchParams(window.location.search).get('id');
let currentUser = null;
let replyTo = null;
let isOwner = false;

// 1. تهيئة مشغل يوتيوب
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '100%',
    width: '100%',
    videoId: '', // سيتم تحديثه لاحقاً
    playerVars: { 'autoplay': 0, 'controls': 0, 'disablekb': 1 },
    events: {
      'onStateChange': onPlayerStateChange
    }
  });
}

// إرسال الأحداث للمالك فقط
function onPlayerStateChange(event) {
  if (!isOwner) return;
  if (event.data === YT.PlayerState.PLAYING) {
    socket.emit('video:control', { roomId: currentRoomId, action: 'play', time: player.getCurrentTime() });
  } else if (event.data === YT.PlayerState.PAUSED) {
    socket.emit('video:control', { roomId: currentRoomId, action: 'pause', time: player.getCurrentTime() });
  }
}

// 2. جلب بيانات الغرفة عند التحميل
async function initRoom() {
  try {
    const res = await fetch(`/api/rooms/${currentRoomId}`, { credentials: 'include' });
    const data = await res.json();
    if (!data.ok) return window.location.href = '/';

    document.getElementById('room-name').textContent = data.room.name;
    document.getElementById('room-code').textContent = data.room.join_code || 'HIDDEN';
    
    // التحقق من الصلاحيات
    const me = data.members.find(m => m.username === currentUser);
    isOwner = me && (me.role === 'owner' || me.role === 'admin');
    if (isOwner) document.getElementById('controls').style.display = 'flex';

    // الانضمام للغرفة عبر Socket
    socket.emit('room:join', { roomId: currentRoomId });

  } catch (e) { console.error(e); }
}

// 3. استقبال الأحداث من Socket.IO
socket.on('room:members', (members) => {
  const list = document.getElementById('member-list');
  list.innerHTML = '';
  members.forEach(m => {
    const li = document.createElement('li');
    li.innerHTML = `${m.username} ${m.role === 'owner' ? '<span class="owner-tag">[OWNER]</span>' : ''}`;
    list.appendChild(li);
  });
});

socket.on('chat:new', (msg) => {
  const chatBox = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  
  let replyHtml = '';
  if (msg.replyToId) {
    // للتبسيط، نعرض معرف الرسالة الأصلية فقط
    replyHtml = `<span class="reply-context">↳ رد على رسالة سابقة</span>`;
  }

  div.innerHTML = `
    ${replyHtml}
    <span class="time">[${new Date(msg.createdAt).toLocaleTimeString('ar', {hour12: false})}]</span>
    <span class="user">${msg.username}</span>
    <span class="content">${msg.content}</span>
    <button onclick="setReply('${msg.id}', '${msg.username}')">↩</button>
  `;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// استقبال أوامر الفيديو من المالك
socket.on('video:command', ({ action, time }) => {
  if (action === 'play') {
    player.seekTo(time, true);
    player.playVideo();
  } else if (action === 'pause') {
    player.seekTo(time, true);
    player.pauseVideo();
  } else if (action === 'load') {
    player.loadVideoById(action.videoId);
  }
});

// 4. دوال التحكم
function loadVideo() {
  const url = document.getElementById('video-url').value;
  const videoId = url.split('v=')[1] || url.split('youtu.be/')[1] || url;
  if (videoId) {
    player.loadVideoById(videoId);
    socket.emit('video:control', { roomId: currentRoomId, action: 'load', videoId });
  }
}

function playVideo() {
  player.playVideo();
}

function pauseVideo() {
  player.pauseVideo();
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const content = input.value.trim();
  if (!content) return;

  socket.emit('chat:send', {
    roomId: currentRoomId,
    content,
    replyToId: replyTo
  });

  input.value = '';
  cancelReply();
}

function handleEnter(e) {
  if (e.key === 'Enter') sendMessage();
}

function setReply(id, username) {
  replyTo = id;
  document.getElementById('reply-bar').style.display = 'flex';
  document.getElementById('reply-text').textContent = `↩ رد على @${username}`;
}

function cancelReply() {
  replyTo = null;
  document.getElementById('reply-bar').style.display = 'none';
}

// بدء التشغيل
// نستخدم /api/auth/me لمعرفة من هو المستخدم الحالي
fetch('/api/auth/me').then(r => r.json()).then(data => {
  if (data.user) {
    currentUser = data.user.username;
    initRoom();
  } else {
    window.location.href = '/';
  }
});
