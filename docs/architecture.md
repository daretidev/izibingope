# Arquitectura Técnica de Izibingope

## Arquitectura General
- **Frontend:** React con TypeScript.
- **Backend:** Firebase Functions (opcional futuro).
- **Base de Datos:** Firestore para persistencia de sesiones, tarjetas y progreso.
- **Autenticación:** Firebase Auth con login vía Google.

## Diagrama de componentes


[Usuario] --> [Frontend React] --> [Firebase Auth / Firestore]

## Deployment
- **Frontend:** Vercel o Netlify.
- **Backend:** Firebase (plan gratuito).

## Escalabilidad
Diseñado inicialmente para uso personal o con amigos. A futuro:
- Soporte para sesiones en línea.
- Modo multijugador sincronizado.
