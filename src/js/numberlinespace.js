import * as PIXI from "pixi.js";
import blueGradient from "../assets/Clouds.png";
import * as CONST from "./const.js";
import { Fraction, Draggable, distance } from "./api.js";
import {
  TweenMax,
  TimelineLite,
  Power2,
  Elastic,
  CSSPlugin,
  TweenLite,
  TimelineMax,
  Power4,
} from "gsap";

export const init = (app, setup) => {
  let features;
  let viewPort = new PIXI.Container();
  let backGround;
  let papers = [];
  let jumps;
  let MAX_STAR_SIZE = 5;
  let numberlineVal = 100;

  const NL_COLOR = 0x000000;
  const PIN_TEXTURE = new PIXI.Texture.from(CONST.ASSETS.MOVER_DOT);
  const BLUE_CIRCLE = new PIXI.Texture.from(CONST.ASSETS.STAR);
  const SHARP_PIN_TEXTURE = new PIXI.Texture.from(CONST.ASSETS.SHARP_PIN);

  // Layout Parameters
  let WINDOW_WIDTH = setup.width;
  let WINDOW_HEIGHT = setup.height;
  let H_W_RATIO = setup.height / setup.width;
  let LANDSCAPE = H_W_RATIO < 3 / 4;
  let ARENA_WIDTH = LANDSCAPE ? (4 / 3) * setup.height : setup.width;
  let ARENA_HEIGHT = LANDSCAPE ? setup.height : (3 / 4) * setup.width;
  let NUMBER_LINE_WIDTH = WINDOW_WIDTH * 0.8;
  let NUMBER_LINE_RANGE = 100;
  let NUMBER_LINE_X = WINDOW_WIDTH / 2 - NUMBER_LINE_WIDTH / 2;

  let focalPoint = { x: 0, y: 0 };
  let anchorAngle = 0;
  let angle = Math.PI;

  backGround = new makeBackground();
  let numberline;
  let emitters = [];
  let emitters2 = [];

  // Called on resize
  function resize(newFrame, flex) {
    // Make sure all layout parameters are up to date.
    updateLayoutParams(newFrame);
    app.renderer.resize(WINDOW_WIDTH, WINDOW_HEIGHT);
  }

  class Emitter extends PIXI.Sprite {
    constructor(radius, theta) {
      super();
      this.theta = theta;
      this.radius = radius;
      this.x = focalPoint.x + Math.cos(theta) * radius;
      this.y = focalPoint.y + Math.sin(theta) * radius;
      this.initialX = this.x;
      this.initialY = this.y;
      this.width = MAX_STAR_SIZE;
      this.height = MAX_STAR_SIZE;
      this.accumulator = 0;
    }

    beginUpdate() {
      this.accumulator = 0;
    }

    update(delta) {
      this.delta = delta;
      let moddedDelta = this.delta % this.radius;
      this.x = this.initialX - moddedDelta * Math.cos(this.theta);
      this.y = this.initialY - moddedDelta * Math.sin(this.theta);
      let deltaX = this.x - focalPoint.x;
      let deltaY = this.y - focalPoint.y;
      let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      this.alpha = distance / (WINDOW_HEIGHT / 2);
    }

    endUpdate() {
      this.accumulator = 0;
    }
  }

  let sliderLine = new PIXI.Graphics();
  sliderLine.lineStyle(NUMBER_LINE_WIDTH / 300, 0xffffff);
  sliderLine.lineTo(1.1 * NUMBER_LINE_WIDTH, 0);
  sliderLine.x = WINDOW_WIDTH / 2 - (1.1 * NUMBER_LINE_WIDTH) / 2;
  sliderLine.y = (19 / 20) * WINDOW_HEIGHT;
  app.stage.addChild(sliderLine);

  let dragger = new Draggable(PIN_TEXTURE);
  dragger.lockY = true;
  dragger.interactive = true;
  dragger.anchor.set(0.5);
  app.stage.addChild(dragger);
  dragger.ds = 200000;
  dragger.width = 50;
  dragger.height = 50;
  dragger.x = NUMBER_LINE_X + (3 * NUMBER_LINE_WIDTH) / 5;
  dragger.anchorPoint = dragger.x
  dragger.y = sliderLine.y;

  let draggerMin = new Draggable(PIN_TEXTURE);
  draggerMin.interactive = true;
  draggerMin.lockY = true;
  draggerMin.anchor.set(0.5);
  app.stage.addChild(draggerMin);
  draggerMin.width = 50;
  draggerMin.height = 50;
  draggerMin.x = NUMBER_LINE_X + 2*NUMBER_LINE_WIDTH / 5;
  draggerMin.anchorPoint = draggerMin.x
  draggerMin.y = sliderLine.y;

  dragger.on("pointermove", draggerPointerMove);
  dragger.on("pointerdown", draggerPointerDown);
  dragger.on("pointerup", draggerPointerUp);
  dragger.on("pointerupoutside", draggerPointerUp);

  draggerMin.on("pointermove", draggerMinPointerMove);
  draggerMin.on("pointerdown", draggerMinPointerDown);
  draggerMin.on("pointerup", draggerMinPointerUp);
  draggerMin.on("pointerupoutside", draggerMinPointerUp);

  function draggerPointerUp() {
    this.initialX = 0;
    this.x = this.anchorPoint;
  }

  function draggerPointerMove() {
    if (this.touching && numberline.max >= 0.0005) {
      let delta = this.x - this.initialX;
      let N = (delta / NUMBER_LINE_WIDTH) * (numberline.max - numberline.min);
      numberline.draw(numberline.min, this.initialNumberlineLength - N);

    } else if (this.touching) {
      this.x = NUMBER_LINE_WIDTH / 2;
      this.initialX = 0;
    } else if (numberline.max < 0.0005) {
      numberline.max = 0.0005;
    }
  }
  function draggerPointerDown() {
    this.initialX = this.x;
    this.initialNumberlineLength = numberline.max
  }

  function scaleNumberLineBy(K) {
    let newMax = dragger.initialNumberlineLength * K;
    let newDS =
      K > 1
        ? dragger.ds + NUMBER_LINE_WIDTH * K
        : dragger.ds - (NUMBER_LINE_WIDTH * 1) / K;

    const onUpdate = () => {
      numberline.draw(numberline.min, numberline.max);
    };

    const onUpdate2 = () => {
      emitters.forEach((e) => {
        e.update((1 / 8) * dragger.ds);
      });

      emitters2.forEach((e) => {
        e.update((1 / 6) * dragger.ds);
      });
    };

    TweenMax.to(numberline, 2, { max: newMax, onUpdate: onUpdate });

    TweenMax.to(dragger, 2, { ds: newDS, onUpdate: onUpdate2 });
  }

  function draggerMinPointerUp() {
    this.initialX = 0;
    this.x = this.anchorPoint
  }
  function draggerMinPointerMove() {

      if (this.touching && numberline.max >= 0.0005) {
      
        let delta = this.x - this.initialX;
        let N = (delta / NUMBER_LINE_WIDTH) * (numberline.max - numberline.min);
        numberline.draw(this.initialNumberlineLength-N,numberline.max);
      } else if (this.touching) {
        this.x = NUMBER_LINE_WIDTH / 2;
        this.initialX = 0;
      } else if (numberline.max < 0.0005) {
        numberline.max = 0.0005;
      }
    
  }
  function draggerMinPointerDown() {
    this.initialX = this.x;
    this.initialNumberlineLength = numberline.min
  }

  // Helllooo

  class Jumps extends PIXI.Container {
    constructor(n) {
      super();
      this.n = n;
      this.jumps = [];
      this.jumpGraphic = new PIXI.Graphics();
      this.jumpGraphic.lineStyle(NUMBER_LINE_WIDTH / 300, NL_COLOR);
      this.jumpGraphic.arc(0, 0, 100, -Math.PI, 0); // cx, cy, radius, startAngle, endAngle
      this.jumpTexture = app.renderer.generateTexture(this.jumpGraphic);
      this.init();
    }

    init() {
      for (let i = 0; i < this.n; i++) {
        let newJump = new PIXI.Sprite();
        this.jumps.push(newJump);
        this.addChild(newJump);
      }
      this.draw();
    }

    draw(size) {
      this.jumpGraphic.clear();
      this.jumpGraphic.lineStyle(NUMBER_LINE_WIDTH / 300, NL_COLOR);
      this.jumpGraphic.arc(0, 0, size, -Math.PI, 0);
      this.jumpTexture.destroy(true);
      this.jumpTexture = app.renderer.generateTexture(this.jumpGraphic);
      this.jumps.forEach((e, i) => {
        e.texture = this.jumpTexture;
        e.x = i * 2 * size;
        let _alpha =
          size < NUMBER_LINE_WIDTH
            ? 1
            : Math.abs(size - NUMBER_LINE_WIDTH) / (0.5 * NUMBER_LINE_WIDTH);
        e.alpha = _alpha;
      });
    }
  }

  // Classes

  class NumberLine extends PIXI.Container {
    constructor(min, max, width) {
      super();
      this.pin = new Draggable();
      this.pin.lockY = true;
      this.pin.texture = SHARP_PIN_TEXTURE;
      this.pin.anchor.set(0.5, 0);
      //this.addChild(this.pin)

      this.lineUp = new PIXI.Graphics();
      this.lineUp.lineStyle(NUMBER_LINE_WIDTH / 300, 0x000000);
      this.lineUp.lineTo(0, -WINDOW_HEIGHT);
      this.lineUp.x = this.pin.x;
      //this.addChild(this.lineUp)

      this.pin.width = width / 10;
      this.pin.height = width / 10;
      this.pin.index = 0;

      this.pinText = new PIXI.Text();
      this.pinText.width = this.pin.width;
      this.pinText.height = this.pin.height;
      this.pinText.anchor.set(0.5);
      this.pinText.x = 0;
      this.pinText.y = 500;
      //this.pin.addChild(this.pinText)
      this.pinText.text = this.pin.index;
      this.pin.on("pointerup", this.pinPointerUp);
      this.pin.on("pointermove", this.pinPointerMove);
      this.ticks = [];
      this.tensJumps = new Jumps(100);
      this.hundredsJumps = new Jumps(100);
      this.labels = [];
      this.min = min;
      this.max = max;
      this.minFloat = min;
      this.maxFloat = max;
      this._width = width;
      this.lineThickness = width / 300;

      this.setLayoutParams(min, max);

      this.majorTick = new PIXI.Graphics();
      this.majorTick.lineStyle(this.majorTickThickness, NL_COLOR);
      this.majorTick.lineTo(0, this.majorTickHeight);
      this.majorTickTexture = app.renderer.generateTexture(this.majorTick);

      this.minorTick = new PIXI.Graphics();
      this.minorTick.lineStyle(this.minorTickThickness, NL_COLOR);
      this.minorTick.lineTo(0, this.minorTickHeight);
      this.minorTickTexture = app.renderer.generateTexture(this.minorTick);

      this.line = new PIXI.Graphics();
      this.line.lineStyle(this.lineThickness, NL_COLOR);
      this.line.lineTo(width, 0);

      this.addChild(this.line);
      this.addChild(this.tensJumps);
      this.addChild(this.hundredsJumps);

      this.dot = new PIXI.Sprite.from(CONST.ASSETS.BLUE_CIRCLE);
      this.dot.width = width / 50;
      this.dot.height = width / 50;
      this.dot.anchor.set(0.5);
      //this.addChild(this.dot)

      this.dot2 = new PIXI.Sprite.from(CONST.ASSETS.BLUE_CIRCLE);
      this.dot2.width = width / 50;
      this.dot2.height = width / 50;
      this.dot2.anchor.set(0.5);
      //this.addChild(this.dot2)

      this.multiplier = 10;
      this.multiplierSquared = this.multiplier * this.multiplier;

      this.compressionOne = 10;
      this.compressionTwo = this.compressionOne * this.multiplier;

      this.init();
    }

    // Only responsible for setting labels to the rightful location.
    placeLabels(labels, values, dx, digitHeight) {
      labels.forEach((l) => {
        let currentValue = l.value;
        // If the value of this label isn't null, we know it's already active and on the number line.
        let activeLabel = currentValue != null;
        let needsToBeSet = activeLabel && values[currentValue];
        delete values[currentValue];
        // If the label is active and still a value that needs to be set, reposition it.
        if (needsToBeSet) {
          l.text = l.value;
          l.x = (l.value - numberline.min) * dx;
          l.style.fontSize = digitHeight;
          l.alpha = 1;

          // If it's active, but not part of the new active labels, remove it and set value null.
        } else if (activeLabel) {
          // Hide / remove
          l.value = null;
          l.alpha = 0;
        }
      });

      let empties = labels.filter((l) => l.value == null);

      //console.log("empties length",empties.length)

      let valueKeys = Object.keys(values);

      valueKeys.forEach((k) => {
        if (empties.length != 0) {
          let newActiveLbl = empties.pop();
          newActiveLbl.value = k;
          newActiveLbl.text = k;
          newActiveLbl.x = (k - this.min) * dx;
          newActiveLbl.alpha = 1;
        }
      });
    }

    placeTicks(ticks, values, dx, textures, majorStep) {

      ticks.forEach((l, i) => {
        let currentValue = l.value;
        let activeLabel = currentValue != null;
     
        let needsToBeSet = activeLabel && values[currentValue];
        //console.log("currentValue,needsToBeSet",currentValue,needsToBeSet)
        delete values[currentValue];

        // If the label is active and still a value that needs to be set, reposition it.
        if (needsToBeSet) {
          l.text = l.value;
          l.x = dx * (l.value - this.min);
          l.y = 0;
          l.alpha = 1;
          //console.log('majorStep,l.value,l.value % majorStep,l.value',majorStep,l.value,l.value%majorStep)
          let mod = l.value%majorStep/majorStep
          if (mod < 0.01 || mod > 0.99) {
            //console.log("Major Texture!")
            l.texture = textures[0];
          } else {
            l.texture = textures[1];
          }

          // If it's active, but not part of the new active labels, remove it and set value null.
        } else if (activeLabel) {
          l.value = null;
          l.alpha = 0;
        }
      });

      let empties = ticks.filter((l) => l.value == null);

      let valueKeys = Object.keys(values);

      valueKeys.forEach((k) => {
        if (empties.length != 0) {
          let newActiveTick = empties.pop();
          newActiveTick.value = k;
          newActiveTick.x = (k - this.min) * dx;
          newActiveTick.alpha = 1;

          /*
          if (newActiveTick.value % majorStep == 0) {
            newActiveTick.texture = textures[0];
          } else {
            newActiveTick.texture = textures[1];
          }
          */

        }
      });
    }

    getNumberLineFloatValueFromPosition(pos) {
      return (pos * this.minorStep) / this.minorDX + this.minFloat;
    }

    pinPointerMove() {
      if (this.touching) {
        this.value = this.parent.getNumberLineFloatValueFromPosition(this.x);
        this.index = Math.round(this.value);
        this.parent.drawDescriptors();
      }
    }

    pinPointerUp() {
      this.index = Math.round(
        (this.x * this.parent.minorStep) / this.parent.minorDX +
          this.parent.minFloat
      );
      this.parent.draw(numberline.min, numberline.max);
      this.parent.lineUp.x = this.x;
      this.parent.addChild(this.parent.dot);
      this.parent.addChild(this.parent.dot2);

      // Move this shit elsewhere

      let floatValue = this.parent.getNumberLineFloatValueFromPosition(this.x);
      let nearestTen = Math.round(floatValue / 10) * 10;
      let nearestHundred = Math.round(floatValue / 100) * 100;

      let position =
        ((nearestHundred - this.parent.minFloat) / this.parent.minorStep) *
        this.parent.minorDX;

      let position2 =
        ((nearestTen - this.parent.minFloat) / this.parent.minorStep) *
        this.parent.minorDX;

      const onUpdate = () => {
        let r1 = this.compressionTwo / 2;
        let k =
          ((this.parent.dot.x * this.parent.minorStep) / this.parent.minorDX +
            this.parent.minFloat) %
          this.multiplier;
        let jumpRadius = (this.parent.minorDX / this.parent.minorStep) * r1;
        let to = Math.sqrt(1 - ((k - r1) * (k - r1)) / (r1 * r1)) * jumpRadius;
        this.parent.dot.y = -to;
      };
      TweenMax.to(this.parent.dot, 1, { x: position, onUpdate: onUpdate });

      const onUpdate2 = () => {
        let k =
          (((this.parent.dot2.x * this.parent.minorStep) / this.parent.minorDX +
            this.parent.minFloat) %
            this.multiplier) *
          10;
        let jumpRadius = (this.parent.minorDX / this.parent.minorStep) * 5;
        let to = Math.sqrt(1 - ((k - 5) * (k - 5)) / 25) * jumpRadius;
        this.parent.dot2.y = -to;
      };
      TweenMax.to(this.parent.dot2, 1, { x: position2, onUpdate: onUpdate2 });
    }

    drawDescriptors() {
      let value = this.getNumberLineFloatValueFromPosition(this.pin.x);

      let jumpRadius =
        ((this.minorDX / this.minorStep) * this.compressionOne) / 2;
      let k = value % this.compressionOne;
      let to = Math.sqrt(1 - ((k - 50) * (k - 50)) / 2500) * jumpRadius;

      let jumpRadius2 =
        ((this.minorDX / this.minorStep) * this.compressionTwo) / 2;
      let k2 = value % this.compressionTwo;
      let to2 = Math.sqrt(1 - ((k2 - 5) * (k2 - 5)) / 25) * jumpRadius2;

      this.dot.x = this.pin.x;
      this.dot.y = -to;
      this.dot2.x = this.pin.x;
      this.dot2.y = -to2;

      this.lineUp.clear();
      this.lineUp.lineStyle(2, 0x000000);
      this.lineUp.lineTo(0, -to);

      this.lineUp.x = this.pin.x;
    }

    setLayoutParams(min, max) {
      this.params = numberLineParameters(min, max, this._width);
      this.majorStep = this.params.MAJOR_STEP;
      this.minorStep = this.params.MINOR_STEP;
      this.digitHeight = this.params.DIGIT_HEIGHT;

      this.majorDX =
        (this._width / (this.maxFloat - this.minFloat)) * this.majorStep;
      this.minorDX =
        (this._width / (this.maxFloat - this.minFloat)) * this.minorStep;

      this.dx = this._width / (this.maxFloat - this.minFloat);

      this.minorTickHeight = this._width / 60;
      this.majorTickHeight = 1.5 * this.minorTickHeight;

      this.minorTickThickness = Math.min(this.majorDX / 3, this.lineThickness);
      this.majorTickThickness = this.minorTickThickness * 1.25;
    }

    draw(min, max) {
      this.min = min;
      this.max = max;
      this.minFloat = min;
      this.maxFloat = max;

      this.setLayoutParams(min, max);

      let numbersNeededForLabels = getNumbersNeeded(max, min, this.majorStep);
      let numbersNeededForTicks = getNumbersNeeded(max, min, this.minorStep);

      this.placeLabels(
        this.labels,
        numbersNeededForLabels,
        this.dx,
        this.digitHeight
      );
      // Why am I passing this.dx here?
      this.placeTicks(
        this.ticks,
        numbersNeededForTicks,
        this.dx,
        [this.majorTickTexture, this.minorTickTexture],
        this.majorStep
      );

      let arcWidth = (this.minorDX / this.minorStep) * this.compressionOne 
      console.log("arcWidth",arcWidth)

      if (
        (this.minorDX / this.minorStep) * this.compressionOne >
        this._width * 1.3
      ) {
        this.compressionOne = this.compressionOne / this.multiplierSquared;
      } else if (
        (this.minorDX / this.minorStep) * this.compressionOne <
        this._width / this.multiplierSquared
      ) {
        this.compressionOne = this.compressionOne * this.multiplierSquared;
      }

      if (
        (this.minorDX / this.minorStep) * this.compressionTwo >
        this._width * 1.3
      ) {
        this.compressionTwo = this.compressionTwo / this.multiplierSquared;
      } else if (
        (this.minorDX / this.minorStep) * this.compressionTwo <
        this._width / this.multiplierSquared
      ) {
        this.compressionTwo = this.compressionTwo * this.multiplierSquared;
      }

      this.hundredsJumps.draw(
        ((this.minorDX / this.minorStep) * this.compressionOne) / 2
      );

      
      this.hundredsJumps.x = 
        ((0 - this.minFloat%this.compressionOne - this.compressionOne) / this.minorStep) * this.minorDX;

      this.hundredsJumps.y =
        ((-this.minorDX / this.minorStep) * this.compressionOne) / 2;

      this.tensJumps.draw(
        ((this.minorDX / this.minorStep) * this.compressionTwo) / 2
      );
      this.tensJumps.x = ((0 - this.minFloat%this.compressionTwo - this.compressionTwo) / this.minorStep) * this.minorDX;
      this.tensJumps.y =
        ((-this.minorDX / this.minorStep) * this.compressionTwo) / 2;
    }

    init() {
      for (let i = 0; i <= 100; i++) {
        let newTick = new PIXI.Sprite(this.majorTickTexture);
        newTick.anchor.set(0.5, 0);
        newTick.value = null;
        newTick.alpha = 0;
        this.addChild(newTick);
        this.ticks.push(newTick);

        let newLabel = new PIXI.Text();
        newLabel.style.fontSize = this.digitHeight;
        newLabel.style.fontFamily = "Chalkboard SE";
        newLabel.style.fill = NL_COLOR;
        newLabel.anchor.set(0.5, 0);
        newLabel.text = i;
        newLabel.value = null;
        newLabel.alpha = 0;
        this.addChild(newLabel);
        this.labels.push(newLabel);
        newLabel.y = 1.1 * this.majorTickHeight;
      }
      this.draw(this.min, this.max);
    }
  }

  function digitCount(n) {
    var count = 1;

    if (n >= 1) {
      while (n / 10 >= 1) {
        n /= 10;
        ++count;
      }
      return count;
    } else {
      ++count;
      while (n % 1 != 0) {
        n *= 10;
        ++count;
      }
      return count - 1;
    }
  }

  function numberLineParameters(min, max, width) {
    let majorSteps = [
      0.00001,
      0.00005,
      0.0001,
      0.0005,
      0.001,
      0.005,
      0.01,
      0.05,
      0.1,
      0.5,
      1,
      5,
      10,
      50,
      100,
      500,
      1000,
      5000,
      10000,
      50000,
      100000,
    ];
    let minorSteps = [
      0.00001,
      0.0001,
      0.001,
      0.01,
      0.1,
      1,
      5,
      10,
      25,
      50,
      100,
      500,
      1000,
      10000,
      100000,
    ];
    let minorStepIndex = 0;
    let majorStepIndex = -1;
    let digitHeight = 0;
    let ticksNeeded = (max - min) / minorSteps[minorStepIndex];
    let majorStep = 0.0001;
    let minorStep = 0.0001;

    while (digitHeight < width / 40) {
      majorStepIndex += 1;
      let numberOfIncrements = Math.round(
        (max - min) / majorSteps[majorStepIndex]
      );
      let maxDigits = 1;
      if (majorSteps[majorStepIndex] > 1) {
        maxDigits = digitCount(Math.ceil(max));
      } else {
        maxDigits = digitCount(majorSteps[majorStepIndex]);
      }

      let numberOfDigitWidths = (maxDigits + 1) * (numberOfIncrements - 1);
      let digitWidth = width / numberOfDigitWidths;
      digitHeight = (6 / 5) * digitWidth;
      minorStep = minorSteps[majorStepIndex - 1];
      majorStep = majorSteps[majorStepIndex];
    }

    while (ticksNeeded >= 100) {
      minorStepIndex += 1;
      ticksNeeded = (max - min) / minorSteps[minorStepIndex];
      minorStep = minorSteps[minorStepIndex];
    }

    digitHeight = width / 40;

    const params = {
      MAJOR_STEP: majorStep,
      MINOR_STEP: minorStep,
      DIGIT_HEIGHT: digitHeight,
    };
    return params;
  }

  function getNumbersNeeded(max, min, step) {
    let numbersNeeded = {};
    let start = Math.ceil(min / step) * step;
    let currentNumber = start;
    let digits = digitCount(step);

    while (currentNumber <= max && currentNumber >= start) {
      let cleanNumber = Math.round(currentNumber / step) * step;
      if (cleanNumber % 1 != 0) {
        cleanNumber = currentNumber.toFixed(digits - 1);
      }
      // Add this number to the list of numbers needed.
      numbersNeeded[cleanNumber] = true;
      currentNumber += step;
    }
    return numbersNeeded;
  }

  // Constructors
  function makeBackground() {
    // Setup Background
    this.sprite = new PIXI.Sprite.from(blueGradient);
    this.sprite.width = WINDOW_WIDTH;
    this.sprite.height = WINDOW_HEIGHT;
    this.sprite.x = 0;
    this.sprite.y = 0;
    this.sprite.interactive = true;

    app.stage.addChild(this.sprite);

    this.draw = () => {
      this.sprite.width = WINDOW_WIDTH;
      this.sprite.height = WINDOW_HEIGHT;
    };
  }

  function updateLayoutParams(newFrame) {
    let frame;
    if (newFrame) {
      frame = newFrame;
    } else {
      frame = { width: WINDOW_WIDTH, height: WINDOW_HEIGHT };
    }
    WINDOW_WIDTH = frame.width;
    WINDOW_HEIGHT = frame.height;
    H_W_RATIO = frame.height / frame.width;
    LANDSCAPE = H_W_RATIO < 3 / 4;
    ARENA_WIDTH = LANDSCAPE ? (4 / 3) * frame.height : frame.width;
    ARENA_HEIGHT = LANDSCAPE ? frame.height : (3 / 4) * frame.width;
  }

  // Loading Script
  function load() {
    if (setup.props.features) {
      features = setup.props.features;
    }

    numberline = new NumberLine(0, 100, NUMBER_LINE_WIDTH);

    app.stage.addChild(numberline);
    numberline.x = WINDOW_WIDTH / 2 - NUMBER_LINE_WIDTH / 2;
    numberline.y = (3 / 5) * WINDOW_HEIGHT;

    let sprite = new PIXI.Sprite.from(blueGradient);
    sprite.width = 0.9 * numberline.x;
    sprite.height = WINDOW_HEIGHT;
    sprite.x = 0;
    sprite.y = 0;
    //app.stage.addChild(sprite)

    let sprite2 = new PIXI.Sprite.from(blueGradient);
    sprite2.anchor.set(1, 0);
    sprite2.width = 0.9 * numberline.x;
    sprite2.height = WINDOW_HEIGHT;
    sprite2.x = WINDOW_WIDTH;
    sprite2.y = 0;
    //app.stage.addChild(sprite2)

    app.stage.addChild(sliderLine);
    //app.stage.addChild(draggerMin)
    app.stage.addChild(dragger);

    focalPoint.x = numberline.x;
    focalPoint.y = numberline.y;

    let atanThis = focalPoint.y / (WINDOW_WIDTH - focalPoint.x);
    anchorAngle = Math.atan(atanThis);

    for (let i = 0; i < 100; i++) {
      let _angle = -Math.random() * angle;
      let radius = WINDOW_WIDTH + WINDOW_WIDTH * Math.random();
      let newEmitter = new Emitter(radius, _angle);
      newEmitter.texture = BLUE_CIRCLE;
      emitters.push(newEmitter);
      //app.stage.addChild(newEmitter)
      newEmitter.update((1 / 8) * dragger.ds);
    }

    for (let i = 0; i < 100; i++) {
      let _angle = -Math.random() * angle;
      let radius = WINDOW_WIDTH + WINDOW_WIDTH * Math.random();
      let newEmitter = new Emitter(radius, _angle);
      newEmitter.texture = BLUE_CIRCLE;
      emitters2.push(newEmitter);
      //app.stage.addChild(newEmitter)
      newEmitter.update((1 / 6) * dragger.ds);
    }

    app.stage.addChild(draggerMin)
    app.stage.addChild(dragger)

  }

  // Call load script
  load();
  // Not sure where else to put this.
  app.resize = (frame) => resize(frame);
  // app.resizable = true
};
