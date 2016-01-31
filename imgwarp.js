var ImgWarper = ImgWarper || {};

ImgWarper.Warper = function(
    imgData, optGridSize, optAlpha) {
  this.alpha = optAlpha || 1;
  this.gridSize = optGridSize || 20;

  this.width = imgData.width;
  this.height = imgData.height;
  this.imgData = imgData.data;
  this.bilinearInterpolation =
    new ImgWarper.BilinearInterpolation(this.width, this.height);

  this.grid = [];
  for (var i = 0; i < this.width ; i += this.gridSize) {
    for (var j = 0; j < this.height ; j += this.gridSize) {
      a = new ImgWarper.Point(i,j);
      b = new ImgWarper.Point(i + this.gridSize, j);
      c = new ImgWarper.Point(i + this.gridSize, j + this.gridSize);
      d = new ImgWarper.Point(i, j + this.gridSize);
      this.grid.push([a, b, c, d]);
    }
  }
}

ImgWarper.Warper.prototype.warp = function(fromPoints, toPoints) {

  var deformation = 
    new ImgWarper.AffineDeformation(toPoints, fromPoints, this.alpha);
  var transformedGrid = [];
  for (var i = 0; i < this.grid.length; ++i) {
    transformedGrid[i] = [
        deformation.pointMover(this.grid[i][0]),
        deformation.pointMover(this.grid[i][1]),
        deformation.pointMover(this.grid[i][2]),
        deformation.pointMover(this.grid[i][3])];
  }

  var newImg = this.bilinearInterpolation
    .generate(this.imgData, this.grid, transformedGrid);

  return newImg;
};

ImgWarper.AffineDeformation = function(fromPoints, toPoints, alpha) {
  this.w = null;
  this.pRelative = null;
  this.qRelative = null;
  this.A = null;
  if (fromPoints.length != toPoints.length) {
    console.error('Points are not of same length.'); 
    return;
  }
  this.n = fromPoints.length;  
  this.fromPoints = fromPoints;
  this.toPoints = toPoints;
  this.alpha = alpha;
};

ImgWarper.AffineDeformation.prototype.pointMover = function (point){
  if (null == this.pRelative || this.pRelative.length < this.n) {
    this.pRelative = new Array(this.n); 
  }
  if (null == this.qRelative || this.qRelative.length < this.n) {
    this.qRelative = new Array(this.n); 
  }
  if (null == this.w || this.w.length < this.n) {
    this.w = new Array(this.n);
  }
  if (null == this.A || this.A.length < this.n) {
    this.A = new Array(this.n); 
  }

  for (var i = 0; i < this.n; ++i) {
    var t = this.fromPoints[i].subtract(point);
    this.w[i] = Math.pow(t.x * t.x + t.y * t.y, -this.alpha);
  }

  var pAverage = ImgWarper.Point.weightedAverage(this.fromPoints, this.w);
  var qAverage = ImgWarper.Point.weightedAverage(this.toPoints, this.w);

  for (var i = 0; i < this.n; ++i) {
    this.pRelative[i] = this.fromPoints[i].subtract(pAverage);
    this.qRelative[i] = this.toPoints[i].subtract(qAverage);
  }

  var B = new ImgWarper.Matrix22(0, 0, 0, 0);

  for (var i = 0; i < this.n; ++i) {
    B.addM(this.pRelative[i].wXtX(this.w[i]));
  }

  B = B.inverse();
  for (var j = 0; j < this.n; ++j) {
    this.A[j] = point.subtract(pAverage).multiply(B)
      .dotP(this.pRelative[j]) * this.w[j];
  }

  var r = qAverage; //r is an point 
  for (var j = 0; j < this.n; ++j) {
    r = r.add(this.qRelative[j].multiply_d(this.A[j]));
  }
  return r;
};

var ImgWarper = ImgWarper || {};

ImgWarper.BilinearInterpolation = function(width, height){
  this.width = width;
  this.height = height;
  //this.ctx = canvas.getContext("2d");
  this.imgTargetData = document.createElement("canvas").getContext('2d').createImageData(this.width, this.height);
};

ImgWarper.BilinearInterpolation.prototype.generate =
    function(source, fromGrid, toGrid) {
      this.imgData = source;
      for (var i = 0; i < toGrid.length; ++i) {
        this.fill(toGrid[i], fromGrid[i]);
      }
      return this.imgTargetData;
    };

ImgWarper.BilinearInterpolation.prototype.fill =
    function(sourcePoints, fillingPoints) {
      var i, j;
      var srcX, srcY;
      var x0 = fillingPoints[0].x;
      var x1 = fillingPoints[2].x;
      var y0 = fillingPoints[0].y;
      var y1 = fillingPoints[2].y;
      x0 = Math.max(x0, 0);
      y0 = Math.max(y0, 0);
      x1 = Math.min(x1, this.width - 1);
      y1 = Math.min(y1, this.height - 1);

      var xl, xr, topX, topY, bottomX, bottomY;
      var yl, yr, rgb, index;
      for (i = x0; i <= x1; ++i) {
        xl = (i - x0) / (x1 - x0);
        xr = 1 - xl;
        topX = xr * sourcePoints[0].x + xl * sourcePoints[1].x;
        topY = xr * sourcePoints[0].y + xl * sourcePoints[1].y;
        bottomX = xr * sourcePoints[3].x + xl * sourcePoints[2].x;
        bottomY = xr * sourcePoints[3].y + xl * sourcePoints[2].y;
        for (j = y0; j <= y1; ++j) {
          yl = (j - y0) / (y1 - y0);
          yr = 1 - yl;
          srcX = topX * yr + bottomX * yl;
          srcY = topY * yr + bottomY * yl;
          index = ((j * this.width) + i) * 4;
          if (srcX < 0 || srcX > this.width - 1 ||
              srcY < 0 || srcY > this.height - 1) {
            this.imgTargetData.data[index] = 255;
            this.imgTargetData.data[index + 1] = 255;
            this.imgTargetData.data[index + 2] = 255;
            this.imgTargetData.data[index + 3] = 255;
            continue;
          }
          var srcX1 = Math.floor(srcX);
          var srcY1 = Math.floor(srcY);
          var base = ((srcY1 * this.width) + srcX1) * 4;
          //rgb = this.nnquery(srcX, srcY);
          this.imgTargetData.data[index] = this.imgData[base];
          this.imgTargetData.data[index + 1] = this.imgData[base + 1];
          this.imgTargetData.data[index + 2] = this.imgData[base + 2];
          this.imgTargetData.data[index + 3] = this.imgData[base + 3];
        }
      }
    };



var ImgWarper = ImgWarper || {};

ImgWarper.Matrix22 = function(N11, N12, N21, N22) {
  this.M11 = N11;
  this.M12 = N12;
  this.M21 = N21;
  this.M22 = N22;
};

ImgWarper.Matrix22.prototype.adjugate = function () {
  return new ImgWarper.Matrix22(
      this.M22, -this.M12,
      -this.M21, this.M11);
};

ImgWarper.Matrix22.prototype.determinant = function () {
  return this.M11 * this.M22 - this.M12 * this.M21;
};

ImgWarper.Matrix22.prototype.multiply = function (m) {
  this.M11 *= m;
  this.M12 *= m;
  this.M21 *= m;
  this.M22 *= m;
  return this;
};

ImgWarper.Matrix22.prototype.addM = function(o) {
  this.M11 += o.M11;
  this.M12 += o.M12;
  this.M21 += o.M21;
  this.M22 += o.M22;
};

ImgWarper.Matrix22.prototype.inverse = function () {
  return this.adjugate().multiply(1.0 / this.determinant());
};

var ImgWarper = ImgWarper || {};

ImgWarper.Point = function (x, y) {
  this.x = x;
  this.y = y;
};

ImgWarper.Point.prototype.add = function (o) {
  return new ImgWarper.Point(this.x + o.x, this.y + o.y);
};

ImgWarper.Point.prototype.subtract = function (o) {
  return new ImgWarper.Point(this.x - o.x, this.y - o.y);
};

// w * [x; y] * [x, y]
ImgWarper.Point.prototype.wXtX = function (w) {
  return (new ImgWarper.Matrix22(
      this.x * this.x * w, this.x * this.y * w,
      this.y * this.x * w, this.y * this.y * w
  ));
};

// Dot product
ImgWarper.Point.prototype.dotP = function (o) {
  return this.x * o.x + this.y * o.y;
};

ImgWarper.Point.prototype.multiply = function (o) {
  return new ImgWarper.Point(
      this.x * o.M11 + this.y * o.M21, this.x * o.M12 + this.y * o.M22);
};

ImgWarper.Point.prototype.multiply_d = function (o) {
  return new ImgWarper.Point(this.x * o, this.y * o);
};

ImgWarper.Point.weightedAverage = function (p, w) {
  var i;
  var sx = 0,
      sy = 0,
      sw = 0;

  for (i = 0; i < p.length; i++) {
    sx += p[i].x * w[i];
    sy += p[i].y * w[i];
    sw += w[i];
  }
  return new ImgWarper.Point(sx / sw, sy / sw);
};

ImgWarper.Point.prototype.InfintyNormDistanceTo = function (o) {
  return Math.max(Math.abs(this.x - o.x), Math.abs(this.y - o.y));
}






var ImgWarper = ImgWarper || {};

ImgWarper.PointDefiner = function(canvas, image, imgData) {
  this.oriPoints = new Array();
  this.dstPoints = new Array();

  //set up points for change;
  var c = canvas;
  this.canvas = canvas;
  var that = this;
  this.dragging_ = false;
  this.computing_ = false;
  this.image = image;
  this.imgData = imgData;
  $(c).unbind();
  $(c).bind('mousedown', function (e) { that.touchStart(e); });
  $(c).bind('mousemove', function (e) { that.touchDrag(e); });
  $(c).bind('mouseup', function (e) { that.touchEnd(e); });
  this.currentPointIndex = -1;
  //this.imgWarper = new ImgWarper.Warper(imgData);
};

ImgWarper.PointDefiner.prototype.touchEnd = function(event) {
  this.dragging_ = false;
}

ImgWarper.PointDefiner.prototype.touchDrag = function(e) {
  if (this.computing_ || !this.dragging_ || this.currentPointIndex < 0) {
    return;
  }
  this.computing_ = true;
  e.preventDefault();
  var endX = (e.offsetX || e.clientX - $(e.target).offset().left);
  var endY = (e.offsetY || e.clientY - $(e.target).offset().top);

  movedPoint = new ImgWarper.Point(endX, endY);
  this.dstPoints[this.currentPointIndex] = new ImgWarper.Point(endX, endY);
  this.redraw();
  this.computing_ = false;
};

ImgWarper.PointDefiner.prototype.redraw = function () {

  this.redrawCanvas();

};


ImgWarper.PointDefiner.prototype.touchStart = function(e) {
  this.dragging_ = true;
  e.preventDefault();
  var startX = (e.offsetX || e.clientX - $(e.target).offset().left);
  var startY = (e.offsetY || e.clientY - $(e.target).offset().top);
  var q = new ImgWarper.Point(startX, startY);

   if (e.shiftKey) {
    var pointIndex = this.getCurrentPointIndex(q);
    if (pointIndex >= 0) {
      this.oriPoints.splice(pointIndex, 1);
      this.dstPoints.splice(pointIndex, 1);
    }
  } else {
    this.oriPoints.push(q);
    this.dstPoints.push(q);
    //this.currentPointIndex = this.getCurrentPointIndex(q);
  }
  this.redraw();
};

ImgWarper.PointDefiner.prototype.getCurrentPointIndex = function(q) {
  var currentPoint = -1;

  for (var i = 0 ; i< this.dstPoints.length; i++){
    if (this.dstPoints[i].InfintyNormDistanceTo(q) <= 20) {
      currentPoint = i;
      return i;
    }
  }
  return currentPoint;
};

ImgWarper.PointDefiner.prototype.redrawCanvas = function(points) {
  var ctx = this.canvas.getContext("2d");
  ctx.clearRect(0, 0, this.imgData.width, this.imgData.height);
  ctx.putImageData(this.imgData, 0, 0);
  for (var i = 0; i < this.oriPoints.length; i++){
    if (i < this.dstPoints.length) {
      if (i == this.currentPointIndex) {
        this.drawOnePoint(this.dstPoints[i], ctx, 'orange');
      } else {
        this.drawOnePoint(this.dstPoints[i], ctx, '#6373CF');
      }

      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.moveTo(this.oriPoints[i].x, this.oriPoints[i].y);
      ctx.lineTo(this.dstPoints[i].x, this.dstPoints[i].y);
      //ctx.strokeStyle = '#691C50';
      ctx.stroke();
    } else {
      this.drawOnePoint(this.oriPoints[i], ctx, '#119a21');
    }
  }
  ctx.stroke();
};

ImgWarper.PointDefiner.prototype.drawOnePoint = function(point, ctx, color) {
  var radius = 10;
  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.arc(parseInt(point.x), parseInt(point.y), radius, 0, 2 * Math.PI, false);
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.arc(parseInt(point.x), parseInt(point.y), 3, 0, 2 * Math.PI, false);
  ctx.fillStyle = color;
  ctx.fill();
};

ImgWarper.Animator = function(pdef1, pdef2) {
  this.pointDefiner1 = pdef1;
  this.pointDefiner2 = pdef2;
};

ImgWarper.Animator.prototype.generate = function(frames) {
  this.frames = [];
  var steps = this.calculatePositions(frames);

  var warper1 = new ImgWarper.Warper(this.pointDefiner1.imgData);
  var warper2 = new ImgWarper.Warper(this.pointDefiner2.imgData);

  for (var x = 0; x < steps.length; x++) {
    var step = steps[x];

    // transform both images
    var img1 = warper1.warp(this.pointDefiner1.oriPoints, step);
    var img2 = warper2.warp(this.pointDefiner2.oriPoints, step);

    // blend images
    var res = this.blendImages(img1, img2, x, steps.length);

    // draw frame
    this.frames.push(res);
  }
};

ImgWarper.Animator.prototype.calculatePositions = function(f) {
  var steps = [];
  for (var i = 0; i <= f; i++) {
    var step = [];
    for (var x = 0; x < this.pointDefiner1.oriPoints.length; x++) {
      var p = new ImgWarper.Point(
          this.pointDefiner1.oriPoints[x].x+(this.pointDefiner2.oriPoints[x].x-this.pointDefiner1.oriPoints[x].x)*i/f,
          this.pointDefiner1.oriPoints[x].y + (this.pointDefiner2.oriPoints[x].y-this.pointDefiner1.oriPoints[x].y)*i/f);
      step.push(p);

    }
    steps.push(step);
  }
  return steps;
};

ImgWarper.Animator.prototype.blendImages = function(img1, img2, step, steps) {
  var res = document.createElement("canvas").getContext('2d').createImageData(img1.width, img1.height)
  for (var x = 0; x < img1.data.length; x++) {
    res.data[x] = img1.data[x] + (img2.data[x]-img1.data[x])*step/steps;
  }
  return res;
};