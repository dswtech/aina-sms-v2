const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'approved.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'approved-enhancements.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'approved-enhancements.css'), 'utf8');
let passed = 0;

function expect(label, condition) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  passed += 1;
}

const roleMenus = {
  Sales: ['Beranda', 'Buku Pelanggan Saya', 'Transaksi', 'Notifikasi', 'Profil'],
  Supervisor: ['Beranda', 'Pelanggan Tim', 'Transaksi', 'Target', 'Analisis', 'Import Data', 'Notifikasi', 'Profil'],
  'Branch Manager': ['Beranda', 'Kinerja Tim', 'Analisis', 'Notifikasi', 'Profil'],
  Admin: ['Beranda', 'Pelanggan', 'Transaksi', 'Pengguna & Undangan', 'Tim & Penempatan', 'Analisis', 'Import Data', 'Pengaturan Dealer', 'Notifikasi', 'Profil']
};

for (const [role, labels] of Object.entries(roleMenus)) {
  expect(`${role} mempunyai seluruh menu yang disetujui`, labels.every(label => js.includes(`'${label}'`) || js.includes(`${label}:`)));
}

const routes = [
  '/dashboard', '/customers', '/transactions', '/targets', '/analysis/source', '/analysis/models',
  '/imports', '/admin/users', '/admin/teams', '/admin/dealer', '/performance', '/notifications',
  '/profile', '/login', '/forgot-password', '/reset-password/demo-token', '/invitations/demo',
  '/invitations/expired', '/invitations/used'
];
expect('seluruh hash route tersedia', routes.every(route => js.includes(route)));
expect('store sesi mencakup seluruh domain', ['customers:', 'transactions:', 'teams:', 'users:', 'targets:', 'notifications:', 'imports:', 'dealer:', 'profile:'].every(key => js.includes(key)));
expect('seluruh mutation form tersedia', ['customer', 'transaction', 'activity', 'target', 'invite', 'team', 'placement', 'dealer', 'profile', 'password'].every(name => js.includes(`form.dataset.form==='${name}'`)));
expect('tidak memakai localStorage atau backend', !/localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest|WebSocket/.test(js));
expect('detail Branch Manager disanitasi', js.includes('tanpa nama, telepon, catatan hubungan, atau coaching'));
expect('Admin pelanggan dan transaksi read-only', js.includes('Mode audit Admin · data pelanggan hanya dapat dibaca') && js.includes('Mode audit Admin · transaksi dan coaching hanya dapat dibaca'));
expect('dialog menggunakan semantics dan focus trap', html.includes('role="dialog"') && html.includes('aria-modal="true"') && js.includes('trapFocus'));
expect('tab menggunakan tablist, tab, dan tabpanel', js.includes('role="tablist"') && js.includes('role="tab"') && js.includes('role="tabpanel"'));
expect('validasi menghubungkan error ke field', js.includes("setAttribute('aria-describedby'") && js.includes("setAttribute('aria-invalid'"));
expect('Back/Forward dan direct link ditangani', js.includes("addEventListener('hashchange'") && js.includes('history.back()'));
expect('state daftar dan tab detail dipertahankan', js.includes('state.query') && js.includes('state.filter') && js.includes('savedScroll') && js.includes('detailTabsById'));
expect('stylesheet dan runtime baru terhubung', html.includes('approved-enhancements.css') && html.includes('approved-enhancements.js'));
expect('layout mobile mempunyai breakpoint dan target sentuh', css.includes('@media(max-width:640px)') && `${html}${css}`.includes('min-height:44px'));
const missingDomTargets = [...js.matchAll(/\$\('#([A-Za-z][\w-]*)'\)/g)].map(match => match[1]).filter(id => !html.includes(`id="${id}"`));
expect(`seluruh target DOM statis tersedia (${missingDomTargets.join(', ') || 'lengkap'})`, missingDomTargets.length === 0);
expect('runtime aktif tidak memakai halaman placeholder generik', !js.includes('function placeholder()'));

console.log(`PASS: ${passed} kontrak prototipe terverifikasi.`);
