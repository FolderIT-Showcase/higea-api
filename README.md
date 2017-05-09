# Higea API
API de servicios REST para la conexión a los productos de la familia Higea.

# Tecnologías
* MongoDB 3.4.3
* Express.js 4.15.2
* AngularJS 1.6.4
* Node.js 7.10.0

# Requerimientos Previos
Las siguientes herramientas y librerías deben instalarse y configurarse en el sistema de desarrollo y producción:
* NPM
* Bower

# Instalación
1. Clonar el repositorio en el equipo de desarrollo o servidor de producción

2. Ejecutar en la línea de comandos en consola:
```
> npm install
```

3. El sistema utiliza la variable de entorno NODE_ENV ('development' por defecto) para definir el entorno de ejecución y la variable PORT ('3000' por defecto) para definir el puerto del servidor web.

4. Para ejecutar el sistema se puede utilizar `nodemon`, `forever`, `winser` o `systemd` (en entornos Unix)