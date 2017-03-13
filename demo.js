
// your slack token goes here
var slackclient_token = '<SUPER_SECRET_TOKEN_GOES_HERE>';


// setup a slackclient instance chat bot
var SlackClient = require('./slackclient');


// create a slackbot with the API token
var slackbot = new SlackClient({
  token: slackclient_token,
  logLevel: 'info'
});



// -- say: hello

slackbot.listenTo( { text: ['(hello|hi|hey|howdy|hiho) ?(.*)','hello'], emit:'hello' } );

slackbot.on('hello', function(data) {
  console.log(`${data.user.name} said hello.. ${data.tokens}`);
  var message = 'Hi there ' + data.user.name + '. I\'m *ailee*, and I\'m your new business assistant. Type *help* to get started.';
  this.emit('chat', { channel: data.channel, message: message} );
});



// -- say: help

slackbot.listenTo( { text: ['(help|support) ?(.*)'], emit:'help' } );

slackbot.on('help', function(data) {
  console.log(`${data.user.name} said help..`);
  var message = 'Hi there ' + data.user.name + '. I\'m here to make your life much eaiser than what you expect.';
  this.emit('chat', { channel: data.channel, message: message} );
});


// -- say: thanks

slackbot.listenTo( { text: ['(thank you|thanks|thx) ?(.*)'], emit:'thanks' } );

slackbot.on('thanks', function(data) {
  console.log(`${data.user.name} said thanks..`);
  var message = 'Oh, no problem, it\'s my pleasure ' + data.user.name + '!';
  this.emit('chat', { channel: data.channel, message: message} );
});


// -- say: default

slackbot.on('default', function(data) {
  console.log(`${data.user.name} said default..`);
  var message = 'Hey, ' + data.user.name + '. If you\'re confused, type *help*.';
  this.emit('chat', { channel: data.channel, message: message} );
});


slackbot.on('error', function(data) {

  console.log('bad stuff happened..');
  console.log(data);

});


slackbot.connect();
