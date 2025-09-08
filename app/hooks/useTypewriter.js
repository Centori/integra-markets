import { useState, useEffect, useRef } from 'react';

/**
 * useTypewriter Hook
 * Animates text display with a typewriter effect
 * @param {string} text - The text to animate
 * @param {number} speed - Characters per second (default: 40)
 * @param {boolean} enabled - Whether to enable the effect
 * @returns {object} - { displayText, isTyping, reset }
 */
export const useTypewriter = (text, speed = 40, enabled = true) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  // Calculate delay in milliseconds based on characters per second
  const delay = 1000 / speed; // 40 chars/sec = 25ms per char

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayText(text || '');
      setIsTyping(false);
      return;
    }

    // Reset when text changes
    setDisplayText('');
    setCurrentIndex(0);
    setIsTyping(true);

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start typing effect
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        
        if (nextIndex > text.length) {
          clearInterval(intervalRef.current);
          setIsTyping(false);
          return prevIndex;
        }
        
        setDisplayText(text.slice(0, nextIndex));
        return nextIndex;
      });
    }, delay);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, speed, enabled]);

  const reset = () => {
    setDisplayText('');
    setCurrentIndex(0);
    setIsTyping(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const skipAnimation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setDisplayText(text);
    setCurrentIndex(text?.length || 0);
    setIsTyping(false);
  };

  return {
    displayText,
    isTyping,
    reset,
    skipAnimation,
  };
};

/**
 * Advanced typewriter with word-by-word animation
 * More natural looking for longer texts
 */
export const useWordTypewriter = (text, wordsPerSecond = 8, enabled = true) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const intervalRef = useRef(null);

  // Split text into words
  const words = text ? text.split(' ') : [];
  const delay = 1000 / wordsPerSecond; // 8 words/sec = 125ms per word

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayText(text || '');
      setIsTyping(false);
      return;
    }

    // Reset when text changes
    setDisplayText('');
    setCurrentWordIndex(0);
    setIsTyping(true);

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start typing effect
    intervalRef.current = setInterval(() => {
      setCurrentWordIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        
        if (nextIndex > words.length) {
          clearInterval(intervalRef.current);
          setIsTyping(false);
          return prevIndex;
        }
        
        setDisplayText(words.slice(0, nextIndex).join(' '));
        return nextIndex;
      });
    }, delay);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, wordsPerSecond, enabled]);

  return {
    displayText,
    isTyping,
    wordsTyped: currentWordIndex,
    totalWords: words.length,
  };
};

export default useTypewriter;
