var express = require('express'),
    app = express(),
    path = require('path'),
    index = require('./routes/index'),
    mongoose = require('mongoose'),
    config = require('./config'),
    favicon = require('serve-favicon'),
    toobusy = require('toobusy-js'),
    logger = require('tracer').colorConsole(config.loggerFormat);

global.environment = config.environment;
global.loggerFormat = config.loggerFormat;
global.tokenSecret = config.tokenSecret;
// global.appRoot = require('app-root-path').path;

toobusy.maxLag(200);
toobusy.interval(1000);

logger.log("Entorno:", global.environment);

mongoose.connect(config.databases[global.environment], { server: { auto_reconnect: true } });

var db = mongoose.connection;
db.on('error', (err) => {
    logger.warn(err);
});
db.once('open', function () {
    logger.log("Connection to DB established");

    // Control de sobrecarga
    app.use(function (req, res, next) {
        if (toobusy()) res.status(503).send("El servicio se encuentra sobrecargado. Por favor, intente nuevamente.");
        else next();
    });

    // Contenido estático
    app.use(favicon(path.join(__dirname, 'public', 'assets', 'img', 'favicon.ico')));
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/bower_components', express.static(path.join(__dirname, '/bower_components')));

    // Inicialización de rutas
    index(app);

    // Catch all (404)
    app.get('/api/*', (req, res) => {
        res.status(404).send({
            result: false,
            err: "Ruta no encontrada"
        });
    });

    app.get('/*', function (req, res) {
        res.sendFile(__dirname + '/public/index.html')
    });

    app.listen(process.env.PORT || 80, function () {
        logger.log('Higea API listening on port', (process.env.PORT || 80));

        // Inicializacion de modelos de la base de datos
        require('./models');

        logger.info("Operating at maximum efficiency.");
    });
});
db.on('disconnected', function () {
    logger.error('Database disconnected!');
    mongoose.connect(config.databases[global.environment], { server: { auto_reconnect: true } });
});
