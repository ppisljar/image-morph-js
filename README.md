# image-morph-js
JavaScript library for image morphing

demo: http://peter.pisljar.si/playground/face-morph-lib/
demo2: http://peter.pisljar.si/playground/face-morph-2/

blog: http://peter.pisljar.si/#/en/projects/image_morph_js



## Using the library
There are two parts to the library. First is image feature selection UI, which is described in my blog, in index.html example and you can view it in the sample. And second there is the image morphing part which can be used seperately.

First we need to create arrays of feature points. Each point must be of ImgWarper.Point type. This is how we could create one:

	var x = 10;
	var y = 20;
	var point = new ImgWarper.Point(x, y);

Then we can create new ImgWarper.Animator passing it two PointDefiners or two classes with each holding a feature point array and ImageData. You will need to create canvas in memory, draw your image onto it and then retrieve the ImageData.

	var pointdefiner1 = {
		imgData: myImageData1,
		oriPoints: myPoints1
	};
	var pointdefiner1 = {
		imgData: myImageData2,
		oriPoints: myPoints2
	};
	var animator = new ImgWarper.Animator(pointdefiner1,pointdefiner2);

Now we just call the generate method and pass it number of frames we want to generate.

	animator.generate(50);

We can retrieve all frames by animator.frames property. For example to draw 20th frame we could do:

	var c = document.createElement("canvas");
	c.getContext('2d').putImageData(animator.frames[20], 0, 0);
	document.body.appendChild(c);
