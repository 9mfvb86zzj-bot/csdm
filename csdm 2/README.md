# CSDM — Hasta Donde Te Animás 🃏

Juego de cartas multijugador en tiempo real. Cada jugador entra desde su propio dispositivo con un link.

---

## Paso 1 — Crear proyecto en Firebase (gratis, 5 min)

1. Ir a https://console.firebase.google.com
2. **"Crear un proyecto"** → ponele cualquier nombre (ej: `csdm-juego`)
3. Desactivar Google Analytics si querés (no hace falta)
4. En el menú izquierdo ir a **Compilación → Realtime Database**
5. Clic en **"Crear base de datos"**
6. Elegir la región más cercana (us-central1 está bien)
7. Seleccionar **"Iniciar en modo de prueba"** → Habilitar
8. En el menú izquierdo ir a **Configuración del proyecto** (ícono ⚙️)
9. Bajar hasta **"Tus apps"** → clic en el ícono `</>`  (Web)
10. Registrar la app con cualquier nombre → te va a mostrar un objeto `firebaseConfig`

---

## Paso 2 — Pegar la config en el proyecto

Abrí el archivo `src/firebase.js` y reemplazá los valores:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",          // ← tu valor
  authDomain:        "mi-proyecto.firebaseapp.com",
  databaseURL:       "https://mi-proyecto-default-rtdb.firebaseio.com",
  projectId:         "mi-proyecto",
  storageBucket:     "mi-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...",
}
```

---

## Paso 3 — Subir a Vercel (gratis, 3 min)

### Opción A: desde GitHub (recomendado)
1. Subí esta carpeta a un repositorio en https://github.com (nuevo repo)
2. Ir a https://vercel.com → "New Project"
3. Importar el repo → Deploy
4. En ~1 minuto tenés tu link: `https://csdm-juego.vercel.app`

### Opción B: con la CLI de Vercel
```bash
npm install -g vercel
npm install
vercel
```
Seguí los pasos en pantalla. Al final te da un link público.

---

## Cómo jugar (resumen)

- **El host** crea la sala y comparte el código de 5 letras
- **Cada jugador** entra al link, escribe su nombre y pone el código
- Con 3+ jugadores el host inicia la partida
- Cada ronda hay un **HDP** (juez) que no juega cartas
- El resto **elige una carta de su mano** (puede editarla antes de enviar)
- El HDP **revela las cartas de a una**
- Todos **votan** la que les parece más graciosa
- La más votada gana el punto
- El rol de HDP rota cada ronda

---

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:5173
