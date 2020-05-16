var canvas = document.getElementById("sketchCanvas");
var ctx = canvas.getContext("2d");

var windowWidth = window.innerWidth;
var windowHeight = window.innerWidth;
var pixelRatio = window.devicePixelRatio; // 1 css pixel to 1 physical pixel
ctx.lineJoin = "round";

// SCALING
function resize () {
  windowWidth = window.innerWidth;
  windowHeight = window.innerWidth;
  pixelRatio = window.devicePixelRatio;
  canvas.width = canvas.parentNode.clientWidth - 100;
  canvas.height = 600;
}

var colorInput = document.getElementById("colorShapes");
var lineWidthInput = document.getElementById("lineWidthInput");

// GLOBALS
var BGCOLOR = "#FFFFFF";
var STATE = null;

var mouseDown = false;
var canvasElements = [];
var target = [-1, -1];
var startX, startY;
var deleteItem = -1;
var drawRectPrev = [-1, -1], startDrawRect = 0;
var drawEllipsePrev = [-1, -1], startDrawEllipse = 0;
var startDrawPen = 0, currX, currY, prevX, prevY;

// TOOLS
var selectBtn = document.getElementById("selectBtn");
var rectBtn = document.getElementById("rectBtn");
var ellipseBtn = document.getElementById("ellipseBtn");
var penBtn = document.getElementById("penBtn");
var undoBtn = document.getElementById("undoBtn");

var buttons = [selectBtn, rectBtn, penBtn, undoBtn, ellipseBtn];

function drawRect (x, y, width, height, lineWidth=1, color=-1, add=1) {
  if (color != -1) {ctx.strokeStyle = color;}
  ctx.lineWidth = parseInt(lineWidth);
  ctx.strokeRect(x, y, width, height);
  // console.log(canvasElements);
  if (!add) {return;}
  canvasElements.push({"type": "rect", "x": x, "y": y,
                      "width": width, "height": height, "color": color,
                      "lineWidth": lineWidth});
}

function drawEllipse (x, y, width, height, lineWidth=1, color=-1, add=1) {
  // void ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle [, anticlockwise]);
  if (color != -1) {ctx.strokeStyle = color;}
  ctx.lineWidth = parseInt(lineWidth);
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, height / 2, 0, 0, 2 * Math.PI);
  ctx.stroke();
  if (!add) {return;}
  canvasElements.push({"type": "ellipse", "x": x, "y": y,
                      "width": width, "height": height, "color": color,
                      "lineWidth": lineWidth});
}

function drawPen (prevX, prevY, currX, currY, lineWidth=1, color=-1, add=1) {
  if (color != -1) {ctx.strokeStyle = color;}
  ctx.lineWidth = parseInt(lineWidth);
  ctx.beginPath();
  ctx.moveTo(prevX, prevY);
  ctx.lineTo(currX, currY);
  ctx.stroke();
  if (!add) {return;}
  canvasElements.push({"type": "pen", "prevX": prevX, "prevY": prevY,
                      "currX": currX, "currY": currY, "color": color,
                      "lineWidth": lineWidth});
}

function eraseRect (x, y, width, height, lineWidth) {
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

function redraw () {
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
  }
}

function getTargetElement (offsetX, offsetY) {
  for (var i = 0; i < canvasElements.length; i ++) {
    if (canvasElements[i]["type"] == "pen") {continue;}
    var x = canvasElements[i]["x"], y = canvasElements[i]["y"];
    var width = canvasElements[i]["width"], height = canvasElements[i]["height"];
    if (canvasElements[i]["type"] == "ellipse") {
      // for ellipse, startX and startY is the center coordinate
      // width and height will always be > 0
      var radiusX = width / 2;
      var radiusY = height / 2;
    }
    // check if element is clicked on
    if (width < 0) {
      if (!(offsetX <= x && offsetX >= x - Math.abs(width))) {continue;}
    }
    else {
      if (canvasElements[i]["type"] == "rect") {
        if (!(offsetX >= x && offsetX <= x + width)) {continue;}
      }
      else if (canvasElements[i]["type"] == "ellipse") {
        if (!(offsetX >= x - radiusX && offsetX <= x + radiusX)) {continue;}
      }
    }
    if (height < 0) {
      if (!(offsetY <= y && offsetY >= y - Math.abs(height))) {continue;}
    }
    else {
      if (canvasElements[i]["type"] == "rect") {
        if (!(offsetY >= y && offsetY <= y + height)) {continue;}
      }
      else if (canvasElements[i]["type"] == "ellipse") {
        if (!(offsetY >= y - radiusY && offsetY <= y + radiusY)) {continue;}
      }
    }
    return [canvasElements[i], i];
  }
  return [-1, -1]; // no element is selected
}

function handleMouseDown (e) {
  e.preventDefault();
  mouseDown = true;
  // console.log(canvasElements);
  var offsetX = e.offsetX; // relative to left of canvas
  var offsetY = e.offsetY; // relative to top of canvas
  //
  // console.log(offsetX, offsetY);
  // console.log(canvasElements);
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
  target = getTargetElement(offsetX, offsetY);
  if (target[0] == -1) {return;}
  startX = offsetX; startY = offsetY;
}

function handleMouseMove (e) {
  e.preventDefault();
  if (mouseDown) {redraw();} else {return;}
  var offsetX = e.offsetX;
  var offsetY = e.offsetY;
  if ((STATE == "rectBtn" && startDrawRect) || (STATE == "ellipseBtn" && startDrawEllipse)) {
    var width = offsetX - startX;
    var height = offsetY - startY;
    if (lineWidthInput.value >= width || lineWidthInput.value >= height) {return;}
    if (startDrawRect) {
      if (drawRectPrev[0] != -1) {
        eraseRect(drawRectPrev[0]["x"], drawRectPrev[0]["y"],
                  drawRectPrev[0]["width"], drawRectPrev[0]["height"],
                  drawRectPrev[0]["lineWidth"]);
      }
      var data = {"type": "rect", "x": startX, "y": startY,
                  "width": width, "height": height,
                  "lineWidth": lineWidthInput.value, "color": colorInput.value};
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
      drawRect(startX, startY, width, height, lineWidthInput.value, colorInput.value, 0);
      // console.log(canvasElements);
    }
    else if (startDrawEllipse) {
      if (width < 0 || height < 0) {return;}
      if (drawEllipsePrev[0] != -1) {
        eraseEllipse(drawEllipsePrev[0]["x"], drawEllipsePrev[0]["y"],
                    drawEllipsePrev[0]["width"], drawEllipsePrev[0]["height"],
                    drawEllipsePrev[0]["lineWidth"]);
      }

      var data = {"type": "ellipse", "x": startX, "y": startY,
                  "width": width, "height": height,
                  "lineWidth": lineWidthInput.value, "color": colorInput.value};
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
      drawEllipse(startX, startY, width, height, lineWidthInput.value, colorInput.value, 0);
    }
    // console.log(canvasElements);
  }
  else if (STATE == "penBtn" && startDrawPen) {
    currX = offsetX; currY = offsetY;
    drawPen(prevX, prevY, currX, currY, lineWidthInput.value, colorInput.value);
    prevX = currX; prevY = currY;
  }

  if (target[0] == -1) {return;}
  // console.log(target);

  // MOVING OBJECTS ON CANVAS
  if (target[0]["type"] == "pen") {
    return;
  }
  var x = target[0]["x"], y = target[0]["y"];

  var dx = offsetX - startX;
  var dy = offsetY - startY;

  var finalX = canvasElements[target[1]]["x"] + dx;
  var finalY = canvasElements[target[1]]["y"] + dy;

  var offset = 10;
  if (finalX + offset > canvas.width || finalX + offset< 0 ||
      finalY + offset> canvas.height || finalY + offset< 0) {
        // DELETING OBJECTS ON CANVAS
        var modalInstance = M.Modal.getInstance(document.getElementById("deleteItem"));
        modalInstance.open();
        deleteItem = canvasElements[target[1]];
        return;
  }
  canvasElements[target[1]]["x"] = finalX;
  canvasElements[target[1]]["y"] = finalY;

  startX = finalX; startY = finalY;
  if (target[0]["type"] == "rect") {
    eraseRect(x, y, target[0]["width"], target[0]["height"], target[0]["lineWidth"]);
    // console.log(offsetX, offsetY);
    drawRect(startX, startY, target[0]["width"], target[0]["height"],
            target[0]["lineWidth"], target[0]["color"], 0);
  }
  else if (target[0]["type"] == "ellipse") {
    eraseEllipse(x, y, target[0]["width"], target[0]["height"], target[0]["lineWidth"]);
    drawEllipse(startX, startY, target[0]["width"], target[0]["height"],
                target[0]["lineWidth"], target[0]["color"], 0);
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
    // drawPen(undoElem["currX"], undoElem["currY"], undoElem["prevX"], undoElem["prevY"],
    //         undoElem["lineWidth"] * 2 , BGCOLOR, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redraw();
  }
}

function endDraw (e) {
  e.preventDefault();
  target = [-1, -1];
  mouseDown = false;
  if (STATE == "rectBtn") {
    drawRectPrev = [-1, -1];
  }
  else if (STATE == "ellipseBtn") {
    drawEllipsePrev = [-1, -1];
  }
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


window.onresize = function () {resize(); redraw(); }
window.onload = function () {resize();}

document.getElementById("confirmDelete").onclick = function () {
  if (deleteItem != -1) {
    if (deleteItem["type"] == "rect") {
      eraseRect(deleteItem["x"], deleteItem["y"], deleteItem["width"], deleteItem["height"],
                deleteItem["lineWidth"]);
      canvasElements.splice(target[1], 1);
    }
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

selectBtn.onclick = function () {highlightBtn(selectBtn); resetStates();}

canvas.onmousedown = function (e) {handleMouseDown(e);}

canvas.onmouseup = function (e) {endDraw(e);}

canvas.onmousemove = function (e) {handleMouseMove(e);}

canvas.onmouseout = function (e) {endDraw(e);}
