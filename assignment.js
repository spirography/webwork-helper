/*
 * This script runs on the ASSIGNMENT PAGE of WeBWorK.  It colors in the
 * table cells based on how much of the problem the student got correct.
 */

$(document).ready(function() {

    function drawGradients() {
        // get offset of table
        var table = $(".problem_set_table")[0];

        if (table === undefined) {      // on some pages (like the login page), the table won't be present
            $(window).off("resize");    // detatch event to prevent it from being triggered again
            return false;
        }

        // some values that are useful to cache:
        var table_padding = parseInt($(".problem_set_table td").first().css("padding").replace(/\D/g, "")) * 2; // add to width of table to get correct gradient


        // get percentage that
        $.map($(".problem_set_table tr:gt(0)"), function(n) {
            // first, get the offset from the left side of the screen, in px
            var rect = n.getBoundingClientRect();
            var width = $(n).width()+table_padding;
            // calculate position of the stop, in px
            var percentage = parseInt($(n).children().last().text().replace("%", ""), 10);
            var separation = Math.ceil(width*percentage/100 + rect.left);

            // style the gradient based on how much is complete
            if (percentage === 100) {
                n.style.background = "#dff0d8"; // 100% = all green
            } else if (percentage === 0) {
                n.style.background = "#f2dede"; // 0% = all red
            } else {
                n.style.background = "linear-gradient( to right, #dff0d8, #dff0d8 "+separation+"px, #f2dede "+separation+"px, #f2dede 1600px) fixed";
            }
        });
    }

    /*
     * when window is resized, recalculate the
     * gradient on the table so that it stays accurate
     */
    $(window).resize(drawGradients());
    // setTimeout(function(){ $(window).trigger("resize"); }, 100);
    $(window).trigger("resize");

});
