// Este archivo contiene la configuración de Firebase y NO debe ser subido a GitHub.

const firebaseConfig = {
  // Esta es tu configuración real de Firebase.
  apiKey: "AIzaSyDzO9PfxhavRI5B30Lz4Se4shklV2VRycc",
  authDomain: "duoq-ranking-final.firebaseapp.com",
  databaseURL: "https://duoq-ranking-final-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "duoq-ranking-final",
  storageBucket: "duoq-ranking-final.firebasestorage.app",
  messagingSenderId: "834663193099",
  appId: "1:834663193099:web:32095cc8cedd420143c50e",
  measurementId: "G-H0RERB82FJ"
};

// Inicializar Firebase (de forma segura, para evitar errores de doble inicialización)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Hacemos la base de datos accesible globalmente para los otros scripts
const database = firebase.database();
