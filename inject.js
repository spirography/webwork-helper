/*
 * When on the webworks site, tries to figure out
 * what page it is on in order to decide which script
 * to inject
 */


// because chrome.tabs.getCurrent(function(tab) can only be run from background pages, use window.location.href instead
var url = window.location.href;

// get the CLASS, ASSIGNMENT, and PROBLEM that WeBWorK is currently on
var CLASS, ASSIGNMENT, PROBLEM;
var captured = /math\.webwork\.rochester\.edu\/webwork2(\/(\w+))?(\/(\w+))?(\/(\w+))?/.exec(url);
try {   // if the main directory isn't "webwork2", then throw error (not on the WeBWorK website)
    CLASS  = captured[2];
    ASSIGNMENT = captured[4];
    PROBLEM = captured[6];
} catch (e) {
    // fail silently - this block is here mainly because I don't want a huge chain of "if-else"s
}

var courses, preferences;


if (ASSIGNMENT !== "hardcopy" && ASSIGNMENT !== "options") {

/*
 * load the courses object from background.js
 */
chrome.runtime.sendMessage({greeting:"requestAll"}, function (reply) {

	// check that the message was successfully received
	var lastError = chrome.runtime.lastError;
    if (lastError) {
        console.log(lastError.message);
        return;
    }

    // initialize these objects with their values from storage
    courses = reply.courses;
    preferences = reply.preferences;

    // add the preferences to the body
    var script = document.createElement('script');
    script.textContent = "var preferences="+JSON.stringify(preferences)+";";
    (document.head||document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);

    // do some error checking for new users (who won't have a defined course variable in storage)
    if (courses === null | courses === undefined)
    	courses = {};

    // add the class to the courses object if it isn't already there
    if (CLASS) {
    	if (courses[CLASS] === undefined) {
    		courses[CLASS] = {};
    	}
    }

    // change the lastclass preference to this class if they are different
    if (preferences.lastclass === undefined || (preferences.lastclass !== CLASS && CLASS !== undefined)) {
        preferences.lastclass = CLASS;
        
        // update background.js preferences info
        chrome.runtime.sendMessage({greeting:"updatePreferences", information:preferences}, function (reply) {
            if (lastError) {
                console.log(lastError.message);
                return;
            }
        });
    }



    // if the courses object was updated (we'll track that with this variable), save the changes
    var updateCourses = false;


    if (PROBLEM && courses[CLASS][ASSIGNMENT]["a"] < 100) {

    	// check the "you got x% right" at the bottom, update the corresponding problems array index if different
    	var percentage = /is \d+%/.exec(document.getElementsByClassName("scoreSummary")[0].children[0].innerText)

    	// problems that have not yet been attempted don't display the percentage of questions answered correctly
    	if (percentage !== null) {
    		percentage = parseInt(percentage[0].replace(/\D/g, ""));

    		// compare to the percentage in the courses object.  Use the ABS thing because the page rounds to the whole number, not down
    		 if (Math.abs(courses[CLASS][ASSIGNMENT]["p"][PROBLEM-1] - percentage) > 1) {
    		 	courses[CLASS][ASSIGNMENT]["p"][PROBLEM-1] = percentage;

    		 	// recalculate average
    		 	var avg = 0;
    		 	for (var i = 0; i < courses[CLASS][ASSIGNMENT]["p"].length; i++) {
    		 		avg += courses[CLASS][ASSIGNMENT]["p"][i];
    		 	}
    		 	// update average
    		 	courses[CLASS][ASSIGNMENT]["a"] = Math.floor(avg/courses[CLASS][ASSIGNMENT]["p"].length);

                // if average = 100, then delete the problems array
                if (courses[CLASS][ASSIGNMENT]["a"] === 100) {
                    delete courses[CLASS][ASSIGNMENT]["p"];
                }
    		 	updateCourses = true;

    		}
    	}

	} else if (ASSIGNMENT) {
		// add the problem list to the assignment
		var tableRows = document.getElementsByClassName("problem_set_table")[0];
	   
        // check if the element actually exists (ex. doesn't exist if the user has an expired session)
        if (tableRows !== undefined) {

            tableRows = tableRows.children[1].children;

		    // check if the assignment even exists (same code as below)
	        if (courses[CLASS][ASSIGNMENT] === undefined) {
        	    courses[CLASS][ASSIGNMENT] = {
        		    "p": [],	// one-indexed array where the key is the percentage completed of a problem (index is the problem name)
        		    "a": 0	// average of all the values inside of the problems [] array
        	    };
        	    updateCourses = true;
            }

            if (courses[CLASS][ASSIGNMENT]["a"] < 100) { // don't execute if the assignment is 100% complete

                var problem_array = [];
                var total = 0;
                // fill out the problem array with the correct values
		        for (var i = 1; i < tableRows.length; i++) { // skip the first row (header)
        	        // get the completion percentage
        	        var percentage = parseInt(tableRows[i].children[4].innerText, 10);
        	        total += percentage;
        	        // update the assignment's percentage array
        	        problem_array.push(percentage);
                }
                // check if there are any differences between the two arrays; if there are, then update the courses object with the new array
                if (problem_array.length !== courses[CLASS][ASSIGNMENT]["p"].length) {
                    courses[CLASS][ASSIGNMENT]["p"] = problem_array;
                    courses[CLASS][ASSIGNMENT]["a"] = Math.floor(total / problem_array.length);
                    updateCourses = true;
                } else {
                    for (var i = 0; i < problem_array.length; i++) {
                        if (problem_array[i] !== courses[CLASS][ASSIGNMENT]["p"][i]) {
        			        courses[CLASS][ASSIGNMENT]["p"] = problem_array;
        			        courses[CLASS][ASSIGNMENT]["a"] = Math.floor(total / problem_array.length);
        			        updateCourses = true;
        			        break;
        	            }
        	        }
                }
            }
        }
        
	} else if (CLASS) {

    	// add the assignment list to the options
    	var tableRows = document.getElementsByClassName("problem_set_table")[0];

        // check if the element actually exists (ex. doesn't exist if the user has an expired session)
        if (tableRows !== undefined) {
            tableRows = tableRows.children[1].children;

        

    	    for (var i = 1; i < tableRows.length; i++) { // skip the first row (header)
        	    // get the assignent name
        	    var assignmentName = tableRows[i].children[1].innerText;
        	    // if the assignment doesn't exist in the courses object, add it
        	    if (courses[CLASS][assignmentName] === undefined) {
        		    courses[CLASS][assignmentName] = {
        			    "p": [],	// one-indexed array where the key is the percentage completed of a problem (index is the problem name)
        			    "a": 0	// average of all the values inside of the problems [] array
        		    };
        		    updateCourses = true;
        	    } else {

        		    // only give a percentage if the course has problems in it
                    // if the average is 100, then the array doesn't exist
                    if (courses[CLASS][assignmentName]["a"] === 100) {
                        if (courses[CLASS][assignmentName]["p"] !== undefined) {
                            delete courses[CLASS][assignmentName]["p"]; // delete problems array, we already know each problem is 100% complete
                            updateCourses = true;
                        }
                        tableRows[i].children[2].innerHTML += '<span class="WWsuccess completionPercentage">100</span>';

                    } else if (courses[CLASS][assignmentName]["p"].length > 0) {
        			    // choose the class depending on the percentage
                        var className;
        			    
        			    if (courses[CLASS][assignmentName]["a"] < 70) {
        				    className = "WWdanger";
        			    } else if (courses[CLASS][assignmentName]["a"] < 100) {
        				    className = "WWwarning";
        			    }
                        tableRows[i].children[2].innerHTML += '<span class="'+className+' completionPercentage">' +courses[CLASS][assignmentName]["a"]+'</span>';
                    }
        	    }

    	    }
        }
	}

	// if changes were made to the "courses" object, save them to storage.sync
	if (updateCourses) {

		// send updated courses to background.js
		chrome.runtime.sendMessage({greeting:"updateCourses", information:courses}, function (reply) {
            if (lastError) {
                console.log(lastError.message);
                return;
            }
		});
	}



    /*
     * Create the script in preparation for injection
     */

    var s = document.createElement('script');
    if (PROBLEM) {
        s.src = chrome.extension.getURL('problem.js'); // for answer previews and input expanding

    } else if (ASSIGNMENT) {
        s.src = chrome.extension.getURL('assignment.js'); // for showing how much is completed

    } else if (CLASS) {
        s.src = chrome.extension.getURL('class.js'); // for showing due dates
    }
    // remove from DOM when loaded as security precaution
    s.onload = function () {
        this.parentNode.removeChild(this);
    };
    (document.head || document.documentElement).appendChild(s);

}); // end of requestAll

}