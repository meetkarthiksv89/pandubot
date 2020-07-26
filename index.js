'use strict';

// Imports dependencies and set up http server
const questions = [{
    "question": "What kind of coffee are you looking to buy?",
    "answers": ["Black Coffee", "Filter Coffee"]
},
{
    "question": "Would you prefer a blend with Chicory or just pure coffee? More chicory you add more storng your coffee will be.",
    "answers": ["Pure Coffee", "15% Chicory", "30% Chicory"]
},
{
    "question": "What kind of blend would you like to try?",
    "answers": ["Premium Blend", "Classic Blend"]
}
]

const 
  request = require('request'),
  express = require('express'),
  body_parser = require('body-parser'),
  app = express().use(body_parser.json()); // creates express http server

require('dotenv').config()
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;


const { Wit, log } = require('node-wit');

const client = new Wit({
    accessToken: "XNXS3KVKZYHQDN6WMWK5EVE3SXXGXFGS",
    logger: new log.Logger(log.DEBUG) // optional
});

console.log(client.message('set an alarm tomorrow at 7am'));

// Sets server port and logs message on success
app.listen(process.env.PORT || 3000, () => console.log('webhook is listening'));

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {  

  // Parse the request body from the POST
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {

    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);


      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender ID: ' + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);        
      } else if (webhook_event.postback) {
        
        handlePostback(sender_psid, webhook_event.postback);
      }
      
    });
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  
  /** UPDATE YOUR VERIFY TOKEN **/
  const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
  
  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Check if a token and mode were sent
  if (mode && token) {
  
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Respond with 200 OK and challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});



function handleMessage(sender_psid, received_message) {
  let response;
  
  // Checks if the message contains text
  console.log("Inside coffee quiz",received_message)
  if (received_message.quick_reply) {
      handleQuickReply(sender_psid, received_message.quick_reply, received_message.mid)
  }

  //if (received_message.postback.title == "Coffee") {
   if (received_message.text == "coffee") {    
    // Create the payload for a basic text message, which
    // will be added to the body of our request to the Send API
    
    let questionNumbers = "1"
    let replies = [];
    for (var b = 0; b < questions[0].answers.length; b++) {
        var payload = ""
        if (questions[0].answers[b] == "Black") {
            payload = "GRAND_AROMA_PURE"
        } else {
            payload = questionNumbers + "_" + questions[0].answers[b]
        }
        let reply =
        {
            "content_type": "text",
            "title": questions[0].answers[b],
            "payload": payload
        }
        replies.push(reply);
    }
    console.log("in Handle message")
    sendQuickReply(sender_psid, questions[0].question, replies);
  } else if (received_message.attachments) {
    // Get the URL of the message attachment
    let attachment_url = received_message.attachments[0].payload.url;
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Is this the right picture?",
            "subtitle": "Tap a button to answer.",
            "image_url": attachment_url,
            "buttons": [
              {
                "type": "postback",
                "title": "Yes!",
                "payload": "yes",
              },
              {
                "type": "postback",
                "title": "No!",
                "payload": "no",
              }
            ],
          }]
        }
      }
    }
  } 
  
  // Send the response message
  //callSendAPI(sender_psid, response);    
}

function handlePostback(sender_psid, received_postback) {
  console.log('ok')
   let response;
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { "text": "Thanks!" }
  } else if (payload === 'no') {
    response = { "text": "Oops, try sending another image." }
  }
  // Send the message to acknowledge the postback
  console.log("In handle post back method " + payload)
  if (received_postback.title == "Coffee") {    
    // Create the payload for a basic text message, which
    // will be added to the body of our request to the Send API
   
    let questionNumbers = "1"
    let replies = [];
    for (var b = 0; b < questions[0].answers.length; b++) {
        let payloads = ""
        if (questions[0].answers[b] == "Black") {
            payloads = "GRAND_AROMA_PURE"
        } else {
            payloads = questionNumbers + "_" + questions[0].answers[b]
        }
        let reply =
        {
            "content_type": "text",
            "title": questions[0].answers[b],
            "payload": payloads
        }
        replies.push(reply);
    }
    console.log("in Handle message")
    sendQuickReply(sender_psid, questions[0].question, replies);
  }
}

function callSendAPI(messageData) {
    console.log("in call send api message")
	request({
		uri: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {
			access_token: PAGE_ACCESS_TOKEN
		},
		method: 'POST',
		json: messageData

	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var recipientId = body.recipient_id;
			var messageId = body.message_id;

			if (messageId) {
				console.log("Successfully sent message with id %s to recipient %s",
					messageId, recipientId);
			} else {
				console.log("Successfully called Send API for recipient %s",
					recipientId);
			}
		} else {
			console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
		}
	});
}


function sendQuickReply(recipientId, text, replies, metadata) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			text: text,
			metadata: isDefined(metadata)?metadata:'',
			quick_replies: replies
		}
	};
    console.log("in send reply method")
	callSendAPI(messageData);
}

function sendTextMessage(recipientId, text) {
	var messageData = {
		recipient: {
			id: recipientId
		},
		message: {
			text: text
		}
	}
	callSendAPI(messageData);
}

function sendTemplateMessage(recipientID, elements, buttons) {
    console.log("Template message")
    var messageDate = {
        "recipient":{
          "id": recipientID
        },
        "message":{
          "attachment":{
            "type":"template",
            "payload":{
              "template_type":"generic",
              "elements": elements
            }
          }
        }
      }
      callSendAPI(messageDate)
}

function isDefined(obj) {
	if (typeof obj == 'undefined') {
		return false;
	}

	if (!obj) {
		return false;
	}

	return obj != null;
}

function handleQuickReply(senderID, quickReply, messageId) {
    var quickReplyPayload = quickReply.payload;
    console.log("Current Payload" + quickReplyPayload)

    // Uncomment to show the coffee
    // if (quickReplyPayload.includes("Coffee Decoction")) {
    //     showCoffeeDecoction(senderID)
    // } else 
    
    if (quickReplyPayload.includes("Black Coffee") || quickReplyPayload.includes("Pure")) {
        showGrandAromaPure(senderID);
    } else {
        var questionNumber = quickReplyPayload.split("_")[0]
        var payload = quickReplyPayload.split("_")[1]
        if (questionNumber == questions.length) {
            if (payload.includes("Pure")) {
                showGrandAromaPure(senderID)
            } else if (payload.includes("15% Chicory") && payload.includes("Premium")) {
                showGrandAroma(senderID)
            } else if (payload.includes("15% Chicory") && payload.includes("Classic")) {
                showBrownGold(senderID)
            } else if (payload.includes("30% Chicory") && payload.includes("Premium")) {
                showAromaGold(senderID)
            } else if (payload.includes("30% Chicory") && payload.includes("Classic")) {
                showFrenchBlend(senderID)
            }
            // showResult(quickReplyPayload, senderID);
        } else {
            console.log("Next Option")
            var nextQuestionIndex = parseInt(questionNumber)
            var nextQuestion = questions[nextQuestionIndex]

            if (nextQuestion != undefined) {
                let replies = [];
                for (var b = 0; b < nextQuestion.answers.length; b++) {
                    let reply =
                    {
                        "content_type": "text",
                        "title": nextQuestion.answers[b],
                        "payload": String(nextQuestionIndex + 1) + "_" + quickReplyPayload.split("_")[1] + " " + nextQuestion.answers[b]
                    }
                    replies.push(reply);
                }
                sendQuickReply(senderID, nextQuestion.question, replies);
            }
            
        }
        console.log("Quick reply for message %s with payload %s", messageId, questionNumber);
    }
}

function showGrandAromaPure(senderID) {
    var elements = [{
        "title": "Grand Aroma",
        "image_url": "https://static.wixstatic.com/media/6c8eb8_c1a5491668ec4df5af2fa674c710de9b~mv2.png",
        "subtitle": "Pure Coffee",
        "default_action": {
            "type": "web_url",
            "url": "https://pandurangacoffee.com/products/grand-aroma",
            "webview_height_ratio": "tall",
        },
        "buttons": [
            {
                "type": "web_url",
                "url": "https://pandurangacoffee.com/products/grand-aroma",
                "title": "Buy"
            }
        ]
    }];
    sendTemplateMessage(senderID, elements);
}

function showCoffeeDecoction(senderID) {
    var elements = [{
        "title": "Grand Aroma",
        "image_url": "https://static.wixstatic.com/media/6c8eb8_c1a5491668ec4df5af2fa674c710de9b~mv2.png",
        "subtitle": "Pure Coffee",
        "default_action": {
            "type": "web_url",
            "url": "https://petersfancybrownhats.com/view?item=103",
            "webview_height_ratio": "tall",
        },
        "buttons": [
            {
                "type": "web_url",
                "url": "https://petersfancybrownhats.com",
                "title": "Buy"
            }
        ]
    }];
    sendTemplateMessage(senderID, elements);
}

function showGrandAroma(senderID) {
    var elements = [{
        "title": "Grand Aroma",
        "image_url": "https://static.wixstatic.com/media/6c8eb8_c1a5491668ec4df5af2fa674c710de9b~mv2.png",
        "subtitle": "With 15% Chicory",
        "default_action": {
            "type": "web_url",
            "url": "https://pandurangacoffee.com/products/grand-aroma",
            "webview_height_ratio": "tall",
        },
        "buttons": [
            {
                "type": "web_url",
                "url": "https://pandurangacoffee.com/products/grand-aroma",
                "title": "Buy"
            }
        ]
    }];
    sendTemplateMessage(senderID, elements);
}

function showBrownGold(senderID) {
    var elements = [{
        "title": "Brown Gold",
        "image_url": "https://static.wixstatic.com/media/6c8eb8_7cff39d12abd454ea7490e298fa4cf89~mv2.png",
        "subtitle": "15% Chicory",
        "default_action": {
            "type": "web_url",
            "url": "https://pandurangacoffee.com/collections/frontpage/products/brown-gold",
            "webview_height_ratio": "tall",
        },
        "buttons": [
            {
                "type": "web_url",
                "url": "https://pandurangacoffee.com/collections/frontpage/products/brown-gold",
                "title": "Buy"
            }
        ]
    }];
    sendTemplateMessage(senderID, elements);
}

function showAromaGold(senderID) {
    var elements = [{
        "title": "Aroma Gold",
        "image_url": "https://static.wixstatic.com/media/6c8eb8_4082ce662e7d42d48d8c0f976cabe89b~mv2.png",
        "subtitle": "30% Chicory",
        "default_action": {
            "type": "web_url",
            "url": "https://pandurangacoffee.com/products/aroma-gold",
            "webview_height_ratio": "tall",
        },
        "buttons": [
            {
                "type": "web_url",
                "url": "https://pandurangacoffee.com/products/aroma-gold",
                "title": "Buy"
            }
        ]
    }];
    sendTemplateMessage(senderID, elements);
}

function showFrenchBlend(senderID) {
    var elements = [{
        "title": "French Blend",
        "image_url": "https://static.wixstatic.com/media/6c8eb8_c0161dfa3e4949e2aac78c719ad9a4a2~mv2.png",
        "subtitle": "30% Chicory",
        "default_action": {
            "type": "web_url",
            "url": "https://pandurangacoffee.com/products/french-blend",
            "webview_height_ratio": "tall",
        },
        "buttons": [
            {
                "type": "web_url",
                "url": "https://pandurangacoffee.com/products/french-blend",
                "title": "Buy"
            }
        ]
    }];
    sendTemplateMessage(senderID, elements);
}

