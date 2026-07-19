# La Rockola del Tiempo

Primera base React + Firebase del modo multijugador.

## Funciones incluidas
- Inicio de sesión anónimo con Firebase.
- Crear sala privada con código de 6 caracteres.
- Unirse mediante código o enlace con `?sala=ABC123`.
- Lista de jugadores sincronizada en tiempo real.
- Código QR de invitación.
- Host y botón de inicio.
- Recuperación básica de la sala al recargar.

## Desarrollo local
```bash
npm install
npm run dev
```

## Publicar en Vercel
Importa este repositorio en Vercel. Framework preset: **Vite**. No hace falta configurar comandos manuales.

## Firebase
La configuración ya apunta al proyecto `la-rockola-del-tiempo`. En Realtime Database, publica las reglas incluidas en `firebase-rules.json`.
