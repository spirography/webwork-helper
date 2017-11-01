/*
* When on the webworks site, tries to figure out
* what page it is on in order to decide which script
* to inject
*
*
* note: "p" in the courses object is short for "problems", and
* "a" is short for "average" - single letters are used to reduce
* space in storage.sync (courses object has a size cap of 8kb)
*/

// hardcoded U of R webwork directory
var ROCHESTER_URL = "https://math.webwork.rochester.edu/webwork2";

// because chrome.tabs.getCurrent(function(tab) can only be run from background pages, use window.location.href instead
var url = window.location.href;

// get the CLASS, ASSIGNMENT, and PROBLEM that WeBWorK is currently on
var PATH, CLASS, ASSIGNMENT, PROBLEM;
// var captured = /math\.webwork\.rochester\.edu\/webwork2(?:\/([\w\.\-\ ]+))?(?:\/([\w\.\-\ ]+))?(?:\/(\d+))?/.exec(url);
var captured = /(.+\/webwork2)(?:\/([\w\.\-\_]+))?(?:\/([\w\.\-\_]+))?(?:\/(\d+))?/.exec(url);
try {   // if the main directory isn't "webwork2", then throw error (not on the WeBWorK website)
PATH = captured[1];
CLASS  = captured[2];
ASSIGNMENT = captured[3];
PROBLEM = captured[4];
} catch (e) {
  // fail silently - this block is here mainly because I don't want a huge chain of "if-else"s
  console.log("error finding webwork directory");
}
console.log("PATH = ", PATH);
console.log("CLASS = ", CLASS);
console.log("ASSIGNMENT = ", ASSIGNMENT);
console.log("PROBLEM = ", PROBLEM);



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

    // better to save preferences in one location instead of scattered all over the file
    var shouldPreferencesBeUpdated = false;

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
      shouldPreferencesBeUpdated = true;
    }

    // save current webwork path
    if (preferences.path !== PATH) {
        preferences.path = PATH;
        shouldPreferencesBeUpdated = true;
    }


    // check if the webwork server is for the University of Rochester (to enable extra features)
    if (PATH === ROCHESTER_URL) { // TODO: check for http / https differences?
        console.log("Meliora!");
        if (preferences.rochester !== true) {
            // save for posterity
            preferences.rochester = true;
            shouldPreferencesBeUpdated = true;

        }
    } else {
        if (preferences.rochester === true) { // remove
            // save for posterity
            preferences.rochester = false;
            shouldPreferencesBeUpdated = true;
        }
    }

    // if the courses object was updated (we'll track that with this variable), save the changes
    var updateCourses = false;

    // update preferences if necessary
    if (shouldPreferencesBeUpdated) {
        chrome.runtime.sendMessage({greeting:"updatePreferences", information:preferences}, function (reply) {
          if (lastError) {
            console.log(lastError.message);
            return;
          }
        });
    }




    /*
    * Add all necessary elements to each input box.
    * Previously, this was done using jQuery in the
    * beginning of the problems.js file
    */
    if (PROBLEM) {

      // get all input boxes
      var inputs = document.querySelectorAll("input.codeshard");

      for (var i = 0; i < inputs.length; i++) {
        // cache id
        var id = inputs[i].getAttribute("id");
        // set minimum width to equal initial width
        inputs[i].style.minWidth = getComputedStyle(inputs[i])["width"];
        // create container for input boxes
        var container = document.createElement("div");
        container.setAttribute("class", "input-container");
        // add MathJax preview box
        container.innerHTML = '<span class="MJpopup-container"><div id="' + id + 'preview" class="MJpopup"><span class="MJarrow"></span></div></span>';


        // add temporary element (future location of the input tag)
        var tempAnchor = document.createElement("a")
        container.appendChild(tempAnchor);
        // create highlight div
        var highlight = document.createElement("div")
        highlight.setAttribute("class", "highlight")
        highlight.setAttribute("id", id+"highlight");
        // set min-width
        highlight.style.minWidth = getComputedStyle(inputs[i])["width"];
        // append highlight div to container
        container.appendChild(highlight);


        // create replace div
        var replace = document.createElement("div");
        replace.setAttribute("class", "replace");
        replace.setAttribute("id", id+"replace");

        var replaceButton = document.createElement("input");
        replaceButton.setAttribute("class", "btn replace_btn")
        var replaceVariable = document.createElement("input");
        replaceVariable.setAttribute("class", "replace_field replace variable hidden");
        replaceVariable.placeholder = "Variable"
        var replaceValue = document.createElement("input");
        replaceValue.setAttribute("class", "replace_field replace_value hidden");
        replaceValue.placeholder = "Value";
        replace.appendChild(replaceButton);
        replace.appendChild(replaceVariable);
        replace.appendChild(replaceValue);

        // append error div to container
        container.appendChild(replace);



        // create errors div
        var errors = document.createElement("div")
        errors.setAttribute("class", "errors")
        errors.setAttribute("id", id+"errors");
        // append error div to container
        container.appendChild(errors);




        // add note container div information (ONLY IF NOTES ARE ENABLED)
        if (preferences.notes) {
            var noteID = (/([\d|_]{4,})/g).exec(id)[1]; // note ID is the numerical/underscore part of the input box ID
            noteID = noteID.replace(/^0+/, ""); // remove leading zeroes

            container.innerHTML += '<span class="note-container"><span class="note-adder"></span><div class="note" style="display: none"><span class="note-xmark" id="'
            + noteID + 'hidenote' +
            '"></span><div class="body" placeholder="Type notes about a problem here" contenteditable="true"></div></div></span>';
        }

        // add container to page
        inputs[i].parentNode.replaceChild(container, inputs[i]);
        // add input box to container
        container.replaceChild(inputs[i], container.getElementsByTagName("a")[0]);


      }



      /*
      * Get the notes for that problem from storage
      *
      * parameters correspond to problem number
      *
      * 15fallmath150 {
      *    1: "Blah blah"
      *    3: "More notes"
      *    7: "Even more notes.  Ain't life wonderful?"
      * }
      *
      */
      if (preferences.notes) {
          var stringID = CLASS+"_"+ASSIGNMENT+"_"+PROBLEM+"_notes"
          chrome.runtime.sendMessage({greeting:"requestNotes",noteName:stringID}, function(reply) {
              console.log("REPLY: ", reply);
          });


        var noteName = CLASS+"_"+ASSIGNMENT+"_"+PROBLEM+"_notes";
        var notes;
        chrome.storage.sync.get(noteName, function(items) {
          var lastError = chrome.runtime.lastError;
          if (lastError) {
            console.log(lastError.message);
            return;
          }
          console.log("ITEMS: ", items);
          if (items[noteName] === undefined) { // no notes for that page
            notes = {};
          } else { // at least one note
            notes = items[noteName];
            // console.log(noteName);
            // console.log(notes);
          }

          // add event listener to note-adder
          var adders = document.getElementsByClassName("note-adder");
          for (var i = 0; i < adders.length; i++) { // iterate over them and check if there is a matching note
            // add note contents if they exist
            if (notes !== undefined) {
                // get id and see if it matches
                var xmarkID = adders[i].nextSibling.getElementsByClassName("note-xmark")[0].id;
                xmarkID = xmarkID.substring(0, xmarkID.length-8);

              if (notes[xmarkID] !== undefined) { // add note content to the corresponding div
                adders[i].nextSibling.getElementsByClassName("body")[0].innerText = notes[xmarkID];
                adders[i].parentNode.parentNode.className += " has-note"; // input and adder button yellow if it already has a note
              }
            }

            // add event listeners
            adders[i].addEventListener("click", showNote, false); // show note
            adders[i].nextSibling.getElementsByClassName("note-xmark")[0].addEventListener("click", hideNote, false); // hide note
          }

          function showNote() {
            this.nextSibling.style.display = "inline-block"; // show note
            this.style.display = "none"; // hide "note-adder"
          }

          function hideNote() {
            this.parentNode.style.display = "none"; // hide "note"

            var thisContainer = this.parentNode.parentNode.parentNode;
            var thisAdder = this.parentNode.previousSibling;
            thisAdder.style.display = "none"; // show "note-adder"

            // problem# + "hidenote"
            var problemNumber = this.id.substr(0, this.id.length-8);

            var noteText = this.parentNode.getElementsByClassName("body")[0].innerText;

            // TODO: edge case where notes[n] is null and noteText = ""
            if (notes[problemNumber] !== noteText) {
              // if note is empty, reset to undefined
              if (noteText === "") {
                delete notes[problemNumber];
                // remove coloring from corresponding container div
                thisContainer.className = thisContainer.className.replace(/(?:^|\s)has-note(?!\S)/g , '');
              } else {
                // color in
                thisContainer.className += " has-note"; // color yellow for existing notes
                // save note
                notes[problemNumber] = noteText;
              }

              // if notes is empty, delete from storage as well
              if (Object.keys(notes).length === 0) {
                chrome.storage.sync.remove([noteName], function() {
                });
              } else { // save to storage
                chrome.storage.sync.set({[noteName]: notes}, function() {
                });
              }

            }

          }

        }); // notes get

      } // preferences.notes end


    }




    if (PROBLEM && courses[CLASS][ASSIGNMENT]["a"] < 100) {

      // check the "you got x% right" at the bottom, update the corresponding problems array index if different
      var percentage = /is \d+%/.exec(document.getElementsByClassName("scoreSummary")[0].children[0].innerText);

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
            "p": [],  // one-indexed array where the key is the percentage completed of a problem (index is the problem name)
            "a": 0  // average of all the values inside of the problems [] array
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
        // get the assignent name (replace spaces with underscores)
        var assignmentName = tableRows[i].children[1].innerText.replace(/ /g, "_");

        // if the assignment doesn't exist in the courses object, add it
        if (courses[CLASS][assignmentName] === undefined) {
          courses[CLASS][assignmentName] = {
            "p": [],  // one-indexed array where the key is the percentage completed of a problem (index is the problem name)
            "a": 0  // average of all the values inside of the problems [] array
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
