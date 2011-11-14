
/**
 * Module dependencies.
 */

var express = require('express')

var app = module.exports = express.createServer()
  , jade = require('jade')
  , json2 = require('JSON')
  , io = require('socket.io').listen(app)
  , _ = require('underscore')._
  , Backbone = require('backbone')
  , redis = require('redis')
  , rc = redis.createClient()
  , models = require('./models/models'); 

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', {layout: false});
});

app.get('/*.(js|css)', function(req, res){
    res.sendfile('./'+req.url);
});

app.get('/', function(req, res){
    res.render('index');
});

var activeClients = 0;
var nodeChatModel = new models.NodeChatModel();

rc.lrange('chatentries', -10, -1, function(err, data) {
    if (data) {
        _.each(data, function(jsonChat) {
            var chat = new models.ChatEntry();
            chat.mport(jsonChat);
            nodeChatModel.chats.add(chat);
        });

        console.log('Revived ' + nodeChatModel.chats.length + ' chats');
    }
    else {
        console.log('No data returned for key');
    }
});

io.sockets.on('connection', function(client){
    activeClients += 1;
    console.log('activeClients: '+ activeClients)
    client.on('disconnect', function(){clientDisconnect(client)});
    client.on('message', function(msg){chatMessage(client, io, msg)});

    client.emit('initial', nodeChatModel.xport())

    client.emit('update', {clients: activeClients})
    client.broadcast.emit('update', {clients: activeClients})
});

function chatMessage(client, io, msg){
    var chat = new models.ChatEntry();
    chat.mport(msg);

    console.log('message received: ' + msg)

    rc.incr('next.chatentry.id', function(err, newId) {
        chat.set({id: newId});
        nodeChatModel.chats.add(chat);

        console.log('(' + client.sessionId + ') ' + chat.get('id') + ' ' + chat.get('name') + ': ' + chat.get('text'));

        rc.rpush('chatentries', chat.xport(), redis.print);
        rc.bgsave();

        client.emit('chat', chat.xport());
        client.broadcast.emit('chat', chat.xport());
    }); 
}

function clientDisconnect(client) {
    activeClients -= 1;
    console.log('activeClients: '+ activeClients)
    client.broadcast.emit('update', {clients:activeClients})
}

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
