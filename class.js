/*
 * This script runs on the CLASS PAGE of WeBWorK.  It colors in the due
 * dates depending on how much time is remaining
 */
// TODO: update timer colors when countdowns reach certain threshholds?
// TODO: rewrite timer creation code to be more portable?
var TIME_WARNING = 3600*24*2; // 2 days
var TIME_FLASHING = 3600*12; // 12 hours

$(document).ready(function() {


	// add colored formatting to some dates as a notification
    var curdate = Date.now();
    $(".problem_set_table tr td:nth-child(3)").each(function() {
        var text = $(this).text();

        // search for a date
        if (text.search(/\d{2}\/\d{2}\/\d{4}/) !== -1) {
            // give it position: relative so that the timer sticks to it correctly
            $(this).css("position", "relative");

            // found a valid date!
            // get the components
            var regex = /(\d{2})\/(\d{2})\/(\d{4}).+(\d{2}):(\d{2})(\w{2})/
            var match = regex.exec(text);

            // construct a Date object using the matches
            var duedate = new Date(parseInt(match[3], 10), parseInt(match[1]-1, 10), parseInt(match[2], 10), ((match[6] === "pm") ? parseInt(match[4])+12 : parseInt(match[4])), parseInt(match[5]));

            var remainingTime = Math.floor((duedate - curdate) / 1000); // in seconds

            if (remainingTime > 0) {
                // only apply the below if the assignment is open
                if (text.substr(0,4) === "open") {

                    // add a timer <span>, which has the duedate countdown saved to it (measured in seconds)
                    // also save the exact time the assignment is due, in seconds past epoch
                    $("<span/>", {"class": "timer-hidden"}).data("seconds", remainingTime).data("duedate", Math.floor(duedate/1000)).appendTo($(this));
                    // only style if the assignment has not been completed
                    if ($(this).children(".completionPercentage:first-child").text() === "100") {

                        // completed assignments are colored green and override the other styling formats
                        $(this).siblings().andSelf().addClass("WWsuccess");

                    } else {
                        // style the due date text depending on how much time is left
                        if (remainingTime < TIME_FLASHING) { // 12 hours left
                            $(this).parent().addClass("WWflashing");
                        } else if (remainingTime < TIME_WARNING) {  // 48 hours left
                            $(this).parent().addClass("WWwarning");
                        } else {
                            $(this).parent().addClass("WWnormal");
                        }
                    }
                } else {
                    $(this).parent().addClass("disabled");
                }

                incrementTimer(this);
            }
        }

    });

    /*
     * Since the timer doesn't execute when the tab is not visible,
     * the page detects when it regains focus and updates the timer
     * so that the countdowns remain accurate
     */
    document.addEventListener("visibilitychange", function() {
      if (!document.hidden) { // the tab with WeBWorK in it has regained focus and is no longer hidden
        // update timers
        var curtime = Math.floor(Date.now() / 1000); // the new current time, in seconds past epoch
        $(".timer-hidden").each(function() {
          $(this).data("seconds", $(this).data("duedate") - curtime); // calculate the new amount of time remaining
        });
      }
    }, false);

    // update times
    window.setInterval(function(){
        // get the corresponding table rows
        $(".timer-hidden").each(function() {
            incrementTimer(this);
        });
    }, 1000);


    /*
     * Sets a timer to the correct time
     * used when timer is first created and
     * when the tab is focused on again
     * after being hidden
     */
    function setTimer(element) {
      console.log(element.parent());
    }


    /*
     * Displays the time remaining before an open assignment is due
     */
    function incrementTimer(element) {
            // check if it has a timer attached
            var time = $(element).data("seconds");
            if (typeof time === "number") {
                time--;

                if (time < 0) {
                    // delete the timer, it is no longer needed
                    $(element).remove();
                } else {
                    $(element).data("seconds", time);
                    if (time > 3600*24) {
                        // more than 1 day remaining
                        var days = Math.floor(time/3600/24);
                        $(element).text(days + (days == 1 ? " day" : " days"));
                    } else {
                        // less than one day remaining
                        var hours = "00"+Math.floor(time/3600);
                        time -= hours*3600;
                        var minutes = "00"+Math.floor(time/60);
                        time -= minutes*60;
                        var seconds = "00"+Math.floor(time);
                        // display the remaining time (in the form hh : mm : ss)
                        $(element).text(hours.substr(hours.length-2) + " : " + minutes.substr(minutes.length-2) + " : " + seconds.substr(seconds.length-2));
                    }
                }
            }
    }


});
