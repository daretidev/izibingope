Flujo para el usuario


- La pantalla principal puede seleecionar el tipo de juego y agregar tarjetas. y no muestra otras opciones de jugeo. 
- seleeciona el tipo de juego y se muestran los controles de agregar numeros, limpiar numeros extraidos,  
- Por defecto se ordenaran las tarjetaas a medida que esten mas cerca de ser completadas

---------  

Cambios 1: 

- Agregar juego y agregar tarjeta, seran botones que contengan iconos en la parte superior de la sección.   (no pongas la fecha de creacion de la sesión, no apoya a la visibilidad y quita espacio (igual con el titulo de la sesion ya esta en la vista de menu.))

- Seleccionar tipo de juego debe abrir un modal con los tipos de juego en formato de botones con iconos miniatura.  

- el input text de agregar numero debe tener al costado el icono de enviar como boton para agrgar y el icono de deshacer en lugar de tener un boton textual. 

- Limpiar numeros extraidos tambien debe ser un boton con icono en la sección superior 

## ✅ **Formato de Botones Cuadrados Implementado**

### 🎯 **Cambios Aplicados**

1. **Altura aumentada**: `h-32` (128px) para más espacio
2. **Icono más grande**: `text-4xl` para mayor visibilidad
3. **Texto más legible**: `text-sm` en lugar de `text-xs`
4. **Estructura mejorada**: 
   - `flex-1` para distribuir el espacio equitativamente
   - Dos contenedores separados para icono y texto
   - Centrado perfecto en cada sección

### 📐 **Estructura del Botón**

```
<code_block_to_apply_changes_from>
```

### 🎨 **Características del Diseño**

- **Formato cuadrado perfecto** con `aspect-square`
- **Icono prominente** en la parte superior
- **Texto descriptivo** en la parte inferior
- **Espaciado equilibrado** entre secciones
- **Centrado perfecto** de ambos elementos

Ahora los botones del modal tienen el formato cuadrado que solicitaste, con el icono claramente visible en la parte superior y el texto descriptivo en la parte inferior.
