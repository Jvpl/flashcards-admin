// Firebase Config (importe conforme necessário)
const firebaseConfig = {
  apiKey: "AIzaSyAnjK1KLUYhJLe2WE4BsnJfNwftCcyoNgI",
  authDomain: "flashcards-concurso.firebaseapp.com",
  projectId: "flashcards-concurso",
  storageBucket: "flashcards-concurso.firebasestorage.app",
  messagingSenderId: "333503732641",
  appId: "1:333503732641:web:6b4b3d1e757bd8a68d49e0"
};

// Inicializar Firebase (será feito no app.js)
let db = null;

/**
 * Inicializar conexão com Firebase
 */
async function initFirebase() {
  try {
    // Importar Firebase
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase inicializado');
    return db;
  } catch (e) {
    console.error('❌ Erro ao inicializar Firebase:', e);
    return null;
  }
}

/**
 * Salvar um card no Firebase
 */
async function saveCard(cardData) {
  try {
    if (!db) await initFirebase();
    const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

    const docRef = await addDoc(collection(db, 'flashcards'), {
      ...cardData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (e) {
    console.error('Erro ao salvar card:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Salvar múltiplos cards em lote
 */
async function saveCardsInBatch(cardsData) {
  try {
    if (!db) await initFirebase();
    const results = [];

    for (const card of cardsData) {
      const result = await saveCard(card);
      results.push(result);
    }

    return { success: true, total: results.length, results };
  } catch (e) {
    console.error('Erro ao salvar cards em lote:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Buscar todos os cards
 */
async function getAllCards() {
  try {
    if (!db) await initFirebase();
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

    const querySnapshot = await getDocs(collection(db, 'flashcards'));
    const cards = [];
    querySnapshot.forEach((doc) => {
      cards.push({ id: doc.id, ...doc.data() });
    });
    return cards;
  } catch (e) {
    console.error('Erro ao buscar cards:', e);
    return [];
  }
}

/**
 * Deletar um card
 */
async function deleteCard(cardId) {
  try {
    if (!db) await initFirebase();
    const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

    await deleteDoc(doc(db, 'flashcards', cardId));
    return { success: true };
  } catch (e) {
    console.error('Erro ao deletar card:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Carregar todos os decks de /decks
 */
async function loadAllDecks() {
  try {
    if (!db) await initFirebase();
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

    const querySnapshot = await getDocs(collection(db, 'decks'));
    const decks = [];
    querySnapshot.forEach((doc) => {
      decks.push({ id: doc.id, ...doc.data() });
    });
    return decks;
  } catch (e) {
    console.error('Erro ao carregar decks:', e);
    return [];
  }
}

/**
 * Atualizar um deck em /decks/{deckId}
 */
async function updateDeckInFirebase(deckId, deckData) {
  try {
    if (!db) await initFirebase();
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

    await setDoc(doc(db, 'decks', deckId), {
      ...deckData,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (e) {
    console.error('Erro ao atualizar deck:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Deletar um deck de /decks/{deckId} e seu produto em /products/{deckId}
 */
async function deleteDeckInFirebase(deckId) {
  try {
    if (!db) await initFirebase();
    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

    await deleteDoc(doc(db, 'decks', deckId));
    try { await deleteDoc(doc(db, 'products', deckId)); } catch (_) {}
    return { success: true };
  } catch (e) {
    console.error('Erro ao deletar deck:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Salvar produto em /products/{deckId}
 */
async function saveProductInFirebase(deckId, productData) {
  try {
    if (!db) await initFirebase();
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    await setDoc(doc(db, 'products', deckId), {
      ...productData,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (e) {
    console.error('Erro ao salvar produto:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Remove produtos em /products cujos decks nao existem mais em /decks
 */
async function _cleanOrphanedProductsFirebase() {
  try {
    if (!db) await initFirebase();
    const { collection, getDocs, doc, getDoc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    const productsSnap = await getDocs(collection(db, 'products'));
    const removed = [];
    const errors = [];
    for (const productDoc of productsSnap.docs) {
      const product = productDoc.data();
      const deckId = product.deckId || productDoc.id;
      const deckSnap = await getDoc(doc(db, 'decks', deckId));
      if (!deckSnap.exists()) {
        try {
          await deleteDoc(doc(db, 'products', productDoc.id));
          removed.push(product.name || productDoc.id);
        } catch (e) { errors.push(productDoc.id); }
      }
    }
    return { success: true, removed, errors };
  } catch (e) {
    console.error('Erro ao limpar produtos orfaos:', e);
    return { success: false, error: e.message };
  }
}
