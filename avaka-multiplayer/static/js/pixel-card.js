// Vanilla JS translation of PixelCard component and its Pixel helper

class Pixel {
  constructor(canvas, context, x, y, color, speed, delay) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = context;
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = this.getRandomValue(0.1, 0.9) * speed;
    this.size = 0;
    this.sizeStep = Math.random() * 0.4;
    this.minSize = 0.5;
    this.maxSizeInteger = 2;
    this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger);
    this.delay = delay;
    this.counter = 0;
    this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01;
    this.isIdle = false;
    this.isReverse = false;
    this.isShimmer = false;
  }

  getRandomValue(min, max) {
    return Math.random() * (max - min) + min;
  }

  draw() {
    const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(this.x + centerOffset, this.y + centerOffset, this.size, this.size);
  }

  appear() {
    this.isIdle = false;
    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }
    if (this.size >= this.maxSize) {
      this.isShimmer = true;
    }
    if (this.isShimmer) {
      this.shimmer();
    } else {
      this.size += this.sizeStep;
    }
    this.draw();
  }

  disappear() {
    this.isShimmer = false;
    this.counter = 0;
    if (this.size <= 0) {
      this.isIdle = true;
      return;
    } else {
      this.size -= 0.1;
    }
    this.draw();
  }

  shimmer() {
    if (this.size >= this.maxSize) {
      this.isReverse = true;
    } else if (this.size <= this.minSize) {
      this.isReverse = false;
    }
    if (this.isReverse) {
      this.size -= this.speed;
    } else {
      this.size += this.speed;
    }
  }
}

class PixelCard {
  constructor(element, options = {}) {
    this.container = element;
    this.canvas = element.querySelector('.pixel-canvas');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'pixel-canvas';
      this.container.appendChild(this.canvas);
    }
    this.ctx = this.canvas.getContext('2d');
    
    // Config variants
    const variant = options.variant || 'default';
    const variantCfg = PixelCard.VARIANTS[variant] || PixelCard.VARIANTS.default;
    
    this.gap = options.gap ?? variantCfg.gap;
    this.speed = options.speed ?? variantCfg.speed;
    this.colors = options.colors ?? variantCfg.colors;
    this.noFocus = options.noFocus ?? variantCfg.noFocus;
    
    this.pixels = [];
    this.animationFrameId = null;
    this.timePrevious = performance.now();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Event bindings
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);
    
    this.init();
  }
  
  init() {
    this.initPixels();
    
    // Set up ResizeObserver
    this.resizeObserver = new ResizeObserver(() => {
      this.initPixels();
    });
    this.resizeObserver.observe(this.container);
    
    // Attach event listeners
    this.container.addEventListener('mouseenter', this.onMouseEnter);
    this.container.addEventListener('mouseleave', this.onMouseLeave);
    
    if (!this.noFocus) {
      this.container.setAttribute('tabindex', '0');
      this.container.addEventListener('focus', this.onFocus);
      this.container.addEventListener('blur', this.onBlur);
    } else {
      this.container.removeAttribute('tabindex');
    }
  }
  
  initPixels() {
    if (!this.container || !this.canvas) return;
    
    const rect = this.container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    
    if (width === 0 || height === 0) return;
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    const colorsArray = this.colors.split(',');
    const pxs = [];
    const gapVal = parseInt(this.gap, 10);
    const speedVal = PixelCard.getEffectiveSpeed(this.speed, this.reducedMotion);
    
    for (let x = 0; x < width; x += gapVal) {
      for (let y = 0; y < height; y += gapVal) {
        const color = colorsArray[Math.floor(Math.random() * colorsArray.length)];
        
        const dx = x - width / 2;
        const dy = y - height / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delay = this.reducedMotion ? 0 : distance;
        
        pxs.push(new Pixel(this.canvas, this.ctx, x, y, color, speedVal, delay));
      }
    }
    this.pixels = pxs;
  }
  
  doAnimate(fnName) {
    this.animationFrameId = requestAnimationFrame(() => this.doAnimate(fnName));
    const timeNow = performance.now();
    const timePassed = timeNow - this.timePrevious;
    const timeInterval = 1000 / 60;
    
    if (timePassed < timeInterval) return;
    this.timePrevious = timeNow - (timePassed % timeInterval);
    
    if (!this.ctx || !this.canvas) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    let allIdle = true;
    for (let i = 0; i < this.pixels.length; i++) {
      const pixel = this.pixels[i];
      pixel[fnName]();
      if (!pixel.isIdle) {
        allIdle = false;
      }
    }
    
    if (allIdle) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  handleAnimation(name) {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.animationFrameId = requestAnimationFrame(() => this.doAnimate(name));
  }
  
  onMouseEnter() {
    this.handleAnimation('appear');
  }
  
  onMouseLeave() {
    this.handleAnimation('disappear');
  }
  
  onFocus(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    this.handleAnimation('appear');
  }
  
  onBlur(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    this.handleAnimation('disappear');
  }
  
  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.container.removeEventListener('mouseenter', this.onMouseEnter);
    this.container.removeEventListener('mouseleave', this.onMouseLeave);
    this.container.removeEventListener('focus', this.onFocus);
    this.container.removeEventListener('blur', this.onBlur);
  }
}

PixelCard.getEffectiveSpeed = function(value, reducedMotion) {
  const min = 0;
  const max = 100;
  const throttle = 0.001;
  const parsed = parseInt(value, 10);

  if (parsed <= min || reducedMotion) {
    return min;
  } else if (parsed >= max) {
    return max * throttle;
  } else {
    return parsed * throttle;
  }
};

PixelCard.VARIANTS = {
  default: {
    activeColor: null,
    gap: 4,
    speed: 35,
    colors: '#f8fafc,#f1f5f9,#cbd5e1',
    noFocus: false
  },
  blue: {
    activeColor: '#e0f2fe',
    gap: 4,
    speed: 25,
    colors: '#e0f2fe,#7dd3fc,#0ea5e9',
    noFocus: false
  },
  yellow: {
    activeColor: '#fef08a',
    gap: 3,
    speed: 20,
    colors: '#fef08a,#fde047,#eab308',
    noFocus: false
  },
  green: {
    activeColor: '#bbf7d0',
    gap: 3,
    speed: 30,
    colors: '#f0fdf4,#bbf7d0,#4ade80',
    noFocus: false
  },
  pink: {
    activeColor: '#fecdd3',
    gap: 4,
    speed: 80,
    colors: '#fecdd3,#fda4af,#e11d48',
    noFocus: true
  }
};

// Global expose
window.PixelCard = PixelCard;
