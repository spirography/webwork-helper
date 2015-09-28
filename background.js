// Check whether new version is installed

var courses, preferences;
chrome.runtime.onInstalled.addListener(function(details){

    if(details.reason == "install"){
        console.log("The WeBWorK extension has been installed for the first time");

        // initialize the user preferences
        preferences = {
        	inputs: true, // for expandable inputs (not used)
        	mathjax: true, // for mathjax previews
        	coloring: true, // for color stuff on class and assignment pages (not used)
            //autocompleteBrackets: true, // for autocompleting brackets on problems (not used)
            highlighting: 2 // for highlighting brackets and parentheses
        };
        console.log(preferences);
        chrome.storage.sync.set({preferences}, function() {
            var lastError = chrome.runtime.lastError;
            if (lastError) {
                console.log(lastError.message);
                return;
            }
        	console.log("user preferences successfully initialized", preferences);
        });

    }else if(details.reason == "update"){
        console.log("Successfully updated from " + details.previousVersion + " to " + chrome.runtime.getManifest().version);

        // update courses to new notation
        chrome.storage.sync.get(["courses", "preferences"], function(items) {
            courses = items.courses;
            console.log(items);
            // convert to new notation
            courses = JSON.parse(JSON.stringify(courses).replace(/average/g, "a").replace(/problems/g, "p"));
            //courses = JSON.parse(JSON.stringify(courses).replace(/\"a\"/g, "\"average\"").replace(/\"p\"/g, "\"problems\""));
            // and update
            console.log(JSON.stringify(courses));
            chrome.storage.sync.set({courses}, function(callback) {
                // check that the message was successfully received
                var lastError = chrome.runtime.lastError;
                if (lastError) {
                    console.log(lastError.message);
                    return;
                }
                console.log("WeBWorK course information converted to 1.5+ notation");
            });
        });

    }
});



// load course information and preferences from storage upon startup
console.log("COURSES:", courses);
chrome.storage.sync.get(["courses", "preferences"], function(items) {
	var lastError = chrome.runtime.lastError;
    if (lastError) {
        console.log(lastError.message);
        return;
    }
	console.log("loaded data from storage:", items);
	courses = items.courses;

    // don't load preferences if they are undefined (they never should be)
    if (items.preferences !== undefined && items.preferences !== null)
	   preferences = items.preferences;
});



// if inject.js requests the courses object, send it
chrome.runtime.onMessage.addListener(				// https://developer.chrome.com/extensions/messaging
	function(request, sender, sendResponse) {
		console.log("request received: " + request.greeting);
		if (request.greeting === "requestCourses") {	// not currently used
			sendResponse(courses);
        }
        else if (request.greeting === "requestPreferences") {   // used by options.js
            sendResponse(preferences);
		}
        else if (request.greeting === "requestAll") {	// requests both courses and preferences (which inject.js does)
            if (courses === undefined)
                console.log("POSSIBLE ERROR");
			sendResponse({courses:courses,preferences:preferences});
		}
        else if (request.greeting === "updateCourses") {	// inject.js has an updated version of the courses object
			courses = request.information;
            // update in storage.sync
            chrome.storage.sync.set({courses}, function(callback) {
                // check that the message was successfully received
                var lastError = chrome.runtime.lastError;
                if (lastError) {
                    console.log(lastError.message);
                    return;
                }
                console.log("WeBWorK course information updated");
            });

		}
        else if (request.greeting === "updatePreferences") {	// options.js can have updated versions of the preferences object
			preferences = request.information;
            // update in storage.sync
            chrome.storage.sync.set({preferences}, function() {
                var lastError = chrome.runtime.lastError;
                if (lastError) {
                    console.log(lastError.message);
                    return;
                }
                console.log("WeBWorK user preferences updated", preferences, new Date());
            });
        }

});