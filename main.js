// ═══════════════════ STATE ═══════════════════
const defaultServices=[
  {id:1,name:'Corte Clásico',price:25000,duration:30,desc:'Corte tradicional con tijeras y máquina'},
  {id:2,name:'Fade / Degradado',price:30000,duration:45,desc:'Degradado preciso a tu estilo'},
  {id:3,name:'Barba',price:20000,duration:30,desc:'Arreglo y perfilado de barba'},
  {id:4,name:'Corte + Barba',price:45000,duration:60,desc:'Combo completo de corte y barba'},
  {id:5,name:'Diseño',price:35000,duration:45,desc:'Diseños y rayas personalizadas'},
];
const defaultHours={
  0:{open:false,from:'08:00',to:'18:00'}, // Sun
  1:{open:true,from:'08:00',to:'19:00'},
  2:{open:true,from:'08:00',to:'19:00'},
  3:{open:true,from:'08:00',to:'19:00'},
  4:{open:true,from:'08:00',to:'19:00'},
  5:{open:true,from:'08:00',to:'19:00'},
  6:{open:true,from:'09:00',to:'17:00'},
};
const DAYS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function load(k,def){try{const v=localStorage.getItem(k);return v?JSON.parse(v):def}catch{return def}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}

let services=load('js_services',defaultServices);
let hours=load('js_hours',defaultHours);
let appointments=load('js_appointments',[]);
let blockedDates=load('js_blocked',[]);
let adminPass=load('js_pass','juancho2024');

// Booking state
let booking={service:null,date:null,time:null};
let calYear,calMonth;

// ═══════════════════ VIEWS ═══════════════════
function showClient(){document.getElementById('view-client').classList.remove('hidden');document.getElementById('view-login').classList.add('hidden');document.getElementById('view-admin').classList.add('hidden')}
function showLogin(){document.getElementById('view-login').classList.remove('hidden');document.getElementById('view-client').classList.add('hidden');document.getElementById('view-admin').classList.add('hidden')}
function showAdmin(){document.getElementById('view-admin').classList.remove('hidden');document.getElementById('view-client').classList.add('hidden');document.getElementById('view-login').classList.add('hidden');renderAdminDashboard()}
function logout(){showClient()}

function doLogin(){
  const p=document.getElementById('login-pass').value;
  if(p===adminPass){document.getElementById('login-pass').value='';document.getElementById('login-error').textContent='';showAdmin()}
  else{document.getElementById('login-error').textContent='Contraseña incorrecta'}
}
function changePassword(){
  const cur=document.getElementById('pass-current').value;
  const nw=document.getElementById('pass-new').value;
  const cf=document.getElementById('pass-confirm').value;
  if(cur!==adminPass){toast('Contraseña actual incorrecta','error');return}
  if(nw.length<6){toast('La nueva contraseña debe tener al menos 6 caracteres','error');return}
  if(nw!==cf){toast('Las contraseñas no coinciden','error');return}
  adminPass=nw;save('js_pass',adminPass);
  document.getElementById('pass-current').value='';document.getElementById('pass-new').value='';document.getElementById('pass-confirm').value='';
  toast('Contraseña actualizada','success');
}

// ═══════════════════ TOAST ═══════════════════
function toast(msg,type='success'){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className=`show ${type}`;
  setTimeout(()=>t.className='',2500);
}

// ═══════════════════ CLIENT BOOKING ═══════════════════
function goStep(n){
  if(n===2&&!booking.service)return;
  if(n===3&&!booking.date)return;
  if(n===4&&!booking.time)return;
  [1,2,3,4].forEach(i=>{
    document.getElementById(`step${i}`).classList.toggle('hidden',i!==n);
    const si=document.getElementById(`step${i}-item`);
    si.classList.remove('active','done');
    if(i<n)si.classList.add('done');
    else if(i===n)si.classList.add('active');
  });
  document.getElementById('step-success').classList.add('hidden');
  if(n===2)renderCalendar();
  if(n===3)renderSlots();
  if(n===4)renderSummary();
}

function renderClientServices(){
  const g=document.getElementById('client-services-grid');
  g.innerHTML=services.map(s=>`
    <div class="service-card ${booking.service?.id===s.id?'selected':''}" onclick="selectService(${s.id})">
      <div class="service-name">${s.name}</div>
      <div class="service-duration">${s.duration} min${s.desc?` · ${s.desc}`:''}</div>
      <div class="service-price">$${Number(s.price).toLocaleString('es-CO')}</div>
    </div>`).join('');
}
function selectService(id){
  booking.service=services.find(s=>s.id===id);
  document.getElementById('btn-step1-next').disabled=false;
  renderClientServices();
}

// Calendar
function renderCalendar(){
  const now=new Date();
  if(!calYear){calYear=now.getFullYear();calMonth=now.getMonth()}
  document.getElementById('cal-month-label').textContent=`${MONTHS[calMonth]} ${calYear}`;
  const g=document.getElementById('cal-grid');
  const dayLabels=DAYS.map(d=>`<div class="cal-day-label">${d}</div>`).join('');
  const first=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  let cells=`${dayLabels}${'<div class="cal-day empty"></div>'.repeat(first)}`;
  for(let d=1;d<=daysInMonth;d++){
    const date=new Date(calYear,calMonth,d);
    const dateStr=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isPast=date<new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const dayOfWeek=date.getDay();
    const dayHours=hours[dayOfWeek];
    const isClosed=!dayHours||!dayHours.open;
    const isBlocked=blockedDates.includes(dateStr);
    const isToday=d===now.getDate()&&calMonth===now.getMonth()&&calYear===now.getFullYear();
    const isSelected=booking.date===dateStr;
    let cls='cal-day';
    if(isPast||isClosed||isBlocked)cls+=' unavailable past';
    else if(isSelected)cls+=' selected';
    else{cls+=' available';if(isToday)cls+=' today'}
    const clickable=!isPast&&!isClosed&&!isBlocked;
    cells+=`<div class="${cls}" ${clickable?`onclick="selectDate('${dateStr}')"`:''}>${d}</div>`;
  }
  g.innerHTML=cells;
}
function changeMonth(dir){
  calMonth+=dir;
  if(calMonth>11){calMonth=0;calYear++}
  if(calMonth<0){calMonth=11;calYear--}
  renderCalendar();
}
function selectDate(d){
  booking.date=d;booking.time=null;
  document.getElementById('btn-step2-next').disabled=false;
  renderCalendar();
}

// Slots
function renderSlots(){
  const g=document.getElementById('slots-grid');
  if(!booking.date||!booking.service){g.innerHTML='<div class="no-slots">Selecciona servicio y fecha primero</div>';return}
  const date=new Date(booking.date+'T00:00:00');
  const dh=hours[date.getDay()];
  if(!dh||!dh.open){g.innerHTML='<div class="no-slots">Este día está cerrado</div>';return}
  const dur=booking.service.duration;
  const slots=generateSlots(dh.from,dh.to,dur);
  const booked=appointments.filter(a=>a.date===booking.date&&a.status!=='cancelled').map(a=>a.time);
  if(!slots.length){g.innerHTML='<div class="no-slots">No hay horarios disponibles</div>';return}
  g.innerHTML=slots.map(s=>{
    const isBooked=isSlotBooked(s,dur,booked,slots);
    const isSel=booking.time===s;
    return`<div class="slot ${isBooked?'booked':isSel?'selected':''}" ${!isBooked?`onclick="selectSlot('${s}')"`:''}>${s}</div>`;
  }).join('');
}
function generateSlots(from,to,dur){
  const slots=[];let[fh,fm]=from.split(':').map(Number);const[th,tm]=to.split(':').map(Number);
  let cur=fh*60+fm;const end=th*60+tm;
  while(cur+dur<=end){slots.push(`${String(Math.floor(cur/60)).padStart(2,'0')}:${String(cur%60).padStart(2,'0')}`);cur+=dur}
  return slots;
}
function isSlotBooked(slot,dur,bookedTimes){
  const[sh,sm]=slot.split(':').map(Number);const sStart=sh*60+sm;const sEnd=sStart+dur;
  return bookedTimes.some(bt=>{
    const[bh,bm]=bt.split(':').map(Number);const bStart=bh*60+bm;
    const bSvc=appointments.find(a=>a.time===bt&&a.date===booking.date&&a.status!=='cancelled');
    const bDur=bSvc?bSvc.duration||30:30;const bEnd=bStart+bDur;
    return sStart<bEnd&&sEnd>bStart;
  });
}
function selectSlot(t){
  booking.time=t;
  document.getElementById('btn-step3-next').disabled=false;
  renderSlots();
}

// Summary
function renderSummary(){
  const s=booking.service;
  const dateObj=new Date(booking.date+'T00:00:00');
  const dateStr=`${DAYS[dateObj.getDay()]}, ${dateObj.getDate()} de ${MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  document.getElementById('booking-summary').innerHTML=`
    <div class="summary-item"><span class="summary-label">Servicio</span><span class="summary-value">${s.name}</span></div>
    <div class="summary-item"><span class="summary-label">Duración</span><span class="summary-value">${s.duration} min</span></div>
    <div class="summary-item"><span class="summary-label">Fecha</span><span class="summary-value">${dateStr}</span></div>
    <div class="summary-item"><span class="summary-label">Hora</span><span class="summary-value">${booking.time}</span></div>
    <div class="summary-item"><span class="summary-label">Total</span><span class="summary-value summary-total">$${Number(s.price).toLocaleString('es-CO')}</span></div>`;
}

function confirmBooking(){
  const name=document.getElementById('client-name').value.trim();
  const phone=document.getElementById('client-phone').value.trim();
  if(!name){toast('Ingresa tu nombre','error');return}
  if(!phone){toast('Ingresa tu teléfono','error');return}
  const appt={id:Date.now(),name,phone,service:booking.service.name,price:booking.service.price,duration:booking.service.duration,date:booking.date,time:booking.time,status:'pending',createdAt:new Date().toISOString()};
  appointments.push(appt);save('js_appointments',appointments);
  [1,2,3,4].forEach(i=>{document.getElementById(`step${i}`).classList.add('hidden');document.getElementById(`step${i}-item`).classList.remove('active','done')});
  document.getElementById('step-success').classList.remove('hidden');
  const dateObj=new Date(booking.date+'T00:00:00');
  document.getElementById('success-msg').textContent=`¡Hola ${name}! Tu cita de "${booking.service.name}" está agendada para el ${dateObj.getDate()} de ${MONTHS[dateObj.getMonth()]} a las ${booking.time}. Te esperamos 💈`;
}

function resetBooking(){
  booking={service:null,date:null,time:null};
  document.getElementById('client-name').value='';
  document.getElementById('client-phone').value='';
  document.getElementById('btn-step1-next').disabled=true;
  document.getElementById('btn-step2-next').disabled=true;
  document.getElementById('btn-step3-next').disabled=true;
  document.getElementById('step-success').classList.add('hidden');
  goStep(1);renderClientServices();
}

// ═══════════════════ ADMIN ═══════════════════
function adminNav(sec){
  document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.admin-sidebar nav a').forEach(a=>a.classList.remove('active'));
  document.getElementById(`admin-${sec}`).classList.add('active');
  document.getElementById(`nav-${sec}`).classList.add('active');
  if(sec==='dashboard')renderAdminDashboard();
  if(sec==='appointments')renderAppointments();
  if(sec==='services')renderServicesAdmin();
  if(sec==='hours')renderHoursAdmin();
  if(sec==='password'){document.getElementById('pass-current').value='';document.getElementById('pass-new').value='';document.getElementById('pass-confirm').value='';}
}

function renderAdminDashboard(){
  const today=new Date().toISOString().slice(0,10);
  const todayAppts=appointments.filter(a=>a.date===today&&a.status!=='cancelled');
  const pending=appointments.filter(a=>a.status==='pending').length;
  const totalRevenue=appointments.filter(a=>a.status==='confirmed').reduce((s,a)=>s+Number(a.price),0);
  document.getElementById('dashboard-cards').innerHTML=`
    <div class="stat-card"><div class="stat-card-num">${todayAppts.length}</div><div class="stat-card-label">Citas hoy</div></div>
    <div class="stat-card"><div class="stat-card-num">${pending}</div><div class="stat-card-label">Pendientes</div></div>
    <div class="stat-card"><div class="stat-card-num">${appointments.length}</div><div class="stat-card-label">Total citas</div></div>
    <div class="stat-card"><div class="stat-card-num">$${Math.round(totalRevenue/1000)}k</div><div class="stat-card-label">Ingresos confirmados</div></div>`;
  const upcoming=appointments.filter(a=>a.date>=today&&a.status!=='cancelled').sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).slice(0,8);
  document.getElementById('dashboard-table').innerHTML=upcoming.length?upcoming.map(a=>apptRow(a,true)).join(''):'<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:2rem">No hay citas próximas</td></tr>';
}

function renderAppointments(){
  const sf=document.getElementById('filter-status').value;
  const df=document.getElementById('filter-date').value;
  let filtered=appointments.filter(a=>{
    if(sf&&a.status!==sf)return false;
    if(df&&a.date!==df)return false;
    return true;
  }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  document.getElementById('appointments-table').innerHTML=filtered.length?filtered.map(a=>apptRow(a,false)).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:2rem">No se encontraron citas</td></tr>';
}

function apptRow(a,short){
  const badge=a.status==='pending'?'badge-pending':a.status==='confirmed'?'badge-confirmed':'badge-cancelled';
  const label=a.status==='pending'?'Pendiente':a.status==='confirmed'?'Confirmada':'Cancelada';
  const dateObj=new Date(a.date+'T00:00:00');
  const dateStr=`${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()}`;
  const actions=`
    ${a.status==='pending'?`<button class="btn btn-sm" style="background:var(--green);color:#000;border:none;cursor:pointer;margin-right:.25rem" onclick="updateStatus(${a.id},'confirmed')">✓</button>`:''}
    ${a.status!=='cancelled'?`<button class="btn-danger btn" onclick="updateStatus(${a.id},'cancelled')">✗</button>`:''}
    <button class="btn btn-danger btn" onclick="deleteAppt(${a.id})" title="Eliminar">🗑</button>`;
  if(short)return`<tr><td>${a.name}</td><td>${a.phone}</td><td>${a.service}</td><td>${dateStr}</td><td>${a.time}</td><td><span class="badge ${badge}">${label}</span></td><td style="white-space:nowrap">${actions}</td></tr>`;
  return`<tr><td>${a.name}</td><td>${a.phone}</td><td>${a.service}</td><td>$${Number(a.price).toLocaleString('es-CO')}</td><td>${dateStr}</td><td>${a.time}</td><td><span class="badge ${badge}">${label}</span></td><td style="white-space:nowrap">${actions}</td></tr>`;
}

function updateStatus(id,status){
  const a=appointments.find(a=>a.id===id);
  if(a){a.status=status;save('js_appointments',appointments);const sec=document.getElementById('admin-appointments').classList.contains('active')?'appointments':'dashboard';if(sec==='dashboard')renderAdminDashboard();else renderAppointments();toast(status==='confirmed'?'Cita confirmada':'Cita cancelada',status==='confirmed'?'success':'error')}
}
function deleteAppt(id){
  if(!confirm('¿Eliminar esta cita?'))return;
  appointments=appointments.filter(a=>a.id!==id);save('js_appointments',appointments);
  if(document.getElementById('admin-appointments').classList.contains('active'))renderAppointments();else renderAdminDashboard();
  toast('Cita eliminada');
}

// Services admin
function renderServicesAdmin(){
  document.getElementById('services-admin-grid').innerHTML=services.map(s=>`
    <div class="service-row">
      <div style="font-weight:500">${s.name} <span style="font-size:.75rem;color:var(--muted);font-weight:300">${s.desc||''}</span></div>
      <div>$${Number(s.price).toLocaleString('es-CO')}</div>
      <div style="color:var(--muted)">${s.duration} min</div>
      <button class="btn btn-danger btn-sm" onclick="deleteService(${s.id})">Eliminar</button>
    </div>`).join('')||'<p style="color:var(--muted);padding:1rem">No hay servicios. Agrega uno abajo.</p>';
}
function addService(){
  const name=document.getElementById('svc-name').value.trim();
  const price=Number(document.getElementById('svc-price').value);
  const duration=Number(document.getElementById('svc-duration').value);
  const desc=document.getElementById('svc-desc').value.trim();
  if(!name||!price||!duration){toast('Completa nombre, precio y duración','error');return}
  services.push({id:Date.now(),name,price,duration,desc});
  save('js_services',services);
  ['svc-name','svc-price','svc-duration','svc-desc'].forEach(id=>document.getElementById(id).value='');
  renderServicesAdmin();renderClientServices();toast('Servicio agregado','success');
}
function deleteService(id){
  if(!confirm('¿Eliminar este servicio?'))return;
  services=services.filter(s=>s.id!==id);save('js_services',services);
  renderServicesAdmin();renderClientServices();toast('Servicio eliminado');
}

// Hours admin
function renderHoursAdmin(){
  const g=document.getElementById('hours-grid');
  g.innerHTML=Object.entries(hours).map(([day,h])=>`
    <div class="hours-row">
      <span class="day-label">${['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][day]}</span>
      <div class="hours-inputs">
        <label class="day-closed"><input type="checkbox" id="h-open-${day}" ${h.open?'checked':''} onchange="toggleDay(${day})"> Abierto</label>
        <div id="h-times-${day}" style="display:flex;gap:.5rem;align-items:center;${!h.open?'opacity:.3;pointer-events:none':''}">
          <input type="time" id="h-from-${day}" value="${h.from}" style="width:130px"/>
          <span style="color:var(--muted);font-size:.8rem">a</span>
          <input type="time" id="h-to-${day}" value="${h.to}" style="width:130px"/>
        </div>
      </div>
    </div>`).join('');
  renderBlockedDates();
}
function toggleDay(day){
  const open=document.getElementById(`h-open-${day}`).checked;
  const times=document.getElementById(`h-times-${day}`);
  times.style.opacity=open?'1':'0.3';
  times.style.pointerEvents=open?'auto':'none';
}
function saveHours(){
  [0,1,2,3,4,5,6].forEach(d=>{
    hours[d]={open:document.getElementById(`h-open-${d}`).checked,from:document.getElementById(`h-from-${d}`).value,to:document.getElementById(`h-to-${d}`).value};
  });
  save('js_hours',hours);toast('Horarios guardados','success');
}
function blockDate(){
  const d=document.getElementById('block-date').value;
  if(!d){toast('Selecciona una fecha','error');return}
  if(!blockedDates.includes(d)){blockedDates.push(d);save('js_blocked',blockedDates);renderBlockedDates();toast('Fecha bloqueada','success')}
  else toast('Esa fecha ya está bloqueada','error');
}
function unblockDate(d){
  blockedDates=blockedDates.filter(x=>x!==d);save('js_blocked',blockedDates);renderBlockedDates();toast('Fecha desbloqueada');
}
function renderBlockedDates(){
  const c=document.getElementById('blocked-dates-list');
  if(!c)return;
  c.innerHTML=blockedDates.sort().map(d=>{
    const obj=new Date(d+'T00:00:00');
    return`<div style="display:flex;align-items:center;gap:.5rem;background:var(--bg3);border:1px solid var(--border);border-radius:2px;padding:.4rem .8rem;font-size:.75rem">
      ${obj.getDate()}/${obj.getMonth()+1}/${obj.getFullYear()}
      <button onclick="unblockDate('${d}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.9rem;line-height:1">×</button>
    </div>`;
  }).join('')||'<p style="font-size:.75rem;color:var(--muted)">No hay fechas bloqueadas</p>';
}

// ═══════════════════ INIT ═══════════════════
renderClientServices();
const now=new Date();calYear=now.getFullYear();calMonth=now.getMonth();
