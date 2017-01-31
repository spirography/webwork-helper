var preferences, courses;

/*
 * Saves options to chrome.storage.sync.
 */
function save_options() {

    var highlighting_group = document.getElementsByName("highlighting");
    var highlight_value = 0;
    for (var i = 0; i < highlighting_group.length; i++) {
        if (highlighting_group[i].checked) {
            highlight_value = i;
            break;
        }
    }

    preferences.inputs = document.getElementById("inputs").checked;
    preferences.mathjax = document.getElementById("mathjax").checked;
    preferences.highlighting = highlight_value;
    preferences.coloring = document.getElementById("coloring").checked;
    preferences.notes = document.getElementById("notes").checked;


    // display "Options saved" message (can't go into the sendMessage block for some reason, probably because background.js doesn't send a response)
    var status = document.getElementById("status");
    status.textContent = "Options saved.";
    setTimeout(function () {
        status.textContent = "\u00A0";
    }, 750);

    // update background.js preferences info
    chrome.runtime.sendMessage({greeting: "updatePreferences", information: preferences});
}



/*
 * After a confirmation message, deletes all information for a specific course
 */
function delete_course(element) {

    // delete the element from the courses object
    delete courses[element.getAttribute("value")];

    // remove the element from the DOM
    element.remove();

    // save courses and update background.js
    chrome.runtime.sendMessage({greeting: "updateCourses", information: courses});

    // TODO: delete all notes associated with that course

    // update memory usage in the options menu
    document.getElementById("total-memory-used").innerText = "Total memory used: " + memory_used() + " bytes";

}


/*
 * Restores select box and checkbox state using the preferences
 * stored in chrome.storage.
 */
function restore_options() {
    // load preferences from background.js
    chrome.runtime.sendMessage({greeting: "requestAll"}, function (items) {

        preferences = items.preferences;
        courses = items.courses;

        document.getElementById("inputs").checked = preferences.inputs;
        document.getElementById("mathjax").checked = preferences.mathjax;
        document.getElementById("highlighting" + preferences.highlighting).checked = true; // highlight specific radio button
        document.getElementById("coloring").checked = preferences.coloring;
        document.getElementById("notes").checked = preferences.notes;

        // course list
        var courseInfo = document.getElementById("courses");
        for (var key in courses) {
            if (courses.hasOwnProperty(key)) { // TODO: combine code in popup.js with this
                // get name info with regexp (same code as in popup.js)
                var match = /((?:fall)|(?:spring)|(?:summer))(\d+)(mth)(\d+)/.exec(key);
                var formattedname;
                if (match === null) {
                    formattedname = key;
                } else {
                    formattedname = match[1].substr(0, 1).toUpperCase() + match[1].substr(1) + " Math " + match[4];
                }
                courseInfo.innerHTML += '<div class="delete-course" value="'+key+'">' + formattedname + '<span class="object-size">'+JSON.stringify(courses[key]).length + ' bytes</span>' + '</div>';
            }
        }
        courseInfo = document.getElementsByClassName("delete-course");
        for (var i = 0; i < courseInfo.length; i++) {
            courseInfo[i].addEventListener("click", function() {delete_course(this);});
        }

        // print out total sync storage space used by extension
        chrome.storage.sync.getBytesInUse(null, function(bytesInUse) {
            document.getElementById("total-memory-used").innerText = "Total memory used: " + bytesInUse + " bytes";
        });
    });
}

document.addEventListener("DOMContentLoaded", restore_options);
// when clicked, saves the user's preferences
document.getElementById("save").addEventListener("click", save_options);
