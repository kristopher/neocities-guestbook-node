var cluster = require('cluster');
var http = require('http');
var num = 10;

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < num; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {
  require('./app');
}