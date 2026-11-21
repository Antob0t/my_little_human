# My Little Human

Tres minijuegos con forma de captcha, en estilo infantil de cera de colores.
Web estática (HTML, CSS y JavaScript, sin dependencias), pensada primero para móvil
e instalable como app (PWA) con funcionamiento sin conexión.

## Juegos

| Página        | Juego | Cómo se juega |
|---------------|-------|---------------|
| `robot.html`  | **I'm Not a Robot** | Pulsa el botón. Con un 2% de probabilidad sale la versión dorada. |
| `puzzle.html` | **Dog Puzzle** | Puzle deslizante 4x4: mueve las piezas hasta reconstruir la imagen. |
| `lucky.html`  | **Lucky Clicker** | Marca las casillas con tréboles de cuatro hojas y pulsa *Verify* (6 niveles). |

`index.html` es la portada con los tres juegos.

## Probarlo en local

Abre `index.html` en el navegador. Para probar la app instalable y el modo sin conexión
hace falta servirla por `localhost` o `https` (por ejemplo, con la extensión *Live Server*
de VS Code o con `npx serve`).

## Publicarlo con GitHub Pages

1. Sube el proyecto a un repositorio público de GitHub.
2. En el repositorio: *Settings → Pages → Build and deployment → Source: Deploy from a branch*,
   rama `main`, carpeta `/ (root)` → *Save*.
3. En uno o dos minutos la web estará en `https://<tu-usuario>.github.io/<repositorio>/`.

### Instalarla en el móvil

- **Android (Chrome):** abre el enlace → menú ⋮ → *Instalar app*.
- **iPhone (Safari):** abre el enlace → *Compartir* → *Añadir a pantalla de inicio*.

## Estructura

```
index.html, robot.html, puzzle.html, lucky.html   páginas
css/style.css                                     estilos (paleta del logo, efecto cera)
js/common.js                                      sonido, brillitos, filtros de cera, service worker
js/robot.js, js/puzzle.js, js/lucky.js            lógica de cada juego (bloque CONFIG al principio)
manifest.webmanifest, sw.js                       app instalable y modo sin conexión
assets/img/                                       imágenes originales
assets/web/                                       imágenes optimizadas que usa la web + iconos
tools/optimize-images.ps1                         genera assets/web a partir de assets/img
```

## Cambiar imágenes

Pon los originales en `assets/img/` y regenera las versiones ligeras y los iconos (Windows):

```
powershell -ExecutionPolicy Bypass -File tools\optimize-images.ps1
```

Si añades archivos nuevos, inclúyelos en la lista `PRECACHE` de `sw.js` y sube el número
de `VERSION` para que la app instalada los descargue.

## Niveles de Lucky Clicker

En `js/lucky.js`, `CONFIG.levels`. Cada nivel es una imagen cuadrada con las casillas correctas:

```
1 2 3      lucky:    casillas que hay que marcar ([] = ninguna → la respuesta es Skip)
4 5 6      optional: casillas donde el objeto apenas asoma (da igual marcarlas o no)
7 8 9
```

| Imagen | lucky | optional |
|--------|-------|----------|
| lucky1 | 6, 9  | 3 |
| lucky2 | 6, 9  | 3 |
| lucky3 | 3, 7  | 6 |
| lucky4 | 1, 8  | 4 |
| lucky5 | 2, 7  | — |
| lucky6 | 1, 9  | 4 |

## Sonidos

Si existen, se usan estos archivos; si no, suena un efecto generado por el navegador:

```
assets/sounds/robot_click.mp3    robot_golden.mp3
assets/sounds/puzzle_move.mp3    puzzle_win.mp3
assets/sounds/lucky_select.mp3   lucky_correct.mp3   lucky_wrong.mp3   lucky_alldone.mp3
```
