const socket = io();
let currentRoomId = new URLSearchParams(window.location.search).get('id');
let currentUser = null;
let replyTo = null;
let isOwner = false;

// جلب بيانات الغرفة
async function initRoom() {
  try {
    const res = await fetch(`/api/rooms/${currentRoomId}`, { credentials: 'include' });
    const data = await res.json();
    if (!data.ok) return window.location.href = '/';

    document.getElementById('room-name').textContent = data.room.name;
    document.getElementById('room-code').textContent = data.room.join_code || 'HIDDEN';
    
    // التحقق من صلاحيات المالك
    const me = data.members.find(m => m.username.trim() === currentUser.trim());
    isOwner = me && (me.role === 'owner' || me.role === 'admin');
    
    if (isOwner) {
      document.getElementById('controls').style.display = 'flex';
    }

    socket.emit('room:join', { roomId: currentRoomId });

  } catch (e) { console.error(e); }
}

// استقبال الأعضاء
socket.on('room:members', (members) => {
  const list = document.getElementById('member-list');
  list.innerHTML = '';
  members.forEach(m => {
    const li = document.createElement('li');
    li.innerHTML = `${m.username} ${m.role === 'owner' ? '<span class="owner-tag">[OWNER]</span>' : ''}`;
    list.appendChild(li);
  });
});

// استقبال الرسائل
socket.on('chat:new', (msg) => {
  const chatBox = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  
  let replyHtml = msg.replyToId ? `<span class="reply-context">↳ رد على رسالة سابقة</span>` : '';

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
socket.on('video:command', ({ action, videoId }) => {
  const iframe = document.getElementById('player');
  if (!iframe) return;
  if (action === 'load' && videoId) {
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
});

// تحميل فيديو (للمالك)
function loadVideo() {
  const url = document.getElementById('video-url').value;
  if (!url) return;
  let videoId = url;
  if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
  else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
  
  if (videoId) {
    const iframe = document.getElementById('player');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    socket.emit('video:control', { roomId: currentRoomId, action: 'load', videoId });
  }
}

// إرسال رسالة
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

// أزرار المشاركة والأعضاء
function shareRoom() {
  const code = document.getElementById('room-code').textContent;
  if (code && code !== 'HIDDEN' && code.trim() !== '') {
    if (navigator.share) {
      navigator.share({ title: 'Watch Party', text: 'انضم لغرفتي بكود: ' + code });
    } else {
      navigator.clipboard.writeText(code).then(() => alert('تم نسخ الكود: ' + code));
    }
  }
}

function toggleMembers() {
  const list = document.getElementById('member-list');
  if (list) list.style.display = list.style.display === 'none' ? 'flex' : 'none';
}

// بدء التشغيل
fetch('/api/auth/me').then(r => r.json()).then(data => {
  if (data.user) {
    currentUser = data.user.username;
    initRoom();
  } else {
    window.location.href = '/';
  }
});
