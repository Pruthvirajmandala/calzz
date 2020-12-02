"use strict";
var express = require('express');
var webSocketServer = require('websocket').server;
var http = require('http');

//List of chat history objects and clients 
var history = [];
var clients = [];

// Escape input strings 
function htmlEntities(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// random color will be assigned to the user 
var colors = ['orange', 'yellow', 'black', 'magenta', 'violet', 'grey', 'red'];
colors.sort(function (a, b) { return Math.random() > 0.5; });

const PORT = process.env.PORT || 8081;
const INDEX = '/public/index.html';

const server = express()
  .use((req, res) => {
    switch (req.url) {
     case "/css/index.css":
      res.setHeader('content-type', 'text/css');
      res.sendFile('/public/css/index.css', { root: __dirname});
      break;
     case "/js/Calculator.js":
      res.setHeader('content-type', 'text/javascript');
      res.sendFile('/public/js/Calculator.js', { root: __dirname });
      break;
     case "/js/WebSocket.js":
      res.setHeader('content-type', 'text/javascript');
      res.sendFile('/public/js/WebSocket.js', { root: __dirname });
      break;
    default:
      res.setHeader('content-type', 'text/html');
      res.sendFile(INDEX, { root: __dirname });
  }})
   // res.sendFile(INDEX, { root: __dirname + '/public' }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));
  
var wsServer = new webSocketServer({
  httpServer: server
});

wsServer.on('request', function (request) {
  console.log((new Date()) + ' Connection from origin '
    + request.origin + '.');
  // making sure that client is connecting from our website
  var connection = request.accept(null, request.origin);
  // get client index so that it will be easier to remove when disconnected
  var index = clients.push(connection) - 1;
  var userName = false;
  var userColor = false;
  console.log((new Date()) + ' Connection accepted.');
  if (history.length > 0) {
    connection.sendUTF(
      JSON.stringify({ type: 'history', data: history }));
  }

  connection.on('message', function (message) {
    if (message.type === 'utf8') {
      // First message will always be the name of user 
      if (userName === false) {
        userName = htmlEntities(message.utf8Data);
        userColor = colors.shift();
        connection.sendUTF(
          JSON.stringify({ type: 'color', data: userColor }));
        console.log((new Date()) + ' User is known as: ' + userName
          + ' with ' + userColor + ' color.');
      } else { 
        console.log((new Date()) + ' Received Message from '
          + userName + ': ' + message.utf8Data);

        var obj = {
          time: (new Date()).getTime(),
          text: htmlEntities(message.utf8Data),
          author: userName,
          color: userColor
        };
        history.push(obj);
        // Keep only last 15 messages
        history = history.slice(-15);
        // broadcast message to all connected clients
        var json = JSON.stringify({ type: 'message', data: obj });
        for (var i = 0; i < clients.length; i++) {
          if (history.length > 0) {
            clients[i].sendUTF(
              JSON.stringify({ type: 'history', data: history }));
          }

        }
      }
    }
  });

  connection.on('close', function (connection) {
    if (userName !== false && userColor !== false) {
      console.log((new Date()) + " Peer "
        + connection.remoteAddress + " disconnected.");
      clients.splice(index, 1);
      colors.push(userColor);
    }
  });
});