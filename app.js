/* ===== LEITOR SIMPLES - PWA ===== */

// ===== ESTADO =====
let articles = [];
let currentArticleId = null;
let settings = {
  fontSize: 100,
  lineHeight: 1.8,
  theme: 'dark',
  textWidth: 'normal',
  fontFamily: 'system'
};
let speechUtterance = null;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  applySettings();
  showView('list');
  setupSwipeGestures();
});

// ===== PERSISTÊNCIA =====
function loadData() {
  try {
    const saved = localStorage.getItem('leitor-articles');
    if (saved) articles = JSON.parse(saved);
    const savedSettings = localStorage.getItem('leitor-settings');
    if (savedSettings) settings = JSON.parse(savedSettings);
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
  }
}

function saveData() {
  try {
    localStorage.setItem('leitor-articles', JSON.stringify(articles));
    localStorage.setItem('leitor-settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Erro ao salvar dados:', e);
  }
}

// ===== NAVEGAÇÃO =====
function showView(view) {
  // Esconde todas as views
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('articlesList').style.display = 'none';
  document.getElementById('readerView').style.display = 'none';
  document.getElementById('addView').style.display = 'none';
  document.getElementById('settingsView').style.display = 'none';

  // Atualiza navegação
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-btn[data-view="${view}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Controles visuais
  const fab = document.getElementById('fabAdd');
  const readerActions = document.getElementById('readerActions');

  switch (view) {
    case 'list':
      renderArticlesList();
      fab.classList.remove('hidden');
      readerActions.style.display = 'none';
      stopSpeech();
      break;
    case 'add':
      document.getElementById('addView').style.display = 'block';
      fab.classList.add('hidden');
      readerActions.style.display = 'none';
      stopSpeech();
      break;
    case 'settings':
      document.getElementById('settingsView').style.display = 'block';
      fab.classList.add('hidden');
      readerActions.style.display = 'none';
      stopSpeech();
      break;
    case 'reader':
      document.getElementById('readerView').style.display = 'block';
      fab.classList.add('hidden');
      readerActions.style.display = 'flex';
      break;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== LISTA DE MATÉRIAS =====
function renderArticlesList() {
  const list = document.getElementById('articlesList');
  const empty = document.getElementById('emptyState');

  if (articles.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  list.style.display = 'flex';

  // Ordena por data (mais recente primeiro)
  const sorted = [...articles].sort((a, b) => b.date - a.date);

  list.innerHTML = sorted.map(article => `
    <div class="article-card" onclick="openArticle('${article.id}')">
      <h3>${escapeHtml(article.title)}</h3>
      <div class="card-meta">
        <span>${article.author || 'Sem autor'}</span>
        <span>${formatDate(article.date)}</span>
      </div>
      <div class="card-preview">${escapeHtml(article.text.substring(0, 120))}...</div>
    </div>
  `).join('');
}

// ===== ADICIONAR MATÉRIA =====
function saveArticle() {
  const title = document.getElementById('articleTitle').value.trim();
  const author = document.getElementById('articleAuthor').value.trim();
  const text = document.getElementById('articleText').value.trim();

  if (!title) {
    showToast('⚠️ Digite um título');
    document.getElementById('articleTitle').focus();
    return;
  }
  if (!text) {
    showToast('⚠️ Cole o texto da matéria');
    document.getElementById('articleText').focus();
    return;
  }

  const article = {
    id: 'art_' + Date.now(),
    title,
    author,
    text: simplifyText(text),
    date: Date.now()
  };

  articles.push(article);
  saveData();

  // Limpa formulário
  document.getElementById('articleTitle').value = '';
  document.getElementById('articleAuthor').value = '';
  document.getElementById('articleText').value = '';

  showToast('✅ Matéria salva!');
  showView('list');
}

// ===== SIMPLIFICAÇÃO DE TEXTO =====
function simplifyText(text) {
  // Remove espaços excessivos
  text = text.replace(/\s+/g, ' ').trim();

  // Remove URLs visíveis
  text = text.replace(/https?:\/\/[^\s]+/g, '');

  // Remove caracteres estranhos repetidos
  text = text.replace(/[!?]{3,}/g, '!!!');
  text = text.replace(/\.{4,}/g, '...');

  // Normaliza quebras de parágrafo
  text = text.replace(/\n{3,}/g, '\n\n');

  return text;
}

// ===== ABRIR MATÉRIA =====
function openArticle(id) {
  const article = articles.find(a => a.id === id);
  if (!article) return;

  currentArticleId = id;

  document.getElementById('readerTitle').textContent = article.title;
  document.getElementById('readerMeta').textContent = 
    `${article.author || 'Sem autor'} • ${formatDate(article.date)}`;

  // Converte quebras de linha em parágrafos
  const paragraphs = article.text.split('\n').filter(p => p.trim());
  document.getElementById('readerBody').innerHTML = paragraphs
    .map(p => `<p>${escapeHtml(p)}</p>`)
    .join('');

  showView('reader');
}

// ===== AÇÕES DO LEITOR =====
function backToList() {
  stopSpeech();
  showView('list');
}

function deleteCurrentArticle() {
  if (!currentArticleId) return;

  if (confirm('Tem certeza que deseja excluir esta matéria?')) {
    articles = articles.filter(a => a.id !== currentArticleId);
    saveData();
    currentArticleId = null;
    showToast('🗑️ Matéria excluída');
    showView('list');
  }
}

function shareArticle() {
  const article = articles.find(a => a.id === currentArticleId);
  if (!article) return;

  const shareData = {
    title: article.title,
    text: article.text.substring(0, 200) + '...',
  };

  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    // Copia para clipboard
    const fullText = `${article.title}\n\n${article.text}`;
    navigator.clipboard.writeText(fullText).then(() => {
      showToast('📋 Texto copiado!');
    }).catch(() => {
      showToast('❌ Não foi possível copiar');
    });
  }
}

function speakArticle() {
  const article = articles.find(a => a.id === currentArticleId);
  if (!article) return;

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    showToast('🔇 Leitura pausada');
    return;
  }

  speechUtterance = new SpeechSynthesisUtterance(article.text);
  speechUtterance.lang = 'pt-BR';
  speechUtterance.rate = 0.9;
  speechUtterance.pitch = 1;

  speechUtterance.onend = () => {
    showToast('✅ Leitura finalizada');
  };

  window.speechSynthesis.speak(speechUtterance);
  showToast('🔊 Lendo matéria...');
}

function stopSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ===== CONFIGURAÇÕES DE ACESSIBILIDADE =====
function changeFontSize(delta) {
  settings.fontSize = Math.max(80, Math.min(200, settings.fontSize + (delta * 10)));
  applySettings();
  saveData();
}

function setLineHeight(value) {
  settings.lineHeight = value;
  applySettings();
  saveData();
}

function setTextWidth(width) {
  settings.textWidth = width;
  applySettings();
  saveData();
}

function setTheme(theme) {
  settings.theme = theme;
  applySettings();
  saveData();

  // Atualiza meta theme-color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const colors = {
    dark: '#0f172a',
    light: '#f8fafc',
    sepia: '#f4ecd8',
    contrast: '#000000'
  };
  if (metaTheme) metaTheme.content = colors[theme] || '#0f172a';
}

function setFontFamily(font) {
  settings.fontFamily = font;
  applySettings();
  saveData();
}

function applySettings() {
  const body = document.body;
  const root = document.documentElement;

  // Fonte
  root.style.setProperty('--font-size', settings.fontSize + '%');
  document.getElementById('fontSizeValue').textContent = settings.fontSize + '%';

  // Espaçamento
  root.style.setProperty('--line-height', settings.lineHeight);

  // Largura
  body.classList.remove('width-narrow', 'width-wide', 'width-normal');
  body.classList.add('width-' + settings.textWidth);

  // Tema
  body.classList.remove('theme-light', 'theme-sepia', 'theme-contrast');
  if (settings.theme !== 'dark') {
    body.classList.add('theme-' + settings.theme);
  }

  // Fonte
  body.classList.remove('font-dyslexic', 'font-serif');
  if (settings.fontFamily !== 'system') {
    body.classList.add('font-' + settings.fontFamily);
  }

  // Atualiza botões ativos
  updateActiveButtons();
}

function updateActiveButtons() {
  // Line height
  document.querySelectorAll('.line-height-controls .btn-pill').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.includes('Compacto') && settings.lineHeight === 1.4) btn.classList.add('active');
    if (btn.textContent.includes('Normal') && settings.lineHeight === 1.8) btn.classList.add('active');
    if (btn.textContent.includes('Amplo') && settings.lineHeight === 2.4) btn.classList.add('active');
  });

  // Width
  document.querySelectorAll('.width-controls .btn-pill').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.includes('Estreita') && settings.textWidth === 'narrow') btn.classList.add('active');
    if (btn.textContent.includes('Normal') && settings.textWidth === 'normal') btn.classList.add('active');
    if (btn.textContent.includes('Larga') && settings.textWidth === 'wide') btn.classList.add('active');
  });

  // Theme
  document.querySelectorAll('.theme-controls .btn-pill').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.includes('Escuro') && settings.theme === 'dark') btn.classList.add('active');
    if (btn.textContent.includes('Claro') && settings.theme === 'light') btn.classList.add('active');
    if (btn.textContent.includes('Sépia') && settings.theme === 'sepia') btn.classList.add('active');
    if (btn.textContent.includes('Contraste') && settings.theme === 'contrast') btn.classList.add('active');
  });

  // Font
  document.querySelectorAll('.font-family-controls .btn-pill').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.includes('Padrão') && settings.fontFamily === 'system') btn.classList.add('active');
    if (btn.textContent.includes('Dislexia') && settings.fontFamily === 'dyslexic') btn.classList.add('active');
    if (btn.textContent.includes('Serifada') && settings.fontFamily === 'serif') btn.classList.add('active');
  });
}

function clearAllArticles() {
  if (confirm('Tem certeza que deseja apagar TODAS as matérias? Esta ação não pode ser desfeita.')) {
    articles = [];
    saveData();
    showToast('🗑️ Todas as matérias foram removidas');
    showView('list');
  }
}

// ===== GESTOS SWIPE =====
function setupSwipeGestures() {
  let startX = 0;
  let startY = 0;
  const main = document.getElementById('mainContent');

  main.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  main.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = startX - endX;
    const diffY = startY - endY;

    // Só processa se for swipe horizontal significativo
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 80) {
      const views = ['list', 'add', 'settings'];
      const current = document.querySelector('.nav-btn.active')?.dataset.view || 'list';
      const currentIndex = views.indexOf(current);

      if (diffX > 0 && currentIndex < views.length - 1) {
        // Swipe esquerda -> próxima aba
        showView(views[currentIndex + 1]);
      } else if (diffX < 0 && currentIndex > 0) {
        // Swipe direita -> aba anterior
        showView(views[currentIndex - 1]);
      }
    }
  }, { passive: true });
}

// ===== UTILITÁRIOS =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // Menos de 1 minuto
  if (diff < 60000) return 'Agora';
  // Menos de 1 hora
  if (diff < 3600000) return Math.floor(diff / 60000) + ' min atrás';
  // Menos de 24h
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' h atrás';

  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW registrado:', reg.scope))
      .catch(err => console.log('SW erro:', err));
  });
}
