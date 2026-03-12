// ============================================
// FLASHCARDS ADMIN PANEL - APP.JS
// ============================================

let cardsData = []; // Array de cards criados
let uploadedCards = []; // Cards para upload em lote
let subjectsData = []; // Array de matérias criadas: { concurso, materia }
let firebaseDecks = []; // Decks carregados do Firebase
let editingCard = null; // { deckId, subjectId, cardId }

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  renderCardsAdicionados();
  updateCardsCount();
});

function setupEventListeners() {
  // Upload de arquivo
  const uploadArea = document.getElementById('uploadArea');
  const jsonFile = document.getElementById('jsonFile');

  uploadArea.addEventListener('click', () => jsonFile.click());
  uploadArea.addEventListener('dragover', (e) => e.preventDefault());
  uploadArea.addEventListener('drop', handleFileDrop);
  jsonFile.addEventListener('change', handleFileSelect);

  // Live preview
  document.getElementById('frente').addEventListener('input', updatePreview);
  document.getElementById('verso').addEventListener('input', updatePreview);
}

// ============================================
// GERENCIAMENTO DE ABAS
// ============================================

function switchTab(tabName) {
  // Esconder todos os tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remover active dos botões
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Mostrar tab selecionado
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');

  // Atualizar preview se necessário
  if (tabName === 'preview') {
    renderPreviewCards();
  }
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
  const preview = document.getElementById(`preview-${fieldId}`);
  const text = textarea.value;

  if (!text.trim()) {
    preview.innerHTML = '';
    return;
  }

  // Processar fórmulas
  let html = text
    .replace(/\$\$([\s\S]*?)\$\$/g, '<div class="math-block" data-formula="$1">$$...$$</div>')
    .replace(/\$([\s\S]*?)\$/g, '<span class="math-inline" data-formula="$1">$...$</span>')
    .replace(/\n/g, '<br>');

  preview.innerHTML = html;

  // Renderizar KaTeX se disponível
  if (typeof katex !== 'undefined') {
    document.querySelectorAll('.math-block, .math-inline').forEach(el => {
      const formula = el.getAttribute('data-formula');
      try {
        if (el.classList.contains('math-block')) {
          katex.render(formula, el, { displayMode: true });
        } else {
          katex.render(formula, el, { displayMode: false });
        }
      } catch (e) {
        console.log('Erro ao renderizar fórmula:', e);
      }
    });
  }
}

// ============================================
// GERENCIAR MATÉRIAS
// ============================================

function addSubject() {
  const concurso = document.getElementById('novoConcurso').value.trim();
  const materia = document.getElementById('novaMateria').value.trim();

  if (!concurso || !materia) {
    showStatus('Preencha o concurso e a matéria!', 'warning');
    return;
  }

  const key = `${concurso}||${materia}`;
  const exists = subjectsData.find(s => s.key === key);
  if (exists) {
    showStatus('Essa matéria já existe!', 'warning');
    return;
  }

  subjectsData.push({ key, concurso, materia });
  document.getElementById('novoConcurso').value = '';
  document.getElementById('novaMateria').value = '';
  renderSubjects();
  showStatus(`✅ Matéria "${materia}" criada!`, 'success');
}

function removeSubject(key) {
  subjectsData = subjectsData.filter(s => s.key !== key);
  renderSubjects();
}

function renderSubjects() {
  const container = document.getElementById('subjectsList');
  const select = document.getElementById('materiaSelect');

  container.innerHTML = subjectsData.map(s => `
    <div style="display:flex; align-items:center; gap:6px; background:var(--bg-primary); padding:6px 12px; border-radius:20px; border:1px solid var(--bg-tertiary);">
      <span style="font-size:12px; color:var(--text-secondary);">${s.concurso}</span>
      <span style="color:var(--bg-tertiary)">›</span>
      <span style="font-size:13px; color:var(--text-primary); font-weight:600;">${s.materia}</span>
      <button onclick="removeSubject('${s.key}')" style="background:none; border:none; color:var(--error); cursor:pointer; font-size:14px; padding:0 2px;">✕</button>
    </div>
  `).join('');

  // Atualizar select
  select.innerHTML = '<option value="">-- Selecione uma matéria --</option>';
  subjectsData.forEach(s => {
    const option = document.createElement('option');
    option.value = s.key;
    option.textContent = `${s.concurso} › ${s.materia}`;
    select.appendChild(option);
  });
}

// ============================================
// CRIAÇÃO DE CARDS
// ============================================

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
  }
};

function openMathModal(type) {
  if (!activeField) return;
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

  // Usa □ como placeholder para campos vazios
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
  const end = input.selectionEnd;
  input.value = input.value.slice(0, start) + latex + input.value.slice(end);
  input.selectionStart = input.selectionEnd = start + latex.length - cursorOffset;
  input.focus();
  updateModalPreview();
}

function handleModalOverlayClick(e) {
  if (e.target === document.getElementById('mathModal')) closeMathModal();
}

function toggleMathKeyboard(field) {
  const keyboard = document.getElementById('mathKeyboard');
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
}

function closeMathKeyboard() {
  document.getElementById('mathKeyboard').style.display = 'none';
  activeField = null;
}

function insertMathKey(latex, cursorBack = 0) {
  if (!activeField) return;

  const textarea = document.getElementById(activeField);
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  // Detecta se o cursor já está dentro de $...$
  const beforeCursor = value.slice(0, start);
  const dollarCount = (beforeCursor.match(/\$/g) || []).length;
  const insideFormula = dollarCount % 2 === 1;

  let insertion;
  let effectiveCursorBack;

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
}

function insertBold(field) {
  const textarea = document.getElementById(field);
  const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
  const cursorPos = textarea.selectionStart;
  const value = textarea.value;

  if (selectedText) {
    const newValue = value.slice(0, cursorPos) + `**${selectedText}**` + value.slice(cursorPos + selectedText.length);
    textarea.value = newValue;
  }

  updatePreview();
}

function insertItalic(field) {
  const textarea = document.getElementById(field);
  const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
  const cursorPos = textarea.selectionStart;
  const value = textarea.value;

  if (selectedText) {
    const newValue = value.slice(0, cursorPos) + `*${selectedText}*` + value.slice(cursorPos + selectedText.length);
    textarea.value = newValue;
  }

  updatePreview();
}

function addCard() {
  const selectedKey = document.getElementById('materiaSelect').value;
  const frente = document.getElementById('frente').value.trim();
  const verso = document.getElementById('verso').value.trim();

  if (!selectedKey) {
    showStatus('Selecione uma matéria antes de adicionar o card!', 'warning');
    return;
  }

  if (!frente || !verso) {
    showStatus('Preencha a frente e o verso do card!', 'warning');
    return;
  }

  const subject = subjectsData.find(s => s.key === selectedKey);

  const card = {
    id: Date.now(),
    concurso: subject.concurso,
    materia: subject.materia,
    frente,
    verso,
    createdAt: new Date().toLocaleString('pt-BR')
  };

  cardsData.push(card);
  showStatus('✅ Card adicionado com sucesso!', 'success');
  resetForm();
  renderCardsAdicionados();
  updateCardsCount();
}

function resetForm() {
  const selectedMateria = document.getElementById('materiaSelect').value;
  document.getElementById('cardForm').reset();
  document.getElementById('materiaSelect').value = selectedMateria;
  document.getElementById('preview-frente').innerHTML = '';
  document.getElementById('preview-verso').innerHTML = '';
}

function renderCardsAdicionados() {
  const container = document.getElementById('cardsAdicionados');
  container.innerHTML = '';

  if (cardsData.length === 0) {
    return;
  }

  const html = cardsData.map(card => `
    <div class="card-item">
      <div class="card-header">
        <div>
          <strong>${card.concurso}</strong> - ${card.materia}
        </div>
        <div class="card-actions">
          <button class="btn-edit" onclick="editCard(${card.id})">Editar</button>
          <button class="btn-delete" onclick="deleteCardFromList(${card.id})">Deletar</button>
        </div>
      </div>
      <div class="card-content">
        <div class="card-content-label">Frente (Pergunta)</div>
        <div class="card-content-text">${escapeHtml(card.frente)}</div>
      </div>
      <div class="card-content">
        <div class="card-content-label">Verso (Resposta)</div>
        <div class="card-content-text">${escapeHtml(card.verso)}</div>
      </div>
      <small style="color: #A0AEC0;">${card.createdAt}</small>
    </div>
  `).join('');

  container.innerHTML = html;
}

function deleteCardFromList(cardId) {
  cardsData = cardsData.filter(card => card.id !== cardId);
  renderCardsAdicionados();
  updateCardsCount();
  showStatus('Card removido da lista', 'success');
}

function editCard(cardId) {
  const card = cardsData.find(c => c.id === cardId);
  if (card) {
    document.getElementById('concurso').value = card.concurso;
    document.getElementById('materia').value = card.materia;
    document.getElementById('frente').value = card.frente;
    document.getElementById('verso').value = card.verso;

    deleteCardFromList(cardId);
    updatePreview();
    document.getElementById('concurso').focus();
  }
}

// ============================================
// UPLOAD EM LOTE
// ============================================

function handleFileDrop(e) {
  e.preventDefault();
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFileSelect({ target: { files } });
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    showStatus('❌ Por favor, selecione um arquivo JSON', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      uploadedCards = JSON.parse(e.target.result);

      if (!Array.isArray(uploadedCards)) {
        throw new Error('Arquivo deve conter um array de objetos');
      }

      // Validar estrutura
      uploadedCards.forEach(card => {
        if (!card.concurso || !card.materia || !card.frente || !card.verso) {
          throw new Error('Cada card deve ter: concurso, materia, frente, verso');
        }
      });

      renderUploadPreview();
      document.getElementById('uploadArea').style.display = 'none';
      document.getElementById('uploadPreview').style.display = 'block';
      showStatus(`✅ ${uploadedCards.length} cards carregados para importar`, 'success');

    } catch (error) {
      showStatus(`❌ Erro ao ler arquivo: ${error.message}`, 'error');
      uploadedCards = [];
    }
  };

  reader.readAsText(file);
}

function renderUploadPreview() {
  const container = document.getElementById('uploadCardsList');
  container.innerHTML = uploadedCards.map((card, idx) => `
    <div class="card-item" style="margin-bottom: 12px;">
      <div style="font-size: 12px; color: #A0AEC0; margin-bottom: 8px;">Card ${idx + 1}</div>
      <strong>${card.concurso}</strong> - ${card.materia}
      <div style="margin-top: 8px; font-size: 13px; color: #A0AEC0;">
        <strong>Frente:</strong> ${escapeHtml(card.frente).substring(0, 100)}...
      </div>
      <div style="margin-top: 4px; font-size: 13px; color: #A0AEC0;">
        <strong>Verso:</strong> ${escapeHtml(card.verso).substring(0, 100)}...
      </div>
    </div>
  `).join('');
}

function cancelUpload() {
  document.getElementById('uploadArea').style.display = 'block';
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('jsonFile').value = '';
  uploadedCards = [];
}

async function importCards() {
  if (uploadedCards.length === 0) {
    showStatus('Nenhum card para importar', 'warning');
    return;
  }

  cardsData = [...cardsData, ...uploadedCards.map(card => ({
    id: Date.now() + Math.random(),
    ...card,
    createdAt: new Date().toLocaleString('pt-BR')
  }))];

  updateCardsCount();
  renderCardsAdicionados();

  document.getElementById('uploadArea').style.display = 'block';
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('jsonFile').value = '';
  uploadedCards = [];

  showStatus(`✅ ${uploadedCards.length} cards importados com sucesso!`, 'success');
}

// ============================================
// PREVIEW
// ============================================

function renderPreviewCards() {
  const container = document.getElementById('previewCards');
  const filterConcurso = document.getElementById('filterConcurso').value.toLowerCase();
  const filterMateria = document.getElementById('filterMateria').value.toLowerCase();

  let filtered = cardsData.filter(card => {
    const matchConcurso = card.concurso.toLowerCase().includes(filterConcurso);
    const matchMateria = card.materia.toLowerCase().includes(filterMateria);
    return matchConcurso && matchMateria;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #A0AEC0;">Nenhum card encontrado</p>';
    return;
  }

  container.innerHTML = filtered.map(card => `
    <div class="card-preview">
      <div style="font-size: 11px; color: #A0AEC0; margin-bottom: 4px; text-transform: uppercase;">
        ${card.concurso} • ${card.materia}
      </div>
      <div class="card-preview-front">
        <div class="card-preview-label">Frente</div>
        <div class="card-preview-content">${escapeHtml(card.frente)}</div>
      </div>
      <div class="card-preview-front">
        <div class="card-preview-label">Verso</div>
        <div class="card-preview-content">${escapeHtml(card.verso)}</div>
      </div>
    </div>
  `).join('');
}

// ============================================
// CONVERTER LATEX PARA HTML (formato que o app entende)
// ============================================

function convertLatexToHtml(text) {
  if (!text) return text;

  let hasFormulas = false;
  let result = text;

  // Primeiro: blocos $$...$$
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
    if (/<[a-z]/i.test(latex)) return match; // pula se contiver HTML
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

  // Depois: inline $...$
  result = result.replace(/\$([\s\S]*?)\$/g, (match, latex) => {
    if (/<[a-z]/i.test(latex)) return match; // pula se contiver HTML
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

  // Envolver em <p> para o app detectar como HTML e usar WebView
  if (hasFormulas) {
return `<p>${result}</p>`;
  }

  return result;
}

// ============================================
// SALVAR NO FIREBASE
// ============================================

async function saveToFirebase() {
  if (cardsData.length === 0) {
    showStatus('Adicione cards antes de salvar', 'warning');
    return;
  }

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Gerando arquivo...';

  showStatus('Gerando arquivo JSON para download...', 'warning');

  try {
    // Agrupar cards por concurso → matéria (formato esperado pelo app)
    const decksMap = {};

    cardsData.forEach(card => {
      const deckId = card.concurso.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const subjectId = card.materia.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

      if (!decksMap[deckId]) {
        decksMap[deckId] = {
          id: deckId,
          name: card.concurso,
          subjects: {}
        };
      }

      if (!decksMap[deckId].subjects[subjectId]) {
        decksMap[deckId].subjects[subjectId] = {
          id: subjectId,
          name: card.materia,
          flashcards: []
        };
      }

      decksMap[deckId].subjects[subjectId].flashcards.push({
        id: `${subjectId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        question: convertLatexToHtml(card.frente),
        answer: convertLatexToHtml(card.verso),
        level: 0,
        points: 0,
        lastReview: null,
        nextReview: null
      });
    });

    // Converter para array final
    const decks = Object.values(decksMap).map(deck => ({
      ...deck,
      subjects: Object.values(deck.subjects)
    }));

    const jsonData = JSON.stringify(decks, null, 2);

    // Download
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `decks-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const totalCards = cardsData.length;
    showStatus(`✅ ${totalCards} cards exportados no formato do app!`, 'success');
    console.log('JSON exportado:', decks);
    cardsData = [];
    renderCardsAdicionados();
    updateCardsCount();

  } catch (error) {
    showStatus(`❌ Erro ao gerar arquivo: ${error.message}`, 'error');
    console.error('Erro:', error);
  } finally {
    btn.disabled = false;
    btn.textContent = '📥 Exportar JSON';
  }
}

// ============================================
// UTILITÁRIOS
// ============================================

function updateCardsCount() {
  const count = cardsData.length;
  const text = count === 1 ? 'card adicionado' : 'cards adicionados';
  document.getElementById('cardsCount').textContent = `${count} ${text}`;

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.style.display = count > 0 ? 'block' : 'none';
}

function showStatus(message, type = 'info') {
  const statusBar = document.getElementById('statusBar');
  statusBar.textContent = message;
  statusBar.className = `status-bar show ${type}`;

  setTimeout(() => {
    statusBar.classList.remove('show');
  }, 4000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Atualizar preview ao filtrar
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('filterConcurso')?.addEventListener('input', renderPreviewCards);
  document.getElementById('filterMateria')?.addEventListener('input', renderPreviewCards);
});

// ============================================
// GERENCIAR FIREBASE
// ============================================

async function loadFirebaseDecks() {
  const btn = document.getElementById('loadDecksBtn');
  const container = document.getElementById('firebaseDecksContainer');

  btn.disabled = true;
  btn.textContent = '⏳ Carregando...';
  container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding:20px;">Carregando...</p>';

  firebaseDecks = await loadAllDecks();

  btn.disabled = false;
  btn.textContent = '🔄 Carregar do Firebase';

  if (firebaseDecks.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding:20px;">Nenhum deck encontrado no Firebase</p>';
    return;
  }

  renderFirebaseDecks();
  showStatus(`✅ ${firebaseDecks.length} deck(s) carregados`, 'success');
}

function renderFirebaseDecks() {
  const container = document.getElementById('firebaseDecksContainer');

  container.innerHTML = firebaseDecks.map(deck => {
    const totalCards = (deck.subjects || []).reduce((acc, s) => acc + (s.flashcards || []).length, 0);
    return `
      <div class="fb-deck">
        <div class="fb-deck-header" onclick="toggleDeckExpand('${deck.id}')">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="fb-toggle" id="toggle-deck-${deck.id}">▶</span>
            <div>
              <div style="font-weight:700; color:var(--text-primary);">${deck.name || deck.id}</div>
              <div style="font-size:12px; color:var(--text-secondary);">${(deck.subjects || []).length} matéria(s) • ${totalCards} card(s)</div>
            </div>
          </div>
          <button class="btn-delete" onclick="event.stopPropagation(); confirmDeleteDeck('${deck.id}')" style="padding:6px 12px; font-size:12px; border-radius:6px; border:none; cursor:pointer;">🗑️ Apagar Deck</button>
        </div>
        <div class="fb-deck-content" id="content-deck-${deck.id}" style="display:none;">
          ${renderDeckSubjects(deck)}
        </div>
      </div>
    `;
  }).join('');
}

function renderDeckSubjects(deck) {
  if (!deck.subjects || deck.subjects.length === 0) {
    return '<p style="color:var(--text-secondary); padding:12px; font-size:13px;">Nenhuma matéria</p>';
  }
  return deck.subjects.map(subject => `
    <div class="fb-subject">
      <div class="fb-subject-header" onclick="toggleSubjectExpand('${deck.id}', '${subject.id}')">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="fb-toggle" id="toggle-subject-${deck.id}-${subject.id}">▶</span>
          <div>
            <div style="font-weight:600; color:var(--text-primary); font-size:14px;">${subject.name}</div>
            <div style="font-size:12px; color:var(--text-secondary);">${(subject.flashcards || []).length} card(s)</div>
          </div>
        </div>
        <button class="btn-delete" onclick="event.stopPropagation(); confirmDeleteSubject('${deck.id}', '${subject.id}')" style="padding:5px 10px; font-size:12px; border-radius:6px; border:none; cursor:pointer;">🗑️ Apagar Matéria</button>
      </div>
      <div class="fb-subject-content" id="content-subject-${deck.id}-${subject.id}" style="display:none;">
        ${renderDeckCards(deck.id, subject)}
      </div>
    </div>
  `).join('');
}

function renderDeckCards(deckId, subject) {
  if (!subject.flashcards || subject.flashcards.length === 0) {
    return '<p style="color:var(--text-secondary); padding:12px; font-size:13px;">Nenhum card</p>';
  }
  return subject.flashcards.map(card => {
    const questionText = stripHtml(card.question || '');
    const answerText = stripHtml(card.answer || '');
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
          <button class="btn-edit" onclick="openEditCardModal('${deckId}', '${subject.id}', '${card.id}')" style="padding:6px 12px; font-size:12px; border-radius:6px; border:none; cursor:pointer;">✏️ Editar</button>
          <button class="btn-delete" onclick="confirmDeleteCard('${deckId}', '${subject.id}', '${card.id}')" style="padding:6px 12px; font-size:12px; border-radius:6px; border:none; cursor:pointer;">🗑️ Apagar</button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleDeckExpand(deckId) {
  const content = document.getElementById(`content-deck-${deckId}`);
  const toggle = document.getElementById(`toggle-deck-${deckId}`);
  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  toggle.textContent = isOpen ? '▶' : '▼';
}

function toggleSubjectExpand(deckId, subjectId) {
  const content = document.getElementById(`content-subject-${deckId}-${subjectId}`);
  const toggle = document.getElementById(`toggle-subject-${deckId}-${subjectId}`);
  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  toggle.textContent = isOpen ? '▶' : '▼';
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
  const deck = firebaseDecks.find(d => d.id === deckId);
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

  if (result.success) {
    renderFirebaseDecks();
    showStatus('✅ Matéria apagada com sucesso!', 'success');
  } else {
    showStatus(`❌ Erro ao apagar matéria: ${result.error}`, 'error');
  }
}

function confirmDeleteCard(deckId, subjectId, cardId) {
  if (confirm('Apagar este card?\n\nEssa ação não pode ser desfeita.')) {
    deleteCardFromFirebase(deckId, subjectId, cardId);
  }
}

async function deleteCardFromFirebase(deckId, subjectId, cardId) {
  showStatus('⏳ Apagando card...', 'warning');
  const deck = firebaseDecks.find(d => d.id === deckId);
  if (!deck) return;
  const subject = deck.subjects.find(s => s.id === subjectId);
  if (!subject) return;

  subject.flashcards = subject.flashcards.filter(c => c.id !== cardId);
  const result = await updateDeckInFirebase(deckId, { name: deck.name, subjects: deck.subjects });

  if (result.success) {
    renderFirebaseDecks();
    showStatus('✅ Card apagado com sucesso!', 'success');
  } else {
    showStatus(`❌ Erro ao apagar card: ${result.error}`, 'error');
  }
}

function htmlToLatexSource(html) {
  if (!html) return '';
  const hasHtml = /<[a-z][\s\S]*>/i.test(html);
  if (!hasHtml) return html;

  const div = document.createElement('div');
  div.innerHTML = html;

  div.querySelectorAll('.math-atom[data-latex]').forEach(el => {
    const latex = el.getAttribute('data-latex');
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
  renderMathField('editCardAnswer', 'preview-editCardAnswer');
}

function renderMathField(fieldId, previewId) {
  const textarea = document.getElementById(fieldId);
  const preview = document.getElementById(previewId);
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
      try {
        katex.render(formula, el, { displayMode: el.classList.contains('math-block') });
      } catch (e) {}
    });
  }
}

function openEditCardModal(deckId, subjectId, cardId) {
  const deck = firebaseDecks.find(d => d.id === deckId);
  const subject = deck?.subjects?.find(s => s.id === subjectId);
  const card = subject?.flashcards?.find(c => c.id === cardId);
  if (!card) return;

  editingCard = { deckId, subjectId, cardId };
  document.getElementById('editCardContext').textContent = `${deck.name} › ${subject.name}`;
  document.getElementById('editCardQuestion').value = htmlToLatexSource(card.question || '');
  document.getElementById('editCardAnswer').value = htmlToLatexSource(card.answer || '');
  document.getElementById('preview-editCardQuestion').innerHTML = '';
  document.getElementById('preview-editCardAnswer').innerHTML = '';
  document.getElementById('editCardModal').style.display = 'flex';

  document.getElementById('editCardQuestion').oninput = updateEditPreview;
  document.getElementById('editCardAnswer').oninput = updateEditPreview;
  updateEditPreview();
}

function closeEditCardModal() {
  document.getElementById('editCardModal').style.display = 'none';
  document.getElementById('editCardQuestion').oninput = null;
  document.getElementById('editCardAnswer').oninput = null;
  closeMathKeyboard();
  editingCard = null;
}

function handleEditModalOverlayClick(e) {
  if (e.target === document.getElementById('editCardModal')) closeEditCardModal();
}

async function saveEditedCard() {
  if (!editingCard) return;
  const { deckId, subjectId, cardId } = editingCard;
  const question = convertLatexToHtml(document.getElementById('editCardQuestion').value.trim());
  const answer = convertLatexToHtml(document.getElementById('editCardAnswer').value.trim());

  const deck = firebaseDecks.find(d => d.id === deckId);
  const subject = deck?.subjects?.find(s => s.id === subjectId);
  const card = subject?.flashcards?.find(c => c.id === cardId);
  if (!card) return;

  card.question = question;
  card.answer = answer;

  closeEditCardModal();
  showStatus('⏳ Salvando...', 'warning');

  const result = await updateDeckInFirebase(deckId, { name: deck.name, subjects: deck.subjects });

  if (result.success) {
    renderFirebaseDecks();
    showStatus('✅ Card atualizado no Firebase!', 'success');
  } else {
    showStatus(`❌ Erro ao salvar: ${result.error}`, 'error');
  }
}
