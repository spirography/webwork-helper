// Check whether new version is installed

var courses, preferences;

// var foo = {name:"john doe",school:"rochester",favNumber:11};
// chrome.storage.local.set(foo, function(callback) {
//     console.log("foo saved!");
//
//     chrome.storage.local.get(foo, function(callback) {
//         console.log("foo in storage: ", callback);
//     });
// });

chrome.runtime.onInstalled.addListener(function(details){

    /*
     * Like strcmp, but for comparing extension versions
     * if # is positive, version1 is greater
     */
    function versionComp(version1, version2) {
        // parse each one
        console.log(version1.split("."));

        versionToArray = function(version) {
            return version.split(".").map(function(n) {
                return parseInt(n, 10);
            });
        };

        var int1 = versionToArray(version1);
        var int2 = versionToArray(version2);

        var i, n;
        for (i = 0, n = Math.min(int1.length, int2.length); i < n; i++) {
            var diff = int1[i] - int2[i];
            if (diff !== 0) {
                return diff;
            }
        }
        if (int1.length === int2.length) {
            return 0;
        } else {
            return (int1.length > int2.length ? int1[i] : -int2[i]);
        }
    }

    if(details.reason == "install"){
        console.log("The WeBWorK extension has been installed for the first time");

        // initialize the user preferences
        preferences = {
        	inputs: true, // for expandable inputs (not used)
        	mathjax: true, // for mathjax previews
        	coloring: true, // for color stuff on class and assignment pages (not used)
            //autocompleteBrackets: true, // for autocompleting brackets on problems (not used)
            highlighting: 2, // for highlighting brackets and parentheses
            notes: false
        };
        console.log(preferences);
        chrome.storage.local.set({preferences}, function() {
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
        console.log("type:", typeof details.previousVersion);
        if (versionComp(details.previousVersion, "1.5") < 0) {
            chrome.storage.local.get(["courses", "preferences"], function(items) {
                courses = items.courses;
                console.log(items);
                // convert to new notation
                courses = JSON.parse(JSON.stringify(courses).replace(/average/g, "a").replace(/problems/g, "p"));
                //courses = JSON.parse(JSON.stringify(courses).replace(/\"a\"/g, "\"average\"").replace(/\"p\"/g, "\"problems\""));
                // and update
                console.log(JSON.stringify(courses));
                chrome.storage.local.set({courses}, function(callback) {
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

        // switch to localstorage, change how notes are stored
        if (versionComp(details.previousVersion, "1.6.6") < 0) {
            console.log("switching to localStorage...");
            // get EVERYTHING
            chrome.storage.sync.get(function(items) {
                console.log(items);
                console.log("LOOK AT ALL THESE OBJECTS!");
                console.log(items.preferences);

                var test = items.preferences;
                // move over preferences
                chrome.storage.local.set({"preferences":items.preferences}, function(callback) {
                    var lastError = chrome.runtime.lastError;
                    if (lastError) {
                        console.log(lastError.message);
                        return;
                    }
                    console.log("Preferences moved over to localStorage");
                });
            });
        }

    }
});



// load course information and preferences from storage upon startup
console.log("COURSES:", courses);
chrome.storage.local.get(["courses", "preferences"], function(items) {
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
        else if (request.greeting === "requestNotes") { // gets notes for a specific problem
            // which notes to send out
            if (request.noteName !== undefined && request.noteName !== null) {

                chrome.storage.local.get(request.noteName, function(items) {
                    var lastError = chrome.runtime.lastError;
                    if (lastError) {
                      console.log(lastError.message);
                      return;
                    }
                    if (items[request.noteName] === undefined) { // no notes for that page
                      sendResponse({}); // empty object
                    } else { // at least one note
                        console.log("items for request:",items[request.noteName]);
                        console.log("localstorage: ", localStorage);
                      sendResponse(items[request.noteName])
                    }
                });
            } else {
                sendResponse({foo:"dero"});
            }
        }
        else if (request.greeting === "updateCourses") {	// inject.js has an updated version of the courses object
			courses = request.information;
            // update in storage.sync
            chrome.storage.local.set({courses}, function(callback) {
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
            chrome.storage.local.set({preferences}, function() {
                var lastError = chrome.runtime.lastError;
                if (lastError) {
                    console.log(lastError.message);
                    return;
                }
                console.log("WeBWorK user preferences updated", preferences, new Date());
            });
        }

});
