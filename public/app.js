// دالة مساعدة لإظهار الرسائل
function showMsg(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'msg ' + type;
}

// دالة لجلب بصمة الجهاز (لمنع تعدد الحسابات)
async function getFingerprint() {
  // بصمة بسيطة تعتمد على خصائص المتصفح
  const data = navigator.userAgent + screen.width + screen.height + navigator.language;
  const msgBuffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  if (!username || !password) return showMsg('auth-msg', '> ERROR: Missing fields', 'error');

  const fingerprint = await getFingerprint();

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, fingerprint })
    });
    const data = await res.json();
    if (data.ok) showMsg('auth-msg', '> SUCCESS: Account created. Please login.', 'success');
    else showMsg('auth-msg', '> ERROR: ' + data.error, 'error');
  } catch (e) { showMsg('auth-msg', '> ERROR: Connection failed', 'error'); }
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  if (!username || !password) return showMsg('auth-msg', '> ERROR: Missing fields', 'error');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    
    if (data.ok) {
      // إخفاء شاشة الدخول وإظهار شاشة الغرف
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('rooms-screen').style.display = 'block';
      document.getElementById('current-user').textContent = data.user.username;
    } else {
      showMsg('auth-msg', '> ERROR: ' + data.error, 'error');
    }
  } catch (e) { showMsg('auth-msg', '> ERROR: Connection failed', 'error'); }
}

async function createRoom() {
  const name = document.getElementById('room-name').value;
  if (!name) return showMsg('room-msg', '> ERROR: Room name required', 'error');

  try {
    const res = await fetch('/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.ok) {
      showMsg('room-msg', `> ROOM CREATED. CODE: ${data.joinCode}`, 'success');
      // يمكنك هنا توجيه المستخدم لصفحة الغرفة
      window.location.href = `/room.html?id=${data.roomId}`;
    } else {
      showMsg('room-msg', '> ERROR: ' + data.error, 'error');
    }
  } catch (e) { showMsg('room-msg', '> ERROR: Connection failed', 'error'); }
}

async function joinRoom() {
  const code = document.getElementById('join-code').value;
  if (!code) return showMsg('room-msg', '> ERROR: Code required', 'error');

  try {
    const res = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (data.ok) {
      showMsg('room-msg', '> JOINED SUCCESSFULLY', 'success');
      // توجيه المستخدم لصفحة الغرفة
      window.location.href = `/room.html?id=${data.room.id}`;
    } else {
      showMsg('room-msg', '> ERROR: ' + data.error, 'error');
    }
  } catch (e) { showMsg('room-msg', '> ERROR: Connection failed', 'error'); }
}
