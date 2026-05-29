// ============================================
// FLASHCARDS ADMIN PANEL - APP.JS
// ============================================

let cardsData = [];       // { id, concurso, materia, assunto, frente, verso, createdAt }
let subjectsData = [];    // { key: "deck||materia", concurso, materia }
let topicsData = [];      // { key: "deck||materia||assunto", concurso, materia, assunto }
let deckCategories = {};  // { concursoName: categoryId }
let firebaseDecks = [];
let firebaseProducts = {};
let editingCard = null; // { deckId, subjectId, topicId, cardId }

// ============================================
// INICIALIZAÇÃO
// ============================================

function saveDrafts() {
  localStorage.setItem('flashcards_drafts_cards', JSON.stringify(cardsData));
  localStorage.setItem('flashcards_drafts_subjects', JSON.stringify(subjectsData));
  localStorage.setItem('flashcards_drafts_topics', JSON.stringify(topicsData));
  localStorage.setItem('flashcards_drafts_categories', JSON.stringify(deckCategories));
}

function loadDrafts() {
  try {
    const savedCards      = localStorage.getItem('flashcards_drafts_cards');
    const savedSubjects   = localStorage.getItem('flashcards_drafts_subjects');
    const savedTopics     = localStorage.getItem('flashcards_drafts_topics');
    const savedCategories = localStorage.getItem('flashcards_drafts_categories');
    if (savedCards)      cardsData      = JSON.parse(savedCards);
    if (savedSubjects)   subjectsData   = JSON.parse(savedSubjects);
    if (savedTopics)     topicsData     = JSON.parse(savedTopics);
    if (savedCategories) deckCategories = JSON.parse(savedCategories);
  } catch (e) {
    console.warn('Erro ao carregar rascunhos:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadDrafts();
  setupEventListeners();
  renderSubjects();
  renderTopics();
  renderCardsAdicionados();
  updateCardsCount();
});

function setupEventListeners() {
  document.getElementById('frente').addEventListener('input', updatePreview);
  document.getElementById('verso').addEventListener('input', updatePreview);
}

// ============================================
// GERENCIAMENTO DE ABAS
// ============================================

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');
}

// ============================================
// EDITOR E PREVIEW
// ============================================

function updatePreview() {
  renderMath('frente');
  renderMath('verso');
}

function renderMath(fieldId) {
  const textarea = document.getElementById(fieldId);
  const preview  = document.getElementById(`preview-${fieldId}`);
  const text = textarea.value;
  if (!text.trim()) { preview.innerHTML = ''; return; }

  let html = text
    .replace(/\$\$([\s\S]*?)\$\$/g, '<div class="math-block" data-formula="$1">$$...$$</div>')
    .replace(/\$([\s\S]*?)\$/g, '<span class="math-inline" data-formula="$1">$...$</span>')
    .replace(/\n/g, '<br>');
  preview.innerHTML = html;

  if (typeof katex !== 'undefined') {
    document.querySelectorAll('.math-block, .math-inline').forEach(el => {
      const formula = el.getAttribute('data-formula');
      try {
        katex.render(formula, el, { displayMode: el.classList.contains('math-block') });
      } catch (e) {}
    });
  }
}

// ============================================
// GERENCIAR MATÉRIAS
// ============================================

function onConcursoSelectChange() {
  const val = document.getElementById('concursoSelect').value;
  document.getElementById('novoConcursoWrapper').style.display = val === '__novo__' ? 'block' : 'none';
  if (val === '__novo__') document.getElementById('novoConcurso').focus();
  const catSel = document.getElementById('deckCategorySelect');
  catSel.value = (val && val !== '__novo__') ? (deckCategories[val] || '') : '';
}

function onDeckCategoryChange() {
  const val = document.getElementById('concursoSelect').value;
  const cat = document.getElementById('deckCategorySelect').value;
  const deckName = val === '__novo__'
    ? document.getElementById('novoConcurso').value.trim()
    : val;
  if (deckName) {
    deckCategories[deckName] = cat;
    saveDrafts();
  }
}

function addSubject() {
  const selectVal = document.getElementById('concursoSelect').value;
  let concurso;
  if (selectVal === '__novo__') {
    concurso = document.getElementById('novoConcurso').value.trim();
    if (!concurso) { showStatus('Digite o nome do novo deck!', 'warning'); return; }
    const duplicate = subjectsData.find(s => s.concurso.toLowerCase() === concurso.toLowerCase());
    if (duplicate) { showStatus(`Deck "${duplicate.concurso}" já existe! Selecione-o na lista.`, 'warning'); return; }
  } else if (selectVal) {
    concurso = selectVal;
  } else {
    showStatus('Selecione ou crie um deck!', 'warning');
    return;
  }

  const materia = document.getElementById('novaMateria').value.trim();
  if (!materia) { showStatus('Preencha o nome da matéria!', 'warning'); return; }

  const key = `${concurso}||${materia.toLowerCase()}`;
  if (subjectsData.find(s => s.key === key)) { showStatus('Essa matéria já existe nesse deck!', 'warning'); return; }

  subjectsData.push({ key, concurso, materia });
  document.getElementById('concursoSelect').value = '';
  document.getElementById('novoConcurso').value = '';
  document.getElementById('novoConcursoWrapper').style.display = 'none';
  document.getElementById('novaMateria').value = '';
  saveDrafts();
  renderSubjects();
  renderTopics();
  showStatus(`✅ Matéria "${materia}" adicionada ao deck "${concurso}"!`, 'success');
}

function removeSubject(key) {
  subjectsData = subjectsData.filter(s => s.key !== key);
  topicsData   = topicsData.filter(t => !t.key.startsWith(key + '||'));
  cardsData    = cardsData.filter(c => {
    const s = subjectsData.find(s => s.concurso === c.concurso && s.materia === c.materia);
    return s !== undefined || !key.includes(c.materia.toLowerCase());
  });
  saveDrafts();
  renderSubjects();
  renderTopics();
  renderCardsAdicionados();
  updateCardsCount();
}

function renderSubjects() {
  const container      = document.getElementById('subjectsList');
  const concursoSelect = document.getElementById('concursoSelect');

  container.innerHTML = subjectsData.map(s => `
    <div style="display:flex; align-items:center; gap:6px; background:var(--bg-primary); padding:6px 12px; border-radius:20px; border:1px solid var(--bg-tertiary);">
      <span style="font-size:12px; color:var(--text-secondary);">${s.concurso}</span>
      <span style="color:var(--bg-tertiary)">›</span>
      <span style="font-size:13px; color:var(--text-primary); font-weight:600;">${s.materia}</span>
      <button onclick="removeSubject('${s.key}')" style="background:none; border:none; color:var(--error); cursor:pointer; font-size:14px; padding:0 2px;">✕</button>
    </div>
  `).join('');

  const uniqueDecks = [...new Set(subjectsData.map(s => s.concurso))];
  concursoSelect.innerHTML = '<option value="">-- Selecione um deck --</option>';
  uniqueDecks.forEach(deck => {
    const option = document.createElement('option');
    option.value = deck;
    option.textContent = deck;
    concursoSelect.appendChild(option);
  });
  const novoOpt = document.createElement('option');
  novoOpt.value = '__novo__';
  novoOpt.textContent = '＋ Novo deck...';
  concursoSelect.appendChild(novoOpt);
}

// ============================================
// GERENCIAR ASSUNTOS (TÓPICOS)
// ============================================

function addTopic() {
  const materiaKey = document.getElementById('topicMateriaSelect').value;
  if (!materiaKey) { showStatus('Selecione uma matéria!', 'warning'); return; }

  const assunto = document.getElementById('novoAssunto').value.trim();
  if (!assunto) { showStatus('Preencha o nome do assunto!', 'warning'); return; }

  const subject = subjectsData.find(s => s.key === materiaKey);
  if (!subject) { showStatus('Matéria não encontrada!', 'warning'); return; }

  const key = `${materiaKey}||${assunto.toLowerCase()}`;
  if (topicsData.find(t => t.key === key)) { showStatus('Esse assunto já existe nessa matéria!', 'warning'); return; }

  topicsData.push({ key, concurso: subject.concurso, materia: subject.materia, assunto });
  document.getElementById('novoAssunto').value = '';
  saveDrafts();
  renderTopics();
  showStatus(`✅ Assunto "${assunto}" criado em "${subject.materia}"!`, 'success');
}

function removeTopic(key) {
  topicsData = topicsData.filter(t => t.key !== key);
  saveDrafts();
  renderTopics();
  renderCardsAdicionados();
  updateCardsCount();
}

function renderTopics() {
  const container        = document.getElementById('topicsList');
  const topicMateriaSelect = document.getElementById('topicMateriaSelect');
  const assuntoSelect    = document.getElementById('assuntoSelect');

  // Atualiza o select de matérias no painel de assuntos
  topicMateriaSelect.innerHTML = '<option value="">-- Selecione uma matéria --</option>';
  subjectsData.forEach(s => {
    const option = document.createElement('option');
    option.value = s.key;
    option.textContent = `${s.concurso} › ${s.materia}`;
    topicMateriaSelect.appendChild(option);
  });

  // Renderiza chips dos assuntos
  container.innerHTML = topicsData.map(t => `
    <div style="display:flex; align-items:center; gap:6px; background:var(--bg-primary); padding:6px 12px; border-radius:20px; border:1px solid var(--bg-tertiary);">
      <span style="font-size:12px; color:var(--text-secondary);">${t.concurso} › ${t.materia}</span>
      <span style="color:var(--bg-tertiary)">›</span>
      <span style="font-size:13px; color:var(--accent); font-weight:600;">${t.assunto}</span>
      <button onclick="removeTopic('${t.key}')" style="background:none; border:none; color:var(--error); cursor:pointer; font-size:14px; padding:0 2px;">✕</button>
    </div>
  `).join('');

  // Atualiza o select de assuntos no formulário de cards
  assuntoSelect.innerHTML = '<option value="">-- Selecione um assunto --</option>';
  topicsData.forEach(t => {
    const option = document.createElement('option');
    option.value = t.key;
    option.textContent = `${t.concurso} › ${t.materia} › ${t.assunto}`;
    assuntoSelect.appendChild(option);
  });
}

// ============================================
// TECLADO MATEMÁTICO
// ============================================

let activeField = null;
let mathModalConfig = null;
let activeModalInput = null;

const MATH_MODAL_CONFIGS = {
  frac: {
    fields: [
      { id: 'modalField1', label: 'Numerador', placeholder: 'Digite o valor...' },
      { id: 'modalField2', label: 'Denominador', placeholder: 'Digite o denominador...' }
    ],
    build: (vals) => `\\frac{${vals[0]}}{${vals[1]}}`
  },
  pow: {
    fields: [
      { id: 'modalField1', label: 'Base', placeholder: 'Digite o valor...' },
      { id: 'modalField2', label: 'Expoente', placeholder: '2', defaultValue: '2' }
    ],
    build: (vals) => vals[0] ? `${vals[0]}^{${vals[1] || '2'}}` : `^{${vals[1] || '2'}}`
  },
  sqrt: {
    fields: [
      { id: 'modalField1', label: 'Índice', placeholder: 'Deixe vazio para raiz quadrada' },
      { id: 'modalField2', label: 'Radicando', placeholder: 'Digite o valor...' }
    ],
    build: (vals) => vals[0] ? `\\sqrt[${vals[0]}]{${vals[1]}}` : `\\sqrt{${vals[1]}}`
  },
  log: {
    fields: [
      { id: 'modalField1', label: 'Base (opcional)', placeholder: 'Ex: 2, 10 — vazio = log sem base' },
      { id: 'modalField2', label: 'Argumento (opcional)', placeholder: 'Ex: x, n — vazio = só o log' }
    ],
    build: (vals) => {
      const base = vals[0].trim();
      const arg  = vals[1].trim();
      const cmd  = base ? `\\log_{${base}}` : `\\log`;
      return arg ? `${cmd}(${arg})` : cmd;
    }
  }
};

function openMathModal(type) {
  if (!activeField) return;
  document.getElementById('mathKeyboard').style.display = 'none';
  mathModalConfig = MATH_MODAL_CONFIGS[type];
  activeModalInput = null;

  const fieldsContainer = document.getElementById('mathModalFields');
  fieldsContainer.innerHTML = mathModalConfig.fields.map(f => `
    <div class="math-modal-field">
      <label>${f.label}</label>
      <input type="text" id="${f.id}" placeholder="${f.placeholder}" value="${f.defaultValue || ''}">
    </div>
  `).join('');

  fieldsContainer.querySelectorAll('input').forEach(input => {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmMathModal(); });
    input.addEventListener('input', updateModalPreview);
    input.addEventListener('focus', () => { activeModalInput = input.id; });
  });

  document.getElementById('mathModal').style.display = 'flex';
  const firstInput = document.getElementById(mathModalConfig.fields[0].id);
  firstInput.focus();
  activeModalInput = mathModalConfig.fields[0].id;
  updateModalPreview();
}

function confirmMathModal() {
  if (!mathModalConfig || !activeField) return;
  const values = mathModalConfig.fields.map(f => document.getElementById(f.id).value.trim());
  const latex = mathModalConfig.build(values);
  closeMathModal();
  insertMathKey(latex);
}

function closeMathModal() {
  document.getElementById('mathModal').style.display = 'none';
  mathModalConfig = null;
  activeModalInput = null;
  if (activeField) {
    document.getElementById('mathKeyboard').style.display = 'block';
    updateKeyboardPreview();
  }
}

function updateModalPreview() {
  if (!mathModalConfig) return;
  const preview = document.getElementById('mathModalPreview');
  const values = mathModalConfig.fields.map(f => {
    const el = document.getElementById(f.id);
    return el ? el.value : '';
  });

  if (values.every(v => !v.trim())) {
    preview.innerHTML = '<span class="modal-preview-placeholder">Preencha os campos para ver o resultado</span>';
    return;
  }

  const filled = values.map(v => v.trim() || '\\square');
  const latex = mathModalConfig.build(filled);

  if (typeof katex !== 'undefined') {
    try {
      katex.render(latex, preview, { displayMode: true, throwOnError: false });
    } catch (e) {
      preview.textContent = latex;
    }
  } else {
    preview.textContent = `$${latex}$`;
  }
}

function insertMathKeyInModal(latex, cursorOffset = 0) {
  if (!activeModalInput) return;
  const input = document.getElementById(activeModalInput);
  if (!input) return;
  const start = input.selectionStart;
  const end   = input.selectionEnd;
  input.value = input.value.slice(0, start) + latex + input.value.slice(end);
  input.selectionStart = input.selectionEnd = start + latex.length - cursorOffset;
  input.focus();
  updateModalPreview();
}

function modalBackspace() {
  if (!activeModalInput) return;
  const input = document.getElementById(activeModalInput);
  if (!input) return;
  const start = input.selectionStart;
  const end   = input.selectionEnd;
  if (start === end && start > 0) {
    input.value = input.value.slice(0, start - 1) + input.value.slice(start);
    input.selectionStart = input.selectionEnd = start - 1;
  } else if (start !== end) {
    input.value = input.value.slice(0, start) + input.value.slice(end);
    input.selectionStart = input.selectionEnd = start;
  }
  input.focus();
  updateModalPreview();
}

function handleModalOverlayClick(e) {
  if (e.target === document.getElementById('mathModal')) closeMathModal();
}

function switchMathTab(name) {
  document.querySelectorAll('.math-kb-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
  });
  document.querySelectorAll('.math-panel').forEach(p => {
    p.classList.toggle('active', p.id === `mathPanel-${name}`);
  });
}

function mathKeyBackspace() {
  if (!activeField) return;
  const textarea = document.getElementById(activeField);
  const start = textarea.selectionStart;
  const end   = textarea.selectionEnd;
  if (start === end && start > 0) {
    textarea.value = textarea.value.slice(0, start - 1) + textarea.value.slice(start);
    textarea.selectionStart = textarea.selectionEnd = start - 1;
  } else if (start !== end) {
    textarea.value = textarea.value.slice(0, start) + textarea.value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start;
  }
  textarea.focus();
  updatePreview();
  updateKeyboardPreview();
}

function updateKeyboardPreview() {
  const preview = document.getElementById('kbPreview');
  if (!preview || !activeField) return;
  const textarea = document.getElementById(activeField);
  if (!textarea) return;
  const text = textarea.value;
  if (!text.trim()) {
    preview.innerHTML = '<span class="kb-preview-placeholder">Preview aparece aqui...</span>';
    return;
  }
  if (typeof katex === 'undefined') return;
  const html = text
    .replace(/\$\$([\s\S]*?)\$\$/g, '<span class="kb-m-block" data-f="$1"></span>')
    .replace(/\$([\s\S]*?)\$/g, '<span class="kb-m-inline" data-f="$1"></span>');
  preview.innerHTML = html;
  preview.querySelectorAll('.kb-m-block, .kb-m-inline').forEach(el => {
    const formula = el.getAttribute('data-f');
    try {
      katex.render(formula, el, { displayMode: el.classList.contains('kb-m-block'), throwOnError: false });
    } catch(e) {}
  });
}

function toggleMathKeyboard(field) {
  const keyboard  = document.getElementById('mathKeyboard');
  const formGroup = document.getElementById(field).closest('.form-group');

  if (activeField === field && keyboard.style.display !== 'none') {
    keyboard.style.display = 'none';
    activeField = null;
    return;
  }

  activeField = field;
  formGroup.appendChild(keyboard);
  keyboard.style.display = 'block';
  document.getElementById(field).focus();
  updateKeyboardPreview();
}

function closeMathKeyboard() {
  document.getElementById('mathKeyboard').style.display = 'none';
  activeField = null;
}

function insertMathKey(latex, cursorBack = 0) {
  if (!activeField) return;

  const textarea = document.getElementById(activeField);
  const start    = textarea.selectionStart;
  const end      = textarea.selectionEnd;
  const value    = textarea.value;

  const beforeCursor = value.slice(0, start);
  const dollarCount  = (beforeCursor.match(/\$/g) || []).length;
  const insideFormula = dollarCount % 2 === 1;

  let insertion, effectiveCursorBack;
  if (insideFormula) {
    insertion = latex;
    effectiveCursorBack = cursorBack;
  } else {
    insertion = `$${latex}$`;
    effectiveCursorBack = cursorBack > 0 ? cursorBack + 1 : 0;
  }

  const newCursorPos = start + insertion.length - effectiveCursorBack;
  textarea.value = value.slice(0, start) + insertion + value.slice(end);
  textarea.selectionStart = textarea.selectionEnd = newCursorPos;
  textarea.focus();
  updatePreview();
  updateKeyboardPreview();
}

// ============================================
// CRIAÇÃO DE CARDS
// ============================================

function addCard() {
  const selectedKey = document.getElementById('assuntoSelect').value;
  const frente = document.getElementById('frente').value.trim();
  const verso  = document.getElementById('verso').value.trim();

  if (!selectedKey) {
    showStatus('Selecione um assunto antes de adicionar o card!', 'warning');
    return;
  }
  if (!frente || !verso) {
    showStatus('Preencha a frente e o verso do card!', 'warning');
    return;
  }

  const topic = topicsData.find(t => t.key === selectedKey);
  if (!topic) {
    showStatus('Assunto não encontrado!', 'warning');
    return;
  }

  const card = {
    id: Date.now(),
    concurso: topic.concurso,
    materia: topic.materia,
    assunto: topic.assunto,
    frente,
    verso,
    createdAt: new Date().toLocaleString('pt-BR')
  };

  cardsData.push(card);
  saveDrafts();
  showStatus('✅ Card adicionado com sucesso!', 'success');
  resetForm();
  renderCardsAdicionados();
  updateCardsCount();
}

function resetForm() {
  const selectedAssunto = document.getElementById('assuntoSelect').value;
  document.getElementById('cardForm').reset();
  document.getElementById('assuntoSelect').value = selectedAssunto;
  document.getElementById('preview-frente').innerHTML = '';
  document.getElementById('preview-verso').innerHTML = '';
}

// ============================================
// RASCUNHOS - renderização 4 níveis
// ============================================

let draftCollapsedDecks    = {};
let draftCollapsedSubjects = {};
let draftCollapsedTopics   = {};
let draftDeckPrices        = {};

function setDraftDeckPrice(deckId, value) { draftDeckPrices[deckId] = value; }
function toggleDraftDeck(deckId) { draftCollapsedDecks[deckId] = !draftCollapsedDecks[deckId]; renderCardsAdicionados(); }
function toggleDraftSubject(deckId, subjectId) { const k = `${deckId}|${subjectId}`; draftCollapsedSubjects[k] = !draftCollapsedSubjects[k]; renderCardsAdicionados(); }
function toggleDraftTopic(deckId, subjectId, topicId) { const k = `${deckId}|${subjectId}|${topicId}`; draftCollapsedTopics[k] = !draftCollapsedTopics[k]; renderCardsAdicionados(); }

function renderCardsAdicionados() {
  const container = document.getElementById('cardsAdicionados');
  container.innerHTML = '';

  if (cardsData.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:30px;">Nenhum card em rascunho.<br>Vá para ➕ Criar Card para adicionar.</p>';
    return;
  }

  // Agrupa: deck → materia → assunto → cards
  const grouped = {};
  cardsData.forEach(card => {
    const dk = card.concurso;
    const sk = card.materia;
    const tk = card.assunto || '__sem_assunto__';
    if (!grouped[dk]) grouped[dk] = {};
    if (!grouped[dk][sk]) grouped[dk][sk] = {};
    if (!grouped[dk][sk][tk]) grouped[dk][sk][tk] = [];
    grouped[dk][sk][tk].push(card);
  });

  let html = '';
  Object.keys(grouped).forEach(deck => {
    const deckId = deck.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const isCollapsed = draftCollapsedDecks[deckId] !== false;
    const cardsCount  = Object.values(grouped[deck]).reduce((sum, subjects) =>
      sum + Object.values(subjects).reduce((s2, cards) => s2 + cards.length, 0), 0);
    const icon = isCollapsed ? '▶' : '▼';

    html += `<div class="fb-deck" style="margin-bottom:12px;">
      <div class="fb-deck-header" style="cursor:pointer; padding:10px 12px; background:var(--bg-secondary); border-radius:6px; font-weight:bold; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:8px; flex:1; cursor:pointer;" onclick="toggleDraftDeck('${deckId}')">
          <span style="width:20px;">${icon}</span>
          <span>${deck} (${cardsCount} cards)</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="display:flex; align-items:center; gap:4px; background:var(--bg-primary); border:1px solid var(--bg-tertiary); border-radius:6px; padding:3px 8px;">
            <span style="font-size:11px; color:var(--text-secondary); white-space:nowrap;">R$</span>
            <input type="number" min="0" step="0.01" placeholder="0,00" id="price_${deckId}"
              value="${draftDeckPrices[deck] || ''}"
              onclick="event.stopPropagation()"
              style="width:60px; background:transparent; border:none; outline:none; color:var(--text-primary); font-size:12px; font-weight:bold;">
          </div>
          <button class="btn" style="padding:4px 10px; font-size:12px; background:#16a34a; color:#fff; border:none; border-radius:3px; cursor:pointer;" onclick="uploadDeckToFirebase('${deck}')" title="Subir para Firebase">☁️ Firebase</button>
          <button class="btn" style="padding:4px 10px; font-size:12px; background:#6366f1; color:#fff; border:none; border-radius:3px; cursor:pointer;" onclick="exportDeckToJson('${deck}')" title="Baixar JSON">📥 JSON</button>
        </div>
      </div>`;

    if (!isCollapsed) {
      Object.keys(grouped[deck]).forEach(subject => {
        const subjectId  = subject.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const subjectKey = `${deckId}|${subjectId}`;
        const isSubjectCollapsed = draftCollapsedSubjects[subjectKey] !== false;
        const subjectCardsCount  = Object.values(grouped[deck][subject]).reduce((s, cards) => s + cards.length, 0);
        const subIcon = isSubjectCollapsed ? '▶' : '▼';

        html += `<div style="padding-left:16px; margin-top:8px;">
          <div style="cursor:pointer; padding:8px 10px; background:var(--bg-tertiary); border-radius:6px; font-weight:600; display:flex; align-items:center; gap:8px;" onclick="toggleDraftSubject('${deckId}', '${subjectId}')">
            <span style="width:16px;">${subIcon}</span>
            <span style="color:var(--text-primary);">📁 ${subject}</span>
            <span style="font-size:12px; color:var(--text-secondary);">(${subjectCardsCount})</span>
          </div>`;

        if (!isSubjectCollapsed) {
          Object.keys(grouped[deck][subject]).forEach(assunto => {
            const topicId  = assunto.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const topicKey = `${deckId}|${subjectId}|${topicId}`;
            const isTopicCollapsed = draftCollapsedTopics[topicKey] !== false;
            const topicCards = grouped[deck][subject][assunto];
            const topIcon = isTopicCollapsed ? '▶' : '▼';
            const assuntoLabel = assunto === '__sem_assunto__' ? '(sem assunto)' : assunto;

            html += `<div style="padding-left:16px; margin-top:6px;">
              <div style="cursor:pointer; padding:6px 10px; background:rgba(93,214,44,0.06); border-radius:6px; font-weight:500; display:flex; align-items:center; gap:8px; border:1px solid rgba(93,214,44,0.15);" onclick="toggleDraftTopic('${deckId}', '${subjectId}', '${topicId}')">
                <span style="width:14px;">${topIcon}</span>
                <span style="color:var(--accent);">📂 ${assuntoLabel}</span>
                <span style="font-size:12px; color:var(--text-secondary);">(${topicCards.length})</span>
              </div>`;

            if (!isTopicCollapsed) {
              topicCards.forEach(card => {
                html += `<div class="card-item" style="margin-top:6px; margin-left:12px;">
                  <div class="card-header">
                    <div style="font-size:12px; color:var(--text-secondary);">${card.materia} › ${card.assunto || ''}</div>
                    <div class="card-actions" style="gap:4px;">
                      <button class="btn-edit" onclick="editCard(${card.id})">Editar</button>
                      <button class="btn-delete" onclick="deleteCardFromList(${card.id})">Deletar</button>
                    </div>
                  </div>
                  <div class="card-content" style="font-size:13px;">
                    <div class="card-content-label">Frente</div>
                    <div class="card-content-text" style="max-height:60px; overflow:hidden;">${escapeHtml(card.frente)}</div>
                  </div>
                  <div class="card-content" style="font-size:13px;">
                    <div class="card-content-label">Verso</div>
                    <div class="card-content-text" style="max-height:60px; overflow:hidden;">${escapeHtml(card.verso)}</div>
                  </div>
                </div>`;
              });
            }
            html += '</div>';
          });
        }
        html += '</div>';
      });
    }
    html += '</div>';
  });

  container.innerHTML = html;
}

function deleteCardFromList(cardId) {
  cardsData = cardsData.filter(card => card.id !== cardId);
  saveDrafts();
  renderCardsAdicionados();
  updateCardsCount();
  showStatus('Card removido da lista', 'success');
}

function editCard(cardId) {
  const card = cardsData.find(c => c.id === cardId);
  if (!card) return;

  // Garante que o assunto existe nos topicsData
  const topicKey = `${card.concurso}||${card.materia.toLowerCase()}||${(card.assunto || '').toLowerCase()}`;
  if (card.assunto && !topicsData.find(t => t.key === topicKey)) {
    const subjectKey = `${card.concurso}||${card.materia.toLowerCase()}`;
    if (!subjectsData.find(s => s.key === subjectKey)) {
      subjectsData.push({ key: subjectKey, concurso: card.concurso, materia: card.materia });
    }
    topicsData.push({ key: topicKey, concurso: card.concurso, materia: card.materia, assunto: card.assunto });
    renderSubjects();
    renderTopics();
  }

  document.getElementById('frente').value = card.frente;
  document.getElementById('verso').value  = card.verso;
  document.getElementById('assuntoSelect').value = topicKey;

  deleteCardFromList(cardId);
  updatePreview();
  switchTab('criar');
  document.getElementById('frente').focus();
  showStatus('Card carregado para editar', 'info');
}

// ============================================
// CONVERTER LATEX PARA HTML
// ============================================

function convertLatexToHtml(text) {
  if (!text) return text;
  let hasFormulas = false;
  let result = text;

  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
    if (/<[a-z]/i.test(latex)) return match;
    try {
      if (typeof katex !== 'undefined') {
        hasFormulas = true;
        const cleanLatex = latex.trim().replace(/"/g, '&quot;');
        const rendered = katex.renderToString(latex.trim(), { throwOnError: false, displayMode: true });
        return `<span class="math-atom" data-latex="${cleanLatex}" contenteditable="false">${rendered}</span>`;
      }
    } catch (e) {}
    return match;
  });

  result = result.replace(/\$([\s\S]*?)\$/g, (match, latex) => {
    if (/<[a-z]/i.test(latex)) return match;
    try {
      if (typeof katex !== 'undefined') {
        hasFormulas = true;
        const cleanLatex = latex.trim().replace(/"/g, '&quot;');
        const rendered = katex.renderToString(latex.trim(), { throwOnError: false, displayMode: false });
        return `<span class="math-atom" data-latex="${cleanLatex}" contenteditable="false">${rendered}</span>`;
      }
    } catch (e) {}
    return match;
  });

  if (hasFormulas) return `<p>${result}</p>`;
  return result;
}

// ============================================
// BUILD / EXPORT / UPLOAD
// ============================================

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function buildDecksFromCards() {
  const decksMap = {};

  cardsData.forEach(card => {
    const deckId    = slugify(card.concurso);
    const subjectId = slugify(card.materia);
    const topicId   = card.assunto ? slugify(card.assunto) : null;

    if (!decksMap[deckId]) decksMap[deckId] = { id: deckId, name: card.concurso, category: deckCategories[card.concurso] || '', subjects: {} };

    if (!decksMap[deckId].subjects[subjectId]) {
      decksMap[deckId].subjects[subjectId] = {
        id: subjectId,
        name: card.materia,
        flashcards: [],
        topics: {}
      };
    }

    const flashcard = {
      id: `${topicId || subjectId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      question: convertLatexToHtml(card.frente),
      answer:   convertLatexToHtml(card.verso),
      level: 0, points: 0, lastReview: null, nextReview: null,
      consecutiveCorrect: 0, reviewStreak: 0,
    };

    if (topicId) {
      if (!decksMap[deckId].subjects[subjectId].topics[topicId]) {
        decksMap[deckId].subjects[subjectId].topics[topicId] = {
          id: `topic_${topicId}_${Date.now()}`,
          name: card.assunto,
          flashcards: []
        };
      }
      decksMap[deckId].subjects[subjectId].topics[topicId].flashcards.push(flashcard);
    } else {
      decksMap[deckId].subjects[subjectId].flashcards.push(flashcard);
    }
  });

  return Object.values(decksMap).map(deck => ({
    ...deck,
    subjects: Object.values(deck.subjects).map(subject => ({
      id: subject.id,
      name: subject.name,
      flashcards: subject.flashcards,
      topics: Object.values(subject.topics || {}),
    }))
  }));
}

async function uploadDeckToFirebase(deckName) {
  const cardsToUpload = cardsData.filter(c => c.concurso === deckName);
  if (cardsToUpload.length === 0) { showStatus('Nenhum card nessa matéria', 'warning'); return; }

  const deckIdKey  = slugify(deckName);
  const priceInput = document.getElementById(`price_${deckIdKey}`);
  const price      = priceInput && priceInput.value !== '' ? parseFloat(priceInput.value) : 0;

  if (!confirm(`Subir ${cardsToUpload.length} card(s) do deck "${deckName}" para o Firebase?\nPreço: R$ ${price.toFixed(2)}`)) return;
  showStatus('Enviando...', 'warning');

  try {
    const subjectsMap = {};
    cardsToUpload.forEach(card => {
      const subjectId = slugify(card.materia);
      const topicId   = card.assunto ? slugify(card.assunto) : null;

      if (!subjectsMap[subjectId]) subjectsMap[subjectId] = { id: subjectId, name: card.materia, flashcards: [], topics: {} };

      const flashcard = {
        id: `${topicId || subjectId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        question: convertLatexToHtml(card.frente),
        answer:   convertLatexToHtml(card.verso),
        level: 0, points: 0
      };

      if (topicId) {
        if (!subjectsMap[subjectId].topics[topicId]) {
          subjectsMap[subjectId].topics[topicId] = { id: `topic_${topicId}_${Date.now()}`, name: card.assunto, flashcards: [] };
        }
        subjectsMap[subjectId].topics[topicId].flashcards.push(flashcard);
      } else {
        subjectsMap[subjectId].flashcards.push(flashcard);
      }
    });

    const subjects = Object.values(subjectsMap).map(s => ({
      ...s,
      topics: Object.values(s.topics || {}),
    }));

    const deckId = slugify(deckName);
    const category = deckCategories[deckName] || '';
    await updateDeckInFirebase(deckId, { name: deckName, category, subjects });

    const totalCards = subjects.reduce((sum, s) => {
      const direct = (s.flashcards || []).length;
      const topics = (s.topics || []).reduce((t, tp) => t + (tp.flashcards || []).length, 0);
      return sum + direct + topics;
    }, 0);

    await saveProductInFirebase(deckId, {
      id: deckId, deckId, name: deckName,
      description: 'Deck de flashcards para concursos',
      type: 'full', price,
      subjectCount: subjects.length, cardCount: totalCards
    });

    cardsData = cardsData.filter(c => c.concurso !== deckName);
    delete draftDeckPrices[deckIdKey];
    saveDrafts();
    renderCardsAdicionados();
    updateCardsCount();
    showStatus(`✅ Deck "${deckName}" enviado para o Firebase! Preço: R$ ${price.toFixed(2)}`, 'success');

    if (firebaseDecks.length > 0) {
      [firebaseDecks, firebaseProducts] = await Promise.all([loadAllDecks(), loadAllProducts()]);
      renderFirebaseDecks();
    }
  } catch (error) {
    console.error(error);
    showStatus(`❌ Erro: ${error.message}`, 'error');
  }
}

async function exportDeckToJson(deckName) {
  const cardsToExport = cardsData.filter(c => c.concurso === deckName);
  if (cardsToExport.length === 0) { showStatus('Nenhum card nesse deck', 'warning'); return; }

  const subjectsMap = {};
  cardsToExport.forEach(card => {
    const subjectId = slugify(card.materia);
    const topicId   = card.assunto ? slugify(card.assunto) : null;
    if (!subjectsMap[subjectId]) subjectsMap[subjectId] = { id: subjectId, name: card.materia, flashcards: [], topics: {} };
    const flashcard = {
      id: `${topicId || subjectId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      question: convertLatexToHtml(card.frente),
      answer:   convertLatexToHtml(card.verso),
      level: 0, points: 0
    };
    if (topicId) {
      if (!subjectsMap[subjectId].topics[topicId]) {
        subjectsMap[subjectId].topics[topicId] = { id: `topic_${topicId}_${Date.now()}`, name: card.assunto, flashcards: [] };
      }
      subjectsMap[subjectId].topics[topicId].flashcards.push(flashcard);
    } else {
      subjectsMap[subjectId].flashcards.push(flashcard);
    }
  });

  const jsonData = [{
    id: slugify(deckName),
    name: deckName,
    subjects: Object.values(subjectsMap).map(s => ({ ...s, topics: Object.values(s.topics || {}) }))
  }];

  const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${slugify(deckName)}_cards.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showStatus(`✅ ${cardsToExport.length} card(s) exportados!`, 'success');
}

async function loadFirebaseSubjectsForAdding() {
  showStatus('Carregando decks do Firebase...', 'warning');
  const decks  = await loadAllDecks();
  const select = document.getElementById('firebaseSubjectSelect');
  select.innerHTML = '<option value="">-- Selecione um deck/matéria do Firebase --</option>';

  decks.forEach(deck => {
    (deck.subjects || []).forEach(subject => {
      if (subject.topics && subject.topics.length > 0) {
        // Mostrar cada tópico
        subject.topics.forEach(topic => {
          const option = document.createElement('option');
          option.value = `${deck.name}|${subject.name}|${topic.name}`;
          option.textContent = `${deck.name} › ${subject.name} › ${topic.name}`;
          select.appendChild(option);
        });
      } else {
        const option = document.createElement('option');
        option.value = `${deck.name}|${subject.name}|`;
        option.textContent = `${deck.name} › ${subject.name}`;
        select.appendChild(option);
      }
    });
  });

  showStatus(`✅ ${decks.length} deck(s) carregado(s)`, 'success');
}

function addToFirebaseSubject() {
  const select = document.getElementById('firebaseSubjectSelect');
  if (!select.value) { showStatus('Selecione um deck do Firebase', 'warning'); return; }

  const [deckName, subjectName, topicName] = select.value.split('|');
  const subjectKey = `${deckName}||${subjectName.toLowerCase()}`;

  if (!subjectsData.find(s => s.key === subjectKey)) {
    subjectsData.push({ key: subjectKey, concurso: deckName, materia: subjectName });
    renderSubjects();
  }

  if (topicName) {
    const topicKey = `${subjectKey}||${topicName.toLowerCase()}`;
    if (!topicsData.find(t => t.key === topicKey)) {
      topicsData.push({ key: topicKey, concurso: deckName, materia: subjectName, assunto: topicName });
      renderTopics();
    }
    document.getElementById('assuntoSelect').value = topicKey;
  }

  saveDrafts();
  select.value = '';
  showStatus('Selecionado! Agora preencha frente e verso para adicionar cards.', 'info');
  document.getElementById('frente').focus();
}

// ============================================
// UTILITÁRIOS
// ============================================

function updateCardsCount() {
  const count  = cardsData.length;
  const tabBtn = document.getElementById('rascunhosTabBtn');
  if (tabBtn) tabBtn.textContent = count > 0 ? `📋 Rascunhos (${count})` : '📋 Rascunhos';
  const countEl = document.getElementById('cardsCount');
  if (countEl) countEl.textContent = count === 0 ? '0 cards em rascunho' : `${count} card(s) em rascunho`;
}

function showStatus(message, type = 'info') {
  const statusBar = document.getElementById('statusBar');
  statusBar.textContent = message;
  statusBar.className = `status-bar show ${type}`;
  setTimeout(() => statusBar.classList.remove('show'), 4000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// GERENCIAR FIREBASE
// ============================================

function countDeckCards(deck) {
  return (deck.subjects || []).reduce((acc, s) => {
    const direct = (s.flashcards || []).length;
    const topics = (s.topics || []).reduce((t, tp) => t + (tp.flashcards || []).length, 0);
    return acc + direct + topics;
  }, 0);
}

async function loadFirebaseDecks() {
  const btn = document.getElementById('loadDecksBtn');
  const container = document.getElementById('firebaseDecksContainer');

  btn.disabled = true;
  btn.textContent = '⏳ Carregando...';
  container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding:20px;">Carregando...</p>';

  [firebaseDecks, firebaseProducts] = await Promise.all([loadAllDecks(), loadAllProducts()]);

  btn.disabled = false;
  btn.textContent = '🔄 Carregar do Firebase';

  if (firebaseDecks.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding:20px;">Nenhum deck encontrado no Firebase</p>';
    return;
  }

  renderFirebaseDecks();
  showStatus(`✅ ${firebaseDecks.length} deck(s) carregados`, 'success');
}

function generatePlayStoreId(name) {
  return 'deck_' + name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .slice(0, 50);
}

function renderFirebaseDecks() {
  const container = document.getElementById('firebaseDecksContainer');

  container.innerHTML = firebaseDecks.map(deck => {
    const totalCards  = countDeckCards(deck);
    const product     = firebaseProducts[deck.id];
    const playStoreId = product?.playStoreId || generatePlayStoreId(deck.name || deck.id);
    const price       = product?.price > 0 ? `R$${Number(product.price).toFixed(2)}` : 'Grátis';
    const priceColor  = product?.price > 0 ? '#48BB78' : '#A0AEC0';

    return `
      <div class="fb-deck">
        <div class="fb-deck-header" onclick="toggleDeckExpand('${deck.id}')">
          <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
            <span class="fb-toggle" id="toggle-deck-${deck.id}">▶</span>
            <div style="min-width:0;">
              <div style="font-weight:700; color:var(--text-primary);">${deck.name || deck.id}</div>
              <div style="font-size:12px; color:var(--text-secondary);">${(deck.subjects || []).length} matéria(s) • ${totalCards} card(s)</div>
              <div style="display:flex; align-items:center; gap:8px; margin-top:4px; flex-wrap:wrap;">
                <span style="font-size:11px; color:var(--text-secondary); font-family:monospace; background:var(--bg-primary); padding:2px 6px; border-radius:4px; cursor:pointer;" onclick="event.stopPropagation(); navigator.clipboard.writeText('${playStoreId}'); showStatus('ID copiado!','success')" title="Clique para copiar">🏷️ ${playStoreId}</span>
                <span style="font-size:11px; font-weight:700; color:${priceColor};">💰 ${price}</span>
              </div>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-shrink:0;">
            <button onclick="event.stopPropagation(); openLojaConfigModal('${deck.id}')" style="padding:6px 12px; font-size:12px; border-radius:6px; border:none; cursor:pointer; background:#6366f1; color:#fff;">⚙️ Loja</button>
            <button class="btn-delete" onclick="event.stopPropagation(); confirmDeleteDeck('${deck.id}')" style="padding:6px 12px; font-size:12px; border-radius:6px; border:none; cursor:pointer;">🗑️ Apagar</button>
          </div>
        </div>
        <div class="fb-deck-content" id="content-deck-${deck.id}" style="display:none;">
          ${renderDeckSubjects(deck)}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// CONFIGURAÇÃO DE LOJA
// ============================================

function openLojaConfigModal(deckId) {
  const deck = firebaseDecks.find(d => d.id === deckId);
  if (!deck) return;
  const product      = firebaseProducts[deckId];
  const suggestedId  = product?.playStoreId || generatePlayStoreId(deck.name || deckId);
  const currentPrice = product?.price ?? 0;
  const currentDesc  = product?.description || 'Deck de flashcards para concursos';

  document.getElementById('lojaConfigDeckId').value       = deckId;
  document.getElementById('lojaConfigTitle').textContent  = deck.name || deckId;
  document.getElementById('lojaConfigPlayStoreId').value  = suggestedId;
  document.getElementById('lojaConfigPrice').value        = currentPrice;
  document.getElementById('lojaConfigDescription').value  = currentDesc;
  document.getElementById('lojaConfigModal').style.display = 'flex';
}

function closeLojaConfigModal() {
  document.getElementById('lojaConfigModal').style.display = 'none';
}

function handleLojaConfigOverlayClick(e) {
  if (e.target === document.getElementById('lojaConfigModal')) closeLojaConfigModal();
}

async function saveLojaConfig() {
  const deckId      = document.getElementById('lojaConfigDeckId').value;
  const playStoreId = document.getElementById('lojaConfigPlayStoreId').value.trim();
  const price       = parseFloat(document.getElementById('lojaConfigPrice').value) || 0;
  const description = document.getElementById('lojaConfigDescription').value.trim();

  if (!playStoreId) { showStatus('Preencha o ID do produto!', 'warning'); return; }

  const deck = firebaseDecks.find(d => d.id === deckId);
  if (!deck) return;

  const totalCards = countDeckCards(deck);
  const productData = {
    id: deckId, deckId, playStoreId,
    name: deck.name || deckId,
    description: description || 'Deck de flashcards para concursos',
    type: 'full', price,
    subjectCount: (deck.subjects || []).length, cardCount: totalCards,
  };

  showStatus('⏳ Salvando configuração...', 'warning');
  closeLojaConfigModal();

  const result = await saveProductInFirebase(deckId, productData);
  if (result.success) {
    firebaseProducts[deckId] = productData;
    renderFirebaseDecks();
    showStatus('✅ Configuração da loja salva!', 'success');
  } else {
    showStatus('❌ Erro ao salvar: ' + result.error, 'error');
  }
}

// ============================================
// RENDER DECK SUBJECTS / TOPICS / CARDS
// ============================================

function renderDeckSubjects(deck) {
  if (!deck.subjects || deck.subjects.length === 0) {
    return '<p style="color:var(--text-secondary); padding:12px; font-size:13px;">Nenhuma matéria</p>';
  }
  return deck.subjects.map(subject => {
    const hasTopics    = subject.topics && subject.topics.length > 0;
    const directCards  = (subject.flashcards || []).length;
    const topicCards   = (subject.topics || []).reduce((t, tp) => t + (tp.flashcards || []).length, 0);
    const totalCount   = directCards + topicCards;
    const typeLabel    = hasTopics ? `${subject.topics.length} assunto(s)` : `${directCards} card(s)`;

    return `
      <div class="fb-subject">
        <div class="fb-subject-header" onclick="toggleSubjectExpand('${deck.id}', '${subject.id}')">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="fb-toggle" id="toggle-subject-${deck.id}-${subject.id}">▶</span>
            <div>
              <div style="font-weight:600; color:var(--text-primary); font-size:14px;">${subject.name}</div>
              <div style="font-size:12px; color:var(--text-secondary);">${typeLabel} • ${totalCount} card(s) total</div>
            </div>
          </div>
          <button class="btn-delete" onclick="event.stopPropagation(); confirmDeleteSubject('${deck.id}', '${subject.id}')" style="padding:5px 10px; font-size:12px; border-radius:6px; border:none; cursor:pointer;">🗑️ Apagar Matéria</button>
        </div>
        <div class="fb-subject-content" id="content-subject-${deck.id}-${subject.id}" style="display:none;">
          ${hasTopics ? renderSubjectTopics(deck.id, subject) : renderDeckCards(deck.id, subject.id, subject.flashcards || [], null)}
        </div>
      </div>
    `;
  }).join('');
}

function renderSubjectTopics(deckId, subject) {
  return subject.topics.map(topic => `
    <div style="margin: 8px 0; padding-left: 12px;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:rgba(93,214,44,0.06); border-radius:6px; border:1px solid rgba(93,214,44,0.15); cursor:pointer;" onclick="toggleTopicExpand('${deckId}', '${subject.id}', '${topic.id}')">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="fb-toggle" id="toggle-topic-${deckId}-${subject.id}-${topic.id}">▶</span>
          <div>
            <div style="font-weight:600; color:var(--accent); font-size:13px;">📂 ${topic.name}</div>
            <div style="font-size:12px; color:var(--text-secondary);">${(topic.flashcards || []).length} card(s)</div>
          </div>
        </div>
        <button class="btn-delete" onclick="event.stopPropagation(); confirmDeleteTopic('${deckId}', '${subject.id}', '${topic.id}')" style="padding:4px 8px; font-size:11px; border-radius:6px; border:none; cursor:pointer;">🗑️</button>
      </div>
      <div id="content-topic-${deckId}-${subject.id}-${topic.id}" style="display:none; padding-left:12px;">
        ${renderDeckCards(deckId, subject.id, topic.flashcards || [], topic.id)}
      </div>
    </div>
  `).join('');
}

function renderDeckCards(deckId, subjectId, flashcards, topicId) {
  if (!flashcards || flashcards.length === 0) {
    return '<p style="color:var(--text-secondary); padding:12px; font-size:13px;">Nenhum card</p>';
  }
  const topicAttr = topicId ? `data-topic="${topicId}"` : '';
  return flashcards.map(card => {
    const questionText = stripHtml(card.question || '');
    const answerText   = stripHtml(card.answer || '');
    return `
      <div class="fb-card">
        <div class="card-content">
          <div class="card-content-label">Pergunta</div>
          <div class="card-content-text" style="font-size:12px; max-height:60px; overflow:hidden;">${escapeHtml(questionText)}</div>
        </div>
        <div class="card-content" style="margin-top:8px;">
          <div class="card-content-label">Resposta</div>
          <div class="card-content-text" style="font-size:12px; max-height:60px; overflow:hidden;">${escapeHtml(answerText)}</div>
        </div>
        <div class="card-actions" style="margin-top:10px;">
          <button class="btn-edit" onclick="openEditCardModal('${deckId}', '${subjectId}', '${topicId || ''}', '${card.id}')" style="padding:6px 12px; font-size:12px; border-radius:6px; border:none; cursor:pointer;">✏️ Editar</button>
          <button class="btn-delete" onclick="confirmDeleteCard('${deckId}', '${subjectId}', '${topicId || ''}', '${card.id}')" style="padding:6px 12px; font-size:12px; border-radius:6px; border:none; cursor:pointer;">🗑️ Apagar</button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleDeckExpand(deckId) {
  const content = document.getElementById(`content-deck-${deckId}`);
  const toggle  = document.getElementById(`toggle-deck-${deckId}`);
  const isOpen  = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  toggle.textContent    = isOpen ? '▶' : '▼';
}

function toggleSubjectExpand(deckId, subjectId) {
  const content = document.getElementById(`content-subject-${deckId}-${subjectId}`);
  const toggle  = document.getElementById(`toggle-subject-${deckId}-${subjectId}`);
  const isOpen  = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  toggle.textContent    = isOpen ? '▶' : '▼';
}

function toggleTopicExpand(deckId, subjectId, topicId) {
  const content = document.getElementById(`content-topic-${deckId}-${subjectId}-${topicId}`);
  const toggle  = document.getElementById(`toggle-topic-${deckId}-${subjectId}-${topicId}`);
  const isOpen  = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  toggle.textContent    = isOpen ? '▶' : '▼';
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function confirmDeleteDeck(deckId) {
  const deck = firebaseDecks.find(d => d.id === deckId);
  if (confirm(`Apagar o deck "${deck?.name || deckId}" e todos os seus cards do Firebase?\n\nEssa ação não pode ser desfeita.`)) {
    deleteDeckFromFirebase(deckId);
  }
}

async function deleteDeckFromFirebase(deckId) {
  showStatus('⏳ Apagando deck...', 'warning');
  const result = await deleteDeckInFirebase(deckId);
  if (result.success) {
    firebaseDecks = firebaseDecks.filter(d => d.id !== deckId);
    renderFirebaseDecks();
    showStatus('✅ Deck apagado com sucesso!', 'success');
  } else {
    showStatus(`❌ Erro ao apagar deck: ${result.error}`, 'error');
  }
}

function confirmDeleteSubject(deckId, subjectId) {
  const deck    = firebaseDecks.find(d => d.id === deckId);
  const subject = deck?.subjects?.find(s => s.id === subjectId);
  if (confirm(`Apagar a matéria "${subject?.name || subjectId}" e todos os seus cards?\n\nEssa ação não pode ser desfeita.`)) {
    deleteSubjectFromFirebase(deckId, subjectId);
  }
}

async function deleteSubjectFromFirebase(deckId, subjectId) {
  showStatus('⏳ Apagando matéria...', 'warning');
  const deck = firebaseDecks.find(d => d.id === deckId);
  if (!deck) return;
  deck.subjects = deck.subjects.filter(s => s.id !== subjectId);
  const result = await updateDeckInFirebase(deckId, { name: deck.name, subjects: deck.subjects });
  if (result.success) { renderFirebaseDecks(); showStatus('✅ Matéria apagada!', 'success'); }
  else showStatus(`❌ Erro: ${result.error}`, 'error');
}

function confirmDeleteTopic(deckId, subjectId, topicId) {
  const deck    = firebaseDecks.find(d => d.id === deckId);
  const subject = deck?.subjects?.find(s => s.id === subjectId);
  const topic   = subject?.topics?.find(t => t.id === topicId);
  if (confirm(`Apagar o assunto "${topic?.name || topicId}" e todos os seus cards?\n\nEssa ação não pode ser desfeita.`)) {
    deleteTopicFromFirebase(deckId, subjectId, topicId);
  }
}

async function deleteTopicFromFirebase(deckId, subjectId, topicId) {
  showStatus('⏳ Apagando assunto...', 'warning');
  const deck    = firebaseDecks.find(d => d.id === deckId);
  const subject = deck?.subjects?.find(s => s.id === subjectId);
  if (!subject) return;
  subject.topics = (subject.topics || []).filter(t => t.id !== topicId);
  const result = await updateDeckInFirebase(deckId, { name: deck.name, subjects: deck.subjects });
  if (result.success) { renderFirebaseDecks(); showStatus('✅ Assunto apagado!', 'success'); }
  else showStatus(`❌ Erro: ${result.error}`, 'error');
}

function confirmDeleteCard(deckId, subjectId, topicId, cardId) {
  if (confirm('Apagar este card?\n\nEssa ação não pode ser desfeita.')) {
    deleteCardFromFirebase(deckId, subjectId, topicId, cardId);
  }
}

async function deleteCardFromFirebase(deckId, subjectId, topicId, cardId) {
  showStatus('⏳ Apagando card...', 'warning');
  const deck    = firebaseDecks.find(d => d.id === deckId);
  const subject = deck?.subjects?.find(s => s.id === subjectId);
  if (!subject) return;

  if (topicId) {
    const topic = (subject.topics || []).find(t => t.id === topicId);
    if (!topic) return;
    topic.flashcards = topic.flashcards.filter(c => c.id !== cardId);
  } else {
    subject.flashcards = (subject.flashcards || []).filter(c => c.id !== cardId);
  }

  const result = await updateDeckInFirebase(deckId, { name: deck.name, subjects: deck.subjects });
  if (result.success) { renderFirebaseDecks(); showStatus('✅ Card apagado!', 'success'); }
  else showStatus(`❌ Erro: ${result.error}`, 'error');
}

// ============================================
// EDITAR CARD (Firebase)
// ============================================

function htmlToLatexSource(html) {
  if (!html) return '';
  const hasHtml = /<[a-z][\s\S]*>/i.test(html);
  if (!hasHtml) return html;

  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('.math-atom[data-latex]').forEach(el => {
    const latex   = el.getAttribute('data-latex');
    const isDisplay = el.getAttribute('data-display') === 'true';
    el.replaceWith(document.createTextNode(isDisplay ? `$$${latex}$$` : `$${latex}$`));
  });

  const textarea = document.createElement('textarea');
  textarea.innerHTML = div.innerHTML
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '')
    .replace(/<p>/gi, '')
    .replace(/<[^>]+>/g, '');
  return textarea.value.trim();
}

function updateEditPreview() {
  renderMathField('editCardQuestion', 'preview-editCardQuestion');
  renderMathField('editCardAnswer',   'preview-editCardAnswer');
}

function renderMathField(fieldId, previewId) {
  const textarea = document.getElementById(fieldId);
  const preview  = document.getElementById(previewId);
  if (!textarea || !preview) return;
  const text = textarea.value;
  if (!text.trim()) { preview.innerHTML = ''; return; }

  let html = text
    .replace(/\$\$([\s\S]*?)\$\$/g, '<div class="math-block" data-formula="$1">$$...$$</div>')
    .replace(/\$([\s\S]*?)\$/g, '<span class="math-inline" data-formula="$1">$...$</span>')
    .replace(/\n/g, '<br>');
  preview.innerHTML = html;

  if (typeof katex !== 'undefined') {
    preview.querySelectorAll('.math-block, .math-inline').forEach(el => {
      const formula = el.getAttribute('data-formula');
      try { katex.render(formula, el, { displayMode: el.classList.contains('math-block') }); } catch (e) {}
    });
  }
}

function openEditCardModal(deckId, subjectId, topicId, cardId) {
  const deck    = firebaseDecks.find(d => d.id === deckId);
  const subject = deck?.subjects?.find(s => s.id === subjectId);
  let card;

  if (topicId) {
    const topic = (subject?.topics || []).find(t => t.id === topicId);
    card = topic?.flashcards?.find(c => c.id === cardId);
  } else {
    card = (subject?.flashcards || []).find(c => c.id === cardId);
  }
  if (!card) return;

  editingCard = { deckId, subjectId, topicId: topicId || null, cardId };

  const contextParts = [deck.name, subject.name];
  if (topicId) {
    const topic = (subject?.topics || []).find(t => t.id === topicId);
    if (topic) contextParts.push(topic.name);
  }
  document.getElementById('editCardContext').textContent = contextParts.join(' › ');
  document.getElementById('editCardQuestion').value = htmlToLatexSource(card.question || '');
  document.getElementById('editCardAnswer').value   = htmlToLatexSource(card.answer || '');
  document.getElementById('preview-editCardQuestion').innerHTML = '';
  document.getElementById('preview-editCardAnswer').innerHTML   = '';
  document.getElementById('editCardModal').style.display = 'flex';

  document.getElementById('editCardQuestion').oninput = updateEditPreview;
  document.getElementById('editCardAnswer').oninput   = updateEditPreview;
  updateEditPreview();
}

function closeEditCardModal() {
  document.getElementById('editCardModal').style.display = 'none';
  document.getElementById('editCardQuestion').oninput = null;
  document.getElementById('editCardAnswer').oninput   = null;
  closeMathKeyboard();
  editingCard = null;
}

function handleEditModalOverlayClick(e) {
  if (e.target === document.getElementById('editCardModal')) closeEditCardModal();
}

async function saveEditedCard() {
  if (!editingCard) return;
  const { deckId, subjectId, topicId, cardId } = editingCard;
  const question = convertLatexToHtml(document.getElementById('editCardQuestion').value.trim());
  const answer   = convertLatexToHtml(document.getElementById('editCardAnswer').value.trim());

  const deck    = firebaseDecks.find(d => d.id === deckId);
  const subject = deck?.subjects?.find(s => s.id === subjectId);
  let card;

  if (topicId) {
    const topic = (subject?.topics || []).find(t => t.id === topicId);
    card = topic?.flashcards?.find(c => c.id === cardId);
  } else {
    card = (subject?.flashcards || []).find(c => c.id === cardId);
  }
  if (!card) return;

  card.question = question;
  card.answer   = answer;

  closeEditCardModal();
  showStatus('⏳ Salvando...', 'warning');

  const result = await updateDeckInFirebase(deckId, { name: deck.name, subjects: deck.subjects });
  if (result.success) { renderFirebaseDecks(); showStatus('✅ Card atualizado no Firebase!', 'success'); }
  else showStatus(`❌ Erro ao salvar: ${result.error}`, 'error');
}

async function cleanOrphanedProducts() {
  if (!confirm('Isso vai remover da Loja todos os produtos cujos decks foram apagados. Continuar?')) return;
  showStatus('Verificando produtos...');
  const result = await _cleanOrphanedProductsFirebase();
  if (!result.success) { showStatus('Erro: ' + result.error, 'error'); return; }
  if (result.removed.length === 0) showStatus('Nenhum produto orfão encontrado.', 'success');
  else showStatus('Removidos da Loja: ' + result.removed.join(', '), 'success');
}
