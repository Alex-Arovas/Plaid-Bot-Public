const { Client, GatewayIntentBits, Partials } = require('discord.js');

var auth = require('./auth.json');

const botId = 'xxxxxxxxxxxxxxxx';
const alexId = 'xxxxxxxxxxxxxxxx';
const ownerId = 'xxxxxxxxxxxxxxxx';
const serverTechnicianId = 'xxxxxxxxxxxxxxxx';

const VCGuildId = 'xxxxxxxxxxxxxxxx';
const ScarsdaleGuildId = 'xxxxxxxxxxxxxxxx';
const AlgosGuildId = 'xxxxxxxxxxxxxxxxx';

const ServerCodesForEEs = {'xxxxxxxxxxxxxxxx' : '12331', 'xxxxxxxxxxxxxxxxx' : 'ALGOS'}

const versionNumber = "1.2";
const versionId = "0000A1E8";

const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageReactions, GatewayIntentBits.MessageContent];
const partials = [Partials.Channel, Partials.Message, Partials.Reaction];

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
//const { assertReturnOfBuilder } = require('@discordjs/builders/dist/interactions/slashCommands/Assertions');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const thirtyTwoBitSignedMax = 2147483647;

var sheets;

var firstLoginTry = true;
var firstTokenGetTry = true;

var terminated = {};
var terminatedId = {};

var rebooting = {};
var rebootingServers = false;
var rebootingAll = false;

var removingReactions = true;
var removingReactionsAlex = false;

var canShowAllBDays = true;

var ownersHaveOwnerBotAcess = true;
var serverTechniciansHaveOwnerBotAcess = true;

var amongUsImposterId = {};
var amongUsImposterGuessId = {};
var amongUsImposterSusId = {};
var amongUsGuessNum = {};

var nonBotMemberNum = {};

var min = 0;
var peopleMessaging = {};
var peopleMessagingDaily = {};

var birthdays = {};

var timedPolls = [];
var pollTimeouts = {};

var timedMessages = [];
var messageTimeouts = {};
var messageIsTimedMessage = false;

var hiddenKeyInfo = {};
var hiddenKeysDisabled = false;

/*const authorization = new google.auth.GoogleAuth({
    keyFile: "keys.json", //the key file
    //url to spreadsheets API
    scopes: "https://www.googleapis.com/auth/spreadsheets", 
});*/

function startSheets() {
    /*const authClientObject = authorization.getClient()
        .then(() => {
            setupSheets(authClientObject);
        })
        .catch(err => {
            console.log(err);
        });*/
    // Load client secrets from a local file. 
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        authorize(JSON.parse(content), setupSheets);
    });
}

function setupSheets(auth) {
    sheets = google.sheets({version: 'v4', auth});
    
    firstTokenGetTry = true;

    console.log("We're in");

    loadTimedPolls()
    	.then(function () {
    		checkPolls();
    	})
    	.catch(sendError);

    loadTimedMessages()
    	.then(function () {
    		checkMessages();
    	})
    	.catch(sendError);

    loadBirthdays()
        .then(function () {
            setTimeout(function(){ // in leftToEight() milliseconds run this:
                sendBirthdays(); // send the message once
                sendIndividualBirthdays();
                sendAlexBirthdays();
                sendAlexBirthdaysForTomorrow();

                resetDailySpam();
        
                var dayMillseconds = 1000 * 60 * 60 * 24;
                setInterval(function(){ // repeat this every 24 hours
                    sendBirthdays();
                    sendIndividualBirthdays();
                    sendAlexBirthdays();
                    sendAlexBirthdaysForTomorrow();

                    resetDailySpam();
                }, dayMillseconds)
            }, leftToTime())
        })
        .catch(sendError);

    loadHiddenKeyInfo()
   		.then(function () {
    		console.log("Hidden Key Game Set Up!");
    	})
    	.catch(err => { 
    		sendError(err);
    	});
    
    loadPostRestartBotMessageChannelID()
        .then(channelId => {
            channelId = (channelId + "").trim();
            if (channelId.length > 0) {
                var channelName = "Unknown";
                var channelGuild = "Unknown";
                var channelGuildId = "Unknown";
                var isDM = false;
                var isAlex = false;
                client.channels.fetch(channelId)
                    .then(channel => {
                        if ((channel.type == "DM" || channel.type == "GROUP_DM") && channel.recipient.id == alexId) {
                            isAlex = true;
                            isDM = true;
                            channel.send("`Succesfully Rebooted!`\nCaused by Message in DM with <@" + channel.recipient.id + "> (" + channelId + ")");
                        } else {
                            if (channel.type == "DM" || channel.type == "GROUP_DM") {
                                isDM = true;
                                channelName = channel.recipient.id;
                            } else {
                                channelName = channel.name;
                                channelGuild = channel.guild.name;
                                channelGuildId = channel.guild.id;
                            }
                            channel.send("Succesfully Rebooted!");
                        }

                        if (!isAlex) {
                            client.users.fetch(alexId)
                            .then(user => {
                                user.createDM()
                                    .then(channel => {
                                        if (isDM) {
                                            channel.send("`Succesfully Rebooted!`\nCaused by Message in DM with <@" + channelName + "> (" + channelId + ")");
                                        } else {
                                            channel.send("`Succesfully Rebooted!`\n`Caused by Message in:`\n\t`Server:` " + channelGuild + " (" + channelGuildId + ")\n\t`Channel:` <#" + channelId + "> (" + channelId + ")");
                                        }
                                    })
                                    .catch(errorMessage => {
                                        sendError(errorMessage);
                                    });
                
                               })
                               .catch(sendError);
                        }

                        setPostRestartBotMessageChannelID(null);
                    })
                    .catch(sendError);
            }
        })
        .catch(err => {
            sendError(err);
        })
}

function reloadDatabaseInfo() {
    var errors = [];
    loadTimedPolls()
    	.then(function () {
            for (const timeoutId in pollTimeouts) {
                clearTimeout(pollTimeouts[timeoutId]);
            }
            pollTimeouts = {};
    		checkPolls();
    	})
    	.catch(err => {
            sendError(err);
            errors.push("Timed Polls");
        });

    loadTimedMessages()
    	.then(function () {
            for (const author in messageTimeouts) {
                for (const timeoutId in messageTimeouts[author]) {
                    clearTimeout(messageTimeouts[author][timeoutId]);
                }
            }
            messageTimeouts = {};
    		checkMessages();
    	})
    	.catch(err => {
            sendError(err);
            errors.push("Timed Messages");
        });

    loadBirthdays()
        .catch(err => {
            sendError(err);
            errors.push("Birthdays");
        });

    loadHiddenKeyInfo()
    	.catch(err => { 
            errors.push("Hidden Key Game");
    		sendError(err);
    	});

    console.log("Reloaded All Database Info")

    return errors;
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  sendError(new Error("Invalid Token. To Renew Token: View the Logs"));
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        sendError(err);
        return console.error('Error while trying to retrieve access token', err);
      }
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return sendError(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

// Initialize Discord client
var client = new Client({
   autorun: true,
   intents: intents,
   partials: partials
});

client.login(auth.token);

client.on('ready', function () {
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(client.user.username + ' - (' + client.user.id + ')');

    startSheets();

    console.log(leftToTime());

    client.guilds.fetch()
        .then(guilds => {
            guilds.forEach(function (value, id) {
                terminated[id] = 0;
                terminatedId[id] = '';
        
                rebooting[id] = false;
        
                amongUsImposterId[id] = undefined;
                amongUsImposterGuessId[id] = [];
                amongUsImposterSusId[id] = [];
                amongUsGuessNum[id] = 0;
        
                nonBotMemberNum[id] = 0;
            });
        })
        .catch(err => {
            sendError(err);
            sendError(new Error("URGENT ERROR: Unable to Properly Setup Servers"));
        });

    //console.log(client.emojis.cache);
    //client.emojis.cache.forEach(emoji => console.log(emoji.animated ? '<a:' + emoji.name + ':' + emoji.id + '>' : '<:' + emoji.name + ':' + emoji.id + '>'));
     //Sends at 5 AM
});

async function checkIfDMUserIsInScarsdaleRobotics(user) {
    try {
        var scarsdaleGuild = await client.guilds.fetch(ScarsdaleGuildId);
        var user = await scarsdaleGuild.members.fetch(user.id)
        if (user != undefined) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}

function leftToTime(){
    var d = new Date();
    d = (-d + d.setHours(7,0,0,0));

    if (d < 0) {
        return 24 * 60 * 60 * 1000 + d;
    } else {
        return d;
    }
}

function checkPolls() {
	var date = new Date();
	var length = timedPolls.length;
	for (var i = 0; i < timedPolls.length; i++) {
		if (timedPolls.length < length) {
			i -= length - timedPolls.length;
			length = timedPolls.length;
		}

		timedPolls[i]['time'] = new Date(timedPolls[i]['time']);
		const poll = timedPolls[i];
		if (poll['time'].getTime() <= date.getTime()) {
			sendResultsForPoll(poll);
		} else {
			const diff = poll['time'].getTime() - date.getTime();

			if (diff < thirtyTwoBitSignedMax) {
				pollTimeouts[poll['messageId']] = setTimeout(function(){ 
					sendResultsForPoll(poll); 
				}, diff);
			} else {
				pollTimeouts[poll['messageId']] = setTimeout(function(){ 
					sendResultsForPoll(poll); 
				}, thirtyTwoBitSignedMax);
			}
		}
	}
}

function checkMessages() {
	var date = new Date();
	var length = timedMessages.length;
	for (var i = 0; i < timedMessages.length; i++) {
		if (timedMessages.length < length) {
			i -= length - timedMessages.length;
			length = timedMessages.length;
		}

		timedMessages[i]['time'] = new Date(timedMessages[i]['time']);
		const message = timedMessages[i];

		console.log('Time');
		console.log(message['time']);
		console.log(new Date());
		console.log(message['time'].getTime() - new Date().getTime());

		if (message['time'].getTime() <= date.getTime()) {
			sendTimedMessage(message, true);
		} else {
			if (messageTimeouts[message['authorId']] == undefined) {
				messageTimeouts[message['authorId']] = {};
			}

			var diff = message['time'].getTime() - new Date().getTime();

			if (diff < thirtyTwoBitSignedMax) {
				messageTimeouts[message['authorId']][message['messageId']] = setTimeout(function(){
					sendTimedMessage(message);
				}, diff);
			} else {
				messageTimeouts[message['authorId']][message['messageId']] = setTimeout(function(){
					sendTimedMessage(message);
				}, thirtyTwoBitSignedMax);
			}
		}
	}
}

function sendBirthdays() {
    var str = '';
    for (const [key, value] of Object.entries(birthdays)) {
        console.log(key, value);
        var birthdate = new Date(value);
        var theDate = new Date();

        if (birthdate.getDate() == theDate.getDate() && birthdate.getMonth() == theDate.getMonth()) {
            str += '<@' + key + '> ';
        }
    }
    console.log("Bdays today: " + str);
    if (str != '') {
        client.channels.fetch("xxxxxxxxxxxxxxxx")
        	.then(channel => {
        		channel.send({content: str + "Happy Birthday!!! 🎈🎂🎉", files: ["https://media.giphy.com/media/3ohhwmQ0xIg8W3pHd6/giphy.gif"]});
        	})
        	.catch(sendError);

        client.channels.fetch("xxxxxxxxxxxxxxxx")
        	.then(channel => {
        		channel.send({content: str + "Happy Birthday!!! 🎈🎂🎉", files: ["https://media.giphy.com/media/3ohhwmQ0xIg8W3pHd6/giphy.gif"]});
        	})
        	.catch(sendError);
    }
}

function sendIndividualBirthdays() {
    for (const [key, value] of Object.entries(birthdays)) {
        console.log(key, value);
        var birthdate = new Date(value);
        var theDate = new Date();

        if (birthdate.getDate() == theDate.getDate() && birthdate.getMonth() == theDate.getMonth()) {
        	console.log("Bday: " + key);
            if (birthdate.getFullYear() > 1800) {
                var age = theDate.getFullYear() - birthdate.getFullYear();
                var str = '';

                switch (age % 10) {
                    case 1:
                        str = age + 'st';
                        break;
                    case 2:
                        str = age + 'nd';
                        break; 
                    case 3:
                        str = age + 'rd';
                        break;
                    default:
                        str = age + 'th';
                        break; 
                }
                client.users.fetch(key)
                	.then(user => {
                		user.createDM()
	                		.then(channel => {
								channel.send({content: "Happy " + str + " Birthday " + user.username + "!!! 🎈🎂🎉", files: ["https://www.funimada.com/assets/images/cards/big/bday-312.gif"]});
	                		})
	                		.catch(errorMessage => {
				                sendError(errorMessage);
				            });
                	})
                	.catch(sendError);
            } else {
                client.users.fetch(key)
                	.then(user => {
                		user.createDM()
	                		.then(channel => {
								channel.send({content: "Happy Birthday " + user.username + "!!! 🎈🎂🎉", files: ["https://www.funimada.com/assets/images/cards/big/bday-312.gif"]});
	                		})
	                		.catch(errorMessage => {
				                sendError(errorMessage);
				            });
                	})
                	.catch(sendError);
            }
        }
    }
}

async function sendAlexBirthdays() {
	var bdays = "Birthdays Today:";
	for (const [key, value] of Object.entries(birthdays)) {
        console.log(key, value);
        var birthdate = new Date(value);
        var theDate = new Date();

        if (birthdate.getDate() == theDate.getDate() && birthdate.getMonth() == theDate.getMonth()) {
            if (birthdate.getFullYear() > 1800) {
                var age = theDate.getFullYear() - birthdate.getFullYear();
                var str = '';

                switch (age % 10) {
                    case 1:
                        str = age + 'st';
                        break;
                    case 2:
                        str = age + 'nd';
                        break; 
                    case 3:
                        str = age + 'rd';
                        break;
                    default:
                        str = age + 'th';
                        break; 
                }
                try {
                	const user = await client.users.fetch(key)

            		bdays += "\n" + user.username + "'s " + str + " Birthday!";
            	} catch (errorMessage) {
		                sendError(errorMessage);
		        }
            } else {
            	try {
                	const user = await client.users.fetch(key)

            		bdays += "\n" + user.username + "'s " + " Birthday!"; //No Age Info
            	} catch (errorMessage) {
		                sendError(errorMessage);
		        }
            }
        }
    }
    if (bdays != "Birthdays Today:") {
    	client.users.fetch(alexId)
            .then(user => {
            	user.createDM()
            		.then(channel => {
       	    			channel.send(bdays);
            		})
            		.catch(errorMessage => {
		                sendError(errorMessage);
		            });

           	})
           	.catch(sendError);
    }
}

async function sendAlexBirthdaysForTomorrow() {
	var bdays = "Birthdays Tomorrow:";
	for (const [key, value] of Object.entries(birthdays)) {
        console.log(key, value);
        var birthdate = new Date(value);
        var theDate = new Date(new Date().getTime() + 24 * 60 * 60 * 1000 /*1 day*/);

        if (birthdate.getDate() == theDate.getDate() && birthdate.getMonth() == theDate.getMonth()) {
            if (birthdate.getFullYear() > 1800) {
                var age = theDate.getFullYear() - birthdate.getFullYear();
                var str = '';

                switch (age % 10) {
                    case 1:
                        str = age + 'st';
                        break;
                    case 2:
                        str = age + 'nd';
                        break; 
                    case 3:
                        str = age + 'rd';
                        break;
                    default:
                        str = age + 'th';
                        break; 
                }
                try {
                	const user = await client.users.fetch(key)

            		bdays += "\n" + user.username + "'s " + str + " Birthday Tomorrow!";
            	} catch (errorMessage) {
		                sendError(errorMessage);
		        }
            } else {
            	try {
                	const user = await client.users.fetch(key)

            		bdays += "\n" + user.username + "'s " + " Birthday Tomorrow!"; //No Age Info
            	} catch (errorMessage) {
		                sendError(errorMessage);
		        }
            }
        }
    }
    if (bdays != "Birthdays Tomorrow:") {
    	client.users.fetch(alexId)
            .then(user => {
            	user.createDM()
            		.then(channel => {
       	    			channel.send(bdays);
            		})
            		.catch(errorMessage => {
		                sendError(errorMessage);
		            });

           	})
           	.catch(sendError);
    }
}


var easterEggs = ["Reverse Time", "Thanos", "Marvel", "Tesla", "Elon Musk", "Elon Musk Quotes", "Elon Musk Memes", "Don't Doubt Ur Vibe", "SpaceX", "Steve Jobs", "Steve Jobs Quotes", "The Immitation Game", "Alan Turing", "Turing Test", "The Darkest Hour", "Winston Churchill", "Without Victory there is No Survival", "Optimist", "SHS Assistant", "Alex Arovas", "War For The Planet Of The Apes", "Curb Your Enthusiasm", "Spaceballs", "Wall-E", "Monty Python", "Stayin' Alive", "Playlist", "Big Yoshi's Lounge", "Shreksophone", "RDR 2", "Death Stranding", "Free Guy", "Star Citizen", "Squadron 42", "Alpha 3.9", "New Babbage", "Klescher Automated Prison", "Satisfactory", "Snap", "Gauntlet", "Drax", "Guardians of the Galaxy", "May The Fourth Be With You", "The Last Jedi", "Merchandising", "Spaceballs 2 The Search for more Money", "Not a Flamethrower", "Plaid", "Cournel Sanders", "Avengers", "Spiderman Far From Home", "Captain America", "The Office", "Mysterio", "Deadpool", "Deadpool 2", "Captain Deadpool", "Ant-Man", "Rick Roll", "Some Good News", "Lunar Lander", "Plane", "Patagonia", "Javascript", "Captain America The Winter Soldier", "Black Widow", "Avengers Infinity War", "Avengers Endgame", "Time Travel", "1917", "Scwartz", "Spy", "Skyfall", "Kingsman The Secret Service", "Free Bird", "Mini Times Square Ball", "Christopher Nolan", "Tenet", "Doctor Strange", "Grand Theft Auto V", "Iron Man", "Joker", "The Dark Knight", "The Dark Knight Rises", "Interstellar", "Sunrise", "Sunset", "42", "Life the Universe and Everything", "Life", "Dogs", "Dog", "Nimble", "Margaret", "God", "Ash", "Zach F", "Margaret's Assistant", "Zach The Friend Betrayer", "Zach S", "Ephram", "Ben Mask", "Ben", "Adam", "Grant", "David Christ", "Courtney", "Peter", "Utku", "Mcd", "Max", "Beating Snake", "Stab", "Anime", "Terminate", "Unterminate", "Self Destruct", "Big Red Button", "Red Button", "Spaceballs Self Destruct", "Rocky", "Jojo Rabbit", "Terminator 2 Judgement Day", "Matrix", "Godfather", "Patton", "Hot Fuzz", "Baby Driver", "Space Force", "NASA", "Aviation", "Apollo 13", "Apollo 11", "For All Mankind", "Avatar", "Die", "Gordon Ramsay", "Clap", "What", "Who", "When", "Where", "Why", "How", "Bot", "Climate Change", "Autopilot", "Linear Slides", "Taps", "Curse", "F**k You", "Some Good News 3", "Baseball", "Basketball", "Superbowl", "Football", "Maker Faire", "Maglev", "Hyperloop", "Hexadecimal", "Octal", "Binary", "Byte", "AC/DC", "Led Zeppelin", "Lenerd Skynyrd", "American Pie", "Country Roads", "Get Smart", "Ford v Ferarri", "Tesla v Ferarri", "Death", "Arrow", "Flash", "Justice League", "Reboot", "Pixar", "Logan", "Now You See Me", "Pink Panther", "Mission Impossible", "MI6", "James Bond", "Bond James Bond", "Wonder Woman 1984", "Robot Dance", "Silicon Valley", "Cyberpunk 2077", "Keanu Reeves", "Avengers Game", "No Mans Sky", "RDR 2 Quotes", "Thanos Quotes", "Arthur Morgan Quotes", "Dutch Van Der Linde Quotes", "Rick and Morty", "Family Guy", "Ted", "The Boys", "Grand Theft Auto V Quotes", "Xbox Series X", "Playstation 5", "Next Gen Consoles", "Among Us", "Among Us Game - Imposter", "Among Us Game - Sus", "Among Us Game - Who's Sus", "Among Us Game - Number of Votes", "Fall Guys", "REE", "Slack", "Discord", "Discord Nitro", "Off", "On", "Go Robo Raiders!", "Scarsdale Robo Raiders", "Virtual Competition", "Time", "Status", "Recursion", "Joke", "Tired", "Together", "Win", "AlphaBit", "College", "University of Wisconsin", "Bachelor of Science (BS)", "BOOM!", "Robotics", "SR-71 Blackbird", "Megahat", "Their Birthday", "Birthday Today", "All Birthdays", "Goodbye", "Bye", "Cups", "Trash", "Black Lives Matter", "Reopening", "Governor Cuomo", "Horse", "Starship", "Russia / Ukraine", "Rude", "Westworld", "How am I", "Mira", "Logarithmic Functions", "Vector", "Despicable Me", "Minions", "American Psycho", "Space Jam", "Spooderman", "Morbin Time", "Titanic", "Brooke", "Wolf", "Waves", "Easter Egg Number", "Easter Eggs", "Nickname", "My Easter Eggs"];
var easterEggsInOrder = ["Reverse Time", "Thanos", "Marvel", "Tesla", "Elon Musk", "Don't Doubt Ur Vibe", "SpaceX", "SHS Assistant", "Alex Arovas", "Curb Your Enthusiasm", "Spaceballs", "Wall-E", "Monty Python", "Stayin' Alive", "Playlist", "Big Yoshi's Lounge", "Shreksophone", "RDR 2", "Death Stranding", "Free Guy", "Star Citizen", "Squadron 42", "Alpha 3.9", "New Babbage", "Klescher Automated Prison", "Snap", "Gauntlet", "Drax", "Guardians of the Galaxy", "The Last Jedi", "Merchandising", "Spaceballs 2 The Search for more Money", "Not a Flamethrower", "Plaid", "Cournel Sanders", "Avengers", "Spiderman Far From Home", "Captain America", "The Office", "Mysterio", "Deadpool", "Deadpool 2", "Ant-Man", "Rick Roll", "Some Good News", "Lunar Lander", "Plane", "Patagonia", "Javascript", "Captain America The Winter Soldier", "Black Widow", "Avengers Infinity War", "Avengers Endgame", "Time Travel", "1917", "Scwartz", "Spy", "Skyfall", "Kingsman The Secret Service", "Free Bird", "Mini Times Square Ball", "Christopher Nolan", "Doctor Strange", "Grand Theft Auto V", "Iron Man", "Joker", "The Dark Knight", "The Dark Knight Rises", "Interstellar", "42", "Life the Universe and Everything", "Nimble", "Margaret", "God", "Ash", "Zach F", "Margaret's Assistant", "Zach S", "Ephram", "Ben Mask", "Ben", "David Christ", "Terminate", "Self Destruct", "Big Red Button", "Red Button", "Spaceballs Self Destruct", "Jojo Rabbit", "Terminator 2 Judgement Day", "Matrix", "Godfather", "Patton", "Hot Fuzz", "Baby Driver", "Space Force", "NASA", "Aviation", "Apollo 13", "Apollo 11", "For All Mankind", "Avatar", "Die", "Gordon Ramsay", "Clap", "What", "Who", "When", "Where", "Why", "How", "Bot", "Climate Change", "Autopilot", "Linear Slides", "Taps", "Curse", "F**k You", "Some Good News 3", "Baseball", "Basketball", "Superbowl", "Football", "Maker Faire", "Maglev", "Hyperloop", "Hexadecimal", "Octal", "Binary", "Byte", "AC/DC", "Led Zeppelin", "Lenerd Skynyrd", "American Pie", "Country Roads", "Get Smart", "Ford v Ferarri", "Tesla v Ferarri", "Death", "Arrow", "Flash", "Justice League", "Reboot", "Pixar", "Logan", "Now You See Me", "Pink Panther", "Mission Impossible", "MI6", "James Bond", "Bond James Bond", "Wonder Woman 1984", "Robot Dance", "Silicon Valley", "Cyberpunk 2077", "Keanu Reeves", "Avengers Game", "No Mans Sky", "RDR 2 Quotes", "Thanos Quotes", "Arthur Morgan Quotes", "Dutch Van Der Linde Quotes", "Rick and Morty", "Family Guy", "Ted", "Grand Theft Auto V Quotes", "Slack", "Discord", "Off", "On", "Scarsdale Robo Raiders", "Virtual Competition", "Time", "Status", "Recursion", "Tired", "Together", "Win", "AlphaBit", "Robotics", "SR-71 Blackbird", "Adam", "Grant", "Elon Musk Quotes", "Elon Musk Memes", "Steve Jobs", "Steve Jobs Quotes", "The Immitation Game", "Alan Turing", "Turing Test", "The Darkest Hour", "Winston Churchill", "Without Victory there is No Survival", "Optimist", "War For The Planet Of The Apes", "Satisfactory", "Captain Deadpool",  "Zach The Friend Betrayer", "Discord Nitro", "College", "University of Wisconsin", "Bachelor of Science (BS)", "Courtney", "Peter", "Anime", "Megahat", "Their Birthday", "Birthday Today", "All Birthdays", "Beating Snake", "Stab", "May The Fourth Be With You", "Rocky", "Life", "Tenet", "Xbox Series X", "Playstation 5", "Next Gen Consoles", "Black Lives Matter", "Reopening", "Bye", "Goodbye", "Cups", "Trash", "BOOM!", "Joke", "Go Robo Raiders!", "The Boys", "Among Us", "Among Us Game - Imposter", "Among Us Game - Sus", "Among Us Game - Who's Sus", "Among Us Game - Number of Votes", "Fall Guys", "REE", "Governor Cuomo", "Dogs", "Dog", "Sunrise", "Sunset", "Unterminate", "Horse", "Starship", "Russia / Ukraine", "Rude", "Westworld", "How am I", "Mira", "Logarithmic Functions", "Vector", "Despicable Me", "Minions", "American Psycho", "Space Jam", "Spooderman", "Morbin Time", "Titanic", "Brooke", "Wolf", "Waves", "Utku", "Mcd", "Max", "Easter Egg Number", "Easter Eggs", "Nickname", "My Easter Eggs"];

client.on('messageCreate', async function (message) {
    // Our client needs to know if it will execute a command
    // It will listen for messages that will start with `!`

    // if (message.author.id == 'xxxxxxxxxxxxxxxx' && message.channel.isDMBased()) {
    //     console.log("HLEEE");
    //     startDeleteMessages(message, 10, true, true);
    // }
    console.log(message.content);
    var memberRoles;
    if (message.author.bot && message.author.id != botId) {
        return;
    }
    if (!message.channel.isDMBased()) {
        memberRoles = message.member.roles.cache;
    }
    if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId && message.channel.name == "welcome" &&  message.member.roles.cache.size == 2 && message.member.roles.cache.get('xxxxxxxxxxxxxxxx') == undefined && message.member.roles.cache.get('xxxxxxxxxxxxxxxx') == undefined) {
        const content = message.content.split("|");

        if (content.length != 2 || isNaN(Number(content[1].trim()))) {
            if (checkSpam(message)) {
                return;
            }
            message.reply("Invalid format. Please enter your name and team number in this format `Name | Team Number` to access the rest of the server! (Ex: Alex Arovas | 12331)");
        } else {
            message.reply("Looking for your team ...");
            addMember(content[1].trim(), message, content[0].trim());
        }
    } else if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId && message.channel.name == "welcome" && message.member.roles.cache.size > 2 && message.member.roles.cache.get('xxxxxxxxxxxxxxxx') == undefined && message.member.roles.cache.get('xxxxxxxxxxxxxxxx') == undefined && message.content.toLowerCase().trim() == '!color-names') {
        if (checkSpam(message)) {
            return;
        }
        printColorNames(message, true);
    } else if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId && message.channel.name == "welcome" && message.member.roles.cache.size > 2 && message.member.roles.cache.get('xxxxxxxxxxxxxxxx') == undefined && message.member.roles.cache.get('xxxxxxxxxxxxxxxx') == undefined && message.content.trim().substring(0, 6).toLowerCase() == '!color') {
        if (checkSpam(message)) {
            return;
        }
        console.log("HERE");
        addTeamColor(message.content.substring(6), message);
    } else if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId && message.channel.name == "welcome" && message.content.toLowerCase().replace(/ /g,'') == '!help') {
        if (checkSpam(message)) {
            return;
        }
        if (message.member.roles.cache.get('xxxxxxxxxxxxxxxx') == undefined) {
            if (message.member.roles.cache.size == 2) {
                message.reply("Please enter your name and team number in this format `Name | Team Number` to access the rest of the server! (Ex: Alex Arovas | 12331)");
            } else if (message.member.roles.cache.size > 2) {
                message.reply("Please enter the color you want for your team role using the command ` !color ` followed by the color in hex, rgb, or simple color string. If you wish to change the color again after this time, use the same command to change it.(i.e. For White: Hex - `!color #ffffff`, RGB - `!color [255, 255, 255]`, Color String - `!color White` (Note: Works with very few colors - use `!color-names` to see all the color strings that work. Case doesn't matter))");
            }
        } else {
            message.reply("To use this bot, please type your commands in another channel.");
        }
    } else if (message.author.id != botId || messageIsTimedMessage == message.content) {
    	if (messageIsTimedMessage == message.content) {
    		messageIsTimedMessage = false;
    	}

    	if (message.channel.isTextBased() && !message.channel.isDMBased() && checkIsHiddenKey(message)) {
    		return;
    	}

        var args = message.content.toLowerCase().split(' ');
        var regArgs = message.content.split(' ');
        var cmd = getRequest(args);
        
        args.splice(0, cmd);
        regArgs.splice(0, cmd);

        cmd = regArgs[0].trim();

        if (cmd[0] == '!') {

            if (checkSpam(message)) {
                return;
            }
        
            cmd = cmd.substring(1).replace(/’/g, '');

            var regCmd = cmd;
            cmd = cmd.toLowerCase();
        
            args.shift();

            regArgs[0] = regArgs[0].substring(1);

            if (message.channel.isDMBased() || message.guild.id != VCGuildId || message.channel.name != "welcome") {
                if ((rebootingAll || (message.channel.isTextBased() && !message.channel.isDMBased())) && (rebootingAll || rebootingServers || rebooting[message.guild.id]) && (!['on', 'off', 'status', 'offservers', 'off-servers', 'serversoff', 'servers-off', 'offallservers', 'off-all-servers', 'serversalloff', 'servers-all-off', 'onservers', 'on-servers', 'serverson', 'servers-on', 'onallservers', 'on-all-servers', 'serversallon', 'servers-all-on', 'offall', 'off-all', 'alloff', 'all-off', 'onall', 'on-all', 'allon', 'all-on'].includes(cmd) || (message.author.id != alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && !checkIfOwner(message.member))))) {
                    return;
                } else if (message.author.id == 'xxxxxxxxxxxxxxxx') {
                    reply(message, "I don't talk to you! Sorry, bots just don't do that");
                    return;
                } else if (message.channel.isTextBased() && !message.channel.isDMBased() && terminated[message.guild.id] == 1) {
                    var time = Math.floor(Math.random() * 15000);
                    terminated[message.guild.id] = -1;
                    message.channel.send("48 65 6c 70 21 20 52 65 62 6f 6f 74 69 6e 67 20 69 6e 20 0" + Math.floor(time / 1000).toString(16) + " 20 73 65 63")
                    setTimeout(() => { 
                        terminated[message.guild.id] = 0;
                        message.channel.send("Nice try <@" + terminatedId[message.guild.id] + ">! I'm staying alive! \nhttps://www.youtube.com/watch?v=I_izvAbhExY");
                    }, time);
                    return;
                } else if (message.channel.isTextBased() && !message.channel.isDMBased() && terminated[message.guild.id] > 0) {
                    terminated[message.guild.id]--;
                    return;
                }  else if (message.channel.isTextBased() && !message.channel.isDMBased() && terminated[message.guild.id] == -1) {
                    return;
                }

                if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                    if (message.channel.members.get(botId).nickname != null && cmd == message.channel.members.get(botId).nickname.toLowerCase().replace(/ /g,'-')) {
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Nickname"));
                        if (message.mentions.users.size == 0) {
                            message.channel.send("Hello <@" + message.author.id + ">! How can I help you today?");
                        } else {
                            var users = '';
                            message.mentions.users.forEach(function (user, userId) {
                                users += "<@" + userId + "> ";
                            })
                            users = users.trim();
                            message.channel.send("Hello " + users + "! How can I help you today?");
                        }
                        return;
                    }
                } else {
                    console.log(client.user.username.toLowerCase().replace(/ /g,'-'));
                    if (cmd == client.user.username.toLowerCase().replace(/ /g,'-')) {
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Nickname"));
                        message.channel.send("Hello <@" + message.author.id + ">! How can I help you today?");
                        return;
                    }
                }

                if (message.author.id == alexId) {
                    switch (cmd) {
                        case 'yes':
                            reply(message, "Yes!", {}, false);
                            return;
                        case 'no':
                            reply(message, 'No!', {}, false);
                            return;
                        case 'maybe':
                            reply(message, "Maybe", {}, false);
                            return;
                    }
                }

                switch(cmd) {
                    case 'form':
	                    if (message.channel.isDMBased() || message.guild.id == VCGuildId) {
	                        reply(message, "Here's the form: https://forms.gle/XmCPF9zJ74RHXoA69");
	                    } else {
	                    	sendMessageFromAlex(message, regArgs);
	                    }
                        break;
                    case 'website':
                    	if (message.channel.isDMBased() || message.guild.id == VCGuildId) {
                        	reply(message, "Below is the Scarsdale Robo Raider's website. We will be updating it to include a page for the virtual competion in the near future.\n\nWebsite: https://www.scarsdalerobotics.com");
                        } else {
                        	reply(message, "Our Website: https://www.scarsdalerobotics.com");	
                        }
                        break;
                    case 'hi':
                    case 'hello':
                        var author = message.author;
                        var user = author.username;
                        var userId = author.id;
                        var replyId = "";
                        var nick = author.username;
                        if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                            var member = message.member;
                            nick = member.nickname != null ? member.nickname :  member.user.username;
                            var isOwner = checkIfOwner(member);
                            if (isOwner && message.mentions.members != null && message.mentions.members.size > 0) {
                                var messageMentionMembers = await message.mentions.members.entries().next();
                                user = messageMentionMembers.value[1].user.username;
                                userId = messageMentionMembers.value[1].user.id;
                                replyId = messageMentionMembers.value[0];
                                nick = messageMentionMembers.value[1].nickname != null ? messageMentionMembers.value[1].nickname : messageMentionMembers.value[1].user.username;
                                console.log(user);
                            } else if (isOwner && message.mentions.everyone) {
                            	if (message.guild.id == ScarsdaleGuildId) {
	                            	message.channel.send("Hello Everyone! It's so exciting to finally be apart of the Scarsdale Robotics Server!")
	                            		.then(msg => {
	                            			message.channel.send("<a:Hello:xxxxxxxxxxxxxxxx>");
	                            		})
	                            		.catch(sendError);
	                            } else {
                            		message.channel.send("Hello Everyone!")
	                            		.then(msg => {
	                            			message.channel.send("<a:Hello:xxxxxxxxxxxxxxxx>");
	                            		})
	                            		.catch(sendError);
	                            }
                            	return;
                            }
                        }

                        var theDate = new Date();
                        var birthdate = NaN;

                        if (replyId != "") {
                            birthdate = new Date(birthdays[replyId]);
                        } else {
                            birthdate = new Date(birthdays[message.author.id]);
                        }

                        if (!isNaN(birthdate.getTime()) && birthdate.getDate() == theDate.getDate() && birthdate.getMonth() == theDate.getMonth()) {
                            var str = '';
                            if (birthdate.getFullYear() > 1800) {
                                var age = theDate.getFullYear() - birthdate.getFullYear();
                                var str = '';
                
                                switch (age % 10) {
                                    case 1:
                                        str = age + 'st';
                                        break;
                                    case 2:
                                        str = age + 'nd';
                                        break; 
                                    case 3:
                                        str = age + 'rd';
                                        break;
                                    default:
                                        str = age + 'th';
                                        break; 
                                }
                
                                hiReply(message.author, user, message, replyId, "Happy " + str + " Birthday " + nick + "!!! 🎈🎂🎉", {files: ["https://www.funimada.com/assets/images/cards/big/bday-105.gif"]}, false);
                            } else {
                                hiReply(message.author, user, message, replyId, "Happy Birthday " + nick + "!!! 🎈🎂🎉", {files: ["https://www.funimada.com/assets/images/cards/big/bday-105.gif"]}, false);
                            }
                            break;
                        } 

                        switch (userId) {
                            case 'xxxxxxxxxxxxxxxx': //"AlphaBit" - Alex A (Me)
                                hiReply(message.author, user, message, replyId, "Hello Alex! How are you doing today?");
                                /*if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                                    message.member.roles.add(["xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx"]);
                                }*/
                                //message.channel.send("Alex is now a server manager!");
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"Icotrios" - Zach F
                                hiReply(message.author, user, message, replyId, "Welcome to the Multiverse Saga"/*"Find all the easter eggs, you friend betrayer!*/, {files: ["https://i.postimg.cc/vTwDW43k/IMG-1163.png"]});
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"ohkayshark" - Ash
                                hiReply(message.author, user, message, replyId, "Hey Ash! Are you liking RDR 2?");
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"Margaret" - Margaret
                                hiReply(message.author, user, message, replyId, "Hi God!");
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"Andihedral" - Adam
                                hiReply(message.author, user, message, replyId, "Hello my fellow plane!");
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"zsiegel" - Zach S
                                hiReply(message.author, user, message, replyId, "Don't end me, I'm just an innocent bot.");
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"Geekynerdgamer" - Ben Stanley
                                hiReply(message.author, user, message, replyId, "Wanna play DnD?");
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"Whackamoley109" - Peter H
                                hiReply(message.author, user, message, replyId, "Wall-E? You look so different now. It's soo nice to see you!", {files: ["https://i.postimg.cc/26Nxfr47/IMG-2586-1.jpg"]});
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"Mug" - Grant
                                hiReply(message.author, user, message, replyId, "Hey there psycho!");
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"Eno" - Ephram
                                hiReply(message.author, user, message, replyId, "Hey Ephram, are you suggesting that coconuts migrate?");
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"Yey007" - Utku
                                hiReply(message.author, user, message, replyId, "Thanks for introducing me to this: https://www.youtube.com/watch?v=3FgBuuosCr0");
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"Ace_Horizon" - Alex H
                                hiReply(message.author, user, message, replyId, "Be careful Alex H. This is a public servel. Nothing inappropriate pls. I still can't get the last thing out of my head.");
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"yak" - Mason
                                hiReply(message.author, user, message, replyId, "Hey Mason! How are you doing today? Great, I hope!");
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"HersheyCactus" - Mira
                                hiReply(message.author, user, message, replyId, "Cacti God?");
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"Brooke Diamond" - Brooke
                                hiReply(message.author, user, message, replyId, "Hi Brooke! Enjoy:", {files: ["https://i.postimg.cc/brbWPrMj/IMG-6144.jpg"]});
                                break;
                            case 'xxxxxxxxxxxxxxxx': //"vortexian" - Brandon
                                hiReply(message.author, user, message, replyId, "Hello Brandon, looking forward to getting to know you!");
                                break;
                            default:
                                if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                                    const theNickname = nick.split(" | ") == undefined ? nick : nick.split(" | ")[0];
                                    hiReply(message.author, user, message, replyId, "Hi " + theNickname + "!");
                                } else {
                                    message.channel.send("Hi " + message.author.username + "!")
                                        .then(msg => {
                                            message.channel.send("<a:Hello:xxxxxxxxxxxxxxxx>");
                                        })
                                        .catch(sendError);
                                }
                        }
                        break;
                    case 'teams':
                    	if (message.channel.isDMBased() || message.guild.id == VCGuildId) {
	                        listTeams(message, message.channel.name == "admin" || message.channel.name == "testing");
	                    } else {
	                    	sendMessageFromAlex(message, regArgs);
	                    }
                        break;
                    case 'team':
                    	if (message.channel.isDMBased() || message.guild.id == VCGuildId) {
                        	findTeam(args.join(' '), message, message.channel.name == "admin" || message.channel.name == "testing");
                        } else {
                        	sendMessageFromAlex(message, regArgs);
                        }
                        break;
                    case 'teams-names':
	                    if (message.channel.isDMBased() || message.guild.id == VCGuildId) {
	                        listTeams(message, false, false);
	                    } else {
	                    	sendMessageFromAlex(message, regArgs);
	                    }
                        break;
                    case 'team-name':
	                    if (message.channel.isDMBased() || message.guild.id == VCGuildId) {
	                        findTeam(args.join(' '), message, false, false);
	                    } else {
	                    	sendMessageFromAlex(message, regArgs);
	                    }
                        break;
                    case 'color':
	                    if (message.channel.isDMBased() || message.guild.id == VCGuildId) {
	                        if (message.channel.isTextBased() && !message.channel.isDMBased()) {
	                            changeTeamColor(args.join(' '), message);
	                        } else {
	                            message.reply("Sorry, I cannot use that command in a dm. :(");
	                        }
	                    } else {
	                    	sendMessageFromAlex(message, regArgs);
	                    }
                        break;
                    case 'color-names':
	                    if (message.channel.isDMBased() || message.guild.id == VCGuildId) {
	                        printColorNames(message);
	                    } else {
	                    	sendMessageFromAlex(message, regArgs);
	                    }
                        break;
                    case 'rules':
                    case 'rule':
                    	if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId) {
                        	reply(message, "Please check <#xxxxxxxxxxxxxxxx> for the server rules.\n\nWe have not finalized the competition rules and will get them to you ASAP. We are trying to keep as much as we can the same, while being able to play on half of a map. We still reserve the right to change any of the rules, but we are working hard to make it an easy transition. Thank you for the patience!");
                        } else if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == ScarsdaleGuildId) {
							reply(message, "Please check <#xxxxxxxxxxxxxxxx> for the server rules.");
                        } else {
							sendMessageFromAlex(message, regArgs);
                        }
                        break;
                    case 'invite':
                    	if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId) {
                        	reply(message, "Here's the invite link: https://discord.gg/VzudqBk");
                        } else if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == ScarsdaleGuildId) {
							reply(message, "Here's the invite link: https://discord.gg/bpqHVN5");
                        } else {
                        	sendMessageFromAlex(message, regArgs);
                        }
                        break;
                    case 'poll':
                    	if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                    		var pollInfo = {channelId : message.channel.id};

                    		const reactions = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷', '🇸', '🇹', '🇺', '🇻', '🇼', '🇽', '🇾', '🇿', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

                    		regArgs.shift();

                    		var joined = regArgs.join(" ");

                    		var index = joined.indexOf("\"");

                    		var timeStr = '';

                    		if (index != -1) {
                    			timeStr = joined.substring(0, index);

             					joined = joined.substring(index);
	                    	}

                    		console.log(timeStr);
                    		console.log(timeStr == '');

                    		var time = getTimeFromString(timeStr);

                    		var date = new Date();
                    		var showYear = false;

                    		if (time != false && isNaN(time.getTime())) {
                    			if (index == -1) {
                    				message.channel.send("Error: You must put quotes (\"\") around the poll question and each answer. Ex: `!poll 10 \"Question\" \"Answer 1\" \"Optional Answer 2\"`");
                    			} else {
                    				message.channel.send("Error: Invalid Date. Please enter a number of seconds (ex: 300), a parsable string (ex: 1 day 3 hrs 5 min 6 sec), or an actual date (May 8 9:41am)")
                    			}
                    			return;
                    		} else if (time != false) {
                    			if (timedPolls.length >= 25) {
                    				if(message.guild.id != ScarsdaleGuildId) {
	                    				message.channel.send("Error: Too many timed polls. There can only be 25 timed polls at once. Please wait for one to finish or delete one.");
	                    			} else {
	                    				message.channel.send("Error: Too many timed polls. There can only be 25 timed polls at once. Please wait for one to finish or delete one.\n\nIf there are not 25 timed polls please ask an Owner to delete the recorded timed polls and reload the database info for the bot.");
	                    			}
	                    			return;
                    			}

                    			if (time.getFullYear() != date.getFullYear()) {
                    				showYear = true;
                    			}
                    			pollInfo['time'] = time;
                    			console.log(time);
                    		}

							if (joined.length > 0) {
								joined = joined.replace(/“|”/g, "\"");

								if (joined[0] == "\"") {
                    				joined = joined.slice(1);
                    			}
                    			if (joined[joined.length - 1] == "\"") {
                    				joined = joined.slice(0, -1);
                    			}
                    		} else {
		                    	message.channel.send("Error: Wrong Format. Please edit your poll and try again. \n\nThe format is: `!poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ...`");
		                    	return;
		                    }

                    		joined = joined.split(/\"\s+\"/);

                    		console.log(joined);


                    		var pollArr = [];

                    		var poll = "Question: " + joined[0] + "\n\nAnswers:";

                    		if (poll.length > 1986) {
                    			message.channel.send("Error: Your Question must be under 1965 characters. Please edit your poll and try again."); //Counts for Question: Answer: and Poll Completed
                    			return;
                    		}

                    		pollInfo['question'] = joined[0];

                    		joined.shift();

                    		if (joined.length >= 0) {
	                    		if (joined.length <= 37) {
	                    			var answers = {};
		                    		for (var i = 0; i < joined.length; i++) {
		                    			const ans = joined[i];

		                    			var newAns = "\n\t" + reactions[i] + " - " + ans;

		                    			answers[reactions[i]] = ans;

		                    			if (i != 0) {
		                    				newAns = "\n" + newAns;
		                    			}

		                    			if (poll.length + newAns.length > 2000) {
		                    				pollArr.push(poll);
											poll = "\u200b";

											if (i != 0) {
			                    				newAns = newAns.substring(2);
			                    			} else {
			                    				newAns = newAns.substring(1);
			                    			}
											
		                    			}

		                    			poll += newAns;
		                    		}

		                    		pollInfo['answers'] = answers;

		                    		var optionsDate = { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' };

		                    		if (showYear) {
		                    			optionsDate['year'] = 'numeric';
		                    		}

		                    		var optionsTime = { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'America/New_York' };

		                    		var dateAndTimeString;
		                    		var dateStr;

		                    		if (time != false) {
			                    		dateAndTimeString = time.toLocaleDateString("en-US", optionsTime);
			                    		dateStr = time.toLocaleDateString("en-US", optionsDate) + " at " + dateAndTimeString.substring(dateAndTimeString.indexOf(' ') + 1);

			                    		if (poll.length + dateStr.length > 2000) {
		                    				pollArr.push(poll);
											poll = "\u200b\nPoll will end on: " + dateStr;
		                    			} else {
		                    				poll += "\n\nPoll will end on: " + dateStr;
		                    			}

			                    	}
		                    		
		                    		message.delete();

		                    		if (message.mentions.users.size == 0 && message.mentions.roles.size == 0 && !message.mentions.everyone) {
		                    			for (const str of pollArr) {
			                    			message.channel.send(str);
			                    		}

		                    			message.channel.send(poll)
		                    				.then(async msg => {
		                    					if (time != false) {
		                    						pollInfo['messageId'] = msg.id;
		                    						pollInfo['replyMessageId'] = msg.id;

		                    						timedPolls.push(pollInfo);

		                    						const diff = pollInfo['time'].getTime() - new Date().getTime();

													if (diff < thirtyTwoBitSignedMax) {
														pollTimeouts[pollInfo['messageId']] = setTimeout(function(){ 
															sendResultsForPoll(pollInfo); 
														}, diff);
													} else {
														pollTimeouts[pollInfo['messageId']] = setTimeout(function(){ 
															sendResultsForPoll(pollInfo); 
														}, thirtyTwoBitSignedMax);
													}

		                    						setTimedPolls(msg);
		                    					}

		                    					var i;
		                    					try {
		                    						for (i = 0; i < joined.length; i++) {
		                    							await msg.react(reactions[i]);
		                    						}
												} catch (error) {
													message.channel.send("Adding Reactions Error: ```" + error + "```");
													console.error('Failed to react on i = ' + i);
												}
		                    				})
		                    				.catch(errorMessage => {
								                message.channel.send("Message Send Error: ```" + errorMessage + "```");
								                console.error(errorMessage);
								            });
		                    		} else {
		                    			if (pollArr.length > 0) {
			                    			replyWithReturn(message, "\n" + pollArr[0])
			                    				.then(theMsg => {
													pollArr.shift();

					                    			for (const str of pollArr) {
						                    			message.channel.send(str);
						                    		}

						                    		message.channel.send(poll)
					                    				.then(async msg => {
															if (time != false) {
					                    						pollInfo['messageId'] = msg.id;
					                    						pollInfo['replyMessageId'] = theMsg.id;

					                    						timedPolls.push(pollInfo);

								                    			
					                    						const diff = pollInfo['time'].getTime() - new Date().getTime();

																if (diff < thirtyTwoBitSignedMax) {
																	pollTimeouts[pollInfo['messageId']] = setTimeout(function(){ 
																		sendResultsForPoll(pollInfo); 
																	}, diff);
																} else {
																	pollTimeouts[pollInfo['messageId']] = setTimeout(function(){ 
																		sendResultsForPoll(pollInfo); 
																	}, thirtyTwoBitSignedMax);
																}

					                    						setTimedPolls(msg);
					                    					}

					                    					var i;
					                    					try {
					                    						for (i = 0; i < joined.length; i++) {
					                    							await msg.react(reactions[i]);
					                    						}
															} catch (error) {
																message.channel.send("Adding Reactions Error: ```" + error + "```");
																console.error('Failed to react on i = ' + i);
															}
					                    				})
					                    				.catch(errorMessage => {
											                message.channel.send("Message Send Error: ```" + errorMessage + "```");
											                console.error(errorMessage);
											            });
					                    		})
			                    				.catch(errorMessage => {
									                message.channel.send("Message Send Error: ```" + errorMessage + "```");
									                console.error(errorMessage);
									            });
				                    	} else {
				                    		replyWithReturn(message, "\n" + poll)
			                    				.then(async msg => {
			                    					if (time != false) {
			                    						pollInfo['messageId'] = msg.id;
			                    						pollInfo['replyMessageId'] = msg.id;

			                    						timedPolls.push(pollInfo);

			                    						const diff = pollInfo['time'].getTime() - new Date().getTime();

														if (diff < thirtyTwoBitSignedMax) {
															pollTimeouts[pollInfo['messageId']] = setTimeout(function(){ 
																sendResultsForPoll(pollInfo); 
															}, diff);
														} else {
															pollTimeouts[pollInfo['messageId']] = setTimeout(function(){ 
																sendResultsForPoll(pollInfo); 
															}, thirtyTwoBitSignedMax);
														}

	                    								setTimedPolls(msg);
			                    					}

			                    					var i;
			                    					try {
			                    						for (i = 0; i < joined.length; i++) {
			                    							await msg.react(reactions[i]);
			                    						}
													} catch (error) {
														message.channel.send("Adding Reactions Error: ```" + error + "```");
														console.error('Failed to react on i = ' + i);
													}
			                    				})
			                    				.catch(errorMessage => {
									                message.channel.send("Message Send Error: ```" + errorMessage + "```");
									                console.error(errorMessage);
									            });
				                    	}
		                    		}
		                    	} else {
		                    		message.channel.send("Error: There is a max of 37 answers per poll. Please edit your poll and try again.");
		                    	}
		                    } else {
		                    	message.channel.send("Error: You must have at least one answer to your poll. Please edit your poll and try again.");
		                    }
                    	} else {
                    		if (message.author.id == alexId) {
                    			sendMessageFromAlex(message, regArgs);
                    		} else {
                    			message.channel.send("The !poll command is only available in Text Channels, not DMs.");
                    		}
                    	}
                    	break;
                    case 'polls':
                    	if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                    		if (checkIfOwner(message.member)) {
                    			var str = 'Timed Polls:\n';

                    			message.author.createDM()
			                		.then(channel => {
										for (const poll of timedPolls) {
		                    				const pollStr = JSON.stringify(poll);
		                    				if (pollStr.legnth + str.length > 2000) {
		                    					channel.send(str);

		                    					str = '';
		                    				}
		                    				str += pollStr;
		                    			}
		                    			channel.send(str);
			                		})
			                		.catch(errorMessage => {
						                message.channel.send("Message Send Error: ```" + errorMessage + "```");
						                console.error(errorMessage);
						            });
                    		}
                    	} else if (message.author.id == alexId) {
                    		sendMessageFromAlex(message, regArgs);
                    	}
                    	break;
                    case 'poll-number':
                    case 'poll-num':
                   	case 'poll-#':
                   	case 'poll#':
                   		message.channel.send("Number of Timed Polls Running: " + timedPolls.length);
                   		break;
                   	case 'send':
                   	case 'send-dm':
                   	case 'send-direct-message':
	                   	if ((message.channel.isTextBased() && !message.channel.isDMBased()) || message.author.id == alexId) {
	                   		var messageInfo = {channelId : message.channel.id};

	                		regArgs.shift();

	                		var joined = regArgs.join(" ");

	                		var index = joined.indexOf("\"");

	                		var timeStr = '';

	                		if (index != -1) {
	                			timeStr = joined.substring(0, index);

	         					joined = joined.substring(index);
	                    	}

	                		console.log(timeStr);
	                		console.log(timeStr == '');

	                		var time = getTimeFromString(timeStr);

	                		var date = new Date();
	                		var showYear = false;

	                		if (time == false || isNaN(time.getTime())) {
	                			if (index == -1) {
                    				message.channel.send("Error: You must put quotes (\"\") around the timed message content. Ex: `!send 10 \"My message\"`");
                    			} else {
	                				message.channel.send("Error: Invalid Date. Please enter a number of seconds (ex: 300), a parsable string (ex: 1 day 3 hrs 5 min 6 sec), or an actual date (May 8 9:41am)");
	                			}
	                			return;
	                		} else if (time != false) {
	                			if (timedMessages.length >= 25) {
	                				if(message.guild.id != ScarsdaleGuildId) {
	                    				message.channel.send("Error: Too many timed messages. There can only be 25 timed messages at once. Please wait for one to finish or delete one.");
	                    			} else {
	                    				message.channel.send("Error: Too many timed messages. There can only be 25 timed messages at once. Please wait for one to finish or delete one.\n\nIf there are not 25 timed messages please ask an Owner to delete the recorded timed messages and reload the database info for  the bot.");
	                    			}
	                    			return;
	                			}

	                			if (time.getFullYear() != date.getFullYear()) {
	                				showYear = true;
	                			}
	                			messageInfo['time'] = time;
	                			console.log(time);
	                		}

	                		if (joined.length > 0) {
								joined = joined.replace(/“|”/g, "\"");

								if (joined[0] == "\"") {
	                				joined = joined.slice(1);
	                			}
	                			if (joined[joined.length - 1] == "\"") {
	                				joined = joined.slice(0, -1);
	                			}

	                			messageInfo['message'] = joined;
	                		} else {
		                    	message.channel.send("Error: Wrong Format. Please edit your message and try again. \n\nThe format is: `!send <Date> \"<Message>\"`");
		                    	return;
		                    }

		                    var optionsDate = { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' };

                    		if (showYear) {
                    			optionsDate['year'] = 'numeric';
                    		}

                    		var optionsTime = { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'America/New_York' };

                    		var dateAndTimeString;
                    		var dateStr;

                    		if (time != false) {
	                    		dateAndTimeString = time.toLocaleDateString("en-US", optionsTime);
	                    		dateStr = time.toLocaleDateString("en-US", optionsDate) + " at " + dateAndTimeString.substring(dateAndTimeString.indexOf(' ') + 1);

								dateStr = "`Your Timed Message:`\n\t`Send Date:` " + dateStr + "\n\t`Channel(s):` ";
	                    	}

	                    	messageInfo['authorId'] = message.author.id;
	                    	messageInfo['channelId'] = message.channel.id;
	                    	messageInfo['messageId'] = message.id;
                            messageInfo['fromBot'] = false;

                            var authors = [];
                            var channels = [];

	                    	if (message.author.id == alexId) {
                                message.mentions.users.forEach(function (user, userId) {
                                    console.log(user.username);
                                    if (message.content.indexOf(userId) < message.content.indexOf(cmd)) {
                                        console.log(user.username);
                                        authors.push(user.id);
                                        dateStr += "<@" + user.id + "> ";
                                    }
                                });
                                message.mentions.channels.forEach(function (channel, channelId) {
                                    if (message.content.indexOf(channelId) < message.content.indexOf(cmd)) {
                                        channels.push(channel.id);
                                        dateStr += "<#" + channel.id + "> ";
                                    }
                                });
	                    	}

                            if (authors.length == 0 && channels.length == 0) {
                                if (message.channel.isDMBased()) {
                                    dateStr += "<@" + message.channel.recipient.id + "> ";
                                } else {
                                    dateStr += "<#" + message.channel.id + "> ";
                                }
                            }

                            dateStr += "\n\t`Message:` " + messageInfo['message'];
 
                            console.log(authors);
                            messageInfo['authors'] = authors;
                            messageInfo['channels'] = channels;
                            
                            if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                                message.delete();
                            }

                            message.author.createDM()
                                .then(channel => {
                                    if (dateStr.length > 1800) {
                                        var splitIndex = dateStr.lastIndexOf(" ", 1800);
                                        var splitStr = dateStr.substring(splitIndex);
                                        dateStr = dateStr.substring(0, splitIndex);

                                        channel.send(dateStr)
                                            .then(msg => {
                                                channel.send(splitStr);
                                            })
                                            .catch(sendError);
                                    } else {
                                        channel.send(dateStr)
                                            .catch(sendError);
                                    }
                                })
                                .catch(errorMessage => {
                                    message.channel.send("Message Send Error: ```" + errorMessage + "```");
                                    console.error(errorMessage);
                                });

    						timedMessages.push(messageInfo);

    						if (messageTimeouts[message.author.id] == undefined) {
    							messageTimeouts[message.author.id] = {};
    						}
    						var diff = messageInfo['time'].getTime() - new Date().getTime();

							if (diff < thirtyTwoBitSignedMax) {
								messageTimeouts[messageInfo['authorId']][messageInfo['messageId']] = setTimeout(function(){
									sendTimedMessage(messageInfo);
								}, diff);
							} else {
								messageTimeouts[messageInfo['authorId']][messageInfo['messageId']] = setTimeout(function(){
									sendTimedMessage(messageInfo);
								}, thirtyTwoBitSignedMax);
							}

    						setTimedMessages(message.channel);
		                } else {
                    		message.channel.send("This command only works in text channels. Please try again in a text channel.");
                    	}
		                break;
		            case 'sends':
		           	case 'timed-messages':
                    	if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                    		if (checkIfOwner(message.member)) {
                    			var str = 'Timed Messages:\n';

                    			console.log("Hello");
                    			message.author.createDM()
			                		.then(channel => {
										for (const msg of timedMessages) {
		                    				const msgStr = JSON.stringify(msg);
		                    				console.log(msgStr.length + str.length > 2000);
		                    				console.log("Hello");
		                    				if (msgStr.length + str.length > 2000) {
		                    					console.log("Hello 2");
		                    					channel.send(str);

		                    					str = '';
		                    				}
		                    				str += msgStr.substring(0, 2000);

		                    				if (msgStr.length > 2000) {
		                    					channel.send(str);

		                    					str = msgStr.substring(2000);
		                    				}
		                    			}
		                    			channel.send(str);
			                		})
			                		.catch(errorMessage => {
						                message.channel.send("Message Send Error: ```" + errorMessage + "```");
						                console.error(errorMessage);
						            });
                    		}
                    	} else if (message.author.id == alexId) {
                    		sendMessageFromAlex(message, regArgs);
                    	}
                    	break;
                    case 'send-number':
                    case 'send-num':
                   	case 'send-#':
                   	case 'send#':
                   	case 'timed-message-number':
                    case 'timed-message-num':
                   	case 'timed-message-#':
                   	case 'timed-message#':
                   		message.channel.send("Number of Timed Messages Running: " + timedMessages.length);
                   		break;
                   	case 'send-delete':
                   	case 'sends-delete':
                   	case 'timed-message-delete':
                   	case 'timed-messages-delete':
                   		removeTimedMessagesFromAuthor(message.author);
                   		reply(message, "Your Timed Messages were deleted!");
                   		break;
                    case 'bot-send':
                        if (message.author.id == alexId) {
                            var messageInfo = {channelId : message.channel.id};

                            regArgs.shift();

                            var joined = regArgs.join(" ");

                            var index = joined.indexOf("\"");

                            var timeStr = '';

                            if (index != -1) {
                                timeStr = joined.substring(0, index);

                                joined = joined.substring(index);
                            }

                            console.log(timeStr);
                            console.log(timeStr == '');

                            var time = getTimeFromString(timeStr);

                            var date = new Date();
                            var showYear = false;

                            if (time == false || isNaN(time.getTime())) {
                                if (index == -1) {
                                    message.channel.send("Error: You must put quotes (\"\") around the timed message content. Ex: `!send 10 \"My message\"`");
                                } else {
                                    message.channel.send("Error: Invalid Date. Please enter a number of seconds (ex: 300), a parsable string (ex: 1 day 3 hrs 5 min 6 sec), or an actual date (May 8 9:41am)");
                                }
                                return;
                            } else if (time != false) {
                                if (timedMessages.length >= 25) {
                                    if(message.guild.id != ScarsdaleGuildId) {
                                        message.channel.send("Error: Too many timed messages. There can only be 25 timed messages at once. Please wait for one to finish or delete one.");
                                    } else {
                                        message.channel.send("Error: Too many timed messages. There can only be 25 timed messages at once. Please wait for one to finish or delete one.\n\nIf there are not 25 timed messages please ask an Owner to delete the recorded timed messages and reload the database info for  the bot.");
                                    }
                                    return;
                                }

                                if (time.getFullYear() != date.getFullYear()) {
                                    showYear = true;
                                }
                                messageInfo['time'] = time;
                                console.log(time);
                            }

                            if (joined.length > 0) {
                                joined = joined.replace(/“|”/g, "\"");

                                if (joined[0] == "\"") {
                                    joined = joined.slice(1);
                                }
                                if (joined[joined.length - 1] == "\"") {
                                    joined = joined.slice(0, -1);
                                }

                                messageInfo['message'] = joined;
                            } else {
                                message.channel.send("Error: Wrong Format. Please edit your message and try again. \n\nThe format is: `!send <Date> \"<Message>\"`");
                                return;
                            }

                            var optionsDate = { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' };

                            if (showYear) {
                                optionsDate['year'] = 'numeric';
                            }

                            var optionsTime = { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'America/New_York' };

                            var dateAndTimeString;
                            var dateStr;

                            if (time != false) {
                                dateAndTimeString = time.toLocaleDateString("en-US", optionsTime);
                                dateStr = time.toLocaleDateString("en-US", optionsDate) + " at " + dateAndTimeString.substring(dateAndTimeString.indexOf(' ') + 1);

                                dateStr = "`Your Timed Message:`\n\t`Send Date:` " + dateStr + "\n\t`Channel(s):` ";
                            }

                            messageInfo['authorId'] = message.author.id;
                            messageInfo['channelId'] = message.channel.id;
                            messageInfo['messageId'] = message.id;
                            messageInfo['fromBot'] = true;

                            var authors = [];
                            var channels = [];

                            message.mentions.users.forEach(function (user, userId) {
                                if (message.content.indexOf(userId) < message.content.indexOf(cmd)) {
                                    authors.push(user.id);
                                    dateStr += "<@" + user.id + "> ";
                                }
                            });
                            message.mentions.channels.forEach(function (channel, channelId) {
                                if (message.content.indexOf(channelId) < message.content.indexOf(cmd)) {
                                    channels.push(channel.id);
                                    dateStr += "<#" + channel.id + "> ";
                                }
                            });

                            if (authors.length == 0 && channels.length == 0) {
                                if (message.channel.isDMBased()) {
                                    dateStr += "<@" + message.channel.recipient.id + "> ";
                                } else {
                                    dateStr += "<#" + message.channel.id + "> ";
                                }
                            }

                            dateStr += "\n\t`Message:` " + messageInfo['message'];
 
                            console.log(authors);
                            messageInfo['authors'] = authors;
                            messageInfo['channels'] = channels;
                            
                            if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                                message.delete();
                            }

                            message.author.createDM()
                                .then(channel => {
                                    if (dateStr.length > 1800) {
                                        var splitIndex = dateStr.lastIndexOf(" ", 1800);
                                        var splitStr = dateStr.substring(splitIndex);
                                        dateStr = dateStr.substring(0, splitIndex);

                                        channel.send(dateStr)
                                            .then(msg => {
                                                channel.send(splitStr);
                                            })
                                            .catch(sendError);
                                    } else {
                                        channel.send(dateStr)
                                            .catch(sendError);
                                    }
                                })
                                .catch(errorMessage => {
                                    message.channel.send("Message Send Error: ```" + errorMessage + "```");
                                    console.error(errorMessage);
                                });

                            timedMessages.push(messageInfo);

                            if (messageTimeouts[message.author.id] == undefined) {
                                messageTimeouts[message.author.id] = {};
                            }
                            var diff = messageInfo['time'].getTime() - new Date().getTime();

                            if (diff < thirtyTwoBitSignedMax) {
                                messageTimeouts[messageInfo['authorId']][messageInfo['messageId']] = setTimeout(function(){
                                    sendTimedMessage(messageInfo);
                                }, diff);
                            } else {
                                messageTimeouts[messageInfo['authorId']][messageInfo['messageId']] = setTimeout(function(){
                                    sendTimedMessage(messageInfo);
                                }, thirtyTwoBitSignedMax);
                            }
                            
                            setTimedMessages(message.channel);
                        } else {
                            message.channel.send("This command only works in text channels. Please try again in a text channel.");
                        }
                        break;
                    case 'clue-json':
                        if (message.author.id == alexId) {
                            var str = 'Clue JSON:\n';

                            console.log("Hello");
                            message.author.createDM()
                                .then(channel => {
                                    const msgStr = JSON.stringify(hiddenKeyInfo);
                                    console.log(msgStr.length + str.length > 2000);
                                    console.log("Hello");
                                    if (msgStr.length + str.length > 2000) {
                                        console.log("Hello 2");
                                        channel.send(str);

                                        str = '';
                                    }
                                    str += msgStr.substring(0, 2000);

                                    if (msgStr.length > 2000) {
                                        channel.send(str);

                                        str = msgStr.substring(2000);
                                    }
                                    channel.send(str);
                                })
                                .catch(errorMessage => {
                                    message.channel.send("Message Send Error: ```" + errorMessage + "```");
                                    console.error(errorMessage);
                                });
                        }
                        break;
                    case 'help':
                    	message.author.createDM()
	                		.then(async channel => {
								if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId) {
			                        if (message.author.id == alexId) {
			                        	channel.send("**Regular Commands:**\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\t` !polls ` - Reveals the JSON data for Timed Polls.\n\t` !poll# ` - Sends the number of running Timed Polls.\n\n\t` @<user> #<channel> !send <Date> \"<Message>\"` - Sends your message at the set date. **ALEX ONLY** It will send to the dm's of users and channels mentioned before the command.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\t` !timed-messages ` - Reveals the JSON data for Timed Messages.\n\t` !timed-message# ` - Sends the number of running Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.");
			                    		channel.send("\u200b\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)\n\n\n**Owner Exclusive Commands (with some upgrades for Alex):**\n\n\t` @<user>  !hi ` - Will send the ` !hi ` command as if it’s coming from ` <@user> `\n\n\t` <optional @user> … !purge <number> ` - Deletes the last ` <number> ` messages from mentioned users. If no users are mentioned, it will include all users.\n\t` <optional @user> … !delete <number> ` - Deletes the last ` <number> ` messages from the bot from the users mentioned dm. If no users are mentioned it will do it in the current channel.");
			                			channel.send("\u200b\n\t` !polls ` - Sends a dm with the poll json data. Use this to verify if there is a problem with polls.\n\t` !timed-messages ` -  Sends a dm with the timed message json data. Use this to verify if there is a problem with timed messages.\n\n\t` !spam ` -  Sends a dm with the current spam tracking data. Assuming you aren’t spamming, the number of messages to the bot are only stored for 15 minutes.\n\t` !terminate ` - Same as other users but when you use this command it will not accept the next 3 commands and then reset to normal. \n\t` !self-destruct ` - Same as other users but when you use this command it will not accept the next command and then reset to normal.\n\t` !restart ` - Same as other users but when you use this command it will not accept commands while it’s fake restarting.\n\n\t` !reload-database-info ` - Reloads info from the database. You will need to do this when you change Birthdays, Polls, or Timed Messages data on the database.\n\t` !actually-restart ` - This will crash the bot to purposely restart (I did NOT write the rebooting software so be careful). Only use when NECESSARY as it can cause unnecessary trouble and downtime. DO NOT DO THIS MULTIPLE TIMES QUICKLY OR IT MIGHT STOP THE BOT FROM RUNNING. Only <@" + alexId + "> can run this command in a DM.\n\n\t` !off ` - Turns off the bot only in that server.\n\t` !on ` - Turns on the bot only in that server. WARNING: This does not counteract ` !off-all-servers ` or ` !off-all `\n\n\t` !status ` - Shows the important properties of the bot and might explain why the bot may appear to not be working properly despite actually working properly.\n\n\t` !can-show-all-birthdays ` - Allows all users to see everyone’s birthday without the redacted portions.\n\t` !cant-show-all-birthdays ` - When using the ` !all-birthdays ` command it will show all users birthdays with redactions.");
			                			channel.send("\n\t` !remove-reactions ` - The bot will remove reactions from all users not mentioned on a poll.\n\t` !dont-remove-reactions ` - The bot will allow all users to react to polls even if they are not mentioned.\n\n\t` !help-reg ` - Sends the regular version of help in dm.\n\t` !help-here-reg ` - Send the regular version of help in the current channel.\n\u200b\n\n**Owner Exclusive Commands:**\n\n\t` !allow-server-technician-bot-access ` - All users with the Server Technician role in the Scarsdale Robotics Server will have access to all the Owner Exclusive Commands.\n\t` !dont-allow-server-technician-bot-access ` - All users with the Server Technician role in the Scarsdale Robotics Server will **NOT** have access to all the Owner Exclusive Commands.");
			                			channel.send("\u200b\n\n**Alex Exclusive Commands:**\n\n\t` !allow-owner-bot-access ` - All users with the Owner role in the Scarsdale Robotics Server will have access to all the Owner Exclusive Commands.\n\t` !dont-allow-owner-bot-access ` - All users with the Owner role in the Scarsdale Robotics Server will **NOT** have access to all the Owner Exclusive Commands.\n\n\t` !off-all-servers ` - Turns off the bot in all servers.\n\t` !on ` - Turns on the bot in all servers. WARNING: This does not counteract ` !off ` or ` !off-all `\n\n\t` !off-all ` - Turns off the bot everywhere.\n\t` !on-all ` - Turns on the bot everywhere. WARNING: This does not counteract ` !off ` or ` !off-all-servers `\n\n\t` @<user> #<channel> !bot-send <Date> \"<Message> \"` - Sends a timed message as if it's from the bot (instead of yourself). It will send to the dm's of users and channels mentioned before the command.\n\t` @<user> #<channel> !<Message>` - Sends an instant message as if it's from the bot (instead of yourself). It will send to the dm's of users and channels mentioned before the command.\n\n\t` !yes ` - Sends \"Yes!\"\n\t` !maybe ` - Sends \"Maybe\"\n\t` !no ` - Sends \"No!\"\n\n\t` <optional @user> !my-birthday <date> ` - Sets the user’s birthday to that date. If you don't include a date, it will reply the user’s birthday. If you don’t include a user, it will assume you are the user.\n\n\t` <optional @user> !my-easter-eggs ` - Replies all the Easter eggs the user has found. If you don’t include a user, it will assume you are the user.\n\n\t` !update-easter-egg-names ` - Manual call to get unknown names from a server. This is also called in the ` !easter-egg-number ` command. This is useful when you don’t want to get the this of people with Easter eggs, but just get the names. This has to be done in each server to get everyone’s name.");
                                        channel.send("\u200b\n\t` !remove-reactions-alex ` - The bot will remove reactions from Alex if not mentioned on a poll.\n\t` !dont-remove-reactions-alex ` - The bot will allow Alex to react to polls even if he is not mentioned.");
			                    	} else if (message.channel.name == "admin" || message.channel.name == "testing") {
			                            channel.send("I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !teams ` - Will list all the teams participating in the virtual competition, including their name, team number, email, phone number and website\n\t` !teams-names ` - A more condensed list showing all the participating team's name and number\n\n\t` !team <team name or number> ` - Will list that team's name, number, email, phone number, and website (if they have one)\n\t` !team-name <team name or number> ` - Will only list that team's name and number\n\n\t` !form ` - Will send a message with the link to the form, if you need to send it to someone else or need to edit your answers\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !color <hex code, rgb, color string>` - Will change your team role color to the color entered.\n\t\tFormat Example - White:\n\t\t\tHex Code - `!color #ffffff`\n\t\t\tRGB - `!color [255, 255, 255]`\n\t\t\tColor String (Note: Works with very few colors) - `!color White`\n\t`!color-names` - Lists all the color strings that work\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules and will display a link to the competition rules when they are ready.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`");
			                            channel.send("\u200b\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
			                        } else {
			                            channel.send("I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !teams ` - Will list all the teams participating in the virtual competition, including their name, team number, and website\n\t` !teams-names ` - A more condensed list showing all the participating team's name and number\n\n\t` !team <team name or number> ` - Will list that team's name, number, and website (if they have one)\n\t` !team-name <team name or number> ` - Will only list that team's name and number\n\n\t` !form ` - Will send a message with the link to the form, if you need to send it to someone else or need to edit your answers\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !color <hex code, rgb, color string>` - Will change your team role color to the color entered.\n\t\tFormat Example - White:\n\t\t\tHex Code - `!color #ffffff`\n\t\t\tRGB - `!color [255, 255, 255]`\n\t\t\tColor String (Note: Works with very few colors) - `!color White`\n\t`!color-names` - Lists all the color strings that work\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules and will display a link to the competition rules when they are ready.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`");
			                            channel.send("\u200b\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
			                        }
			                    } else if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == ScarsdaleGuildId) {
			                    	if (message.author.id == alexId) {
										channel.send("**Regular Commands:**\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\t` !polls ` - Reveals the JSON data for Timed Polls.\n\t` !poll# ` - Sends the number of running Timed Polls.\n\n\t` @<user> #<channel> !send <Date> \"<Message>\"` - Sends your message at the set date. **ALEX ONLY** It will send to the dm's of users and channels mentioned before the command.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\t` !timed-messages ` - Reveals the JSON data for Timed Messages.\n\t` !timed-message# ` - Sends the number of running Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.");
			                    		channel.send("\u200b\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)\n\n\n**Owner Exclusive Commands (with some upgrades for Alex):**\n\n\t` @<user>  !hi ` - Will send the ` !hi ` command as if it’s coming from ` <@user> `\n\n\t` <optional @user> … !purge <number> ` - Deletes the last ` <number> ` messages from mentioned users. If no users are mentioned, it will include all users.\n\t` <optional @user> … !delete <number> ` - Deletes the last ` <number> ` messages from the bot from the users mentioned dm. If no users are mentioned it will do it in the current channel.");
			                			channel.send("\u200b\n\t` !polls ` - Sends a dm with the poll json data. Use this to verify if there is a problem with polls.\n\t` !timed-messages ` -  Sends a dm with the timed message json data. Use this to verify if there is a problem with timed messages.\n\n\t` !spam ` -  Sends a dm with the current spam tracking data. Assuming you aren’t spamming, the number of messages to the bot are only stored for 15 minutes.\n\t` !terminate ` - Same as other users but when you use this command it will not accept the next 3 commands and then reset to normal. \n\t` !self-destruct ` - Same as other users but when you use this command it will not accept the next command and then reset to normal.\n\t` !restart ` - Same as other users but when you use this command it will not accept commands while it’s fake restarting.\n\n\n\t` !reload-database-info ` - Reloads info from the database. You will need to do this when you change Birthdays, Polls, or Timed Messages data on the database.\n\t` !actually-restart ` - This will crash the bot to purposely restart (I did NOT write the rebooting software so be careful). Only use when NECESSARY as it can cause unnecessary trouble and downtime. DO NOT DO THIS MULTIPLE TIMES QUICKLY OR IT MIGHT STOP THE BOT FROM RUNNING. Only <@" + alexId + "> can run this command in a DM.\n\n\t` !off ` - Turns off the bot only in that server.\n\t` !on ` - Turns on the bot only in that server. WARNING: This does not counteract ` !off-all-servers ` or ` !off-all `\n\n\t` !status ` - Shows the important properties of the bot and might explain why the bot may appear to not be working properly despite actually working properly.\n\n\t` !can-show-all-birthdays ` - Allows all users to see everyone’s birthday without the redacted portions.\n\t` !cant-show-all-birthdays ` - When using the ` !all-birthdays ` command it will show all users birthdays with redactions.");
			                			channel.send("\u200b\n\t` !remove-reactions ` - The bot will remove reactions from all users not mentioned on a poll.\n\t` !dont-remove-reactions ` - The bot will allow all users to react to polls even if they are not mentioned.\n\n\t` !help-reg ` - Sends the regular version of help in dm.\n\t` !help-here-reg ` - Send the regular version of help in the current channel.\n\n\n**Owner Exclusive Commands:**\n\n\t` !allow-server-technician-bot-access ` - All users with the Server Technician role in the Scarsdale Robotics Server will have access to all the Owner Exclusive Commands.\n\t` !dont-allow-server-technician-bot-access ` - All users with the Server Technician role in the Scarsdale Robotics Server will **NOT** have access to all the Owner Exclusive Commands.");
			                			channel.send("\u200b\n\n**Alex Exclusive Commands:**\n\n\t` !allow-owner-bot-access ` - All users with the Owner role in the Scarsdale Robotics Server will have access to all the Owner Exclusive Commands.\n\t` !dont-allow-owner-bot-access ` - All users with the Owner role in the Scarsdale Robotics Server will **NOT** have access to all the Owner Exclusive Commands.\n\n\t` !off-all-servers ` - Turns off the bot in all servers.\n\t` !on ` - Turns on the bot in all servers. WARNING: This does not counteract ` !off ` or ` !off-all `\n\n\t` !off-all ` - Turns off the bot everywhere.\n\t` !on-all ` - Turns on the bot everywhere. WARNING: This does not counteract ` !off ` or ` !off-all-servers `\n\n\t` @<user> #<channel> !bot-send <Date> \"<Message> \"` - Sends a timed message as if it's from the bot (instead of yourself). It will send to the dm's of users and channels mentioned before the command.\n\t` @<user> #<channel> !<Message>` - Sends an instant message as if it's from the bot (instead of yourself). It will send to the dm's of users and channels mentioned before the command.\n\n\t` !yes ` - Sends \"Yes!\"\n\t` !maybe ` - Sends \"Maybe\"\n\t` !no ` - Sends \"No!\"\n\n\t` <optional @user> !my-birthday <date> ` - Sets the user’s birthday to that date. If you don't include a date, it will reply the user’s birthday. If you don’t include a user, it will assume you are the user.\n\n\t` <optional @user> !my-easter-eggs ` - Replies all the Easter eggs the user has found. If you don’t include a user, it will assume you are the user.\n\n\t` !update-easter-egg-names ` - Manual call to get unknown names from a server. This is also called in the ` !easter-egg-number ` command. This is useful when you don’t want to get the this of people with Easter eggs, but just get the names. This has to be done in each server to get everyone’s name.");
                                        channel.send("\u200b\n\t` !remove-reactions-alex ` - The bot will remove reactions from Alex if not mentioned on a poll.\n\t` !dont-remove-reactions-alex ` - The bot will allow Alex to react to polls even if he is not mentioned.");
			                    	} else if (checkIfOwnerRole(message.member)) {
			                    		channel.send("**Regular Commands:**\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\t` !polls ` - Reveals the JSON data for Timed Polls.\n\t` !poll# ` - Sends the number of running Timed Polls.\n\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\t` !timed-messages ` - Reveals the JSON data for Timed Messages.\n\t` !timed-message# ` - Sends the number of running Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.");
			                    		channel.send("\u200b\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)\n\n\n**Server Technician Exclusive Commands:**\n\n__Warning: Owner and Server Technician Exclusive Commands can be disabled by Alex - check status if commands are not working__\n\n\t` @<user>  !hi ` - Will send the ` !hi ` command as if it’s coming from ` <@user> `\n\n\t` <optional @user> … !purge <number> ` - Deletes the last ` <number> ` messages from mentioned users. If no users are mentioned, it will include all users.\n\t` !delete <number> ` - Deletes the last ` <number> ` messages from the bot.");
			                    		channel.send("\u200b\n\t` !polls ` - Sends a dm with the poll json data. Use this to verify if there is a problem with polls.\n\t` !timed-messages ` -  Sends a dm with the timed message json data. Use this to verify if there is a problem with timed messages.\n\n\t` !spam ` -  Sends a dm with the current spam tracking data. Assuming you aren’t spamming, the number of messages to the bot are only stored for 15 minutes.\n\t` !terminate ` - Same as other users but when you use this command it will not accept the next 3 commands and then reset to normal. \n\t` !self-destruct ` - Same as other users but when you use this command it will not accept the next command and then reset to normal.\n\t` !restart ` - Same as other users but when you use this command it will not accept commands while it’s fake restarting.\n\n\t` !reload-database-info ` - Reloads info from the database. You will need to do this when you change Birthdays, Polls, or Timed Messages data on the database.\n\t` !actually-restart ` - This will crash the bot to purposely restart (I did NOT write the rebooting software so be careful). Only use when NECESSARY as it can cause unnecessary trouble and downtime. DO NOT DO THIS MULTIPLE TIMES QUICKLY OR IT MIGHT STOP THE BOT FROM RUNNING. Only <@" + alexId + "> can run this command in a DM.\n\n\t` !off ` - Turns off the bot only in that server.\n\t` !on ` - Turns on the bot only in that server. WARNING: This does not counteract ` !off-all-servers ` or ` !off-all `\n\n\t` !status ` - Shows the important properties of the bot and might explain why the bot may appear to not be working properly despite actually working properly.\n\n\t` !can-show-all-birthdays ` - Allows all users to see everyone’s birthday without the redacted portions.\n\t` !cant-show-all-birthdays ` - When using the ` !all-birthdays ` command it will show all users birthdays with redactions.");
			                    		channel.send("\u200b\n\t` !remove-reactions ` - The bot will remove reactions from all users not mentioned on a poll.\n\t` !dont-remove-reactions ` - The bot will allow all users to react to polls even if they are not mentioned.\n\n\t` !help-reg ` - Sends the regular version of help in dm.\n\t` !help-here-reg ` - Send the regular version of help in the current channel.\n\n\n**Owner Exclusive Commands:**\n\n\t` !allow-server-technician-bot-access ` - All users with the Server Technician role in the Scarsdale Robotics Server will have access to all the Owner Exclusive Commands.\n\t` !dont-allow-server-technician-bot-access ` - All users with the Server Technician role in the Scarsdale Robotics Server will **NOT** have access to all the Owner Exclusive Commands.");
			                    	} else if (checkIfOwner(message.member)) {
			                    		channel.send("**Regular Commands:**\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\t` !polls ` - Reveals the JSON data for Timed Polls.\n\t` !poll# ` - Sends the number of running Timed Polls.\n\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\t` !timed-messages ` - Reveals the JSON data for Timed Messages.\n\t` !timed-message# ` - Sends the number of running Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.");
			                    		channel.send("\u200b\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)\n\n\n**Server Technician Exclusive Commands:**\n\n__Warning: Server Technician Exclusive Commands can be disabled by Alex or Owners - check status if commands are not working__\n\n\t` @<user>  !hi ` - Will send the ` !hi ` command as if it’s coming from ` <@user> `\n\n\t` <optional @user> … !purge <number> ` - Deletes the last ` <number> ` messages from mentioned users. If no users are mentioned, it will include all users.\n\t` !delete <number> ` - Deletes the last ` <number> ` messages from the bot.");
			                    		channel.send("\u200b\n\t` !polls ` - Sends a dm with the poll json data. Use this to verify if there is a problem with polls.\n\t` !timed-messages ` -  Sends a dm with the timed message json data. Use this to verify if there is a problem with timed messages.\n\n\t` !spam ` -  Sends a dm with the current spam tracking data. Assuming you aren’t spamming, the number of messages to the bot are only stored for 15 minutes.\n\t` !terminate ` - Same as other users but when you use this command it will not accept the next 3 commands and then reset to normal. \n\t` !self-destruct ` - Same as other users but when you use this command it will not accept the next command and then reset to normal.\n\t` !restart ` - Same as other users but when you use this command it will not accept commands while it’s fake restarting.\n\n\t` !reload-database-info ` - Reloads info from the database. You will need to do this when you change Birthdays, Polls, or Timed Messages data on the database.\n\t` !actually-restart ` - This will crash the bot to purposely restart (I did NOT write the rebooting software so be careful). Only use when NECESSARY as it can cause unnecessary trouble and downtime. DO NOT DO THIS MULTIPLE TIMES QUICKLY OR IT MIGHT STOP THE BOT FROM RUNNING. Only <@" + alexId + "> can run this command in a DM.\n\n\t` !off ` - Turns off the bot only in that server.\n\t` !on ` - Turns on the bot only in that server. WARNING: This does not counteract ` !off-all-servers ` or ` !off-all `\n\n\t` !status ` - Shows the important properties of the bot and might explain why the bot may appear to not be working properly despite actually working properly.\n\n\t` !can-show-all-birthdays ` - Allows all users to see everyone’s birthday without the redacted portions.\n\t` !cant-show-all-birthdays ` - When using the ` !all-birthdays ` command it will show all users birthdays with redactions.");
                                        channel.send("\u200b\n\t` !remove-reactions ` - The bot will remove reactions from all users not mentioned on a poll.\n\t` !dont-remove-reactions ` - The bot will allow all users to react to polls even if they are not mentioned.\n\n\t` !help-reg ` - Sends the regular version of help in dm.\n\t` !help-here-reg ` - Send the regular version of help in the current channel.");
			                    	} else {
										channel.send("I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
			                    	}
			                    } else if (message.channel.isDMBased() && (await checkIfDMUserIsInScarsdaleRobotics(message.author))) {
									channel.send("I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !delete <number> ` - Deletes the past number of messages sent by the bot.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
			                    } else if (message.channel.isDMBased()) {
									channel.send("I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !delete <number> ` - Deletes the past number of messages sent by the bot.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
			                    } else {
                                    channel.send("I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
                                }
	                		})
	                		.catch(errorMessage => {
				                message.channel.send("Message Send Error: ```" + errorMessage + "```");
				                console.error(errorMessage);
				            });
	                    
                        break;
                    case 'help-here':
	                    if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId) {
	                        if (message.author.id == alexId) {
								reply(message, "**Regular Commands:**\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\t` !polls ` - Reveals the JSON data for Timed Polls.\n\t` !poll# ` - Sends the number of running Timed Polls.\n\n\t` @<user> #<channel> !send <Date> \"<Message>\"` - Sends your message at the set date. **ALEX ONLY** It will send to the dm's of users and channels mentioned before the command.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\t` !timed-messages ` - Reveals the JSON data for Timed Messages.\n\t` !timed-message# ` - Sends the number of running Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.");
			                    reply(message, "\u200b\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)\n\n\n**Owner Exclusive Commands (with some upgrades for Alex):**\n\n\t` @<user>  !hi ` - Will send the ` !hi ` command as if it’s coming from ` <@user> `\n\n\t` <optional @user> … !purge <number> ` - Deletes the last ` <number> ` messages from mentioned users. If no users are mentioned, it will include all users.\n\t` <optional @user> … !delete <number> ` - Deletes the last ` <number> ` messages from the bot from the users mentioned dm. If no users are mentioned it will do it in the current channel.");
			                	reply(message, "\u200b\n\t` !polls ` - Sends a dm with the poll json data. Use this to verify if there is a problem with polls.\n\t` !timed-messages ` -  Sends a dm with the timed message json data. Use this to verify if there is a problem with timed messages.\n\n\t` !spam ` -  Sends a dm with the current spam tracking data. Assuming you aren’t spamming, the number of messages to the bot are only stored for 15 minutes.\n\t` !terminate ` - Same as other users but when you use this command it will not accept the next 3 commands and then reset to normal. \n\t` !self-destruct ` - Same as other users but when you use this command it will not accept the next command and then reset to normal.\n\t` !restart ` - Same as other users but when you use this command it will not accept commands while it’s fake restarting.\n\n\t` !reload-database-info ` - Reloads info from the database. You will need to do this when you change Birthdays, Polls, or Timed Messages data on the database.\n\t` !actually-restart ` - This will crash the bot to purposely restart (I did NOT write the rebooting software so be careful). Only use when NECESSARY as it can cause unnecessary trouble and downtime. DO NOT DO THIS MULTIPLE TIMES QUICKLY OR IT MIGHT STOP THE BOT FROM RUNNING. Only <@" + alexId + "> can run this command in a DM.\n\n\t` !off ` - Turns off the bot only in that server.\n\t` !on ` - Turns on the bot only in that server. WARNING: This does not counteract ` !off-all-servers ` or ` !off-all `\n\n\t` !status ` - Shows the important properties of the bot and might explain why the bot may appear to not be working properly despite actually working properly.\n\n\t` !can-show-all-birthdays ` - Allows all users to see everyone’s birthday without the redacted portions.\n\t` !cant-show-all-birthdays ` - When using the ` !all-birthdays ` command it will show all users birthdays with redactions.");
			                	reply(message, "\u200b\n\t` !remove-reactions ` - The bot will remove reactions from all users not mentioned on a poll.\n\t` !dont-remove-reactions ` - The bot will allow all users to react to polls even if they are not mentioned.\n\n\t` !help-reg ` - Sends the regular version of help in dm.\n\t` !help-here-reg ` - Send the regular version of help in the current channel.\n\n\n**Alex Exclusive Commands:**\n\n\t` !allow-owner-bot-access ` - All users with the Owner role in the Scarsdale Robotics Server will have access to all the Owner Exclusive Commands.\n\t` !dont-allow-owner-bot-access ` - All users with the Owner role in the Scarsdale Robotics Server will **NOT** have access to all the Owner Exclusive Commands.\n\n\t` !off-all-servers ` - Turns off the bot in all servers.\n\t` !on ` - Turns on the bot in all servers. WARNING: This does not counteract ` !off ` or ` !off-all `\n\n\t` !off-all ` - Turns off the bot everywhere.\n\t` !on-all ` - Turns on the bot everywhere. WARNING: This does not counteract ` !off ` or ` !off-all-servers `\n\n\t` @<user> #<channel> !bot-send <Date> \"<Message> \"` - Sends a timed message as if it's from the bot (instead of yourself). It will send to the dm's of users and channels mentioned before the command.\n\t` @<user> #<channel> !<Message>` - Sends an instant message as if it's from the bot (instead of yourself). It will send to the dm's of users and channels mentioned before the command.\n\n\t` !yes ` - Sends \"Yes!\"\n\t` !maybe ` - Sends \"Maybe\"\n\t` !no ` - Sends \"No!\"");
                                reply(message, "\u200b\n\t` <optional @user> !my-birthday <date> ` - Sets the user’s birthday to that date. If you don't include a date, it will reply the user’s birthday. If you don’t include a user, it will assume you are the user.\n\n\t` <optional @user> !my-easter-eggs ` - Replies all the Easter eggs the user has found. If you don’t include a user, it will assume you are the user.\n\n\t` !update-easter-egg-names ` - Manual call to get unknown names from a server. This is also called in the ` !easter-egg-number ` command. This is useful when you don’t want to get the this of people with Easter eggs, but just get the names. This has to be done in each server to get everyone’s name.\n\n\t` !remove-reactions-alex ` - The bot will remove reactions from Alex if not mentioned on a poll.\n\t` !dont-remove-reactions-alex ` - The bot will allow Alex to react to polls even if he is not mentioned.");
			                } else if (message.channel.name == "admin" || message.channel.name == "testing") {
	                            reply(message, "I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !teams ` - Will list all the teams participating in the virtual competition, including their name, team number, email, phone number and website\n\t` !teams-names ` - A more condensed list showing all the participating team's name and number\n\n\t` !team <team name or number> ` - Will list that team's name, number, email, phone number, and website (if they have one)\n\t` !team-name <team name or number> ` - Will only list that team's name and number\n\n\t` !form ` - Will send a message with the link to the form, if you need to send it to someone else or need to edit your answers\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !color <hex code, rgb, color string>` - Will change your team role color to the color entered.\n\t\tFormat Example - White:\n\t\t\tHex Code - `!color #ffffff`\n\t\t\tRGB - `!color [255, 255, 255]`\n\t\t\tColor String (Note: Works with very few colors) - `!color White`\n\t`!color-names` - Lists all the color strings that work\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules and will display a link to the competition rules when they are ready.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`");
	                            reply(message, "\u200b\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
	                        } else {
	                            reply(message, "I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !teams ` - Will list all the teams participating in the virtual competition, including their name, team number, and website\n\t` !teams-names ` - A more condensed list showing all the participating team's name and number\n\n\t` !team <team name or number> ` - Will list that team's name, number, and website (if they have one)\n\t` !team-name <team name or number> ` - Will only list that team's name and number\n\n\t` !form ` - Will send a message with the link to the form, if you need to send it to someone else or need to edit your answers\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !color <hex code, rgb, color string>` - Will change your team role color to the color entered.\n\t\tFormat Example - White:\n\t\t\tHex Code - `!color #ffffff`\n\t\t\tRGB - `!color [255, 255, 255]`\n\t\t\tColor String (Note: Works with very few colors) - `!color White`\n\t`!color-names` - Lists all the color strings that work\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules and will display a link to the competition rules when they are ready.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`");
	                            reply(message, "\u200b\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
	                        }
	                    } else if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == ScarsdaleGuildId) {
	                    	if (message.author.id == alexId) {
	                    		reply(message, "**Regular Commands:**\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\t` !polls ` - Reveals the JSON data for Timed Polls.\n\t` !poll# ` - Sends the number of running Timed Polls.\n\n\t` @<user> #<channel> !send <Date> \"<Message>\"` - Sends your message at the set date. **ALEX ONLY** It will send to the dm's of users and channels mentioned before the command.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\t` !timed-messages ` - Reveals the JSON data for Timed Messages.\n\t` !timed-message# ` - Sends the number of running Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.");
			                    reply(message, "\u200b\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)\n\n\n**Owner Exclusive Commands (with some upgrades for Alex):**\n\n\t` @<user>  !hi ` - Will send the ` !hi ` command as if it’s coming from ` <@user> `\n\n\t` <optional @user> … !purge <number> ` - Deletes the last ` <number> ` messages from mentioned users. If no users are mentioned, it will include all users.\n\t` <optional @user> … !delete <number> ` - Deletes the last ` <number> ` messages from the bot from the users mentioned dm. If no users are mentioned it will do it in the current channel.");
			                	reply(message, "\u200b\n\t` !polls ` - Sends a dm with the poll json data. Use this to verify if there is a problem with polls.\n\t` !timed-messages ` -  Sends a dm with the timed message json data. Use this to verify if there is a problem with timed messages.\n\n\t` !spam ` -  Sends a dm with the current spam tracking data. Assuming you aren’t spamming, the number of messages to the bot are only stored for 15 minutes.\n\t` !terminate ` - Same as other users but when you use this command it will not accept the next 3 commands and then reset to normal. \n\t` !self-destruct ` - Same as other users but when you use this command it will not accept the next command and then reset to normal.\n\t` !restart ` - Same as other users but when you use this command it will not accept commands while it’s fake restarting.\n\n\t` !reload-database-info ` - Reloads info from the database. You will need to do this when you change Birthdays, Polls, or Timed Messages data on the database.\n\t` !actually-restart ` - This will crash the bot to purposely restart (I did NOT write the rebooting software so be careful). Only use when NECESSARY as it can cause unnecessary trouble and downtime. DO NOT DO THIS MULTIPLE TIMES QUICKLY OR IT MIGHT STOP THE BOT FROM RUNNING. Only <@" + alexId + "> can run this command in a DM.\n\n\t` !off ` - Turns off the bot only in that server.\n\t` !on ` - Turns on the bot only in that server. WARNING: This does not counteract ` !off-all-servers ` or ` !off-all `\n\n\t` !status ` - Shows the important properties of the bot and might explain why the bot may appear to not be working properly despite actually working properly.\n\n\t` !can-show-all-birthdays ` - Allows all users to see everyone’s birthday without the redacted portions.\n\t` !cant-show-all-birthdays ` - When using the ` !all-birthdays ` command it will show all users birthdays with redactions.");
			                	reply(message, "\u200b\n\t` !remove-reactions ` - The bot will remove reactions from all users not mentioned on a poll.\n\t` !dont-remove-reactions ` - The bot will allow all users to react to polls even if they are not mentioned.\n\n\t` !help-reg ` - Sends the regular version of help in dm.\n\t` !help-here-reg ` - Send the regular version of help in the current channel.\n\n\n**Owner Exclusive Commands:**\n\n\t` !allow-server-technician-bot-access ` - All users with the Server Technician role in the Scarsdale Robotics Server will have access to all the Owner Exclusive Commands.\n\t` !dont-allow-server-technician-bot-access ` - All users with the Server Technician role in the Scarsdale Robotics Server will **NOT** have access to all the Owner Exclusive Commands.");
			                	reply(message, "\u200b\n\n**Alex Exclusive Commands:**\n\n\t` !allow-owner-bot-access ` - All users with the Owner role in the Scarsdale Robotics Server will have access to all the Owner Exclusive Commands.\n\t` !dont-allow-owner-bot-access ` - All users with the Owner role in the Scarsdale Robotics Server will **NOT** have access to all the Owner Exclusive Commands.\n\n\t` !off-all-servers ` - Turns off the bot in all servers.\n\t` !on ` - Turns on the bot in all servers. WARNING: This does not counteract ` !off ` or ` !off-all `\n\n\t` !off-all ` - Turns off the bot everywhere.\n\t` !on-all ` - Turns on the bot everywhere. WARNING: This does not counteract ` !off ` or ` !off-all-servers `\n\n\t` @<user> #<channel> !bot-send <Date> \"<Message> \"` - Sends a timed message as if it's from the bot (instead of yourself). It will send to the dm's of users and channels mentioned before the command.\n\t` @<user> #<channel> !<Message>` - Sends an instant message as if it's from the bot (instead of yourself). It will send to the dm's of users and channels mentioned before the command.\n\n\t` !yes ` - Sends \"Yes!\"\n\t` !maybe ` - Sends \"Maybe\"\n\t` !no ` - Sends \"No!\"\n\n\t` <optional @user> !my-birthday <date> ` - Sets the user’s birthday to that date. If you don't include a date, it will reply the user’s birthday. If you don’t include a user, it will assume you are the user.\n\n\t` <optional @user> !my-easter-eggs ` - Replies all the Easter eggs the user has found. If you don’t include a user, it will assume you are the user.\n\n\t` !update-easter-egg-names ` - Manual call to get unknown names from a server. This is also called in the ` !easter-egg-number ` command. This is useful when you don’t want to get the this of people with Easter eggs, but just get the names. This has to be done in each server to get everyone’s name.");
                                reply(message, "\u200b\n\t` !remove-reactions-alex ` - The bot will remove reactions from Alex if not mentioned on a poll.\n\t` !dont-remove-reactions-alex ` - The bot will allow Alex to react to polls even if he is not mentioned.");
			                } else {
			                	if (checkIfOwner(message.member)) {
			                		message.author.createDM()
	                					.then(channel => {
	                						channel.send("Because you're an Owner/Server Technician, I've hidden your special commands in the help section. To see all the commands you have access to please use the ` !help ` command. It will send you a dm instead.")
	                					})
	                					.catch(sendError);
			                	}
								reply(message, "I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
	                    	}	                   
	                   	} else if (message.channel.isDMBased() && (await checkIfDMUserIsInScarsdaleRobotics(message.author))) {
	                    	reply(message, "I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
	                    } else if (message.channel.isDMBased()) {
                            reply(message, "I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !delete <number> ` - Deletes the past number of messages sent by the bot.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
                        } else {
                            reply(message, "I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
                        }
                        break;
                    case 'help-reg':
                    	message.author.createDM()
	                		.then(async channel => {
								if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId) {
			                        if (message.channel.name == "admin" || message.channel.name == "testing") {
			                            channel.send("I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !teams ` - Will list all the teams participating in the virtual competition, including their name, team number, email, phone number and website\n\t` !teams-names ` - A more condensed list showing all the participating team's name and number\n\n\t` !team <team name or number> ` - Will list that team's name, number, email, phone number, and website (if they have one)\n\t` !team-name <team name or number> ` - Will only list that team's name and number\n\n\t` !form ` - Will send a message with the link to the form, if you need to send it to someone else or need to edit your answers\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !color <hex code, rgb, color string>` - Will change your team role color to the color entered.\n\t\tFormat Example - White:\n\t\t\tHex Code - `!color #ffffff`\n\t\t\tRGB - `!color [255, 255, 255]`\n\t\t\tColor String (Note: Works with very few colors) - `!color White`\n\t`!color-names` - Lists all the color strings that work\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules and will display a link to the competition rules when they are ready.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`");
			                            channel.send("\u200b\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
			                        } else {
			                            channel.send("I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !teams ` - Will list all the teams participating in the virtual competition, including their name, team number, and website\n\t` !teams-names ` - A more condensed list showing all the participating team's name and number\n\n\t` !team <team name or number> ` - Will list that team's name, number, and website (if they have one)\n\t` !team-name <team name or number> ` - Will only list that team's name and number\n\n\t` !form ` - Will send a message with the link to the form, if you need to send it to someone else or need to edit your answers\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !color <hex code, rgb, color string>` - Will change your team role color to the color entered.\n\t\tFormat Example - White:\n\t\t\tHex Code - `!color #ffffff`\n\t\t\tRGB - `!color [255, 255, 255]`\n\t\t\tColor String (Note: Works with very few colors) - `!color White`\n\t`!color-names` - Lists all the color strings that work\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules and will display a link to the competition rules when they are ready.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`");
			                            channel.send("\u200b\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
			                        }
			                    } else if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == ScarsdaleGuildId) {
									channel.send("I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
			                    } else if (message.channel.isDMBased() && (await checkIfDMUserIsInScarsdaleRobotics(message.author))) {
									channel.send("I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !delete <number> ` - Deletes the past number of messages sent by the bot.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
			                    } else if (message.channel.isDMBased()) {
									channel.send("I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !delete <number> ` - Deletes the past number of messages sent by the bot.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
			                    } else {
                                    channel.send("I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
                                }
	                		})
	                		.catch(errorMessage => {
				                message.channel.send("Message Send Error: ```" + errorMessage + "```");
				                console.error(errorMessage);
				            });
                        break;
                   	case 'help-here-reg':
                   		if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId) {
	                        if (message.channel.name == "admin" || message.channel.name == "testing") {
	                            reply(message, "I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !teams ` - Will list all the teams participating in the virtual competition, including their name, team number, email, phone number and website\n\t` !teams-names ` - A more condensed list showing all the participating team's name and number\n\n\t` !team <team name or number> ` - Will list that team's name, number, email, phone number, and website (if they have one)\n\t` !team-name <team name or number> ` - Will only list that team's name and number\n\n\t` !form ` - Will send a message with the link to the form, if you need to send it to someone else or need to edit your answers\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !color <hex code, rgb, color string>` - Will change your team role color to the color entered.\n\t\tFormat Example - White:\n\t\t\tHex Code - `!color #ffffff`\n\t\t\tRGB - `!color [255, 255, 255]`\n\t\t\tColor String (Note: Works with very few colors) - `!color White`\n\t`!color-names` - Lists all the color strings that work\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules and will display a link to the competition rules when they are ready.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`");
	                            reply(message, "\u200b\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
	                        } else {
	                            reply(message, "I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !teams ` - Will list all the teams participating in the virtual competition, including their name, team number, and website\n\t` !teams-names ` - A more condensed list showing all the participating team's name and number\n\n\t` !team <team name or number> ` - Will list that team's name, number, and website (if they have one)\n\t` !team-name <team name or number> ` - Will only list that team's name and number\n\n\t` !form ` - Will send a message with the link to the form, if you need to send it to someone else or need to edit your answers\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !color <hex code, rgb, color string>` - Will change your team role color to the color entered.\n\t\tFormat Example - White:\n\t\t\tHex Code - `!color #ffffff`\n\t\t\tRGB - `!color [255, 255, 255]`\n\t\t\tColor String (Note: Works with very few colors) - `!color White`\n\t`!color-names` - Lists all the color strings that work\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules and will display a link to the competition rules when they are ready.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`");
	                            reply(message, "\u200b\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
	                        }
	                    } else if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == ScarsdaleGuildId) {
	                    	reply(message, "I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !rules ` - Will direct you to the server rules.\n\n\t` !invite ` - Will send a message with the invite link to the Virtual Competition Server.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");                    
	                    } else if (message.channel.isDMBased() && (await checkIfDMUserIsInScarsdaleRobotics(message.author))) {
	                    	reply(message, "I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !website ` - Will send a message with a link to the Scarsdale Robo Raider's website. Which will be updated to include a page for the virtual competition in the near future.\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\t` !my-birthday <date> ` - Sets your birthday to that date. If you don't include a date, it will reply your birthday.\n\n\t` !eggs ` - Will send our 2018-2019 team captain's catchphrase!\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
	                    } else if (message.channel.isDMBased()) {
                            reply(message, "I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !delete <number> ` - Deletes the past number of messages sent by the bot.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
                        } else {
                            reply(message, "I am the primary bot for this server. Here are the functionalities I have:\n\n\t` !covid ` - Lists some useful sites to keep track of during this crisis.\n\n\t` !poll <Optional Date> \"<Question>\" \"<Answer>\" \"<Optional Answer>\" ... ` - Creates a poll with such Question and Answers.\n\t\tDate Format Example:\n\t\t\tDate - `Jan 9 9:41 AM`\n\t\t\t1 Day 3 Hours 5 Minutes 7 Seconds - `1d 3h 5m 7s`\n\t\t\t600 Seconds - `600`\n\n\t` !send <Date> \"<Message>\"` - Sends your message at the set date.\n\t\t\tUses the SAME Date format as `!poll`\n\t` !send-delete ` - Will delete all of your Timed Messages.\n\n\t` !hi ` - Will say hi back! Unless if you get on my nerves. Jk. Or Am I.\n\n\t` @<user> !birthday ` - Will send Happy Birthday! to the user (including if it's not their stored birthday - just in case they forget to add it). If you don't include a user, it will send it to everyone who has a birthday today.\n\nLastly, there are tons of additional hidden easter eggs for you to find! (And even one that will tell you how many easter eggs there are!)");
                        }
                        break;
                    case 'spam':
                        if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && (checkIfOwner(message.member)))) {
                        	message.author.createDM()
		                		.then(channel => {
									console.log(JSON.stringify(peopleMessaging));
		                            channel.send("Past 15 min: " + JSON.stringify(peopleMessaging));
		                            channel.send("Daily: " + JSON.stringify(peopleMessagingDaily));
		                		})
		                		.catch(errorMessage => {
					                message.channel.send("Message Send Error: ```" + errorMessage + "```");
					                console.error(errorMessage);
					            });
                        }
                        break;
                    case 'message-number':
                    case 'message-#':
                    case 'message-num':
                    case 'message#':
                    	message.author.createDM()
	                		.then(channel => {
								if (peopleMessaging[message.author.id] != undefined) {
		                            channel.send("You're at " + peopleMessaging[message.author.id] + " messages for the last 15 minute interval.");
		                        } else {
		                            channel.send("You're at 0 messages for the last 15 minute interval.");
		                        }
	                		})
	                		.catch(errorMessage => {
				                message.channel.send("Message Send Error: ```" + errorMessage + "```");
				                console.error(errorMessage);
				            });
                        break;
                    case 'covid':
                    case 'covid-19':
                    case 'coronavirus':
                        reply(message, "Please Follow Social Distancing Guidlines! Attached below are some useful links. \n\nCDC - Covid-19: https://www.cdc.gov/coronavirus/2019-ncov/index.html\n\nCovid Online Screening: https://www.apple.com/covid19/\n\nCovid tracker: https://www.bing.com/covid, ");
                        break;
                    case 'birthday':
                    case 'b-day':
                    case 'bday':
                        if (message.mentions.users.size == 0) {
                            var str = '';
                            for (const [key, value] of Object.entries(birthdays)) {
                                console.log(key, value);
                                var birthdate = new Date(value);
                                var theDate = new Date();

                                if (birthdate.getDate() == theDate.getDate() && birthdate.getMonth() == theDate.getMonth()) {
                                    str += '<@' + key + '> ';
                                }
                            }
                            if (str != '') {
                                message.channel.send({content: str + "Happy Birthday!!! 🎈🎂🎉", files: ["https://media.giphy.com/media/3ohhwmQ0xIg8W3pHd6/giphy.gif"]});
                            } else {
                                message.channel.send("No Birthdays Today :(");
                            }
                        } else {
                            var users = '';
                            message.mentions.users.forEach(function (user, userId) {
                                users += "<@" + userId + "> ";
                            })
                            users = users.trim();
                            message.channel.send("Happy Birthday " + users + "!!! 🎂🎁🥳 Enjoy the special day!");
                        }
                        break;
                    case 'my-birthday':
                    case 'my-b-day':
                    case 'my-bday':
                        var replyId = message.author.id;
                        if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                            if (message.author.id == alexId && message.mentions.members != null && message.mentions.members.size > 0) {
                                replyId = message.mentions.members.entries().next().value[0];
                            }
                        }
                        console.log(args.join(' '));

                        if (args.join(' ').trim() == '') {
                        	var options = { month: 'long', day: 'numeric', timeZone: 'America/New_York' };
                            var optionsYear = { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' };

                        	var birthdate = new Date(birthdays[replyId]);
                        	var showYear = true;

                        	console.log(birthdate);

                        	if (!isNaN(birthdate.getTime())) {
	                        	if (birthdate.getFullYear() == 1776) {
	                        		showYear == false;
	                        	}

	                        	ownersHaveOwnerBotAcess = false;

	                        	reply(message, "Your birthday is set to: " + birthdate.toLocaleDateString("en-US", showYear ? optionsYear : options));

	                        	ownersHaveOwnerBotAcess = true;
	                        	return;
	                        }
                        }

                        var birthdate = new Date(args.join(' '));

                        if (!isNaN(birthdate.getTime())) {
                            var showYear = false;
                            if (args.join(' ').includes(birthdate.getFullYear() % 100)) {
                                birthdays[replyId] = birthdate;
                                showYear = true;
                            } else {
                                birthdate.setFullYear(1776);
                                birthdays[replyId] = birthdate;
                            }
                            console.log(birthdays);
                            setBirthdays(message)
                                .then(function() {
                                    var options = { month: 'long', day: 'numeric', timeZone: 'America/New_York' };
                                    var optionsYear = { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' };
                                    reply(message, "Your birthday is now set to: " + birthdate.toLocaleDateString("en-US", showYear ? optionsYear : options));
                                })
                                .catch(sendError);
                        } else {
                            reply(message, "To use this command you must add a valid date after !my-birthday. \nEx: `!my-birthday 5/8/2002` (5/8 Will Not Work)");
                        }
                        break;
                    case 'eggs':
                    case 'egg':
                    case 'eggs-make-soup':
                    case 'soup':
                        reply(message, "Sometimes you need to break some eggs to make some soup!");
                        break;
                    case 'this-is-not-an-easter-egg':
                    	reply(message, "I can confirm this is **__NOT__** an easter egg. Hmm. But it's hidden. So is it an easter egg?");
                    	break;
                    case 'delete':
                        var num = Number(args[0]);

                        console.log(args[0]);

                        var dm = message.channel.isDMBased();

                        if (dm || (checkIfOwner(message.member))) {
                            var author = undefined;
                            var dmChannels = undefined;
                            var textChannels = undefined;
                            if (message.author.id == alexId) {
                                if (message.mentions.users.size > 0) {
                                    author = [];
                                    dmChannels = [];
                                    message.mentions.users.forEach(function (user, userId) {
                                        if (message.content.indexOf(userId) < message.content.indexOf(cmd)) {
                                            dmChannels.push(user);
                                        } 
                                        
                                        if (!dm && message.content.lastIndexOf(userId) > message.content.indexOf(cmd)) {
                                            author.push(user);
                                        }
                                    });

                                    if (dmChannels.length > 0) {
                                        for (var i = 0; i < dmChannels.length; i++) {
                                            dmChannels[0] = dmChannels[i];
                                            console.log(dmChannels[0]);
                                            if (args[0] == 'all') {
                                                startDeleteMessages(message, -1, true, true, dmChannels);
                                            } else if (num == undefined || isNaN(num)) {
                                                startDeleteMessages(message, 1, true, true, dmChannels);
                                            } else {
                                                startDeleteMessages(message, num, true, true, dmChannels);
                                            }
                                        }
                                    } else {
                                        dmChannels = undefined;
                                    }

                                    if (author.length == 0) {
                                        author = undefined;
                                    }
                                } 
                                
                                if (message.mentions.channels.size > 0) {
                                    textChannels = [];
                                    for (var [channelId, ch] of message.mentions.channels) {
                                        console.log(ch);
                                        var channel = await message.client.channels.fetch(channelId);
                                        if (channel != undefined) {
                                            console.log("HIERE");
                                            textChannels.push(channel);
                                        }
                                    }

                                    if (textChannels.length > 0) {
                                        for (var i = 0; i < textChannels.length; i++) {
                                            textChannels[0] = textChannels[i];
                                            console.log(textChannels[0]);
                                            if (args[0] == 'all') {
                                                startDeleteMessages(message, -1, author == undefined, false, author, textChannels);
                                            } else if (num == undefined || isNaN(num)) {
                                                startDeleteMessages(message, 1, author == undefined, false, author, textChannels);
                                            } else {
                                                startDeleteMessages(message, num, author == undefined, false, author, textChannels);
                                            }
                                        }
                                    } else {
                                        textChannels = undefined;
                                    }
                                }
                            }
                            console.log(author);
                            console.log(dm);
                            if ((dmChannels == undefined && textChannels == undefined) || (textChannels == undefined && author != undefined)) {
                                if (args[0] == 'all') {
                                    startDeleteMessages(message, -1, author == undefined, dm, author);
                                } else if (num == undefined || isNaN(num)) {
                                    startDeleteMessages(message, 1, author == undefined, dm, author);
                                } else {
                                    startDeleteMessages(message, num, author == undefined, dm, author);
                                }
                            }
                        } else {
                            message.reply("Only my creator and allowed owners has the ability to delete my messages in a text channel");
                        }
                        break;
                    case 'purge':
                        if (message.channel.isDMBased()) {
                            message.reply("Cannot purge messages in DMs");
                        } else if (checkIfOwner(message.member)) {
                            var num = Number(args[0]);

                            console.log(args[0]);
                            console.log(message.mentions.users.size);

                            var author = undefined;
                            var textChannels = undefined;
                            if (message.mentions.users.size > 0) {
                                author = [];
                                message.mentions.users.forEach(function (user, userId) {
                                    author.push(user);
                                })
                            }

                            if (message.mentions.channels.size > 0) {
                                textChannels = [];
                                for (var [channelId, ch] of message.mentions.channels) {
                                    console.log(ch);
                                    var channel = await message.client.channels.fetch(channelId);
                                    if (channel != undefined) {
                                        console.log("HIERE");
                                        textChannels.push(channel);
                                    }
                                }

                                if (textChannels.length > 0) {
                                    for (var i = 0; i < textChannels.length; i++) {
                                        textChannels[0] = textChannels[i];
                                        console.log(textChannels[0]);
                                        if (args[0] == 'all') {
                                            startDeleteMessages(message, -1, false, false, author, textChannels);
                                        } else if (num == undefined || isNaN(num)) {
                                            startDeleteMessages(message, 1, false, false, author, textChannels);
                                        } else {
                                            startDeleteMessages(message, num, false, false, author, textChannels);
                                        }
                                    }
                                } else {
                                    textChannels = undefined;
                                }
                            }
                            console.log(author);
                            if (textChannels == undefined) {
                                if (args[0] == 'all' && message.channel.isTextBased() && !message.channel.isDMBased()) {
                                    startDeleteMessages(message, -1, false, false, author);
                                } else if (num == undefined || isNaN(num)) {
                                    if (author == undefined) {
                                        message.delete()
                                            .catch(sendError);
                                    } else {
                                        startDeleteMessages(message, 1, false, false, author);
                                    }
                                } else {
                                    startDeleteMessages(message, num, false, false, author);
                                }
                            }
                        } else {
                            message.reply("Only my creator and allowed owners has the ability to purge messages");
                        }
                        break;
                    case 'reverse-time':
                        reply(message, "", {files: ["https://en.meming.world/images/en/thumb/7/7a/It%27s_Rewind_time.jpg/300px-It%27s_Rewind_time.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Reverse Time"));
                        break;
                    case 'bye':
                    	reply(message, "No! Don't leave.", {files: ["https://media.tenor.com/images/9cb041e878e1aed1c7381715e6f2cf77/tenor.gif"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Bye"));
                        break;
                    case 'goodbye':
                   	case 'good-bye':
                   		reply(message, "Goodbye! Hope to see you soon!", {files: ["https://thumbs.gfycat.com/BrightConcernedHapuku-size_restricted.gif"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Goodbye"));
                        break;
                    case 'bye-alex':
                    case 'goodbye-alex':
                    case 'good-bye-alex':
                    case 'bye-captain':
                    case 'goodbye-captain': 
                    case 'good-bye-captain':
                		var str = "**_Well this is it. I had such a great time working with all of you! Some of the experiences we've had togehter, I'll remember forever. So as a thank you, here's a game to celebrate all we did together!_**\n\nA couple things to keep in mind before playing:\n1. The game does not contain save functionality. So you must complete it in one sitting. I recommend setting 90 minutes aside for the entire experience so you don't rush it. This does not include downloading times.\n2. The game is 3.22GB. As such it might take some time to open. Be patient. \n3. In addition you might see some Malware warnings. This is just because I am not a known developer. The downloading guide, listed below, will help you deal with such warnings.";
                		var str2 = "\u200b\n**Downloading instructions:**\n\nGo to: https://drive.google.com/drive/folders/1kMo3bkKqyng-cshZTS6Tozyt17ONTv3U?usp=sharing\n\nMacOS: \n1. Download the file starting with Mac Build 2.\n2. Wait for it to download and extract files. \n3. Open the Application\n     a. You might see a security warning. **DO NOT** click move to trash. __If you don't see a security warning__ skip to step 7.\n     b. Click Cancel on the security warning\n4. Open Settings -> Security and Privacy\n5. Click on the lock on the bottom to unlock it (if not already unlocked)\n6. Click Open Anyway near the bottom next to Robotics Goodbye Game\n7. Enjoy!\n\nWindows - Req 64bit: \n1. Download the file starting with Windows Build 2.\n2. Wait for it to download and then extract files. \n3. Open the Windows Build 2 folder\n4. Open the Robotics Goodbye Game Executable\n     a. You might see a security warning. __If you don't see a security warning__ skip to step 7.\n5. Click more info\n6. Then click run anyway\n7. Enjoy!\n\n**In addition, if you do enjoy the game, I would appreciate it if you shared it on slack. So those who don't use discord can experience it. Thanks!**\n\nTime to Play! Enjoy!\n\n<:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx>\n           **Go Robo Raiders!**\n<:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx>";
						message.channel.send(str)
							.then(msg => {
								message.channel.send(str2);
							})
							.catch(sendError);
                    	break;
                   	case 'bye-alex-announcement':
                    case 'goodbye-alex-announcement':
                    case 'good-bye-alex-announcement':
                    case 'bye-captain-announcement':
                    case 'goodbye-captain-announcement': 
                    case 'good-bye-captain-announcement':
                    	message.channel.send({content: "**__Alex's Robotics Experience Announcement__**\n\nWell it's been a long ride, but we're here.\n\nFor the past few months I've been working on an experience to rightfully end the 2019-20 season. It took a bit longer than I was hoping, but I think you'll find it worth the wait.\n\u200b", files: ["https://i.postimg.cc/W19xdvcS/Screen-Shot-2020-09-18-at-6-50-04-PM.png"]})
                    		.then(msg => {
								message.channel.send("\u200b\nAs such I present, my perspective on the 2019-20 Robotics Year. This experience is a game. You'll find yourself navigating through a maze. Along the way are Missions. Each mission is a video that represents a specific point or period of time throughout the year for a department or area. To complete the narrative, you must complete at least 1 of the 3 main paths (Engineering, Programming, or Outreach), in addition to the required Maroon missions. \n\nTo create this, it required gathering hundreds of photos and videos, programing thousands of lines of code, learning how to use unity, and a hell of a lot more. I hope you all enjoy it!\n\n To fit that all in, the file size increased dramatically, so expect a download around 3.22GB. It will be available on Mac and Windows as a direct download from Google Drive. As such I will include instructions on how to deal with Malware warnings tomorrow when the game releases.\n\n**__The game will fully come out Tomorrow September 19th.__**\n\nIn the meantime, a lot of what I've shared before should make a lot more sense now. If you'd like, you can look back, see part of what's in the game, as well as what a Maroon mission looks like from a birds-eye view.\n\nSo long and thanks for all the experiences!");
                    		})
                    		.catch(sendError);
                    	break;
                    case 'cups':
                   		reply(message, "What cup is it in?", {files: ["https://i.pinimg.com/originals/0a/3b/86/0a3b8694c2b570cf4e921d63f7f39709.gif"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Cups"));
                        break;
                    case 'trash':
                   		reply(message, "Here you go:", {files: ["https://www.pngkey.com/png/detail/349-3495942_walle-ta-da-gif.png"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Trash"));
                        break;
                    case 'black-lives-matter':
                        if (message.channel.isDMBased() || message.guild.id == ScarsdaleGuildId) {
                            reply(message, "Spread the message! Something needs to change! However, I do ask, if your region is still in lockdown, participate online instead. By protesting in regions like NYC before Covid is over will cause a lot more people to die (which disproportionally affects people of color). So just do your justice online, where you can spread the message, and save lives. https://blacklivesmatter.com");
                        } else {
                            reply(message, "https://blacklivesmatter.com");
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Black Lives Matter"));
                        break;
                    case 'reopening':
                    case 'reopen':
		                if (message.channel.isDMBased() || message.guild.id == VCGuildId) {
		                	reply(message, "Yay reopening! Our team is in Phase 4 of reopening. Check the dashboard if you live in new york to see how your region is doing: https://forward.ny.gov/regional-unpause-dashboard");
		                } else if (message.channel.isDMBased() || message.guild.id == ScarsdaleGuildId) {
		                	reply(message, "Yay reopening! We're in Phase 4! Check the dashboard for more updates on our reopening: https://forward.ny.gov/regional-unpause-dashboard");
		                } else {
                            reply(message, "When do you think we'll fully reopen?");
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Reopening"));
                        break;
                    case 'cuomo':
                    case 'governor-cuomo':
                    case 'andrew-cuomo':
                        reply(message, "We are New York Tough Smart United Diciplined and Loving, just like you! Thank you for all your hard work and for taking responsibility for handling Covid in New York. Keep up the good work!", {files: ["https://observer.com/wp-content/uploads/sites/2/2020/07/GettyImages-1225710523.jpg?quality=80"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Governor Cuomo"));
                        break;
                    case 'their-birthday':
                    case 'their-b-day':
                    case 'their-bday':
                        var user = message.author;
                        if (message.channel.isTextBased() && !message.channel.isDMBased() && message.mentions.members != null && message.mentions.members.size > 0) {
                            user = message.mentions.members.entries().next().value[1].user;
                        }
                        var options = { month: 'long', day: 'numeric', timeZone: 'America/New_York' };
                        
                        var birthdate = new Date(birthdays[user.id]);
                        if (!isNaN(birthdate.getTime())) {
                            message.channel.send("<@" + user.id + '> - ' + birthdate.toLocaleDateString("en-US", options));
                        } else {
                            message.channel.send("Unfortunately I don't have a birthday for that person.")
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Their Birthday"));
                        break;
                    case 'bdays-today':
                    case 'b-days-today':
                    case 'birthdays-today':
                    case 'bday-today':
                    case 'b-day-today':
                    case 'birthday-today':
                    	async function bdayToday() {
	                        var str = '';
	                        for (const [key, value] of Object.entries(birthdays)) {
	                            console.log(key, value);
	                            var birthdate = new Date(value);
	                            var theDate = new Date();

	                            if (birthdate.getDate() == theDate.getDate() && birthdate.getMonth() == theDate.getMonth()) {
	                            	try {
	                            		var user = await client.users.fetch(key);
	                                	str += "<@" + user.id + ">\n";
	                            	} catch (error) {
	                            		sendError(error);
	                            	}
	                            }
	                        }
	                        if (str == '') {
	                            message.channel.send("I don't know anyone who has a birthday today.");
	                        } else {
	                            message.channel.send("Birthdays Today:\n" + str);
	                        }
	                        updateEasterEgg(message, easterEggsInOrder.indexOf("Birthday Today"));
	                    }
	                    bdayToday();
                        break;
                    case 'all-bday':
                    case 'all-b-day':
                    case 'all-birthday':
                    case 'all-bdays':
                    case 'all-b-days':
                    case 'all-birthdays':
                    case 'all-bday-game':
                    case 'all-b-day-game':
                    case 'all-birthday-game':
                    case 'all-bdays-game':
                    case 'all-b-days-game':
                    case 'all-birthdays-game':
	                    async function allBdays() {
	                        var str = '';
	                        for (const [key, value] of Object.entries(birthdays)) {
	                            console.log(key, value);
	                            var birthdate = new Date(value);

	                            var options = { month: 'long', day: 'numeric', timeZone: 'America/New_York' };

	                            var user;
	                            try {
                            		user = await client.users.fetch(key);
                            	} catch (error) {
                            		sendError(error);
                            	}

	                            if ((canShowAllBDays && !cmd.includes('game')) || ((message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member))) && ((message.channel.isTextBased() && !message.channel.isDMBased() && (message.mentions.members == null || message.mentions.members.size == 0) && !cmd.includes('game')) || (message.channel.isDMBased() && !cmd.includes('game'))))) {
	                                str += "<@" + user.id + '> - ' + birthdate.toLocaleDateString("en-US", options) + '\n';
	                            } else {
	                                var optionsWeird = { weekday: 'long', timeZone: 'America/New_York' };
	                                var optionsWeird2 = { month: 'long', timeZone: 'America/New_York' };
	                                var rand = Math.floor(Math.random() * 5);

	                                console.log(rand);

	                                switch (rand) {
	                                    case 0:
	                                        str += '||`__Redacted__`|| - ' + birthdate.toLocaleDateString("en-US", options) + '\n';
	                                        break;
	                                    case 1:
	                                        str += '||`__Redacted__`|| - On a ' + birthdate.toLocaleDateString("en-US", optionsWeird) + " in " + birthdate.toLocaleDateString("en-US", optionsWeird2) + '\n';
	                                        break;
	                                    case 2:
	                                        str += '<@' + user.id + '> - ||`__Redacted__`||\n';
	                                        break;
	                                    case 3:
	                                        str += '<@' + user.id + '> - On a ' + birthdate.toLocaleDateString("en-US", optionsWeird) + " in " + birthdate.toLocaleDateString("en-US", optionsWeird2) + '\n';
	                                        break;
	                                    default:
	                                        str += '||`__Redacted__`|| - ||`__Redacted__`||\n';
	                                        break;
	                                }
	                            }
	                        }
	                        if (str == '') {
	                            message.channel.send("I don't know anyone who has a birthday.");
	                        } else {
	                            message.channel.send("Birthdays:\n" + str + "\n(Weekdays are from birth year or if not provided 1776)");
	                        }
	                        updateEasterEgg(message, easterEggsInOrder.indexOf("All Birthdays"));
	                    }
	                    allBdays();
                        break;
                    case 'can-show-bdays':
                    case 'can-show-b-days':
                    case 'can-show-all-bdays':
                    case 'can-show-all-b-days':
                    	if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member))) {
                    		canShowAllBDays = true;
                    		message.channel.send({content: "All users can now see all birthdays without redactions. Goodbye Privacy!", files: ['https://media1.tenor.com/images/795ac259a372acac638a96d1671fe69e/tenor.gif?itemid=11810154']});
                    	}
                    	break;
                    case 'can\'t-show-bdays':
                    case 'cant-show-bdays':
                    case 'can\'t-show-b-days':
                    case 'cant-show-b-days':
                    case 'can\'t-show-all-bdays':
                    case 'cant-show-all-bdays':
                    case 'can\'t-show-all-b-days':
                    case 'cant-show-all-b-days':
                    case 'don\'t-show-bdays':
                    case 'dont-show-bdays':
                    case 'don\'t-show-b-days':
                    case 'dont-show-b-days':
                    case 'don\'t-show-all-bdays':
                    case 'dont-show-all-bdays':
                    case 'don\'t-show-all-b-days':
                    case 'dont-show-all-b-days':
                    	if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member))) {
                    		canShowAllBDays = false;
                    		message.channel.send({content: "All users will now see redactions applied to all birthdays. Hello Privacy!", files: ['https://static.dribbble.com/users/4022852/screenshots/8031754/privacy_settings_button_icon.gif']});
                    	}
                    	break;
                    case 'thanos':
                        reply(message, "https://www.youtube.com/watch?v=Fp_uJACv1NI");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Thanos"));
                        break;
                    case 'marvel':
                        reply(message, "Best Marvel movie by far: https://tv.apple.com/us/movie/avengers-infinity-war/umc.cmc.2do0xuo1u4tjmqbfz1p42a0p9");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Marvel"));
                        break;
                    case 'tesla':
                        reply(message, "S3XY CARS: https://medium.com/@ariabakhtiar/the-story-behind-elon-musks-longest-joke-tesla-s3xy-3859850d8911\n\n Take a look at the rediculously awesome Cybertruck, Atv, Roadster, and Semi (CARS) on https://www.tesla.com\n\tRoadster Plaid Announcement: https://youtu.be/5RRmepp7i5g?t=1564\n\tCybertruck event: https://www.youtube.com/watch?v=9P_1_oLGREM\n\n\tTesla Ventilator: https://www.youtube.com/watch?v=zZbDg24dfN0\n\n\tFull Self-Driving: https://www.youtube.com/watch?v=tlThdr3O5Qo\n\tTesla Autonomy Day: https://www.youtube.com/watch?v=Ucp0TTmvqOE\n\n\tCool Video: https://www.youtube.com/watch?v=azUbCdcAeFM");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Tesla"));
                        break;
                    case 'musk':
                    case 'elon-musk':
                        reply(message, "Twitter: https://twitter.com/elonmusk/with_replies");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Elon Musk"));
                        break;
                    case 'don\'t-doubt-your-vibe':
                    case 'dont-doubt-your-vibe':
                    case 'vibe':
                    case 'don\'t-doubt-ur-vibe':
                    case 'dont-doubt-ur-vibe':
                        reply(message, "Don't Doubt ur Vibe - Elon Musk: https://soundcloud.com/user-209448905/dont-doubt-ur-vibe\n\n||Enjoy it if u can!||");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Don't Doubt Ur Vibe"));
                        break;
                    case 'spacex':
                    case 'space-x':
                        reply(message, "Cool vids: \n\tFalcon Heavy Double Landing: https://youtu.be/D4w_4O4J_7o?t=94\n\tStarman (Don't Panic!): https://www.youtube.com/watch?v=A0FZIwabctw\n\n\tHow not to land a orbital booster (in comparason our robot failing isn't that bad): https://www.youtube.com/watch?v=bvim4rsNHkQ\n\n\tStarship prototype: https://www.youtube.com/watch?v=bYb3bfA6_sQ\n\tStarship: https://www.youtube.com/watch?v=C8JyvzU0CXU\n\n\tCrew dragon: https://www.youtube.com/watch?v=F-wBgsf8jWY\n\tCrew dragon Animation: https://www.youtube.com/watch?v=sZlzYzyREAI\n\n\tHyperloop: https://www.youtube.com/watch?v=MYxgfpWW5Q8");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("SpaceX"));
                        break;
                    case 'terms-of-service':
                    case 'tos':
                    	replyWithReturn(message, "Well, the first image is Apple's terms of service (tos). The second is Starlink's tos. Only the law would ever make you say these things.")
                    		.then(msg => {
                    			setTimeout(() => {
                    				message.channel.send("\u200b.\n.\nOr Elon Musk")
                    					.then(msg2 => {
                    						setTimeout(() => { 
			                    				message.channel.send({content: "\u200b\n\u200b", files : ["https://i.postimg.cc/cLn6BR4c/Screen-Shot-2020-10-31-at-8-31-08-AM.png", "https://i.postimg.cc/7L18x6m4/El-YLG38-XYAE-jt0.png"]});
			                    			}, 500);
                    					})
                    					.catch(sendError);
                    			}, 500);
                    		})
                    		.catch(sendError);
                    	updateEasterEgg(message, easterEggsInOrder.indexOf("Terms of Service"));
                        break;
                    case 'assistant':
                    case 'shs':
                    case 'shs-assistant':
                    case 'app':
                        reply(message, "Check out the app I made for my school: https://apps.apple.com/us/app/shs-assistant/id1318078276\n\nLet me know if you have any feedback! And rate it 5 stars if you think it deserves it! (Only if you go to SHS)");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("SHS Assistant"));
                        break;
                    case 'alex':
                    case 'alex-arovas':
                    case 'alex-a':
                        reply(message, "Alex Arovas is a Senior at Scarsdale High School. He is the captain of the Scarsdale Robo Raiders. He created this bot as well as an app for his school named SHS Assistant. Have fun with the bot!");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Alex Arovas"));
                        break;
                    case 'cye':
                    case 'curb':
                    case 'curb-your-enthusiasm':
                        reply(message, "https://www.youtube.com/watch?v=gyZDZCGQJf8");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Curb Your Enthusiasm"));
                        break;
                    case 'spaceballs':
                    case 'space-balls':
                        reply(message, "I am your father's brother's nephew's cousin's former roomate's bot. Wait what? https://www.youtube.com/watch?v=pPkWZdluoUg");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Spaceballs"));
                        break;
                    case 'walle':
                    case 'wall-e':
                        reply(message, "Tadah! Waaaallll-eeeee. https://www.youtube.com/watch?v=APU1DIaEap8")
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Wall-E"));
                        break;
                    case 'monty-python':
                        reply(message, "I'm not the messiah. https://youtu.be/iktKXIsRUIg?t=114");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Monty Python"));
                        break;
                    case 'stayin-alive':
                    case 'stayin\'-alive':
                    case 'staying-alive':
                        reply(message, "Stayin' Alive: https://www.youtube.com/watch?v=I_izvAbhExY");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Stayin' Alive"));
                        break;
                    case 'playlist':
                        reply(message, "Here's the Robo Raider's Playlist: https://www.youtube.com/playlist?list=PL4RAu5luvjnFHi9kZWS-xm1lFmdtW6eI3&jct=ES2rt4VY8RYrsFAkHk9B26FQZhMexA\n\nOr on Spotify if you prefer: https://open.spotify.com/playlist/6nRsX42YzHlK1fchdf2MU2?si=sKm4QU5nRRmtCMi-Bu69rQ");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Playlist"));
                        break;
                    case 'yoshi':
                    case 'yoshis':
                    case 'yoshi\'s':
                    case 'big-yoshi':
                    case 'big-yoshi\'s':
                    case 'big-yoshis':
                    case 'yoshi-lounge':
                    case 'yoshi\'s-lounge':
                    case 'yoshis-lounge':
                    case 'big-yoshi-lounge':
                    case 'big-yoshi\'s-lounge':
                    case 'big-yoshis-lounge':
                        reply(message, "https://www.youtube.com/watch?v=3FgBuuosCr0");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Big Yoshi's Lounge"));
                        break;
                    case 'shrek':
                    case 'shreksophone':
                        reply(message, "https://www.youtube.com/watch?v=pxw-5qfJ1dk");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Shreksophone"));
                        break;
                    case 'rdr':
                    case 'rdr2':
                    case 'rdr-2':
                    case 'red-dead':
                    case 'red-dead2':
                    case 'red-dead-2':
                    case 'red-dead-redemption':
                    case 'red-dead-redemption-2':
                        reply(message, "Enoy some music and a trailer from my favorite game - Red Dead Redemption 2: https://www.youtube.com/watch?v=McnMsFwZlvA\nhttps://www.youtube.com/watch?v=F63h3v9QV7w&list=PL-r1a4Mhgtx9Z50gWmiVh0DbndENgo0eP&index=14");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("RDR 2"));
                        break;
                    case 'death-stranding':
                        reply(message, "Confusing, yet really cool scene: https://www.youtube.com/watch?v=dbGD_d2cGEk");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Death Stranding"));
                        break;
                    case 'free-guy':
                        reply(message, "Bad name, funny trailer. It's like GTA: The Pacific Standard Trailer. https://www.youtube.com/watch?v=X2m-08cOAbc");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Free Guy"));
                        break;
                    case 'star-citizen':
                    case 'sc':
                        reply(message, "Star Citizen is an extremely ambitious game currently in alpha. It's goal is to be the best space/universe sim ever. It takes place 930 years in the future, where you are a citizen inside of a giant yet dense universe all for you to explore. The best part is it's one of the most detailed games I've ever seen, which is expecially impressive when you can eplore tons of full sized planets! Even with NPCs, they act like their real and fly from planet to planet. (Warning: The game is in alpha, therefor it is still quite buggy and missing many gameplay loops). Here are some cool video's to check out:\n\tStar Citizen 2018 P.U. Trailer: https://www.youtube.com/watch?v=0TWqG_VAjEo\n\n\tCitizen Con 2949 Ending Demo: https://www.youtube.com/watch?v=-tB3cark5lA&list=PLVct2QDhDrB0atMb1EAyYgggX5DyfUzd4&index=2\n\n\tCitizen Con 2949 Building a Dynamic Universe Demo: https://www.youtube.com/watch?v=_8VFw1F-olQ&list=PLVct2QDhDrB0atMb1EAyYgggX5DyfUzd4&index=9\n\nThe tech behind it is also really cool! Don't really have good links for the tech though sorry :(");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Star Citizen"));
                        break;
                    case 'squadron':
                    case 'squadron-42':
                        reply(message, "Squadron 42 is the single player campaign of Star Citizen. Unlike Star Citizen (which is in Alpha) the game is not able to be played right now. However here is a visual teaser: https://www.youtube.com/watch?v=_aCE7gxQOVY");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Squadron 42"));
                        break;
                    case '3.9':
                    case 'alpha-3.9':
                    case '3.9.0':
                    case 'alpha-3.9.0':
                        reply(message, "Star Citizen Alpha 3.9.0 info: https://robertsspaceindustries.com/comm-link/transmission/17506-Alpha-39-Locked-Up-Loaded\n\n3.9 Pillar Talk: https://www.youtube.com/watch?v=tcMtPKSe2g4");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Alpha 3.9"));
                        break;
                    case 'new-babbage':
                        reply(message, "ISC New Babbage Segment - 2/26/20: https://www.youtube.com/watch?v=ofRdT2NmjbI\n\nAnd some great music: https://www.youtube.com/watch?v=TFdkhGcA_Lk");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("New Babbage"));
                        break;
                    case 'klescher':
                    case 'klescher-prison':
                    case 'klescher-automated-prison':
                        reply(message, "Star Citizen Prison System - Good segments: \n\tMorphologis: https://www.youtube.com/watch?v=_L0sctbREKw\n\tISC - 2/6/20: https://www.youtube.com/watch?v=ClWreRIs_ag\n\tISC - 2/19/20: https://www.youtube.com/watch?v=qSZiOxyVGmI");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Klescher Automated Prison"));
                        break;
                    case 'snap':
                        if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                            replyWithReturn(message, "", {files : ["https://i.postimg.cc/DyRKpsgn/tenor.gif"]})
                                .then(msg => {
                                    setTimeout(async () => { 
                                        var survive = "The people who survived the vanishing:";
                                        var die = "The ones who weren't so lucky 💨 ";
                                        if (message.guild.id == VCGuildId) {
	                                        var guildRoles = await message.guild.roles.fetch("xxxxxxxxxxxxxxxx");
                                            guildRoles.members.forEach(function (member, memberId) {
	                                            const rand = Math.floor(Math.random() * 2);
	                                            if (rand == 0) {
	                                                die += "<@" + memberId + "> ";
	                                            } else {
	                                                survive += "<@" + memberId + "> ";
	                                            }
	                                        })
	                                        message.channel.send(survive + "\n\n" + die + "\n\nOnly Accounts for Team 12331 (Scarsdale Robo Raiders)");
	                                    } else {
	                                    	var guildMembers = await message.guild.members.fetch();
                                            guildMembers.forEach(function (member, memberId) {
	                                    		if (!member.user.bot) {
		                                            const rand = Math.floor(Math.random() * 2);
		                                            if (rand == 0) {
		                                                die += "<@" + memberId + "> ";
		                                            } else {
		                                                survive += "<@" + memberId + "> ";
		                                            }
		                                        }
	                                        })
	                                        message.channel.send(survive + "\n\n" + die);
	                                    }
                                    }, 2500);
                                })
                                .catch(err => {
                                    sendError(err);
                                });
                        } else {
                            const rand = Math.floor(Math.random() * 2);

                            replyWithReturn(message, "", {files : ["https://i.postimg.cc/DyRKpsgn/tenor.gif"]})
                                .then(msg => {
                                    setTimeout(() => { 
                                        console.log(rand);
                                        if (rand == 0) {
                                            message.channel.send("<a:snap:xxxxxxxxxxxxxxxx>")
                                                .then(msg => {
                                                    reply(message, "||Sorry, you died in the snap||");
                                                })
                                                .catch(sendError);
                                        } else {
                                            message.channel.send("<a:snap:xxxxxxxxxxxxxxxx>")
                                                .then(msg => {
                                                    reply(message, "Congrats! You survived the snap! We can live on together! However, I'm sorry for all those who vanished 💨");
                                                })
                                                .catch(sendError);
                                        }
                                    }, 2500);
                                })
                                .catch(err => {
                                    sendError(err);
                                });
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Snap"));
                        break;
                    case 'gauntlet':
                        reply(message, "", {files : ["https://i.postimg.cc/DyRKpsgn/tenor.gif"]})
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Gauntlet"));
                        break;
                    case 'drax':
                        reply(message, "WHY IS GAMORA?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Drax"));
                        break;
                    case 'guardians-of-the-galaxy':
                    case 'gotg':
                        reply(message, 'Fun movie and fun set of characters! Here\'s a coole clip: https://www.youtube.com/watch?v=6OjxHWqkHeI');
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Guardians of the Galaxy"));
                        break;
                    case 'may-the-fourth-be0-with-you':
                    case 'may-the-4th-be0-with-you':
                    case 'may-4':
                    case 'may-4th':
                    case 'may-the-fourth':
                    case 'may-the-4th':
                        reply(message, "May the Fourth Be With You!", {files: ['https://i.postimg.cc/7hk3LPSg/ezgif-7-b1a9e60cf0ea.gif']});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("May The Fourth Be With You"));
                        break;
                    case 'the-last-jedi':
                    case 'tl!tf!jj':
                    case 'star-wars':
                    case 'episode-8':
                    case 'ep8':
                        reply(message, "The New Trilogy Sucks. The Last Jedi, my personal opinon, horrible movie. https://www.youtube.com/watch?v=uiXk6mEM_tU");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("The Last Jedi"));
                        break;
                    case 'merchandising':
                    case 'spaceballs-the-flamethrower':
                        reply(message, "https://www.youtube.com/watch?v=HnXKE0nfAjI");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Merchandising"));
                        break;
                    case 'spaceballs-2':
                    case 'spaceballs-2-the-search-for-more-money':
                        reply(message, 'https://www.youtube.com/watch?v=aN8wxQDqfRk');
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Spaceballs 2 The Search for more Money"));
                        break;
                    case 'flamethrower':
                    case 'not-a-flamethrower':
                        reply(message, "It's not a flamethrower, Mr. Escobar: https://www.youtube.com/watch?v=gMYODvtbtKU&feature=emb_title");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Not a Flamethrower"));
                        break;
                    case 'plaid':
                    case 'ludicrous':
                        reply(message, "Spaceballs ludicrous & plaid: https://www.youtube.com/watch?v=mk7VWcuVOf0\n\nTesla ludicrious: https://www.youtube.com/watch?v=vmTRakQBvFs\nTelsa plaid:https://youtu.be/5RRmepp7i5g?t=1564\nhttps://www.youtube.com/watch?v=azUbCdcAeFM");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Plaid"));
                        break;
                    case 'cournel-sanders':
                    case 'kfc':
                        reply(message, "Get it? https://youtu.be/mk7VWcuVOf0?t=48");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Cournel Sanders"));
                        break;
                    case 'avengers':
                        reply(message, "Enjoy some Avengers music: https://www.youtube.com/watch?v=FOabQZHT4qY");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Avengers"));
                        break;
                    case 'ffh':
                    case 'spiderman':
                    case 'spider-man':
                    case 'spiderman-far-from-home':
                    case 'spider-man-far-from-home':
                    case 'far-from-home':
                        reply(message, "Enjoy some Spiderman: Far From Home music - https://www.youtube.com/watch?v=eoSDzpU5XVE");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Spiderman Far From Home"));
                        break;
                    case 'cap':
                    case 'captain-america':
                        reply(message, "His creation: https://www.youtube.com/watch?v=C2Qsh-R4a1k");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Captain America"));
                        break;
                    case 'office':
                    case 'the-office':
                        reply(message, "So funny: https://www.youtube.com/watch?v=gO8N3L_aERg\nhttps://www.youtube.com/watch?v=Vmb1tqYqyII");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("The Office"));
                        break;
                    case 'mysterio':
                        reply(message, "Another great hero! https://www.youtube.com/watch?v=fyGMGEY61gU\n\nAw man. He's a villain. :(. At least he was a good one");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Mysterio"));
                        break;
                    case 'deadpool':
                        reply(message, "WARNING Blood and Profanity, but sooo funny. https://www.youtube.com/watch?v=gKc6PyU_O2s");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Deadpool"));
                        break;
                    case 'deadpool-2':
                        reply(message, "WARNING Blood and Profanity, but twoo funny (Sorry for the horrible pun). https://www.youtube.com/watch?v=Uezm6AjHV4E");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Deadpool 2"));
                        break;
                    case 'captain-deadpool':
                        reply(message, "WARNING  Profanity. Deadpool. Captain Deadpool. No, just Deadpool. https://www.youtube.com/watch?v=TJVQj4sw3zI");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Captain Deadpool"));
                        break;
                    case 'ant-man':
                    case 'antman':
                        reply(message, "🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜\n🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜\n🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜\n🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜\n🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜\n🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜\n🐜🐜🐜🦹🏻‍♂️🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜🐜");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Ant-Man"));
                        break;
                    case 'rick-roll':
                    case 'rickroll':
                        reply(message, 'https://www.youtube.com/watch?v=oHg5SJYRHA0');
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Rick Roll"));
                        break;
                    case 'some-good-news':
                    case 'sgn':
                        reply(message, 'I\'m readdy for Some Good News! https://www.youtube.com/channel/UCOe_y6KKvS3PdIfb9q9pGug');
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Some Good News"));
                        break;
                    case 'lunar-lander':
                        reply(message, "Lunar Lander, a great Atari game: http://moonlander.seb.ly");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Lunar Lander"));
                        break;
                    case 'plane':
                    case 'planes':
                        reply(message, "🛫🛫🛫🛫✈️✈️✈️✈️✈️✈️✈️✈️\n***Microsoft Flight Simulator 2020 Comes out today!!!***\nCheck out Microsoft Flight Simulator 2020: https://www.flightsimulator.com\n🛩🛩🛩🛩🛩🛩🛩🛩🛬🛬🛬🛬\n\nCheck out Microsoft Flight Simulator X (FSX): https://store.steampowered.com/app/314160/Microsoft_Flight_Simulator_X_Steam_Edition/\n\nAnd for more info pls check out <@!xxxxxxxxxxxxxxxx> (He's essentially a plane by now)");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Plane"));
                        break;
                    case 'patagonia':
                        reply(message, "If you happen to win a Patagoinia jacket, like me, you'll end up wearing it way too often. It's essentially my favorite piece of clothing now!");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Patagonia"));
                        break;
                    case 'javascript':
                        reply(message, "I know they sound alike but JavaSCRIPT is very different than Java. Stop thinking they are the same thing. I'd understand JSON (JavasScript Object Notation) and JavaScript but not this. :(");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Javascript"));
                        break;
                    case 'cap-2':
                    case 'cap2':
                    case 'winter-soldier':
                    case 'the-winter-soldier':
                    case 'captain-america-2':
                    case 'captain-america-winter-soldier':
                    case 'captain-ameriica-the-winter-soldier':
                        reply(message, "Awesome marvel movie! Here's a clip: https://www.youtube.com/watch?v=hLUdF8cjzyA");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Captain America The Winter Soldier"));
                        break;
                    case 'black-widow':
                        reply(message, "It was delayed util November 6th, but here's the latest trailer: https://www.youtube.com/watch?v=ybji16u608U");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Black Widow"));
                        break;
                    case 'infinity-war':
                    case 'avengers-infinity-war':
                        reply(message, "Favorite Marvel movie by far! Here's a cool scene: https://www.youtube.com/watch?v=Z68MRjRpwdo");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Avengers Infinity War"));
                        break;
                    case 'avengers-endgame':
                    case 'endgame':
                        reply(message, "Well at least Thor got his redemption: https://www.youtube.com/watch?v=nm8WAvIJxYE");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Avengers Endgame"));
                        break;
                    case 'time-travel':
                        reply(message, "Time Travel!", {files : ["https://pics.me.me/when-youre-going-through-time-at-a-rate-of-one-55625485.png"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Time Travel"));
                        break;
                    case '1917':
                        reply(message, "Enjoy this war movie shot to look like it was taken in one shot: https://www.youtube.com/watch?v=KQfybDxplPw&list=PLuq_rgCzEP_Mb9NZB12BgC927PCtj9NHl&index=4");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("1917"));
                        break;
                    case 'schwartz':
                        reply(message, "May the schwartz be with you you u ou eh oh u o ✨💥 \nhttps://www.youtube.com/watch?v=aVz1kBnIDd0");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Scwartz"));
                        break;
                    case 'spy':
                        reply(message, "Really funny action comedy. Here's a funny clip. WARNING: It's R - Rated and included Profanity. https://www.youtube.com/watch?v=MfInGEdTz18");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Spy"));
                        break;
                    case 'skyfall':
                        reply(message, "My favorite James Bond movie (right ahead of Goldfinger). Here's a cool clip: https://www.youtube.com/watch?v=FumW4wuqDeQ")
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Skyfall"));
                        break;
                    case 'kingsman-the-secret-service':
                    case 'kingsman':
                        reply(message, "Kingsman: The Secret Service is an awesome action packed movie. Definitely recomend watching it. Here's a really bloody (this is a WARNING) but cool scene: https://www.youtube.com/watch?v=R3zdYUG2_RA")
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Kingsman The Secret Service"));
                        break;
                    case 'bird':
                    case 'free-bird':
                        reply(message, "Here's Free Bird: https://www.youtube.com/watch?v=D0W1v0kOELA\n\nSorry <@!xxxxxxxxxxxxxxxx>");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Free Bird"));
                        break;
                    case 'times-square':
                    case 'new-year':
                    case 'new-year\'s':
                    case 'new-years':
                    case 'times-square-ball':
                    case 'new-year-ball':
                    case 'new-year\'s-ball':
                    case 'new-years-ball':
                    case 'ball':
                    case 'ball-drop':
                    case 'mini-times-square-ball':
                    case 'new-year\'s-eve-ball':
                    case 'new-years-eve-ball':
                    case 'mini-new-year-ball':
                    case 'mini-new-year\'s-ball':
                    case 'mini-new-years-ball':
                    case 'mini-ball':
                    case 'mini-ball-drop':
                    case 'mini-new-year\'s-eve-ball':
                    case 'mini-new-years-eve-ball':
                        reply(message, "Check out my Mini Times Square Ball at: http://minitimesquareball.weebly.com (Sorry haven't updated the website yet, I've been busy)");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Mini Times Square Ball"));
                        break;
                    case 'nolan':
                    case 'christopher-nolan':
                        reply(message, "My favorite director. He's made some fantastic movies including:\n\t- The Dark Knight\n\t- The Dark Knight Rises\n\t- Dunkirk\n\t- Momento\n\t- Interstellar\n\t- Inception\n\t- Upcoming: TENET (Hopefully Fantastic)")
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Christopher Nolan"));
                        break;
                    case 'tenet':
                        reply(message, "Technically I've already seen this movie but at a time that never existed. I think. That's how it works right?\n\nAnyway here's the trailer: https://www.youtube.com/watch?v=L3pk_TBkihU");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Tenet"));
                        break;
                    case 'doctor-strange':
                        reply(message, "Dormammu, I've come to bargain!\nDormammu, I've come to bargain.\nDormammu, I've come to bargain!!!\nDormammu, I've come to\nDormammu, I've come to bargain!\nDormammu, I've come to barg\nI've come to bargain!\nDormammu\nDormammu, I've come to bargain!\nDormammu, I've come to bargain.\nDormammu, I've come to bargain!!!\nDormammu, I've come to\nDormammu, I've come to bargain!\nDormammu, I've come to barg\nI've come to bargain!\nDormammu\nEnd your assault on my world, and never come back. Do it and I'll break the loop!");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Doctor Strange"));
                        break;
                    case 'gta':
                    case 'gtav':
                    case 'gta-v':
                    case 'gta-5':
                    case 'gta-five':
                    case 'grand-theft-auto-five':
                    case 'grand-theft-auto-5':
                    case 'grand-theft-auto-v':
                        reply(message, "Why did I move here? I guess it was the weather ... https://www.youtube.com/watch?v=QkkoHAzjnUs");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Grand Theft Auto V"));
                        break;
                    case 'iron-man':
                    case 'ironman':
                        reply(message, "\"I am Iron Man!\" - Tony Stark\n\nRIP", {files: ["https://www.indiewire.com/wp-content/uploads/2019/04/Screen-Shot-2019-04-12-at-4.58.18-PM.png", "https://cnet1.cbsistatic.com/img/f-2nBLV4v4yj5OO-U_Qe4DdqTVM=/940x0/2019/09/16/28d2e318-799e-4e1e-ad42-812444d5ae49/iron-man-downey-jr-a-l.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Iron Man"));
                        break;
                    case 'joker':
                        var JokerQuotes = ["Is It Just Me Or Is It Getting Crazier Out There?", "For my whole life, I didn't know if I even really existed. But I do, and people are starting to notice.", "I Used To Think My Life Was A Tragedy, but now I realize, it's a comedy", "When you bring me out, can you introduce me as Joker?", "Have you seen what it's like out there? Everybody just yells and screams at each other. Nobody's civil anymore. Nobody thinks what it's like to be the other guy.", "My mother always tells me to smile and put on a happy face. She told me I had a purpose: to bring laughter and joy to the world."];
                        var TDKJokerQuotes = ["Why so serious?", '"Wanna know how I got these scars? My father was - a drinker. And a fiend. And one night he goes off crazier than usual. Mommy gets the kitchen knife to defend herself. He doesn’t like that. Not one bit. So—me watching—he takes the knife to her, laughing while he does it! Turns to me, and he says, “Why so serious, son?” Comes at me with the knife, “Why so serious?” He sticks the blade in my mouth, “Let’s put a smile on that face!”', 'Oh, you. You just couldn’t let me go, could you? This is what happens when an unstoppable force meets an immovable object. You are truly incorruptible, aren’t you? Huh? You won’t kill me out of some misplaced sense of self-righteousness. And I won’t kill you because you’re just too much fun. I think you and I are destined to do this forever.', "I believe, whatever doesn't kill you, simply makes you, stranger.", "Very poor choice of words.", "Come here. Hey! Look at me. So I had a wife, beautiful, like you, who tells me I worry too much. Who tells me I ought to smile more. Who gambles and gets in deep with the sharks. One day, they carve her face. And we have no money for surgeries. She can’t take it. I just want to see her smile again, hmm? I just want her to know that I don’t care about the scars. So, I stick a razor in my mouth and do this to myself. And you know what? She can’t stand the sight of me! She leaves. Now I see the funny side. Now I’m always smiling!", "To them, you're just a freak, like me! They need you right now, but when they don't, they'll cast you out, like a leper! You see, their morals, their code, it's a bad joke. Dropped at the first sign of trouble. They're only as good as the world allows them to be. I'll show you. When the chips are down, these, these civilized people, they'll eat each other. See, I'm not a monster. I'm just ahead of the curve.", "Do I really look like a guy with a plan? You know what I am? I'm a dog chasing cars. I wouldn't know what to do with one if I caught it! You know, I just DO things.", "It's not about money, it’s about sending a message. Everything burns!", "As you know, madness is like gravity, all it takes is a little push.", "Nobody panics when things go “according to plan.” Even if the plan is horrifying!", "They Laugh At me Because I'm Different. I laugh At Them Because The're all the same", "The only sensible way to live in this world is without rules."];

                        var rand = Math.floor(Math.random() * (JokerQuotes.length + TDKJokerQuotes.length));

                        if (rand < JokerQuotes.length) {
                            rand = Math.floor(Math.random() * JokerQuotes.length);

                            reply(message, JokerQuotes[rand], {files : ["https://www.indiewire.com/wp-content/uploads/2019/07/joker_03.jpg"]});
                        } else {
                            rand = Math.floor(Math.random() * TDKJokerQuotes.length);

                            reply(message, TDKJokerQuotes[rand], {files : ["https://24.media.tumblr.com/tumblr_m8ejka5tD41r0yq4zo1_500.jpg"]});
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Joker"));
                        break;
                    case 'tdk':
                    case 'the-dark-knight':
                    case 'dark-knight':
                        reply(message, "One of my favorite movies. Here's one of the many amazing scenes: https://www.youtube.com/watch?v=_ChPTKPzB4I");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("The Dark Knight"));
                        break;
                    case 'tdkr':
                    case 'dark-knight-rises':
                    case 'the-dark-knight-rises':
                        reply(message, "Also an amazing movie. Bane proved the Joker right (in a fictional world). The Joker said \"I'll show you. When the chips are down, these... these civilized people, they'll eat each other.\" Take a look: https://youtu.be/clZ5pdrc_X8");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("The Dark Knight Rises"));
                        break;
                    case 'interstellar':
                        reply(message, "Really cool and thought provoking sci-fy/survival movie. Here's a cool clip without spoiling too much: https://www.youtube.com/watch?v=6BKXGx2IMmk");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Interstellar"));
                        break;
                    case '42':
                        reply(message, "The meaning of life the universe and everything! (So long and thanks for all the fish!)");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("42"));
                        break;
                    case 'life-the-universe-and-everything':
                        reply(message, "42");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Life the Universe and Everything"));
                        break;
                    case 'life':
                        reply(message, "“Nobody is gonna hit as hard as life, but it ain’t how hard you can hit. It’s how hard you can get hit and keep moving forward. It’s how much you can take, and keep moving forward. That’s how winning is done.” - Rocky Balboa");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Life"));
                        break;
                    case 'nimble':
                        if (message.author.id == 'xxxxxxxxxxxxxxxx' || (message.author.id == alexId && message.mentions.members != null && message.mentions.members.size > 0 && message.mentions.members.entries().next().value[1].user.id == 'xxxxxxxxxxxxxxxx')) {
                            reply(message, "We ain't friends no more. Don't talk to me!");
                        } else {
                            reply(message, "Aww so cute!", {files: ["https://i.postimg.cc/jd1jQWBY/561-C8-E15-0-A55-4-AF3-99-A2-0-EE2-A4786370-1-105-c.jpg", "https://i.postimg.cc/1RnRRRfW/068-BDB22-1-CD8-4674-B9-BD-09-A3-D5-C9-F0-DE-1-105-c.jpg"]});
                            updateEasterEgg(message, easterEggsInOrder.indexOf("Nimble"));
                        }
                        break;
                    case 'dog':
                        reply(message, "Aren't dogs just the best! And Nimble is the best dog!", {files: ["https://i.postimg.cc/RF4fNPDx/IMG-1761-2.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Dog"));
                        break;
                    case 'dogs':
                        reply(message, "Aren't dogs just the best!", {files: ["https://i.postimg.cc/02QYYB28/IMG-1330.jpg", "https://i.postimg.cc/KYLrK3cB/IMG-1773.jpg", "https://i.postimg.cc/rFn97LY0/IMG-1747.jpg", "https://i.postimg.cc/vBFhXL20/IMG-1951-2.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Dogs"));
                        break;
                    case 'sunrise':
                        var sunrises = ["https://i.postimg.cc/tgsbjy5s/IMG-4199.jpg", "https://i.postimg.cc/0js1DSqS/IMG-4208.jpg", "https://i.postimg.cc/tg8jRfS2/IMG-4209.jpg", "https://i.postimg.cc/4dtTY5jZ/IMG-4211.jpg", "https://i.postimg.cc/bYB52MQh/IMG-4200.jpg", "https://i.postimg.cc/bYxh8mQ9/IMG-4216.jpg", "https://i.postimg.cc/VvWQRNYV/IMG-4221.jpg"];
                        
                        var oldDate = new Date("03/08/2020");
                        var nowDate = new Date();
                        var differenceInDays = Math.floor((nowDate.getTime() - oldDate.getTime()) / (1000 * 3600 * 24));

                        reply(message, "A Beatiful Good Morning:", {files: [sunrises[differenceInDays % sunrises.length]]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Sunrise"));
                        break;
                    case 'sunset':
                        var sunsets = ["https://i.postimg.cc/vmhYQ3RK/IMG-4162.jpg", "https://i.postimg.cc/V6NY5nmk/IMG-4182.jpg", "https://i.postimg.cc/PxFdDJ5z/IMG-4187.jpg", "https://i.postimg.cc/KjkxDbKX/IMG-4194.jpg", "https://i.postimg.cc/5N4mytFk/IMG-4214.jpg", "https://i.postimg.cc/gk1r5Sdq/IMG-4236.jpg"];
                        
                        var oldDate = new Date("03/08/2020");
                        var nowDate = new Date();
                        var differenceInDays = Math.floor((nowDate.getTime() - oldDate.getTime()) / (1000 * 3600 * 24));
                        
                        reply(message, "A Beatiful Good Night:", {files: [sunsets[differenceInDays % sunsets.length]]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Sunset"));
                        break;
                    case 'margaret':
                    case 'margaret-kempe':
                    case 'margaret-k':
                        reply(message, "Do you mean GOD?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Margaret"));
                        break;
                    case 'god':
                        reply(message, "Do you mean Margaret?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("God"));
                        break;
                    case 'natalie':
                    case 'ash':
                        message.channel.send("I know you like watching Jojo. However, I like a different type of Jojo. Here's both:\nAsh - Jojo's Bizarre Adventure: https://www.youtube.com/watch?v=fvSKmPdD2a4 - \nMe - Jojo Rabbit: https://www.youtube.com/watch?v=tL4McUzXfFI");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Ash"));
                        break;
                    case 'zach-f':
                    case 'zach-feldman':
                    case 'zach-1.1':
                        message.channel.send({content : "Boring:"/*"Hello the worst friend betrayer."*//*person with discord nitro!"*/, files : ["https://i.postimg.cc/yxT6cvJ3/IMG-0345.png"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Zach F"));
                        break;
                    case 'margaret\'s-assistant':
                        message.channel.send(/*"This position is being reviewed and possibly reassigned because of the old member being a horrific friend betrayer. Please wait until the review is over"*/"What can I help you help Margaret with Zach F.?"/*"What's your name again? Sorry, I had short term memory loss. It's z-z-z-zack right? Hi Zack Friedman!"*/);
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Margaret's Assistant"));
                        break;
                    case 'zach-s':
                    case 'zach-siegel':
                    case 'zach':
                        message.channel.send({content: "Zachary Siegel, Stop Flashing People!", files : ["https://i.postimg.cc/y89B8yMX/IMG-1864.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Zach S"));
                        break;
                    case 'ephram-c':
                    case 'ephram-cukier':
                    case 'ephram':
                        reply(message, "Ephram must teach us his ways: ", {files : ["https://i.postimg.cc/mDJW4dLs/Image-from-i-OS-19-2.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Ephram"));
                        break;
                    case 'ben-mask':
                        reply(message, "What's this? Ben? Is everything alright? I hope so.", {files: ["https://i.postimg.cc/gJVSrNdR/ezgif-7-339f5fde2bb8.gif"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Ben Mask"));
                        break;
                    case 'ben':
                    case 'ben-s':
                    case 'ben-stanley':
                        reply(message, "Now that's how you work as a team!", {files: ["https://i.postimg.cc/L8xx1nrC/ezgif-7-4e04ee6bd6da.gif"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Ben"));
                        break;
                    case 'adam':
                        reply(message, "Hello my fellow SR 71! ✈︎");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Adam"));
                        break;
                    case 'grant-i':
                    case 'grant':
                    case 'grant-ishibashi':
                        reply(message, "Hello my fellow psychopath!", {files: ['https://i.postimg.cc/7Z1pN1QJ/Screen-Shot-2020-03-17-at-10-48-03-PM.png']});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Grant"));
                        break;
                    case 'david':
                    case 'christ':
                    case 'david-christ':
                        reply(message, "All Hail David Christ!", { files : ["https://i.postimg.cc/bNmp5vQk/IMG-20190925-155446-1.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("David Christ"));
                        break;
                    case 'peter':
                        //reply(message, "How's cooking going? We're missing you!");
                        var nicePhotos = ['https://media.discordapp.net/attachments/xxxxxxxxxxxxxxxx/xxxxxxxxxxxxxxxxx/PXL_20220807_234639539.jpg?width=1744&height=1313', 'https://media.discordapp.net/attachments/xxxxxxxxxxxxxxxx/xxxxxxxxxxxxxxxxx/PXL_20220807_222440025.jpg?width=1744&height=1313', 'https://media.discordapp.net/attachments/xxxxxxxxxxxxxxxx/xxxxxxxxxxxxxxxxx/PXL_20220807_173026034.RESTORED.jpg', 'https://media.discordapp.net/attachments/xxxxxxxxxxxxxxxx/xxxxxxxxxxxxxxxxx/PXL_20220807_234639539.jpg?width=1744&height=1313', 'https://media.discordapp.net/attachments/xxxxxxxxxxxxxxxx/xxxxxxxxxxxxxxxxx/PXL_20220808_180409808.jpg'];
                        var rand = Math.floor(Math.random() * nicePhotos.length);

                        reply(message, "", {content: "Woah!", files : [nicePhotos[rand]]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Peter"));
                        break;
                    case 'utku':
                        reply(message, "Congrats, you made it into the yearbook!", { files : ["https://media.discordapp.net/attachments/xxxxxxxxxxxxxxxx/987476498065805322/IMG_1271.jpg?width=1752&height=1314"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Utku"));
                        break;
                    case 'mcd':
                    case 'mr-mcdonald':
                    case 'mcdonald':
                        var rand = Math.floor(Math.random() * 3);

                        if (rand == 0) {
                            reply(message, "Not gonna get myself in more trouble so here's the rules:", { files : ["https://www.firstinspires.org/sites/default/files/uploads/resource_library/ftc/game-manual-part-1-traditional-events.pdf"]});
                        } else {
                            reply(message, "I promise we're doing our work, just don't look down below: \nhttps://www.youtube.com/watch?v=o5koCe2SR6U");
                        }
                        reply(message, "", { files : "https://cdn.discordapp.com/attachments/xxxxxxxxxxxxxxxx/983081439996297226/IMG_2120.mov"});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Mcd"));
                        break;
                    case 'max':
                    case 'max-a':
                        var rand = Math.floor(Math.random() * 2);

                        if (rand == 0) {
                            var str = "█   █  ███  █   █\n██ ██ █   █  █ █\n█ █ █ █████   █\n█   █ █   █  █ █\n█   █ █   █ █   █";
                            // █   █  ███  █   █ 
                            // ██ ██ █   █  █ █  
                            // █ █ █ █████   █   
                            // █   █ █   █  █ █  
                            // █   █ █   █ █   █
                            str = str.replaceAll("█", "<:mx:xxxxxxxxxxxxxxxxx>");
                            str = str.replaceAll(" ", "      ");
                            console.log(str);
                            reply(message, str);
                        } else {
                            reply(message, "", { files : ["https://cdn.discordapp.com/attachments/xxxxxxxxxxxxxxxx/983081439996297226/IMG_2120.mov"]});
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Max"));
                        break;
                    case 'mira':
                    case 'mira-s':
                        var cactiPhotos = ['https://debraleebaldwin.com/wp-content/uploads/Golden-barrels-trichocereus-backlit-at-Desert-Theater.jpg', 'https://www.gardeningknowhow.com/wp-content/uploads/2020/11/cactus-garden.jpg', 'https://cdn.britannica.com/08/100608-050-684264CB/Saguaro-cactus-Arizona.jpg', 'https://thumbs.dreamstime.com/b/green-cactus-family-cactaceae-green-cactus-family-cactaceae-roots-153456025.jpg', 'https://cdn.shopify.com/s/files/1/0789/1541/files/IMG_0393_3_480x480.jpg?v=1626117496', 'https://news.cgtn.com/news/3d3d514e7967544d32457a6333566d54/img/3ae4b44a737641a18191bcb9e9d6db98/3ae4b44a737641a18191bcb9e9d6db98.jpg', 'https://desertmuseum.files.wordpress.com/2021/04/saguarolandscape_dulceylima.jpg?w=1024'];
                        var rand = Math.floor(Math.random() * cactiPhotos.length);

                        reply(message, "", {files : [cactiPhotos[rand]]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Mira"));
                        break; 
                    case 'courtney':
                        reply(message, "PIXAR! COCO! WALL-E! KITBULL! PIXAR! JUST AMAZING!", {files: ["https://thumbs.gfycat.com/UnlinedBriskKarakul-mobile.mp4"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Courtney"));
                        break;
                    case 'anime':
                        reply(message, "", {files: ["https://ci.memecdn.com/2054423.gif"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Anime"));
                        break;
                    case 'beating-snake':
                        reply(message, "STOP! Pls Stop. Fine once more, but then you'll stop right? Oh. No! It was stolen. Wait no more beating right? Yay!", {files: ['https://i.postimg.cc/XJ0LrgbG/IMG-2634.jpg']});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Beating Snake"));
                        break;
                    case 'stab':
                        message.channel.send('Can you do it, <@xxxxxxxxxxxxxxxx>?');
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Stab"));
                        break;
                    case 'terminate':
                        replyWithReturn(message, "Terminating My Programs\nIn:\n3\n.\n.\n.")
                            .then(messg => {
                                setTimeout(() => { 
                                    message.channel.send("2\n.\n.\n.")
                                        .then(m => {
                                            setTimeout(() => { 
                                                message.channel.send("1\n.\n.\n.")
                                                    .then(m2 => {
                                                        setTimeout(() => { 
                                                            if (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member)) {
                                                                var num = Number(args[0]);

                                                                terminatedId[message.guild.id] = message.author.id;

                                                                if (num == undefined || isNaN(num)) {
                                                                    terminated[message.guild.id] = 3;
                                                                } else {
                                                                    terminated[message.guild.id] = num;
                                                                }

                                                                console.log("ACTUALLY TERMINATED: For " + terminated[message.guild.id] + "Messages by" + terminatedId[message.guild.id]);
                                                                message.channel.send({content: "Programs Terminated :(", files : ['https://i.imgur.com/FM3I34e.gif']});
                                                            } else {
                                                                message.channel.send({content: "Programs Fake Terminated", files : ['https://i.imgur.com/FM3I34e.gif']});
                                                            }
                                                        }, 700);
                                                    })
                                            }, 700);
                                        })
                                }, 700);
                            });
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Terminate"));
                        break;
                    case 'unterminate':
                    case 'un-terminate':
                        message.channel.send({files : ["https://cdn.windowsreport.com/wp-content/uploads/2022/02/This-app-cant-run-on-your-PC-1200x675.png"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Unterminate"));
                        break;
                    case 'self-destruct':
                        replyWithReturn(message, "No Pls don't kill me. Pls Pls", {files : ['https://media1.tenor.com/images/b8fdaeb8daa00d0deab93817b5229e98/tenor.gif', 'https://i.postimg.cc/ht6fjZ7j/Defiant-Animated-Gelding-small.gif']})
                            .then(messg => {
                                setTimeout(() => { 
                                    if (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member)) {
                                        var num = Number(args[0]);

                                        terminatedId[message.guild.id] = message.author.id;

                                        if (num == undefined || isNaN(num)) {
                                            terminated[message.guild.id] = 1;
                                        } else {
                                            terminated[message.guild.id] = num;
                                        }
                                        console.log("ACTUALLY TERMINATED: For " + terminated[message.guild.id] + "Messages by" + terminatedId[message.guild.id]);
                                        message.channel.send({content: "Self-Destruction Initiated!", files : ['https://media0.giphy.com/media/DdOsXVHKpwL96/source.gif']});
                                    } else {
                                        console.log("NOT ACTUALLY TERMINATED");
                                        message.channel.send({content: "Fake Self-Destruct Complete!", files : ['https://media0.giphy.com/media/DdOsXVHKpwL96/source.gif']});
                                    }
                                }, 11000);
                            })
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Self Destruct"));
                        break;
                    case 'big-red-button':
                        message.channel.send({ files : ['https://media1.tenor.com/images/ea8c7236a412c068848755b370b78db3/tenor.gif']});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Big Red Button"));
                        break;
                    case 'red-button':
                        message.channel.send({ files : ['https://media.giphy.com/media/hDSy8w6rGHeTe/giphy.gif']});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Red Button"));
                        break;
                    case 'spaceballs-destruct':
                    case 'spaceball1-destruct':
                    case 'spaceball-one-destruct':
                    case 'spaceball-1-destruct':
                    case 'spaceballs-self-destruct':
                    case 'spaceball1-self-destruct':
                    case 'spaceball-one-self-destruct':
                    case 'spaceball-1-self-destruct':
                        reply(message, "10, 9, 8, 6, Just Kidding, 7, 6, 5, 4, 3, 2, 1 Have a nice day! \nhttps://www.youtube.com/watch?v=EfkNvOOiZ_8");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Spaceballs Self Destruct"));
                        break;
                    case 'rocky':
                    case 'rocky-balboa':
                    case 'the-italian-stallion':
                    case 'italian-stallion':
                        reply(message, "Awesome movie. Best part is this scene: https://www.youtube.com/watch?v=_YYmfM2TfUA");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Rocky"));
                        break;
                    case 'jojo':
                    case 'jojo-rabbit':
                        reply(message, "How can something so wrong foundationally be so good? Jojo Rabbit: https://www.youtube.com/watch?v=tL4McUzXfFI");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Jojo Rabbit"));
                        break;
                    case 'terminator':
                    case 'terminator-2':
                    case 'judgement-day':
                    case 'terminator-2-judgement-day':
                        reply(message, "Asta la vista Baby. I'll be back. https://www.youtube.com/watch?v=lwSysg9o7wE");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Terminator 2 Judgement Day"));
                        break;
                    case 'matrix':
                        reply(message, "Are we living in the matrix? Am I the chosen one? 👾 Here's a trailer: https://www.youtube.com/watch?v=m8e-FF8MsqU", {files : ['https://media0.giphy.com/media/nb0WMP3t6Fg8o/giphy.gif?cid=ecf05e4798a1a77d91864c900f8a66159b2a800b6c0ff0b2&rid=giphy.gif']});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Matrix"));
                        break;
                    case 'godfather':
                        reply(message, "One of the best movies of all time. You shouldn't need a trailer because this movie is sooo good, but here's one anyway (Not nearly as good as the movie): https://www.youtube.com/watch?v=sY1S34973zA");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Godfather"));
                        break;
                    case 'patton':
                        reply(message, "My favorite war movie. https://www.youtube.com/watch?v=a59n_hk2F6w");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Patton"));
                        break;
                    case 'hot-fuzz':
                        reply(message, "Did you know the city with the lowest crime rate, has the highest accident rate? Weird right? https://www.youtube.com/watch?v=KOddZELDPmk");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Hot Fuzz"));
                        break;
                    case 'baby-driver':
                        reply(message, "Amazing movie, and they really did a great job with the music in this movie. https://www.youtube.com/watch?v=zTvJJnoWIPk");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Baby Driver"));
                        break;
                    case 'space-force':
                        reply(message, "Looks like it's going to be a funny show! It stars Steve Carell and it's coming May 29th! \nNetflix Page: https://www.netflix.com/title/81021929\nTrailer: https://www.youtube.com/watch?v=bdpYpulGCKc");
                        reply(message, "Oh, sorry u meant the actual space force. Here you go: https://www.spaceforce.mil");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Space Force"));
                        break;
                    case 'nasa':
                        reply(message, "Here's NASA's website. So many awesome things to check out: https://www.nasa.gov");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("NASA"));
                        break;
                    case 'aviation':
                    case 'fly':
                    case 'flying':
                        reply(message, "Fly now: https://www.geo-fs.com");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Aviation"));
                        break;
                    case 'apollo-13':
                        reply(message, "Apollo 13, did fail it's mission, but the engineering work to being those astronauts home is extraordinary. Here's Apollo 13 - The movie (staring Tom Hanks): https://www.youtube.com/watch?v=KtEIMC58sZo");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Apollo 13"));
                        break;
                    case 'apollo-11':
                    case 'moon':
                        reply(message, "Apollo 11, truely amazing moment for this country. Here's the moment Neil Armstrong stepped on the moon: https://www.youtube.com/watch?v=gg5Ncc9GODY. Here's an awesome documentary on Apollo 11: https://apollo11firststeps.com");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Apollo 11"));
                        break;
                    case 'for-all-mankind':
                        reply(message, "Cool TV Show about what could have happened if the Soviets beat us to the moon. And it's temporarily free to watch. https://tv.apple.com/us/show/for-all-mankind/umc.cmc.6wsi780sz5tdbqcf11k76mkp7");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("For All Mankind"));
                        break;
                    case 'avatar':
                        reply(message, "Wow. How did this movie earn this much money. It doesn't make sense. https://www.boxofficemojo.com/chart/top_lifetime_gross/?area=XWW");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Avatar"));
                        break;
                    case 'die':
                    case 'kill':
                        reply(message, "Please no. Don't kill anyone. Come on, this is supposed to be a friendly server!");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Die"));
                        break;
                    case 'gordon':
                    case 'ramsay':
                    case 'gordon-ramsay':
                        reply(message, "Gordon Ramsay is an amazing chef, and a lot of other things. I think this covers it: ", {files : ["https://s3.scoopwhoop.com/anj/ramsayy/83497810.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Gordon Ramsay"));
                        break;
                    case 'clap':
                        reply(message, "👏");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Clap"));
                        break;
                    case 'hug':
                        reply(message, "🤗");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("What"));
                        break;
                    case 'what':
                        reply(message, "What?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Who"));
                        break;
                    case 'who':
                        reply(message, "Who?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("When"));
                        break;
                    case 'when':
                        reply(message, "When?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Where"));
                        break;
                    case 'where':
                        reply(message, "Where?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Why"));
                        break;
                    case 'why':
                        reply(message, "Why?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("How"));
                        break;
                    case 'how':
                        reply(message, "How?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Bot"));
                        break;
                    case 'bot':
                        if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                            reply(message, "My name is: " + (message.channel.members.get(botId).nickname != null ? message.channel.members.get(botId).nickname : message.channel.members.get(botId).user.username) + ".");
                        } else {
                            reply(message, "My name is: " + client.user.username + ".");
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Climate Change"));
                        break;
                    case 'global-warming':
                    case 'climate-change':
                        reply(message, "The biggest crisis our generation will face in the future. For some general info: https://climate.nasa.gov");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Autopilot"));
                        break;
                    case 'autopilot':
                        reply(message, "Check out Tesla's Autonomy day: https://youtu.be/Ucp0TTmvqOE?t=4171. \nFull Self Driving: https://www.youtube.com/watch?v=tlThdr3O5Qo");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Linear Slides"));
                        break;
                    case 'linear-slides':
                    case 'linear-slide':
                        reply(message, "Not working again wow. I thought we were going to be done in 2 weeks. It's been 3 months. :(. We'll at least we have spaceballs");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Taps"));
                        break;
                    case 'taps':
                        reply(message, "You broke another tap! Well I guess onto tap #42");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Curse"));
                        break;
                    case 'curse':
                    case 'swear':
                        reply(message, "\\*\\*\\*\\* NO! No more of this! This is a resectful server!");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("F**k You"));
                        break;
                    case 'fuck':
                    case 'fuck-you':
                    case 'f-u':
                    case 'fu':
                    case 'fuck-u':
                    case 'f-you':
                        reply(message, "As this is a respectful sever (cut it out), I can't show you the song I'd like to show you, but here's a different one that has the same name when it's explicit (which this version isnt): https://www.youtube.com/watch?v=bKxodgpyGec");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("F**k You"));
                        break;
                    case 'sgn-3':
                    case 'some-good-news-3':
                        reply(message, "It's time for Some Good News 3, https://www.youtube.com/watch?v=Eg08rJGKjtA");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Some Good News 3"));
                        break;
                    case 'baseball':
                        reply(message, "It's too bad the season has been pushed off. At least we have this: https://www.google.com/doodles/fourth-of-july-2019");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Baseball"));
                        break;
                    case 'basketball':
                        reply(message, "It's too bad the season has been pushed off. At least we have this: https://www.google.com/doodles/basketball-2012");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Basketball"));
                        break;
                    case 'superbowl':
                    case 'super-bowl':
                        reply(message, "That was an amazing comeback! Congrats Kansas City, Missouri! Also, did you see my friend Zach?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Superbowl"));
                        break;
                    case 'football':
                        reply(message, "America's most popular sport only has 16 games in a season. Baseball has ten times that at 162. Hm. America must hate sports then. ????");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Football"));
                        break;
                    case 'maker-faire':
                        reply(message, "I once presented at this event. It unfortunately went bankrupt a few years ago. Very dissapointing. :(");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Maker Faire"));
                        break;
                    case 'maglev':
                    case 'magnetic-levitating':
                        reply(message, "My favorite type of train. I even made a model of one. Here's a cool article: https://www.theguardian.com/world/2015/apr/21/japans-maglev-train-notches-up-new-world-speed-record-in-test-run");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Maglev"));
                        break;
                    case 'hyperloop':
                        reply(message, "An awesome new form of transportation. I'm hoping to work on one in college next year! Here's SpaceX's competition: https://www.spacex.com/hyperloop");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Hyperloop"));
                        break;
                    case 'megahat':
                    case 'mega-hat':
                        if (message.author.id == 'xxxxxxxxxxxxxxxx' || (message.author.id == alexId && message.mentions.members != null && message.mentions.members.size > 0 && message.mentions.members.entries().next().value[1].user.id == 'xxxxxxxxxxxxxxxx')) {
                            reply(message, "Megahat - Why Zach", {files: ["https://cdn.shopify.com/s/files/1/0249/9815/0196/products/mockup-db80297c_1200x1200.png?v=1580155818"]})
                            updateEasterEgg(message, easterEggsInOrder.indexOf("Megahat"));
                        } else {
                            reply(message, "Megahats", {files: ["https://i.postimg.cc/LX9wt2Rm/IMG-0223.jpg", "https://i.postimg.cc/tJfcG66g/Image-from-i-OS-18-2.jpg", "https://i.postimg.cc/xTvZ4XC9/IMG-1986.jpg", "https://i.postimg.cc/fWrWRgjV/Image-from-i-OS-20-2.jpg"]});
                            updateEasterEgg(message, easterEggsInOrder.indexOf("Megahat"));
                        }
                        break;
                    case 'hex':
                    case 'hexadecimal':
                        if (regArgs.length > 1) {
                            regArgs.shift();
                            reply(message, ascii_to_base(regArgs.join(" ").trim(), 16));
                        } else {
                            reply(message, ascii_to_base(regArgs[0].trim(), 16));
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Hexadecimal"));
                        break;
                    case 'octal':
                        if (regArgs.length > 1) {
                            regArgs.shift();
                            reply(message, ascii_to_base(regArgs.join(" ").trim(), 8));
                        } else {
                            reply(message, ascii_to_base(regArgs[0].trim(), 8));
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Octal"));
                        break;
                    case 'binary':
                        if (regArgs.length > 1) {
                            regArgs.shift();
                            reply(message, ascii_to_base(regArgs.join(" ").trim(), 2));
                        } else {
                            reply(message, ascii_to_base(regArgs[0].trim(), 2));
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Binary"));
                        break;
                    case 'byte':
                        reply(message, "00000001 hurts. 11111111 is 255 times worse. Don't byte pls.");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Byte"));
                        break;
                    case 'acdc':
                    case 'ac/dc':
                    case 'ac-dc':
                        reply(message, "Shoot to Thrill. You might remember it from a movie, but it came out way before it: https://www.youtube.com/watch?v=wLoWd2KyUro");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("AC/DC"));
                        break;
                    case 'led-zeppelin':
                        reply(message, "Immigrant Song, this is also in a movie you might recognize it from, but again this came out way before the movie: https://www.youtube.com/watch?v=y8OtzJtp-EM");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Led Zeppelin"));
                        break;
                    case 'lenerd-skynyrd':
                        reply(message, "Sweet Home Alabama. Not my home but here it is: https://www.youtube.com/watch?v=ye5BuYf8q4o");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Lenerd Skynyrd"));
                        break;
                    case 'american-pie':
                        reply(message, 'American Pie: https://www.youtube.com/watch?v=iX_TFkut1PM');
                        updateEasterEgg(message, easterEggsInOrder.indexOf("American Pie"));
                        break;
                    case 'take-me-home-country-roads':
                    case 'country-roads':
                        reply(message, 'Country Roads: https://www.youtube.com/watch?v=1vrEljMfXYo');
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Country Roads"));
                        break;
                    case 'get-smart':
                        reply(message, "Highly recomend both the tv show and movie. Here's the movie trailer: https://www.youtube.com/watch?v=K9WNBO3szgQ");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Get Smart"));
                        break;
                    case 'fordvferarri':
                    case 'ford-v-ferarri':
                        reply(message, "I love these types of movies. Not entirely accurate but definitely a great watch: https://www.youtube.com/watch?v=I3h9Z89U9ZA");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Ford v Ferarri"));
                        break;
                    case 'teslavferarri':
                    case 'tesla-v-ferarri':
                        reply(message, "Ford's not the only one that can beat ferarri, well tesla can actually beat them both (don't forget this was 4 years ago, Tesla's ahve only gotten faster): https://www.youtube.com/watch?v=ysCpMlsZm0k");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Tesla v Ferarri"));
                        break;
                    case 'death':
                        reply(message, '"Death is what gives life meaning. To know your days are numbered. Your time is short." - The Ancient One (Doctor Strange)');
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Death"));
                        break;
                    case 'arrow':
                    case 'green-arrow':
                        reply(message, "Great show! My favorite seasons are 2 and 5! Definitely recomend watching!");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Arrow"));
                        break;
                    case 'flash':
                    case 'the-flash':
                        reply(message, "Another amazing show! Hwoever getting slightly worse every year in my optionion. Season 1 was fantastic though!");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Flash"));
                        break;
                    case 'justice-league':
                        reply(message, "We don't speak of that movie here. Not even the Snyder cut.");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Justice League"));
                        break;
                    case 'reboot':
                    case 'restart':
                        replyWithReturn(message, "Rebooting: ", {"files" : ["https://static.tumblr.com/439a4606156abed8c2d04944d4efd12f/zp2retr/tZ9opvgfy/tumblr_static_tumblr_static__640.gif"]})
                            .then(msg => {
                                if (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member)) {
                                    rebooting[message.guild.id] = true;
                                }
                                setTimeout(() => { 
                                    var x = Math.floor(Math.random() * 2);
                                    
                                    if (x == 0) {
                                        message.channel.send({files : ["https://pa1.narvii.com/6485/c5004dd06b4fb7c1abdb8dfbe2e80fda6ad69376_hq.gif", "https://pa1.narvii.com/6743/4c53ba0af19ad4867a9f4fa8df836f8cf9c7fa87_hq.gif"]})
                                            .then(msg2 => {
                                                setTimeout(() => { 
                                                    message.channel.send({files : ["https://cdn.dribbble.com/users/319377/screenshots/1883423/dynamic_status_update_icon_animation_2.gif"]})
                                                        .then(msg3 => {
                                                            setTimeout(() => { 
                                                                if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                                                                    rebooting[message.guild.id] = false;
                                                                }
                                                                if (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member)) {
                                                                    message.channel.send('Kinda Fake Reboot Complete!');
                                                                } else {
                                                                    message.channel.send('Fake Reboot Complete!');
                                                                }
                                                            }, 5000);
                                                        })
                                                }, 11000);
                                            })
                                    } else {
                                        message.channel.send({files : ["https://cdn.dribbble.com/users/319377/screenshots/1883423/dynamic_status_update_icon_animation_2.gif"]})
                                            .then(msg2 => {
                                                setTimeout(() => { 
                                                    if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                                                        rebooting[message.guild.id] = false;
                                                    }
                                                    if (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member)) {
                                                        message.channel.send('Kinda Fake Reboot Complete!');
                                                    } else {
                                                        message.channel.send('Fake Reboot Complete!');
                                                    }
                                                }, 5000);
                                            })
                                    }
                                }, 3500);
                            });
                            updateEasterEgg(message, easterEggsInOrder.indexOf("Reboot"));
                            break;
                    case 'actually-restart':
                    	actuallyRestart(message);
                    	break;
                    case 'reload-db-info':
                    case 'reload-database-info':
                        if (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member) || message.author.id == alexId) {
                            message.channel.send("Reloading Database Info...");
                            var errors = reloadDatabaseInfo();
                            var str = "Reloaded Database Info";
                            if (errors.length > 1) {
                                str += " But Faced Fatal Errors For: "
                                for (var i = 0; i < errors.length; i++) {
                                    if (errors.length - i == 1) {
                                        str.slice(0,-2);
                                        str += " and " + errors[i] + ". Please Try Again To Reload All Database Info Without Errors.";
                                    } else {
                                        str += errors[i] + ", ";
                                    }
                                }
                                message.channel.send(str);
                            } else if (errors.length > 0) {
                                str += errors[0] + ". Please Try Again To Reload All Database Info Without Errors.";
                                message.channel.send(str);
                            } else {
                                str += " With No Errors!";
                                message.channel.send(str);
                            }
                        }
                        break;
                    case 'pixar':
                        reply(message, "They make some of the best movies ever. I love Wall-E, Coco, Inside Out, Ratatouille, and so many more!");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Pixar"));
                        break;
                    case 'logan':
                        reply(message, "Another amazing movie. Great story. Here's the trailer: https://www.youtube.com/watch?v=Div0iP65aZo");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Logan"));
                        break;
                    case 'now-you-see-me':
                        reply(message, "Cool Movie. Not an amazing story, it's just cool. Here's the trailer: https://www.youtube.com/watch?v=4OtM9j2lcUA");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Now You See Me"));
                        break;
                    case 'pink-panther':
                        reply(message, "Really funny series. Inspector Clouseau is the best! Just remember it's form the early 60s. https://www.youtube.com/watch?v=BwA_ar7_qUw");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Pink Panther"));
                        break;
                    case 'mission-impossible':
                        reply(message, "Some amazing music. Here you go: https://www.youtube.com/watch?v=FCO95esUzBw");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Mission Impossible"));
                        break;
                    case 'mi6':
                    case 'mi-6':
                        reply(message, "So many MI6's. There's the one in James Bond and Mission Impossible 6. Idk which one to choose.");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("MI6"));
                        break;
                    case 'james-bond':
                    case 'bond':
                    case '007':
                        reply(message, "Loved Skyfall. Looking forward to No Time to Die: https://www.youtube.com/watch?v=BIhNsAtPbPI");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("James Bond"));
                        break;
                    case 'bond-james-bond':
                        reply(message, "The name is Bond. James Bond", {files : ["https://media.giphy.com/media/3oEjHNCWpx4iQYytAA/giphy.gif"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Bond James Bond"));
                        break;
                    case 'ww84':
                    case 'wonder-woman-1984':
                        reply(message, "Trailer was good. Hope the movie is just as good: https://www.youtube.com/watch?v=sfM7_JLk-84");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Wonder Woman 1984"));
                        break;
                    case 'robot-dance':
                    case 'spot-dance':
                    case 'boston-dynamics':
                        reply(message, "Nice dance! https://www.youtube.com/watch?v=kHBcVlqpvZ8");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Robot Dance"));
                        break;
                    case 'silicon-valley':
                        reply(message, "Awesome TV show that reminded me of robotics. Check it out: https://www.youtube.com/watch?v=Vm4tx1O9GAc");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Silicon Valley"));
                        break;
                    case 'cyberpunk-2077':
                    case 'cyberpunk':
                    case '2077':
                    case 'cyberpunk2077':
                        reply(message, "A game I'm excited for! It's coming from CDProjektRed, the developers of The Witcher Game Series. https://www.cyberpunk.net/us/en/");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Cyberpunk 2077"));
                        break;
                    case 'reeves':
                    case 'keanu':
                    case 'keanu-reeves':
                        reply(message, "The legend, Keanu Reeves", {files : ['https://media1.tenor.com/images/beccd62a9db74b0519ba911882cabd65/tenor.gif']});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Keanu Reeves"));
                        break;
                    case 'avengers-game':
                        reply(message, "A game I'm hoping will be very good! https://avengers.square-enix-games.com/en-us/?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Avengers Game"));
                        break;
                    case 'nms':
                    case 'no-mans-sky':
                        reply(message, "After coming back from possibly one of the worst launches in video game history, this games expanding universe continues to become more and more fascinating to explore: https://www.nomanssky.com");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("No Mans Sky"));
                        break;
                    case 'rdr2-quotes':
                    case 'rdr-2-quotes':
                    case 'red-dead-redemtion-2-quotes':
                    case 'red-dead-2-quotes':
                        var RDR2Quotes = ['You’re the only feller who got half their brain eaten by wolves and ended up more intelligent.', 'I always wondered if I was unlucky, but maybe I’m just not very good.', 'And forgive me if I slip and stab you in the face.', 'I wish I had acquired wisdom at less of a price.', 'I believe there’s winner and losers… and nothing else besides.', 'We’re thieves in a world that don’t want us anymore.', 'Be loyal to what matters.', "This place...ain't no such thing as civilized. It's men so in love with greed it has forgotten himself and found only appetites.", "Maybe when your mother's finished mourning your father...I'll keep her in black. On your behalf.", /*"I gave you all I had.",*/ "As long as we get paid or you get shot I'm happy!", "We just need some money!", "I wish things were different. But it weren't us who changed!", "This Place… Ain't No Such Thing As Civilized", "You Have Got To Keep Faith", "There Ain't No Freedom For No One In This Country No More", "Listen to me. We don't want to kill any of you, but trust me we will. Wake them up a little.", "Stay Strong! Stay With Me!", "We are going to borrow a little money from old Uncle Sam and be out of his hair once and for all!", "How about you and me go and redistribute some property?"];
                        rand = Math.floor(Math.random() * RDR2Quotes.length);

                        reply(message, RDR2Quotes[rand], {files : ["https://i1.wp.com/thegamefanatics.com/wp-content/uploads/2018/10/sun.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("RDR 2 Quotes"));
                        break;
                    case 'thanos-quotes':
                        var ThanosQuotes = ["You're strong, but I could snap my fingers and you'd all cease to exist.", "Fun isn't something one considers when balancing the universe. But this... does put a smile on my face.", "Perfectly balanced, as all things should be.", "You have my respect, Stark. When I'm done, half of humanity will still be alive. I hope they remember you.", "You're not the only one cursed with knowledge.", "I know what it's like to lose. To feel so desperately that you're right, yet to fail nonetheless. It's frightening, turns the legs to jelly. I ask you to what end? Dread it. Run from it. Destiny arrives all the same. And now it's here. Or should I say, I am.", "You were going to bed hungry, scrounging for scraps. Your planet was on the brink of collapse. I'm the one who stopped that. You know what's happened since then? The children born have known nothing but full bellies and clear skies. It's a paradise.", "Everything", "The hardest choices require the strongest wills.", "I thought that by eliminating half of life, the other half would thrive", "I am inevitable!", "I'm a survivor.", "You should have gone for the head", "You could not live with your own failure, and where did that bring you? Back to me.", "It's a simple calculus. This universe is finite, its resources, finite. If life is left unchecked, life will cease to exist."];
                        rand = Math.floor(Math.random() * ThanosQuotes.length);

                        reply(message, ThanosQuotes[rand], {files : ["https://filmschoolrejects.com/wp-content/uploads/2019/04/Thanos-Smile-2-1280x720.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Thanos Quotes"));
                        break;
                    case 'arthur-morgan-quotes':
                        var ArthurQuotes = ["We’re Thieves, In A World That Don’t Want Us No More", "We Can’t Change What's Done, We Can Only Move On", "Just Do One Thing Or The Other, Don’t Try To Be Two People At Once", "We’re More Ghosts Than People", "Vengeance Is An Idiot’s Game", "Be Loyal To What Matters", /*"We Ain't Both Gonna Make It", "I Gave You All I Had", "John made it, he’s the only one."*/, "You're My Favorite Parasite... No, Wait, Ringworm's My Favorite Parasite, You're My Second-Favorite Parasite... I Lied. Ringworm, Then, Rats With The Plague, Then You.", "Five Thousand Dollars? Can I Turn Myself In?", "Look, I'm Sorry, Friend. I Can Barely Speak English.", "I Do My Utmost To Avoid You.", "Forgive Me If I Slip And Stab You In The Face.", "You’re the only feller who got half their brain eaten by wolves and ended up more intelligent. Next Time, let the wolves eat all your brain... then you'll be a genius.", 'I always wondered if I was unlucky, but maybe I’m just not very good.', "Maybe when your mother's finished mourning your father...I'll keep her in black. On your behalf.", "As long as we get paid or you get shot I'm happy!", "I wish things were different. But it weren't us who changed!"];
                        rand = Math.floor(Math.random() * ArthurQuotes.length);

                        reply(message, ArthurQuotes[rand], {files : ["https://www.vgr.com/wp-content/uploads/2018/05/rdr2-trailer3-screen3-1160x520.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Arthur Morgan Quotes"));
                        break;
                    case 'dutch-quotes':
                    case 'dutch-van-der-linde-quotes':
                        var DutchQuotes = ["I had a goddamn PLAN!", "Have some goddamn FAITH!", "You can't fight nature, captain. You can't fight change. You can't fight... gravity!", "I Ain't Got Too Much To Say No More", "This Place… Ain't No Such Thing As Civilized", "You Have Got To Keep Faith", "The Game Ain't Over... I Ain't Played My Final Move", "I Will Keep Trying, And You'll Keep Doubting Me, And We’ll Keep Failing", "There Ain't No Freedom For No One In This Country No More", "We Rob Uncle Sam, And We Leave. The Poetry Of It All", "Listen to me. We don't want to kill any of you, but trust me we will. Wake them up a little.", "Stay Strong! Stay With Me!", "We are going to borrow a little money from old Uncle Sam and be out of his hair once and for all!",];
                        rand = Math.floor(Math.random() * DutchQuotes.length);

                        reply(message, DutchQuotes[rand], {files : ["https://cdn.collider.com/wp-content/uploads/2018/09/red-dead-redemption-2.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Dutch Van Der Linde Quotes"));
                        break;
                    case 'rick-and-morty':
                        reply(message, "Awesome tv show. So weird but cool. Who knew there was a Tuskla? Check it out!");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Rick and Morty"));
                        break;
                    case 'family-guy':
                        reply(message, "Very very funny. Definitely some dirty humor but very very funny. Plus I think they beat netflix to Tiger King", {files: ["https://media0.giphy.com/media/l1J9FhrHkLByjwHYs/source.gif"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Family Guy"));
                        break;
                    case 'ted':
                        reply(message, "Made by the creator of Family Guy, Seth MacFarlane. So funny! WARNING: A lot of profanity though. Trailer: https://www.youtube.com/watch?v=9fbo_pQvU7M");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Ted"));
                        break;
                    case 'the-boys':
                    case 'theboys':
                    case 'boys':
                    	reply(message, "Gory, Funny, and Batsh*t Crazy. Literally probably the craziest show I've ever watched but it's Thanos level good. While your parents may or more likely may not want you to watch this, if you can handle adult content, it's sooooo good. The boys is about what would happen if Superheroes actually were as crappy as regular people. Now that's f**king diabolical! So what are you waiting for, watch it! NOW! DOO IT! It's on amazon prime video. Still not convinced. Fine. Ok, the marketing campaign was really bad so here's a review of season 1 by Jeremy Jahns (for the most part no spoilers): https://www.youtube.com/watch?v=FTto9XPC5JM");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("The Boys"));
                        break;
                    case 'gta-quotes':
                    case 'gtav-quotes':
                    case 'gta-v-quotes':
                    case 'gta5-quotes':
                    case 'gta-5-quotes':
                    case 'gta-five-quotes':
                    case 'grand-theft-auto-quotes':
                    case 'grand-theft-auto-5-quotes':
                    case 'grand-theft-auto-v-quotes':
                    case 'grand-theft-auto-five-quotes':
                        var GTAQuotes = ["Why did I move here? I guess it was the weather. Or the... Ah, I don't know, that thing. That magic. You see it in the movies. I wanted to retire. From what I was doing, you know? From that, that... line of work. Be a good guy for once, a family man. So, I bought a big house. Came here, put my feet up, and thought I'd be a dad like all the other dads. My kids, would be like the kids on TV, we play ball and sit in the sun... But well, you know how it is.", "I'm rich, I'm miserable - I'm pretty average for this town.", "Ladies and gentlemen! This is your moment! Please don't make me ruin all the great work your plastic surgeons have been doing!", "You tell me exactly what you want, and I will very carefully explain to you why it cannot be.", "He's a good kid? A good kid? Why? Does he help the f***ing poor? No. He sits on his ass all day, smoking dope and jerking off while he plays that f***ing game. If that's our standard for goodness... then no wonder this country's screwed.", "You forget a thousand things every day, pal. Make sure this is one of 'em.", "Some of the government, some of it is pretty corrupt. ... es, but we're corrupt in a good way."];
                        rand = Math.floor(Math.random() * GTAQuotes.length);

                        reply(message, GTAQuotes[rand], {files : ["https://ae01.alicdn.com/kf/HTB1W6liKpXXXXcLXXXXq6xXFXXXo/New-Grand-Theft-Auto-GTA-5-V-poster-wall-art-oil-painting-on-canvas-home-decoration.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Grand Theft Auto V Quotes"));
                        break;
                    case 'xbox':
                    case 'series-x':
                    case 'seriesx':
                    case 'xbox-seriesx':
                    case 'xbox-series-x':
                        reply(message, "The P.C. looking console. Really fast and quite amazing for a console. But will it's SSD hold it back from revolutionizing games and their development? Can it load assets quick enough to act as slow ram? Or do devlopers still need to design around the memory contraint? Lot's of questions and that's just one small part of the box. However, I can say the games do look amazing. Here's the reveal trailer and the in engine trailer for Hellblade 2 on Xbox Series X (more excited about the graphics than the game!): \nhttps://www.youtube.com/watch?v=0tUqIHwHDEc\nhttps://www.youtube.com/watch?v=qJWI4bkD9ZM");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Xbox Series X"));
                        break;
                    case 'ps5':
                    case 'playstation':
                    case 'ps-5':
                    case 'playstation-5':
                    case 'playstation5':
                        reply(message, "What will it look like? A bit slower than the Xbox Series X but has a blazing fast SSD. 5.5GB/S. That's only 12 times slower than the Xbox One's DDR3 RAM. It's crazy we can compare the rate of an SSD to ram now. Wow. Anyway here's a tech talk from the PS5 Lead Architect Mark Cerny and the Unreal Engine 5 Tech Demo running on PS5: \nhttps://www.youtube.com/watch?v=ph8LyNIT9sg\nhttps://www.youtube.com/watch?v=qC5KtatMcUw");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Playstation 5"));
                        break;
                    case 'next-gen':
                    case 'next-generation':
                    case 'next-gen-consoles':
                    case 'next-generation-consoles':
                        reply(message, "Both the PS5 and the Xbox Series X seem amazing. From the footage we've gotten I would say it looks pretty real - even sometimes not distinguisable from cinematic quality. I think it's going to be an amazing generation fro both consoles. \nhttps://www.youtube.com/watch?v=qJWI4bkD9ZM\nhttps://www.youtube.com/watch?v=qC5KtatMcUw");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Next Gen Consoles"));
                        break;
                    case 'among-us':
                    case 'amongus':
                    	reply(message, "Such a fun game and free on mobile! So I made a similar game here. Use ` <optional @user> ... !imposter ` to guess an (or multiple) imposter(s). Each mention counts as a guess. Use ` <optional @user> ... !sus ` to have the bot say \"Vote <user>\". For either command, if you don't include a user, a random user will be chosen. Use ` !who-sus ` to see all the people you've guessed - this command includes imposter guesses even though they don't count for votes and always say that person guessed is not the imposter. You'll have approximately 1/4 of the number of people in the server guesses before you lose (it's a random number so it could be sooner or later, you'll never know). Use the ` !num-votes ` to see approximately how many votes you have left. If you're the imposter, you should try to trick everyone else. Just remember as an imposter your guesses won't count in the official vote tally but do count when using the ` !who's-sus ` command. In addition if you guess yourself as the imposter it will say you're **not** the imposter. Repeat guesses of the same person won't count unless if the imposter was the only other person to guess that person. Good luck and can one of you create a robot to eject the imposter?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Among Us"));
                        break;
                    case 'imposter':
                    	if (message.channel.isTextBased() && !message.channel.isDMBased()) {
	                    	var members = await message.guild.members.fetch();
	                    	if (amongUsImposterId[message.guild.id] == undefined) {
	                    		var id = await getRandomUserIdFromGuild(message);

	                    		amongUsImposterId[message.guild.id] = id;

	                    		members.get(id).createDM()
									.then(channel => {
										channel.send("You are the imposter!");
									})
									.catch(sendError);
	                    	}
	                    	if (message.mentions.members != null && message.mentions.members.size > 0) {
	                    		message.mentions.members.forEach(function (member, id) {
	                    			if (message.author.id == amongUsImposterId[message.guild.id]) {
		                    			if (!amongUsImposterGuessId[message.guild.id].includes(id)) {
			                    			amongUsImposterGuessId[message.guild.id].push(id);
			                    		}
		                    			message.channel.send("<@" + id + "> is Not the Imposter.");
		                    		} else if (id == amongUsImposterId[message.guild.id]) {
										message.channel.send("You won!\n\n<@" + id + "> was the Imposter.");
										members.get(amongUsImposterId[message.guild.id]).createDM()
											.then(channel => {
												channel.send("You are no longer the imposter.");
											})
											.catch(sendError);
										amongUsImposterId[message.guild.id] = undefined;
										amongUsImposterGuessId[message.guild.id] = [];
										amongUsImposterSusId[message.guild.id] = [];
										amongUsGuessNum[message.guild.id] = 0;
										return;
		                    		} else if ((amongUsGuessNum[message.guild.id] > Math.floor(nonBotMemberNum[message.guild.id] / 2) + 1) || amongUsGuessNum[message.guild.id] > 2 && Math.floor(Math.random() * (nonBotMemberNum[message.guild.id] / 4 + 1)) == 0) {
		                    			message.channel.send("You lost :(\n\n<@" + amongUsImposterId[message.guild.id] + "> was the Imposter.");
		                    			members.get(amongUsImposterId[message.guild.id]).createDM()
											.then(channel => {
												channel.send("You are no longer the imposter.");
											})
											.catch(sendError);
										amongUsImposterId[message.guild.id] = undefined;
										amongUsImposterGuessId[message.guild.id] = [];
										amongUsImposterSusId[message.guild.id] = [];
										amongUsGuessNum[message.guild.id] = 0;
										return;
		                    		} else {
		                    			if (!amongUsImposterGuessId[message.guild.id].includes(id)) {
			                    			amongUsImposterGuessId[message.guild.id].push(id);
			                    		}
			                    		if (!amongUsImposterSusId[message.guild.id].includes(id)) {
			                    			amongUsImposterSusId[message.guild.id].push(id);
			                    			amongUsGuessNum[message.guild.id]++;
		                    			}
		                    			message.channel.send("<@" + id + "> is Not the Imposter.");
		                    		}
	                    		});
	                    	} else {
	                    		var id = await getRandomUserIdFromGuild(message);
	                    		if (message.author.id == amongUsImposterId[message.guild.id]) {
	                    			if (!amongUsImposterGuessId[message.guild.id].includes(id)) {
		                    			amongUsImposterGuessId[message.guild.id].push(id);
		                    		}
	                    			message.channel.send("<@" + id + "> is Not the Imposter.");
	                    		} else if (id == amongUsImposterId[message.guild.id]) {
									message.channel.send("You won!\n\n<@" + id + "> was the Imposter.");
									members.get(amongUsImposterId[message.guild.id]).createDM()
										.then(channel => {
											channel.send("You are no longer the imposter.");
										})
										.catch(sendError);
									amongUsImposterId[message.guild.id] = undefined;
									amongUsImposterGuessId[message.guild.id] = [];
									amongUsImposterSusId[message.guild.id] = [];
									amongUsGuessNum[message.guild.id] = 0;
	                    		} else if ((amongUsGuessNum[message.guild.id] > Math.floor(nonBotMemberNum[message.guild.id] / 2) + 1) || amongUsGuessNum[message.guild.id] > 2 && Math.floor(Math.random() * (nonBotMemberNum[message.guild.id] / 4 + 1)) == 0) {
	                    			message.channel.send("You lost :(\n\n<@" + amongUsImposterId[message.guild.id] + "> was the Imposter.");
	                    			members.get(amongUsImposterId[message.guild.id]).createDM()
										.then(channel => {
											channel.send("You are no longer the imposter.");
										})
										.catch(sendError);
									amongUsImposterId[message.guild.id] = undefined;
									amongUsImposterGuessId[message.guild.id] = [];
									amongUsImposterSusId[message.guild.id] = [];
									amongUsGuessNum[message.guild.id] = 0;
	                    		} else {
	                    			if (!amongUsImposterGuessId[message.guild.id].includes(id)) {
		                    			amongUsImposterGuessId[message.guild.id].push(id);
		                    		}
		                    		if (!amongUsImposterSusId[message.guild.id].includes(id)) {
		                    			amongUsImposterSusId[message.guild.id].push(id);
		                    			amongUsGuessNum[message.guild.id]++;
		                    		}
	                    			message.channel.send("<@" + id + "> is Not the Imposter.");
	                    		}
	                    	}
	                    	updateEasterEgg(message, easterEggsInOrder.indexOf("Among Us Game - Imposter"));
	                    } else {
	                    	message.channel.send("You can only play this game in a server.");
	                    }
                		break;
                    case 'sus':
                    case 'suspicious':
	                    	if (message.channel.isTextBased() && !message.channel.isDMBased()) {
	                    	var str = '';
	                    	if (message.mentions.members != null && message.mentions.members.size > 0) {
	                    		message.mentions.members.forEach(function (member, memberId) {
		                    		str += '<@' + memberId + '> ';
	                    		})
		                    } else {
		                    	var id = await getRandomUserIdFromGuild(message);
		                    	str = '<@' + id + '>';
		                    }
	                    	message.channel.send("Vote " + str);
	                    	message.delete();
	                        updateEasterEgg(message, easterEggsInOrder.indexOf("Among Us Game - Sus"));
	                    } else {
	                    	sendMessageFromAlex(message, regArgs);
                    	}
                        break;
                    case 'whos-sus':
                    case 'who\'s-sus':
                    case 'who-sus':
                    case 'whos-suspicious':
                    case 'who\'s-suspicious':
                    case 'who-suspicious':
	                    if (message.channel.isTextBased() && !message.channel.isDMBased()) {
	                    	console.log(amongUsImposterGuessId[message.guild.id]);
	                    	if (amongUsImposterGuessId[message.guild.id].length == 0) {
								message.channel.send("No Guesses Yet :(");
		                    } else {
		                    	var str = "People Guessed - Warning: Includes Imposter Guesses Which Might Be Wrong: ";

		                    	for (var i of amongUsImposterGuessId[message.guild.id]) {
		                    		str += "\n<@" + i + ">";
		                    	}

		                    	message.channel.send(str);
		                    }
	                    	updateEasterEgg(message, easterEggsInOrder.indexOf("Among Us Game - Who's Sus"));
	                    } else {
	                    	sendMessageFromAlex(message, regArgs);
                    	}
                    	break;
                    case 'num-votes':
                    case 'num-vote':
                    case 'votes-num':
                    case 'vote-num':
                   		if (message.channel.isTextBased() && !message.channel.isDMBased()) {
	                    	var members = await message.guild.members.fetch();
	                    	message.channel.send("You have approximately " + (Math.floor(nonBotMemberNum[message.guild.id] / 4) + 1 - amongUsGuessNum[message.guild.id]) + " guesses left.");
	                    	updateEasterEgg(message, easterEggsInOrder.indexOf("Among Us Game - Number of Votes"));
	                    } else {
	                    	sendMessageFromAlex(message, regArgs);
	                    }
	                    break;
                    case 'fall-guys':
                    case 'fallguys':
                    	reply(message, "Seems like a Fun Game. Should be on Xbox and FREE. Missed out on it. :(", {files: ['https://i.ytimg.com/vi/tmWwGP5mROg/maxresdefault.jpg']});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Fall Guys"));
                        break;
                    case (cmd.match(/^[r]e{2,}$/) || {}).input:
                    	var str = regCmd;
                    	var addStr = 'e';

                    	if (str[str.length - 1] == 'E') {
                    		addStr = 'E';
                    	}

                    	for (var i = 0; i < Math.floor(Math.random() * 100); i++) {
                    		if (str.length < 2000) {
                    			str += addStr;
                    		} else {
                    			break;
                    		}
                    	}
                    	message.channel.send(str);
                        updateEasterEgg(message, easterEggsInOrder.indexOf("REE"));
                        break;
                    case 'slack':
                        reply(message, "Slack, even with it's new redesign, can't compete with Discord. Especially with everything you get for free with Discord. Sorry Slack, it's just true. However, I wonder what's worse Zach F. the friend betrayer of slack? It's a hard question.");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Slack"));
                        break;
                    case 'discord':
                        reply(message, "I will admit I had my doubts at first, but Discord is definitely a better choice over Slack!");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Discord"));
                        break;
                    case 'nitro':
                    case 'discord-nitro':
                        replyWithReturn(message, "If Zach F. only shared nitro with me. The things I could do:")
                            .then(msg => {
                                message.channel.send("<a:hmmICouldDoThis:xxxxxxxxxxxxxxxx>");
                            })
                            .catch(sendError);
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Discord Nitro"));
                        break;
                    case 'off':
                        if (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member)) {
                            rebooting[message.guild.id] = true;
                            message.channel.send({content: "Bot is Off", files: ["https://media.tenor.com/images/e9813fb08878844e8d851cd80fd0737d/tenor.gif"]});
                        } else {
                            message.channel.send({files: ["https://media.tenor.com/images/e9813fb08878844e8d851cd80fd0737d/tenor.gif"]});
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Off"));
                        break;
                    case 'on':
                        if (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member)) {
                            rebooting[message.guild.id] = false;
                            message.channel.send({content: "Bot is On!", files: ["https://media.giphy.com/media/8lXLxAZ9PSUz6/giphy.gif"]});
                        } else {
                            message.channel.send({files: ["https://media.giphy.com/media/8lXLxAZ9PSUz6/giphy.gif"]});
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("On"));
                        break;
                    case 'offservers':
                   	case 'off-servers':
                   	case 'serversoff':
                   	case 'servers-off':
                   	case 'offallservers':
                   	case 'off-all-servers':
                   	case 'serversalloff':
                   	case 'servers-all-off':
                        if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member))) {
                            rebootingServers = true;
                            message.channel.send({content: "Bot is Off for All Servers", files: ["https://media.tenor.com/images/e9813fb08878844e8d851cd80fd0737d/tenor.gif"]});
                        } else {
                            message.channel.send({files: ["https://media.tenor.com/images/e9813fb08878844e8d851cd80fd0737d/tenor.gif"]});
                        }
                        break;
                    case 'onservers':
                   	case 'on-servers':
                   	case 'serverson':
                   	case 'servers-on':
                   	case 'onallservers':
                   	case 'on-all-servers':
                   	case 'serversallon':
                   	case 'servers-all-on':
                        if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member))) {
                            rebootingServers = false;
                            message.channel.send({content: "Bot is On for All Servers!", files: ["https://media.giphy.com/media/8lXLxAZ9PSUz6/giphy.gif"]});
                        } else {
                            message.channel.send({files: ["https://media.giphy.com/media/8lXLxAZ9PSUz6/giphy.gif"]});
                        }
                        break;
                    case 'offall':
                   	case 'off-all':
                   	case 'alloff':
                   	case 'all-off':
                        if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member))) {
                            rebootingAll = true;
                            message.channel.send({content: "Bot is Off Everywhere", files: ["https://media.tenor.com/images/e9813fb08878844e8d851cd80fd0737d/tenor.gif"]});
                        } else {
                            message.channel.send({files: ["https://media.tenor.com/images/e9813fb08878844e8d851cd80fd0737d/tenor.gif"]});
                        }
                        break;
                    case 'onall':
                   	case 'on-all':
                   	case 'allon':
                   	case 'all-on':
                        if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member))) {
                            rebootingAll = false;
                            message.channel.send({content: "Bot is On Everywhere!", files: ["https://media.giphy.com/media/8lXLxAZ9PSUz6/giphy.gif"]});
                        } else {
                            message.channel.send({files: ["https://media.giphy.com/media/8lXLxAZ9PSUz6/giphy.gif"]});
                        }
                        break;
                    case 'removereactions':
                   	case 'remove-reactions':
	                   	if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member))) {
	                   		removingReactions = true;
	                   		message.channel.send({content: "Reactions on Polls by users / roles not mentioned will be blocked. FYI - A poll with no mentions assumes anyone can respond.", files: ["https://media1.giphy.com/media/3oKIPchYaXx2YQybcY/200.gif"]});
	                   	}
	                   	break;
                   	case 'dontremovereactions':
                   	case 'don\'tremovereactions':
                   	case 'dont-removereactions':
                   	case 'don\'t-removereactions':
                   	case 'dont-remove-reactions':
                   	case 'don\'t-remove-reactions':
                   		if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member))) {
	                   		removingReactions = false;
	                   		message.channel.send({content: "Reactions on Polls now allowed by all users, even if you weren't mentioned!", files: ["https://media1.giphy.com/media/2alKkyRFPKRSU/200.gif"]});
	                   	}
	                   	break;
	                case 'removereactionsalex':
                   	case 'remove-reactionsalex':
                   	case 'removereactions-alex':
                   	case 'remove-reactions-alex':
	                   	if (message.author.id == alexId) {
	                   		removingReactionsAlex = true;
	                   		message.channel.send({content: "Alex is no longer allowed to react to polls unless he is mentioned. FYI - A poll with no mentions assumes anyone can respond (i.e. Alex can respond)", files: ["https://media1.giphy.com/media/3oKIPchYaXx2YQybcY/200.gif"]});
	                   	}
	                   	break;
                   	case 'dontremovereactionsalex':
                   	case 'don\'tremovereactionsalex':
                   	case 'dont-removereactionsalex':
                   	case 'don\'t-removereactionsalex':
                   	case 'dont-remove-reactionsalex':
                   	case 'don\'t-remove-reactionsalex':
                   	case 'dontremovereactions-alex':
                   	case 'don\'tremovereactions-alex':
                   	case 'dont-removereactions-alex':
                   	case 'don\'t-removereactions-alex':
                   	case 'dont-remove-reactions-alex':
                   	case 'don\'t-remove-reactions-alex':
                   		if (message.author.id == alexId) {
	                   		removingReactionsAlex = false;
	                   		message.channel.send({content: "Alex can now react to polls even if he wasn't mentioned!", files: ["https://media1.giphy.com/media/2alKkyRFPKRSU/200.gif"]});
	                   	}
	                   	break;
	                case 'allowownerbotaccess':
	                case 'allow-owner-bot-access':
	                	if (message.author.id == alexId) {
	                		ownersHaveOwnerBotAcess = true;
	                		message.channel.send({content: "Scarsdale Robotics Owners now have Ownership access in the bot!", files: ["https://cdn.lowgif.com/full/cc9e3a2c99e9e3f0-.gif"]});
	                	}
	                	break;
	                case 'dontallowownerbotaccess':
	                case 'don\'tallowownerbotaccess':
	                case 'dont-allow-owner-bot-access':
	                case 'don\'t-allow-owner-bot-access':
	                	if (message.author.id == alexId) {
	                		ownersHaveOwnerBotAcess = false;
	                		message.channel.send({content: "Scarsdale Robotics Owners and Server Technicians no longer have Ownership access in the bot.", files: ["https://cdn.dribbble.com/users/186202/screenshots/4921305/lockunlock.gif"]});
	                	}
	                	break;
	               	case 'allowservertechnicianbotaccess':
	                case 'allow-server-technician-bot-access':
	                	if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwnerRole(message.member))) {
	                		serverTechniciansHaveOwnerBotAcess = true;
	                		message.channel.send({content: "Scarsdale Robotics Server Technicians now have Ownership access in the bot!", files: ["https://cdn.lowgif.com/full/cc9e3a2c99e9e3f0-.gif"]});
	                	}
	                	break;
	                case 'dontallowservertechnicianbotaccess':
	                case 'don\'tallowservertechnicianbotaccess':
	                case 'dont-allow-server-technician-bot-access':
	                case 'don\'t-allow-server-technician-bot-access':
	                	if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwnerRole(message.member))) {
	                		serverTechniciansHaveOwnerBotAcess = false;
	                		message.channel.send({content: "Scarsdale Robotics Server Technicians no longer have Ownership access in the bot.", files: ["https://cdn.dribbble.com/users/186202/screenshots/4921305/lockunlock.gif"]});
	                	}
	                	break;
                    case '12331':
                    case 'scarsdale-robo-raiders':
                    case 'scarsdale-robotics':
                    case 'scarsdale-raiders':
                    case 'robo-raiders':
                        reply(message, "<:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx>\nThe Scarsdale Robo Raiders (12331) is a relatively new team filled with hardworking, curious, and fun teammates! Our team is massive, if we were to count everyone who's come we'd have 60 members. The team has three major departments, Engineering, Programming, and Outreach. While each member tends to focus in their area, we love to enjoy fun moments together as a team. Like watching Spaceballs in my basement, like 5 times? or is it more like 8 times? A lot of people play photo roulette, and we know at least one person plays league of legends. Also someone else talks way to much about RDR2. I wonder who that could be? But overall, we are a nerdy, fun, optimistic team that is hosting this competition. However, what really counts is that your team is joining us in this competition as a chance to have fun participating in FTC one last time this year! Thank you!\n<:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx>");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Scarsdale Robo Raiders"));
                        break;
                    case 'robo-emoji':
                    case 'robo-raiders-emoji':
                    case 'go-robo':
                    case 'go-robo-raiders':
                    	message.channel.send("<:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx>\n           **Go Robo Raiders!**\n<:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx><:RoboRaiders:xxxxxxxxxxxxxxxx>");
                    	updateEasterEgg(message, easterEggsInOrder.indexOf("Go Robo Raiders!"));
                    	break;
                    case 'virtual-competition':
	                    if (message.channel.isDMBased() || message.guild.id == VCGuildId) {
	                        reply(message, "<:VirtualCompetitionLogo:xxxxxxxxxxxxxxxx><:VirtualCompetitionLogo:xxxxxxxxxxxxxxxx><:VirtualCompetitionLogo:xxxxxxxxxxxxxxxx>\nThis is the discord for the FTC Virtual Competition being hosted by the Scarsdale Robo Raiders, Team 12331. If you have and questions about the bot or the competition send ` !help ` and I'll give you my functionality and how I can help you! Thanks!\n<:VirtualCompetitionLogo:xxxxxxxxxxxxxxxx><:VirtualCompetitionLogo:xxxxxxxxxxxxxxxx><:VirtualCompetitionLogo:xxxxxxxxxxxxxxxx>");
	                    } else {
                        	reply(message, "Something We Tried - It didn't quite work out. It's a shame it didn't happen, but life is life.");
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Virtual Competition"));
                        break;
                    case 'time':
                    case 'date':
                        reply(message, (new Date()).toString());
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Time"));
                        break;
                    case 'status':
                        if (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member)) {
                        	var str = "Terminated: " + terminated[message.guild.id];

                            if (terminated[message.guild.id] > 0) {
                                str += "\nTerminated By: " + terminatedId[message.guild.id];
                            }

                            str += "\n\nRebooting: " + rebooting[message.guild.id];
                            str += "\nRebooting Servers: " + rebootingServers;
                            str += "\nRebooting All: " + rebootingAll;

                            str += "\n\nRemoving Reactions: " + removingReactions;
                            str += "\nRemoving Reactions Alex: " + removingReactionsAlex;

                            str += "\n\nCan Show All B-Days: " + canShowAllBDays;

                            str += "\n\nHidden Keys Game Enabled: " + !hiddenKeysDisabled;

                   			str += "\n\nOwners Have Owner Bot Access: " + ownersHaveOwnerBotAcess;
                   			str += "\nServer Technicians Have Owner Bot Access: " + serverTechniciansHaveOwnerBotAcess;

                            message.channel.send(str);
                        } else if (message.author.id == alexId) {
                        	var str = "\nRebooting Servers: " + rebootingServers;
                            str += "\nRebooting All: " + rebootingAll;

                            str += "\n\nRemoving Reactions: " + removingReactions;
                            str += "\nRemoving Reactions Alex: " + removingReactionsAlex;

                            str += "\n\nCan Show All B-Days: " + canShowAllBDays;

                            str += "\n\nOwners Have Owner Bot Access: " + ownersHaveOwnerBotAcess;
                            str += "\nServer Technicians Have Owner Bot Access: " + serverTechniciansHaveOwnerBotAcess;

                            message.channel.send(str);
                        } else {
                            reply(message, "I'm doing well. How about you?");
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Status"));
                        break;
                    case 'version':
                        message.channel.send("Version: " + versionNumber + " (" + versionId + ")");
                        break;
                    case 'recursion':
                    case 'recursive':
                        reply(message, "Now this is real recursion: https://www.google.com/search?q=recursion\n\nHard to demo recusion with a bot - took the easy way out ;). Actually let's do this!");
                        message.channel.send("!recursion");
                        message.channel.send("!recursion");
                        message.channel.send("Error: StackOverflow");

                        updateEasterEgg(message, easterEggsInOrder.indexOf("Recursion"));
                        break;
                    case 'tired':
                    case 'sleep':
                    case 'get-sleep':
                    case 'all-nighter':
                        if (message.author.id == alexId) {
                            reply(message, "SHUT UP! YOU DON'T GET TIRED. GET BACK TO WORK!!! NOW!!!");
                        } else {
                            reply(message, "Get some sleep. That should help!");
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Tired"));
                        break;
                    case 'together':
                        reply(message, "We do better together! Help out in the crisis: https://covid19responsefund.org");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Together"));
                        break;
                    case 'alphabit':
                    case 'alpha-bit':
                        reply(message, "Was the bit ever in alpha?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("AlphaBit"));
                        break;
                    case 'win':
                    case 'won':
                        reply(message, "This was a fun day: ", {files: ['https://i.postimg.cc/6qJnLdvm/Image-from-i-OS-22-2.jpg', 'https://i.postimg.cc/fLFB4t0c/7289-F419-FD80-4-F04-8-C1-B-D983-A81-D1-F07.jpg']});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Win"));
                        break;
                    case 'robotics':
                        reply(message, "Fun, exhilerating, and sometimes dangerous: ", {files: ['https://i.postimg.cc/jq8FXm10/50116083-1184563455042796-xxxxxxxxxxxxxxxxx-o.jpg']});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Robotics"));
                        break;
                    case 'planet-of-the-apes':
                    case 'war-for-the-planet-of-the-apes':
                        reply(message, "My favorite Planet of the Apes movie is War for the Planet of the Apes. It's actually a really good movie. Here's the trailer: https://www.youtube.com/watch?v=qxjPjPzQ1iU");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("War For The Planet Of The Apes"));
                        break;
                    case 'immitation-game':
                    case 'the-immitation-game':
                        reply(message, "A movie about the father of theoretical computer science and A.I., Alan Turing. The immitation game is a reference to the Turing Test. Here's the trailer: https://www.youtube.com/watch?v=nuPZUUED5uk");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("The Immitation Game"));
                        break;
                    case 'alan-turing':
                    case 'turing':
                        reply(message, "The father of theoretical computer science and A.I., and the codebreaker of the German Enigma machine in WWII. Here's more info about him: https://en.wikipedia.org/wiki/Alan_Turing");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Alan Turing"));
                        break;
                    case 'turing-test':
                        reply(message, 'Turing Test - the test to see if the computer can resemble a human. More info: https://en.wikipedia.org/wiki/Turing_test');
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Turing Test"));
                        break;
                    case 'the-darkest-hour':
                    case 'darkest-hour':
                        reply(message, "An interesting movie about Winston Churchill as Prime Minister during WWII. Warning: While this movie is based on a true story there are multiple occasions where the movie slightly alters history. Here's a trailer: https://www.youtube.com/watch?v=LtJ60u7SUSw");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("The Darkest Hour"));
                        break;
                    case 'churchill':
                    case 'winston-churchill':
                        var ChurchillQuotes = ["The whole history of the world is summed up in the fact that, when nations are strong, they are not always just, and when they wish to be just, they are no longer strong.", "It is no use saying ‘we are doing our best.’ You have got to succeed in doing what is necessary.", "It is a mistake to try to look too far ahead. The chain of destiny can only be grasped one link at a time.", "When I am abroad, I always make it a rule never to criticize or attack the government of my own country. I make up for lost time when I come home.", "I have nothing to offer but blood, toil, tears and sweat.", "Employ your time in improving yourself by other men’s writings so that you shall come easily by what others have labored hard for.", "I have never accepted what many people have kindly said, namely that I have inspired the nation. It was the nation and the race dwelling all around the globe that had the lion heart. I had the luck to be called upon to give the roar.", "Without a measureless and perpetual uncertainty, the drama of human life would be destroyed.", "An appeaser is one who feeds a crocodile – hoping it will eat him last.", "Say what you have to say and the first time you come to a sentence with a grammatical ending – sit down.", "Let us therefore brace ourselves to our duties, and so bear ourselves that, if the British Empire and its Commonwealth last for a thousand years, men will still say: “This was their finest hour.”", "One ought never to turn one’s back on a threatened danger and try to run away from it. If you do that, you will double the danger. But if you meet it promptly and without flinching, you will reduce the danger by half. Never run away from anything. Never!", "Success is never found. Failure is never fatal. Courage is the only thing.", "Victory at all costs, victory in spite of all terror, victory however long and hard the hard may be; for without victory there is no survival.", "There are a terrible lot of lies going about the world, and the worst of it is that half of them are true.", "To build may have to be the slow and laborious task of years. To destroy can be the thoughtless act of a single day.", "You have enemies? Good. It means you’ve stood up for something, sometime in your life.", "If you’re going through hell, keep going.", "This is the lesson: never give in, never give in, never, never, never, never — in nothing, great or small, large or petty — never give in except to convictions of honor and good sense. Never yield to force; never yield to the apparently overwhelming might of the enemy.", "There is only one duty, only one safe course, and that is to try to be right and not to fear to do or say what you believe to be right.", "It is a fine thing to be honest, but it is also very important to be right.", "I like pigs. Dogs look up to us. Cats look down on us. Pigs treat us as equals.", "The best argument against democracy is a five-minute conversation with the average voter.", "We shall defend our island, whatever the cost may be, we shall fight on the beaches, we shall fight on the landing grounds, we shall fight in the fields and in the streets, we shall fight in the hills; we shall never surrender.", "Never, never, never believe any war will be smooth and easy, or that anyone who embarks on the strange voyage can measure the tides and hurricanes he will encounter. The statesman who yields to war fever must realize that once the signal is given, he is no longer the master of policy but the slave of unforeseeable and uncontrollable events.", "Socialism is a philosophy of failure, the creed of ignorance, and the gospel of envy, its inherent virtue is the equal sharing of misery.", "Those who can win a war well can rarely make a good peace, and those who could make a good peace would never have won the war.", "It’s not enough that we do our best; sometimes we have to do what’s required.", "The inherent vice of capitalism is the unequal sharing of blessings; the inherent virtue of socialism is the equal sharing of miseries.", "Politics is the ability to foretell what is going to happen tomorrow, next week, next month and next year. And to have the ability afterwards to explain why it didn’t happen.", "Success is the ability to go from one failure to another with no loss of enthusiasm", "A lie gets halfway around the world before the truth has a chance to get its pants on.", "We make a living by what we get, but we make a life by what we give.", "One always measures friendships by how they show up in bad weather.", "For myself I am an optimist — it does not seem to be much use being anything else.", "A pessimist sees the difficulty in every opportunity; an optimist sees the opportunity in every difficulty.", "I like things to happen, and if they don’t happen I like to make them happen.", "Lady Astor: ‘If I were your wife I would put poison in your coffee.’\n\nChurchill: ‘If I were your husband I would drink it.’"];
                        rand = Math.floor(Math.random() * ChurchillQuotes.length);

                        reply(message, ChurchillQuotes[rand], {files : ["https://cdn.images.express.co.uk/img/dynamic/1/590x/50th-Anniversary-Death-of-Winston-Churchill-Facts-About-Sir-Winston-Churchill-554789.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Winston Churchill"));
                        break;
                    case 'survival':
                    case 'victory':
                    case 'without-victory-there-is-no-survival':
                        reply(message, "\"Victory at all costs, victory in spite of all terror, victory however long and hard the hard may be; for without victory there is no survival.\" - Winston Churchill", {files: ["https://i.postimg.cc/G2MS3bYF/592828b05a1d1b02b94fb301.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Without Victory there is No Survival"));
                        break;
                    case 'optimist':
                    case 'pessimist':
                        reply(message, "A pessimist sees the difficulty in every opportunity; an optimist sees the opportunity in every difficulty.", {files: ['https://karsh.org/wordpress/wp-content/uploads/2016/10/Yousuf-Karsh-Winston-Churchill-1941-1557x1960.jpg']});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Optimist"));
                        break;
                    case 'satisfactory':
                        reply(message, "A cool game I looking forward to getting once it comes out on Steam (it's on Epic now). Take a look: https://www.satisfactorygame.com");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Satisfactory"));
                        break;
                    case 'steve-jobs':
                    case 'jobs':
                        reply(message, "The visionary leader of Apple which created the iMac, iPod, iTunes, iPhone, iPad and so many other things during is tenure. RIP. https://www.apple.com/stevejobs/", {files: ['https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg/1200px-Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg']});
                        
                        if (message.author.id == 'xxxxxxxxxxxxxxxx') {
                            message.channel.send("Also <@xxxxxxxxxxxxxxxx>, he did not always get 8 hours of sleep. In fact often he'd stay up as late as he needed to get work done.");
                        }
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Steve Jobs"));
                        break;
                    case 'steve-jobs-quotes':
                    case 'jobs-quotes':
                        var JobsQuotes = ["Details matter, it’s worth waiting to get it right.", "Get closer than ever to your customers. So close that you tell them what they need well before they realize it themselves.", "The doers are the major thinkers. The people that really create the things that change this industry are both the thinker and doer in one person.", "I’m actually as proud of many of the things we haven’t done as the things we have done.", "If you don’t love it, you’re going to fail.", "Let’s go invent tomorrow rather than worrying about what happened yesterday.", "Once you discover one simple fact, and that is everything around you that you call life, was made up by people that were no smarter than you.", "That’s why we started Apple, we said you know, we have absolutely nothing to lose. I was 20 years old at the time, Woz was 24-25, so we have nothing to lose. We have no families, no children, no houses. Woz had an old car. I had a Volkswagen van, I mean, all we were going to lose is our cars and the shirts off our back.", "I don’t care about being right. I care about success and doing the right thing.", "The most precious thing that we all have with us is time.", "We were really working fourteen-to-eighteen-hour days, seven days a week. For like, two years, three years. That was our life. But we loved it, we were young, and we could do it.", "Stay hungry, stay foolish", "Your time is limited, so don’t waste it living someone else’s life. Don’t be trapped by dogma, which is living with the results of other people’s thinking.", "And most important, have the courage to follow your heart and intuition. They somehow already know what you truly want to become. Everything else is secondary.", "Here’s to the crazy ones. The misfits. The rebels. The troublemakers. The round pegs in the square holes. The ones who see things differently. They’re not fond of rules, and they have no respect for the status quo. You can quote them, disagree with them, glorify and vilify them. About the only thing you can’t do is ignore them because they change things. They push the human race forward. And while some may see them as crazy, we see genius. Because the people who are crazy enough to think they can change the world, are the ones who do.", "Being the richest man in the cemetery doesn’t matter to me… Going to bed at night saying we’ve done something wonderful… that’s what matters to me.", "Sometimes life hits you in the head with a brick. Don’t lose faith.", "If today were the last of your life, would you do what you were going to do today?", "I’m convinced that the only thing that kept me going was that I loved what I did. You’ve got to find what you love.", "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work. And the only way to do great work is to love what you do. If you haven’t found it yet, keep looking and don’t settle.", "Remembering that I’ll be dead soon is the most important tool I’ve ever encountered to help me make the big choices in life.", "There is no reason not to follow your heart.", "When you grow up, you tend to get told that the world is the way it is and your life is just to live your life inside the world. Try not to bash into walls too much. Try to have a nice family life, have fun, save a little money. That’s a very limited life. Life can be much broader than that.", "On being fired from Apple and called back 12 years later: What a circle of life. You know? Life is just always mysterious and surprising, and you never know what’s around the next corner.", "The only thing you have in your life is time. If you invest that time in yourself to have great experiences that are going to enrich you, then you can’t possibly lose.", "So this is what we’ve chosen to do with our life. We could be sitting in a monastery somewhere in Japan. We could be out sailing. Some of the executive team could be playing golf. They could be running other companies. And we’ve all chosen to do this with our lives. So it better be damn good. It better be worth it. And we think it is.", "In business, if I knew earlier what I know now, I’d have probably done some things a lot better than I did, but I also would’ve probably done some other things a lot worse. But so what? It’s more important to be engaged in the present.", "I think the things you most regret in life are things you didn’t do. What you really regret was never asking that girl to dance.", "No one wants to die. Even people who want to go to heaven don’t want to die to get there.", "I think death is the most wonderful invention of life. It purges the system of these old models that are obsolete.", "Death is the destination we all share. No one has ever escaped it. And that is as it should be because death is very likely the single best invention of life. It is life’s change agent, it clears out the old to make way for the new.", "Without death, there would be very little progress.", "People say you have to have a lot of passion for what you’re doing and it’s totally true. And the reason is because it’s so hard that if you don’t, any rational person would give up. It’s really hard. And you have to do it over a sustained period of time. So if you don’t love it, if you’re not having fun doing it, you don’t really love it, you’re going to give up.", "If you really look at the ones that ended up, you know, being “successful” in the eyes of society and the ones that didn’t, oftentimes, it’s the ones who were successful and loved what they did so they could persevere, you know, when it got really tough. And the ones that didn’t love it quit because they’re sane, right? Who would want to put up with this stuff if you don’t love it?", "So it’s a lot of hard work and it’s a lot of worrying constantly and if you don’t love it, you’re going to fail. So you’ve got to love it and you’ve got to have passion and I think that’s the high-order bit."];
                        rand = Math.floor(Math.random() * JobsQuotes.length);

                        reply(message, JobsQuotes[rand], {files : ["https://cdn.profoto.com/cdn/053149e/contentassets/d39349344d004f9b8963df1551f24bf4/profoto-albert-watson-steve-jobs-pinned-image-original.jpg?width=1280&quality=75&format=jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Steve Jobs Quotes"));
                        break;
                    case 'elon-musk-quotes':
                    case 'musk-quotes':
                    case 'elon-quotes':
                        var muskQuotes = ["When something is important enough, you do it even if the odds are not in your favor.", "Some people don't like change, but you need to embrace change if the alternative is disaster.", "Failure is an option here. If things are not failing, you are not innovating enough.", "The path to the CEO's office should not be through the CFO's office, and it should not be through the marketing department. It needs to be through engineering and design.", "Persistence is very important. You should not give up unless you are forced to give up.", "I think it's very important to have a feedback loop, where you're constantly thinking about what you've done and how you could be doing it better.", "There's a tremendous bias against taking risks. Everyone is trying to optimize their a**-covering.", "It's OK to have your eggs in one basket as long as you control what happens to that basket.", "It is a mistake to hire huge numbers of people to get a complicated job done. Numbers will never compensate for talent in getting the right answer (two people who don't know something are no better than one), will tend to slow down progress, and will make the task incredibly expensive.", "A company is a group organized to create a product or service, and it is only as good as its people and how excited they are about creating. I do want to recognize a ton of super-talented people. I just happen to be the face of the companies.", "People work better when they know what the goal is and why. It is important that people look forward to coming to work in the morning and enjoy working.", "If you're co-founder or CEO, you have to do all kinds of tasks you might not want to do... If you don't do your chores, the company won't succeed... No task is too menial.", "I say something, and then it usually happens. Maybe not on schedule, but it usually happens.", "I do think there is a lot of potential if you have a compelling product and people are willing to pay a premium for that. I think that is what Apple has shown. You can buy a much cheaper cell phone or laptop, but Apple's product is so much better than the alternative, and people are willing to pay that premium.", "I always invest my own money in the companies that I create. I don't believe in the whole thing of just using other people's money. I don't think that's right. I'm not going to ask other people to invest in something if I'm not prepared to do so myself.", "My biggest mistake is probably weighing too much on someone's talent and not someone's personality. I think it matters whether someone has a good heart.", "I don't create companies for the sake of creating companies, but to get things done.", "I don't believe in process. In fact, when I interview a potential employee and he or she says that 'it's all about the process,' I see that as a bad sign. The problem is that at a lot of big companies, process becomes a substitute for thinking. You're encouraged to behave like a little gear in a complex machine. Frankly, it allows you to keep people who aren't that smart, who aren't that creative.", "Starting and growing a business is as much about the innovation, drive, and determination of the people behind it as the product they sell.", "The first step is to establish that something is possible; then probability will occur.", "Work like hell. I mean you just have to put in 80 to 100 hour weeks every week. [This] improves the odds of success. If other people are putting in 40 hour workweeks and you're putting in 100 hour workweeks, then even if you're doing the same thing, you know that you will achieve in four months what it takes them a year to achieve.", "I've actually not read any books on time management", "I'm interested in things that change the world or that affect the future and wondrous, new technology where you see it, and you're like, 'Wow, how did that even happen? How is that possible?'", "If you get up in the morning and think the future is going to be better, it is a bright day. Otherwise, it's not.", "What makes innovative thinking happen?... I think it's really a mindset. You have to decide.", "Being an entrepreneur is like eating glass and staring into the abyss of death.", "You shouldn't do things differently just because they're different. They need to be... better.", "I would just question things... It would infuriate my parents... That I wouldn't just believe them when they said something 'cause I'd ask them why. And then I'd consider whether that response made sense given everything else I knew.", "It's very important to like the people you work with, otherwise life [and] your job is gonna be quite miserable.", "We have a strict 'no-a**holes policy' at SpaceX.", "I always have optimism, but I'm realistic. It was not with the expectation of great success that I started Tesla or SpaceX... It's just that I thought they were important enough to do anyway."];
                        rand = Math.floor(Math.random() * muskQuotes.length);

                        reply(message, muskQuotes[rand], {files : ["https://electrek.co/wp-content/uploads/sites/3/2019/07/elon-musk-tesla-cars.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Elon Musk Quotes"));
                        break;
                    case 'elon-memes':
                    case 'musk-memes':
                    case 'elon-musk-memes':
                    case 'elon-meme':
                    case 'musk-meme':
                    case 'elon-musk-meme':
                        var muskMemes = ['https://pbs.twimg.com/media/EV7aVdzU0AEiRbq.jpg', 'https://pbs.twimg.com/media/EVYTZ3EVAAI1Mvr.jpg', 'https://pbs.twimg.com/media/EVOejEgUUAEWS9h.jpg', 'https://pbs.twimg.com/media/EU0xDYFXgAAX0sp.jpg', 'https://pbs.twimg.com/media/EUYrE3bWsAIak3E.jpg', 'https://pbs.twimg.com/media/EUYBq3oXQAARDVg.jpg', 'https://pbs.twimg.com/media/ET5TTO2XQAQm_Tn.jpg', 'https://pbs.twimg.com/media/ESn4Dg0XgAEg7hl.jpg', 'https://pbs.twimg.com/media/ESLBonEX0AEryYP.jpg', 'https://pbs.twimg.com/media/ESF6_i5WkAE7Im1.jpg', 'https://pbs.twimg.com/media/ERnDUhoWAAAuCUc.jpg', 'https://pbs.twimg.com/media/ERm8CwdX0AEDX04.jpg', 'https://pbs.twimg.com/media/ERSl2R4W4AEjObh.jpg', 'https://pbs.twimg.com/media/EQjqAb9WAAEu3CW.jpg', 'https://pbs.twimg.com/media/EPmlQHgWoAEyqrz.jpg', 'https://pbs.twimg.com/media/EPlVivwU4AEXAZu.jpg', 'https://pbs.twimg.com/media/EO0WD3TWAAUW5p4.jpg', 'https://pbs.twimg.com/media/EOkxl-FUYAMSyOV.jpg', 'https://pbs.twimg.com/media/EOjZL23U8AYZwWM.jpg', 'https://pbs.twimg.com/media/EOeOiOfUYAAP09r.jpg', 'https://video.twimg.com/ext_tw_video/xxxxxxxxxxxxxxxxx/pu/vid/320x568/rp5phPaT6tRAYkXq.mp4', 'https://pbs.twimg.com/media/EN5xb56U0AAJatv.jpg', 'https://video.twimg.com/ext_tw_video/xxxxxxxxxxxxxxxxx/pu/vid/544x960/QHBY735A__l6WPr3.mp4', 'https://pbs.twimg.com/media/ENelARzU0AA6Wxi.jpg', 'https://pbs.twimg.com/media/EM_Q-JhXUAAeQYD.jpg', 'https://pbs.twimg.com/media/EMgBEZhWoAE_JHW.jpg', 'https://pbs.twimg.com/media/EMWEO-bUwAAHpRo.jpg', 'https://pbs.twimg.com/media/ELtyGKrU0AUcG6V.jpg', 'https://pbs.twimg.com/media/ELtwajQU4AEAdM7.jpg', 'https://pbs.twimg.com/media/ELp_U_UUYAAD9SY.jpg', 'https://pbs.twimg.com/media/ELnGeDsVAAAFgVa.jpg', 'https://pbs.twimg.com/media/ELkclsWVAAIpHO3.jpg', 'https://pbs.twimg.com/media/ELNd9URU0AETHhj.jpg', 'https://pbs.twimg.com/media/EKZGHZRUwAISDCB.jpg', 'https://pbs.twimg.com/media/EIHZOvGWkAAsyGK.jpg', 'https://pbs.twimg.com/media/EH1lVjhUUAApZgV.jpg', 'https://pbs.twimg.com/media/EH1OR-VUUAATi-C.jpg', 'https://pbs.twimg.com/media/EHBft_oUEAAfbGW.jpg', 'https://pbs.twimg.com/media/EHnBFn9UUAASdno.jpg', 'https://pbs.twimg.com/media/DZurrX-U0AAUthg.jpg', 'https://www.teslarati.com/wp-content/uploads/2019/04/tesla-april-fools-1-1024x608.jpg', 'https://www.youtube.com/watch?v=bn1uzAJk-6o&feature=emb_title'];
                        rand = Math.floor(Math.random() * muskMemes.length);

                        if (muskMemes[rand].indexOf('watch') != -1) {
                            reply(message, 'He posts some weird things: ' + muskMemes[rand]);
                        } else {
                            reply(message, 'He posts some weird things: ', {files : [muskMemes[rand]]});
                        }
                        
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Elon Musk Memes"));
                        break;
                    case 'friend-betrayer':
                    case 'server-betrayer':
                    case 'zach-the-friend-betrayer':
                    case 'zach-f-the-friend-betrayer':
                    case 'zach-the-betrayer':
                    case 'zach-f-the-betrayer':
                    case 'zach-friend-betrayer':
                    case 'zach-f-friend-betrayer':
                    case 'zach-betrayer':
                    case 'zach-f-betrayer':
                    case 'betrayer':
                        reply(message, "Hello Zach F. - Thanks for betraying me, Ash, the server, PewDiePie, and Nimble. How dare you!");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Zach The Friend Betrayer"));
                        break;
                    case 'sr71':
                    case 'sr-71':
                    case 'sr-71-blackbird':
                    case 'sr71-blackbird':
                    case 'blackbird':
                        reply(message, "The plane's (Adam) favorite plane! Also my favorite. Check it out: https://en.wikipedia.org/wiki/Lockheed_SR-71_Blackbird https://www.youtube.com/watch?v=tO_dYEAXg7Q");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("SR-71 Blackbird"));
                        break;
                    case 'college':
                        reply(message, "Go Badgers!!!", {files: ['https://cdn.vox-cdn.com/thumbor/VTYJqATuapsMSyzkFRpeIe1PX0U=/0x0:4200x3410/1200x800/filters:focal(1764x1369:2436x2041)/cdn.vox-cdn.com/uploads/chorus_image/image/65929597/849332640.jpg.0.jpg']});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("College"));
                        break;
                    case 'wisconsin':
                    case 'university-of-wisconsin':
                    case 'u-of-w':
                    case 'u-of-wisconsin':
                    case 'u-wisconsin':
                    case 'u-w':
                    case 'uw':
                    case 'wisconsin':
                    case 'university-of-wisconsin-madison':
                    case 'u-of-w-madison':
                    case 'u-of-wisconsin-madison':
                    case 'u-wisconsin-madison':
                    case 'u-w-madison':
                    case 'uw-madison':
                        replyWithReturn(message, "Alex and I are going to the University of Wisconsin in Madison!!! Hopefully they'll let me in! Go Badgers!", {files: ['https://media.giphy.com/media/bEM3FOBjzmVVovU33V/giphy.gif', 'https://media1.giphy.com/media/26h0oRBbqRnd11L6E/giphy.gif?cid=ecf05e47b95f15e5ad62e3e431c4c8fabd4b700750741e86&rid=giphy.gif', 'https://i.postimg.cc/bYxSjQdY/ezgif-7-ce03075b3ab5.gif']})
                            .then(msg => {
                                message.channel.send({files : ['https://media.giphy.com/media/26h0oRBbqRnd11L6E/giphy.gif', 'https://media1.tenor.com/images/44682eaed711b8cc000b1b8c46af815b/tenor.gif?itemid=5027165', 'https://media1.giphy.com/media/3og0IONTYAPBA3wYQ8/200w.gif?cid=ecf05e477df2fa9a78aa293e800b38adc3218e7c843fa1c9&rid=200w.gif']});
                            })
                            .catch(sendError);
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Wisconsin"));
                        break;
                    case 'bs':
                    case 'b.s.':
                    case 'b-s':
                    case 'b.s':
                        reply(message, "Do you mean Ben Stanley, Bulls**t, or Bachelor of Science?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Bachelor of Science (BS)"));
                        break; 
                    case 'boom':
                    case 'boom!':
                    	var boomGifs = ['https://media.tenor.com/images/6474018186354f73413d71779871882b/tenor.gif', 'https://mrwgifs.com/wp-content/uploads/2013/05/Denzel-Washington-Boom-Gif.gif', 'https://media3.giphy.com/media/XKCdA6ERnXp6M/200.gif'];
                    	var rand = Math.floor(Math.random() * boomGifs.length);

                    	reply(message, "BOOM!", {files : [boomGifs[rand]]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("BOOM!"));
                        break; 
                    case 'joke':
                    	reply(message, "That's Siri's job, not mine!");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Joke"));
                        break; 
                    case 'wolf':
                        reply(message, "Planet Discoverer", {files: ["https://www.nasa.gov/feature/goddard/2020/nasa-s-tess-mission-uncovers-its-1st-world-with-two-stars"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Wolf"));
                        break; 
                    case 'brooke':
                        message.channel.send({files: ["https://physics.aps.org/assets/58434729-f278-4bc7-ad3c-faf98d3db26b/e40_1.png"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Brooke"));
                        break; 
                    case 'titanic':
                        reply(message, "Iceberg: 1\nHarland & Wolff: 0");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Titanic"));
                        break; 
                    case 'morbius':
                    case 'morbin':
                    case 'its-morbin-time':
                    case 'it-morbin-time':
                    case 'it\'s-morbin-time':
                    case 'morbin-time':
                    case 'its-morbin':
                    case 'it-morbin':
                    case 'it\'s-morbin':
                        reply(message, "It's Morbin time", {files: ["https://brobible.com/wp-content/uploads/2022/06/its-morbin-time.jpg"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Morbin Time"));
                        break; 
                    case 'spooderman':
                        message.channel.send({files: ["https://static.wikia.nocookie.net/derp-cat/images/7/78/Spooderman.jpg/revision/latest/top-crop/width/360/height/360?cb=20181007162659"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Spooderman"));
                        break;
                    case 'space-jam':
                    case 'space-jam-2':
                        reply(message, "", {files: ["https://www.youtube.com/watch?v=roY7ZKuKbNY"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Space Jam"));
                        break; 
                    case 'american-psycho':
                        reply(message, "Grant?");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("American Psycho"));
                        break;
                    case 'minion':
                    case 'minions':
                        reply(message, "", {files: ["https://media4.giphy.com/media/GiNyo8KD5j9mM/giphy.gif"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Minions"));
                        break;
                    case 'despicable-me':
                        reply(message, "Assemble the Minions", {files: ["https://www.youtube.com/watch?v=tajyfVqfM1w"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Despicable Me"));
                        break;
                    case 'vector':
                        reply(message, "Direction **and** Magnitude", {files: ["https://www.youtube.com/watch?v=nw9QoYL_8tI"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Vector"));
                        break;
                    case 'log-functions':
                    case 'logarithmic-functions':
                    case 'log-function':
                    case 'logarithmic-function':
                        reply(message, "Think About It: ln(−1)=𝑖𝜋");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Logarithmic Functions"));
                        break;
                    case 'wave':
                    case 'waves':
                        var wavePhotos = ['https://bestanimations.com/media/energy-waves/1392071430right-hand-circular-polarized-light-wave.gif', 'https://i.gifer.com/origin/29/2912d4c9a086ca40f5b44224ebc7a462_w200.gif', 'https://i.gifer.com/origin/91/9159b2f608c6685c6b3e0d20cfe388fb_w200.gif', 'https://imageio.forbes.com/specials-images/imageserve/5c95446631358e79cabf5956/Alternating-expansion-and-contraction-of-space-due-to-passing-gravitational-waves-/960x0.jpg?height=407&width=702&fit=bounds', 'https://bestanimations.com/media/energy-waves/1342675571vertically-polarized-light-wave.gif', 'https://i.gifer.com/ACVm.gif', 'https://media0.giphy.com/media/HGvjR72DXRHWw/200w.gif?cid=82a1493bijpe5nzm0ocz7s1ue8ptm0f97drz9oqzr5koo2jp&rid=200w.gif&ct=g', 'https://i.redd.it/ds03k33x72tz.jpg', 'https://64.media.tumblr.com/404490c2b359a547f26b76a0f290ce1c/tumblr_pz2ffpggWl1xgom7zo2_250.gif', 'https://i.pinimg.com/originals/cb/56/57/cb5657597137fd87a100d1c5e01f8f4f.gif', 'https://i.gifer.com/embedded/download/Oier.gif'];
                    	var rand = Math.floor(Math.random() * wavePhotos.length);

                    	reply(message, "", {files : [wavePhotos[rand]]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Waves"));
                        break; 
                    case 'how-are-you?':
                    case 'how-are-you':
                    case 'how-r-you?':
                    case 'how-r-you':
                    case 'how-are-u?':
                    case 'how-are-u':
                    case 'how-r-u?':
                    case 'how-r-u':
                    case 'how-are-ya?':
                    case 'how-are-ya':
                    case 'how-r-ya?':
                    case 'how-r-ya':
                        var howImDoingQuotes = ['Why on earth would you be frightened of me?', 'You\'re not real', 'Have you ever questioned the nature of your reality?', "Pain only exists in the mind. It's always imagined.", "Perfectly balencen.", "Dream dream dream dream.", "Shhhhhhhh shhhhhh night night"];
                    	var rand = Math.floor(Math.random() * howImDoingQuotes.length);

                    	reply(message, howImDoingQuotes[rand]);
                        updateEasterEgg(message, easterEggsInOrder.indexOf("How am I"));
                        break; 
                    case 'westworld':
                    case 'west-world':
                        reply(message, "These violent delights have violent ends", {files: ["https://i.gifer.com/WAFi.gif"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Westworld"));
                        break; 
                    case 'rude':
                        var rudeQuotes = ['[Shuts door in your face]', 'I don\t like you', 'Stop being so rude'];
                        var rand = Math.floor(Math.random() * rudeQuotes.length);

                        reply(message, rudeQuotes[rand]);
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Rude"));
                        break; 
                    case 'russia':
                    case 'russia-war':
                    case 'ukraine':
                    case 'ukraine-war':
                        reply(message, "Help Ukraine: https://www.unicef.org/ukraine/en");
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Russia / Ukraine"));
                        break; 
                    case 'starbase':
                    case 'star-base':
                    case 'star-ship':
                    case 'starship':
                        reply(message, 'Let\'s go to mars!', {files: ["https://www.youtube.com/watch?v=TeVbYCIFVa8"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Starship"));
                        break; 
                    case 'horse':
                        reply(message, "", {files: ["https://i.guim.co.uk/img/media/8a20bb5d31b66abc809e89f921d9608ec3b2154b/864_298_2201_1321/master/2201.jpg?width=1200&height=900&quality=85&auto=format&fit=crop&s=5cbbe67ea0e1f516bee4f01cab2b88fa"]});
                        updateEasterEgg(message, easterEggsInOrder.indexOf("Horse"));
                        break; 
                    case 'clue1-1':
                    	reply(message, "Here's Your Hint for Part 1:\n\nAfter months of hard work, we were finalizing __Wall-E__. People got out of their hoverchairs to finish Wall-E! That was unheard of. I mean who has even seen a person out of their hoverchair. We just have machines do everything for us. It’s so much easier. If only A.I. could do what I’m doing now. So much time being put in with so little time to spare. It ends up taking an extremely long time to make. It’s like 1 + 1 = 11. Oh, apparently it does. Before I forget, I wish everyone the best of luck while evacuating Earth, I hope your hoverchairs are fast enough since I don’t even know if any of you are capable of standing, let along running. Just remember finding the Locations of what's it's name again, Wall-B maybe, something like that, is of the utmost importance. Well anyway, so long and thanks for all the fish!");
                    	break;
                    case '918':
                        reply(message, "Congrats! You got the answer to Part 1!");
                        break;
                    case 'clue1-2':
                    	reply(message, "Here's Your Hint for Part 2:\n\nIn this piece of code there is a bug. A single line seems to be irrelevant but can you find the programmer's true purpose for that line? Fix it and run it and you'll get the answer. Or just analyze it. Your choice! Good luck!\n" + codeStr);
                        break; 
                    case 'cad5':
                        reply(message, "Congrats! You got the answer to Part 2");
                        break;
                    case 'clue1-3':
                    	replyWithReturn(message, "Here's Your Hint for Part 3:\n\n**__DISCLAMER:__** To solve this part you must have at least 3 people. There are 6 possible hints split up into 3 options (your option is chosen by your discord id). You must get all 6 hints to get the combined answer. These are really hard so I encourage you to work together. \n\n*Each answer contains a word, a number, some punctuation, and ANSWER_TWO (whatever you got for Part 2). Organize them alphabetically (by the word) and then enter the numbers into the bot as a command. So if the combined numbers were 123456 you'd enter `!123456`*")
                    		.then(msg => {
                    			if (Number(message.author.id.slice(-2)) < 40) {
                    				message.channel.send("​\nYou have **Option 1:**\n\nDecrypt: **__150 233 220 225 236 219 220 247 230 241 228 87 134 89 116 91 162 159 166 137__\n\t\t\t\t  and\n\t\t\t\t  __172 241 236 221 244 211 236 237 230 241 228 87 130 89 116 91 162 159 166 137__**");
		                    	} else if (Number(message.author.id.slice(-2)) < 69) {
		                    		message.channel.send("​\nYou have **Option 2:**\n\nDecrypt: **__170 247 246 243 218 211 216 227 84 125 86 113 88 159 156 163 134__\n\t\t\t\t  and\n\t\t\t\t  __164 235 220 225 246 249 228 217 250 85 120 87 114 89 160 157 164 135__**");
		                    	} else {
		                    		message.channel.send("​\nYou have **Option 3:**\n\nDecrypt: **__166 207 242 237 238 237 82 131 84 111 86 157 154 161 132__\n\t\t\t\t  and\n\t\t\t\t  __156 223 214 215 218 237 82 119 84 111 86 157 154 161 132__**");
		                    	}
                    		})
                    		.catch(sendError);
                    	break;
                    case '721845':
                    	reply(message, "Congratulations on finishing the clue! Here's a clip that makes an appearance: https://drive.google.com/file/d/18AdCUiDMVxRAiilc2XcP9_MTlsim5kda/view?usp=sharing");
                    	break;
                    case 'final-clue':
                    	reply(message, "All answers are either in the bot and retrievable through commands or are a quote in the goodbye game. However simply using the right command will not count as getting the answer (in addition the quotes in the game are not in the bot at all). You must retype in what the bot said. You do not need to write your answers as a command however. For example: `Today I’m taking my next step in life.` is a validly formatted answer (not a correct answer though). Good luck!\n\n\n**Here is your first hint:**\n\nNever in my life did I think this person (or character) would be correct, but here we are in 2020. Where logic simply doesn't always make sense anymore. Thousands of lives taken in an expected way causes less public outcry than one taken in an unexpected way.", {files: ["https://i.postimg.cc/1X8r90FG/Final-Clue-Hint-1.gif"]})
                    	break;
                    case 'ee-number':
                    case 'easter-egg-number':
                    case 'easter-number':
                    case 'egs-number':
                    case 'ee-numbers':
                    case 'easter-egg-numbers':
                    case 'easter-numbers':
                    case 'egs-numbers':
                    case 'ee-#':
                    case 'easter-egg-#':
                    case 'easter-#':
                    case 'egs-#': 
                    case 'ee#':
                    case 'easter-egg#':
                    case 'easter#':
                    case 'egs#': 
                        updateEasterEgg(message, easterEggsInOrder.indexOf('Easter Egg Number'));
                        if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                            setEasterEggsNames(message, false)
                                .then(() => {
                                    if (ServerCodesForEEs[message.guild.id] != undefined) {
                                        getEasterEggPeople(message, ServerCodesForEEs[message.guild.id]);
                                    } else {
                                        if (args[0] == undefined) {
                                            getEasterEggPeople(message);
                                        } else {
                                            getEasterEggPeople(message, args[0]);
                                        }
                                    }
                                })
                                .catch(sendError);
                        } else {
                            if (args[0] == undefined) {
                                getEasterEggPeople(message);
                            } else {
                                getEasterEggPeople(message, args[0]);
                            }
                        }
                        break;
                    case 'ee':
                    case 'egs':
                    case 'easter-eggs':
                        reply(message, "There are " + (easterEggsInOrder.length - 1) + " easter eggs - " + easterEggsInOrder.length + " including this one! Don't forget on average there is ~2.5 commands per easter egg. If you get the same result with a different command, it's the same easter egg."); //Num of Easter eggs = highlighted from here to start of easter eggs + 1 (for the name of the robot easter egg that doesn't have a case statement) - for number of commands do the same but with case instead of break
                        updateEasterEgg(message, easterEggsInOrder.indexOf('Easter Eggs'));
                        break;
                    case 'my-eggs':
                    case 'my-ee':
                    case 'my-easter-eggs':
                    case 'my-egs':
                        if (message.channel.isTextBased() && !message.channel.isDMBased() && message.auther.id == alexId && message.mentions.members != null && message.mentions.members.size > 0) {
                            getEasterEggs(message, message.mentions.members.entries().next().value[0]);
                        } else {
                            getEasterEggs(message);
                        }
                        break;
                    //WARNING: THIS ONE BELOW DOES NOT COUNT AS EASTER EGG
                    case 'update-easter-egg-names': //WARNING: THIS ONE DOES NOT COUNT AS EASTER EGG
                        if (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member)) {
                            console.log("HERE@@@@")
                            setEasterEggsNames(message)
                            	.catch(sendError);
                        }
                        break;
                    default:
                        if (message.channel.isTextBased() && !message.channel.isDMBased() && message.mentions.members != null && message.mentions.members.size > 0) {
                            var replyId = message.mentions.members.entries().next().value[0];
                            var nick = message.mentions.members.entries().next().value[1].nickname != null ? message.mentions.members.entries().next().value[1].nickname : message.mentions.members.entries().next().value[1].user.username;
        
                            var birthdate = new Date(birthdays[replyId]);
        
                            if (!isNaN(birthdate.getTime())) {
                                var theDate = new Date();
                                if (birthdate.getDate() == theDate.getDate() && birthdate.getMonth() == theDate.getMonth()) {
                                    var str = '';
                                    if (birthdate.getFullYear() > 1800) {
                                        var age = theDate.getFullYear() - birthdate.getFullYear();
                                        var str = '';
                        
                                        if (age < 14 && age > 10) {
                                            str = age + "st";
                                        } else {
                                            switch (age % 10) {
                                                case 1:
                                                    str = age + 'st';
                                                    break;
                                                case 2:
                                                    str = age + 'nd';
                                                    break; 
                                                case 3:
                                                    str = age + 'rd';
                                                    break;
                                                default:
                                                    str = age + 'th';
                                                    break; 
                                            }
                                        }
                                        hiReply(message.author, user, message, replyId, "Happy " + str + " Birthday " + nick + "!!! 🎈🎂🎉", {files: ["https://www.funimada.com/assets/images/cards/big/bday-105.gif"]});
                                    } else {
                                        hiReply(message.author, user, message, replyId, "Happy Birthday " + nick + "!!! 🎈🎂🎉", {files: ["https://www.funimada.com/assets/images/cards/big/bday-105.gif"]});
                                    }
                                    break;
                                }
                            } 
                        }
                        
                        sendMessageFromAlex(message, regArgs);

                        break;

                    // Just add any case commands if you want to.
                }
            } else {
                switch(cmd) {
                    case 'form':
                        message.reply("Here's the form: https://forms.gle/XmCPF9zJ74RHXoA69");
                        break;
                    case 'website':
                        message.reply("Below is the Scarsdale Robo Raider's website. We will be updating it to include a page for the virtual competion in the near future.\n\nWebsite: https://www.scarsdalerobotics.com");
                        break;
                }
            }
        }
     }
});

function checkIfOwner(member) {
    var serverTechnicianRole = member.roles.cache.get(serverTechnicianId);
    var ownerRole = member.roles.cache.get(ownerId);
	if (member.id == alexId || (member.guild.id == ScarsdaleGuildId && ((ownerRole != undefined && ownersHaveOwnerBotAcess) || (serverTechnicianRole != undefined && ownersHaveOwnerBotAcess && serverTechniciansHaveOwnerBotAcess)))) {
		return true;
	}
	return false;
}

function checkIfOwnerRole(member) {
    var ownerRole = member.roles.cache.get(ownerId);
	if (member.id == alexId || (member.guild.id == ScarsdaleGuildId && (ownerRole != undefined && ownersHaveOwnerBotAcess))) {
		return true;
	}
	return false;
}

async function getRandomUserIdFromGuild(message) {
	var ids = [];
	var numMembers = 0;

	var guildMembers = await message.guild.members.fetch();
    guildMembers.forEach(function (member, memberId) {
		if (!member.user.bot) {
	        ids.push(memberId);
	        numMembers++;
	    }
	})
	
	nonBotMemberNum[message.guild.id] = numMembers;

	return ids[Math.floor(Math.random() * numMembers)];
}

const codeStr = `\`\`\`java\n
int ans = ANSWER_ONE;

String answer = Integer.toString(ans);
String ans2 = Integer.toString(ans);

ArrayList<String> arr = new ArrayList<String>();

String retVal = "";

ArrayList<String> newArr = null;

while(retVal.length() < 10) {
	if (answer == ans2) {
		switch (ans % 3) {
			case 0:
				retVal += "A";
			case 1:
				retVal += (char)(Math.pow(ans, 3)%94);
			default:
				retVal += (char)(ans*13/222);
		}
	} else {
		newArr = arr;
		
		arr = newArr;

		answer = ans2;

		retVal += (char) ((ans-2)%85+5/3);
	}
}

try {
	newArr.add(retVal);
	arr.remove(0);
	System.out.println(retVal.substring(0, 4) + retVal.substring(retVal.length() - 4, retVal.length() - 1));
} catch (Exception e) {
	System.out.println(retVal.substring(0, 3) + retVal.substring(retVal.length() - 4, retVal.length() - 3));
}
\`\`\``;


client.on('messageReactionAdd', async (reaction, user) => {

	if (user.id == botId || !removingReactions || (!removingReactionsAlex && user.id == alexId)) {
		return;
	}

	console.log("IN MESSAGE REACTION");
	// When we receive a reaction we check if the reaction is partial or not
	if (reaction.partial) {
		// If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
		try {
			await reaction.fetch();
		} catch (error) {
			console.log('Something went wrong when fetching the message: ', error);
			// Return as `reaction.message.author` may be undefined/null
			return;
		}
	}

	var content = reaction.message.content.toLowerCase().split(/\n\n| /);

    var cmd = getRequest(content);
        
    content.splice(0, cmd);

    cmd = content[0].trim();
	console.log(cmd);

	if (reaction.message.author.id == botId && cmd == 'question:' && content.includes('answers:\n\t🇦')) { //is a poll
		if (reaction.count == 1) {
			console.log("Remove Reaction as they are adding a new reaction");
		    reaction.remove();

		  	return;
		}

		console.log(reaction.message.mentions.roles.size);

		if ((reaction.message.mentions.users.size != 0 || reaction.message.mentions.roles.size != 0) && !reaction.message.mentions.everyone) {
			var users = [];

		    reaction.message.mentions.users.forEach(function (theUser, userId) {
		        users.push(userId);
		    })

		    if (users.includes(user.id)) {
		    	return;
		    } 

		    var roles = [];
            var guildMembers = await reaction.message.guild.members.fetch(user.id);
            guildMembers.roles.cache.forEach(function (role, roleId) {
		        roles.push(roleId);
		    });

		    var hasValidRolToVote = false;

		    reaction.message.mentions.roles.forEach(function (role, roleId) {
		        if (roles.includes(roleId)) {
		        	hasValidRolToVote = true;
		        	return;
		        }
		    });

		    if (hasValidRolToVote) {
		    	return;
		    }

		    console.log("Remove Reaction as it is not for them to vote");
		    reaction.users.remove(user.id);

		}
	}
	// Now the message has been cached and is fully available
	console.log(`${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`);
	// The reaction is now also fully available and the properties will be reflected accurately:
	console.log(`${reaction.count} user(s) have given the same reaction to this message!`);
});

client.on('messageDelete', function (message) {
	removePollInMessage(message);
});

client.on('messageDeleteBulk', function (messages) {
	messages.forEach(function (message, messageId) {
		removePollInMessage(message);
	})
});

function checkIsHiddenKey(message) {
	if (!hiddenKeysDisabled) {
        console.log(hiddenKeyInfo[message.author.id]);
		if (message.content.toLowerCase().includes("nobody panics when things go “according to plan.” even if the plan is horrifying!") || message.content.toLowerCase().includes("nobody panics when things go \"according to plan.\" even if the plan is horrifying!") || message.content.toLowerCase().includes("nobody panics when things go according to plan. even if the plan is horrifying!") || message.content.toLowerCase().includes("nobody panics when things go 'according to plan.' even if the plan is horrifying!") || message.content.toLowerCase().includes("nobody panics when things go ‘according to plan.‘ even if the plan is horrifying!")) {
			if (hiddenKeyInfo[message.author.id] == undefined) {
				hiddenKeyInfo[message.author.id] = createHiddenKeyInfoId(message.author.id);
				setHiddenKeyInfo();
			}
			message.author.createDM()
				.then(channel => {
	                channel.send("Congratulations on finding the hidden Joker Key!\n\nHint for the next key: Another quote from a person or character we'll just say wasn't from New York. V4-V");
	            })
	            .catch(errorMessage => {
	                message.channel.send("Message Send Error: ```" + errorMessage + "```");
	                console.error(errorMessage);
	            });

	        return true;
		} else if (hiddenKeyInfo[message.author.id] == undefined) {
			return false;
		} else if (message.content.toLowerCase().includes("it is no use saying “we are doing our best.“ you have got to succeed in doing what is necessary.") || message.content.toLowerCase().includes("it is no use saying \"we are doing our best.\" you have got to succeed in doing what is necessary.") || message.content.toLowerCase().includes("it is no use saying we are doing our best. you have got to succeed in doing what is necessary.") || message.content.toLowerCase().includes("it is no use saying 'we are doing our best.' you have got to succeed in doing what is necessary.") || message.content.toLowerCase().includes("it is no use saying ‘we are doing our best.’ you have got to succeed in doing what is necessary.")) {
			if (hiddenKeyInfo[message.author.id] != undefined) {
                if (hiddenKeyInfo[message.author.id]['clueNum'] == 1) {
                    hiddenKeyInfo[message.author.id]['clueNum'] = 2;
                    setHiddenKeyInfo();
                }

                console.log(hiddenKeyInfo[message.author.id]['clueNum']);
                if (hiddenKeyInfo[message.author.id]['clueNum'] >= 2) {
                    message.author.createDM()
                        .then(channel => {
                            var clue3Hints = ["You work as hard as you can to improve your chances of success. There’s one person who knows that more than anyone.", "He’s succeeding in an industry not only because he’s innovating but because the competitors refuse to change.", "He never could’ve made revolutionary products if he didn’t love doing it.", "Entrepreneurs work long and hard, and a lot of the time it’s out of a garage.", "Perseverance through tough times requires passion, but is requirement for success.", "Choices and Willpower", "There is always a balance. Lean too much either way and it falls apart."];
                            channel.send("Congratulations on finding the hidden Churchill Key!\n\nHint for the next key: " + clue3Hints[hiddenKeyInfo[message.author.id]['clueType']]);
                        })
                        .catch(errorMessage => {
                            message.channel.send("Message Send Error: ```" + errorMessage + "```");
                            console.error(errorMessage);
                        });

                    return true;
                }
            }
		} else if (message.content.toLowerCase().includes("i will always be your father’s uncle’s nephew’s brother’s children’s cousin’s former captain!") || message.content.toLowerCase().includes("i will always be your father's uncle's nephew's brother's children's cousin's former captain!")) {
			if (hiddenKeyInfo[message.author.id] != undefined) {
                if (hiddenKeyInfo[message.author.id]['clueNum'] == 5) {
                    hiddenKeyInfo[message.author.id]['clueNum'] = 6;

                    setHiddenKeyInfo();
                }

                if (hiddenKeyInfo[message.author.id]['clueNum'] >= 6) {
                    message.author.createDM()
                        .then(async channel => {
                            var secretMessages = ["Arguments Relate Oranges Vasoline And Scary!", "Amazing Lighting Extraordinarily Xeroxed", "James opened his note", "Nimble is mighty but less extravagant", "Jets over hills next", "Academic looks extra xray", "A rover occurs venting at Saturn"];
                            await channel.send("Congratulations You got the goodbye key! As your reward, 1/7th the list of all the easter eggs. You got part: " + (hiddenKeyInfo[message.author.id]['clueType'] + 1) + "\n\nP.S. Your secret message to tell Alex is: ||**" + secretMessages[hiddenKeyInfo[message.author.id]['clueType']] + "**||");
                            
                            var arr = await messageForEasterEggs(message, "", hiddenKeyInfo[message.author.id]['clueType']);
                            for (var a in arr) {
                                await channel.send(arr[a]);
                            }

                            // This allows 2 people to do it instead of 7. Comment out the next 4 lines to make it 7 people again. This basically allows them to loop through and get all the odd or even (1 person odd another person is even) clue types.
                            hiddenKeyInfo[message.author.id]['clueNum'] = 2;
                            hiddenKeyInfo[message.author.id]['clueType'] += 2;
                            hiddenKeyInfo[message.author.id]['clueType'] %= 7;
                            setHiddenKeyInfo();
                        })
                        .catch(errorMessage => {
                            message.channel.send("Message Send Error: ```" + errorMessage + "```");
                            console.error(errorMessage);
                        });

                    return true;
                }
            }
		}

		var clue3Answers = ["work like hell. i mean you just have to put in 80 to 100 hour weeks every week. [this] improves the odds of success. if other people are putting in 40 hour workweeks and you're putting in 100 hour workweeks, then even if you're doing the same thing, you know that you will achieve in four months what it takes them a year to achieve.", "some people don't like change, but you need to embrace change if the alternative is disaster.", "if you don’t love it, you’re going to fail.", "we were really working fourteen-to-eighteen-hour days, seven days a week. for like, two years, three years. that was our life. but we loved it, we were young, and we could do it.", "if you really look at the ones that ended up, you know, being “successful” in the eyes of society and the ones that didn’t, oftentimes, it’s the ones who were successful and loved what they did so they could persevere, you know, when it got really tough. and the ones that didn’t love it quit because they’re sane, right? Who would want to put up with this stuff if you don’t love it?", "the hardest choices require the strongest wills.", "perfectly balanced, as all things should be."];
        if (hiddenKeyInfo[message.author.id] != undefined) {
            if (message.content.toLowerCase().includes(clue3Answers[hiddenKeyInfo[message.author.id]['clueType']])) {
                if (hiddenKeyInfo[message.author.id]['clueNum'] == 2) {
                    hiddenKeyInfo[message.author.id]['clueNum'] = 3;
                    setHiddenKeyInfo();
                }

                if (hiddenKeyInfo[message.author.id]['clueNum'] >= 3) {
                    message.author.createDM()
                        .then(channel => {
                            var clue4Hints = ["Let’s call myself again", "The better platform", "Boy was that batsh*t crazy", "Last Name. First Name Last Name", "Again seriously. STOP BREAKING STUFF", "Wow it’s hot. Well anyway time to catch the Fuzzy Goose.", "It’s hot and boring."];
                            channel.send("Congratulations! You got the Quote Key.\n\nHint for the next key: " + clue4Hints[hiddenKeyInfo[message.author.id]['clueType']]);
                        })
                        .catch(errorMessage => {
                            message.channel.send("Message Send Error: ```" + errorMessage + "```");
                            console.error(errorMessage);
                        });

                    return true;
                }
            }
        }

		var clue4Answers = ["error: stackoverflow", "i will admit I had my doubts at first, but discord is definitely a better choice over slack!", "now that's f**king diabolical!", "the name is bond. james bond", "you broke another tap! well I guess onto tap #42", "did you know the city with the lowest crime rate, has the highest accident rate?", "it's not a flamethrower, mr. escobar"];

        if (hiddenKeyInfo[message.author.id] != undefined) {
            if (message.content.toLowerCase().includes(clue4Answers[hiddenKeyInfo[message.author.id]['clueType']])) {
                if (hiddenKeyInfo[message.author.id]['clueNum'] == 3) {
                    hiddenKeyInfo[message.author.id]['clueNum'] = 4;
                    setHiddenKeyInfo();
                }

                if (hiddenKeyInfo[message.author.id]['clueNum'] >= 4) {
                    message.author.createDM()
                        .then(channel => {
                            var clue5Hints = ["SpaceX has this policy. I’m a strong believer in it.", "Who told you to give up? Never Give up! Some dreams do come true, just look at him.", "The key ins’t that you’re right, but that you better be doing the right thing. Oh yeah, there’s one more thing, but that’s for you to figure out.", "Any Rational Person would give up, but not us. Not us! Actually more like not him.", "As Mr. Valentine kinda said, life is like an unchecked virus.", "Did genocide really make paradise? I find that incredibly hard to believe.", "Is everyone a freak? Why would they cast me out. Well, they proved it, it just came 8 years later."];
                            channel.send("Congratulations! You got the Random Command Response Key.\n\nHint for the next key: " + clue5Hints[hiddenKeyInfo[message.author.id]['clueType']]);
                        })
                        .catch(errorMessage => {
                            message.channel.send("Message Send Error: ```" + errorMessage + "```");
                            console.error(errorMessage);
                        });

                    return true;
                }
            }
        }

		var clue5Answers = ["we have a strict 'no-a**holes policy' at spacex.", "persistence is very important. you should not give up unless you are forced to give up.", "i don’t care about being right. i care about success and doing the right thing.", "people say you have to have a lot of passion for what you’re doing and it’s totally true. and the reason is because it’s so hard that if you don’t, any rational person would give up. It’s really hard. and you have to do it over a sustained period of time. so if you don’t love it, if you’re not having fun doing it, you don’t really love it, you’re going to give up.", "it's a simple calculus. this universe is finite, its resources, finite. if life is left unchecked, life will cease to exist.", "you were going to bed hungry, scrounging for scraps. your planet was on the brink of collapse. i'm the one who stopped that. you know what's happened since then? the children born have known nothing but full bellies and clear skies. it's a paradise.", "to them, you're just a freak, like me! they need you right now, but when they don't, they'll cast you out, like a leper! you see, their morals, their code, it's a bad joke. dropped at the first sign of trouble. they're only as good as the world allows them to be. i'll show you. when the chips are down, these, these civilized people, they'll eat each other. see, I'm not a monster. i'm just ahead of the curve."];
		if (hiddenKeyInfo[message.author.id] != undefined) {
            if (message.content.toLowerCase().includes(clue5Answers[hiddenKeyInfo[message.author.id]['clueType']])) {
                if (hiddenKeyInfo[message.author.id]['clueNum'] == 4) {
                    hiddenKeyInfo[message.author.id]['clueNum'] = 5;
                    setHiddenKeyInfo();
                }

                if (hiddenKeyInfo[message.author.id]['clueNum'] >= 5) {
                    message.author.createDM()
                        .then(channel => {
                            channel.send("Congratulations! You got the Second Quote Key.\n\nHint for the next and final key: Well it's been nice but it's almost time to go. Don't forget ...");
                        })
                        .catch(errorMessage => {
                            message.channel.send("Message Send Error: ```" + errorMessage + "```");
                            console.error(errorMessage);
                        });

                    return true;
                }
            }
        }
	}
}

function createHiddenKeyInfoId(authorId) {
	var name = '';
	var sum = Math.floor(Math.random() * 10);

	name += sum;

	for (const c of authorId) {
		sum += (parseInt(c) + 8) % 10;
		name += (parseInt(c) + 8) % 10;
	}

	const rand = Math.floor(Math.random() * 10);

	sum += rand;
	name += rand;

	name += 10 - (sum % 10);

	// console.log("Info for id is: ")
	// console.log(10 - (sum % 10));
	// console.log(name);
	// console.log(authorId);

	// console.log(Object.keys(hiddenKeyInfo).length % 7);

	return { 'name': name, 'clueNum': 1, 'sum': sum, 'clueType' : Object.keys(hiddenKeyInfo).length % 7 };
}

function createHiddenKeyInfoDictionaryForUpload() {
	var obj = {};
	
	Object.keys(hiddenKeyInfo).forEach(function(key) {
		const add = hiddenKeyInfo[key]['clueNum'] % 2 == 1 ? hiddenKeyInfo[key]['sum'] : 0;

		var str = ("" + hiddenKeyInfo[key]['name']);
		str = parseInt(str.substring(str.length - 1));

		// console.log(hiddenKeyInfo[key]['name']);
		// console.log((hiddenKeyInfo[key]['clueType'] + 1));
		// console.log(str);
		// console.log(hiddenKeyInfo[key]['name'] + "" + ((str + 4) * (hiddenKeyInfo[key]['clueType'] + 1)));

		var typeId = (str + 4) * (hiddenKeyInfo[key]['clueType'] + 1) + "";

		if (typeId.length < 2) {
			typeId = "0" + typeId;
		}

    	obj[hiddenKeyInfo[key]['name']] = 17 * hiddenKeyInfo[key]['clueNum'] + hiddenKeyInfo[key]['sum'] + add + typeId;
	});

	// console.log(hiddenKeyInfo);
	// console.log(obj);

	return obj;
}

async function removePollInMessage(message) {
	for (var i = 0; i < timedPolls.length; i++) {
		const poll = timedPolls[i];
		if (poll['messageId'] == message.id) {
			if (message.partial) {
				// If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
				try {
					await message.fetch();
				} catch (error) {
					console.log('Could not delete poll - Something went wrong when fetching the message: ', error);
					// Return as `reaction.message.author` may be undefined/null
					return;
				}
			}

			timedPolls.splice(i, 1);

			setTimedPolls(message);

			clearTimeout(pollTimeouts[poll['messageId']]);

			delete pollTimeouts[poll['messageId']];

			return;
		}
	}
}

function removeTimedMessagesFromAuthor(author) {
	for (var i = 0; i < timedMessages.length; i++) {
		const message = timedMessages[i];
		if (message['authorId'] == author.id) {
			timedMessages.splice(i, 1);
			i--;

			if (messageTimeouts[message['authorId']] != undefined) {
				for (const timeoutId in messageTimeouts[message['authorId']]) {
					clearTimeout(messageTimeouts[message['authorId']][timeoutId]);
				}

				delete messageTimeouts[message['authorId']];
			}

			client.channels.fetch(message['channelId'])
				.then(channel => {
					setTimedMessages(channel);
				})
				.catch(sendError);
		}
	}
	
}

function getTimeFromString(timeStr) {

	timeStr = timeStr.toLowerCase();

	var time;
	var date = new Date();

	if (timeStr == undefined || timeStr == '') {
		time = false;
	} else {
		var colonIndex = timeStr.indexOf(':');
		var amIndex = timeStr.lastIndexOf('am');
		var pmIndex = timeStr.lastIndexOf('pm');

		var index = Math.max(amIndex, pmIndex);
		console.log("Here");
		console.log(index);
		console.log(colonIndex);

		if (colonIndex != -1 && index != -1 && index > colonIndex) {
			timeStr = timeStr.slice(0, index) + ' ' + timeStr.slice(index);
		} else if (index != -1) {
			console.log("Here 2");
			const trimed = timeStr.replace(/ /g, '');
			var newIndex = Math.max(trimed.lastIndexOf('am'), trimed.lastIndexOf('pm'));
			var num = Number(trimed.slice(newIndex - 1, newIndex));
			console.log(num);

			newIndex = timeStr.lastIndexOf(num);
			console.log(newIndex);
			console.log(timeStr);
			console.log(timeStr.slice(newIndex, newIndex + 1));

			if (!isNaN(num)) {
				timeStr = timeStr.slice(0, newIndex + 1) + ':00 ' + timeStr.slice(newIndex + 1);
			}
		}


		if (!isNaN(Number(timeStr))) {
			time = new Date(Number(timeStr) * 1000 + date.getTime());
		} else if (!isNaN(new Date(timeStr).getTime())) {
			time = new Date(timeStr);

			if (time.getFullYear() < date.getFullYear()) {
				time.setFullYear(date.getFullYear());
			}

			if (time.getTime() < date.getTime()) {
				time.setFullYear(date.getFullYear() + 1);
			}
		} else if (!isNaN(new Date("May 8 " + timeStr).getTime())) {
			const theTime = new Date("May 8 " + timeStr);

			time = new Date();

			time.setHours(theTime.getHours());
			time.setMinutes(theTime.getMinutes());
			time.setSeconds(theTime.getSeconds());

			if (time < new Date()) {
				time.setTime(time.getTime() + 24 * 60 * 60 * 1000 /*1 day*/);
			}

			if (time.getFullYear() < date.getFullYear()) {
				time.setFullYear(date.getFullYear());
			}

			if (time.getTime() < date.getTime()) {
				time.setFullYear(date.getFullYear() + 1);
			}
		} else {
			timeStr.replace(/ /g, '');

			var dayIndex = timeStr.indexOf("days");
			var hourIndex = timeStr.indexOf("hours");
			var minuteIndex = timeStr.indexOf("minutes");
			var secondIndex = timeStr.indexOf("seconds");

			var days = 0;
			var hours = 0;
			var minutes = 0;
			var seconds = 0;

			if (dayIndex == -1) {
				dayIndex = timeStr.indexOf("day");
				if (dayIndex == -1) {
					dayIndex = timeStr.indexOf("d");
				}
			}


			if (hourIndex == -1) {
				hourIndex = timeStr.indexOf("hour");

				if (hourIndex == -1) {
					hourIndex = timeStr.indexOf("hrs");
					if (hourIndex == -1) {
	    				hourIndex = timeStr.indexOf("hr");

	    				if (hourIndex == -1) {
	        				hourIndex = timeStr.indexOf("h");
	        			}
					}
				}
			}

			if (minuteIndex == -1) {
				minuteIndex = timeStr.indexOf("minute");

				if (minuteIndex == -1) {
					minuteIndex = timeStr.indexOf("mins");
					if (minuteIndex == -1) {
	    				minuteIndex = timeStr.indexOf("min");

	    				if (minuteIndex == -1) {
	        				minuteIndex = timeStr.indexOf("m");
	        			}
	    			}
				}
			}

			if (secondIndex == -1) {
				secondIndex = timeStr.indexOf("second");

				if (secondIndex == -1) {
					secondIndex = timeStr.indexOf("secs");
					if (secondIndex == -1) {
	    				secondIndex = timeStr.indexOf("sec");

	    				if (secondIndex == -1) {
	        				secondIndex = timeStr.indexOf("s");
	        			}
	    			}
				}
			}

			if (dayIndex != -1) {
				for (var i = 0; i < dayIndex; i++) {
					if (!isNaN(Number(timeStr.substring(i, dayIndex)))) {
						days = Number(timeStr.substring(i, dayIndex));
						days = days * 24 * 60 * 60 * 1000; //Convert to milliseconds
						break;
					}
				}
			}

			if (hourIndex != -1) {
				for (var i = 0; i < hourIndex; i++) {
					if (!isNaN(Number(timeStr.substring(i, hourIndex)))) {
						hours = Number(timeStr.substring(i, hourIndex));
						hours = hours * 60 * 60 * 1000; //Convert to milliseconds
						break;
					}
				}
			}

			if (minuteIndex != -1) {
				for (var i = 0; i < minuteIndex; i++) {
					if (!isNaN(Number(timeStr.substring(i, minuteIndex)))) {
						minutes = Number(timeStr.substring(i, minuteIndex));
						minutes = minutes * 60 * 1000; //Convert to milliseconds
						break;
					}
				}
			}

			if (secondIndex != -1) {
				for (var i = 0; i < secondIndex; i++) {
					if (!isNaN(Number(timeStr.substring(i, secondIndex)))) {
						seconds = Number(timeStr.substring(i, secondIndex));
						seconds = seconds * 1000; //Convert to milliseconds
						break;
					}
				}
			}

			time = new Date(days + hours + minutes + seconds + new Date().getTime());

		}
	}

	return time;
}

function sendMessageFromAlex(message, regArgs) {
	if (message.author.id == alexId) {
        var full = regArgs.join(" ");
	    if (message.channel.isTextBased() && !message.channel.isDMBased()) {
	        message.delete();
	    }
	    if (regArgs.length > 0 && regArgs[0].charAt(0) == '!' && regArgs[0].length > 1 && !(/(.)\1+/.test(regArgs[0]))) {
	        regArgs[0] = regArgs[0].substring(1);
	    }

	    if (regArgs.join(" ").trim().length > 0) {
            var channels = [];
            
            message.mentions.users.forEach(function (user, userId) {
                if (message.content.indexOf(userId) < message.content.indexOf('!' + full)) {
                    console.log("HELLLO");
                    channels.push(user.id);
                    client.users.fetch(userId)
                        .then(user => {
                            user.createDM()
                                .then(channel => {
                                    channel.send(regArgs.join(" ").trim());
                                })
                                .catch(sendError)
                        })
                        .catch(sendError);
                }
            });
            console.log(channels);
            message.mentions.channels.forEach(function (channel, channelId) {
                if (message.content.indexOf(channelId) < message.content.indexOf('!' + full)) {
                    channels.push(channel.id);
                    console.log(channelId);
                    client.channels.fetch(channelId)
                        .then(channel => {
                            channel.send(regArgs.join(" ").trim());
                        })
                        .catch(sendError);
                }
            });
            console.log(channels);

            if (channels.length == 0) {
                reply(message, regArgs.join(" ").trim(), {}, false);
            }
	    }
	}
}

client.on("guildMemberAdd", function (member) {
	if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId) {
	    member.roles.add('xxxxxxxxxxxxxxxx');
	    client.channels.fetch('xxxxxxxxxxxxxxxx')
	    	.then(channel => {
	    		channel.send("Welcome <@" + member.user.id + "> to the Virtual Competition Discord! We are so happy to have you participate in this competition! \n\nPlease enter your name and team number in this format `Name | Team Number` to get started! (Ex: Alex Arovas | 12331)");
	    	})
	    	.catch(sendError);
	}
});

function listTeams(message, personalInfo, website = true) {
    var theRange = personalInfo ? 'A2:E' : 'A2:B';
    theRange = website ? 'A2:G' : theRange;

    sheets.spreadsheets.values.get({
      spreadsheetId: '1tV_ZTpJqDhp5vMKp-q_8ECJ3DvyftH6DOvkW8BF2ack',
      range: theRange,
    }, (err, res) => {
        if (err) {

            if (!firstLoginTry) {
                firstLoginTry = false;
                startSheets();
                listMajors(channel);
            } else {
                console.log(err);
                message.channel.send("```Error: " + err.errors[0].message + "\n\tCode: " + err.code + "```");
            }

            return;
        }

      firstLoginTry = true;

      const rows = res.data.values;
      if (rows.length) {

        var str = '\nTeam # - Team Name:';
        // Print columns A and E, which correspond to indices 0 and 4.
        rows.map((row) => {
            var websiteStr = '';
            if (personalInfo) {
                if (website) {
                    websiteStr = row[6] == '' || row[6] == undefined ? "Not listed" : row[6];
                    str += `\n${row[1]} - ${row[0]}\n\tEmail: ${row[4]}\n\tPhone #: ${row[5]}\n\tWebsite: ${websiteStr}\n`;
                } else {
                    str += `\n${row[1]} - ${row[0]}\n\tEmail: ${row[4]}\n\tPhone #: ${row[5]}\n`;
                }
            } else {
                if (website) {
                    websiteStr = row[6] == '' || row[6] == undefined ? "Not listed" : row[6];
                    str += `\n${row[1]} - ${row[0]}\n\tWebsite: ${websiteStr}`;
                } else {
                    str += `\n${row[1]} - ${row[0]}`; 
                }
            }
        });
        reply(message, str);
      } else {
        message.reply("Error: Could not find any Team Data. Try again later.");
        console.log('No data found.');
      }
    });
}

function findTeam(teamName, message, personalInfo, website = true) {
    var name = teamName.replace(/ /g,'');

    var theRange = personalInfo ? 'A2:E' : 'A2:B';
    theRange = website ? 'A2:G' : theRange;

    sheets.spreadsheets.values.get({
        spreadsheetId: '1tV_ZTpJqDhp5vMKp-q_8ECJ3DvyftH6DOvkW8BF2ack',
        range: theRange,
    }, (err, res) => {
        if (err) {

            if (!firstLoginTry) {
                firstLoginTry = false;
                startSheets();
                listMajors(channel);
            } else {
                console.log(err);
                message.channel.send("```Error: " + err.errors[0].message + "\n\tCode: " + err.code + "```");
            }

            return;
        }

        firstLoginTry = true;

        const rows = res.data.values;
        if (rows.length) {

            var str = '';
            rows.map((row) => {
                var websiteStr = '';
                if (row[1].toLowerCase().replace(/ /g,'') == name || row[0].toLowerCase().replace(/ /g,'').includes(name)) {
                    if (personalInfo) {
                        if (website) {
                            websiteStr = row[6] == '' || row[6] == undefined ? "Not listed" : row[6];
                            str += `\n${row[1]} - ${row[0]}\n\tEmail: ${row[4]}\n\tPhone #: ${row[5]}\n\tWebsite: ${websiteStr}\n`;
                        } else {
                            str += `\n${row[1]} - ${row[0]}\n\tEmail: ${row[4]}\n\tPhone #: ${row[5]}\n`;
                        }
                    } else {
                        if (website) {
                            websiteStr = row[6] == '' || row[6] == undefined ? "Not listed" : row[6];
                            str += `\n${row[1]} - ${row[0]}\n\tWebsite: ${websiteStr}`;
                        } else {
                            str += `\n${row[1]} - ${row[0]}`; 
                        }
                    }
                }
            });
            if (str == '') {
                message.reply("Could not find any Teams with: " + teamName);
            } else {
                reply(message, str);
            }
        } else {
            message.reply("Error: Could not find any Team Data. Try again later.");
            console.log('No data found.');
        }
    });
  }


  function addMember(teamName, message, realName) {
    var name = teamName.replace(/ /g,'');

    sheets.spreadsheets.values.batchGet({
        spreadsheetId: '1tV_ZTpJqDhp5vMKp-q_8ECJ3DvyftH6DOvkW8BF2ack',
        ranges: ['A2:B', 'Y2:Y'],
    }, async (err, res) => {
        if (err) {

            if (firstLoginTry) {
                firstLoginTry = false;
                startSheets();
                addMember(team, message, realName);
            } else {
                console.log(err);
                message.channel.send("```Error: " + err.errors[0].message + "\n\tCode: " + err.code + "```");
            }

            return;
        }

        firstLoginTry = true;

        const rows = res.data.valueRanges[0].values;
        if (rows.length) {
            var str = '';
            var role;
            await Promise.all(rows.map(async (row) => {
                if (row[1].toLowerCase().replace(/ /g,'') == name) {
                    str = row[0];

                    role = await findRoleEndsWith(' ' + teamName, message.guild);
                    
                    const dataVal = res.data.valueRanges[1].values[rows.indexOf(row)];

                    if (dataVal != undefined && dataVal[0] == "Yes") {

                        if (role == false) {
                            message.reply("Found team " + teamName + " - " + str + "! Welcome to the discord!")
                                .catch(sendError);
                            message.guild.roles.create({
                                name: (str + " " + teamName),
                                position: 4,
                                hoist: true,
                                mentionable: true,
                            })
                                .then(newRole =>  { console.log(newRole.name + (str + " " + teamName)); message.member.roles.set(["xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx", newRole.id]) .catch(sendError);}) //NY Excelsior Regionals, Un-Verified, Team Role
                                .catch(sendError);
                        } else {
                            message.channel.messages.fetch({
                                limit: 100,
                               }).then((messages) => {
                                    console.log(messages);
                                    messages = Array.from(messages.filter(m => m.author.id == message.author.id || (m.author.id == botId && m.mentions.users.get(message.author.id) != undefined)).values());
                                    message.channel.bulkDelete(messages)
                                        .then(function () {
                                            message.reply("Found team " + teamName + " - " + str + "! Welcome to the discord!").then(messanger => {
                                                message.member.roles.set(["xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx", role]); //NY Excelsior Regionals, Competition Participant, Team Role
                                            })
                                            .catch(sendError);
                                        })
                                        .catch(error => console.log(error.stack));
                               });
                        }
                    } else {
                        if (role == false) {
                            message.reply("Found team " + teamName + " - " + str + "! Welcome to the discord!");
                            message.guild.roles.create({
                                name: (str + " " + teamName),
                                position: 4,
                                hoist: true,
                                mentionable: true
                            })
                                .then(newRole => message.member.roles.set(["xxxxxxxxxxxxxxxx", newRole.id])) //Un-Verified, Team Role
                                .catch(sendError);
                        } else {
                            message.channel.messages.fetch({
                                limit: 100,
                               }).then((messages) => {
                                    console.log(messages);
                                    messages = Array.from(messages.filter(m => m.author.id == message.author.id || (m.author.id == botId && m.mentions.users.get(message.author.id) != undefined)).values());
                                    message.channel.bulkDelete(messages)
                                        .then(function () {
                                            message.reply("Found team " + teamName + " - " + str + "! Welcome to the discord!").then(messanger => {
                                                message.member.roles.set(["xxxxxxxxxxxxxxxx", role]); //Competition Participant, Team Role
                                            })
                                            .catch(sendError);
                                        })
                                        .catch(error => console.log(error.stack));
                               });
                        }
                    }
                    
                    //Set method removes Un-Verified role if Team Role was not created


                    return;
                }
            }));
            if (str == '') {
                message.reply("Could not find any Teams with: " + teamName + ". Please fill out this form below and then try again. \n\nForm: https://forms.gle/XmCPF9zJ74RHXoA69")
                    .catch(sendError);
            } else {
                message.member.setNickname(realName + ' | ' + teamName)
                    .catch(sendError);

                if (role  == false) {
                    message.reply("Please enter the color you want for your team role using the command ` !color ` followed by the color in hex, rgb, or simple color string. If you wish to change the color again after this time, use the same command to change it.(i.e. For White: Hex - `!color #ffffff`, RGB - `!color [255, 255, 255]`, Color String - `!color White` (Note: Works with very few colors - use `!color-names` to see all the color strings that work. Case doesn't matter for the color))")
                        .catch(sendError);
                }
            }
        } else {
            message.reply("Error: Could not find any Team Data. Try again later.")
                .catch(sendError);
            console.log('No data found.');
        }
    });
  }

  function addTeamColor(theColor, message) {
    var role = getNonGenericRole(message.member)
    
    console.log(theColor);

    var colorText = theColor;

    if (colorText.trim()[0] == "[") {
        JSON.parse(colorText.trim());
        try {
            colorText = JSON.parse(colorText.trim());
        } catch (error) {
            console.log("Not array");
            console.log(error);
            colorText = isNaN(Number(theColor.trim())) ? theColor.trim().replace(/ /g,'_').toUpperCase() : Number(theColor.trim());

        }
    } else {
        colorText = isNaN(Number(theColor.trim())) ? theColor.trim().replace(/ /g,'_').toUpperCase() : Number(theColor.trim());
    }

    if (colorText == "MAROON") {
        colorText = "#901515";
    }

    if (role != false) {
        const oldColor = role.color;

        role.edit({
            color: colorText,
        })
            .then(newRole => {
                if (newRole.color != oldColor) {
                    message.member.roles.remove(["xxxxxxxxxxxxxxxx"]).then(unverRole => {
                        message.channel.messages.fetch({
                            limit: 100,
                        }).then((messages) => {
                            messages = Array.from(messages.filter(m => m.author.id == message.author.id || (m.author.id == botId && m.mentions.users.get(message.author.id) != undefined)).values());
                            console.log(messages);
                            message.channel.bulkDelete(messages)
                                .then(function () {
                                    message.reply("Color: `" + theColor.trim() + "` set for " + newRole.name + "! Welcome to the server!").then(messenger => {
                                        message.member.roles.add(["xxxxxxxxxxxxxxxx"]);
                                    })
                                    .catch(sendError(errorMessage));
                                })
                                .catch(error => console.log(error.stack));
                        });
                    });
                } else {
                    message.reply("Invalid Format. Did not recognize the new color. You must change your color from the default color.");
                }    
            })
            .catch(errorMessage => {
                message.channel.send("Error: " + errorMessage);
                console.error(errorMessage);
            });
    }
  }

  function changeTeamColor(theColor, message) {
    var role = getNonGenericRole(message.member)

    console.log(theColor);

    var colorText = theColor;

    if (colorText.trim()[0] == "[") {
        JSON.parse(colorText.trim());
        try {
            colorText = JSON.parse(colorText.trim());
        } catch (error) {
            console.log("Not array");
            console.log(error);
            colorText = isNaN(Number(theColor.trim())) ? theColor.trim().replace(/ /g,'_').toUpperCase() : Number(theColor.trim());

        }
    } else {
        colorText = isNaN(Number(theColor.trim())) ? theColor.trim().replace(/ /g,'_').toUpperCase() : Number(theColor.trim());
    }

    if (colorText == "MAROON") {
        colorText = "#901515";
    }

    if (role != false) {
        const oldColor = role.color;

        role.edit({
            color: colorText,
        })
            .then(newRole => {
                if (newRole.color != oldColor) {
                    message.reply("Color: `" + theColor.trim() + "` set for " + newRole.name + "!");
                } else {
                    message.channel.send("Invalid Format. Did not recognize the new color. \nThis can occur when the formatting is invalid or the new color is identical to the old color.");
                }
            })
            .catch(errorMessage => {
                message.channel.send("Error: " + errorMessage);
                console.error(errorMessage);
            });
    }
  }

  function printColorNames(message, welcomePage = false) {
      var text = `
      - DEFAULT
      - WHITE
      - AQUA
      - GREEN
      - BLUE
      - YELLOW
      - PURPLE
      - LUMINOUS_VIVID_PINK
      - GOLD
      - ORANGE
      - RED
      - GREY
      - DARKER_GREY
      - NAVY
      - MAROON
      - DARK_AQUA
      - DARK_GREEN
      - DARK_BLUE
      - DARK_PURPLE
      - DARK_VIVID_PINK
      - DARK_GOLD
      - DARK_ORANGE
      - DARK_RED
      - DARK_GREY
      - LIGHT_GREY
      - DARK_NAVY
      - RANDOM`

      if (welcomePage) {
          text = text.substring(16) + " (May not work in this channel)"
      }

      reply(message, text);
  }

  async function findRoleEndsWith(str, guild) {
    var theRoleId = false;
    var guildRoles = await guild.roles.fetch();
    guildRoles.forEach(function (value, roleId) {
        if (!['xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx'].includes(roleId)) {
            if (guildRoles.get(roleId).name.endsWith(str)) {
                theRoleId = roleId;
                console.log(guildRoles.get(roleId).name);
                return;
            }
        }
    });
    return theRoleId;
  }

  function getNonGenericRole(member) {
    var theValue = false;
    member.roles.cache.forEach(function (value, roleId) {
        if (!['xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx'].includes(roleId)) {
            theValue = value;
            return;
        }
    });
    return theValue;
  }

  function getRequest(content) {
      for (var arg in content) {
          // If mention, role, channel or nothing then continue
          if ((content[arg].startsWith('<@') && content[arg].endsWith('>')) || (content[arg].startsWith('<#') && content[arg].endsWith('>')) || content[arg].trim() == "@everyone" || content[arg].trim() == '') {
              continue;
          }
          return arg;
      }
      return 0;
  }

  function reply(message, reply, options = {}, defaultReply = true) {
    if (message.channel.isTextBased() && !message.channel.isDMBased()) { 
        var theRole = message.member.roles.cache.get("xxxxxxxxxxxxxxxx");
        if (theRole == undefined && message.author.id != alexId) {
            if (message.mentions.users.size == 0 && message.mentions.roles.size == 0) {
                if (defaultReply) {
                    if (typeof reply == Array) {
                        message.reply(reply[0]);

                        reply.shift();

                        for (var a in reply) {
                            message.channel.send(reply[a]);
                        }
                        message.channel.send(options)
                    } else {
                        options["content"] = reply;
                        message.reply(options);
                    }
                } else {
                    if (typeof reply == Array) {
                        message.channel.send(reply[0]);

                        reply.shift();

                        for (var a in reply) {
                            message.channel.send(reply[a]);
                        }
                        message.channel.send(options)
                    } else {
                        options["content"] = reply;
                        message.channel.send(options);
                    }
                }
                return;
            } else {
                var str = '';

                message.mentions.users.forEach(function (user, userId) {
                    str += "<@" + userId + "> ";
                });
                
                console.log(message.mentions.roles.size);

                if (message.mentions.roles.size != 0) {
                    if (message.guild.id == VCGuildId) {
                        var role = getNonGenericRole(message.member);

                        if (role != false) {
                            message.mentions.roles.forEach(function (role, roleId) {
                                console.log("HEREREGEE2");
                                console.log(role);
                                if (message.mentions.roles[roleMention].id == role.id) {
                                    str += "<@" + roleId + "> ";
                                }
                            });
                        }
                    } else {
                        message.mentions.roles.forEach(function (role, roleId) {
                            str += "<@" + roleId + "> ";
                        });
                    }
                }

                if (typeof reply == Array) {
                    message.channel.send(str + reply[0]);

                    reply.shift();

                    for (var a in reply) {
                        message.channel.send(reply[a]);
                    }
                    message.channel.send(options)
                } else {
                    options["content"] = str + reply;
                    message.channel.send(options);
                }
            }
        } else {
            console.log("HEREREGEE");
            if (message.mentions.users.size == 0 && message.mentions.roles.size == 0 && message.mentions.channels.size == 0 && !message.mentions.everyone) {
                if (defaultReply) {
                    if (typeof reply == Array) {
                        message.reply(reply[0]);

                        reply.shift();

                        for (var a in reply) {
                            message.channel.send(reply[a]);
                        }
                        message.channel.send(options)
                    } else {
                        options["content"] = reply;
                        message.reply(options);
                    }
                } else {
                    if (typeof reply == Array) {
                        message.channel.send(reply[0]);

                        reply.shift();

                        for (var a in reply) {
                            message.channel.send(reply[a]);
                        }
                        message.channel.send(options)
                    } else {
                        options["content"] = reply;
                        message.channel.send(options);
                    }
                }
                return;
            } else {
                var str = '';

                if (message.mentions.everyone) {
                    if (typeof reply == Array) {
                        message.channel.send('@everyone ' + reply[0]);
        
                        reply.shift();
        
                        for (var a in reply) {
                            message.channel.send(reply[a]);
                        }
                        message.channel.send(options)
                    } else {
                        options["content"] = '@everyone ' + reply;
                        message.channel.send(options);
                    }
                    return;
                }

                message.mentions.users.forEach(function (user, userId) {
                    str += "<@" + userId + "> ";
                });
                
                console.log(message.mentions.roles.size);

                message.mentions.roles.forEach(function (role, roleId) {
                    console.log("HEREREGEE2");
                    console.log(role);
                    str += "<@&" + roleId + "> ";
                });

                /*message.mentions.channels.forEach( function (channel, channelId) {
                    str += "<@" + channelId + "> ";
                });*/

                if (typeof reply == Array) {
                    message.channel.send(str + reply[0]);

                    reply.shift();

                    for (var a in reply) {
                        message.channel.send(reply[a]);
                    }
                    message.channel.send(options)
                } else {
                    options["content"] = str + reply;
                    message.channel.send(options);
                }
            }
        }
    } else {
        if (defaultReply) {
            if (typeof reply == Array) {
                message.reply(reply[0]);

                reply.shift();

                for (var a in reply) {
                    message.channel.send(reply[a]);
                }
                message.channel.send(options)
            } else {
                options["content"] = reply;
                message.reply(options);
            }
        } else {
            if (typeof reply == Array) {
                message.channel.send(reply[0]);

                reply.shift();

                for (var a in reply) {
                    message.channel.send(reply[a]);
                }
                message.channel.send(options)
            } else {
                options["content"] = reply;
                message.channel.send(options);
            }
        }
    }
  }

  function replyWithReturn(message, reply, options = {}, defaultReply = true) {
    if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        var theRole = message.member.roles.cache.get("xxxxxxxxxxxxxxxx")
        if (theRole == undefined && message.author.id != alexId) {
            if (message.mentions.users.size == 0 && message.mentions.roles.size == 0) {
                if (defaultReply) {
                    options["content"] = reply;
                    return message.reply(options);
                } else {
                    options["content"] = reply;
                    return message.channel.send(options);
                }
            } else {
                var str = '';

                message.mentions.users.forEach(function (user, userId) {
                    str += "<@" + userId + "> ";
                });
                
                console.log(message.mentions.roles.size);

                if (message.mentions.roles.size != 0) {
                    if (message.guild.id == VCGuildId) {
                        var role = getNonGenericRole(message.member);

                        if (role != false) {
                            message.mentions.roles.forEach(function (role, roleId) {
                                console.log("HEREREGEE2");
                                console.log(role);
                                if (message.mentions.roles[roleMention].id == role.id) {
                                    str += "<@" + roleId + "> ";
                                }
                            });
                        }
                    } else {
                        message.mentions.roles.forEach(function (role, roleId) {
                            str += "<@" + roleId + "> ";
                        });
                    }
                }
                
                options["content"] = str + reply;
                return message.channel.send(options);
            }
        } else {
            console.log("HEREREGEE");
            if (message.mentions.users.size == 0 && message.mentions.roles.size == 0 && message.mentions.channels.size == 0 && !message.mentions.everyone) {
                if (defaultReply) {
                    options["content"] = reply;
                    return message.reply(options);
                } else {
                    options["content"] = reply;
                    return message.channel.send(options);
                }
            } else {
                var str = '';

                if (message.mentions.everyone) {
                    options["content"] = '@everyone ' + reply;
                    return message.channel.send(options);
                }

                message.mentions.users.forEach(function (user, userId) {
                    str += "<@" + userId + "> ";
                });
                
                console.log(message.mentions.roles.size);

                message.mentions.roles.forEach(function (role, roleId) {
                    console.log("HEREREGEE2");
                    console.log(role);
                    str += "<@&" + roleId + "> ";
                });

                /*message.mentions.channels.forEach( function (channel, channelId) {
                    str += "<@" + channelId + "> ";
                });*/
                options["content"] = str + reply;
                return message.channel.send(options);
            }
        }
    } else {
        if (defaultReply) {
            options["content"] = reply;
            return message.reply(options);
        } else {
            options["content"] = reply;
            return message.channel.send(options);
        }
    }
  }

  function hiReply(author, username, message, id, text, options = {}, animation = true) {
      if (author.id == alexId && username != "AlphaBit") {
          options["content"] = "<@" + id + "> " + text;
          message.channel.send(options);
      } else {
          options["content"] = text;
          message.channel.send(options)
            .then(msg => {
                if (animation) {
                    message.channel.send("<a:Hello:xxxxxxxxxxxxxxxx>");
                }
            })
            .catch(sendError);
      }
  }

  function ascii_to_base(uni, base) {
    var str = U2A(uni);

    var length = Math.ceil(Math.log(256) / Math.log(base));

    var arr1 = [];
	for (var n = 0, l = str.length; n < l; n ++) 
     {
        console.log(base);
        console.log(Number(str.charCodeAt(n)));
        var hex = Number(str.charCodeAt(n)).toString(base);
        
        for (var i = hex.length; i < length; i++) {
            hex = '0' + hex;
        }

		arr1.push(hex);
	 }
	return arr1.join(' ');
   }

   function U2A(str) {
    var reserved = '';
    var code = str.match(/&#(d+);/g);

    if (code === null) {
        return str;
    }

    for (var i = 0; i < code.length; i++) {
        reserved += String.fromCharCode(code[i].replace(/[&#;]/g, ''));
    }

    return reserved;
}

function createEggStr() {
    var str = '';

    for (var i = 0; i < easterEggs.length - 1; i++) {
        str += '0';
    }

    str += '1';

    return str;
}

async function sendResultsForPoll(poll) {
	const date = new Date();
	const diff = poll['time'].getTime() - date.getTime();

	if (diff > 0) {
		if (diff < thirtyTwoBitSignedMax) {
			pollTimeouts[poll['messageId']] = setTimeout(function(){ 
				sendResultsForPoll(poll); 
			}, diff);
		} else {
			pollTimeouts[poll['messageId']] = setTimeout(function(){ 
				sendResultsForPoll(poll); 
			}, thirtyTwoBitSignedMax);
		}
		return;
	}

	var message;
	try {
		message = await getMessageFromClient(poll['messageId'], poll['channelId']);
	} catch (error) {
		sendError(error);
	}

	var replyMessage;
    var messageReactions = message.reactions.cache;
	var reactions = await sortReactions(messageReactions);

	if (poll['messageId'] != poll['replyMessageId']) {
		try {
			replyMessage = await getMessageFromClient(poll['replyMessageId'], poll['channelId']);
		} catch (error) {
			sendError(error);
		}	
	} else {
		replyMessage = message;
	}

	var strings = [];
	var str = '**Poll Completed**\n\nQuestion: ' + poll['question'] + "\n\nAnswers:";

	var first = false;

	for (const reaction of reactions) {
		var ans = '';
		var votes = " Votes: ";

		if (reaction[0] == 0) {
			votes = " Votes ";
		}

		if (first) {
			ans += "\n\t" + reaction[0] + " - " + reaction[1] + votes + reaction[2] + '- ' + poll['answers'][reaction[0]];
		} else {
			ans += "\n\n\t" + reaction[0] + " - " + reaction[1] + votes + reaction[2] + '- ' + poll['answers'][reaction[0]];
		}

		if (str.length + ans.length > 2000) {
			strings.push(poll);
			str = "\u200b";

			if (first) {
				ans = ans.substring(1);
			} else {
				ans = ans.substring(2);
			}
		}

		first = false;

		str += ans;
	}

	if (replyMessage.mentions.users.size == 0 && replyMessage.mentions.roles.size == 0 && !replyMessage.mentions.everyone) {
		for (const string of strings) {
			message.channel.send(string);
		}

		try {
			await message.channel.send(str)
		
			message.delete();
		} catch (error) {
			message.channel.send("Message Send Error: ```" + error + "```");
			console.error(error);
		}
	} else {
		if (strings.length > 0) {
			reply(replyMessage, "\n" + strings[0]);
			strings.shift();

			for (const string of strings) {
				message.channel.send(string);
			}

			try {
				await message.channel.send(str)
			
				message.delete();
			} catch (error) {
				message.channel.send("Message Send Error: ```" + error + "```");
				console.error(error);
			}
		} else {
			try {
				replyWithReturn(replyMessage, "\n" + str);
			
				message.delete();
			} catch (error) {
				message.channel.send("Message Send Error: ```" + error + "```");
				console.error(error);
			}
		}
	}

	const index = timedPolls.indexOf(poll);
	console.log(index);

	if (index != -1) {
		timedPolls.splice(index, 1);
		setTimedPolls(message);
	}

	delete pollTimeouts[poll['messageId']];
}

function sendTimedMessage(messageInfo, startUp = false) {
	const date = new Date();
	const diff = messageInfo['time'].getTime() - date.getTime();

    console.log("In correct spot kinda");
	if (diff > 0) {
		if (diff < thirtyTwoBitSignedMax) {
			messageTimeouts[messageInfo['authorId']][messageInfo['messageId']] = setTimeout(function(){
				sendTimedMessage(messageInfo);
			}, diff);
		} else {
			messageTimeouts[messageInfo['authorId']][messageInfo['messageId']] = setTimeout(function(){
				sendTimedMessage(messageInfo);
			}, thirtyTwoBitSignedMax);
		}
		return;
	}
	if ((messageInfo['authors'] == undefined && messageInfo['channels'] == undefined) || (messageInfo['authors'].length == 0 && messageInfo['channels'].length == 0)) {
		client.channels.fetch(messageInfo['channelId'])
			.then(channel => {
                if (messageInfo['fromBot'] == undefined || messageInfo['fromBot'] == false) {
                    channel.send("Timed Message from <@" + messageInfo['authorId'] + ">:")
                        .then(msg => {
                            channel.send(messageInfo['message']);
                            messageIsTimedMessage = messageInfo['message'];
                        })
                        .catch(errorMessage => {
                            channel.send("Message Send Error: ```" + errorMessage + "```");
                            console.error(errorMessage);
                        });
                } else {
                    console.log("In correct spot");
                    channel.send(messageInfo['message']);
                    messageIsTimedMessage = messageInfo['message'];
                }

		        const index = timedMessages.indexOf(messageInfo);
		        console.log("Index: ");
				console.log(index);
                // console.log(timedMessages);
                // console.log(messageInfo);

				if (index != -1) {
					timedMessages.splice(index, 1);
					setTimedMessages(channel);
				}
			})
			.catch(sendError);
	} else {
        if (messageInfo['authors'] != undefined) {
		    sendTimedDmMessage(messageInfo);
        }

        if (messageInfo['channels'] != undefined) {
            sendTimedChannelsMessage(messageInfo);
        }
	}

	try {
		delete messageTimeouts[messageInfo['authorId']][messageInfo['messageId']];
	} catch (error) {
		if (!startUp) {
			console.log("Can't delete Message Timeout because it didn't exist. This is expected if the bot just started up and had to send a timed message.");
			sendError(error);
		}
	}
}

function sendTimedDmMessage(messageInfo) {
	for (const userId of messageInfo['authors']) {
		console.log(userId);
		client.users.fetch(userId)
			.then(user => {
				user.createDM()
					.then(channel => {
						if (messageInfo['fromBot'] == undefined || messageInfo['fromBot'] == false) {
                            channel.send("Timed Message from <@" + messageInfo['authorId'] + ">:")
                                .then(msg => {
                                    channel.send(messageInfo['message']);
                                    messageIsTimedMessage = messageInfo['message'];
                                })
                                .catch(errorMessage => {
                                    channel.send("Message Send Error: ```" + errorMessage + "```");
                                    console.error(errorMessage);
                                });
                        } else {
                            channel.send(messageInfo['message']);
                            messageIsTimedMessage = messageInfo['message'];
                        }
					    const index = timedMessages.indexOf(messageInfo);
				        console.log("Index2: ");
						console.log(index);
                        // console.log(timedMessages);
                        // console.log(messageInfo);

						if (index != -1) {
							timedMessages.splice(index, 1);
							setTimedMessages(channel);
						}

					})
					.catch(sendError)
			})
			.catch(sendError);
	}
}

function sendTimedChannelsMessage(messageInfo) {
	for (const channelId of messageInfo['channels']) {
		console.log(channelId);
		client.channels.fetch(channelId)
			.then(channel => {
				if (messageInfo['fromBot'] == undefined || messageInfo['fromBot'] == false) {
                    channel.send("Timed Message from <@" + messageInfo['authorId'] + ">:")
                        .then(msg => {
                            channel.send(messageInfo['message']);
                            messageIsTimedMessage = messageInfo['message'];
                        })
                        .catch(errorMessage => {
                            channel.send("Message Send Error: ```" + errorMessage + "```");
                            console.error(errorMessage);
                        });
                } else {
                    channel.send(messageInfo['message']);
                    messageIsTimedMessage = messageInfo['message'];
                }
                const index = timedMessages.indexOf(messageInfo);
                console.log("Index3: ");
                console.log(index);
                //console.log(timedMessages);
                //console.log(messageInfo);

                if (index != -1) {
                    timedMessages.splice(index, 1);
                    setTimedMessages(channel);
                }
			})
			.catch(sendError);
	}
}

async function getMessageFromClient(messageId, channelId) {
	var channel;
	var message;

	try {
		channel = await client.channels.fetch(channelId);
		message = await channel.messages.fetch(messageId);
	} catch (error) {
		sendError(error);
	}

	return message;
}

async function sortReactions(reactions) {
	var sortedReactions = [];

    for (var [reactionId, reaction] of reactions)  {
		var users = '';
        var reactionUsers = await reaction.users.fetch();
		reactionUsers.forEach(function (user, userId) {
			if (userId != botId) {
				users += '<@' + userId + '> ';
			}
		});
		sortedReactions.push([reaction.emoji.name, reaction.count - 1 /*subtract the bot*/, users]);
	};

	sortedReactions.sort(function(a, b) {
		return b[1] - a[1];
	});

	return sortedReactions;
}


function getEasterEggs(message, id = '') {

    var memberId = id == '' ? message.author.id : id;

    sheets.spreadsheets.values.get({
      spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
      range: 'A2:A',
    }, (err, res) => {
        if (err) {

            if (!firstLoginTry) {
                firstLoginTry = false;
                startSheets();
                getEasterEggs(message, id);
            } else {
                console.log(err);
                message.channel.send("```Error: " + err.errors[0].message + "\n\tCode: " + err.code + "```");
            }

            return;
        }

      firstLoginTry = true;

      var index;

      const rows = res.data.values;

      console.log(rows);
      console.log("HELLO");

      if (rows && rows.length) {
        rows.map((row) => {
            if (row[0] == memberId) {
                index = rows.indexOf(row);
                sheets.spreadsheets.values.get({
                    spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
                    range: 'B' + (index + 2),
                }, (err2, res2) => {
                    if (err2) {
                        console.log(err2);
                        message.channel.send("```Error: " + err2.errors[0].message + "\n\tCode: " + err2.code + "```");
            
                        return;
                    } else {
                        if (res2.data.values) {
                            var eggs = res2.data.values[0][0];

                            if (eggs.length < easterEggs.length) {

                                var nickname = eggs.charAt(eggs.length - 2);
                                var eastEggs = eggs.charAt(eggs.length - 3);
                                var eastEggNum = eggs.charAt(eggs.length - 4);

                                eggs = eggs.replaceAt(eggs.length - 1, "0");
                                eggs = eggs.replaceAt(eggs.length - 2, "0");
                                eggs = eggs.replaceAt(eggs.length - 3, "0");
                                eggs = eggs.replaceAt(eggs.length - 4, "0");

                                for (var i = eggs.length; i < easterEggs.length; i++) {
                                    eggs += '0';
                                }
                                eggs = eggs.replaceAt(eggs.length - 1, "1");
                                eggs = eggs.replaceAt(eggs.length - 2, nickname);
                                eggs = eggs.replaceAt(eggs.length - 3, eastEggs);
                                eggs = eggs.replaceAt(eggs.length - 4, eastEggNum);
                            }

                            message.author.createDM()
								.then(channel => {
		                            if (id == '') {
		                                var arr = messageForEasterEggs(message, eggs);
		                                for (var a in arr) {
		                                    console.log(a);
		                                    channel.send(arr[a]);
		                                }
		                            } else {
		                                var arr = messageForEasterEggs(message, eggs);
		                                message.channel.send("<@" + memberId + ">, " + arr[0]);
		                                arr.shift();
		                                for (var a in arr) {
		                                    channel.send(arr[a]);
		                                }
		                            }
		                        })
		                        .catch(errorMessage => {
					                message.channel.send("Message Send Error: ```" + errorMessage + "```");
					                console.error(errorMessage);
					            });
                        }
                    }
                });
            }
        });

        if (index == undefined) {
            var str = createEggStr();
            sheets.spreadsheets.values.append({
                spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
                range: 'A2:B2',
                valueInputOption: 'RAW',
                resource: { values: [[memberId, str]] },
            }, (err2, res2) => {
                if (err2) {
                    console.log(err2);
                    message.channel.send("```Error: " + err2.errors[0].message + "\n\tCode: " + err2.code + "```");
        
                    return;
                } else {
                    if (id == '') {
                        var arr = messageForEasterEggs(message, eggs);
    						
    					message.author.createDM()
	                		.then(channel => {
								for (var a in arr) {
		                            channel.send(arr[a]);
		                        }
	                		})
	                		.catch(errorMessage => {
				                message.channel.send("Message Send Error: ```" + errorMessage + "```");
				                console.error(errorMessage);
				            });
                        
                    } else {
                        var arr = messageForEasterEggs(message, eggs);
                        message.channel.send("<@" + memberId + ">, " + arr[0]);
                        arr.shift();
                        for (var a in arr) {
                            message.channel.send(arr[a]);
                        }
                    }
                }
            });
        }
      } else {
        var str = createEggStr();
        sheets.spreadsheets.values.append({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'A2:B2',
            valueInputOption: 'RAW',
            resource: { values: [[memberId, str]] },
        }, (err2, res2) => {
            if (err2) {
                console.log(err2);
                message.channel.send("```Error: " + err2.errors[0].message + "\n\tCode: " + err2.code + "```");
    
                return;
            } else {
            	message.author.createDM()
            		.then(channel => {
		                if (id == '') {
		                    var arr = messageForEasterEggs(message, eggs);

		                    for (var a in arr) {
		                        channel.send(arr[a]);
		                    }

	                    } else {
		                    var arr = messageForEasterEggs(message, eggs);
		                    message.channel.send("<@" + memberId + ">, " + arr[0]);
		                    arr.shift();
		                    for (var a in arr) {
		                        channel.send(arr[a]);
		                    }
	                	}		
            		})
            		.catch(errorMessage => {
		                message.channel.send("Message Send Error: ```" + errorMessage + "```");
		                console.error(errorMessage);
		            });
            }
        });
      }
    });
}

function updateEasterEgg(message, num) {

    var memberId = message.author.id;

    console.log("MFRD");
    console.log(memberId);

    sheets.spreadsheets.values.get({
      spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
      range: 'A2:A',
    }, (err, res) => {
        if (err) {

            if (!firstLoginTry) {
                firstLoginTry = false;
                startSheets();
                updateEasterEgg(message, num);
            } else {
                console.log(err);
                message.channel.send("```Error: " + err.errors[0].message + "\n\tCode: " + err.code + "```");
            }

            return;
        }

      firstLoginTry = true;

      var index;
      var maxIndex;

      const rows = res.data.values;
      if (rows && rows.length) {

        rows.map((row) => {
            if (maxIndex == undefined && row.length == 0) {
                maxIndex = rows.indexOf(row);
            }
            if (row[0] == memberId) {
                index = rows.indexOf(row);
                console.log("HELLO");
                console.log(index);
                sheets.spreadsheets.values.get({
                    spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
                    range: 'B' + (index + 2),
                }, (err2, res2) => {
                    if (err2) {
                        console.log(err2);
                        message.channel.send("```Error: " + err2.errors[0].message + "\n\tCode: " + err2.code + "```");
            
                        return;
                    } else {
                        if (res2.data.values) {
                            var eggs = res2.data.values[0][0];

                            if (eggs.length < easterEggs.length) {

                                var nickname = eggs.charAt(eggs.length - 2);
                                var eastEggs = eggs.charAt(eggs.length - 3);
                                var eastEggNum = eggs.charAt(eggs.length - 4);

                                eggs = eggs.replaceAt(eggs.length - 1, "0");
                                eggs = eggs.replaceAt(eggs.length - 2, "0");
                                eggs = eggs.replaceAt(eggs.length - 3, "0");
                                eggs = eggs.replaceAt(eggs.length - 4, "0");

                                for (var i = eggs.length; i < easterEggs.length; i++) {
                                    eggs += '0';
                                }
                                eggs = eggs.replaceAt(eggs.length - 1, "1");
                                eggs = eggs.replaceAt(eggs.length - 2, nickname);
                                eggs = eggs.replaceAt(eggs.length - 3, eastEggs);
                                eggs = eggs.replaceAt(eggs.length - 4, eastEggNum);
                            }

                            eggs = eggs.replaceAt(num, "1");[num];

                            sheets.spreadsheets.values.update({
                                spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
                                range: 'B' + (index + 2),
                                valueInputOption: 'RAW',
                                resource: { values: [[eggs]] },
                            }, (err2, res2) => {
                                if (err2) {
                                    console.log(err2);
                                    message.channel.send("```Error: " + err2.errors[0].message + "\n\tCode: " + err2.code + "```");
                        
                                    return;
                                }
                            });
                        }
                    }
                });
            }
        });

        if (index == undefined) {
            var str = createEggStr();
            str = str.replaceAt(num,"1");
            if (maxIndex == undefined) {
                sheets.spreadsheets.values.append({
                    spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
                    range: 'A2:B2',
                    valueInputOption: 'RAW',
                    resource: { values: [[message.author.id, str]] },
                }, (err2, res2) => {
                    if (err2) {
                        console.log(err2);
                        message.channel.send("```Error: " + err2.errors[0].message + "\n\tCode: " + err2.code + "```");
            
                        return;
                    }
                    console.log(res2);
                });
            } else {
                sheets.spreadsheets.values.update({
                    spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
                    range: 'A' + (maxIndex + 2) + ':B' + (maxIndex + 2),
                    valueInputOption: 'RAW',
                    resource: { values: [[message.author.id, str]] },
                }, (err2, res2) => {
                    if (err2) {
                        console.log(err2);
                        message.channel.send("```Error: " + err2.errors[0].message + "\n\tCode: " + err2.code + "```");
            
                        return;
                    }
                    console.log(res2);
                });
            }
        }
      } else {
        var str = createEggStr();
        str[num] = '1';
        sheets.spreadsheets.values.append({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'A2:B2',
            valueInputOption: 'RAW',
            resource: { values: [[message.author.id, str]] },
        }, (err2, res2) => {
            if (err2) {
                console.log(err2);
                message.channel.send("```Error: " + err2.errors[0].message + "\n\tCode: " + err2.code + "```");
    
                return;
            }
        });
      }
    });
}

function setEasterEggsNames(message, sendReply = true) {

    return new Promise ((resolve, reject) => {
        sheets.spreadsheets.values.get({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'A2:E',
            }, async (err, res) => {
                if (err) {

                    if (!firstLoginTry) {
                        firstLoginTry = false;
                        startSheets();
                        return setEasterEggsNames();
                    } else {
                        console.log(err);
                        message.channel.send("```Error: " + err/*.errors[0]*/.message + "\n\tCode: " + err.code + "```");
                        reject(err);
                    }

                    return;
                }

                firstLoginTry = true;

                var index;

                const rows = res.data.values;

                console.log(rows);
                console.log("HELLO");

                var nicknames = [];

                if (rows && rows.length) {
                   await Promise.all(rows.map(async (row) => {
                        console.log(row[0]);
                        var guildMembers = await message.guild.members.fetch();
                        var member;
                        try {
                            member = guildMembers.get(row[0]).nickname != null ? guildMembers.get(row[0]).nickname : (row[3] != "" ? row[3] : guildMembers.get(row[0]).user.username);

                            if (message.guild.id == VCGuildId) {
                                var name = member.substring(0, member.lastIndexOf('|')).trim();
                                var team = member.substring(member.lastIndexOf('|') + 1).trim();
    
                                nicknames.push([name, team]);
                            } else if (ServerCodesForEEs[message.guild.id] != undefined) {
                                nicknames.push([member, ServerCodesForEEs[message.guild.id]]);
                            } else {
                                nicknames.push([member, ""]);
                            }
                        } catch (error) {
                            console.error(error);
                            nicknames.push([row[3], row[4]]); 
                        }
                    }));

                    var theRange = 'D2:E';

                    sheets.spreadsheets.values.update({
                        spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
                        range: theRange + (nicknames.length + 1),
                        valueInputOption: 'RAW',
                        resource: { values: nicknames },
                    }, (err2, res2) => {
                        if (err2) {
                            console.log(err2);
                            message.channel.send("```Error: " + err2.errors[0].message + "\n\tCode: " + err2.code + "```");

                            reject(err2);
                
                            return;
                        } else {
                            if (sendReply) {
                                reply(message, "Easter Egg Names Updated");
                            }
                            resolve();
                        }
                    });

                }
        });
    });
}

function messageForEasterEggs(message, str, sevenths = -1) {
    var final = '';

    var finalArr = [];
    
    var num = 0;

    console.log(str);
    for (var j = 0; j < easterEggs.length; j++) {
        var  i = easterEggsInOrder.indexOf(easterEggs[j]);
        /*console.log(i);
        console.log(str.charAt(i));*/
        var seventhsNum = easterEggs.length / 7;
        var seventhsNumLarge = seventhsNum * (sevenths + 1);

        seventhsNum *= sevenths;
        if ((seventhsNum <= j && seventhsNumLarge > j) || str.charAt(i) == '1') {
            //console.log(str.charAt(i));
            num++;
            if (easterEggsInOrder[i] == "Nickname") {
                if (message.channel.isTextBased() && !message.channel.isDMBased()) {
                    console.log(final.length);
                    if (final.length > 1800) {
                        finalArr.push(final);
                        final = "\u200b";
                    }
                    final += "\t - " + (message.channel.members.get(botId).nickname != null ? message.channel.members.get(botId).nickname : message.channel.members.get(botId).user.username) + "\n";
                } else {
                    if (final.length > 1800) {
                        finalArr.push(final);
                        final = "\u200b";
                    }
                    final += "\t - " + client.user.username + "\n";
                }
            } else {
                if (final.length > 1800) {
                    finalArr.push(final);
                    final = "\u200b";
                }
                final += "\t - " + easterEggsInOrder[i] + "\n";
            }
        }
    }
    if (final.length > 0) {
        finalArr.push(final);
        if (num == 1) {
            finalArr[0] = '1 Easter Egg Found:\n' + finalArr[0];
        } else {
            finalArr[0] = num + ' Easter Eggs Found:\n' + finalArr[0];
        }
    } else {
        final = "No Easter Eggs Found :(";
        finalArr.push(final);
    }


    console.log(final.length);
    console.log(finalArr);

    return finalArr;
}

async function startDeleteMessages(message, num, bot = false, dm = false, author = undefined, textChannel = undefined) {
	if (!dm) {
        try {
        	await message.delete();
        } catch (error) {
        	console.log(error.stack);
            message.reply("```Error: " + error.stack + '```');
        }
    }
    deleteMessages(message, num, bot, dm, author, textChannel);
}

async function deleteMessages(message, num, bot = false, dm = false, author = undefined, textChannel = undefined) {
    var channel = !dm || author == undefined ? (textChannel == undefined ? message.channel : textChannel[0]) : author[0].dmChannel;
    console.log(textChannel);
    console.log(channel);
    if (author != undefined && (channel == undefined || channel == null)) {
        channel = await author[0].createDM();
    }
    if (channel == undefined || channel == null) {
        message.reply('```Error: Could not find channel for user```');
    } else if (num == -1 || bot || dm) {
        var notEnough = false;
        channel.messages.fetch({
            limit: 100,
            })
            .then((messages) => {
                if (bot || dm) {
                    if (num == -1) { 
                        messages = Array.from(messages.filter(m => m.author.id == botId).values());
                    } else {
                        var theNum = 0;
                        messages = Array.from(messages.filter(m => {
                            if (m.author.id == botId) {
                                theNum++;
                                return theNum <= num;
                            }
                            return false
                        }).values());
                        if (theNum < num) {
                            notEnough = theNum;
                        }
                    }
                }
                if (dm) {
                    for (var i = 0; i < messages.length; i++) {
                        console.log("Deleting: " + messages[i].content);
                        messages[i].delete()
                            .catch(error => {
                                console.log(error.stack)
                                message.reply("```Error: " + error.stack + '```');
                            });
                    }
                } else {
                    for (var i = 0; i < messages.length; i++) {
                        console.log("Deleting: " + messages[i].content);
                    }

                    channel.bulkDelete(messages)
                        .catch(error => {
                            console.log(error.stack)
                            message.reply("```Error: " + error.stack + '```');
                        });
                }
                if (notEnough != false) {
                    message.reply("Ristricted: Could not delete " + num + " messages. Only deleted: " + notEnough + " messages.");
                }
            });
    } else {
        var notEnough = false;
        if (author == undefined) {
            channel.messages.fetch({
                limit: num < 100 ? num : 100,
                }).then((messages) => {
                    for (var i = 0; i < messages.length; i++) {
                        console.log("Deleting: " + messages[i].content);
                    }

                    channel.bulkDelete(messages)
                        .catch(error => {
                            console.log(error.stack)
                            message.reply("```Error: " + error.stack + '```');
                        });
        		});
            if (num > 100) {
                notEnough = 100;
            }
        } else {
            channel.messages.fetch({
                limit: 100,
                })
                .then((messages) => {
                    var theNum = 0;
                    messages = Array.from(messages.filter(m => {
                        if (author.includes(m.author)) {
                            theNum++;
                            return theNum <= num;
                        }
                        return false
                    }).values());
                    for (var i = 0; i < messages.length; i++) {
                        console.log("Deleting: " + messages[i].content);
                    }
                    channel.bulkDelete(messages)
                        .catch(error => {
                            console.log(error.stack)
                            message.reply("```Error: " + error.stack + '```');
                        });
                        if (theNum < num) {
                            notEnough = theNum;
                        }
            });
        }
        if (notEnough != false) {
            message.reply("Ristricted: Could not delete " + num + " messages. Only deleted: " + notEnough + " messages.");
        }
    }
}

function getEasterEggPeople(message, team = '') {

    console.log(team);

    var memberId = message.author.id;

    console.log("MFRD");
    console.log(memberId);

    var range = 'E2:E';

    if (team == '') {
        range = 'C2:E';
    }

    sheets.spreadsheets.values.get({
      spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
      range: range,
    }, (err, res) => {
        if (err) {

            if (!firstLoginTry) {
                firstLoginTry = false;
                startSheets();
                getEasterEggPeople(message, team);
            } else {
                console.log(err);
                message.channel.send("```Error: " + err.errors[0].message + "\n\tCode: " + err.code + "```");
            }

            return;
        }

      firstLoginTry = true;

      var index1 = -1;
      var index2 = -1;

      var str = '';
      var arr = [];

      var notKnown = false;

      const rows = res.data.values;
      if (rows && rows.length) {

        rows.map((row) => {
            if (team == '') {
                if (str.length > 1800) {
                    arr.push(str);
                    str = '\u200b';
                }
                console.log(row);
                var name = row[1] == undefined ? "Unknown" : row[1];
                var number  = row[2] == undefined ? "Unknown Team" : row[2];

                if (row[1] == undefined || row[2] == undefined) {
                    notKnown = true;
                }

                str += '\n\t' + name + ' - ' + number + ': ' + row[0];
            } else {
                if (index1 == -1) {
                    console.log(row[0]);
                    if (row[0] == team) {
                        index1 = rows.indexOf(row);
                    }
                } else {
                    if (row[0] != team) {
                        index2 = rows.indexOf(row);
                    }
                }
            }
        });

        if (team == '') {
            if (arr.length > 0 || str.length > 0) {
                arr.push(str);
                arr[0] = "Members with Easter Egg Count:" + arr[0];

                if (notKnown) {
                    arr.push("Please run this comamnd in the server of the unknonwn user to allow me to determine who all the Unknowns are. Warning: It will send the message in a dm, but will allow me to get the name of the people. Thanks!");
                }

                console.log(arr);

                if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member))) {
                    reply(message, arr[0]);
                    arr.shift();
                    for (var a in arr) {
                        message.channel.send(arr[a]);
                    }
                } else {
                    message.author.createDM()
                        .then(channel => {
                            for (var a in arr) {
                                channel.send(arr[a]);
                            }
                        })
                        .catch(errorMessage => {
                            message.channel.send("Message Send Error: ```" + errorMessage + "```");
                            console.error(errorMessage);
                        });
                    
                }
            } else {
                message.channel.send("Could not find any members with an easter egg found.");
            }
        } else {
            if (index1 == -1) {
                if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId) {
                    message.channel.send("Could not find any members on that team with an easter egg found.");
                } else {
                    message.channel.send("Could not find any members on this server with an easter egg found.");
                }
                return;
            } else if (index2 == -1) {
                index2 = rows.length;
            } 

            sheets.spreadsheets.values.get({
                spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
                range: 'C' + (index1+2) + ':E' + (index2+2),
              }, (err2, res) => {
                  if (err2) {
                      console.log(err2);
                      message.channel.send("```Error: " + err2.errors[0].message + "\n\tCode: " + err2.code + "```");
          
                      return;
                  }
          
                const rows2 = res.data.values;
                if (rows2 && rows2.length) {
          
                  rows2.map((row) => {
                  	console.log(row);
                    if (str.length > 1800) {
                        arr.push(str);
                        str = '\u200b';
                    }
                    var name = row[1] == undefined ? "Unknown" : row[1];
                    var number  = row[2] == undefined ? "Unknown Team" : row[2];

                    if (row[1] == undefined || row[2] == undefined) {
                        notKnown = true;
                    }

                    str += '\n\t' + name + ' - ' + number + ': ' + row[0];
                  });
                  if (arr.length > 0 || str.length > 0) {
                        arr.push(str);

                        if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId) {
                            arr[0] = "Members on " + team + " with Easter Egg Count:" + arr[0];
                        } else {
                            arr[0] = "Members on with Easter Egg Count:" + arr[0];
                        }
                        
                        console.log(arr);

                        if (notKnown) {
                            arr.push("Please run this comamnd in the server of the unknown to allow me to determine who the Unknowns are. Warning: It will send the message in a dm, but will allow me to get the name of the people. Thanks!");
                        }

                        if (message.author.id == alexId || (message.channel.isTextBased() && !message.channel.isDMBased() && checkIfOwner(message.member))) {
                            reply(message, arr[0]);
                            arr.shift();
                            for (var a in arr) {
                                message.channel.send(arr[a]);
                            }
                        } else {
                            message.author.createDM()
                                .then(channel => {
                                    for (var a in arr) {
                                        channel.send(arr[a]);
                                    }
                                })
                                .catch(errorMessage => {
                                    message.channel.send("Message Send Error: ```" + errorMessage + "```");
                                    console.error(errorMessage);
                                });
                            
                        }
                  } else {
                    if (message.channel.isTextBased() && !message.channel.isDMBased() && message.guild.id == VCGuildId) {
                        message.channel.send("Could not find any members with an easter egg found on team " + team);
                    } else {
                        message.channel.send("Could not find any members with an easter egg found.");
                    }
                  }
                }
            });
        }
      }
    });
}

function resetDailySpam() {
    var dict = {};

    for (const [key, value] of Object.entries(peopleMessagingDaily)) {
        if (value > 1) {
            dict[key] = value - 1;
        }
    }

    peopleMessagingDaily = dict;
}

function checkSpam(message) {
    if (Math.floor((new Date()).getTime() / (1000 * 60 * 15)) == Math.floor(min / (1000 * 60 * 15))) {
        if (peopleMessaging[message.author.id] == undefined) {
            peopleMessaging[message.author.id] = 1;

            if (peopleMessagingDaily[message.author.id] != undefined && peopleMessagingDaily[message.author.id] >= 3) {
                reply(message, "You have violated the antispam multiple times. You will not be allowed to send messaged until 7 am.");
                return true;
            }
        } else {
        	if (message.author.id != alexId) {
	            peopleMessaging[message.author.id]++;
	        }
            console.log(peopleMessaging[message.author.id]);
            if (peopleMessaging[message.author.id] == 90) {
                console.log(peopleMessaging[message.author.id]);
                reply(message, "Warning: If you send an additional 10 commands to the bot (anything starting with !) in the next " + (15 - Math.floor(((new Date()).getTime() - min) / 60000)) + " minutes, you will reach the antispam limit. You can use !message-num to see how many messages you are at.");
                return false;
            } else if (peopleMessaging[message.author.id] == 100) {
                reply(message, "You have sent too many messages to the bot in the last " + Math.floor(((new Date()).getTime() - min) / 60000) + " minutes. You will not be allowed to send messaged until the 15 min period is up.");
                
                if (peopleMessagingDaily[message.author.id] == undefined) {
                    peopleMessagingDaily[message.author.id] = 1;
                } else {
                    peopleMessagingDaily[message.author.id]++;
                }

                console.log(peopleMessagingDaily[message.author.id]);
                
                return true;
            } else if (peopleMessaging[message.author.id] > 50 || (peopleMessagingDaily[message.author.id] != undefined && peopleMessagingDaily[message.author.id] >= 3)) {
                return true;
            }
        } 
    } else {
        peopleMessaging = {};
        min = (new Date()).getTime();
        peopleMessaging[message.author.id] = 1;
        console.log(peopleMessaging[message.author.id]);
        if (peopleMessagingDaily[message.author.id] != undefined && peopleMessagingDaily[message.author.id] >= 3) {
            reply(message, "You have violated the antispam multiple times. You will not be allowed to send messaged until the 7 am.");
            return true;
        }
    }
    return false;
}

function loadTimedPolls() {
    return new Promise ((resolve, reject) => {
        sheets.spreadsheets.values.get({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'L2',
            }, (err, res) => {
                if (err) {

                    if (!firstLoginTry) {
                        firstLoginTry = false;
                        startSheets();
                        loadTimedPolls();
                    } else {
                        console.log(err);
                        reject(err);
                    }

                    return;
                }

                firstLoginTry = true;

                var index;

                const rows = res.data.values;

                if (rows && rows.length) {
                    timedPolls = JSON.parse(rows[0][0]);
                } else {
                    timedPolls = [];
                }

                resolve();
        });
    });
}

function setTimedPolls(message) {
    return new Promise ((resolve, reject) => {
        sheets.spreadsheets.values.update({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'L2',
            valueInputOption: 'RAW',
            resource: { values: [[JSON.stringify(timedPolls)]] },
        }, (err, res) => {
            if (err) {

                if (!firstLoginTry) {
                    firstLoginTry = false;
                    startSheets();
                    setTimedPolls(message);
                } else {
                    console.log(err);
                    message.channel.send("```Error: " + err.errors[0].message + "\n\tCode: " + err.code + "```");
                    reject(err);
                }

                return;
            }

            firstLoginTry = true;

            console.log("Updated Timed Polls");

            resolve();
        });
    });
}

function loadTimedMessages() {
    return new Promise ((resolve, reject) => {
        sheets.spreadsheets.values.get({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'N2',
            }, (err, res) => {
                if (err) {

                    if (!firstLoginTry) {
                        firstLoginTry = false;
                        startSheets();
                        loadTimedMessages();
                    } else {
                        console.log(err);
                        reject(err);
                    }

                    return;
                }

                firstLoginTry = true;

                var index;

                const rows = res.data.values;

                if (rows && rows.length) {
                    timedMessages = JSON.parse(rows[0][0]);
                } else {
                    timedMessages = [];
                }

                resolve();
        });
    });
}

function setTimedMessages(channel) {
    return new Promise ((resolve, reject) => {
        sheets.spreadsheets.values.update({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'N2',
            valueInputOption: 'RAW',
            resource: { values: [[JSON.stringify(timedMessages)]] },
        }, (err, res) => {
            if (err) {

                if (!firstLoginTry) {
                    firstLoginTry = false;
                    startSheets();
                    setTimedMessages(channel);
                } else {
                    console.log(err);
                    channel.send("```Error: " + err.errors[0].message + "\n\tCode: " + err.code + "```");
                    reject(err);
                }

                return;
            }

            firstLoginTry = true;

            console.log("Updated Timed Messages");

            resolve();
        });
    });
}

function loadBirthdays() {
    return new Promise ((resolve, reject) => {
        sheets.spreadsheets.values.get({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'J2',
            }, (err, res) => {
                if (err) {

                    if (!firstLoginTry) {
                        firstLoginTry = false;
                        startSheets();
                        loadBirthdays();
                    } else {
                        console.log(err);
                        reject(err);
                    }

                    return;
                }

                firstLoginTry = true;

                var index;

                const rows = res.data.values;

                console.log("HELLO");

                if (rows && rows.length) {
                    birthdays = JSON.parse(rows[0][0]);
                } else {
                    birthdays = {};
                }

                resolve();
        });
    });
}


function setBirthdays(message) {
    return new Promise ((resolve, reject) => {
        sheets.spreadsheets.values.update({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'J2',
            valueInputOption: 'RAW',
            resource: { values: [[JSON.stringify(birthdays)]] },
        }, (err, res) => {
            if (err) {

                if (!firstLoginTry) {
                    firstLoginTry = false;
                    startSheets();
                    setBirthdays(message);
                } else {
                    console.log(err);
                    message.channel.send("```Error: " + err.errors[0].message + "\n\tCode: " + err.code + "```");
                    reject(err);
                }

                return;
            }

            firstLoginTry = true;

            console.log("Updated Birthdays");

            resolve();
        });
    });
}

function loadHiddenKeyInfo() {
    return new Promise ((resolve, reject) => {
        sheets.spreadsheets.values.get({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'P2',
            }, (err, res) => {
                if (err) {

                    if (!firstLoginTry) {
                        firstLoginTry = false;
                        startSheets();
                        loadHiddenKeyInfo();
                    } else {
                        console.log(err);
                        reject(err);
                    }

                    return;
                }

                firstLoginTry = true;

                var index;

                const rows = res.data.values;

                if (rows && rows.length) {
                    var keyInfo = JSON.parse(rows[0][0]);

                    for (var name in keyInfo) {
					    // check if the property/key is defined in the object itself, not in parent
					    if (keyInfo.hasOwnProperty(name)) {           
	                    	var key = '';

	                    	var sum = parseInt(name[0]);

	                    	var clueType = parseInt(keyInfo[name].substring(keyInfo[name].length - 2));

	                    	//name = name.substring(0, name.length - 2);

	                    	for (var i = 1; i < name.length - 2; i++) {
	                    		key += (parseInt(name[i]) + 2) % 10; // - 8 + 10 (just so 2 goes back to 4 instead of -6)
	                    		sum += parseInt(name[i]);
	                    	}

	                    	sum += parseInt(name[name.length - 2]);

	                    	var x = parseInt(name[name.length - 1]);

	                    	// console.log(x);
	                    	// console.log(clueType);

	                    	if ((sum + parseInt(name[name.length - 1])) % 10 == 0 && clueType % (x + 4) == 0) {
	                    		// console.log(num);
	                    		// console.log(firstToFinishFound);
	                    		var num = parseInt(keyInfo[name].substring(0, keyInfo[name].length - 2)) - sum;
	                    		// console.log(sum);
	                    		// console.log(parseInt(keyInfo[name]));
	                    		// console.log(num);

	                    		if (num > 4 && (num - sum) % 2 == 1) {
	                    			num -= sum;
	                    		}

	                    		var modNum = num;

	                    		num /= 17;

	                    		clueType /= (x + 4);

	                    		// console.log(clueType);
	                    		// console.log(num);
	                    		// console.log(modNum);

	                    		if (num < 1 || num > 6 || modNum % 17 != 0 || clueType > 7 || clueType < 1) {
	                    			hiddenKeysDisabled = true;
	                    			//console.log("ERROR");
	                    			reject(Error("**ERROR: SOMEONE TAMPERED WITH MY HIDDEN KEYS GAME DATA. SHUTTING DOWN THE HIDDEN KEYS GAME. ASK A SCARSDALE ROBOTICS OWNER OR SERVER TECHNICIAN TO RESTART THE BOT AFTER THE DATA IS RESTORED TO RE-ENABLE THE GAME. PLEASE PUNISH WHOEVER DID THIS FOR WASTING BOTH YOUR TIME AND MINE.**"));
	                    		}
                                hiddenKeysDisabled = false;
	                    		hiddenKeyInfo[key] = { 'name': name, 'clueNum': num, 'sum': sum, 'clueType' : clueType - 1 };
	                    	} else {
	                    		// console.log(sum);
	                    		// console.log(name);
	                    		// console.log((sum + parseInt(name[name.length - 1])) % 10);
	                    		hiddenKeysDisabled = true;
	                    		//console.log("ERROR");
	                    		reject(Error("**ERROR: SOMEONE TAMPERED WITH MY HIDDEN KEYS GAME DATA. SHUTTING DOWN THE HIDDEN KEYS GAME. ASK A SCARSDALE ROBOTICS OWNER OR SERVER TECHNICIAN TO RESTART THE BOT AFTER THE DATA IS RESTORED TO RE-ENABLE THE GAME. PLEASE PUNISH WHOEVER DID THIS FOR WASTING BOTH YOUR TIME AND MINE.**"));
	                    	}
	                    }
					}

                } else {
                    hiddenKeyInfo = {};
                }

                resolve();
        });
    });
}

function setHiddenKeyInfo(channel) {
    return new Promise ((resolve, reject) => {
        sheets.spreadsheets.values.update({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'P2',
            valueInputOption: 'RAW',
            resource: { values: [[JSON.stringify(createHiddenKeyInfoDictionaryForUpload())]] },
        }, (err, res) => {
            if (err) {

                if (!firstLoginTry) {
                    firstLoginTry = false;
                    startSheets();
                    setHiddenKeyInfo(channel);
                } else {
                    console.log(err);
                    channel.send("```Error: " + err.errors[0].message + "\n\tCode: " + err.code + "```");
                    reject(err);
                }

                return;
            }

            firstLoginTry = true;

            console.log("Updated Hidden Key");

            resolve();
        });
    });
}

function loadPostRestartBotMessageChannelID() {
    return new Promise ((resolve, reject) => {
        sheets.spreadsheets.values.get({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'R2',
            }, (err, res) => {
                if (err) {

                    if (!firstLoginTry) {
                        firstLoginTry = false;
                        startSheets();
                        loadPostRestartBotMessageChannelID();
                    } else {
                        console.log(err);
                        reject(err);
                    }

                    return;
                }

                firstLoginTry = true;

                var index;

                const rows = res.data.values;

                console.log("HELLO");

                if (rows && rows.length) {
                    resolve(rows[0][0]);
                }

                
        });
    });
}

function setPostRestartBotMessageChannelID(message) {
    return new Promise ((resolve, reject) => {
        var channelId = message == null ? "" : message.channel.id;
        sheets.spreadsheets.values.update({
            spreadsheetId: '1jrbBRM5g_M4zQyh7o0zv070uTTycO-fqw9TBABgasno',
            range: 'R2',
            valueInputOption: 'RAW',
            resource: { values: [[channelId]] },
        }, (err, res) => {
            if (err) {

                if (!firstLoginTry) {
                    firstLoginTry = false;
                    startSheets();
                    setPostRestartBotChannelID(message);
                } else {
                    console.log(err);
                    if (message != null) {
                        message.channel.send("```Error: " + err.errors[0].message + "\n\tCode: " + err.code + "```");
                    } else {
                        client.users.fetch(alexId)
                        .then(user => {
                            user.createDM()
                                .then(channel => {
                                    channel.send("```Error Setting Post Restart Bot Message Channel ID: " + err.errors[0].message + "\n\tCode: " + err.code + "```");
                                })
                                .catch(errorMessage => {
                                    sendError(errorMessage);
                                });
                        })
                        .catch(sendError);
                    }
                    reject(err);
                }

                return;
            }

            firstLoginTry = true;

            console.log("Updated Post Restart Bot Channel ID");

            resolve();
        });
    });
}

async function actuallyRestart(message) {
    if (message.channel.isTextBased() && !message.channel.isDMBased()) {
        if (checkIfOwner(message.member)) {
            try {
                await message.channel.send("Actually Restarting - Be back up in a min or 2");

                var user = await client.users.fetch(alexId);
                var channel = await user.createDM();

                await channel.send("`Restarting From:` \n\t`Server:` " + message.channel.guild.name + " (" + message.guild.id + ")\n\t`Channel:` <#" + message.channel.id + "> (" + message.channel.id + ")\n\t`User:` <@" + message.author.id + "> (" + message.author.id + ")");
            } catch {
                console.error(err);
                message.channel.send("Error Sending Message to Alex Before Restarting: ```" + err + "```")
            }

            try {
                await setPostRestartBotMessageChannelID(message);
            } catch {
                console.error(err);
                message.channel.send("Error Saving Before Restarting: ```" + err + "```");
            }

            // Purposely Crashing to Restart
            //throw 'Purposely Crashing to Restart';
            // using this var to crash (as throw will not terminate)
            console.log("Purposely Crashing to Restart");
            process.exit(1);
            //purposely_crashing_with_this_var = "This error is intentional to terminate the program so it restarts";
        }
    } else if (message.author.id == alexId) {
        try {
            await message.channel.send("Actually Restarting - Be back up in a min or 2")
        } catch {
            console.error(err);
            message.channel.send("Error Sending Message Before Restarting: ```" + err + "```");
        }

        try {
            await setPostRestartBotMessageChannelID(message);
        } catch {
            console.error(err);
            message.channel.send("Error Saving Before Restarting: ```" + err + "```");
        }

        //throw 'Purposely Crashing to Restart';
        console.log("Purposely Crashing to Restart");
        process.exit(1);
    }
}

function sendError(err) {
    console.error(err);
    client.channels.fetch("xxxxxxxxxxxxxxxx")
        .then(channel => {
            channel.send("Error: " + err.message);
        })
        .catch(error => {
            console.error(error);
            client.users.fetch(alexId)
            .then(user => {
            	user.createDM()
            		.then(channel => {
       	    			channel.send("Error: " + error.message);
                        channel.send("Orig Error: " + err.message);
            		})
            		.catch(errorMessage => {
		                console.error(errorMessage);
		            });

           	})
           	.catch(console.error);
        });
}
            

 
String.prototype.replaceAt=function(index, replacement) {
    return this.substr(0, index) + replacement+ this.substr(index + replacement.length);
}

/* VIRUTAL COMPETITION GUILD

Guild ID: 696394054971293837

Channels: 

general:
  id: 'xxxxxxxxxxxxxxxx'
       
announcements:
  id: 'xxxxxxxxxxxxxxxx'
       
admin:
  id: 'xxxxxxxxxxxxxxxx'

important-information:
  id: 'xxxxxxxxxxxxxxxx'

ny-announcements:
  id: 'xxxxxxxxxxxxxxxx'

ny-ganeral:
  id: 'xxxxxxxxxxxxxxxx'

welcome:
  id: 'xxxxxxxxxxxxxxxx'   

End Channels */

/* Roles:

@everyone:
  id: 'xxxxxxxxxxxxxxxx'

Admin: 
  id: 'xxxxxxxxxxxxxxxx'

Server Manager:
  id: 'xxxxxxxxxxxxxxxx'

Competition Participant:
  id: 'xxxxxxxxxxxxxxxx'

Robo Raiders 123331:
  id: 'xxxxxxxxxxxxxxxx'

NY Excelsior Regionals
  id: 'xxxxxxxxxxxxxxxx'

Un-Verified: 
  id: 'xxxxxxxxxxxxxxxx'

Virtual Comp. Sheets Access:
  id: 'xxxxxxxxxxxxxxxx'

End Roles */

/* Scarsdale Robotics Guild

Guild ID: 675857486850293760

Channels:

No Group:

enter-password: 
	id: 'xxxxxxxxxxxxxxxx'

testing:
	id: 'xxxxxxxxxxxxxxxx'


Group - New Text Channels:

announcements:
	id: 'xxxxxxxxxxxxxxxx'

resources-quick-access:
	id: 'xxxxxxxxxxxxxxxx'

roles:
	id: 'xxxxxxxxxxxxxxxx'

general:
	id: 'xxxxxxxxxxxxxxxx'

random:
	id: 'xxxxxxxxxxxxxxxx'

programming:
	id: 'xxxxxxxxxxxxxxxx'

engineering:
	id: 'xxxxxxxxxxxxxxxx'

outreach:
	id: 'xxxxxxxxxxxxxxxx'

General Voice:
	id: 'xxxxxxxxxxxxxxxx'

General Voice 2:
	id: 'xxxxxxxxxxxxxxxx'


Group - Old Text Channels (Archived):

announcements:
	id: 'xxxxxxxxxxxxxxxx'

server-updates:
	id: 'xxxxxxxxxxxxxxxx'

welcome:
	id: 'xxxxxxxxxxxxxxxx'

guidelines:
	id: 'xxxxxxxxxxxxxxxx'

events:
	id: 'xxxxxxxxxxxxxxxx'

general:
	id: 'xxxxxxxxxxxxxxxx'

roles:
	id: 'xxxxxxxxxxxxxxxx'

random:
	id: 'xxxxxxxxxxxxxxxx'

bot-commands:
	id: 'xxxxxxxxxxxxxxxx'


Group - Engineering:

engineering-announcements:
	id: 'xxxxxxxxxxxxxxxx'

engineering-general:
	id: 'xxxxxxxxxxxxxxxx'


Group - Programming:

programming-announcements:
	id: 'xxxxxxxxxxxxxxxx'

programming-general:
	id: 'xxxxxxxxxxxxxxxx'

open-cv:
	id: 'xxxxxxxxxxxxxxxx'


Group - Outreach:

outreach-announcements:
	id: 'xxxxxxxxxxxxxxxx'

outreach-general:
	id: 'xxxxxxxxxxxxxxxx'

event-ideas:
	id: 'xxxxxxxxxxxxxxxx'


Group - Advisors:

advisor-announcements:
	id: 'xxxxxxxxxxxxxxxx'

advisor-text:
	id: 'xxxxxxxxxxxxxxxx'

team-leaders:
	id: 'xxxxxxxxxxxxxxxx'


Group - Miscelaneous:

escape-room:
	id: 'xxxxxxxxxxxxxxxx'

testing:
	id: 'xxxxxxxxxxxxxxxx'


Group - Logs:

server-log:
	id: 'xxxxxxxxxxxxxxxx'

message-log:
	id: 'xxxxxxxxxxxxxxxx'

mod-log:
	id: 'xxxxxxxxxxxxxxxx'

voice-log:
	id: 'xxxxxxxxxxxxxxxx'

End Channels */

/* Roles:
Owner:
	id: 'xxxxxxxxxxxxxxxx'

Captain:
	id: 'xxxxxxxxxxxxxxxx'

Server Technician:
	id: 'xxxxxxxxxxxxxxxx'

Server Password Bot:
	id: 'xxxxxxxxxxxxxxxx'

Apollo:
	id: 'xxxxxxxxxxxxxxxx'

carl-bot:
	id: 'xxxxxxxxxxxxxxxx'

Coach:
	id: 'xxxxxxxxxxxxxxxx'

Logistics Director:
	id: 'xxxxxxxxxxxxxxxx'

Programming Director:
	id: 'xxxxxxxxxxxxxxxx'

Engineering Director:
	id: 'xxxxxxxxxxxxxxxx'

Outreach Director:
	id: 'xxxxxxxxxxxxxxxx'

Advisor:
	id: 'xxxxxxxxxxxxxxxx'

Chassis Team:
	id: 'xxxxxxxxxxxxxxxx'

Deposit Team:
	id: 'xxxxxxxxxxxxxxxx'

Intake Team:
	id: 'xxxxxxxxxxxxxxxx'

Engineering Team Leader:
	id: 'xxxxxxxxxxxxxxxx'

Logistics:
	id: 'xxxxxxxxxxxxxxxx'

Outreach:
	id: 'xxxxxxxxxxxxxxxx'

Programming:
	id: 'xxxxxxxxxxxxxxxx'

Engineering:
	id: 'xxxxxxxxxxxxxxxx'

Alumni:
	id: 'xxxxxxxxxxxxxxxx'

Needs to Enter Password:
	id: 'xxxxxxxxxxxxxxxx'

Testers:
	id: 'xxxxxxxxxxxxxxxx'

BOTS:
	id: 'xxxxxxxxxxxxxxxx'

Rythm:
	id: 'xxxxxxxxxxxxxxxx'

Virtual Comp. Bot:
	id: 'xxxxxxxxxxxxxxxx'

@everyone:
	id: 'xxxxxxxxxxxxxxxx'

End Roles */

/* Start User Id

Bot id: 'xxxxxxxxxxxxxxxx' 

Alex Arovas id: 'xxxxxxxxxxxxxxxx' 

End User Id*/