//
//   (c) 2016 Franco Trimboli
//
//
//   slackclient library
//   -----------------

'use strict';

var events = require('events');
var slackclient = require('@slack/client');

// --- slack integration --------------------------------------------------------

// we'll be using an event emitter model to handle registration events to and from slack
class SlackClient extends events.EventEmitter {

    // setup opts to sign into the API with the slack bot account token
    constructor(opts) {
      super();

      // auth token
      this.token = opts.token;

      this.debugLevel = opts.logLevel || 'info';

      // optional name
      this.name = opts.name || 'slackclient';

      // any chats we're listening to
      this.listeningTo = [];
    }

    logger(level, message, e) {
      var levels = ['error', 'warn', 'info', 'debug'];

      if (levels.indexOf(level) <= levels.indexOf(this.debugLevel) ) {

        if (typeof message !== 'string') {
          message = JSON.stringify(message);
        }
        if (typeof e !== 'string') {
          e = JSON.stringify(e);
        };

        console.log(`${level}: [${this.name}] ${message} ${e}`);
      }
    }


    // helper function to check if the recieved message is a DM or not
    isDirect(channel) {
        return !channel.indexOf('D');
    };

    listenTo(command) {
      this.listeningTo.push(command);
    }

    // connect to the Slack RTM
    connect() {

        // setup the rtmclient and pass the token
        var RtmClient = slackclient.RtmClient;
        var MemoryDataStore = slackclient.MemoryDataStore;
        var slack = new RtmClient(this.token,
          {
            logLevel: 'info',
            dataStore: new MemoryDataStore()
          });

        // let's kick off the connection
        slack.start();

        // chat: on recieving a chat event, we should send chat reply via slack
        // we pass the entire message obj (here as 'data') to make things easier (because I'm lazy)
        this.on('chat', function(data) {

          slack.sendMessage(data.message, data.channel);

        });

        // -- Client Events - callbacks

        var CLIENT_EVT = slackclient.CLIENT_EVENTS.RTM;
        // console.log(CLIENT_EVT); // debug all events

        // Connecting
        slack.on(CLIENT_EVT.CONNECTING, (data) => {
          this.logger('info', `Attempting to connect.`);
        });

        // Authenticated
        slack.on(CLIENT_EVT.AUTHENTICATED, (data) => {
          this.logger('info', `Logged in as ${data.self.name} of team ${data.team.name}, but not yet connected to a channel`);
        });

        // Reconnecting
        slack.on(CLIENT_EVT.ATTEMPTING_RECONNECT, (data) => {
          this.logger('warn', `Disconnected, attempting to reconnect`);
        });

        // ERROR
        slack.on(CLIENT_EVT.WS_ERROR, (data) => {
          this.logger('error', `Oops.. hit a problem..`, data);
        });



        // -- RTM Events - callbacks

        var RTM_EVENT = slackclient.RTM_EVENTS;
        // console.log(RTM_EVENT); // debug all events


        slack.on(RTM_EVENT.MESSAGE, (message) => {

          this.logger('debug','got a message...');


          // do we have a valid message, or a bot message?
          if (message.type === 'message' && (message.subtype != 'bot_message')) {

              // is the message a string of text?
              if (typeof(message.text) === 'string') {

                // we only process private DM messages
                if (this.isDirect(message.channel)) {

                  // grab the user and dm object of the message
                  var user = slack.dataStore.getUserById(message.user);
                  var dm = slack.dataStore.getDMByName(user.name);

                  // store in the message obj
                  message['user'] = user;
                  message['dm'] = dm;


                    // let's see if we have any events to listen to
                    try {

                      var gotMatched = false;

                      // let's iterate over the commands we are listening to
                      for (var key in this.listeningTo) {

                          // grab the event we'll emit when we find a match
                          var emit = this.listeningTo[key].emit;

                          // iterate over one or more items of text that a person could say
                          for (var item in this.listeningTo[key].text) {

                              var text = this.listeningTo[key].text[item];

                              // do we have a match?
                              try {
                                var matched = new RegExp('^' + text, 'gi').exec(message.text);

                                // if so, emit the event, and pass the tokens we've captured in the discussion
                                if (matched) {

                                  // grab the tokens
                                  var tokens = [];
                                    while (matched.length) {
                                    tokens.push(matched.shift());
                                  }

                                  // remove the first element, which is the matched string
                                  tokens.shift();

                                  // append to the message object
                                  message['tokens'] = tokens;

                                  gotMatched = true;
                                  this.logger('debug','we got a match..', emit);
                                  this.emit(emit, message);
                                  break;

                                }

                              } catch (e) {

                                this.logger('warn','problem with finding a command that matched...');

                              }

                          }

                      }

                      if (!gotMatched) {
                        // nothing matched? emit the default event
                        this.emit('default', message);
                        gotMatched = true;
                      }


                    } catch(e) {

                      this.logger('error','error when processing message', e);
                      this.emit('error', e);

                    }
                  }
              }

          }

        });

        slack.on(RTM_EVENT.CHANNEL_CREATED, function (msg) {
          // Listens to all `channel_created` events from the team
        });

    }

}


module.exports = SlackClient;
