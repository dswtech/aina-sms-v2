(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const uid = prefix => `${prefix}-${Math.floor(1000 + Math.random() * 8999)}`;

  const menus = {
    Sales: ['Beranda','Buku Pelanggan Saya','Transaksi','Notifikasi','Profil'],
    Supervisor: ['Beranda','Pelanggan Tim','Transaksi','Target','Analisis','Import Data','Notifikasi','Profil'],
    'Branch Manager': ['Beranda','Kinerja Tim','Analisis','Notifikasi','Profil'],
    Admin: ['Beranda','Pelanggan','Transaksi','Pengguna & Undangan','Tim & Penempatan','Analisis','Import Data','Pengaturan Dealer','Notifikasi','Profil']
  };
  const mobilePrimary = {
    Sales: ['Beranda','Buku Pelanggan Saya','Transaksi'],
    Supervisor: ['Beranda','Pelanggan Tim','Transaksi'],
    'Branch Manager': ['Beranda','Kinerja Tim','Analisis'],
    Admin: ['Beranda','Pengguna & Undangan','Tim & Penempatan']
  };
  const people = {
    Sales: ['Rina Pratama','Sales · Tim Anggrek','RP'],
    Supervisor: ['Dian Kurnia','Supervisor · Tim Anggrek','DK'],
    'Branch Manager': ['Arief Nugroho','Branch Manager · Cabang Utama','AN'],
    Admin: ['Nadia Putri','Admin dealer','NP']
  };
  const routeByLabel = {
    Beranda:'/dashboard','Buku Pelanggan Saya':'/customers','Pelanggan Tim':'/customers',Pelanggan:'/customers',Transaksi:'/transactions',Target:'/targets',Analisis:'/analysis/source','Import Data':'/imports','Pengguna & Undangan':'/admin/users','Tim & Penempatan':'/admin/teams','Pengaturan Dealer':'/admin/dealer','Kinerja Tim':'/performance',Notifikasi:'/notifications',Profil:'/profile'
  };
  const labelByRoute = {
    '/dashboard':'Beranda','/customers':'Pelanggan','/transactions':'Transaksi','/targets':'Target','/analysis/source':'Analisis','/analysis/models':'Analisis','/imports':'Import Data','/admin/users':'Pengguna & Undangan','/admin/teams':'Tim & Penempatan','/admin/dealer':'Pengaturan Dealer','/performance':'Kinerja Tim','/notifications':'Notifikasi','/profile':'Profil'
  };
  const icons = {
    home:'<path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3Z"/>',people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 11a3 3 0 1 0 0-6M22 21v-2a4 4 0 0 0-3-3.87"/>',list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',chart:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',user:'<path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 1-.1 1l2 1.6-2 3.4-2.5-1a8 8 0 0 1-1.7 1l-.4 2.7h-4l-.4-2.7a8 8 0 0 1-1.7-1l-2.5 1-2-3.4 2-1.6a7 7 0 0 1 0-2l-2-1.6 2-3.4 2.5 1a8 8 0 0 1 1.7-1l.4-2.7h4l.4 2.7a8 8 0 0 1 1.7 1l2.5-1 2 3.4-2 1.6a7 7 0 0 1 .1 1Z"/>'
  };
  const icon = name => `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${icons[name] || icons.list}</svg>`;
  const iconFor = label => label === 'Beranda' ? 'home' : /Pelanggan|Pengguna|Tim|Kinerja/.test(label) ? 'people' : /Analisis|Target/.test(label) ? 'chart' : label === 'Notifikasi' ? 'bell' : label === 'Profil' ? 'user' : /Pengaturan/.test(label) ? 'settings' : 'list';

  const store = {
    customers: [
      {id:'CUS-1042',name:'Budi Santoso',phone:'0812••••1842',model:'Model A',owner:'Rina Pratama',team:'Tim Anggrek',last:'Kemarin, 17.42',next:'Konfirmasi test drive',due:'Terlambat 2 jam',state:'late',preference:'WhatsApp · diizinkan'},
      {id:'CUS-1038',name:'Sari Wijaya',phone:'0813••••2097',model:'Model B',owner:'Rina Pratama',team:'Tim Anggrek',last:'2 hari lalu',next:'Kirim simulasi',due:'Hari ini, 13.30',state:'today',preference:'Telepon · diizinkan'},
      {id:'CUS-1021',name:'Andi Permana',phone:'0815••••7731',model:'Model C',owner:'Rina Pratama',team:'Tim Anggrek',last:'4 hari lalu',next:'Telepon kembali',due:'Hari ini, 16.00',state:'today',preference:'WhatsApp · diizinkan'},
      {id:'CUS-1014',name:'Maya Lestari',phone:'0817••••5118',model:'Model A',owner:'Rina Pratama',team:'Tim Anggrek',last:'25 menit lalu',next:'Follow-up showroom',due:'Besok, 10.00',state:'scheduled',preference:'WhatsApp · diizinkan'},
      {id:'CUS-1008',name:'Dedi Hartono',phone:'0819••••6610',model:'Model B',owner:'Bayu Putra',team:'Tim Anggrek',last:'Hari ini, 08.10',next:'Kirim penawaran',due:'Besok, 14.00',state:'scheduled',preference:'Email · diizinkan'},
      {id:'CUS-1002',name:'Lina Kusuma',phone:'0821••••3314',model:'Model C',owner:'Nisa Rahma',team:'Tim Melati',last:'Kemarin, 12.00',next:'Konfirmasi dokumen',due:'Lusa, 09.00',state:'scheduled',preference:'Telepon · diizinkan'}
    ],
    transactions: [
      {id:'TRX-1024',customerId:'CUS-1042',model:'Model A',stage:'Hot Prospect',owner:'Rina Pratama',team:'Tim Anggrek',source:'Referral',next:'Konfirmasi test drive',due:'Terlambat 2 jam',state:'late',last:'Kemarin, 17.42'},
      {id:'TRX-1021',customerId:'CUS-1038',model:'Model B',stage:'Prospect',owner:'Rina Pratama',team:'Tim Anggrek',source:'Walk-in',next:'Kirim simulasi',due:'Hari ini, 13.30',state:'today',last:'2 hari lalu'},
      {id:'TRX-1018',customerId:'CUS-1021',model:'Model C',stage:'Lead',owner:'Rina Pratama',team:'Tim Anggrek',source:'Media sosial',next:'Telepon kembali',due:'Hari ini, 16.00',state:'today',last:'4 hari lalu'},
      {id:'TRX-1015',customerId:'CUS-1014',model:'Model A',stage:'Prospect',owner:'Rina Pratama',team:'Tim Anggrek',source:'Pameran',next:'Follow-up showroom',due:'Besok, 10.00',state:'scheduled',last:'25 menit lalu'},
      {id:'TRX-1012',customerId:'CUS-1008',model:'Model B',stage:'SPK',owner:'Bayu Putra',team:'Tim Anggrek',source:'Referral',next:'Konfirmasi pembayaran',due:'Besok, 14.00',state:'scheduled',last:'Hari ini, 08.10'},
      {id:'TRX-1009',customerId:'CUS-1002',model:'Model C',stage:'DO',owner:'Nisa Rahma',team:'Tim Melati',source:'Walk-in',next:'Jadwalkan delivery',due:'Lusa, 09.00',state:'scheduled',last:'Kemarin, 12.00'},
      {id:'TRX-1006',customerId:'CUS-1008',model:'Model A',stage:'Delivery',owner:'Bayu Putra',team:'Tim Anggrek',source:'Referral',next:'Minta umpan balik',due:'Minggu depan',state:'scheduled',last:'27 Oktober'},
      {id:'TRX-1003',customerId:'CUS-1002',model:'Model B',stage:'Lost',owner:'Nisa Rahma',team:'Tim Melati',source:'Pameran',next:'Tidak ada',due:'Selesai',state:'closed',last:'24 Oktober'}
    ],
    teams: [
      {id:'TEAM-01',name:'Tim Anggrek',supervisor:'Dian Kurnia',target:32},
      {id:'TEAM-02',name:'Tim Melati',supervisor:'Sinta Mahari',target:32},
      {id:'TEAM-03',name:'Tim Mawar',supervisor:'Belum ditempatkan',target:32}
    ],
    users: [
      {id:'USR-01',name:'Rina Pratama',email:'rina@example.test',role:'Sales',team:'Tim Anggrek',status:'Aktif'},
      {id:'USR-02',name:'Bayu Putra',email:'bayu@example.test',role:'Sales',team:'Tim Anggrek',status:'Aktif'},
      {id:'USR-03',name:'Nisa Rahma',email:'nisa@example.test',role:'Sales',team:'Tim Melati',status:'Aktif'},
      {id:'USR-04',name:'Dian Kurnia',email:'dian@example.test',role:'Supervisor',team:'Tim Anggrek',status:'Aktif'},
      {id:'USR-05',name:'Sinta Mahari',email:'sinta@example.test',role:'Supervisor',team:'Tim Melati',status:'Aktif'},
      {id:'USR-06',name:'Fajar Aditya',email:'fajar@example.test',role:'Sales',team:'Tim Mawar',status:'Undangan tertunda'}
    ],
    targets: [
      {owner:'Tim Anggrek',kind:'Tim',target:32,realized:1},{owner:'Rina Pratama',kind:'Sales',target:10,realized:0},{owner:'Bayu Putra',kind:'Sales',target:10,realized:1},{owner:'Nisa Rahma',kind:'Sales',target:10,realized:0}
    ],
    notifications: [
      {id:'NOT-01',title:'Follow-up Budi terlambat',meta:'Transaksi TRX-1024 · 2 jam',source:'TRX-1024',read:false},
      {id:'NOT-02',title:'Arahan Supervisor baru',meta:'Transaksi TRX-1021 · Kemarin',source:'TRX-1021',read:false},
      {id:'NOT-03',title:'Target Oktober diperbarui',meta:'Tim Anggrek · 2 hari lalu',source:'/targets',read:true},
      {id:'NOT-04',title:'Import pelanggan selesai',meta:'124 berhasil, 2 perlu koreksi',source:'/imports',read:true}
    ],
    imports: [{id:'IMP-019',scope:'Dealer',file:'pelanggan-oktober.csv',success:124,failed:2,status:'Selesai sebagian'}],
    dealer: {name:'Dealer Contoh Utama',timezone:'Asia/Jakarta',phone:'021-555-0100'},
    profile: {name:'Rina Pratama',email:'rina@example.test'}
  };

  const state = {role:'Sales',page:'Beranda',path:'/dashboard',mode:'normal',query:'',filter:'all',detail:null,detailTab:'summary',detailTabsById:{},lastFocus:null,moreTrigger:null,savedScroll:0,returnHash:null,importPreview:false};
  const activeStages = ['Lead','Prospect','Hot Prospect','SPK','DO'];
  const weights = {Lead:.1,Prospect:.25,'Hot Prospect':.5,SPK:.8,DO:.9,Delivery:1,Lost:0};
  const customerFor = tx => store.customers.find(customer => customer.id === tx.customerId);
  const nameFor = tx => customerFor(tx)?.name || 'Pelanggan';
  const scopeTransactions = role => role === 'Sales' ? store.transactions.filter(tx => tx.owner === 'Rina Pratama') : role === 'Supervisor' ? store.transactions.filter(tx => tx.team === 'Tim Anggrek') : role === 'Branch Manager' || role === 'Admin' ? store.transactions : [];
  const scopeCustomers = role => role === 'Sales' ? store.customers.filter(customer => customer.owner === 'Rina Pratama') : role === 'Supervisor' ? store.customers.filter(customer => customer.team === 'Tim Anggrek') : role === 'Admin' ? store.customers : [];
  const metric = (label,value,note='') => `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`;
  const pageHead = (title,copy,action='') => `<div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(copy)}</p></div>${action}</div>`;
  const statusClass = stateName => stateName === 'late' ? 'late' : stateName === 'scheduled' ? 'ok' : '';
  const bar = (label,value,max) => `<div class="bar-row"><span>${esc(label)}</span><span class="track"><span class="fill" style="width:${max ? Math.round(value/max*100) : 0}%"></span></span><strong class="num">${value}</strong></div>`;
  const button = (label,action,kind='secondary',extra='') => `<button class="${kind}" data-action="${action}" ${extra}>${esc(label)}</button>`;

  function showToast(message){const toast=$('#toast');toast.textContent=message;toast.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.hidden=true,3000)}
  function hash(path){return `#${path}`}
  function setHash(path,replace=false){const next=hash(path);if(location.hash===next){handleRoute();return}replace?history.replaceState(null,'',next):location.hash=next}
  function currentMenuLabel(path){const generic=labelByRoute[path] || 'Beranda';if(generic==='Pelanggan')return state.role==='Sales'?'Buku Pelanggan Saya':state.role==='Supervisor'?'Pelanggan Tim':'Pelanggan';return generic}
  function isAllowed(label){return menus[state.role].includes(label) || label==='Beranda'}
  function showApp(){
    $('#appShell').hidden=false;$('#mobileNav').style.display='';$('#authStage').classList.remove('active');
    $('#surfaceSelect').value='app';$('#stateSelect').disabled=false;
  }
  function renderNav(){
    const menu=menus[state.role],primary=mobilePrimary[state.role];
    $('#desktopNav').innerHTML=menu.map(label=>`<button class="${label===state.page?'active':''}" data-nav="${esc(label)}">${icon(iconFor(label))}<span>${esc(label)}</span></button>`).join('');
    $('#mobileNav').innerHTML=primary.map(label=>`<button class="${label===state.page?'active':''}" data-nav="${esc(label)}">${icon(iconFor(label))}<span>${esc(label.replace('Buku Pelanggan Saya','Pelanggan').replace('Pelanggan Tim','Pelanggan').replace('Pengguna & Undangan','Pengguna').replace('Tim & Penempatan','Tim'))}</span></button>`).join('')+`<button data-more aria-haspopup="dialog" aria-expanded="false">${icon('more')}<span>Lainnya</span></button>`;
    $('#moreList').innerHTML=menu.filter(label=>!primary.includes(label)).map(label=>`<button data-nav="${esc(label)}">${icon(iconFor(label))}<span>${esc(label)}</span></button>`).join('');
  }
  function render(){
    const person=people[state.role];$('#sideName').textContent=person[0];$('#sideMeta').textContent=person[1];$('#topAvatar').textContent=person[2];$('#crumb').textContent=state.page;renderNav();renderPage();
  }
  function navigate(label){if(!isAllowed(label)){state.mode='denied';renderPage();return}state.query='';state.filter='all';closeMore(false);setHash(routeByLabel[label] || '/dashboard')}

  function stateBefore(){
    if(state.mode==='loading')return pageHead(state.page,'Data contoh · sedang dimuat')+`<div class="skeleton sk-title">Loading</div><div class="skeleton sk-line">Loading</div><div class="skeleton sk-panel">Loading</div>`;
    if(state.mode==='empty')return pageHead(state.page,'Data contoh · belum ada data')+`<section class="state-box"><h2>Belum ada data</h2><p>Gunakan aksi utama halaman untuk membuat data pertama.</p></section>`;
    if(state.mode==='denied')return pageHead('Akses ditolak','Role ini tidak mempunyai izin untuk membuka halaman tersebut.')+`<section class="state-box"><h2>Halaman tidak tersedia</h2><p>Kembali ke beranda; sistem produksi wajib menegakkan aturan yang sama di server.</p><button class="primary" data-nav="Beranda" style="margin-top:16px">Kembali ke beranda</button></section>`;
    return '';
  }
  function stateNotice(){
    if(state.mode==='error')return `<div class="notice error" role="alert"><span><strong>Bagian ini gagal dimuat.</strong><br>Data terakhir yang baik tersedia pukul 09.14.</span><button data-action="retry">Coba lagi</button></div>`;
    if(state.mode==='stale')return `<div class="notice"><span><strong>Data mungkin tidak terbaru.</strong><br>Terakhir diperbarui 23 menit lalu.</span><button data-action="retry">Muat ulang</button></div>`;
    if(state.mode==='offline')return `<div class="notice offline" role="status"><span><strong>Anda sedang offline.</strong><br>Perubahan tidak disimpan secara lokal.</span></div>`;
    return '';
  }

  function salesHome(){
    const txs=scopeTransactions('Sales'),active=txs.filter(tx=>activeStages.includes(tx.stage));
    const lane=(title,items,now=false)=>`<div class="lane ${now?'now':''}"><div class="lane-head"><h2>${title}</h2><span class="count">${items.length}</span></div>${items.length?items.map(tx=>`<button class="task" data-open-tx="${tx.id}"><div class="task-foot"><strong>${esc(nameFor(tx))}</strong><span class="time">${esc(tx.due.match(/\d{1,2}\.\d{2}/)?.[0]||'—')}</span></div><p>${esc(tx.next)} untuk ${esc(tx.model)}.</p><div class="task-foot"><span class="status ${statusClass(tx.state)}">${esc(tx.due)}</span><span>${esc(tx.stage)}</span></div></button>`).join(''):'<div class="empty-row">Belum ada antrean.</div>'}</div>`;
    const target=store.targets.find(item=>item.owner==='Rina Pratama')?.target||10,realized=txs.filter(tx=>tx.stage==='Delivery').length,forecast=txs.reduce((sum,tx)=>sum+(weights[tx.stage]||0),0);
    return pageHead('Mulai dari yang paling dekat','Tiga kelompok tindakan diurutkan menurut waktu follow-up.',button('Catat aktivitas','activity','primary'))+`<section class="queue" aria-label="Antrean tindak lanjut">${lane('Sekarang',active.filter(tx=>tx.state==='late'),true)}${lane('Hari ini',active.filter(tx=>tx.state==='today'))}${lane('Nanti',active.filter(tx=>!['late','today'].includes(tx.state)))}</section><div class="grid-2" style="margin-top:18px"><section class="panel"><header class="panel-head"><h2>Arah bulan ini</h2><span class="status">${Math.round(realized/target*100)}% target</span></header><div class="metrics" style="margin:0;border:0;border-radius:0">${metric('Target',target,'unit')}${metric('Realisasi',realized,'unit')}${metric('Forecast',forecast.toFixed(1).replace('.',','),'perkiraan')}${metric('Gap',Math.max(0,target-forecast).toFixed(1).replace('.',','),'ke target')}</div></section><section class="panel"><header class="panel-head"><h2>Aksi cepat</h2></header><div class="panel-body action-row">${button('Cari pelanggan','go-customers')}${button('Pelanggan baru','new-customer','text-btn')}</div></section></div>`;
  }
  function roleHome(){
    if(state.role==='Supervisor'){
      const txs=scopeTransactions('Supervisor'),active=txs.filter(tx=>activeStages.includes(tx.stage)),realized=txs.filter(tx=>tx.stage==='Delivery').length,target=store.targets.find(item=>item.owner==='Tim Anggrek')?.target||32;
      const sales=store.users.filter(user=>user.role==='Sales'&&user.team==='Tim Anggrek');
      return pageHead('Beranda tim','Tindak lanjut tim dan transaksi yang perlu coaching.',button('Atur target','edit-target','primary'))+`<section class="metrics">${metric('Target tim',`${target} unit`,'Oktober')}${metric('Realisasi',`${realized} unit`,`${Math.round(realized/target*100)}% target`)}${metric('Pipeline aktif',active.length,'Data contoh')}${metric('Follow-up terlambat',active.filter(tx=>tx.state==='late').length,'perlu tindakan')}</section><div class="grid-2"><section class="panel"><header class="panel-head"><h2>Kinerja Sales</h2>${button('Lihat analisis','go-analysis','text-btn')}</header>${sales.map(user=>{const owned=txs.filter(tx=>tx.owner===user.name);return `<div class="team-row"><strong>${esc(user.name)} · ${owned.filter(tx=>tx.stage==='Delivery').length} realisasi · ${owned.filter(tx=>activeStages.includes(tx.stage)).length} aktif</strong><button class="text-btn" data-action="sales-detail" data-id="${user.id}">Buka</button></div>`}).join('')}</section><section class="panel"><header class="panel-head"><h2>Perlu perhatian</h2></header><div class="attention"><div class="attention-item"><strong>${active.filter(tx=>tx.state==='late').length} follow-up terlambat</strong><span>Prioritaskan sebelum pukul 12.00.</span></div><div class="attention-item"><strong>${store.notifications.filter(item=>!item.read).length} notifikasi belum dibaca</strong><span>Buka transaksi terkait.</span></div></div></section></div>`;
    }
    if(state.role==='Branch Manager'){
      const totalTarget=store.teams.reduce((sum,team)=>sum+team.target,0),realized=store.transactions.filter(tx=>tx.stage==='Delivery').length,forecast=store.transactions.reduce((sum,tx)=>sum+(weights[tx.stage]||0),0);
      return pageHead('Kinerja cabang','Agregat lintas tim tanpa kontak pelanggan atau isi coaching.')+`<section class="metrics">${metric('Target cabang',`${totalTarget} unit`,'Oktober')}${metric('Realisasi',`${realized} unit`,`${Math.round(realized/totalTarget*100)}% target`)}${metric('Forecast',`${forecast.toFixed(1).replace('.',',')} unit`,'perkiraan')}${metric('Tim berisiko',store.teams.filter(team=>team.name==='Tim Mawar').length+' dari '+store.teams.length,'Data contoh')}</section>${teamPerformance(true)}`;
    }
    const pending=store.users.filter(user=>user.status==='Undangan tertunda').length,missing=store.teams.filter(team=>team.supervisor==='Belum ditempatkan').length,last=store.imports.at(-1);
    return pageHead('Dukungan operasional','Akun, undangan, tim, dan import yang memerlukan tindakan.',button('Kelola pengguna','go-users','primary'))+`<section class="metrics">${metric('Pengguna aktif',store.users.filter(user=>user.status==='Aktif').length,'4 role')}${metric('Undangan tertunda',pending,'perlu tindak lanjut')}${metric('Tim tanpa Supervisor',missing,'perlu penempatan')}${metric('Import terakhir',`${last.success} baris`,`${last.failed} gagal`)}</section><div class="grid-2"><section class="panel"><header class="panel-head"><h2>Tugas Admin</h2></header><div class="attention"><button class="row-button attention-item" data-action="go-users"><strong>Kirim ulang ${pending} undangan</strong><span>Belum diaktivasi.</span></button><button class="row-button attention-item" data-action="go-teams"><strong>Tempatkan Supervisor Tim Mawar</strong><span>Tim belum mempunyai penanggung jawab aktif.</span></button></div></section><section class="panel"><header class="panel-head"><h2>Status sistem</h2></header><div class="attention"><button class="row-button attention-item" data-action="go-import"><strong>Import selesai sebagian</strong><span>${last.success} berhasil, ${last.failed} perlu koreksi.</span></button><div class="attention-item"><strong>Email antrean normal</strong><span>Data contoh · tanpa isi coaching.</span></div></div></section></div>`;
  }
  function customerPage(){
    const label=currentMenuLabel('/customers'),audit=state.role==='Admin',all=scopeCustomers(state.role),filtered=all.filter(customer=>(state.filter==='all'||customer.state===state.filter)&&`${customer.name} ${customer.model}`.toLowerCase().includes(state.query.toLowerCase()));
    const rows=filtered.map(customer=>`<tr data-customer="${customer.id}" tabindex="0"><td><strong>${esc(customer.name)}</strong><span>${customer.id}</span></td><td>${esc(customer.model)}</td><td>${esc(customer.owner)}</td><td><strong>${esc(customer.next)}</strong><span>${esc(customer.due)}</span></td><td>${esc(customer.last)}</td></tr>`).join('');
    const cards=filtered.map(customer=>`<button class="mobile-card" data-customer="${customer.id}"><span class="mobile-card-top"><strong>${esc(customer.name)}</strong><span class="status ${statusClass(customer.state)}">${esc(customer.model)}</span></span><span class="mobile-card-bottom"><span>${esc(customer.owner)}</span><span>${esc(customer.due)}</span></span><span class="mobile-card-bottom">${esc(customer.next)}</span></button>`).join('');
    return pageHead(label,'Cari pelanggan, lihat kontak terakhir, lalu lanjutkan tindakan berikutnya.',audit?'':button('Tambah pelanggan','new-customer','primary'))+(audit?'<div class="audit-note">Mode audit Admin · data pelanggan hanya dapat dibaca.</div>':'')+`<div class="toolbar"><div class="tools-left"><label class="search">${icon('search')}<span class="sr-only">Cari pelanggan</span><input id="searchInput" type="search" placeholder="Cari nama atau model" value="${esc(state.query)}"></label><label><span class="sr-only">Filter follow-up</span><select class="filter" id="filterSelect"><option value="all">Semua follow-up</option><option value="today" ${state.filter==='today'?'selected':''}>Hari ini</option><option value="late" ${state.filter==='late'?'selected':''}>Terlambat</option><option value="scheduled" ${state.filter==='scheduled'?'selected':''}>Terjadwal</option></select></label></div><span class="result-count">${filtered.length} pelanggan · Data contoh</span></div><section class="table-wrap"><table class="data-table"><thead><tr><th>Pelanggan</th><th>Minat</th><th>Sales</th><th>Langkah berikutnya</th><th>Kontak terakhir</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty-row">Tidak ada pelanggan yang cocok.</td></tr>'}</tbody></table><div class="cards">${cards||'<div class="empty-row">Tidak ada pelanggan yang cocok.</div>'}</div></section>`;
  }
  function transactionPage(){
    const audit=state.role==='Admin',all=scopeTransactions(state.role),filtered=all.filter(tx=>(state.filter==='all'||tx.state===state.filter)&&`${nameFor(tx)} ${tx.id} ${tx.model}`.toLowerCase().includes(state.query.toLowerCase()));
    const rows=filtered.map(tx=>`<tr data-open-tx="${tx.id}" tabindex="0"><td><strong>${esc(nameFor(tx))}</strong><span>${tx.id}</span></td><td>${esc(tx.model)}</td><td><span class="status ${statusClass(tx.state)}">${esc(tx.stage)}</span></td><td><strong>${esc(tx.next)}</strong><span>${esc(tx.due)}</span></td><td>${esc(tx.owner)}</td></tr>`).join('');
    const cards=filtered.map(tx=>`<button class="mobile-card" data-open-tx="${tx.id}"><span class="mobile-card-top"><strong>${esc(nameFor(tx))}</strong><span class="status">${esc(tx.stage)}</span></span><span class="mobile-card-bottom"><span>${tx.id} · ${esc(tx.model)}</span><span>${esc(tx.owner)}</span></span><span class="mobile-card-bottom">${esc(tx.next)} · ${esc(tx.due)}</span></button>`).join('');
    return pageHead('Transaksi','Pipeline dengan tahap, pemilik, dan tindakan berikutnya.',audit?'':button('Transaksi baru','new-transaction','primary'))+(audit?'<div class="audit-note">Mode audit Admin · transaksi dan coaching hanya dapat dibaca.</div>':'')+`<div class="toolbar"><div class="tools-left"><label class="search">${icon('search')}<span class="sr-only">Cari transaksi</span><input id="searchInput" type="search" placeholder="Cari pelanggan atau ID" value="${esc(state.query)}"></label><select class="filter" id="filterSelect" aria-label="Filter transaksi"><option value="all">Semua tahap</option><option value="late" ${state.filter==='late'?'selected':''}>Perlu perhatian</option><option value="today" ${state.filter==='today'?'selected':''}>Hari ini</option><option value="scheduled" ${state.filter==='scheduled'?'selected':''}>Terjadwal</option></select></div><span class="result-count">${filtered.length} transaksi · Data contoh</span></div><section class="table-wrap"><table class="data-table"><thead><tr><th>Pelanggan</th><th>Model</th><th>Tahap</th><th>Langkah berikutnya</th><th>Sales</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty-row">Tidak ada transaksi yang cocok.</td></tr>'}</tbody></table><div class="cards">${cards||'<div class="empty-row">Tidak ada transaksi yang cocok.</div>'}</div></section>`;
  }
  function targetPage(){
    return pageHead('Target','Target tim dan Sales untuk periode Oktober 2026.',button('Ubah target','edit-target','primary'))+`<section class="panel"><header class="panel-head"><h2>Target Tim Anggrek</h2><span>Data contoh</span></header>${store.targets.filter(item=>item.owner==='Tim Anggrek'||store.users.some(user=>user.name===item.owner&&user.team==='Tim Anggrek')).map(item=>`<div class="team-row"><div><strong>${esc(item.owner)}</strong><span>${esc(item.kind)} · Realisasi ${item.realized}</span></div><div class="action-row"><strong>${item.target} unit</strong><button class="text-btn" data-action="edit-target" data-owner="${esc(item.owner)}">Ubah</button></div></div>`).join('')}</section>`;
  }
  function analysisPage(){
    const model=state.path==='/analysis/models',txs=scopeTransactions(state.role),key=model?'model':'source',counts={};txs.forEach(tx=>counts[tx[key]]=(counts[tx[key]]||0)+1);const max=Math.max(1,...Object.values(counts));
    const tabs=`<div class="analysis-tabs" role="tablist" aria-label="Jenis analisis"><button class="tab ${model?'':'active'}" role="tab" aria-selected="${!model}" tabindex="${model?-1:0}" data-analysis-route="/analysis/source">Sumber</button><button class="tab ${model?'active':''}" role="tab" aria-selected="${model}" tabindex="${model?0:-1}" data-analysis-route="/analysis/models">Model</button></div>`;
    const rows=txs.filter(tx=>activeStages.includes(tx.stage)).slice(0,5).map(tx=>`<button class="row-button team-row" data-analysis-tx="${tx.id}"><strong>${tx.id} · ${esc(state.role==='Branch Manager'?tx.team:nameFor(tx))} · ${esc(tx.stage)}</strong><span>${state.role==='Branch Manager'?'Buka detail tersanitasi':'Buka transaksi sumber'}</span></button>`).join('');
    return pageHead('Analisis','Bandingkan kontribusi dan buka sumber angka dengan cakupan sesuai role.')+tabs+`<div class="analysis-grid"><section class="panel" role="tabpanel"><header class="panel-head"><h2>Kontribusi berdasarkan ${model?'model':'sumber'}</h2><span>Oktober · Data contoh</span></header><div class="panel-body bar-list">${Object.entries(counts).map(([label,value])=>bar(label,value,max)).join('')||'<div class="empty-row">Belum ada data.</div>'}</div></section><section class="panel"><header class="panel-head"><h2>${state.role==='Branch Manager'?'Drilldown tersanitasi':'Transaksi sumber'}</h2></header>${rows||'<div class="empty-row">Belum ada transaksi aktif.</div>'}</section></div>`;
  }
  function importPage(){
    const allowed=state.role==='Supervisor'||state.role==='Admin';if(!allowed)return deniedPage();
    const preview=state.importPreview?`<section class="panel" style="margin-top:18px"><header class="panel-head"><h2>Preview pelanggan-contoh.csv</h2><span>3 baris · belum disimpan</span></header><div class="panel-body"><table class="import-preview"><thead><tr><th>Baris</th><th>Nama</th><th>Hasil</th></tr></thead><tbody><tr><td>2</td><td>Rahma Putri</td><td><span class="status ok">Valid</span></td></tr><tr><td>3</td><td>Joko Santoso</td><td><span class="status ok">Valid</span></td></tr><tr><td>4</td><td>—</td><td><span class="status late">Nama wajib diisi</span></td></tr></tbody></table><div class="form-actions"><button class="secondary" data-action="cancel-import">Batalkan</button><button class="primary" data-action="confirm-import">Import 2 baris valid</button></div></div></section>`:'';
    return pageHead('Import Data',state.role==='Admin'?'Import pelanggan untuk cakupan dealer.':'Import pelanggan untuk Tim Anggrek.',button('Pilih file contoh','load-import','primary'))+`<div class="audit-note">Prototype tidak mengunggah file nyata. Tombol memuat batch sintetis untuk menguji preview, validasi, dan import parsial.</div><section class="panel"><header class="panel-head"><h2>Riwayat import</h2><span>Data contoh</span></header>${store.imports.map(item=>`<div class="team-row"><div><strong>${esc(item.file)}</strong><span>${esc(item.scope)} · ${esc(item.status)}</span></div><span>${item.success} berhasil · ${item.failed} gagal</span></div>`).join('')}</section>${preview}`;
  }
  function usersPage(){
    return pageHead('Pengguna & Undangan','Kelola akun dan undangan tanpa pernah menampilkan password.',button('Undang pengguna','invite-user','primary'))+`<section class="panel"><header class="panel-head"><h2>${store.users.length} pengguna</h2><span>Data contoh</span></header>${store.users.map(user=>`<div class="user-row"><div><strong>${esc(user.name)}</strong><span>${esc(user.role)} · ${esc(user.team)} · ${esc(user.status)}</span></div><button class="secondary" data-action="manage-user" data-id="${user.id}">Kelola</button></div>`).join('')}</section>`;
  }
  function teamPerformance(compact=false){
    const content=store.teams.map(team=>{const txs=store.transactions.filter(tx=>tx.team===team.name),active=txs.filter(tx=>activeStages.includes(tx.stage)).length,realized=txs.filter(tx=>tx.stage==='Delivery').length;return `<button class="row-button team-row" data-team="${team.id}"><div><strong>${esc(team.name)} · ${realized} / ${team.target}</strong><span>${active} pipeline aktif · ${esc(team.supervisor)}</span></div><span>${state.role==='Branch Manager'?'Data agregat':'Kelola'}</span></button>`}).join('');
    return compact?`<div class="grid-2"><section class="panel"><header class="panel-head"><h2>Kinerja tim</h2>${button('Buka semua','go-performance','text-btn')}</header>${content}</section><section class="panel"><header class="panel-head"><h2>Ringkasan tahap</h2></header><div class="panel-body bar-list">${activeStages.map(stage=>bar(stage,store.transactions.filter(tx=>tx.stage===stage).length,store.transactions.length)).join('')}</div></section></div>`:pageHead(state.role==='Branch Manager'?'Kinerja Tim':'Tim & Penempatan',state.role==='Branch Manager'?'Kinerja agregat lintas tim tanpa data kontak.':'Kelola tim dan penempatan pengguna.',state.role==='Admin'?button('Tambah tim','new-team','primary'):'')+`<section class="panel"><header class="panel-head"><h2>${store.teams.length} tim</h2><span>Data contoh</span></header>${content}</section>`;
  }
  function dealerPage(){
    return pageHead('Pengaturan Dealer','Identitas publik dealer; tidak ada secret pada prototype.')+`<section class="panel"><header class="panel-head"><h2>Profil dealer</h2><span>Data contoh</span></header><div class="panel-body"><form data-form="dealer" novalidate><div class="form-grid"><div class="field full"><label for="dealerName">Nama dealer</label><input id="dealerName" name="name" value="${esc(store.dealer.name)}" required></div><div class="field"><label for="dealerPhone">Telepon</label><input id="dealerPhone" name="phone" value="${esc(store.dealer.phone)}" required></div><div class="field"><label for="dealerTimezone">Zona waktu</label><select id="dealerTimezone" name="timezone"><option>Asia/Jakarta</option></select></div></div><div class="form-actions"><button class="primary" type="submit">Simpan pengaturan</button></div></form></div></section>`;
  }
  function notificationsPage(){
    const unread=store.notifications.filter(item=>!item.read).length;
    return pageHead('Notifikasi',`${unread} belum dibaca.`,unread?button('Tandai semua dibaca','read-all','secondary'):'')+`<section class="panel"><header class="panel-head"><h2>Aktivitas terbaru</h2><span>Data contoh</span></header>${store.notifications.map(item=>`<button class="row-button notification-row" data-notification="${item.id}"><div><strong>${item.read?'':`<span class="route-chip">Baru</span> `}${esc(item.title)}</strong><span>${esc(item.meta)}</span></div><span>Buka</span></button>`).join('')}</section>`;
  }
  function profilePage(){
    const person=people[state.role];return pageHead('Profil','Kelola identitas dan keamanan akun review.')+`<div class="grid-2"><section class="panel"><header class="panel-head"><h2>Identitas</h2></header><div class="panel-body"><form data-form="profile" novalidate><div class="field"><label for="profileName">Nama lengkap</label><input id="profileName" name="name" value="${esc(person[0])}" required></div><div class="field"><label for="profileEmail">Email</label><input id="profileEmail" name="email" type="email" value="${esc(store.profile.email)}" required autocomplete="email"></div><div class="form-actions"><button class="primary" type="submit">Simpan profil</button></div></form></div></section><section class="panel"><header class="panel-head"><h2>Keamanan</h2></header><div class="panel-body"><p class="muted">Password tidak pernah dapat dibaca oleh Admin.</p>${button('Ubah password','change-password')}</div></section></div>`;
  }
  function deniedPage(){return pageHead('Akses ditolak','Role ini tidak mempunyai cakupan untuk halaman tersebut.')+`<section class="state-box"><h2>Halaman tidak tersedia</h2><p>Kembali ke beranda untuk melanjutkan.</p><button class="primary" data-nav="Beranda" style="margin-top:16px">Kembali</button></section>`}
  function renderPage(){
    const early=stateBefore();if(early){$('#mainContent').innerHTML=early;return}
    let html=stateNotice();
    if(state.page==='Beranda')html+=state.role==='Sales'?salesHome():roleHome();
    else if(/Pelanggan/.test(state.page))html+=customerPage();
    else if(state.page==='Transaksi')html+=transactionPage();
    else if(state.page==='Target')html+=targetPage();
    else if(state.page==='Analisis')html+=analysisPage();
    else if(state.page==='Import Data')html+=importPage();
    else if(state.page==='Pengguna & Undangan')html+=usersPage();
    else if(state.page==='Tim & Penempatan'||state.page==='Kinerja Tim')html+=teamPerformance(false);
    else if(state.page==='Pengaturan Dealer')html+=dealerPage();
    else if(state.page==='Notifikasi')html+=notificationsPage();
    else if(state.page==='Profil')html+=profilePage();
    else html+=deniedPage();
    $('#mainContent').innerHTML=html;bindPage();
  }
  function bindPage(){
    const search=$('#searchInput');if(search)search.addEventListener('input',event=>{state.query=event.target.value;renderPage();$('#searchInput')?.focus()});
    const filter=$('#filterSelect');if(filter)filter.addEventListener('change',event=>{state.filter=event.target.value;renderPage()});
  }

  function openDialog({title,subtitle='Data contoh',body,tabs='',trigger=null,returnHash=null}){
    state.lastFocus=trigger||document.activeElement;state.savedScroll=window.scrollY;state.returnHash=returnHash;
    $('#detailTitle').textContent=title;$('#detailSubtitle').textContent=subtitle;$('#detailTabs').innerHTML=tabs;$('#detailBody').innerHTML=body;
    const overlay=$('#detailOverlay');overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';$('#closeDetail').focus();
  }
  function closeDialog(useHistory=true){
    const overlay=$('#detailOverlay');if(!overlay.classList.contains('open'))return;if(useHistory&&state.returnHash&&location.hash!==state.returnHash){history.back();return}overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');document.body.style.overflow='';
    requestAnimationFrame(()=>{window.scrollTo({top:state.savedScroll,behavior:'auto'});state.lastFocus?.focus?.()});
    state.returnHash=null;
  }
  function detailTabs(active,includeTimeline=true){
    const tabs=[['summary','Ringkasan'],...(includeTimeline?[['timeline','Timeline']]:[]),['history','Riwayat tahap']];return `<div role="tablist" aria-label="Bagian detail transaksi">${tabs.map(([id,label])=>`<button class="tab ${active===id?'active':''}" role="tab" aria-selected="${active===id}" tabindex="${active===id?0:-1}" data-detail-tab="${id}">${label}</button>`).join('')}</div>`;
  }
  function transactionBody(tx,tab='summary',sanitized=false){
    if(tab==='timeline'&&!sanitized)return `<div id="transactionPanel" role="tabpanel" class="timeline"><div class="event"><p><strong>${esc(tx.owner)}</strong> menjadwalkan ${esc(tx.next.toLowerCase())}.</p><time>Kemarin, 17.42 · Aktivitas</time></div><div class="event"><p><strong>Supervisor</strong> menyarankan dua pilihan waktu kunjungan.</p><time>Kemarin, 14.08 · Coaching</time></div><div class="event"><p>Tahap berubah menjadi ${esc(tx.stage)}.</p><time>27 Oktober, 11.20 · Sistem</time></div></div>`;
    if(tab==='history')return `<div id="transactionPanel" role="tabpanel" class="timeline"><div class="event"><p><strong>${esc(tx.stage)}</strong></p><time>27 Oktober · oleh ${esc(tx.owner)}</time></div><div class="event"><p><strong>Prospect</strong></p><time>25 Oktober · oleh ${esc(tx.owner)}</time></div><div class="event"><p><strong>Lead</strong></p><time>23 Oktober · transaksi dibuat</time></div></div>`;
    if(sanitized)return `<div id="transactionPanel" role="tabpanel"><div class="audit-note">Detail Branch Manager disanitasi: tanpa nama, telepon, catatan hubungan, atau coaching.</div><div class="facts"><div class="readonly"><span>ID transaksi</span><strong>${esc(tx.id)}</strong></div><div class="readonly"><span>Tim</span><strong>${esc(tx.team)}</strong></div><div class="readonly"><span>Tahap</span><strong>${esc(tx.stage)}</strong></div><div class="readonly"><span>Model</span><strong>${esc(tx.model)}</strong></div><div class="readonly"><span>Sumber</span><strong>${esc(tx.source)}</strong></div><div class="readonly"><span>Aktivitas terakhir</span><strong>${esc(tx.last)}</strong></div></div></div>`;
    const canEdit=state.role==='Sales'||state.role==='Supervisor';
    return `<div id="transactionPanel" role="tabpanel" class="detail-grid"><section class="detail-section"><h3>Informasi peluang</h3><div class="facts"><div class="fact"><span>Tahap</span><strong>${esc(tx.stage)}</strong></div><div class="fact"><span>Sumber</span><strong>${esc(tx.source)}</strong></div><div class="fact"><span>Kendaraan</span><strong>${esc(tx.model)}</strong></div><div class="fact"><span>Sales</span><strong>${esc(tx.owner)}</strong></div><div class="fact"><span>Aktivitas terakhir</span><strong>${esc(tx.last)}</strong></div><div class="fact"><span>Estimasi pembelian</span><strong>November 2026</strong></div></div></section><aside class="next-step"><strong>Langkah berikutnya</strong><p>${esc(tx.next)}<br>${esc(tx.due)}</p>${canEdit?button(state.role==='Supervisor'?'Beri coaching':'Catat hasil follow-up','activity','primary',`data-id="${tx.id}" style="margin-top:14px;width:100%"`):'<span class="muted">Mode audit read-only</span>'}</aside></div>`;
  }
  function openTransaction(id,trigger,fromHash=false){
    const tx=store.transactions.find(item=>item.id===id);if(!tx)return;
    const sanitized=state.role==='Branch Manager';state.detail={type:'tx',id,sanitized};state.detailTab=state.detailTabsById[id]||'summary';
    if(!fromHash){state.returnHash=location.hash;setHash(`/transactions/${id}`);return}
    openDialog({title:sanitized?`Transaksi ${tx.id}`:`${nameFor(tx)} · ${tx.model}`,subtitle:`${tx.id} · ${tx.stage} · Data contoh`,tabs:detailTabs(state.detailTab,!sanitized),body:transactionBody(tx,state.detailTab,sanitized),trigger,returnHash:state.returnHash||hash(state.path)});
  }
  function openCustomer(id,trigger,fromHash=false){
    const customer=store.customers.find(item=>item.id===id);if(!customer)return;if(!fromHash){state.returnHash=location.hash;setHash(`/customers/${id}`);return}
    const audit=state.role==='Admin';openDialog({title:customer.name,subtitle:`${customer.id} · Data contoh`,trigger,returnHash:state.returnHash||hash('/customers'),tabs:`<div role="tablist" aria-label="Bagian pelanggan"><button class="tab active" role="tab" aria-selected="true" data-customer-tab="profile" data-id="${customer.id}">Profil</button><button class="tab" role="tab" aria-selected="false" tabindex="-1" data-customer-tab="history" data-id="${customer.id}">Riwayat hubungan</button></div>`,body:customerBody(customer,audit)});
  }
  function customerBody(customer,audit){return `${audit?'<div class="audit-note">Mode audit Admin · perubahan pelanggan dinonaktifkan.</div>':''}<div class="detail-grid"><section class="detail-section"><h3>Profil pelanggan</h3><div class="facts"><div class="fact"><span>Nomor telepon</span><strong>${esc(customer.phone)}</strong></div><div class="fact"><span>Minat</span><strong>${esc(customer.model)}</strong></div><div class="fact"><span>Kontak terakhir</span><strong>${esc(customer.last)}</strong></div><div class="fact"><span>Preferensi</span><strong>${esc(customer.preference)}</strong></div><div class="fact"><span>Sales</span><strong>${esc(customer.owner)}</strong></div><div class="fact"><span>Tim</span><strong>${esc(customer.team)}</strong></div></div></section><aside class="next-step"><strong>Langkah berikutnya</strong><p>${esc(customer.next)}<br>${esc(customer.due)}</p>${audit?'<span class="muted">Read-only</span>':`<div class="action-row" style="margin-top:14px">${button('Catat aktivitas','activity','secondary',`data-id="${customer.id}"`)}${button('Transaksi baru','new-transaction','primary',`data-customer="${customer.id}"`)}</div>`}</aside></div>`}
  function openTeam(id,trigger){
    const team=store.teams.find(item=>item.id===id),txs=store.transactions.filter(tx=>tx.team===team.name),sanitized=state.role==='Branch Manager';
    openDialog({title:team.name,subtitle:`${team.supervisor} · Data contoh`,trigger,body:`${sanitized?'<div class="audit-note">Agregat read-only tanpa kontak pelanggan atau coaching.</div>':''}<section class="metrics">${metric('Target',team.target,'unit')}${metric('Realisasi',txs.filter(tx=>tx.stage==='Delivery').length,'unit')}${metric('Pipeline aktif',txs.filter(tx=>activeStages.includes(tx.stage)).length,'transaksi')}${metric('Terlambat',txs.filter(tx=>tx.state==='late').length,'follow-up')}</section>${sanitized?'':`<div class="form-actions">${button('Atur penempatan','place-user','primary','data-team="'+team.id+'"')}</div>`}`});
  }

  function field(name,label,type='text',value='',options=''){
    if(options)return `<div class="field"><label for="f-${name}">${label}</label><select id="f-${name}" name="${name}" required>${options}</select></div>`;
    return `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" required></div>`;
  }
  function selectField(name,label,options){return `<div class="field"><label for="f-${name}">${label}</label><select id="f-${name}" name="${name}" required>${options}</select></div>`}
  function formDialog(title,formName,fields,trigger,submit='Simpan'){
    openDialog({title,subtitle:'Perubahan hanya berlaku selama sesi review.',trigger,body:`<form data-form="${formName}" novalidate><div class="error-host"></div><div class="form-grid">${fields}</div><div class="form-actions"><button type="button" class="secondary" data-action="close-dialog">Batal</button><button type="submit" class="primary">${submit}</button></div></form>`});
  }
  function showErrors(form,errors){
    form.querySelectorAll('.field-error').forEach(node=>node.remove());form.querySelectorAll('[aria-invalid]').forEach(input=>{input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby')});
    const host=form.querySelector('.error-host');if(!errors.length){if(host)host.innerHTML='';return true}
    host.innerHTML=`<div class="error-summary" role="alert" tabindex="-1"><strong>Periksa kembali formulir</strong>${errors.map(error=>`<a href="#${error.id}">${esc(error.message)}</a>`).join('')}</div>`;
    errors.forEach(error=>{const input=form.querySelector(`#${error.id}`);if(!input)return;const errorId=`${error.id}-error`;input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',errorId);input.insertAdjacentHTML('afterend',`<p class="field-error" id="${errorId}">${esc(error.message)}</p>`)});form.querySelector(`#${errors[0].id}`)?.focus();return false;
  }
  function validate(form){const errors=[];form.querySelectorAll('[required]').forEach(input=>{if(!input.value.trim())errors.push({id:input.id,message:`${input.previousElementSibling?.textContent||'Field'} wajib diisi.`});else if(input.type==='email'&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value))errors.push({id:input.id,message:'Masukkan alamat email yang valid.'})});const password=form.querySelector('[name="password"]'),confirm=form.querySelector('[name="confirm"]');if(password&&form.dataset.authForm!=='login'&&password.value&&password.value.length<12)errors.push({id:password.id,message:'Password minimal 12 karakter.'});if(confirm&&confirm.value!==password?.value)errors.push({id:confirm.id,message:'Ulangi password dengan nilai yang sama.'});return showErrors(form,errors)}
  function submitForm(form){
    if(state.mode==='offline'){showToast('Tidak dapat menyimpan saat offline. Hubungkan kembali lalu coba lagi.');return}if(!validate(form))return;const data=Object.fromEntries(new FormData(form));
    if(form.dataset.form==='customer'){
      const customer={id:uid('CUS'),name:data.name,phone:data.phone,model:data.model,owner:state.role==='Sales'?'Rina Pratama':data.owner||'Rina Pratama',team:'Tim Anggrek',last:'Belum pernah',next:'Hubungi pelanggan baru',due:'Hari ini',state:'today',preference:'Belum ditentukan'};store.customers.unshift(customer);showToast('Pelanggan ditambahkan ke data sesi.');
    } else if(form.dataset.form==='transaction'){
      const customer=store.customers.find(item=>item.id===data.customerId);store.transactions.unshift({id:uid('TRX'),customerId:data.customerId,model:data.model,stage:'Lead',owner:customer.owner,team:customer.team,source:data.source,next:'Follow-up pertama',due:'Hari ini',state:'today',last:'Baru dibuat'});showToast('Transaksi baru ditambahkan.');
    } else if(form.dataset.form==='activity'){
      const tx=store.transactions.find(item=>item.id===data.id||item.customerId===data.id);if(tx){tx.next=data.next;tx.due=data.due;tx.state='today';tx.last='Baru saja';}showToast('Aktivitas dicatat.');
    } else if(form.dataset.form==='target'){
      const target=store.targets.find(item=>item.owner===data.owner);if(target)target.target=Number(data.target);else store.targets.push({owner:data.owner,kind:data.owner.startsWith('Tim')?'Tim':'Sales',target:Number(data.target),realized:0});showToast('Target diperbarui.');
    } else if(form.dataset.form==='invite'){
      store.users.push({id:uid('USR'),name:data.name,email:data.email,role:data.role,team:data.team,status:'Undangan tertunda'});showToast('Undangan dibuat untuk sesi review.');
    } else if(form.dataset.form==='team'){
      store.teams.push({id:uid('TEAM'),name:data.name,supervisor:'Belum ditempatkan',target:Number(data.target)});showToast('Tim baru ditambahkan.');
    } else if(form.dataset.form==='placement'){
      const team=store.teams.find(item=>item.id===data.teamId),user=store.users.find(item=>item.id===data.userId);if(team&&user){user.team=team.name;if(user.role==='Supervisor')team.supervisor=user.name}showToast('Penempatan diperbarui.');
    } else if(form.dataset.form==='dealer'){
      Object.assign(store.dealer,data);showToast('Pengaturan dealer disimpan untuk sesi ini.');renderPage();return;
    } else if(form.dataset.form==='profile'){
      store.profile.name=data.name;store.profile.email=data.email;people[state.role][0]=data.name;showToast('Profil diperbarui.');render();return;
    } else if(form.dataset.form==='password')showToast('Password contoh berhasil diperbarui.');
    closeDialog(false);render();
  }

  function action(name,element){
    const customerOptions=scopeCustomers(state.role).map(customer=>`<option value="${customer.id}">${esc(customer.name)}</option>`).join('');
    if(name==='retry'){state.mode='normal';$('#stateSelect').value='normal';renderPage()}
    else if(name==='close-dialog')closeDialog(false);
    else if(name==='go-customers')navigate(currentMenuLabel('/customers'));
    else if(name==='go-analysis')navigate('Analisis');
    else if(name==='go-users')navigate('Pengguna & Undangan');
    else if(name==='go-teams')navigate('Tim & Penempatan');
    else if(name==='go-performance')navigate('Kinerja Tim');
    else if(name==='go-import')navigate('Import Data');
    else if(name==='new-customer')formDialog('Tambah pelanggan','customer',field('name','Nama lengkap')+field('phone','Nomor telepon','tel')+field('model','Model diminati','text','Model A')+(state.role==='Supervisor'?field('owner','Sales penanggung jawab','text','Rina Pratama'):''),element,'Tambah pelanggan');
    else if(name==='new-transaction'){
      const selected=element.dataset.customer||scopeCustomers(state.role)[0]?.id;const options=scopeCustomers(state.role).map(customer=>`<option value="${customer.id}" ${customer.id===selected?'selected':''}>${esc(customer.name)} · ${customer.id}</option>`).join('');formDialog('Transaksi baru','transaction',selectField('customerId','Pelanggan',options)+field('model','Model kendaraan','text',store.customers.find(item=>item.id===selected)?.model||'Model A')+field('source','Sumber lead','text','Referral'),element,'Buat transaksi');
    } else if(name==='activity'){
      const id=element.dataset.id||state.detail?.id||scopeTransactions(state.role)[0]?.id;formDialog(state.role==='Supervisor'?'Beri coaching':'Catat aktivitas','activity',`<input type="hidden" name="id" value="${esc(id)}">${field('next',state.role==='Supervisor'?'Arahan':'Tindakan berikutnya','text',state.role==='Supervisor'?'Tawarkan dua jadwal kunjungan':'Konfirmasi hasil follow-up')}${field('due','Jadwal berikutnya','text','Hari ini, 16.30')}`,element,'Simpan aktivitas');
    } else if(name==='edit-target'){
      const owner=element.dataset.owner||'Tim Anggrek',current=store.targets.find(item=>item.owner===owner)?.target||32;formDialog('Ubah target','target',field('owner','Pemilik target','text',owner)+field('target','Target unit','number',current),element,'Simpan target');
    } else if(name==='invite-user')formDialog('Undang pengguna','invite',field('name','Nama lengkap')+field('email','Email','email')+selectField('role','Role','<option>Sales</option><option>Supervisor</option><option>Branch Manager</option><option>Admin</option>')+selectField('team','Tim',store.teams.map(team=>`<option>${esc(team.name)}</option>`).join('')),element,'Buat undangan');
    else if(name==='manage-user'){
      const user=store.users.find(item=>item.id===element.dataset.id);openDialog({title:user.name,subtitle:`${user.role} · ${user.status}`,trigger:element,body:`<div class="facts"><div class="readonly"><span>Email</span><strong>${esc(user.email)}</strong></div><div class="readonly"><span>Tim</span><strong>${esc(user.team)}</strong></div></div><div class="form-actions"><button class="secondary" data-action="resend-invite" data-id="${user.id}" ${user.status==='Aktif'?'disabled title="Akun sudah aktif"':''}>Kirim ulang undangan</button><button class="danger" data-action="toggle-user" data-id="${user.id}">${user.status==='Nonaktif'?'Aktifkan akun':'Nonaktifkan akun'}</button></div>`});
    } else if(name==='resend-invite')showToast('Undangan contoh dikirim ulang.');
    else if(name==='toggle-user'){const user=store.users.find(item=>item.id===element.dataset.id);user.status=user.status==='Nonaktif'?'Aktif':'Nonaktif';showToast(`Akun ${user.status.toLowerCase()}.`);closeDialog(false);renderPage()}
    else if(name==='new-team')formDialog('Tambah tim','team',field('name','Nama tim')+field('target','Target awal','number','32'),element,'Tambah tim');
    else if(name==='place-user'){
      const users=store.users.map(user=>`<option value="${user.id}">${esc(user.name)} · ${esc(user.role)}</option>`).join(''),teams=store.teams.map(team=>`<option value="${team.id}" ${team.id===element.dataset.team?'selected':''}>${esc(team.name)}</option>`).join('');formDialog('Atur penempatan','placement',selectField('userId','Pengguna',users)+selectField('teamId','Tim',teams),element,'Simpan penempatan');
    } else if(name==='load-import'){state.importPreview=true;renderPage()}
    else if(name==='cancel-import'){state.importPreview=false;renderPage()}
    else if(name==='confirm-import'){store.imports.push({id:uid('IMP'),scope:state.role==='Admin'?'Dealer':'Tim Anggrek',file:'pelanggan-contoh.csv',success:2,failed:1,status:'Selesai sebagian'});state.importPreview=false;showToast('2 baris valid diimport ke data sesi.');renderPage()}
    else if(name==='read-all'){store.notifications.forEach(item=>item.read=true);showToast('Semua notifikasi ditandai dibaca.');renderPage()}
    else if(name==='change-password')formDialog('Ubah password','password',field('password','Password baru','password')+field('confirm','Ulangi password','password'),element,'Perbarui password');
    else if(name==='sales-detail'){
      const user=store.users.find(item=>item.id===element.dataset.id),txs=store.transactions.filter(tx=>tx.owner===user.name);openDialog({title:user.name,subtitle:`${user.role} · ${user.team}`,trigger:element,body:`<section class="metrics">${metric('Pipeline aktif',txs.filter(tx=>activeStages.includes(tx.stage)).length,'transaksi')}${metric('Terlambat',txs.filter(tx=>tx.state==='late').length,'follow-up')}${metric('Realisasi',txs.filter(tx=>tx.stage==='Delivery').length,'unit')}${metric('Target',store.targets.find(item=>item.owner===user.name)?.target||10,'unit')}</section>`});
    }
  }

  function renderAuth(type){
    $('#appShell').hidden=true;$('#mobileNav').style.display='none';$('#authStage').classList.add('active');$('#stateSelect').disabled=true;$('#surfaceSelect').value=type;
    const brand='<div class="auth-brand"><span class="brand-mark">DS</span><strong>DealDrive Supervisor</strong></div>';
    if(type==='invite-expired'||type==='invite-used'){$('#authCard').innerHTML=`${brand}<h1>${type==='invite-expired'?'Undangan kedaluwarsa':'Undangan sudah digunakan'}</h1><p>${type==='invite-expired'?'Minta Admin mengirim undangan baru.':'Masuk dengan akun yang telah diaktifkan.'}</p><button class="primary" data-auth-route="${type==='invite-expired'?'/login':'/login'}">Ke halaman masuk</button><div class="auth-foot">Data contoh · bukan akun nyata</div>`;return}
    const config={login:['Masuk','Gunakan akun dealer yang telah diundang.','Masuk'],forgot:['Lupa password','Masukkan email untuk menerima tautan reset.','Kirim tautan reset'],reset:['Reset password','Buat password baru untuk akun Anda.','Simpan password'],invite:['Aktifkan akun Anda','Undangan untuk bergabung ke Tim Anggrek sebagai Sales.','Aktifkan akun']}[type];
    const email=`<div class="field"><label for="authEmail">Email</label><input id="authEmail" name="email" type="email" value="rina@example.test" autocomplete="email" required></div>`,password=`<div class="field"><label for="authPassword">${type==='invite'||type==='reset'?'Buat password':'Password'}</label><input id="authPassword" name="password" type="password" autocomplete="${type==='login'?'current-password':'new-password'}" required><button class="text-btn" type="button" data-toggle-password style="margin-top:6px">Tampilkan password</button><small>Minimal 12 karakter; paste dan password manager didukung.</small></div>`,confirm=`<div class="field"><label for="authConfirm">Ulangi password</label><input id="authConfirm" name="confirm" type="password" autocomplete="new-password" required></div>`;
    $('#authCard').innerHTML=`${brand}<h1>${config[0]}</h1><p>${config[1]}</p><form data-auth-form="${type}" novalidate><div class="error-host"></div>${type==='invite'?'<div class="field"><label for="authName">Nama lengkap</label><input id="authName" name="name" value="Rina Pratama" autocomplete="name" required></div>':''}${email}${type==='forgot'?'':password}${type==='invite'||type==='reset'?confirm:''}<button class="primary" type="submit">${config[2]}</button></form><div class="auth-links">${type==='login'?'<button class="auth-link" data-auth-route="/forgot-password">Lupa password?</button>':''}${type!=='login'?'<button class="auth-link" data-auth-route="/login">Kembali ke halaman masuk</button>':''}</div><div class="auth-foot">Data contoh · bukan akun nyata</div>`;
  }
  function handleAuthSubmit(form){
    if(!validate(form))return;const type=form.dataset.authForm;if(type==='forgot'){form.innerHTML='<div class="success-box" role="status"><strong>Tautan reset siap.</strong><br>Prototype tidak mengirim email nyata.</div>';return}if(type==='login'){showToast('Login contoh berhasil.');setHash('/dashboard');return}if(type==='reset'){showToast('Password contoh diperbarui.');setHash('/login');return}if(type==='invite'){showToast('Akun contoh diaktifkan.');setHash('/login')}
  }

  function openMore(trigger){state.moreTrigger=trigger;const overlay=$('#moreOverlay');overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');trigger.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';$('#moreList button')?.focus()}
  function closeMore(returnFocus=true){const overlay=$('#moreOverlay');if(!overlay.classList.contains('open'))return;overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');document.body.style.overflow='';state.moreTrigger?.setAttribute('aria-expanded','false');if(returnFocus)state.moreTrigger?.focus()}
  function trapFocus(container,event){const focusable=$$('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])').filter(item=>container.contains(item)&&item.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
  function switchTransactionTab(button){
    const tx=store.transactions.find(item=>item.id===state.detail.id),tab=button.dataset.detailTab;state.detailTab=tab;state.detailTabsById[tx.id]=tab;const wrap=button.closest('[role="tablist"]');wrap.querySelectorAll('[role="tab"]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1});$('#detailBody').innerHTML=transactionBody(tx,tab,state.detail.sanitized);button.focus();
  }
  function handleRoute(){
    const path=(location.hash.slice(1)||'/dashboard').replace(/\/$/,'')||'/dashboard';
    const authMap={'/login':'login','/forgot-password':'forgot','/reset-password/demo-token':'reset','/invitations/demo':'invite','/invitations/expired':'invite-expired','/invitations/used':'invite-used'};
    if(authMap[path]){renderAuth(authMap[path]);return}
    showApp();
    const customerMatch=path.match(/^\/customers\/(CUS-[\w-]+)$/),txMatch=path.match(/^\/transactions\/(TRX-[\w-]+)$/);
    if(customerMatch){state.path='/customers';state.page=currentMenuLabel('/customers');if(!isAllowed(state.page)){state.mode='denied';render();return}render();openCustomer(customerMatch[1],null,true);return}
    if(txMatch){state.path='/transactions';state.page='Transaksi';if(state.role==='Branch Manager'){state.page='Analisis'}else if(!isAllowed('Transaksi')){state.mode='denied';render();return}render();openTransaction(txMatch[1],null,true);return}
    state.path=path;state.page=currentMenuLabel(path);state.mode=$('#stateSelect').value||'normal';
    if(!labelByRoute[path]||!isAllowed(state.page)){state.mode='denied';state.page='Akses ditolak'}
    render();$('#mainContent').focus({preventScroll:true});
  }

  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return}
    const more=event.target.closest('[data-more]');if(more){openMore(more);return}
    const customer=event.target.closest('[data-customer]');if(customer){state.lastFocus=customer;state.savedScroll=window.scrollY;openCustomer(customer.dataset.customer,customer);return}
    const tx=event.target.closest('[data-open-tx]');if(tx){state.lastFocus=tx;state.savedScroll=window.scrollY;openTransaction(tx.dataset.openTx,tx);return}
    const team=event.target.closest('[data-team]');if(team){openTeam(team.dataset.team,team);return}
    const analysisTx=event.target.closest('[data-analysis-tx]');if(analysisTx){state.lastFocus=analysisTx;openTransaction(analysisTx.dataset.analysisTx,analysisTx);return}
    const analysisRoute=event.target.closest('[data-analysis-route]');if(analysisRoute){setHash(analysisRoute.dataset.analysisRoute);return}
    const detailTab=event.target.closest('[data-detail-tab]');if(detailTab){switchTransactionTab(detailTab);return}
    const customerTab=event.target.closest('[data-customer-tab]');if(customerTab){customerTab.parentElement.querySelectorAll('[role="tab"]').forEach(item=>{const active=item===customerTab;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1});const customerData=store.customers.find(item=>item.id===customerTab.dataset.id);$('#detailBody').innerHTML=customerTab.dataset.customerTab==='profile'?customerBody(customerData,state.role==='Admin'):'<div role="tabpanel" class="timeline"><div class="event"><p>Follow-up dijadwalkan.</p><time>Kemarin · Aktivitas</time></div><div class="event"><p>Minat kendaraan dicatat.</p><time>23 Oktober · Transaksi</time></div></div>';return}
    const actionButton=event.target.closest('[data-action]');if(actionButton){action(actionButton.dataset.action,actionButton);return}
    const notification=event.target.closest('[data-notification]');if(notification){const item=store.notifications.find(entry=>entry.id===notification.dataset.notification);item.read=true;if(item.source.startsWith('TRX-'))openTransaction(item.source,notification);else setHash(item.source);return}
    const authRoute=event.target.closest('[data-auth-route]');if(authRoute){setHash(authRoute.dataset.authRoute);return}
    const toggle=event.target.closest('[data-toggle-password]');if(toggle){const input=$('#authPassword'),show=input.type==='password';input.type=show?'text':'password';toggle.textContent=show?'Sembunyikan password':'Tampilkan password';input.focus();return}
  });
  document.addEventListener('submit',event=>{event.preventDefault();if(event.target.matches('[data-form]'))submitForm(event.target);else if(event.target.matches('[data-auth-form]'))handleAuthSubmit(event.target)});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){if($('#detailOverlay').classList.contains('open'))closeDialog();else closeMore();return}
    if(event.key==='Tab'&&$('#detailOverlay').classList.contains('open'))trapFocus($('#detailOverlay'),event);else if(event.key==='Tab'&&$('#moreOverlay').classList.contains('open'))trapFocus($('#moreOverlay'),event);
    if((event.key==='Enter'||event.key===' ')&&event.target.matches('tr[data-customer],tr[data-open-tx]')){event.preventDefault();event.target.click()}
    if((event.key==='ArrowLeft'||event.key==='ArrowRight')&&event.target.matches('[role="tab"]')){const tabs=[...event.target.closest('[role="tablist"]').querySelectorAll('[role="tab"]')],index=tabs.indexOf(event.target),next=tabs[(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];next.click();next.focus()}
  });
  $('#closeDetail').addEventListener('click',()=>closeDialog());$('#detailOverlay').addEventListener('click',event=>{if(event.target===$('#detailOverlay'))closeDialog()});
  $('#closeMore').addEventListener('click',()=>closeMore());$('#moreOverlay').addEventListener('click',event=>{if(event.target===$('#moreOverlay'))closeMore()});
  $('#notificationButton').addEventListener('click',()=>navigate('Notifikasi'));
  $('#roleSelect').addEventListener('change',event=>{state.role=event.target.value;state.query='';state.filter='all';state.mode='normal';$('#stateSelect').value='normal';setHash('/dashboard')});
  $('#surfaceSelect').addEventListener('change',event=>{const routes={app:'/dashboard',login:'/login',forgot:'/forgot-password',reset:'/reset-password/demo-token',invite:'/invitations/demo','invite-expired':'/invitations/expired','invite-used':'/invitations/used',states:'/dashboard'};if(event.target.value==='states'){$('#stateSelect').disabled=false;state.mode=$('#stateSelect').value;setHash('/dashboard')}else setHash(routes[event.target.value])});
  $('#stateSelect').addEventListener('change',event=>{state.mode=event.target.value;render()});
  window.addEventListener('hashchange',()=>{closeDialog(false);handleRoute()});
  if(!location.hash)history.replaceState(null,'',hash('/dashboard'));handleRoute();
})();
