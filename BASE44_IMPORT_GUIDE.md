# Dingo App en Base44: guia paso a paso

Esta guia explica como llevar Dingo App a Base44 usando GitHub y como seguir modificandola desde este proyecto.

## 1. Que contiene este proyecto

- `src/DingoApp.jsx`: la Dingo App en React. Este es el archivo principal que Base44 debe usar.
- `src/main.jsx`: monta Dingo App dentro de React.
- `styles.css`: estilos visuales del widget.
- `public/assets/`: imagenes de Dingo y logo de Monark.
- `base44/functions/dingoAi/entry.ts`: funcion backend para Gemini. La API key vive aqui como variable segura, no en el frontend.
- `server.js`: servidor local para probar en tu computadora. No es necesario para Base44 si usas la funcion `dingoAi`.

## 2. Crear el repositorio en GitHub

1. Entra a GitHub.
2. Crea un repositorio nuevo, por ejemplo: `dingo-monark-assistant`.
3. Sube este proyecto completo al repositorio.
4. Verifica que NO subiste `.env`.

Archivos que si deben subir:

- `src/`
- `public/`
- `base44/`
- `package.json`
- `vite.config.js`
- `styles.css`
- `index.html`

Archivos que no deben subir:

- `.env`
- `node_modules/`
- `dist/`
- archivos `.log`

## 3. Importar en Base44 desde GitHub

1. Entra a Base44.
2. Crea una app nueva o abre la app donde quieres instalar Dingo.
3. Busca la opcion de GitHub / Import from GitHub.
4. Conecta tu cuenta de GitHub.
5. Selecciona el repositorio `dingo-monark-assistant`.
6. Configura el build:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output folder: `dist`

## 4. Configurar la API de Gemini en Base44

En Base44, agrega variables de entorno para la app o funcion:

```bash
GEMINI_API_KEY=tu_clave_de_gemini
GEMINI_MODEL=gemini-2.5-flash
VITE_DINGO_AI_ENDPOINT=/functions/dingoAi
```

Importante:

- No pongas la API key dentro de `src/DingoApp.jsx`.
- No uses `VITE_GEMINI_API_KEY`.
- La variable `VITE_DINGO_AI_ENDPOINT` no es secreta. Solo le dice al frontend cual funcion llamar.

## 5. Funcion backend en Base44

La funcion preparada esta en:

```text
base44/functions/dingoAi/entry.ts
```

Esa funcion recibe preguntas desde Dingo App, llama a Gemini y responde al widget.

Ruta esperada en Base44:

```text
/functions/dingoAi
```

## 6. Como modificar Dingo desde aqui y actualizar Base44

Flujo recomendado:

1. Modificamos la app aqui en Codex.
2. Probamos localmente.
3. Subes los cambios a GitHub.
4. Base44 sincroniza o redeploya desde GitHub.
5. La pagina de Base44 queda actualizada.

En la practica, los archivos que mas vamos a tocar son:

- Texto, acciones, calendario, moods: `src/DingoApp.jsx`
- Diseno visual: `styles.css`
- Imagenes: `public/assets/`
- Comportamiento de Gemini: `base44/functions/dingoAi/entry.ts`

## 7. Probar localmente antes de subir

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env` usando `.env.example`.

3. Corre el servidor local:

```bash
npm run server
```

4. En otra terminal, corre Vite:

```bash
npm run dev
```

5. Abre:

```text
http://127.0.0.1:5173/
```

## 8. Nota importante sobre la version actual

La app local estatica que hemos estado viendo en `http://127.0.0.1:4173/` usa:

- `index.html`
- `app.js`
- `styles.css`

La version recomendada para Base44 usa:

- `src/DingoApp.jsx`
- `src/main.jsx`
- `styles.css`
- `base44/functions/dingoAi/entry.ts`

Desde ahora, para que todo se mantenga sincronizado con Base44, conviene hacer los cambios principales en `src/DingoApp.jsx`.
