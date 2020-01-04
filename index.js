const app = require('./app');
const debug = require('debug')('geocentric-backend:server');
const https = require('https');
const fs = require('fs')
const { SERVER_CONFIG } = require('./config');

app.set('port', SERVER_CONFIG.PORT);
const options = {
    cert: fs.readFileSync('./1_geo.littlehumming.cn_bundle.crt'),
    key: fs.readFileSync('./2_geo.littlehumming.cn.key'),
}
const server = https.createServer(options, app);
server.listen(SERVER_CONFIG.PORT);
server.on('error', onError);
server.on('listening', onListening);

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    let port = SERVER_CONFIG.PORT;
    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
