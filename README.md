# NEXO 2.0

PWA mobile-first para pequeños negocios.

## Módulos incluidos

- Dashboard diario
- Fiados y pagos
- Recordatorios por WhatsApp
- POS móvil
- Inventario y stock mínimo
- Escáner de códigos con BarcodeDetector
- Gastos
- Reportes básicos
- Cierre de caja
- Modo claro/oscuro
- Instalación PWA y funcionamiento offline
- Respaldo JSON

## Publicar en GitHub Pages

1. Sube todos los archivos a la raíz del repositorio.
2. Ve a **Settings > Pages**.
3. Selecciona la rama principal y `/root`.
4. Abre la URL HTTPS generada.

La cámara requiere HTTPS o localhost.

## Estado de esta versión

Los datos se guardan en `localStorage`. Para producción conviene agregar autenticación, Firebase/PostgreSQL, sincronización multiusuario, control de suscripciones y copias de seguridad en la nube.


## Versión 2.0 V4
- Corrige el cierre inesperado al escanear productos durante una venta.
- Restaura el carrito de forma segura tras reconocer el código.
- Evita entregas duplicadas del mismo escaneo.
- Actualiza la caché PWA para servir el código corregido.
