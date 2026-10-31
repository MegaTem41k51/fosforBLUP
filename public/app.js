// ---------- утилиты ----------
const $ = s => document.querySelector(s);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

const state = {
  coin: null,
  network: null,
  user: null
};

async function loadRates() {
  try {
    const r = await fetch('/api/rates');
    const rates = await r.json();
    document.querySelectorAll('[data-rate=\"usdt\"]').forEach(el => el.textContent = rates.usdt);
    document.querySelectorAll('[data-rate=\"gram\"]').forEach(el => el.textContent = rates.gram);
  } catch (e) { console.warn('Не удалось загрузить курсы', e); }
}

// ---------- принудительно убираем загрузчик через 1.5 сек ----------
setTimeout(() => {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('hidden');
  show($('#header'));
  show($('#main'));
  checkStatus();
  checkMe();
  loadRates();
  navigate('home');
}, 1500);

// ---------- навигация с защитой ----------
function navigate(page) {
  // Если пытаемся зайти на страницы продажи и не авторизованы
  const protectedPages = ['coins', 'withdraw-coins', 'usdt-network', 'usdt-pay', 'gram-pay', 'withdraw-usdt-network', 'withdraw-usdt-pay', 'withdraw-gram-pay'];
  
  if (protectedPages.includes(page) && !state.user) {
    openAuth('login');
    return;
  }

  document.querySelectorAll('.page').forEach(p => hide(p));
  const target = $('#page-' + page);
  if (target) show(target);
  if (page === 'history') loadHistory();
}

document.querySelectorAll('[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.nav));
});

async function checkStatus() {
  try {
    const r = await fetch('/api/status');
    const d = await r.json();
    const overlay = document.getElementById('stoppedOverlay');
    
    if (d.stopped) {
      overlay.classList.remove('hidden');
      console.log('Сайт остановлен, показываем табличку');
    } else {
      overlay.classList.add('hidden');
    }
  } catch (e) { 
    console.log('Ошибка статуса', e); 
  }
}

// ---------- пользователь ----------
async function checkMe() {
  try {
    const r = await fetch('/api/me');
    const d = await r.json();
    state.user = d.nickname;
    renderUser();
  } catch (e) {}
}

function renderUser() {
  if (state.user) {
    $('#userInfo').textContent = '👤 ' + state.user;
    hide($('#loginBtn'));
    show($('#logoutBtn'));
  } else {
    $('#userInfo').textContent = '';
    show($('#loginBtn'));
    hide($('#logoutBtn'));
  }
}

$('#logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  state.user = null;
  renderUser();
  navigate('home'); // Возвращаем на главную при выходе
});

// ---------- авторизация ----------
let authMode = 'login';

function openAuth(mode) {
  authMode = mode;
  $('#authTitle').textContent = mode === 'login' ? 'Вход' : 'Регистрация';
  $('#authSubmit').textContent = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
  $('#authSwitch').textContent = mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Вход';
  $('#authError').textContent = '';
  show($('#authModal'));
}

$('#loginBtn').addEventListener('click', () => openAuth('login'));
$('#authSwitch').addEventListener('click', () => openAuth(authMode === 'login' ? 'register' : 'login'));
$('#authClose').addEventListener('click', () => hide($('#authModal')));

$('#authSubmit').addEventListener('click', async () => {
  const nickname = $('#authNick').value.trim();
  const password = $('#authPass').value;
  const errEl = $('#authError');
  errEl.textContent = '';

  const url = authMode === 'login' ? '/api/login' : '/api/register';
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, password })
  });
  const d = await r.json();
  if (!r.ok) {
    errEl.textContent = d.error || 'Ошибка';
    return;
  }
  state.user = d.nickname;
  renderUser();
  hide($('#authModal'));
  $('#authNick').value = '';
  $('#authPass').value = '';
});

// ---------- выбор коина (ОБЫЧНАЯ ПРОДАЖА) ----------
document.querySelectorAll('#page-coins .coin-card').forEach(card => {
  card.addEventListener('click', () => {
    if (!state.user) {
      openAuth('login');
      return;
    }
    state.coin = card.dataset.coin;
    if (state.coin === 'USDT') navigate('usdt-network');
    else navigate('gram-pay');
  });
});

// ---------- сети USDT (ОБЫЧНАЯ ПРОДАЖА) ----------
const USDT_WALLETS = {
  BEP20: '0x4eb35b332de372683aD24d7377abFa53F89451E4',
  TRC20: 'TWCzWBarQUEfDd9pHYUwT5Chxr37e6Cdod',
  ERC20: '0xefF29984a72b0CFf45c57210f7Df8B60340724C5',
  TON: 'UQDm8YmLVhliKT_SLlxw0yvi3rv91FFkxlbDnY0dDZ_Kb5r2',
  SPL: '3J5d7AadxyoVwh97ALxPW1h1m35bSVcgoPY3cHdMuMmR'
};

document.querySelectorAll('#page-usdt-network .network-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.network = btn.dataset.network;
    $('#usdtNetTitle').textContent = 'USDT — сеть ' + state.network;
    $('#usdtWallet').textContent = USDT_WALLETS[state.network];
    navigate('usdt-pay');
  });
});

// ---------- отправка продажи ----------
async function submitSale(coin, network, wallet, phone, bank) {
  if (!phone || !bank) {
    alert('Заполните телефон и банк!');
    return false;
  }
  try {
    const r = await fetch('/api/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coin, network, wallet, phone, bank })
    });
    const d = await r.json();
    if (!r.ok) {
      alert(d.error || 'Ошибка');
      return false;
    }
    return true;
  } catch (e) {
    alert('Ошибка сети!');
    return false;
  }
}

$('#usdtSent').addEventListener('click', async () => {
  const phone = $('#usdtPhone').value.trim();
  const bank = $('#usdtBank').value.trim();
  const wallet = USDT_WALLETS[state.network];
  const ok = await submitSale('USDT', state.network, wallet, phone, bank);
  if (ok) {
    show($('#thanksModal'));
    $('#usdtPhone').value = '';
    $('#usdtBank').value = '';
  }
});

$('#gramSent').addEventListener('click', async () => {
  const phone = $('#gramPhone').value.trim();
  const bank = $('#gramBank').value.trim();
  const wallet = 'UQDm8YmLVhliKT_SLlxw0yvi3rv91FFkxlbDnY0dDZ_Kb5r2';
  const ok = await submitSale('GRAM', '', wallet, phone, bank);
  if (ok) {
    show($('#thanksModal'));
    $('#gramPhone').value = '';
    $('#gramBank').value = '';
  }
});

$('#thanksClose').addEventListener('click', () => {
  hide($('#thanksModal'));
  navigate('home');
});

// ---------- история ----------
async function loadHistory() {
  try {
    const r = await fetch('/api/history');
    const rows = await r.json();
    const list = $('#historyList');
    if (!rows.length) {
      list.innerHTML = '<p>Пока продаж нет</p>';
      return;
    }
    list.innerHTML = rows.map(s => `
      <div class="history-item">
        <b>${s.nickname || 'гость'}</b> продал <b>${s.coin}</b>${s.network ? ' (' + s.network + ')' : ''}
        <br><small>${new Date(s.created_at).toLocaleString('ru-RU')}</small>
      </div>
    `).join('');
  } catch (e) { console.log('Ошибка истории'); }
}

$('#historyBtn').addEventListener('click', () => navigate('history'));

// ---------- поддержка ----------
$('#supportBtn').addEventListener('click', () => show($('#supportModal')));
$('#supportClose').addEventListener('click', () => hide($('#supportModal')));

// ---------- АДМИНКА ----------
let bubbleClicks = 0;
let bubbleTimer = null;

function onBubbleClick() {
  bubbleClicks++;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { bubbleClicks = 0; }, 3000);
  if (bubbleClicks >= 10) {
    bubbleClicks = 0;
    show($('#adminPassModal'));
  }
}

[ $('#bubbleLogo2'), $('#bubbleLogo'), $('#bubbleLogoStopped') ].forEach(el => el.addEventListener('click', () => { navigate('home'); onBubbleClick(); }));
$('#siteName').addEventListener('click', () => navigate('home'));
$('#siteName').style.cursor = 'pointer';

$('#adminPassClose').addEventListener('click', () => hide($('#adminPassModal')));
$('#adminPassSubmit').addEventListener('click', async () => {
  const password = $('#adminPassInput').value;
  const r = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  if (!r.ok) {
    $('#adminPassError').textContent = 'Неверный пароль';
    return;
  }
  $('#adminPassError').textContent = '';
  $('#adminPassInput').value = '';
  hide($('#adminPassModal'));
  show($('#adminPanel'));
  await refreshAdminStatus();
  await loadAdminRates();
  await loadAdminSales();
});

async function refreshAdminStatus() {
  const r = await fetch('/api/admin/stopped');
  if (!r.ok) return;
  const d = await r.json();
  $('#adminStatus').textContent = d.stopped ? 'ОСТАНОВЛЕН' : 'работает';
  $('#toggleStopBtn').textContent = d.stopped ? 'Возобновить работу' : 'Прекратить работу';
}

async function loadAdminRates() {
  const r = await fetch('/api/rates', { credentials: 'include' });
  if (!r.ok) return;
  const rates = await r.json();
  $('#adminUsdtRate').value = rates.usdt;
  $('#adminGramRate').value = rates.gram;
}

$('#saveRatesBtn').addEventListener('click', async () => {
  $('#ratesMessage').textContent = '';
  const r = await fetch('/api/admin/rates', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usdt: $('#adminUsdtRate').value, gram: $('#adminGramRate').value })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { $('#ratesMessage').textContent = d.error || 'Не удалось сохранить курсы'; return; }
  $('#ratesMessage').textContent = 'Курсы сохранены';
  await loadRates();
});

async function loadAdminSales() {
  const list = $('#adminSalesList');
  list.textContent = 'Загрузка…';
  const r = await fetch('/api/admin/sales', { credentials: 'include' });
  if (!r.ok) { list.textContent = 'Не удалось загрузить транзакции. Проверьте авторизацию администратора.'; return; }
  const rows = await r.json();
  if (!rows.length) { list.textContent = 'Заявок пока нет'; return; }
  list.innerHTML = '';
  rows.forEach(sale => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const statusText = sale.status === 'approved' ? 'Продал — в истории' : sale.status === 'rejected' ? 'Не продал — скрыто' : 'Ожидает решения';
    const details = document.createElement('div');
    details.innerHTML = `<b>Заявка #${sale.id}: ${sale.nickname || 'гость'}</b><br>${sale.coin || ''}${sale.network ? ' (' + sale.network + ')' : ''}<br><small>${new Date(sale.created_at).toLocaleString('ru-RU')} · ${statusText}</small>`;
    item.appendChild(details);
    const actions = document.createElement('div');
    actions.className = 'admin-sale-actions';
    [['approved','Продал — оставить'],['rejected','Не продал — убрать'],['pending','На проверку']].forEach(([status,label]) => {
      const btn = document.createElement('button'); btn.textContent = label; btn.className = 'back-btn';
      btn.addEventListener('click', async () => {
        const resp = await fetch(`/api/admin/sales/${sale.id}/status`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) });
        if (!resp.ok) { alert('Не удалось обновить статус заявки'); return; }
        await loadAdminSales();
      });
      actions.appendChild(btn);
    });
    item.appendChild(actions);
    list.appendChild(item);
  });
}
$('#refreshSalesBtn').addEventListener('click', loadAdminSales);

$('#toggleStopBtn').addEventListener('click', async () => {
  const r = await fetch('/api/admin/toggle-stop', { method: 'POST' });
  if (r.ok) {
    window.location.reload(); 
  }
});
$('#adminClose').addEventListener('click', () => hide($('#adminPanel')));

// ==========================================
// ЛОГИКА ДЛЯ ВЫВОДА С САЙТОВ (КРИПТОЙ)
// ==========================================

// 1. Клик по коинам на странице вывода
document.querySelectorAll('#page-withdraw-coins .coin-card').forEach(card => {
  card.addEventListener('click', () => {
    if (!state.user) {
      alert('Для продажи необходимо войти или зарегистрироваться!');
      openAuth('login');
      return;
    }
    const coin = card.dataset.coin;
    if (coin === 'WITHDRAW_USDT') {
      navigate('withdraw-usdt-network');
    } else {
      navigate('withdraw-gram-pay');
    }
  });
});

// 2. Клик по сетям USDT на странице вывода
document.querySelectorAll('#page-withdraw-usdt-network .network-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const network = btn.dataset.network;
    document.getElementById('withdrawUsdtNetTitle').textContent = 'USDT — сеть ' + network;
    document.getElementById('withdrawUsdtWallet').textContent = USDT_WALLETS[network];
    navigate('withdraw-usdt-pay');
  });
});

// 3. Отправка USDT
document.getElementById('withdrawUsdtSent').addEventListener('click', async () => {
  const amount = document.getElementById('withdrawUsdtAmount').value.trim();
  const phone = document.getElementById('withdrawUsdtPhone').value.trim();
  const bank = document.getElementById('withdrawUsdtBank').value.trim();
  
  if (!amount) {
    alert('Укажите сумму вывода!');
    return;
  }

  const wallet = document.getElementById('withdrawUsdtWallet').textContent;
  const ok = await submitSale('USDT', 'Вывод с сайта', wallet, phone, `Банк: ${bank} | Сумма вывода: ${amount}`);
  
  if (ok) {
    show($('#thanksModal'));
    document.getElementById('withdrawUsdtAmount').value = '';
    document.getElementById('withdrawUsdtPhone').value = '';
    document.getElementById('withdrawUsdtBank').value = '';
  }
});

// 4. Отправка GRAM
document.getElementById('withdrawGramSent').addEventListener('click', async () => {
  const amount = document.getElementById('withdrawGramAmount').value.trim();
  const phone = document.getElementById('withdrawGramPhone').value.trim();
  const bank = document.getElementById('withdrawGramBank').value.trim();
  
  if (!amount) {
    alert('Укажите сумму вывода!');
    return;
  }

  const wallet = 'UQDm8YmLVhliKT_SLlxw0yvi3rv91FFkxlbDnY0dDZ_Kb5r2';
  const ok = await submitSale('GRAM', 'Вывод с сайта', wallet, phone, `Банк: ${bank} | Сумма вывода: ${amount}`);
  
  if (ok) {
    show($('#thanksModal'));
    document.getElementById('withdrawGramAmount').value = '';
    document.getElementById('withdrawGramPhone').value = '';
    document.getElementById('withdrawGramBank').value = '';
  }
});
