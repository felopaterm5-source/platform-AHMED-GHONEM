const TEACHER_PASS = '01033793067', STUDENT_CODE = '7137';

/* ========= إعداد Firebase (مجاني: Firestore فقط، من غير Storage) =========
   الصق هنا بيانات مشروعك من: Firebase Console > Project settings > Your apps > Web app
   لو سيبتها فاضية، الموقع يعرض الحصص اللي في data.js بس، ونشر الحصص من لوحة المعلم هيكون متوقف. */
const firebaseConfig = {
  apiKey: "AIzaSyC0lFo-kVpzHBQNtvlvD-K-q0KEKgrjt2Y",
  authDomain: "chicken-shawarma.firebaseapp.com",
  projectId: "chicken-shawarma",
  storageBucket: "chicken-shawarma.firebasestorage.app",
  messagingSenderId: "6010556213",
  appId: "1:6010556213:web:ab744b8a080ec92ccbc67c",
  measurementId: "G-NWPVJD2J31"
};

const SECS = [{k:'diff',t:'التفاضل والتكامل',i:'∫'},{k:'alg',t:'الجبر والهندسة الفراغية',i:'△'},{k:'stat',t:'الاستاتيكا',i:'⚖️'},{k:'dyn',t:'الديناميكا',i:'🚀'}];
let name = null, T = false, view = 'home', sec = null;
try { name = localStorage.getItem('nm'); T = sessionStorage.getItem('T') === '1'; } catch (e) {}
const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => /^(https?:\/\/|files\/)/i.test(u || '') ? u : '';

/* رابط يوتيوب / درايف -> رابط التضمين داخل الصفحة (أو '' لو مش مدعوم) */
function embedUrl(u){
  u = String(u || '');
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (m) return 'https://www.youtube.com/embed/' + m[1] + '?rel=0';
  m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/i) || u.match(/drive\.google\.com\/open\?(?:.*&)?id=([\w-]+)/i);
  if (m) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
  return '';
}

/* ========= الحصص: المحلية (data.js) + السحابية (Firebase) ========= */
const cloudOn = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && window.firebase);
let db = null, cloud = [], cloudErr = '', busy = false;
const allLessons = () => LESSONS.concat(cloud);
const cnt = k => allLessons().filter(l => l.sec === k).length;

function refresh(){
  const a = document.activeElement;
  if (busy || (a && app.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return; // ما نمسحش اللي بيتكتب
  render();
}
if (cloudOn){
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    firebase.auth().signInAnonymously().then(() => {
      db.collection('lessons').orderBy('createdAt').onSnapshot(
        s => { cloud = s.docs.map(d => ({ id: d.id, ...d.data() })); cloudErr = ''; refresh(); },
        e => { cloudErr = 'تعذّر تحميل الحصص: ' + e.message; refresh(); }
      );
    }).catch(e => { cloudErr = 'تعذّر الاتصال (فعّل Anonymous في Authentication): ' + e.message; refresh(); });
  } catch (e) { cloudErr = 'إعدادات Firebase غير صحيحة: ' + e.message; }
}

function nav(){
  const lg = name || T;
  return `<nav class="nv gl"><div class="lg"><span class="mk">AG</span>أحمد غنيم</div>${lg ? '<button class="p" id="out">خروج</button>' : '<div class="bt" style="margin:0"><button class="o" id="vt">دليل المعلم</button><button class="p" id="vs">دليل الطالب</button></div>'}</nav>`;
}
function bindNav(){
  const o = $('#out'); if (o) o.onclick = () => { name = null; T = false; view = 'home'; sec = null; try { localStorage.removeItem('nm'); sessionStorage.removeItem('T'); } catch (e) {} render(); };
  const s = $('#vs'); if (s) s.onclick = () => { view = 'student'; render(); };
  const t = $('#vt'); if (t) t.onclick = () => { view = 'teacher'; render(); };
}

/* ========= نشر حصة (لصق رابط وخلاص) ========= */
function publish(){
  const t = $('#gt').value.trim(), sc = $('#gs').value, u = $('#gu').value.trim();
  if (!cloudOn || !db){ alert('لازم تضيف إعدادات Firebase في أول app.js الأول'); return; }
  if (!t){ alert('اكتب عنوان الحصة'); return; }
  if (!/^https?:\/\//i.test(u)){ alert('الصق رابط يبدأ بـ https://'); return; }
  const kind = embedUrl(u) ? 'video' : /\.pdf($|[?#])/i.test(u) ? 'pdf' : 'link';
  const date = new Date().toLocaleDateString('ar-EG', {weekday:'long', day:'numeric', month:'long'});
  busy = true; $('#gg').disabled = true;
  db.collection('lessons').add({ sec: sc, title: t, kind, url: u, date, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
    .then(() => { busy = false; alert('تم نشر الحصة وظهرت للطلاب ✅'); render(); },
          e => { busy = false; $('#gg').disabled = false; alert('فشل الحفظ: ' + e.message); });
}

function removeLesson(id){
  const x = cloud.find(l => l.id === id); if (!x || !confirm('حذف الحصة "' + x.title + '" نهائياً؟')) return;
  db.collection('lessons').doc(id).delete().catch(e => alert('فشل الحذف: ' + e.message));
}

function render(){
  if (!name && !T){
    if (view === 'home'){
      app.innerHTML = nav() + `<section class="hero"><div class="gl hc"><span class="bdg">منصة الرياضيات</span><h1>الرياضيات مش صعبة، هي محتاجة مدرس يفهمك.</h1><p>شرح مبسّط، تدريبات منظمة، ومتابعة مستمرة مع أ. أحمد غنيم عشان تدخل الامتحان وانت واثق.</p><div class="bt"><button class="p" id="vs2">دليل الطالب</button><button class="o" id="vt2">دليل المعلم</button></div></div><div class="gl art"><div class="rg"><b>AG</b></div><b class="sy" style="top:8%;left:10%">π</b><b class="sy" style="top:38%;right:6%">√x</b><b class="sy" style="bottom:6%;left:12%">∑</b></div></section>
      <section class="sec"><h2>أقسام المنهج</h2><p class="sub">أربعة فروع، وكل فرع فيه حصصه</p><div class="st">${SECS.map(x => `<div class="gl sc"><div class="ic">${x.i}</div><div><h3>${x.t}</h3><p>فيديوهات شرح وملفات PDF.</p></div></div>`).join('')}</div></section><div class="ft"><b>منصة أحمد غنيم</b></div>`;
      $('#vs2').onclick = () => { view = 'student'; render(); }; $('#vt2').onclick = () => { view = 'teacher'; render(); }; bindNav(); return;
    }
    const s = view === 'student';
    app.innerHTML = nav() + `<div class="gl lc"><h2 style="font-size:26px">${s ? '📘 دليل الطالب' : '👨‍🏫 دليل المعلم'}</h2><p class="sub">${s ? 'اكتب اسمك وكود الدخول (٤ أرقام)' : 'اكتب كلمة سر المعلم'}</p>${s ? '<input id="nm" placeholder="اسم الطالب بالكامل" autocomplete="name"><input id="cd" inputmode="numeric" maxlength="4" placeholder="كود الدخول" dir="ltr">' : '<input id="pp" type="password" placeholder="كلمة السر" dir="ltr">'}<button class="p" id="go" style="width:100%;margin-top:6px">دخول</button><p style="text-align:center;margin:12px 0 0"><button class="s" id="bk">رجوع</button></p></div>`;
    $('#bk').onclick = () => { view = 'home'; render(); };
    $('#go').onclick = () => {
      if (s){ const v = $('#nm').value.trim(); if (!v){ $('#nm').focus(); return; } if ($('#cd').value.trim() !== STUDENT_CODE){ alert('كود الدخول غير صحيح'); return; } name = v; try { localStorage.setItem('nm', v); } catch (e) {} }
      else { if ($('#pp').value !== TEACHER_PASS){ alert('كلمة السر غير صحيحة'); return; } T = true; try { sessionStorage.setItem('T', '1'); } catch (e) {} }
      view = 'home'; render();
    };
    bindNav(); return;
  }
  let h = nav() + `<div class="gl wc"><div><b style="font-size:21px">${T ? '👨‍🏫 دليل المعلم — أ/ أحمد غنيم' : '👋 أهلاً يا ' + esc(name)}</b><div class="sub" style="margin:0">${T ? 'الصق رابط الحصة وهتظهر للطلاب فوراً' : 'اختار القسم وابدأ المذاكرة'}</div></div></div>`;
  if (cloudErr) h += `<div class="gl em" style="padding:14px;margin:12px 0;color:#c62828">${esc(cloudErr)}</div>`;
  if (T) h += `<div class="gl" style="padding:18px 22px;margin:12px 0"><b>➕ حصة جديدة</b>
    ${cloudOn ? '' : '<p class="sub" style="color:#c62828;margin:6px 0">النشر متوقف: ضيف إعدادات Firebase في أول ملف app.js.</p>'}
    <select id="gs">${SECS.map(x => `<option value="${x.k}"${x.k === sec ? ' selected' : ''}>${x.t}</option>`).join('')}</select>
    <input id="gt" placeholder="عنوان الحصة (مثال: الحصة 5 - المشتقة)">
    <input id="gu" dir="ltr" placeholder="الصق رابط يوتيوب / درايف / ملف PDF">
    <button class="p" id="gg" style="width:100%"${cloudOn ? '' : ' disabled'}>نشر الحصة</button></div>`;
  if (!sec){
    h += `<div class="st">${SECS.map(x => `<div class="gl sc" data-s="${x.k}" style="cursor:pointer" tabindex="0"><div class="ic">${x.i}</div><div><h3>${x.t}</h3><p>${cnt(x.k)} حصة</p></div></div>`).join('')}</div>`;
  } else {
    const S = SECS.find(x => x.k === sec), L = allLessons().filter(l => l.sec === sec).reverse();
    h += `<div style="margin:0 0 12px"><button class="s" id="bs">← كل الأقسام</button></div><h2>${S.i} ${S.t}</h2>`;
    if (!L.length) h += `<div class="gl em">لسه مفيش حصص في القسم ده.</div>`;
    L.forEach(x => {
      const u = safeUrl(x.url), em = embedUrl(u);
      const media = em ? `<iframe src="${esc(em)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`
        : x.kind === 'video' && u ? `<video controls preload="metadata" src="${esc(u)}"></video>`
        : u ? `<a class="bt2" target="_blank" rel="noopener" href="${esc(u)}">${x.kind === 'pdf' ? '📄 فتح الملف' : '▶ فتح الرابط'}</a>` : '';
      h += `<div class="gl it" style="padding:16px 20px"><div class="r"><b>${x.kind === 'video' ? '🎬' : x.kind === 'pdf' ? '📄' : '🔗'} ${esc(x.title)}</b><span class="m">${esc(x.date)}${T && x.id ? ` <button class="dg" data-del="${esc(x.id)}">حذف</button>` : ''}</span></div>${media}</div>`;
    });
  }
  app.innerHTML = h + `<div class="ft"><small>منصة أحمد غنيم</small></div>`; bindNav();
  app.querySelectorAll('[data-s]').forEach(c => { const f = () => { sec = c.dataset.s; render(); }; c.onclick = f; c.onkeydown = e => { if (e.key === 'Enter') f(); }; });
  app.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => removeLesson(b.dataset.del); });
  const bs = $('#bs'); if (bs) bs.onclick = () => { sec = null; render(); };
  const gg = $('#gg'); if (gg) gg.onclick = publish;
}
render();
