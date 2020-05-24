var canvas = document.getElementById("sketchCanvas");
var ctx = canvas.getContext("2d");

var windowWidth = window.innerWidth;
var windowHeight = window.innerWidth;
var pixelRatio = window.devicePixelRatio; // 1 css pixel to 1 physical pixel

// STYLING TOOLS
var colorInput = document.getElementById("colorShapes");
var pixelSize = document.getElementById("pixelSize");
var bgColor = document.getElementById("bgColor");

// GLOBALS
var STATE = null, prevState = null;
const STORAGE = "SKETCH/canvasElements";

var cardContainerX = document.getElementById("cardContainer").offsetLeft;
var cardContainerY = document.getElementById("cardContainer").offsetTop;

var mouseDown = false, reloaded = false, askToResizeImage = false;
var isMobile, isTouchScreen;

var canvasElements = [];

var target = [-1];
var startX, startY;
var deleteItem = -1;
var drawRectPrev = [-1, -1], startDrawRect = 0;
var drawEllipsePrev = [-1, -1], startDrawEllipse = 0;
var startDrawPen = 0, currX, currY, prevX, prevY;
var lastText = null, startDrawText = 0, blinkingText;
const ignoredKeys = [9, 13, 16, 17, 18, 20, 27, 37, 38, 39, 40,
                    112, 113, 114, 115, 116, 117, 118, 119, 120,
                    121, 122, 123, 124, 224];

// TOOLS
var selectBtn = document.getElementById("selectBtn");
var rectBtn = document.getElementById("rectBtn");
var ellipseBtn = document.getElementById("ellipseBtn");
var penBtn = document.getElementById("penBtn");
var undoBtn = document.getElementById("undoBtn");
var textBtn = document.getElementById("textBtn");
var downloadBtn = document.getElementById("downloadBtn");
var deleteBtn = document.getElementById("deleteBtn");
var imgUploadBtn = document.getElementById("imgUploadBtn");
var imgUpload = document.getElementById("imgUpload");

var buttons = [selectBtn, rectBtn, ellipseBtn, penBtn, undoBtn, textBtn, downloadBtn, deleteBtn, imgUploadBtn];

// Custom comparator
function comp (a, b) {return a.error - b.error;}

// Save to localStorage
function save () {
  // 4 events: drawing, deleting, moving, undo
  localStorage.setItem(STORAGE, JSON.stringify([canvasElements, bgColor.value]));
}

function load () {
  var currElements = localStorage.getItem(STORAGE);
  if (currElements) {
    currElements = JSON.parse(currElements);
    bgColor.setAttribute("value", currElements[1]);
    colorBackground(currElements[1]);
    canvasElements = currElements[0];
    redraw();
  }
}

function displayWarning () {
  isMobile = navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i);
  if (isMobile) {M.Modal.getInstance(document.getElementById("warnScreenSize")).open();}
}

// SCALING
function resize () {
  windowWidth = window.innerWidth;
  windowHeight = window.innerWidth;
  pixelRatio = window.devicePixelRatio;
  canvas.width = canvas.parentNode.clientWidth - 100;
  canvas.height = 600;
  colorBackground();
}

function colorBackground (color=bgColor.value) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawRect (x, y, width, height, lineWidth=1, color="#000000", add=1) {
  ctx.fillStyle = color;
  ctx.lineWidth = parseInt(lineWidth);
  ctx.fillRect(x, y, width, height);
  if (!add) {return;}
  canvasElements.push({"type": "rect", "x": x, "y": y,
                      "width": width, "height": height, "color": color,
                      "lineWidth": lineWidth});
}

function drawEllipse (x, y, width, height, lineWidth=1, color="#000000", add=1) {
  ctx.fillStyle = color;
  ctx.lineWidth = parseInt(lineWidth);
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, height / 2, 0, 0, 2 * Math.PI);
  ctx.fill();
  if (!add) {return;}
  canvasElements.push({"type": "ellipse", "x": x, "y": y,
                      "width": width, "height": height, "color": color,
                      "lineWidth": lineWidth});
}

function drawPen (prevX, prevY, currX, currY, lineWidth=1, color="#000000", add=1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = parseInt(lineWidth);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(prevX, prevY);
  ctx.lineTo(currX, currY);
  ctx.stroke();
  if (!add) {return;}
  canvasElements.push({"type": "pen", "prevX": prevX, "prevY": prevY,
                      "currX": currX, "currY": currY, "color": color,
                      "lineWidth": lineWidth});
}

function drawText (text, x, y, fontSize=30, fontFamily="Arial", color="#000000") {
  ctx.font = fontSize.toString() + "px " + fontFamily;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawImg (dataURL, x, y, width=0, height=0, isUrl=0, index=-1, add=1) {
  if (isUrl) {
    var img = new Image;
    img.src = dataURL;
    img.onload = function () {
      if (askToResizeImage) {
        document.getElementById("setImgWidth").value = img.width;
        document.getElementById("setImgHeight").value = img.height;
        var modalInstance = M.Modal.getInstance(document.getElementById("resizeImage"));
        modalInstance.open();
      }
      function setImage () {
        var imgWidth = document.getElementById("setImgWidth").value;
        var imgHeight = document.getElementById("setImgHeight").value;

        var imgScales = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
        var lastScale = -1, testWidth = imgWidth, testHeight = imgHeight;
        while (testWidth > canvas.width * 0.8 || testHeight > canvas.height * 0.8) {
          testWidth = imgWidth; testHeight = imgHeight;
          if (imgScales.length == 0) {lastScale *= 0.1;}
          else {lastScale = imgScales.pop();}
          testWidth *= lastScale;
          testHeight *= lastScale;
        }
        imgWidth = testWidth; imgHeight = testHeight;
        ctx.drawImage(img, x, y, imgWidth, imgHeight);
        if (index != -1) {canvasElements[index]["img"] = img;} // update image element
        if (!add){return;}
        canvasElements.push({"type": "img", "img": img, "dataURL": dataURL, "x": x, "y": y,
                            "width": imgWidth, "height": imgHeight});
      }
      if (!askToResizeImage) {setImage();}
      else {
        document.getElementById("confirmResize").onclick = function () {
          askToResizeImage = false;
          setImage();
        }
      }
    }
  }
  else {
    var img = dataURL;
    ctx.drawImage(img, x, y, width, height);
    if (index != -1) {canvasElements[index]["img"] = img;} // update image element
    if (!add){return;}
    canvasElements.push({"type": "img", "img": img, "dataURL": img.src, "x": x, "y": y,
                        "width": imgWidth, "height": imgHeight});
  }
}

function eraseRect (x, y, width, height, lineWidth=1) {
  // check sign change
  lineWidth = parseInt(lineWidth);
  var prevX = width < 0 ? x + lineWidth : x - lineWidth;
  var prevY = height < 0 ? y + lineWidth : y - lineWidth;
  var clearWidth = (width < 0 ? width - lineWidth * 2 : width + lineWidth * 2);
  var clearHeight = (height < 0 ? height - lineWidth * 2 : height + lineWidth * 2);
  ctx.clearRect(prevX, prevY, clearWidth, clearHeight);
}

function eraseEllipse (x, y, width, height, lineWidth) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = parseInt(lineWidth);
  ctx.beginPath();
  ctx.ellipse(x, y, width, height, 0, 2 * Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

function clearAndRedraw () {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  redraw();
}

function doBlinkingText (x, y, fontSize=30, fontFamily="Arial", color="#000000") {
  // blinking cursor effect
  // too expensive?
  startDrawText = false;
  blinkingText = setInterval(function () {
                  if (!startDrawText) {
                    drawText("I", x, y, fontSize, fontFamily, color);
                    startDrawText = true;
                  }
                  else {
                    clearAndRedraw();
                    startDrawText = false;
                  }
                }, 400);
}

function redraw () {
  colorBackground();
  for (var i = 0; i < canvasElements.length; i ++) {
    if (canvasElements[i]["type"] == "rect") {
      drawRect(canvasElements[i]["x"], canvasElements[i]["y"],
              canvasElements[i]["width"], canvasElements[i]["height"],
              canvasElements[i]["lineWidth"], canvasElements[i]["color"], 0);
    }
    else if (canvasElements[i]["type"] == "ellipse") {
      drawEllipse(canvasElements[i]["x"], canvasElements[i]["y"],
                canvasElements[i]["width"], canvasElements[i]["height"],
                canvasElements[i]["lineWidth"], canvasElements[i]["color"], 0);
    }
    else if (canvasElements[i]["type"] == "pen") {
      drawPen(canvasElements[i]["prevX"], canvasElements[i]["prevY"],
              canvasElements[i]["currX"], canvasElements[i]["currY"],
              canvasElements[i]["lineWidth"], canvasElements[i]["color"], 0);
    }
    else if (canvasElements[i]["type"] == "text") {
      drawText(canvasElements[i]["text"], canvasElements[i]["x"], canvasElements[i]["y"],
              canvasElements[i]["fontSize"], canvasElements[i]["fontFamily"], canvasElements[i]["color"]);
    }
    else if (canvasElements[i]["type"] == "img") {
      if (reloaded) {
        drawImg(canvasElements[i]["dataURL"], canvasElements[i]["x"], canvasElements[i]["y"],
                canvasElements[i]["width"], canvasElements[i]["height"], 1, i, 0);
      }
      else {
        drawImg(canvasElements[i]["img"], canvasElements[i]["x"], canvasElements[i]["y"],
                canvasElements[i]["width"], canvasElements[i]["height"], 0, i, 0);
      }
    }
  }
  reloaded = false;
}

function getTargetElement (offsetX, offsetY) {
  var elements = [], xError = 0, yError = 0, error = 0;
  var relativeWidth = 0, relativeHeight = 0;
  for (var i = 0; i < canvasElements.length; i ++) {
    if (canvasElements[i]["type"] == "pen") {continue;}
    var x = canvasElements[i]["x"], y = canvasElements[i]["y"];

    xError = Math.abs(offsetX - x) / canvas.height * 100;
    yError = Math.abs(offsetY - y) / canvas.height * 100;
    error = Math.pow(Math.pow(xError, 2) + Math.pow(yError, 2), 0.5);

    relativeWidth = offsetX - x;
    relativeHeight = offsetY - y;

    if (canvasElements[i]["type"] == "text") {
      var textWidth = canvasElements[i]["width"];
      if (offsetX >= x && offsetX <= x + textWidth && yError <= 5) {
        elements.push({"error": error, "element": [canvasElements[i], i, relativeWidth, relativeHeight]});
      }
    }
    else {
      var width = canvasElements[i]["width"], height = canvasElements[i]["height"];
      if (canvasElements[i]["type"] == "ellipse") {
        // for ellipse, startX and startY is the center coordinate
        // width and height will always be > 0
        var radiusX = width / 2;
        var radiusY = height / 2;
      }
      // check if element is clicked on
      if (width < 0) {
        // only rect
        if (!(offsetX <= x && offsetX >= x - Math.abs(width))) {continue;}
      }
      else {
        if (canvasElements[i]["type"] == "rect" || canvasElements[i]["type"] == "img") {
          if (!(offsetX >= x && offsetX <= x + width)) {continue;}
        }
        else if (canvasElements[i]["type"] == "ellipse") {
          if (!(offsetX >= x - radiusX && offsetX <= x + radiusX)) {continue;}
        }
      }
      if (height < 0) {
        // only rect
        if (!(offsetY <= y && offsetY >= y - Math.abs(height))) {continue;}
      }
      else {
        if (canvasElements[i]["type"] == "rect" || canvasElements[i]["type"] == "img") {
          if (!(offsetY >= y && offsetY <= y + height)) {continue;}
        }
        else if (canvasElements[i]["type"] == "ellipse") {
          if (!(offsetY >= y - radiusY && offsetY <= y + radiusY)) {continue;}
        }
      }
      elements.push({"error": error, "element": [canvasElements[i], i, relativeWidth, relativeHeight]});
    }
  }
  if (elements.length == 0) {return [-1, -1];} // no element is selected
  elements.sort(comp);
  return elements[0].element;
}

function saveText (text, x, y, fontSize=30, fontFamily="Arial", color="#000000") {
  for (var i = 0; i < canvasElements.length; i ++) {
    // need a better way to do this
    if (canvasElements[i]["type"] == "text" && canvasElements[i]["x"] == x &&
        canvasElements[i]["y"] == y && parseInt(canvasElements[i]["fontSize"]) == parseInt(fontSize)
        && canvasElements[i]["fontFamily"] == fontFamily && canvasElements[i]["color"] == color) {
        ctx.font = fontSize.toString() + "px " + fontFamily;
        var textWidth = ctx.measureText(text).width;
        canvasElements[i]["text"] = text;
        canvasElements[i]["width"] = textWidth;
        return;
    }
  }
  ctx.font = fontSize.toString() + "px " + fontFamily;
  var textWidth = ctx.measureText(text).width;
  var textHeight = ctx.measureText("M").width; // approximation
  var data = {"type": "text", "text": text, "x": x, "y": y, "width": textWidth, "height": textHeight,
              "fontSize": fontSize, "fontFamily": fontFamily, "color": color};
  canvasElements.push(data);
}

function deleteText (text, x, y, fontSize=30, fontFamily="Arial", color="#000000") {
  for (var i = 0; i < canvasElements.length; i ++) {
    if (canvasElements[i]["type"] == "text" && canvasElements[i]["text"] == text &&
        canvasElements[i]["x"] == x && canvasElements[i]["y"] == y &&
        parseInt(canvasElements[i]["fontSize"]) == parseInt(fontSize) &&
        canvasElements[i]["fontFamily"] == fontFamily &&
        canvasElements[i]["color"] == color) {
        canvasElements.splice(i, 1); return;
    }
  }
}

function handleKeyPress (e) {
  if (STATE == "textBtn" && lastText) {
    e.preventDefault();
    if (blinkingText) {clearInterval(blinkingText);}
    var newKey = e.key, newText = lastText[0];
    var updateText = false;
    if (ignoredKeys.includes(e.keyCode)) {return;}
    else if (newKey == "Backspace") {
      newText = lastText[0].slice(0, lastText[0].length - 1);
      updateText = true;
    }
    else {newText += newKey; updateText = true;}
    if (updateText) {
      clearAndRedraw();
      drawText(newText, startX, startY, pixelSize.value, "Arial", colorInput.value);
      lastText[0] = newText;
      // save text to canvasElements
      saveText(newText, startX, startY, pixelSize.value, "Arial", colorInput.value);
      if (newText.length == 0) {deleteText("", startX, startY, pixelSize.value, "Arial", colorInput.value);}
      var textWidth = ctx.measureText(newText).width;
      save();
      doBlinkingText(startX + textWidth, startY, pixelSize.value, "Arial", colorInput.value);
    }
  }
}

function handleMouseDown (e) {
  e.preventDefault();
  mouseDown = true;
  var offsetX, offsetY;
  if (isTouchScreen) {
    offsetX = e.touches[0].pageX - e.target.offsetLeft - cardContainerX;
    offsetY = e.touches[0].pageY - e.target.offsetTop - cardContainerY;
  }
  else {
    offsetX = e.offsetX; // relative to left of canvas
    offsetY = e.offsetY; // relative to top of canvas
  }
  if (STATE == "rectBtn") {
    startX = offsetX; startY = offsetY;
    startDrawRect = 1;
    return;
  }
  else if (STATE == "ellipseBtn") {
    startX = offsetX; startY = offsetY;
    startDrawEllipse = 1;
    return;
  }
  else if (STATE == "penBtn") {
    prevX = offsetX; prevY = offsetY;
    startDrawPen = 1;
    return;
  }
  else if (STATE == "textBtn") {
    if (blinkingText) {clearInterval(blinkingText);}
    startX = offsetX; startY = offsetY;
    lastText = ["", startX, startY];
    doBlinkingText(startX, startY, pixelSize.value, "Arial", colorInput.value);
  }
  else {
    if (STATE == "imgUploadBtn") {resetStates(); highlightBtn(selectBtn);}
    // SELECT ELEMENTS
    target = getTargetElement(offsetX, offsetY);
    if (target[0] == -1) {return;}
    startX = offsetX; startY = offsetY;
  }
}

function handleMouseMove (e) {
  e.preventDefault();
  if (mouseDown) {redraw();} else {return;}
  var offsetX, offsetY;
  if (isTouchScreen) {
    offsetX = e.touches[0].pageX - e.target.offsetLeft - cardContainerX;
    offsetY = e.touches[0].pageY - e.target.offsetTop - cardContainerY;
  }
  else {
    offsetX = e.offsetX; // relative to left of canvas
    offsetY = e.offsetY; // relative to top of canvas
  }
  if ((STATE == "rectBtn" && startDrawRect) || (STATE == "ellipseBtn" && startDrawEllipse)) {
    var width = offsetX - startX;
    var height = offsetY - startY;
    if (startDrawRect) {
      if (drawRectPrev[0] != -1) {
        eraseRect(drawRectPrev[0]["x"], drawRectPrev[0]["y"],
                  drawRectPrev[0]["width"], drawRectPrev[0]["height"],
                  drawRectPrev[0]["lineWidth"]);
      }
      var data = {"type": "rect", "x": startX, "y": startY,
                  "width": width, "height": height,
                  "lineWidth": pixelSize.value, "color": colorInput.value};
      if (drawRectPrev[0] != -1){
        canvasElements[drawRectPrev[1]]["width"] = width;
        canvasElements[drawRectPrev[1]]["height"] = height;
      }
      else {
        drawRectPrev[1] = canvasElements.length;
        drawRectPrev[0] = data;
        canvasElements.push(data);
      }
      drawRectPrev[0] = canvasElements[drawRectPrev[1]];
      drawRect(startX, startY, width, height, pixelSize.value, colorInput.value, 0);
    }
    else if (startDrawEllipse) {
      if (pixelSize.value >= width || pixelSize.value >= height) {return;}
      if (width < 0 || height < 0) {return;}
      if (drawEllipsePrev[0] != -1) {
        eraseEllipse(drawEllipsePrev[0]["x"], drawEllipsePrev[0]["y"],
                    drawEllipsePrev[0]["width"], drawEllipsePrev[0]["height"],
                    drawEllipsePrev[0]["lineWidth"]);
      }

      var data = {"type": "ellipse", "x": startX, "y": startY,
                  "width": width, "height": height,
                  "lineWidth": pixelSize.value, "color": colorInput.value};
      if (drawEllipsePrev[0] != -1) {
        canvasElements[drawEllipsePrev[1]]["width"] = width;
        canvasElements[drawEllipsePrev[1]]["height"] = height;
      }
      else {
        drawEllipsePrev[1] = canvasElements.length;
        drawEllipsePrev[0] = data;
        canvasElements.push(data);
      }
      drawEllipsePrev[0] = data;
      drawEllipse(startX, startY, width, height, pixelSize.value, colorInput.value, 0);
    }
  }
  else if (STATE == "penBtn" && startDrawPen) {
    currX = offsetX; currY = offsetY;
    drawPen(prevX, prevY, currX, currY, pixelSize.value, colorInput.value);
    prevX = currX; prevY = currY;
    save();
  }
  else {
    canvas.classList.add("move");
    // MOVING OBJECTS ON CANVAS
    if (target[0] == -1 || target[0]["type"] == "pen") {return;}

    var x = target[0]["x"], y = target[0]["y"];

    startX = offsetX - target[2];startY = offsetY - target[3];

    var boundX, boundY, limX, limY;
    limX = -target[0]["width"] / 2;
    limY = -target[0]["height"] / 2;

    if (target[0]["type"] == "rect" || target[0]["type"] == "text" || target[0]["type"] == "img") {
      boundX = startX + target[0]["width"];
      boundY = startY + target[0]["height"];
    }
    else if (target[0]["type"] == "ellipse") {
      boundX = startX + target[0]["width"] / 2;
      boundY = startY + target[0]["height"] / 2;
    }

    if (boundX + limX > canvas.width || boundX + limX< 0 ||
        boundY + limY> canvas.height || boundY + limY< 0) {
          // DELETING OBJECTS ON CANVAS
          var modalInstance = M.Modal.getInstance(document.getElementById("deleteItem"));
          modalInstance.open();
          deleteItem = target[0];
          return;
    }

    if (target[0]["type"] == "rect") {
      canvasElements[target[1]]["x"] = startX < 0 ? 0 : startX;
      canvasElements[target[1]]["y"] = startY < 0 ? 0 : startY;
      eraseRect(x, y, target[0]["width"], target[0]["height"], target[0]["lineWidth"]);
      drawRect(startX, startY, target[0]["width"], target[0]["height"],
              target[0]["lineWidth"], target[0]["color"], 0);
    }
    else if (target[0]["type"] == "img") {
      canvasElements[target[1]]["x"] = startX < 0 ? 0 : startX;
      canvasElements[target[1]]["y"] = startY < 0 ? 0 : startY;
      eraseRect(x, y, target[0]["width"], target[0]["height"]);
      drawImg(target[0]["img"], startX, startY, target[0]["width"], target[0]["height"], 0, -1, 0);
    }
    else if (target[0]["type"] == "ellipse") {
      canvasElements[target[1]]["x"] = startX < 0 ? 0 : startX;
      canvasElements[target[1]]["y"] = startY < 0 ? 0 : startY;
      eraseEllipse(x, y, target[0]["width"], target[0]["height"], target[0]["lineWidth"]);
      drawEllipse(startX, startY, target[0]["width"], target[0]["height"],
                  target[0]["lineWidth"], target[0]["color"], 0);
    }
    else if (target[0]["type"] == "text") {
      canvasElements[target[1]]["x"] = startX < 0 ? 0 : startX;
      canvasElements[target[1]]["y"] = startY < 0 ? 0 : startY;
      drawText(target[0]["text"], startX, startY, target[0]["fontSize"],
              target[0]["fontFamily"], target[0]["color"]);
      clearAndRedraw();
    }
    save();
  }
}

function undo () {
  if (canvasElements.length == 0) {return;}
  var undoElem = canvasElements.pop();
  if (undoElem["type"] == "rect") {
    eraseRect(undoElem["x"], undoElem["y"], undoElem["width"], undoElem["height"], undoElem["lineWidth"]);
  }
  else if (undoElem["type"] == "ellipse") {
    eraseEllipse(undoElem["x"], undoElem["y"], undoElem["width"], undoElem["height"], undoElem["lineWidth"]);
  }
  else if (undoElem["type"] == "pen") {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  else if (undoElem["type"] == "img") {
    eraseRect(undoElem["x"], undoElem["y"], undoElem["width"], undoElem["height"]);
  }
  save();
  redraw();
}

function endDraw (e) {
  e.preventDefault();
  if (deleteItem == -1) {target = [-1];}
  mouseDown = false;
  canvas.classList.remove("move");
  if (STATE == "rectBtn") {
    drawRectPrev = [-1, -1];
  }
  else if (STATE == "ellipseBtn") {
    drawEllipsePrev = [-1, -1];
  }
  save();
  redraw();
}

function resetStates () {
  if (STATE == "rectBtn") {
    drawRectPrev = [-1, -1];
    startDrawRect = 0;
    canvas.classList.remove("crosshair");
  }
  else if (STATE == "ellipseBtn") {
    drawEllipsePrev = [-1, -1];
    startDrawEllipse = 0;
    canvas.classList.remove("crosshair");
  }
  else if (STATE == "penBtn") {
    startDrawPen = 0;
  }
  else if (STATE == "textBtn") {
    if (blinkingText) {clearInterval(blinkingText);}
    clearAndRedraw();
    lastText = null;
    startDrawText = 0;
    updateText = 0;
    pixelSize.setAttribute("value", "2");
  }
  STATE = null;
}

function highlightBtn (btn) {
    for (var i = 0; i < buttons.length; i ++) {
      if (buttons[i] != btn && buttons[i].classList.contains("red")) {
        buttons[i].classList.remove("red");
      }
    }
    btn.classList.add("red");
}


window.onresize = function () {resize(); redraw(); displayWarning();}
window.onload = function () {
  reloaded = true;
  var modal = document.querySelectorAll(".modal");
  var modalInstance = M.Modal.init(modal, {});
  resize(); load(); displayWarning(); genTip();
  isTouchScreen = "ontouchstart" in window;
  if (isTouchScreen) {touchEvents();}
  else{mouseEvents();}
}

document.getElementById("confirmDelete").onclick = function () {
  if (STATE == "clearAll") {
    canvasElements = [];
    clearAndRedraw();
    STATE = prevState;
    resetStates();
    save();
    prevState = null;
  }
  else if (deleteItem != -1) {
    if (deleteItem["type"] == "rect") {
      eraseRect(deleteItem["x"], deleteItem["y"], deleteItem["width"], deleteItem["height"],
                deleteItem["lineWidth"]);
      canvasElements.splice(target[1], 1);
      redraw();
    }
    else if (deleteItem["type"] == "ellipse") {
      eraseEllipse(deleteItem["x"], deleteItem["y"], deleteItem["width"], deleteItem["height"],
                deleteItem["lineWidth"]);
      canvasElements.splice(target[1], 1);
      redraw();
    }
    else if (deleteItem["type"] == "text") {
      canvasElements.splice(target[1], 1);
      clearAndRedraw();
    }
    else if (deleteItem["type"] == "img") {
      eraseRect(deleteItem["x"], deleteItem["y"], deleteItem["width"], deleteItem["height"]);
      canvasElements.splice(target[1], 1);
      redraw();
    }
    deleteItem = -1;
    save();
  }
}

rectBtn.onclick = function () {
  resetStates();
  highlightBtn(rectBtn);
  STATE = "rectBtn";
  canvas.classList.add("crosshair");
}

ellipseBtn.onclick = function () {
  resetStates();
  highlightBtn(ellipseBtn);
  STATE = "ellipseBtn";
  canvas.classList.add("crosshair");
}

penBtn.onclick = function () {
  resetStates();
  highlightBtn(penBtn);
  STATE = "penBtn";
}

undoBtn.onclick = function () {
  highlightBtn(undoBtn);
  undo();
  resetStates();
}

textBtn.onclick = function () {
  resetStates();
  pixelSize.setAttribute("value", "30");
  highlightBtn(textBtn);
  STATE = "textBtn";
}

selectBtn.onclick = function () {
  resetStates();
  highlightBtn(selectBtn);
  resetStates();
}

downloadBtn.onclick = function () {
  highlightBtn(downloadBtn);
  var fullQuality = canvas.toDataURL("image/jpeg", 1.0);
  window.open(fullQuality);
}

deleteBtn.onclick = function () {
  highlightBtn(deleteBtn);
  var modalInstance = M.Modal.getInstance(document.getElementById("deleteItem"));
  modalInstance.open();
  prevState = STATE;
  STATE = "clearAll";
}

imgUploadBtn.onclick = function () {
  resetStates();
  STATE = "imgUploadBtn";
  highlightBtn(imgUploadBtn);
}

imgUpload.onchange = function () {
  var file = imgUpload.files[0];
  var reader = new FileReader();
  if (file) {
    reader.readAsDataURL(file);
  }
  reader.onloadend = function () {
    var dataURL = reader.result;
    askToResizeImage = true;
    drawImg(dataURL, 5, 5, 0, 0, 1, -1, 1);
  }
}

var hueb = new Huebee(document.getElementById("bgColor"), {notation: "hex"});

hueb.on("change", function (color, hue, sat, lum) {redraw();})

document.onkeydown = function (e) {handleKeyPress(e);}

// CANVAS EVENTS

function touchEvents () {
  try {
    canvas.removeEventListener("mousedown", handleMouseDown(e));
    canvas.removeEventListener("mousemove", handleMouseMove(e));
    canvas.removeEventListener("mouseup", endDraw(e));
    canvas.removeEventListener("mouseout", endDraw(e));
  } catch (e) {}
  canvas.ontouchstart = function (e) {handleMouseDown(e);}
  canvas.ontouchmove = function (e) {handleMouseMove(e);}
  canvas.ontouchcancel = function (e) {endDraw(e);}
  canvas.ontouchend = function (e) {endDraw(e);}
}

function mouseEvents () {
  isTouchScreen = false;
  try {
    canvas.removeEventListener("touchstart", handleMouseDown(e));
    canvas.removeEventListener("touchmove", handleMouseMove(e));
    canvas.removeEventListener("touchcancel", endDraw(e));
    canvas.removeEventListener("touchend", endDraw(e));
  } catch (e) {}
  canvas.onmousedown = function (e) {handleMouseDown(e);}
  canvas.onmousemove = function (e) {handleMouseMove(e);}
  canvas.onmouseup = function (e) {endDraw(e);}
  canvas.onmouseout = function (e) {endDraw(e);}
}
