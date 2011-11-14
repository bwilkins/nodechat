var NodeChatController = {
    init: function() {
        this.socket = new io.connect(null, {port: 3000});
        var mysocket = this.socket;

        this.model = new models.NodeChatModel();
        this.view = new NodeChatView({model: this.model, socket: this.socket, el: $('#content')});
        var view = this.view;

        this.socket.on('initial', function(msg) {view.msgReceived('initial', msg)});
        this.socket.on('update', function(msg) {view.msgReceived('update', msg)});
        this.socket.on('chat', function(msg) {view.msgReceived('chat', msg)});

        this.view.render();

        return this;
    }
};

$(document).ready(function () {
    window.app = NodeChatController.init({});
});
