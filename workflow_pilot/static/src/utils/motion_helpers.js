/** @odoo-module **/

/**
 * Motion.dev Helper Utilities for Workflow Pilot
 * 
 * Provides animation functions for UX enhancements.
 * Uses window.Motion which is loaded from CDN.
 */

export const MotionHelpers = {
    /**
     * Check if Motion library is available
     */
    isAvailable() {
        return typeof window !== 'undefined' && window.Motion;
    },

    /**
     * Animate node entrance (drop/create)
     * @param {HTMLElement} element 
     */
    animateNodeIn(element) {
        if (!this.isAvailable()) return;
        window.Motion.animate(element,
            { scale: [0.85, 1], opacity: [0, 1] },
            { duration: 0.2, easing: [0.22, 1, 0.36, 1] } // ease-out-expo
        );
    },

    /**
     * Animate node exit (delete)
     * @param {HTMLElement} element 
     * @param {Function} onComplete - callback after animation
     * @returns {Promise}
     */
    animateNodeOut(element, onComplete) {
        if (!this.isAvailable()) {
            onComplete?.();
            return Promise.resolve();
        }
        return window.Motion.animate(element,
            { scale: [1, 0.85], opacity: [1, 0] },
            { duration: 0.15, easing: [0.55, 0, 1, 0.45] } // ease-in-expo
        ).finished.then(() => {
            onComplete?.();
        });
    },

    /**
     * Animate node to new position (for tidy up)
     * @param {HTMLElement} element 
     * @param {number} x 
     * @param {number} y 
     * @param {Object} options
     */
    animateNodePosition(element, x, y, options = {}) {
        if (!this.isAvailable()) {
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
            return Promise.resolve();
        }
        const delay = options.delay || 0;
        return window.Motion.animate(element,
            { left: `${x}px`, top: `${y}px` },
            {
                type: "spring",
                stiffness: 400,
                damping: 35,
                delay
            }
        ).finished;
    },

    /**
     * Animate connection path (stroke draw-in effect)
     * @param {SVGPathElement} pathElement 
     */
    animateConnectionIn(pathElement) {
        if (!this.isAvailable()) return;
        const length = pathElement.getTotalLength();
        pathElement.style.strokeDasharray = length;
        pathElement.style.strokeDashoffset = length;

        window.Motion.animate(pathElement,
            { strokeDashoffset: 0 },
            { duration: 0.3, easing: [0.22, 1, 0.36, 1] }
        ).finished.then(() => {
            // Reset to normal after animation
            pathElement.style.strokeDasharray = '';
            pathElement.style.strokeDashoffset = '';
        });
    },

    /**
     * Stagger helper for multiple elements
     * @param {number} delayPerItem 
     * @returns {Function}
     */
    stagger(delayPerItem = 0.03) {
        if (!this.isAvailable()) return () => 0;
        return window.Motion.stagger(delayPerItem);
    }
};
