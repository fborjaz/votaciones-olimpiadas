// ====== CONFIGURACIÓN (edita solo este archivo) ======

// 1) Cursos. "foto" = archivo dentro de img/cursos/ (jpg o png).
//    Cambia los nombres si tus cursos son otros.
export const CURSOS = [
  { id: "c1", nombre: "Inicial y Primero", foto: "img/cursos/c1.jpg" },
  { id: "c2", nombre: "Segundo",           foto: "img/cursos/c2.jpg" },
  { id: "c3", nombre: "Tercero",           foto: "img/cursos/c3.jpg" },
  { id: "c4", nombre: "Cuarto",            foto: "img/cursos/c4.jpg" },
  { id: "c5", nombre: "Quinto",            foto: "img/cursos/c5.jpg" },
  { id: "c6", nombre: "Sexto y Séptimo",   foto: "img/cursos/c6.jpg" },
  { id: "c7", nombre: "Octavo",            foto: "img/cursos/c7.jpg" },
  { id: "c8", nombre: "Noveno",            foto: "img/cursos/c8.jpg" },
  { id: "c9", nombre: "Décimo",            foto: "img/cursos/c9.jpg" },
];

// 2) Firebase (para que los votos se sumen entre todos los celulares).
//    Si lo dejas vacío, la página funciona en MODO PRUEBA (los votos
//    solo se guardan en ese dispositivo). Mira el README.md.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD9OJvpImvapmF1F47Lp0GjSyoK36WnIPc",
  authDomain: "paz-para-vivir-votos.firebaseapp.com",
  projectId: "paz-para-vivir-votos",
  storageBucket: "paz-para-vivir-votos.firebasestorage.app",
  messagingSenderId: "693167523412",
  appId: "1:693167523412:web:52d60a139112405c0fcfc1",
};

// 3) Hora en que se muestran los resultados (hora de Guayaquil, UTC-5).
//    Antes de esa hora todos ven un cronómetro en lugar de los números.
export const RESULTADOS_A = "2026-10-09T11:00:00-05:00";
export const RESULTADOS_TEXTO = "11:00 a. m.";

// 4) Versión de la votación. Si la cambias (por ejemplo "2" → "3"), todos los
//    celulares olvidan su voto anterior y pueden votar de nuevo.
//    Recuerda borrar también los documentos de la colección "votos" en Firebase.
export const VERSION_VOTACION = "2";
