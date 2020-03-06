// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Licensed under the Amazon Software License
// http://aws.amazon.com/asl/

/* eslint-disable  func-names */
/* eslint-disable  no-console */
/* eslint-disable  no-restricted-syntax */
const Alexa = require('ask-sdk');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const languageStrings = {
  'en': require('./languageStrings')
};

const all_items = require('./items.js');

// Launch
const LaunchRequestHandler = {
    
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
       	// init needed session attributes
        sessionAttributes.game_state        = 'configure';
        sessionAttributes.prev 				= [];
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        
        // welcome message
        var prompt      = "<audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/theme.mp3'/> <break time='0.5s'/> Welcome to the Unofficial Disney Guessing Game! <break time='300ms'/> Please say Start Game. <break time='200ms'/> You can say stop to quit at anytime.";
        var reprompt    = "Please say Start Game to continue.";
        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/Walt-Disney-logo.png",
            background: "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/white.jpg",
        };

        return speak(handlerInput,prompt,reprompt,display);
    }
};

// Start Game
const StartIntent   = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StartIntent';
    },
    handle(handlerInput) {

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        // grab random item (in this case, disney character)
        const item      = grabRandomItem(sessionAttributes.prev);
        
        // set item to session
        sessionAttributes.item  = item;
        sessionAttributes.prev.push(item.id);   // add this item to our prev array
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        var prompt      = item.desc + " <break time='300ms'/> Who is that Disney character?";
        var reprompt    = "You can say repeat <break time='300ms'/> or ask for a hint.";
        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/actual/"+item.id+".png",
            background: "https://mttl-tech.s3.amazonaws.com/whos-that-pokemon/images/bg-blue.png"
        };

        // speak
        return speak(handlerInput,prompt,reprompt,display);

    }
};


// DisneyIntent
const DisneyIntent  = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'DisneyIntent');
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        var prompt              = "";
        var reprompt            = "You can say repeat <break time='300ms'/> or ask for a hint.";
        var correct             = false;

        // if user answered a question - determine if right or wrong
        if (handlerInput.requestEnvelope.request.intent.slots.disney !== 'undefined'){
            // determine if answer is correct
            const item_slot = handlerInput.requestEnvelope.request.intent.slots.disney;
            const item_val  = item_slot.resolutions.resolutionsPerAuthority[0].values[0].value;
            const item_id   = item_val.id;
            const item_name = item_val.name;

            correct         = (item_id === sessionAttributes.item.id)? item_slot.value + " is correct! <audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/wand.mp3'/>": "I'm sorry, " + item_slot.value + " is incorrect! <audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/buzzer.mp3'/> The correct answer is " + sessionAttributes.item.name;

            prompt          = correct + " <break time='300ms'/> ";

        } else {
            
            // user didn't answer - they may have just said I don't know
            prompt          = "The correct answer is " + sessionAttributes.item.name + " <break time='300ms'/> ";

        }

        // grab next item
        var item            = grabRandomItem(sessionAttributes.prev);

        // add new item to session
        sessionAttributes.item  = item;
        sessionAttributes.prev.push(item.id);   // add this item to our prev array
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);        

        // add to prompt
        prompt              += " <break time='1s'/> " + item.desc + " <break time='300ms'/> Who is that Disney character?";

        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/actual/"+item.id+".png",
            background: "https://mttl-tech.s3.amazonaws.com/whos-that-pokemon/images/bg-blue.png"
        };

        return speak(handlerInput,prompt,reprompt,display);

    }
};


// RepeatIntent
const RepeatIntent  = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RepeatIntent';
    },
    handle(handlerInput) {

        // grab current item (in this case, disney character)
        const item      = grabCurrentItem(handlerInput);

        var prompt      = item.desc + " <break time='300ms'/> Who is that Disney character?";
        var reprompt    = "You can say repeat <break time='300ms'/> or ask for a hint.";
        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/actual/"+item.id+".png",
            background: "https://mttl-tech.s3.amazonaws.com/whos-that-pokemon/images/bg-blue.png"
        };

        // speak
        return speak(handlerInput,prompt,reprompt,display);
    }
}; 

// HintIntent
const HintIntent    = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'HintIntent');
    },
    handle(handlerInput) {
        // grab current item (in this case, disney character)
        const item      = grabCurrentItem(handlerInput);

        var prompt      = "This character makes the following sound <break time='300ms'/> <audio src='https://whos-that-disney-character.s3.us-east-2.amazonaws.com/audio/edited/" + item.id + ".mp3'/> Who is that Disney character?";
        var reprompt    = "You can say repeat <break time='300ms'/> or ask for a hint.";
        var display     = {
            title:      "Who's That Disney Character?",
            image:      "https://whos-that-disney-character.s3.us-east-2.amazonaws.com/images/actual/"+item.id+".png",
            background: "https://mttl-tech.s3.amazonaws.com/whos-that-pokemon/images/bg-blue.png"
        };

        // speak
        return speak(handlerInput,prompt,reprompt,display);
    }  
};

// DunnoIntent
const DunnoIntent   = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'DunnoIntent';
    },
    handle(handlerInput) {
        return DisneyIntent.handle(handlerInput);
    }
};

// SkipIntent
const SkipIntent    = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'SkipIntent'
            || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NextIntent');
    },
    handle(handlerInput) {
        return DisneyIntent.handle(handlerInput);
    }
};





const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = "You can say repeat, <break time='300ms'/>ask for a hint, <break time='300ms'/> or say stop to quit.";

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Thank you for playing!  If you enjoyed our skill, please rate us in the skill store.';
        return handlerInput.responseBuilder
            .withShouldEndSession(true)
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        //const speakOutput = "Sorry, I don't recognize that Character. Please try again. <break time='300ms'/> You can say skip <break time='300ms'/>, repeat <break time='300ms'/>, or ask for a hint.";
        const speakOutput = 'intent reflector';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        //const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;
        
        //const speakOutput = "Sorry, I don't recognize that Character. Please try again. <break time='300ms'/> You can say skip <break time='300ms'/>, repeat <break time='300ms'/>, or ask for a hint.";
        const speakOutput = 'error handler';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const supportsDisplay = function(handlerInput) {
  var hasDisplay =
    handlerInput.requestEnvelope.context &&
    handlerInput.requestEnvelope.context.System &&
    handlerInput.requestEnvelope.context.System.device &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display

  //console.log("Supported Interfaces are" + JSON.stringify(handlerInput.requestEnvelope.context.System.device.supportedInterfaces));
  return hasDisplay;
}

const grabRandomItem        = function(prev_items=[]){
    var pool    = all_items;

    // remove used items
    if(prev_items && prev_items.length && prev_items.length < pool.length){
        for(var pp in prev_items){
            for (var i=0; i < pool.length; i++) {
                if (pool[i].id === prev_items[pp]) {
                    pool.splice(i,1);
                }
            }
        }
    }

    var item    = pool[Math.floor(Math.random() * pool.length)];

    return item;
}
const grabCurrentItem       = function(handlerInput){
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const item              = sessionAttributes.item;
    return item;
}

const speak                 = function(handlerInput,prompt,reprompt,display){
    if (supportsDisplay(handlerInput)){
        return handlerInput.responseBuilder.addRenderTemplateDirective({
            "type": "BodyTemplate7",
            "token": "SampleTemplate_3476",
            "backButton": "hidden",
            "title": display.title,
                "backgroundImage": {
                "contentDescription": "Blue Background",
                "sources": [
                    {
                        "url": display.background
                        //"url": "https://mttl-tech.s3.amazonaws.com/whos-that-pokemon/images/bg.png"
                    }
                ]
            },
            "image": {
                "contentDescription": display.title,
                "sources": [
                    {
                        "url": display.image
                    }
                ]
            }
        })
            .speak(prompt)
            .reprompt(reprompt)
            .getResponse();
    } else {
        return handlerInput.responseBuilder
            .speak(prompt)
            .reprompt(reprompt)
            .getResponse();
    }
}

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        StartIntent,
        DisneyIntent,
        RepeatIntent,
        HintIntent,
        DunnoIntent,
        SkipIntent,
        //HelloWorldIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .lambda();

