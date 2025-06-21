// src/utils/animations.js - JavaScript animation utilities and controls

/**
 * ApexMatch Animation Utilities
 * Provides JavaScript controls for CSS animations, easing functions, and animation sequences
 */

// Animation configuration constants
export const ANIMATION_CONFIG = {
  durations: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    slower: 800,
    reveal: 3000
  },
  
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    swift: 'cubic-bezier(0.4, 0, 0.6, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  },
  
  stagger: {
    short: 50,
    normal: 100,
    long: 200
  }
};

// Animation state management
class AnimationManager {
  constructor() {
    this.activeAnimations = new Map();
    this.observers = new Map();
    this.isReducedMotion = this.detectReducedMotion();
    
    // Listen for reduced motion changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      mediaQuery.addListener(() => {
        this.isReducedMotion = mediaQuery.matches;
      });
    }
  }
  
  detectReducedMotion() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  
  // Register an animation
  register(id, animationFunction, cleanup) {
    if (this.activeAnimations.has(id)) {
      this.cancel(id);
    }
    
    this.activeAnimations.set(id, {
      animation: animationFunction,
      cleanup: cleanup || (() => {})
    });
  }
  
  // Cancel an animation
  cancel(id) {
    const animation = this.activeAnimations.get(id);
    if (animation) {
      animation.cleanup();
      this.activeAnimations.delete(id);
    }
  }
  
  // Cancel all animations
  cancelAll() {
    this.activeAnimations.forEach((animation, id) => {
      this.cancel(id);
    });
  }
  
  // Check if reduced motion is preferred
  shouldReduceMotion() {
    return this.isReducedMotion;
  }
}

// Global animation manager instance
export const animationManager = new AnimationManager();

// Basic animation utilities
export const animate = {
  
  // Fade animations
  fadeIn(element, duration = ANIMATION_CONFIG.durations.normal, callback) {
    if (animationManager.shouldReduceMotion()) {
      element.style.opacity = '1';
      callback && callback();
      return;
    }
    
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ${ANIMATION_CONFIG.easing.smooth}`;
    
    requestAnimationFrame(() => {
      element.style.opacity = '1';
    });
    
    if (callback) {
      setTimeout(callback, duration);
    }
  },
  
  fadeOut(element, duration = ANIMATION_CONFIG.durations.normal, callback) {
    if (animationManager.shouldReduceMotion()) {
      element.style.opacity = '0';
      callback && callback();
      return;
    }
    
    element.style.transition = `opacity ${duration}ms ${ANIMATION_CONFIG.easing.smooth}`;
    element.style.opacity = '0';
    
    if (callback) {
      setTimeout(callback, duration);
    }
  },
  
  // Scale animations
  scaleIn(element, duration = ANIMATION_CONFIG.durations.normal, callback) {
    if (animationManager.shouldReduceMotion()) {
      element.style.transform = 'scale(1)';
      element.style.opacity = '1';
      callback && callback();
      return;
    }
    
    element.style.opacity = '0';
    element.style.transform = 'scale(0.8)';
    element.style.transition = `all ${duration}ms ${ANIMATION_CONFIG.easing.bounce}`;
    
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'scale(1)';
    });
    
    if (callback) {
      setTimeout(callback, duration);
    }
  },
  
  scaleOut(element, duration = ANIMATION_CONFIG.durations.normal, callback) {
    if (animationManager.shouldReduceMotion()) {
      element.style.transform = 'scale(0.8)';
      element.style.opacity = '0';
      callback && callback();
      return;
    }
    
    element.style.transition = `all ${duration}ms ${ANIMATION_CONFIG.easing.smooth}`;
    element.style.opacity = '0';
    element.style.transform = 'scale(0.8)';
    
    if (callback) {
      setTimeout(callback, duration);
    }
  },
  
  // Slide animations
  slideIn(element, direction = 'up', duration = ANIMATION_CONFIG.durations.normal, callback) {
    if (animationManager.shouldReduceMotion()) {
      element.style.transform = 'translate3d(0, 0, 0)';
      element.style.opacity = '1';
      callback && callback();
      return;
    }
    
    const transforms = {
      up: 'translate3d(0, 20px, 0)',
      down: 'translate3d(0, -20px, 0)',
      left: 'translate3d(-20px, 0, 0)',
      right: 'translate3d(20px, 0, 0)'
    };
    
    element.style.opacity = '0';
    element.style.transform = transforms[direction];
    element.style.transition = `all ${duration}ms ${ANIMATION_CONFIG.easing.smooth}`;
    
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'translate3d(0, 0, 0)';
    });
    
    if (callback) {
      setTimeout(callback, duration);
    }
  },
  
  // Bounce animation
  bounce(element, intensity = 1, callback) {
    if (animationManager.shouldReduceMotion()) {
      callback && callback();
      return;
    }
    
    const bounceKeyframes = [
      { transform: 'translateY(0)', offset: 0 },
      { transform: `translateY(-${10 * intensity}px)`, offset: 0.4 },
      { transform: 'translateY(0)', offset: 0.6 },
      { transform: `translateY(-${5 * intensity}px)`, offset: 0.8 },
      { transform: 'translateY(0)', offset: 1 }
    ];
    
    const animation = element.animate(bounceKeyframes, {
      duration: 600,
      easing: ANIMATION_CONFIG.easing.ease
    });
    
    if (callback) {
      animation.addEventListener('finish', callback);
    }
    
    return animation;
  }
};

// ApexMatch specific animations
export const apexAnimations = {
  
  // Heartbeat animation for logos and love indicators
  heartbeat(element, intensity = 1, duration = 2000) {
    if (animationManager.shouldReduceMotion()) return;
    
    const keyframes = [
      { transform: 'scale(1)', offset: 0 },
      { transform: `scale(${1 + 0.15 * intensity})`, offset: 0.14 },
      { transform: 'scale(1)', offset: 0.28 },
      { transform: `scale(${1 + 0.15 * intensity})`, offset: 0.42 },
      { transform: 'scale(1)', offset: 0.7 },
      { transform: 'scale(1)', offset: 1 }
    ];
    
    return element.animate(keyframes, {
      duration,
      iterations: Infinity,
      easing: ANIMATION_CONFIG.easing.ease
    });
  },
  
  // Emotional pulse for high-emotion messages
  emotionalPulse(element, color = 'rgba(236, 72, 153, 0.6)') {
    if (animationManager.shouldReduceMotion()) return;
    
    const keyframes = [
      { 
        transform: 'scale(1)', 
        opacity: '0.8',
        boxShadow: `0 0 20px ${color.replace('0.6', '0.3')}`,
        offset: 0 
      },
      { 
        transform: 'scale(1.05)', 
        opacity: '1',
        boxShadow: `0 0 30px ${color}`,
        offset: 0.5 
      },
      { 
        transform: 'scale(1)', 
        opacity: '0.8',
        boxShadow: `0 0 20px ${color.replace('0.6', '0.3')}`,
        offset: 1 
      }
    ];
    
    return element.animate(keyframes, {
      duration: 3000,
      iterations: Infinity,
      easing: ANIMATION_CONFIG.easing.ease
    });
  },
  
  // Trust score glow animation
  trustGlow(element, trustScore) {
    if (animationManager.shouldReduceMotion()) return;
    
    // Different colors based on trust tier
    const trustColors = {
      challenged: 'rgba(239, 68, 68, 0.6)',
      building: 'rgba(249, 115, 22, 0.6)',
      reliable: 'rgba(234, 179, 8, 0.6)',
      trusted: 'rgba(34, 197, 94, 0.6)',
      elite: 'rgba(139, 92, 246, 0.6)'
    };
    
    let color = trustColors.building; // default
    if (trustScore >= 95) color = trustColors.elite;
    else if (trustScore >= 85) color = trustColors.trusted;
    else if (trustScore >= 70) color = trustColors.reliable;
    else if (trustScore >= 50) color = trustColors.building;
    else color = trustColors.challenged;
    
    const keyframes = [
      { boxShadow: `0 0 15px ${color.replace('0.6', '0.4')}`, offset: 0 },
      { boxShadow: `0 0 25px ${color}`, offset: 0.5 },
      { boxShadow: `0 0 15px ${color.replace('0.6', '0.4')}`, offset: 1 }
    ];
    
    return element.animate(keyframes, {
      duration: 2000,
      iterations: Infinity,
      easing: ANIMATION_CONFIG.easing.ease
    });
  },
  
  // Match card swipe animation
  swipeCard(element, direction, onComplete) {
    if (animationManager.shouldReduceMotion()) {
      element.style.display = 'none';
      onComplete && onComplete();
      return;
    }
    
    const isRight = direction === 'right';
    const translateX = isRight ? '150%' : '-150%';
    const rotate = isRight ? '30deg' : '-30deg';
    
    const keyframes = [
      { 
        transform: 'translateX(0) rotate(0deg)', 
        opacity: '1',
        offset: 0 
      },
      { 
        transform: `translateX(${translateX}) rotate(${rotate})`, 
        opacity: '0',
        offset: 1 
      }
    ];
    
    const animation = element.animate(keyframes, {
      duration: ANIMATION_CONFIG.durations.slow,
      easing: ANIMATION_CONFIG.easing.smooth,
      fill: 'forwards'
    });
    
    if (onComplete) {
      animation.addEventListener('finish', onComplete);
    }
    
    return animation;
  },
  
  // Reveal card flip animation
  flipRevealCard(element, onComplete) {
    if (animationManager.shouldReduceMotion()) {
      element.classList.add('flipped');
      onComplete && onComplete();
      return;
    }
    
    element.style.transition = 'transform 0.8s';
    element.classList.add('flipped');
    
    if (onComplete) {
      setTimeout(onComplete, 800);
    }
  },
  
  // Celebration heart burst
  createHeartBurst(container, count = 10) {
    if (animationManager.shouldReduceMotion()) return;
    
    for (let i = 0; i < count; i++) {
      const heart = document.createElement('div');
      heart.textContent = '💕';
      heart.style.position = 'absolute';
      heart.style.fontSize = `${Math.random() * 20 + 20}px`;
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.top = '100%';
      heart.style.pointerEvents = 'none';
      heart.style.zIndex = '1000';
      
      container.appendChild(heart);
      
      const keyframes = [
        { 
          transform: 'translateY(0) scale(0.5) rotate(0deg)', 
          opacity: '1',
          offset: 0 
        },
        { 
          transform: `translateY(-${Math.random() * 200 + 100}px) scale(1) rotate(${Math.random() * 360}deg)`, 
          opacity: '1',
          offset: 0.5 
        },
        { 
          transform: `translateY(-${Math.random() * 400 + 200}px) scale(0.5) rotate(${Math.random() * 720}deg)`, 
          opacity: '0',
          offset: 1 
        }
      ];
      
      const animation = heart.animate(keyframes, {
        duration: Math.random() * 1000 + 2000,
        easing: ANIMATION_CONFIG.easing.easeOut
      });
      
      animation.addEventListener('finish', () => {
        heart.remove();
      });
    }
  }
};

// Staggered animation utilities
export const staggeredAnimations = {
  
  // Animate elements with staggered timing
  stagger(elements, animationFunction, staggerDelay = ANIMATION_CONFIG.stagger.normal) {
    if (!elements || elements.length === 0) return;
    
    const animations = [];
    
    elements.forEach((element, index) => {
      const delay = index * staggerDelay;
      
      const timeoutId = setTimeout(() => {
        const animation = animationFunction(element, index);
        animations.push(animation);
      }, delay);
      
      // Store timeout for cleanup
      animations.push({ timeoutId, cancel: () => clearTimeout(timeoutId) });
    });
    
    return {
      animations,
      cancel: () => {
        animations.forEach(anim => {
          if (anim.cancel) anim.cancel();
          else if (anim.cancel) anim.cancel();
        });
      }
    };
  },
  
  // Animate BGP traits with stagger
  animateBGPTraits(traitElements, scores, duration = ANIMATION_CONFIG.durations.slow) {
    return this.stagger(traitElements, (element, index) => {
      const progressBar = element.querySelector('.bgp-trait-fill');
      const score = scores[index] || 0;
      
      if (progressBar) {
        if (animationManager.shouldReduceMotion()) {
          progressBar.style.width = `${score}%`;
          return;
        }
        
        progressBar.style.width = '0%';
        progressBar.style.transition = `width ${duration}ms ${ANIMATION_CONFIG.easing.smooth}`;
        
        requestAnimationFrame(() => {
          progressBar.style.width = `${score}%`;
        });
      }
    }, 100);
  },
  
  // Animate match cards appearing
  animateMatchCards(cardElements) {
    return this.stagger(cardElements, (element) => {
      animate.slideIn(element, 'up', ANIMATION_CONFIG.durations.normal);
    }, 150);
  },
  
  // Animate message bubbles
  animateMessageBubbles(messageElements) {
    return this.stagger(messageElements, (element, index) => {
      // Alternate slide directions for sent/received messages
      const direction = element.classList.contains('sent') ? 'right' : 'left';
      animate.slideIn(element, direction, ANIMATION_CONFIG.durations.fast);
    }, 50);
  }
};

// Progress animation utilities
export const progressAnimations = {
  
  // Animate progress bar
  animateProgress(element, targetPercent, duration = ANIMATION_CONFIG.durations.slow, callback) {
    if (animationManager.shouldReduceMotion()) {
      element.style.width = `${targetPercent}%`;
      callback && callback();
      return;
    }
    
    let startPercent = 0;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentPercent = startPercent + (targetPercent - startPercent) * progress;
      
      element.style.width = `${currentPercent}%`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (callback) {
        callback();
      }
    };
    
    requestAnimationFrame(animate);
  },
  
  // Animate circular progress (like trust score rings)
  animateCircularProgress(element, targetPercent, radius = 50) {
    if (animationManager.shouldReduceMotion()) {
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (targetPercent / 100) * circumference;
      element.style.strokeDasharray = circumference;
      element.style.strokeDashoffset = offset;
      return;
    }
    
    const circumference = 2 * Math.PI * radius;
    const targetOffset = circumference - (targetPercent / 100) * circumference;
    
    element.style.strokeDasharray = circumference;
    element.style.strokeDashoffset = circumference;
    element.style.transition = `stroke-dashoffset ${ANIMATION_CONFIG.durations.slower}ms ${ANIMATION_CONFIG.easing.smooth}`;
    
    requestAnimationFrame(() => {
      element.style.strokeDashoffset = targetOffset;
    });
  },
  
  // Animate countdown timer
  animateCountdown(element, seconds, onComplete) {
    if (animationManager.shouldReduceMotion()) {
      element.textContent = '0';
      onComplete && onComplete();
      return;
    }
    
    let remaining = seconds;
    element.textContent = remaining;
    
    const interval = setInterval(() => {
      remaining--;
      element.textContent = remaining;
      
      // Add pulse animation for each number
      animate.bounce(element, 0.1);
      
      if (remaining <= 0) {
        clearInterval(interval);
        onComplete && onComplete();
      }
    }, 1000);
    
    return interval;
  }
};

// Intersection Observer for scroll-triggered animations
export const scrollAnimations = {
  
  // Create intersection observer for elements
  createScrollObserver(callback, options = {}) {
    const defaultOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
      ...options
    };
    
    return new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target, entry);
        }
      });
    }, defaultOptions);
  },
  
  // Animate elements when they come into view
  animateOnScroll(elements, animationType = 'slideIn') {
    const observer = this.createScrollObserver((element) => {
      element.classList.add(`animate-${animationType}`);
      observer.unobserve(element);
    });
    
    elements.forEach(element => {
      observer.observe(element);
    });
    
    return observer;
  },
  
  // Parallax scroll effect
  createParallax(element, speed = 0.5) {
    const updateParallax = () => {
      const scrolled = window.pageYOffset;
      const parallaxValue = scrolled * speed;
      element.style.transform = `translateY(${parallaxValue}px)`;
    };
    
    window.addEventListener('scroll', updateParallax);
    
    return () => {
      window.removeEventListener('scroll', updateParallax);
    };
  }
};

// Animation sequence builder
export class AnimationSequence {
  constructor() {
    this.steps = [];
    this.isPlaying = false;
  }
  
  // Add animation step
  add(animationFunction, delay = 0) {
    this.steps.push({ animation: animationFunction, delay });
    return this;
  }
  
  // Add parallel animations
  parallel(...animationFunctions) {
    this.steps.push({ 
      animation: () => {
        return Promise.all(animationFunctions.map(fn => fn()));
      }, 
      delay: 0 
    });
    return this;
  }
  
  // Play the sequence
  async play() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    
    for (const step of this.steps) {
      if (step.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }
      
      await step.animation();
    }
    
    this.isPlaying = false;
  }
  
  // Reset the sequence
  reset() {
    this.steps = [];
    this.isPlaying = false;
    return this;
  }
}

// Performance monitoring for animations
export const animationPerformance = {
  
  // Monitor frame rate during animations
  monitorFrameRate(callback, duration = 5000) {
    let frames = 0;
    let lastTime = performance.now();
    
    const measureFrame = (currentTime) => {
      frames++;
      
      if (currentTime - lastTime >= duration) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        callback(fps);
        return;
      }
      
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
  },
  
  // Detect if device can handle complex animations
  detectPerformanceCapability() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    const capabilities = {
      webGL: !!gl,
      deviceMemory: navigator.deviceMemory || 4,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      connectionType: navigator.connection?.effectiveType || 'unknown'
    };
    
    // Determine performance level
    const isHighPerformance = capabilities.webGL && 
                             capabilities.deviceMemory >= 4 && 
                             capabilities.hardwareConcurrency >= 4;
    
    return {
      ...capabilities,
      level: isHighPerformance ? 'high' : 'standard',
      canHandleComplexAnimations: isHighPerformance
    };
  }
};

// Export utilities for external use
export default {
  animate,
  apexAnimations,
  staggeredAnimations,
  progressAnimations,
  scrollAnimations,
  AnimationSequence,
  animationManager,
  animationPerformance,
  ANIMATION_CONFIG
};