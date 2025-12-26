module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nueva funcionalidad
        'fix',      // Corrección de bug
        'docs',     // Cambios en documentación
        'style',    // Cambios de formato (no afectan código)
        'refactor', // Refactorización
        'perf',     // Mejoras de performance
        'test',     // Añadir o modificar tests
        'chore',    // Tareas de mantenimiento
        'ci',       // Cambios en CI/CD
        'build',    // Cambios en build system
        'revert',   // Revertir commits
      ],
    ],
  },
};
