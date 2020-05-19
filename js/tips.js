var tipsText = ["Drag the object out of the canvas to delete it!",
                "Change the pen and background color to make your sketch more colorful!",
                "Set a different stroke size by changing the 'px' value",
                "Hover over the different tools to find out what they do",
                "Clear the canvas using the 'Delete' tool",
                "Change to a different font family!",
                "The 'Undo' tool is like an eraser for your previous drawing",
                "Your sketch is automatically saved."];

var tipsBtn = document.getElementById("tipsBtn");
var tipText = document.getElementById("tipText");

function genTip () {
  var randomNum, currTip, prevTip = tipText.innerHTML;
  while (true) {
    randomNum = Math.floor(Math.random() * Math.floor(tipsText.length));
    currTip = tipsText[randomNum];
    if (currTip != prevTip) {
      tipText.innerHTML = currTip;
      break;
    }
  }
}

tipsBtn.onclick = function () {genTip();}
