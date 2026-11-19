CORRECCION FRONTEND - AGENDA GENERAL
Fecha: 19/11/2026

Se corrigieron los eventos de paginación de Agenda general en:
frontend/src/app/admin.ts

Los botones Aplicar filtros, Anterior y Siguiente ahora llaman a métodos del componente:
- applyAgendaFilters()
- previousAgendaPage()
- nextAgendaPage()

Esto evita el uso de operadores de incremento/decremento dentro de expresiones de plantilla Angular.

No se modificó la base de datos ni las migraciones. No es necesario recrear PostgreSQL.

Para iniciar:
1. Ejecutar iniciar-backend.ps1 en una ventana.
2. Ejecutar iniciar-frontend.ps1 en otra ventana.

Nota de validación: el cambio de sintaxis fue revisado en el código fuente. No se pudo completar ng build en el entorno de preparación porque npm no logró descargar todas las dependencias del registro.
