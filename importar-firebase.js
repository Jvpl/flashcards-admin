// Script para importar decks no Firebase
// Uso: node importar-firebase.js decks-2025-02-16.json

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  apiKey: "AIzaSyAnjK1KLUYhJLe2WE4BsnJfNwftCcyoNgI",
  authDomain: "flashcards-concurso.firebaseapp.com",
  projectId: "flashcards-concurso",
  storageBucket: "flashcards-concurso.firebasestorage.app",
  messagingSenderId: "333503732641",
  appId: "1:333503732641:web:6b4b3d1e757bd8a68d49e0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importar() {
  // Pegar arquivo passado como argumento
  const arquivo = process.argv[2];
  if (!arquivo) {
    console.error('❌ Informe o arquivo JSON: node importar-firebase.js decks-2025-02-16.json');
    process.exit(1);
  }

  const filePath = path.resolve(arquivo);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const decks = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`\n📦 Importando ${decks.length} deck(s)...\n`);

  for (const deck of decks) {
    try {
      // Salvar em /decks/{deckId}
      await setDoc(doc(db, 'decks', deck.id), {
        name: deck.name,
        subjects: deck.subjects,
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ Deck salvo: ${deck.name} (${deck.id})`);

      // Contar total de cards
      const totalCards = deck.subjects.reduce((acc, s) => acc + s.flashcards.length, 0);
      const totalSubjects = deck.subjects.length;
      console.log(`   📚 ${totalSubjects} matéria(s), ${totalCards} card(s)`);

      // Criar produto correspondente em /products (se não quiser pagar, coloca price: 0)
      await setDoc(doc(db, 'products', deck.id), {
        deckId: deck.id,
        name: deck.name,
        type: 'full',
        price: 0,
        playStoreId: deck.id,
        description: `${totalSubjects} matérias • ${totalCards} flashcards`,
        updatedAt: new Date().toISOString()
      });
      console.log(`   🛍️  Produto criado na loja: ${deck.name}\n`);

    } catch (e) {
      console.error(`❌ Erro ao salvar deck ${deck.id}:`, e.message);
    }
  }

  console.log('✅ Importação concluída!');
  process.exit(0);
}

importar();
