// Canvas background animation
// console.log('Canvas script starting...');

function initCanvas() {
  window.requestAnimFrame = (function() {
    return window.requestAnimationFrame;
  })();
  
  var canvas = document.getElementById("canvas");
  // console.log('Canvas element:', canvas);
  
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  
  let w, h;
  
  function setSize() {
    // console.log('Setting canvas size...');
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    // console.log('Canvas size set to:', w, 'x', h);
  }
  
  window.addEventListener('resize', setSize);
  setSize();

  var c = canvas.getContext("2d");
  // console.log('Canvas context:', c);

  var numStars = 1500;
  var radius = "0." + Math.floor(Math.random() * 9) + 1;
  var focalLength = canvas.width * 2;
  var warp = 0;
  var centerX, centerY;

  var stars = [],
    star;
  var i;

  var animate = true;

  function initializeStars() {
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;

    stars = [];
    for (i = 0; i < numStars; i++) {
      star = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * canvas.width,
        o: "0." + Math.floor(Math.random() * 99) + 1,
        // 添加闪烁效果，降低闪烁概率
        twinkle: Math.random() > 0.7,
        // 减慢闪烁速度
        twinkleSpeed: 0.002 + Math.random() * 0.008
      };
      stars.push(star);
    }
  }

  function moveStars() {
    for (i = 0; i < numStars; i++) {
      star = stars[i];
      star.z--;

      if (star.z <= 0) {
        star.z = canvas.width;
      }

      // 更新闪烁效果
      if (star.twinkle) {
        star.o = (Math.sin(Date.now() * star.twinkleSpeed) + 1) / 2 * 0.3 + 0.2;
      }
    }
  }

  function drawStars() {
    var pixelX, pixelY, pixelRadius;

    // Resize to the screen
    if (
      canvas.width != window.innerWidth ||
      canvas.width != window.innerWidth
    ) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initializeStars();
    }
    
    // Clear the canvas
    if (warp == 0) {
      c.fillStyle = "rgba(0,10,20,1)";
      c.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw stars
    for (i = 0; i < numStars; i++) {
      star = stars[i];

      pixelX = (star.x - centerX) * (focalLength / star.z);
      pixelX += centerX;
      pixelY = (star.y - centerY) * (focalLength / star.z);
      pixelY += centerY;
      // 减小星星大小
      pixelRadius = 0.4 * (focalLength / star.z);

      c.beginPath();
      c.arc(pixelX, pixelY, pixelRadius, 0, 2 * Math.PI);
      c.fillStyle = "rgba(209, 255, 255, " + star.o + ")";
      c.fill();
      
      // 添加星星光晕效果，同时减小光晕大小
      c.beginPath();
      c.arc(pixelX, pixelY, pixelRadius * 1.2, 0, 2 * Math.PI);
      c.fillStyle = "rgba(209, 255, 255, " + (star.o * 0.3) + ")";
      c.fill();
    }
  }

  function executeFrame() {
    if (animate) {
      requestAnimFrame(executeFrame);
      moveStars();
      drawStars();
    }
  }

  initializeStars();
  // console.log('Stars initialized:', stars.length);
  // console.log('Starting animation...');
  executeFrame();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initCanvas);

export default initCanvas;
