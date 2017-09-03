'use strict';

// Messenger API integration example
// We assume you have:
// * a Wit.ai bot setup (https://wit.ai/docs/quickstart)
// * a Messenger Platform setup (https://developers.facebook.com/docs/messenger-platform/quickstart)
// You need to `npm install` the following dependencies: body-parser, express, request.
//
// 1. npm install body-parser express request
// 2. Download and install ngrok from https://ngrok.com/download
// 3. ./ngrok http 8445
// 4. HXVNP2JAKJBDGYPZDL32LFRIZYHGBINF=your_access_token aa0ff220041bcb3551ce1d5318e336cb=your_app_secret EAABmDV3l5aUBAKPlELvHdO7wzNkHPwfAN3c6HhFvLz5bg3pFiktlLUZCAZCQ97vghvc5qUsXZBznn6f1ZAWa2MMrg13KJGtZCz9WwTGtUtwPJ79v1DaTzIdBwwYjRlV6IbBvcZC6rfWszsDrqe71jcKEoffHFFZAbVQf9iKNQxvaAZDZD=your_page_token node examples/messenger.js
// 5. Subscribe your page to the Webhooks using verify_token and `https://<your_ngrok_io>/webhook` as callback URL.
// 6. Talk to your bot on Messenger!

const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const fetch = require('node-fetch');
const request = require('request');
const unirest = require('unirest');


let Wit = null;
let log = null;
try {
  // if running from repo
  Wit = require('../').Wit;
  log = require('../').log;
} catch (e) {
  Wit = require('node-wit').Wit;
  log = require('node-wit').log;
}

// Webserver parameter
const PORT = process.env.PORT || 8445;

// Wit.ai parameters
// Wit.ai parameters
const WIT_TOKEN = "HXVNP2JAKJBDGYPZDL32LFRIZYHGBINF";

// Messenger API parameters
const FB_PAGE_TOKEN = "EAABmDV3l5aUBACAOMl8ZCUlP2WiNNg4bB14GsivgYZBnfn4zn24xaU6FfAnc3rhsvHH7Ck2AcPHXnwPYv364QZAvYiD9dnjZBTDTnxdTUFlv8grqLL2tDZChJmi5H7ommrOJGYA0uO3tVqS14D0eZAacyKRAsqdBnRKOhHK8Bj5AZDZD";
if (!FB_PAGE_TOKEN) { throw new Error('missing FB_PAGE_TOKEN') }
const FB_APP_SECRET = "aa0ff220041bcb3551ce1d5318e336cb";
if (!FB_APP_SECRET) { throw new Error('missing FB_APP_SECRET') }
const FB_VERIFY_TOKEN = "anton1234";

// ----------------------------------------------------------------------------
// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference
const FBRequest = request.defaults({
    uri: 'https://graph.facebook.com/me/messages',
    method: 'POST',
    json: true,
    qs: {access_token: FB_PAGE_TOKEN},
    headers: {'Content-Type': 'application/json'},
});


const fbMessage = (id, text) => {
  const body = JSON.stringify({
    recipient: { id },
    message: { text },
  });
  const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
  return fetch('https://graph.facebook.com/me/messages?' + qs, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
  })
  .then(rsp => rsp.json())
  .then(json => {
    if (json.error && json.error.message) {
      throw new Error(json.error.message);
    }
    return json;
  });
};

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};
const TEMPLATE_GENERIC = "generic";
let ids = [];
let id = 0;
let elements = [];
let receiptDetail = [];
let images = [];
let ingridientsLength = 0;
let instructionStepsDetail = [];
let instructionStepsDetailString = [];
let instructionStepsNumber = [];
let title = [];

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: {}};
  }
  console.log("SessionId1:" + sessionId);
  return sessionId;
};

// Our bot actions
const actions = {
  send({sessionId}, {text}) {
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
      console.log("sessionId2: " + sessionId);
      console.log("sessions2: " + sessions);
      const recipientId = sessions[sessionId].fbid;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending
      return fbMessage(recipientId, text)
      .then(() => null)
      .catch((err) => {
        console.error(
          'Oops! An error occurred while forwarding the response to',
          recipientId,
          ':',
          err.stack || err
        );
      });
    } else {
      console.error('Oops! Couldn\'t find user for session:', sessionId);
      // Giving the wheel back to our bot
      return Promise.resolve()
    }
  },
    // You should implement your custom actions here
    // See https://wit.ai/docs/quickstart
    /**
     * Send a Structured Message to a FB Conversation
     *
     * @param sender   ID
     * @param payload       Payload Element
     * @param cb            Callback
     */
    sendStructuredMessage(sender, elements, cb) {
        console.log("sendStructuredMessage function runned");

        if (!Array.isArray(elements)) elements = [elements];
        if (elements.length > 10) throw new Error("sendStructuredMessage: FB does not allow more then 10 payload elements");

        const payload = {
            "template_type": TEMPLATE_GENERIC,
            "elements": elements,
        };
        this._sendFBRequest(sender, payload, cb);
    },
    sendText(recipientId, msg, cb){

        if (msg > 320) msg = msg.substr(0, 320);

        const opts = {
            form: {
                recipient: {
                    id: recipientId,
                },
                message: {
                    text: msg,
                },
            },
        };

        FBRequest(opts, (err, resp, data) => {
            if (cb) {
                cb(err || data.error && data.error.message, data);
            }
        });
    },
    sendQuickReplyMessage(sender, msg, elements, cb){
        console.log("sendQuickReplyMessage runned");
        console.log("sendQuickReplyMessage sender" + sender);
        console.log("sendQuickReplyMessage msg" + msg);
        console.log("sendQuickReplyMessage elements" + elements);

        if (msg > 320) msg = msg.substr(0, 320);

        const opts =  {
            form: {
                recipient: {
                    id: sender,
                },
                message: {
                    text: msg,
                    quick_replies: elements
                },
            },
        };

        FBRequest(opts, (err, resp, data) => {
            //console.log(JSON.stringify(opts) + JSON.stringify(err) + JSON.stringify(resp) + JSON.stringify(data));
            if (cb) {
                cb(err || data.error && data.error.message, data);
            }
        });
    },
    _sendFBRequest(sender, payload, cb) {
        console.log("_sendFBRequest function runned");
        //console.log(sender);
        //console.log(payload);

        const opts = {
            form: {
                recipient: {
                    id: sender,
                },
                message: {
                    attachment: {
                        type: "template",
                        payload: payload,
                    }
                }
            },
        };
        //console.log(JSON.stringify(opts));

        FBRequest(opts, (err, resp, data) => {
            //if (cb) {
            //    cb(err || data.error && data.error.message, data);
            //}
        });
    },

    firstAnswerChooseCuisine(sender) {
        console.log("firstAnswerChooseCuisine runned");
        let msg = "What cuisine do you search for? Type or select!";
        let elements =
            [
                {
                    "content_type": "text",
                    "title": "German",
                    "image_url": "http://servicio.io/wp-content/uploads/2017/08/german-flag-graphic.png",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_GERMAN"
                },
                {
                    "content_type": "text",
                    "title": "American",
                    "image_url": "http://servicio.io/wp-content/uploads/2017/08/american-flag-graphic.png",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_AMERICAN"
                },
                {
                    "content_type": "text",
                    "title": "Southern",
                    "image_url": "http://servicio.io/wp-content/uploads/2017/08/Spain-Flag.png",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_SOUTHERN"
                },
                {
                    "content_type": "text",
                    "title": "Irish",
                    "image_url": "http://servicio.io/wp-content/uploads/2017/08/Ireland_flag_300.png",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_IRISH"
                },
                {
                    "content_type": "text",
                    "title": "Korean",
                    "image_url": "http://servicio.io/wp-content/uploads/2017/08/Flag_of_South_Korea.png",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_KOREAN"
                },
                {
                    "content_type": "text",
                    "title": "Chinese",
                    "image_url": "http://servicio.io/wp-content/uploads/2017/08/Flag_of_China.png",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_CHINESE"
                },
                {
                    "content_type": "text",
                    "title": "French",
                    "image_url": "http://servicio.io/wp-content/uploads/2017/08/Flag_of_France.png",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_FRENCH"
                },
                {
                    "content_type": "text",
                    "title": "Eastern European",
                    "image_url": "http://servicio.io/wp-content/uploads/2017/08/Flag-map_of_the_Eastern_European_countries.svg_.png",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_EASTERNEUROPE"
                },
                {
                    "content_type": "text",
                    "title": "Greek",
                    "image_url": "http://servicio.io/wp-content/uploads/2017/08/Flag_of_Greece.png",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_GREEK"
                },
                {
                    "content_type": "text",
                    "title": "Spanish",
                    "image_url": "http://servicio.io/wp-content/uploads/2017/08/Spain-Flag.png",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_SPANISH"
                },
                {
                    "content_type": "text",
                    "title": "Italian",
                    "image_url": "http://servicio.io/wp-content/uploads/2017/08/italian-flag-graphic.png",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_ITALIAN"
                },
            ];
        actions.sendQuickReplyMessage(sender, msg, elements);
    },
    foodAPIRecipeRequest(sender, data) {

        let imageUrlCombined = [];
        let readyInMinutes = [];
        let recipeNumberLength = 0;
        let inputCuisine = data.entry[0].messaging[0].message.nlp.entities.cuisine[0].value;
        let inputQuery = "";
        let inputDiet = "";
        let inputIntolerance = "";
        let inputType = "";
        receiptDetail = [];
        images = [];
        ingridientsLength = 0;
        title = [];
        instructionStepsDetail = [];
        instructionStepsDetailString = [];
        instructionStepsNumber = [];
        ids = [];

        // These code snippets use an open-source library. http://unirest.io/nodejs
        // 'https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/search?cuisine=italian&diet=vegetarian&excludeIngredients=coconut&instructionsRequired=false&intolerances=egg&limitLicense=false&number=10&offset=0&query=pasta&type=main+course'
        // "https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/search?cuisine=italian&diet=vegetarian&excludeIngredients=coconut&instructionsRequired=false&intolerances=sesame&limitLicense=false&number=10&offset=0&query=pasta&type=main+course"
        //console.log(inputCuisine + inputDiet + inputIntolerance + inputType + inputQuery);
        /*console.log("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/search?cuisine=" +
            inputCuisine +
            "&diet=" +
            inputDiet +
            "&excludeIngredients=coconut&instructionsRequired=true&intolerances=" +
            inputIntolerance + "&limitLicense=false&number=10&offset=0&query=" +
            inputQuery +
            "&type=" +
            inputType); */
        console.log("foodAPIRecipeRequest runned");
        unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/search?cuisine=" +
            inputCuisine +
            "&diet=" +
            inputDiet +
            "&excludeIngredients=coconut&instructionsRequired=true&intolerances=" +
            inputIntolerance +
            "&limitLicense=false&number=10&offset=0&query=" +
            inputQuery +
            "&type=" +
            inputType)
            .header("X-Mashape-Key", "M0WkYkVSuvmshQP7S6BBF9BdI3I5p1wSLh3jsnXUQkJCIBbL7d")
            .header("Accept", "application/json")
            .end(function (result) {
                //console.log(result.status, result.headers, result.body);
                //console.log("--------------------->>>>>>>>>>>>:" + JSON.stringify(result.body));
                for (let x = 0; x < result.body.results.length; x++) {
                    let imageUrl = result.body.baseUri;
                    ids.push(result.body.results[x].id);
                    imageUrlCombined.push(imageUrl + result.body.results[x].imageUrls[0]);
                    title.push(result.body.results[x].title);
                    readyInMinutes.push("Ready in minutes:" + result.body.results[x].readyInMinutes);
                    //console.log(title[x]);
                    //console.log(imageUrlCombined[x]);
                    //console.log(readyInMinutes[x]);
                    //console.log(ids[x]);
                }
                if (title.length === 0) {
                    actions.send(sessionId, "There are no recipes for this request available", (err, data) => {
                        if (err) {
                            console.log(
                                'Oops! An error occurred while forwarding the response to',
                                recipientId,
                                ':',
                                err
                            );
                        }
                        console.log("sendText function executed");
                        // Let's give the wheel back to our bot
                        //cb();
                    });
                } else {
                    //console.log('Oops! Couldn\'t find user for session:', sessionId);
                    // Giving the wheel back to our bot
                    //cb();
                }
                //console.log(title);
                //console.log(imageUrlCombined);
                //console.log(readyInMinutes);
                recipeNumberLength = result.body.results.length;
                //console.log("recipeNumberLength ---->" + recipeNumberLength);
                if (sender) {
                    // Yay, we found our recipient!
                    // Let's forward our bot response to her.

                    let elements = [
                        {
                            "title": title[0],
                            "image_url": imageUrlCombined[0],
                            "subtitle": readyInMinutes[0],
                            "default_action": {
                                "type": "web_url",
                                "url": "https://servicio.io",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://servicio.io"
                            },
                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Checkout recipe",
                                    "payload": "DEVELOPER_DEFINED_PAYLOAD-" + ids[0]
                                }
                            ]
                        },
                        {
                            "title": title[1],
                            "image_url": imageUrlCombined[1],
                            "subtitle": readyInMinutes[1],
                            "default_action": {
                                "type": "web_url",
                                "url": "https://servicio.io",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://servicio.io"
                            },
                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Checkout recipe",
                                    "payload": "DEVELOPER_DEFINED_PAYLOAD-" + ids[1]
                                }
                            ]
                        },
                        {
                            "title": title[2],
                            "image_url": imageUrlCombined[2],
                            "subtitle": readyInMinutes[2],
                            "default_action": {
                                "type": "web_url",
                                "url": "https://servicio.io",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://servicio.io"
                            },
                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Checkout recipe",
                                    "payload": "DEVELOPER_DEFINED_PAYLOAD-" + ids[2]
                                }
                            ]
                        },
                        {
                            "title": title[3],
                            "image_url": imageUrlCombined[3],
                            "subtitle": readyInMinutes[3],
                            "default_action": {
                                "type": "web_url",
                                "url": "https://servicio.io",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://servicio.io"
                            },
                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Checkout recipe",
                                    "payload": "DEVELOPER_DEFINED_PAYLOAD-" + ids[3]
                                }
                            ]
                        },
                        {
                            "title": title[4],
                            "image_url": imageUrlCombined[4],
                            "subtitle": readyInMinutes[4],
                            "default_action": {
                                "type": "web_url",
                                "url": "https://servicio.io",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://servicio.io"
                            },
                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Checkout recipe",
                                    "payload": "DEVELOPER_DEFINED_PAYLOAD-" + ids[4]
                                }
                            ]
                        },
                        {
                            "title": title[5],
                            "image_url": imageUrlCombined[5],
                            "subtitle": readyInMinutes[5],
                            "default_action": {
                                "type": "web_url",
                                "url": "https://servicio.io",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://servicio.io"
                            },
                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Checkout recipe",
                                    "payload": "DEVELOPER_DEFINED_PAYLOAD-" + ids[5]
                                }
                            ]
                        },
                        {
                            "title": title[6],
                            "image_url": imageUrlCombined[6],
                            "subtitle": readyInMinutes[6],
                            "default_action": {
                                "type": "web_url",
                                "url": "https://servicio.io",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://servicio.io"
                            },
                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Checkout recipe",
                                    "payload": "DEVELOPER_DEFINED_PAYLOAD-" + ids[6]
                                }
                            ]
                        },
                        {
                            "title": title[7],
                            "image_url": imageUrlCombined[7],
                            "subtitle": readyInMinutes[7],
                            "default_action": {
                                "type": "web_url",
                                "url": "https://servicio.io",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://servicio.io"
                            },
                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Checkout recipe",
                                    "payload": "DEVELOPER_DEFINED_PAYLOAD-" + ids[7]
                                }
                            ]
                        },
                        {
                            "title": title[8],
                            "image_url": imageUrlCombined[8],
                            "subtitle": readyInMinutes[8],
                            "default_action": {
                                "type": "web_url",
                                "url": "https://servicio.io",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://servicio.io"
                            },
                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Checkout recipe",
                                    "payload": "DEVELOPER_DEFINED_PAYLOAD-" + ids[8]
                                }
                            ]
                        },
                        {
                            "title": title[9],
                            "image_url": imageUrlCombined[9],
                            "subtitle": readyInMinutes[9],
                            "default_action": {
                                "type": "web_url",
                                "url": "https://servicio.io",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://servicio.io"
                            },
                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Checkout recipe",
                                    "payload": "DEVELOPER_DEFINED_PAYLOAD-" + ids[9]
                                }
                            ]
                        },

                    ];
                actions.sendStructuredMessage(sender, elements);
            }
      })
  },

    foodAPIRecipeDetailRequest(sender, id) {

    //console.log("---->" + id);
        let ingridientsLength = 0;

// These code snippets use an open-source library. http://unirest.io/nodejs
    unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/" + id + "/information?includenutrition=false")
        .header("X-Mashape-Key", "M0WkYkVSuvmshQP7S6BBF9BdI3I5p1wSLh3jsnXUQkJCIBbL7d")
        .header("Accept", "application/json")
        .end(function (result) {
            //console.log(result.status, result.headers, result.body);
            //console.log("--------------------->>>>>>>>>>>>:" + JSON.stringify(result.body));
            if (!result.body.extendedIngredients) {
                return;
            }
            for (let y = 0; y < result.body.extendedIngredients.length; y++) {
                receiptDetail.push(result.body.extendedIngredients[y]);
                title.push(receiptDetail[y].originalString);
                images.push(receiptDetail[y].image);

                //console.log(receiptDetail[y].originalString);
                //console.log(receiptDetail[y].image);
            }

            ingridientsLength = result.body.extendedIngredients.length;

            //console.log("Receiptdetail: ----->>>>" + receiptDetail);
            //console.log("title: ----->>>>" + title);
            //console.log("images: ----->>>>" + images);
            console.log("ingredients length ---->>>>> " + ingridientsLength);
            actions.sendListReceiptDetail(sender);
            //var fullInfo = receiptDetail + instructionStepsDetail;
            //sendTextMessage(senderId, JSON.stringify(result.body.analyzedInstructions[0].steps[z]));
        });
},
    sendListReceiptDetail(sender) {
        console.log("sendListReceiptDetail runned");
            let receiptDetailElements1 = [{
                "title": title[0],
                "image_url": images[0],
                "subtitle": "",
                "default_action": {
                    "type": "web_url",
                    "url": "https://servicio.io",
                    "messenger_extensions": true,
                    "webview_height_ratio": "tall",
                    "fallback_url": "https://servicio.io"
                }
            },
            {
                "title": title[1],
                "image_url": images[1],
                "subtitle": "",
                "default_action": {
                    "type": "web_url",
                    "url": "https://servicio.io",
                    "messenger_extensions": true,
                    "webview_height_ratio": "tall",
                    "fallback_url": "https://servicio.io"
                }
            },
            {
                "title": title[2],
                "image_url": images[2],
                "subtitle": "",
                "default_action": {
                    "type": "web_url",
                    "url": "https://servicio.io",
                    "messenger_extensions": true,
                    "webview_height_ratio": "tall",
                    "fallback_url": "https://servicio.io"
                }
            },
            {
                    "title": title[3],
                    "image_url": images[3],
                    "subtitle": "",
                    "default_action": {
                        "type": "web_url",
                        "url": "https://servicio.io",
                        "messenger_extensions": true,
                        "webview_height_ratio": "tall",
                        "fallback_url": "https://servicio.io"
                    }
                }];
        let receiptDetailElements2 = [{
            "title": title[4],
            "image_url": images[4],
            "subtitle": "",
            "default_action": {
                "type": "web_url",
                "url": "https://servicio.io",
                "messenger_extensions": true,
                "webview_height_ratio": "tall",
                "fallback_url": "https://servicio.io"
            }
        },
            {
                "title": title[5],
                "image_url": images[5],
                "subtitle": "",
                "default_action": {
                    "type": "web_url",
                    "url": "https://servicio.io",
                    "messenger_extensions": true,
                    "webview_height_ratio": "tall",
                    "fallback_url": "https://servicio.io"
                }
            },
            {
                "title": title[6],
                "image_url": images[6],
                "subtitle": "",
                "default_action": {
                    "type": "web_url",
                    "url": "https://servicio.io",
                    "messenger_extensions": true,
                    "webview_height_ratio": "tall",
                    "fallback_url": "https://servicio.io"
                }
            },
            {
                "title": title[7],
                "image_url": images[7],
                "subtitle": "",
                "default_action": {
                    "type": "web_url",
                    "url": "https://servicio.io",
                    "messenger_extensions": true,
                    "webview_height_ratio": "tall",
                    "fallback_url": "https://servicio.io"
                }
            }];
        let receiptDetailElements3 = [{
            "title": title[8],
            "image_url": images[8],
            "subtitle": "",
            "default_action": {
                "type": "web_url",
                "url": "https://servicio.io",
                "messenger_extensions": true,
                "webview_height_ratio": "tall",
                "fallback_url": "https://servicio.io"
            }
        },
            {
                "title": title[9],
                "image_url": images[9],
                "subtitle": "",
                "default_action": {
                    "type": "web_url",
                    "url": "https://servicio.io",
                    "messenger_extensions": true,
                    "webview_height_ratio": "tall",
                    "fallback_url": "https://servicio.io"
                }
            },
            {
                "title": title[10],
                "image_url": images[10],
                "subtitle": "",
                "default_action": {
                    "type": "web_url",
                    "url": "https://servicio.io",
                    "messenger_extensions": true,
                    "webview_height_ratio": "tall",
                    "fallback_url": "https://servicio.io"
                }
            },
            {
                "title": title[11],
                "image_url": images[11],
                "subtitle": "",
                "default_action": {
                    "type": "web_url",
                    "url": "https://servicio.io",
                    "messenger_extensions": true,
                    "webview_height_ratio": "tall",
                    "fallback_url": "https://servicio.io"
                }
            }];
        let receiptDetailElements4 = [{
            "title": title[12],
            "image_url": images[12],
            "subtitle": "",
            "default_action": {
                "type": "web_url",
                "url": "https://servicio.io",
                "messenger_extensions": true,
                "webview_height_ratio": "tall",
                "fallback_url": "https://servicio.io"
            }
        },
            {
                "title": title[13],
                "image_url": images[13],
                "subtitle": "",
                "default_action": {
                    "type": "web_url",
                    "url": "https://servicio.io",
                    "messenger_extensions": true,
                    "webview_height_ratio": "tall",
                    "fallback_url": "https://servicio.io"
                }
            },
            {
                "title": title[14],
                "image_url": images[14],
                "subtitle": "",
                "default_action": {
                    "type": "web_url",
                    "url": "https://servicio.io",
                    "messenger_extensions": true,
                    "webview_height_ratio": "tall",
                    "fallback_url": "https://servicio.io"
                }
            },
            {
                "title": title[15],
                "image_url": images[15],
                "subtitle": "",
                "default_action": {
                    "type": "web_url",
                    "url": "https://servicio.io",
                    "messenger_extensions": true,
                    "webview_height_ratio": "tall",
                    "fallback_url": "https://servicio.io"
                }
            }];

        actions.sendListReceiptMessages1(sender, receiptDetailElements1);
        actions.sendListReceiptMessages2(sender, receiptDetailElements2);
        actions.sendListReceiptMessages3(sender, receiptDetailElements3);
        actions.sendListReceiptMessages4(sender, receiptDetailElements4);


    },
    sendListReceiptMessages1(sender, receiptDetailElements1, cb) {
        console.log("sendListMessages1 runned");

            let opts = {
                "form": {
                    "recipient": {
                        "id": sender
                    }, "message": {
                        "attachment": {
                            "type": "template",
                            "payload": {
                                "template_type": "list",
                                "top_element_style": "compact",
                                "elements": receiptDetailElements1,
                                "buttons": [
                                    {
                                        "title": "Checkout Steps",
                                        "type": "postback",
                                        "payload": "Checkout Steps"
                                    }
                                ]
                            }
                        }
                    }
                }
            };
            FBRequest(opts, (err, resp, data) => {
                console.log("ERROR:" + JSON.stringify(err) + "OPTS" + JSON.stringify(opts));
                //if (cb) {
                //   cb(err || data.error && data.error.message, data);
                //}
            });
    },
    sendListReceiptMessages2(sender, receiptDetailElements2, cb) {
        console.log("sendListMessages2 runned");

        let opts = {
            "form": {
                "recipient": {
                    "id": sender
                }, "message": {
                    "attachment": {
                        "type": "template",
                        "payload": {
                            "template_type": "list",
                            "top_element_style": "compact",
                            "elements": receiptDetailElements2,
                            "buttons": [
                                {
                                    "title": "Checkout Steps",
                                    "type": "postback",
                                    "payload": "Checkout Steps"
                                }
                            ]
                        }
                    }
                }
            }
        };
        FBRequest(opts, (err, resp, data) => {
            console.log("ERROR:" + JSON.stringify(err) + "OPTS" + JSON.stringify(opts));
            //if (cb) {
            //   cb(err || data.error && data.error.message, data);
            //}
        });
    },
    sendListReceiptMessages3(sender, receiptDetailElements3, cb) {
            console.log("sendListMessages3 runned");

            let opts = {
                "form": {
                    "recipient": {
                        "id": sender
                    }, "message": {
                        "attachment": {
                            "type": "template",
                            "payload": {
                                "template_type": "list",
                                "top_element_style": "compact",
                                "elements": receiptDetailElements3,
                                "buttons": [
                                    {
                                        "title": "Checkout Steps",
                                        "type": "postback",
                                        "payload": "Checkout Steps"
                                    }
                                ]
                            }
                        }
                    }
                }
            };
            FBRequest(opts, (err, resp, data) => {
                console.log("ERROR:" + JSON.stringify(err) + "OPTS" + JSON.stringify(opts));
                //if (cb) {
                //   cb(err || data.error && data.error.message, data);
                //}
            });
        },
    sendListReceiptMessages4(sender, receiptDetailElements4, cb) {
        console.log("sendListMessages4 runned");

        let opts = {
            "form": {
                "recipient": {
                    "id": sender
                }, "message": {
                    "attachment": {
                        "type": "template",
                        "payload": {
                            "template_type": "list",
                            "top_element_style": "compact",
                            "elements": receiptDetailElements4,
                            "buttons": [
                                {
                                    "title": "Checkout Steps",
                                    "type": "postback",
                                    "payload": "Checkout Steps"
                                }
                            ]
                        }
                    }
                }
            }
        };
        FBRequest(opts, (err, resp, data) => {
            console.log("ERROR:" + JSON.stringify(err) + "OPTS" + JSON.stringify(opts));
            //if (cb) {
            //   cb(err || data.error && data.error.message, data);
            //}
        });
    },

    foodAPIRecipeDetailStepsRequest(sender, id) {

// These code snippets use an open-source library. http://unirest.io/nodejs
    unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/" + id + "/information?includenutrition=false")
        .header("X-Mashape-Key", "M0WkYkVSuvmshQP7S6BBF9BdI3I5p1wSLh3jsnXUQkJCIBbL7d")
        .header("Accept", "application/json")
        .end(function (result) {
            console.log("--------------------------------------------------------------------------------------------");
            //console.log(result.status, result.headers, result.body);
            for (let z = 0; z < result.body.analyzedInstructions[0].steps.length; z++) {
                instructionStepsDetail.push(result.body.analyzedInstructions[0].steps[z].step);
                instructionStepsNumber.push(result.body.analyzedInstructions[0].steps[z].number);
                //sendStepDescription(sender, instructionStepsDetail[z], instructionStepsNumber[z]);
                //console.log(instructionStepsDetail);
                //console.log("HOI:" + instructionStepsDetail[z].length);
            }
            for(let x = 0; x < instructionStepsDetail.length; x++) {
                if (instructionStepsDetail[x].length > 640) {
                    let instructionStepsDetailSpliced = instructionStepsDetail[x].substring(0, instructionStepsDetail[x].length / 2);
                    let instructionStepsDetailSpliced2 = instructionStepsDetail[x].substring(instructionStepsDetail[x].length / 2, instructionStepsDetail[x].length);
                    instructionStepsDetail.push(instructionStepsDetailSpliced);
                    instructionStepsDetail.push(instructionStepsDetailSpliced2);

                    console.log("Spliced: " + instructionStepsDetailSpliced);
                }
            }

            instructionStepsDetailString = JSON.stringify(instructionStepsDetail);
            //var instr1 = JSON.stringify(instructionStepsDetail[0]);

            //console.log(instructionStepsDetail);
            console.log("instructionStepsDetailString: " + instructionStepsDetailString);
            //console.log(instr1);
            console.log("instructionStepsDetail: "  + instructionStepsDetail.length);

            actions.sendStepDescription(sender, instructionStepsDetail);
        });
},
    sendStepDescription(sender) {
        console.log("sendStepDescription runned");
        for (let step = 0; step < instructionStepsDetail.length; step++) {
            let opts = {
                form: {
                    recipient: {
                        id: sender
                    },
                    message: {
                        text: "Step " + instructionStepsNumber[step] + ": " + instructionStepsDetail[step],
                        metadata: "DEVELOPER_DEFINED_METADATA"
                    }
                }
            };
            FBRequest(opts, (err, resp, data) => {
                console.log("ERROR:" + JSON.stringify(err) + "DATA:" + JSON.stringify(data));
                //if (cb) {
                //   cb(err || data.error && data.error.message, data);
                //}
            });
        }
},
};

// Setting up our bot
const wit = new Wit({
  accessToken: WIT_TOKEN,
  actions,
  logger: new log.Logger(log.INFO)
});

// Starting our webserver and putting it all together
const app = express();
app.use(({method, url}, rsp, next) => {
  rsp.on('finish', () => {
    console.log(`${rsp.statusCode} ${method} ${url}`);
  });
  next();
});
app.use(bodyParser.json({ verify: verifyRequestSignature }));

// Webhook setup
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

let intent = "";
let entityCuisine = "";

// Message handler
app.post('/webhook', (req, res) => {
  // Parse the Messenger payload
  // See the Webhook reference
  // https://developers.facebook.com/docs/messenger-platform/webhook-reference
  const data = req.body;
  console.log("Data: " + JSON.stringify(data));

  if (data.object === 'page') {
    data.entry.forEach(entry => {
      entry.messaging.forEach(event => {
          // We retrieve the Facebook user ID of the sender
          const sender = event.sender.id;
          console.log("event:" + JSON.stringify(event));
          if(event.hasOwnProperty("postback")) {
              const postback = event.postback.payload;
              console.log("postpack:" + postback);
              //console.log("Ids: " + ids[0] + ids[1] + ids[2] + ids[3] + ids[4] + ids[5] + ids[6] + ids[7] + ids[8] + ids[9]);
              if (postback === "DEVELOPER_DEFINED_PAYLOAD-" + String(ids[0])) {
                  console.log("1 postback" + ids[0]);
                  actions.foodAPIRecipeDetailRequest(sender, ids[0]);
                  id = ids[0]
              }
              if (postback === "DEVELOPER_DEFINED_PAYLOAD-" + ids[1]) {
                  actions.foodAPIRecipeDetailRequest(sender, ids[1]);
                  console.log("1 postback" + ids[1]);
                  id = ids[1]
              }
              if (postback === "DEVELOPER_DEFINED_PAYLOAD-" + ids[2]) {
                  actions.foodAPIRecipeDetailRequest(sender, ids[2]);
                  console.log("1 postback" + ids[2]);
                  id = ids[2]
              }
              if (postback === "DEVELOPER_DEFINED_PAYLOAD-" + ids[3]) {
                  actions.foodAPIRecipeDetailRequest(sender, ids[3]);
                  console.log("1 postback" + ids[3]);
                  id = ids[3]
              }
              if (postback === "DEVELOPER_DEFINED_PAYLOAD-" + ids[4]) {
                  actions.foodAPIRecipeDetailRequest(sender, ids[4]);
                  console.log("1 postback" + ids[4]);
                  id = ids[4]
              }
              if (postback === "DEVELOPER_DEFINED_PAYLOAD-" + ids[5]) {
                  actions.foodAPIRecipeDetailRequest(sender, ids[5]);
                  console.log("1 postback" + ids[5]);
                  id = ids[5]
              }
              if (postback === "DEVELOPER_DEFINED_PAYLOAD-" + ids[6]) {
                  actions.foodAPIRecipeDetailRequest(sender, ids[6]);
                  console.log("1 postback" + ids[6]);
                  id = ids[6]
              }
              if (postback === "DEVELOPER_DEFINED_PAYLOAD-" + ids[7]) {
                  actions.foodAPIRecipeDetailRequest(sender, ids[7]);
                  console.log("1 postback" + ids[7]);
                  id = ids[7]
              }
              if (postback === "DEVELOPER_DEFINED_PAYLOAD-" + ids[8]) {
                  actions.foodAPIRecipeDetailRequest(sender, ids[8]);
                  console.log("1 postback" + ids[8]);
                  id = ids[8]
              }
              if (postback === "DEVELOPER_DEFINED_PAYLOAD-" + ids[9]) {
                  actions.foodAPIRecipeDetailRequest(sender, ids[9]);
                  console.log("1 postback" + ids[9]);
                  id = ids[9]
              }
              if (postback === "Checkout Steps") {
                  actions.foodAPIRecipeDetailStepsRequest(sender, id)
              }
              if (postback === "GET_STARTED_PAYLOAD" || postback === "search") {
                  actions.firstAnswerChooseCuisine(sender);
              }
          }
          if (event.message && !event.message.is_echo) {
              // Yay! We got a new message!
              // We retrieve the user's current session, or create one if it doesn't exist
              // This is needed for our bot to figure out the conversation history
              const sessionId = findOrCreateSession(sender);
              console.log("sessionId in app.post: " + sessionId);
              // We retrieve the message content
              const {text, attachments} = event.message;
              if (attachments) {
                // We received an attachment
                // Let's reply with an automatic message
              } else if (text.toLowerCase()) {
                // We received a text message
                  console.log("Messaging: " + JSON.stringify(data.entry[0].messaging[0]));
                  console.log(data.entry[0].messaging[0].message.nlp);
                  if (data.entry[0].messaging[0].message.nlp.entities.hasOwnProperty('intent') === true) {
                      console.log('has intent!');
                      //We retrieve the intent
                      intent = data.entry[0].messaging[0].message.nlp.entities.intent[0].value;
                      actions.firstAnswerChooseCuisine(sender);
                  } else {
                      console.log('has no intent!');
                  }
                  if (data.entry[0].messaging[0].message.nlp.entities.cuisine){
                    if (data.entry[0].messaging[0].message.nlp.entities.cuisine[0].confidence >= 0.94) {
                        actions.foodAPIRecipeRequest(sender, data);
                    }
                  } else {
                      console.log('has no cuisine!');
                  }
                // Let's forward the message to the Wit.ai Bot Engine
                // This will run all actions until our bot has nothing left to do
                wit.runActions(
                  sessionId, // the user's current session
                  text, // the user's message
                  sessions[sessionId].context // the user's current session state
                ).then((context) => {
                  // Our bot did everything it has to do.
                  // Now it's waiting for further messages to proceed.
                  console.log('Waiting for next user messages');
                  // Based on the session state, you might want to reset the session.
                  // This depends heavily on the business logic of your bot.
                  // Example:
                  // if (context['done']) {
                  //   delete sessions[sessionId];
                  // }
                  // Updating the user's current session state
                  sessions[sessionId].context = context;
                })
                .catch((err) => {
                  console.error('Oops! Got an error from Wit: ', err.stack || err);
                })
           }
        } else {
          console.log('received event', JSON.stringify(event));
        }
      });
    });
  }
  res.sendStatus(200);
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', FB_APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

app.listen(PORT);
console.log('Listening on :' + PORT + '...');