let canvas = document.getElementById("canvas");

canvas.width = 0.98 * window.innerWidth;
canvas.height = window.innerHeight;

var socket = io();
let pid = window.location.search.slice(11);

let ctx = canvas.getContext("2d");

let x;
let y;
let mouseDown = false;

window.addEventListener("mousedown", e => {
  ctx.moveTo(x, y);
  socket.emit('down', { xc: x, yc: y, projectid: pid })
  mouseDown = true;
})

// window.onmousedown = (e) => {
//   console.log("moved down")
//   ctx.moveTo(x, y);
//   socket.emit('down', { xc: x, yc: y, projectid: pid })
//   mouseDown = true;
// };

window.onmouseup = (e) => {
  mouseDown = false;
};

socket.on('ondraw', (data) => {
  if (pid !== data.projectid) return;
  console.log("aaya on doosra account")
  console.log(data)
  ctx.lineTo(data.xc, data.yc);
  ctx.stroke();
})

socket.on('ondown', (data) => {
  if (pid !== data.projectid) return;
  console.log("aaya on doosra account")
  ctx.moveTo(data.xc, data.yc);
})

window.onmousemove = (e) => {
  x = e.clientX;
  y = e.clientY;

  if (mouseDown) {
    socket.emit('draw', { xc: x, yc: y, projectid: pid })
    ctx.lineTo(x, y);
    ctx.stroke();
  }
};