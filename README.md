# 📚 Flashcards Admin Panel

Painel administrativo para criar e gerenciar flashcards para concursos públicos integrado com Firebase Firestore.

## ✨ Funcionalidades

- ✅ **Editor de cards** com suporte a fórmulas matemáticas (LaTeX/KaTeX)
- ✅ **Upload em lote** via arquivo JSON
- ✅ **Preview em tempo real** dos cards
- ✅ **Sincronização com Firebase** Firestore
- ✅ **Interface dark theme** parecida com o app mobile
- ✅ **Edição e deleção** de cards antes de salvar
- ✅ **Filtros** por concurso e matéria

## 🚀 Como usar

### 1. Clone o repositório

```bash
git clone https://github.com/Jvpl/flashcards-admin.git
cd flashcards-admin
```

### 2. Abra no navegador

Opção A - Abra o arquivo diretamente:
```bash
# Abra o arquivo index.html no seu navegador
# (funciona localmente sem servidor)
```

Opção B - Use um servidor local:
```bash
npm install
npm start
# Acesse http://localhost:8080
```

### 3. Configure Firebase (Opcional)

Se quiser salvar direto no Firebase:

1. Abra `js/firebase-config.js`
2. Substitua as credenciais Firebase pelas suas
3. Teste a funcionalidade "Salvar no Firebase"

## 📝 Como criar flashcards

### Método 1: Criar individualmente

1. Vá para a aba **"➕ Criar Card"**
2. Preencha os campos:
   - **Concurso**: Ex: "INSS 2025"
   - **Matéria**: Ex: "Português"
   - **Frente (Pergunta)**: Pergunta do card
   - **Verso (Resposta)**: Resposta do card
3. Use as ferramentas de formatação:
   - **∑ Fórmula**: Insira fórmulas LaTeX
   - **B**: Negrito
   - **I**: Itálico
4. Veja o preview em tempo real
5. Clique em **"Adicionar Card"**
6. Repita quantas vezes precisar
7. Clique em **"💾 Salvar no Firebase"**

### Método 2: Upload em lote

1. Vá para a aba **"📤 Upload em Lote"**
2. Prepare um arquivo JSON com os cards
3. Arraste o arquivo para a área ou clique para selecionar
4. Veja o preview dos cards
5. Clique em **"Importar Cards"**
6. Clique em **"💾 Salvar no Firebase"**

## 📋 Formato do arquivo JSON

```json
[
  {
    "concurso": "INSS 2025",
    "materia": "Português",
    "frente": "O que é um verbo?",
    "verso": "Verbo é a classe de palavras que exprime ação, estado ou fenômeno."
  },
  {
    "concurso": "INSS 2025",
    "materia": "Matemática",
    "frente": "Quanto é $2^3$?",
    "verso": "$2^3 = 8$"
  },
  {
    "concurso": "ENEM 2026",
    "materia": "Física",
    "frente": "Qual é a fórmula da velocidade?",
    "verso": "$v = \\frac{d}{t}$"
  }
]
```

### Regras para fórmulas:

- Use `$formula$` para fórmulas inline (na mesma linha)
- Use `$$formula$$` para fórmulas em bloco (em linha separada)
- Sintaxe LaTeX completa é suportada
- Exemplos:
  - `$x^2$` → x²
  - `$$\\frac{a}{b}$$` → a/b (em bloco)
  - `$\\sqrt{4}$` → √4

## 🛠️ Tecnologias

- **HTML5** - Estrutura
- **CSS3** - Estilos (dark theme responsivo)
- **JavaScript Vanilla** - Lógica (sem dependências)
- **Firebase Firestore** - Banco de dados
- **KaTeX** - Renderização de fórmulas matemáticas

## 📂 Estrutura do projeto

```
flashcards-admin/
├── index.html              # Interface principal
├── package.json            # Dependências
├── README.md              # Este arquivo
├── css/
│   └── styles.css         # Estilos (dark theme)
└── js/
    ├── app.js             # Lógica principal
    └── firebase-config.js # Configuração Firebase
```

## 🔧 Configuração avançada

### Personalizar Firebase

1. Abra `js/firebase-config.js`
2. Substitua `firebaseConfig` com suas credenciais:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "ID",
  appId: "APP_ID"
};
```

## 📱 Responsivo

O painel funciona em:
- Desktop (1024px+)
- Tablet (768px - 1024px)
- Mobile (< 768px)

## 🐛 Troubleshooting

### Cards não estão salvando no Firebase
- Verifique as credenciais em `firebase-config.js`
- Verifique as permissões Firestore
- Abra o console (F12) para ver erros

### Fórmulas não aparecem
- Certifique-se de usar sintaxe LaTeX correta
- Verifique se KaTeX foi carregado (verá um aviso no console)

### Arquivo JSON não importa
- Valide o JSON em https://jsonlint.com/
- Certifique-se de que cada card tem os 4 campos obrigatórios

## 📞 Suporte

Para problemas ou sugestões, abra uma issue no GitHub.

## 📄 Licença

MIT - Use livremente em seus projetos!

---

**Desenvolvido com ❤️ para facilitar a criação de conteúdo educativo**
