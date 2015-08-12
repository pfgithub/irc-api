var net = require('net');
var parse = require('irc-message').parse;
var util = require('util');

var EventEmitter = require('events').EventEmitter;

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

exports.Irc = function(ip,port,name) {
  EventEmitter.call(this);
  this.client = new net.Socket();
  this.nick = name;
  this.connected = false;

  this.client.connect(port, ip);

  this.client.on('connect', function(){
    console.log('Connected');
    var data = {toString: function(){return ":*** Checking Ident"}};
    if(data.toString().indexOf(':*** Checking Ident') > -1){
      this.send("USER "+ this.nick +" "+ this.nick +" "+ this.nick +" :Made with CustomBot");
      this.send("NICK "+ this.nick);

    }
  }.bind(this));

  this.client.on('data', function(data){
    this.emit('raw',data);
    console.log('I<' + data.toString());
    if(data.toString().indexOf(':*** Checking Ident') > -1){
      this.send("USER "+ this.nick +" "+ this.nick +" "+ this.nick +" :Made with CustomBot");
      this.send("NICK "+ this.nick);
    }
    if(data.toString().indexOf(" :End of /MOTD command.") > -1 && !this.connected){
      this.emit('connect');
      this.connected = true;
    }
    var noclrf = data.toString().split('\n');
    var cdata = [];

    noclrf.forEach(function(bit){
      cdata.push(parse(bit));
    });
    cdata.forEach(function(parsed){
      if(parsed !== null){
        if(parsed.command == 'PING'){this.send('PONG :' + parsed.params[0])};
        this.emit('#'+parsed.command,parsed);
        switch (parsed.command) {
          case 'PRIVMSG':
            var fulldata = [
              parsed.params[1].replace('\r',''), //Channel
              { //User
                raw:parsed.prefix,
                nick:parsed.prefix.split('!')[0]
              },
              parsed.params[0] //Message
            ];
            this.emit('privmsg',fulldata[0],fulldata[1],fulldata[2]);
            if(parsed.params[0].startsWith('#')){
              this.emit('chat',fulldata[0],fulldata[1],fulldata[2]);
            }else{
              this.emit('pm',fulldata[0],fulldata[1],fulldata[2]);
            }
            break;

          default:
            // code
        }
      }
    }.bind(this));

  }.bind(this));


  this.client.on('close', function() {
    console.log('Connection closed');
    this.emit('disconnect');
  });

  this.client.setEncoding('ascii');
  this.client.setNoDelay();
};
util.inherits(exports.Irc, EventEmitter);

exports.Irc.prototype.send = function(data){
  fulldata = data.split('\n')[0];
  if(this.client.writable){
    this.client.write(data + '\n', 'ascii', function(err){
      if(err){
        console.log(err);
      }else{
        console.log("I>"+fulldata);
      }
    });
  }else{
    console.log('ERROR - Socket not writable');
  }
};


exports.Irc.prototype.command = function(command, data, message){
  this.send(command.toUpperCase() + ' ' + data + (message === undefined ? '' : (' :' + message)));
};

exports.Irc.prototype.say = function(channel, message){
  this.command('privmsg', channel, message);
};

exports.Irc.prototype.join = function(channel){
  this.command('join', channel);
};

exports.Irc.prototype.part = function(channel){
  this.command('part', channel);
};
