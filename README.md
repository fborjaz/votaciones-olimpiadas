# Votación de pancartas – Olimpiadas Paz para Vivir

## 1. Fotos de las pancartas
Guarde 9 fotos en `img/cursos/` con estos nombres: `c1.jpg` … `c9.jpg`
(el curso de cada una se edita en `js/config.js`). Reduzca cada foto a ~1600 px de ancho (<400 KB) para que cargue rápido en celular.
Si falta una foto, la página muestra un marcador.

## 2. Contar votos de todos los celulares (Firebase, gratis)
1. https://console.firebase.google.com → **Agregar proyecto** (sin Analytics).
2. **Compilación → Firestore Database → Crear base de datos** (modo producción, región cercana).
3. Pestaña **Reglas**, pegue y **Publique**:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /votos/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['curso','t'])
                    && request.resource.data.curso in ['c1','c2','c3','c4','c5','c6','c7','c8','c9'];
      allow update, delete: if false;
    }
  }
}
```
4. **Configuración del proyecto (engranaje) → Tus apps → Web `</>`** → registrar → copie el objeto `firebaseConfig` dentro de `FIREBASE_CONFIG` en `js/config.js`.

## 3. Publicar en GitHub Pages
1. Cree repo público, suba todo el contenido de esta carpeta.
2. **Settings → Pages → Branch: main, carpeta / (root)** → Save.
3. URL: `https://SU-USUARIO.github.io/NOMBRE-REPO/`. Genere un QR de esa URL para los padres.

## Probar en su PC
Los módulos JS no funcionan abriendo el archivo con doble clic. Use la extensión **Live Server** de VS Code o `python -m http.server`.

## Resultados para el organizador
Agregue `?resultados` a la URL para ver la carrera sin votar.

## Límite
Un voto por navegador/celular. Quien borre los datos del navegador o use modo incógnito podría votar otra vez; para una votación escolar es suficiente.
