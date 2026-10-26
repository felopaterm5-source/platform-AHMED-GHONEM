const TEACHER_PASS = '01033793067', STUDENT_CODE = '7137';

/* ========= إعداد Firebase =========
   الصق هنا بيانات مشروعك من: Firebase Console > Project settings > Your apps > Web app
   لو سيبتها فاضية، الموقع يعرض الحصص اللي في data.js بس، ورفع الحصص من لوحة المعلم هيكون متوقف. */
const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

const SECS = [{k:'diff',t:'التفاضل والتكامل',i:'∫'},{k:'alg',t:'الجبر والهندسة الفراغية',i:'△'},{k:'stat',t:'الاستاتيكا',i:'⚖️'},{k:'dyn',t:'الديناميكا',i:'🚀'}];
let name = null, T = false, view = 'home', sec = null;
try { name = localStorage.getItem('nm'); T = sessionStorage.getItem('T') === '1'; } catch (e) {}
const $ = s => document.querySelector(s), app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => /^(https?:\/\/|files\/)/i.test(u || '') ? u : '';

/* ========= الحصص: المحلية (data.js) + السحابية (Firebase) ========= */
const cloudOn = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && window.firebase);
let db = null, st = null, cloud = [], cloudErr = '', busy = false;
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
    db = firebase.firestore(); st = firebase.storage();
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

/* ========= رفع ونشر حصة ========= */
function publish(){
  const t = $('#gt').value.trim(), kind = $('#gk').value, sc = $('#gs').value;
  const f = $('#gf').files[0], u = $('#gu').value.trim();
  if (!cloudOn || !db){ alert('لازم تضيف إعدادات Firebase في أول app.js الأول'); return; }
  if (!t){ alert('اكتب عنوان الحصة'); return; }
  if (f){
    if (kind === 'link'){ alert('نوع "رابط" ما يحتاجش ملف، الصق الرابط بس'); return; }
    if (kind === 'video' && !f.type.startsWith('video/')){ alert('اختار ملف فيديو (mp4)'); return; }
    if (kind === 'pdf' && f.type !== 'application/pdf'){ alert('اختار ملف PDF'); return; }
  } else if (!/^https?:\/\//i.test(u)){ alert('اختار ملف من جهازك أو الصق رابط يبدأ بـ https://'); return; }

  const date = new Date().toLocaleDateString('ar-EG', {weekday:'long', day:'numeric', month:'long'});
  const btn = $('#gg'), pr = $('#pr');
  busy = true; btn.disabled = true;
  const done = (ok, msg) => { busy = false; if (msg) alert(msg); render(); };
  const save = (url, path) => db.collection('lessons').add({
    sec: sc, title: t, kind, url, path: path || '', date,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => done(true, 'تم نشر الحصة وظهرت للطلاب ✅'), e => done(false, 'فشل الحفظ: ' + e.message));

  if (!f){ save(u, ''); return; }
  const path = 'lessons/' + Date.now() + '_' + f.name.replace(/[^\w.\-]/g, '_');
  const task = st.ref(path).put(f);
  task.on('state_changed',
    s => { pr.textContent = 'جاري الرفع... ' + Math.round(s.bytesTransferred / s.totalBytes * 100) + '%'; },
    e => done(false, 'فشل الرفع: ' + e.message),
    () => task.snapshot.ref.getDownloadURL().then(url => save(url, path), e => done(false, 'فشل الرفع: ' + e.message))
  );
}

function removeLesson(id){
  const x = cloud.find(l => l.id === id); if (!x || !confirm('حذف الحصة "' + x.title + '" نهائياً؟')) return;
  const p = x.path ? st.ref(x.path).delete().catch(() => {}) : Promise.resolve();
  p.then(() => db.collection('lessons').doc(id).delete()).catch(e => alert('فشل الحذف: ' + e.message));
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
  let h = nav() + `<div class="gl wc"><div><b style="font-size:21px">${T ? '👨‍🏫 دليل المعلم — أ/ أحمد غنيم' : '👋 أهلاً يا ' + esc(name)}</b><div class="sub" style="margin:0">${T ? 'ارفع الحصة وهتظهر للطلاب فوراً' : 'اختار القسم وابدأ المذاكرة'}</div></div></div>`;
  if (cloudErr) h += `<div class="gl em" style="padding:14px;margin:12px 0;color:#c62828">${esc(cloudErr)}</div>`;
  if (T) h += `<div class="gl" style="padding:18px 22px;margin:12px 0"><b>➕ حصة جديدة</b>
    ${cloudOn ? '' : '<p class="sub" style="color:#c62828;margin:6px 0">الرفع المباشر متوقف: ضيف إعدادات Firebase في أول ملف app.js.</p>'}
    <select id="gs">${SECS.map(x => `<option value="${x.k}"${x.k === sec ? ' selected' : ''}>${x.t}</option>`).join('')}</select>
    <input id="gt" placeholder="عنوان الحصة (مثال: الحصة 5 - المشتقة)">
    <select id="gk"><option value="video">فيديو mp4</option><option value="pdf">ملف PDF</option><option value="link">رابط يوتيوب / درايف</option></select>
    <input id="gf" type="file" accept="video/*,application/pdf">
    <p class="sub" style="margin:0;text-align:center">— أو —</p>
    <input id="gu" dir="ltr" placeholder="الصق رابط https://... (يوتيوب / درايف / ملف مرفوع)">
    <button class="p" id="gg" style="width:100%"${cloudOn ? '' : ' disabled'}>رفع ونشر الحصة</button>
    <div id="pr" class="sub" style="text-align:center;margin:8px 0 0"></div></div>`;
  if (!sec){
    h += `<div class="st">${SECS.map(x => `<div class="gl sc" data-s="${x.k}" style="cursor:pointer" tabindex="0"><div class="ic">${x.i}</div><div><h3>${x.t}</h3><p>${cnt(x.k)} حصة</p></div></div>`).join('')}</div>`;
  } else {
    const S = SECS.find(x => x.k === sec), L = allLessons().filter(l => l.sec === sec).reverse();
    h += `<div style="margin:0 0 12px"><button class="s" id="bs">← كل الأقسام</button></div><h2>${S.i} ${S.t}</h2>`;
    if (!L.length) h += `<div class="gl em">لسه مفيش حصص في القسم ده.</div>`;
    L.forEach(x => { const u = safeUrl(x.url); h += `<div class="gl it" style="padding:16px 20px"><div class="r"><b>${x.kind === 'video' ? '🎬' : x.kind === 'pdf' ? '📄' : '🔗'} ${esc(x.title)}</b><span class="m">${esc(x.date)}${T && x.id ? ` <button class="dg" data-del="${esc(x.id)}">حذف</button>` : ''}</span></div>${x.kind === 'video' && u ? `<video controls preload="metadata" src="${esc(u)}"></video>` : u ? `<a class="bt2" target="_blank" rel="noopener" href="${esc(u)}">${x.kind === 'pdf' ? '📄 فتح الملف' : '▶ فتح الرابط'}</a>` : ''}</div>`; });
  }
  app.innerHTML = h + `<div class="ft"><small>منصة أحمد غنيم</small></div>`; bindNav();
  app.querySelectorAll('[data-s]').forEach(c => { const f = () => { sec = c.dataset.s; render(); }; c.onclick = f; c.onkeydown = e => { if (e.key === 'Enter') f(); }; });
  app.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => removeLesson(b.dataset.del); });
  const bs = $('#bs'); if (bs) bs.onclick = () => { sec = null; render(); };
  const gg = $('#gg'); if (gg) gg.onclick = publish;
}
render();
