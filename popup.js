

function gotoOptions () {

	if (chrome.runtime.openOptionsPage) {
    	// New way to open options pages, if supported (Chrome 42+).
	    chrome.runtime.openOptionsPage();
 	} else {
    	// Reasonable fallback.
    	window.open(chrome.runtime.getURL("options.html"));
	}
}





// adds the link to WeBWorK
function gotoWeBWorK() {

    // load preferences from background.js (need the "lastclass" preference)
    chrome.runtime.sendMessage({greeting: "requestPreferences"}, function (items) {

    	var lastclass = items.lastclass;
    	// already set up as default
    	console.log(lastclass);
    	if (lastclass === undefined || lastclass === null) {
			return;
    	}

    	// use RegExp to get the attributes from the classname
    	var match = /((?:fall)|(?:spring)|(?:summer))(\d+)(mth)(\d+)/.exec(lastclass);
    	//var linktext = "WeBWorK for " + match[1].substr(0, 1).toUpperCase() + match[1].substr(1) + " Math " + match[4];
		var classname;
		if (match == null) { // not in the nice predefined format
			classname = lastclass;
		} else {
			classname = "Math " + match[4];
		}

    	var linktext = "WeBWorK for " + classname;

    	// update the link on the button
    	document.getElementById("goto_webwork").href = items.path + "/" + lastclass + "/";
    	document.getElementById("webwork_div").innerText = linktext;

    	// create a second button with a link to the course website
		// ROCHESTER ONLY FEATURE
		if (items.rochester && match[4] !== null) {
			var link = document.createElement("A");	// set up link
	    	link.href = "https://www.math.rochester.edu/courses/current/" + match[4] + "/";
	    	link.target = "_blank";
	    	var div = document.createElement("DIV");	// set up inner div
	    	div.innerText = classname + " Website";
	    	div.className = "button"
	    	link.appendChild(div);
	    	var menu = document.getElementById("menu");	// add to DOM
	    	menu.appendChild(document.createElement("BR"))
	    	menu.appendChild(link);
		}



    });
}

/*
 * When the JS loads
 */
document.addEventListener("DOMContentLoaded", gotoWeBWorK);

document.getElementById("goto_options").addEventListener("click", gotoOptions);
