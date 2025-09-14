/**
 * Mathematical Utilities for Disco Ball Experience
 * 
 * Pure mathematical functions extracted from the main disco-ball.js
 * for better reusability and organization. These functions have no dependencies
 * on the main class or Three.js objects (except for Vector3 parameters).
 */

import { MATH_CONSTANTS } from '../constants.js';

/**
 * Generate random spherical coordinates for positioning objects on a sphere surface
 * @param {number} radius - The radius of the sphere
 * @param {number} offset - Additional offset from the sphere surface (default: 0.02)
 * @returns {Object} Object containing x, y, z coordinates and phi, theta angles
 */
export function generateRandomSpherePosition(radius, offset = 0.02) {
    // Random position on sphere surface using spherical coordinates
    const phi = Math.acos(2 * Math.random() - 1); // 0 to PI
    const theta = MATH_CONSTANTS.TWO_PI * Math.random(); // 0 to 2PI
    
    const actualRadius = radius + offset;
    const x = actualRadius * Math.sin(phi) * Math.cos(theta);
    const y = actualRadius * Math.cos(phi);
    const z = actualRadius * Math.sin(phi) * Math.sin(theta);
    
    return {
        x, y, z,
        phi, theta,
        position: { x, y, z }
    };
}

/**
 * Calculate ray-plane intersection point
 * @param {THREE.Vector3} rayOrigin - Origin point of the ray
 * @param {THREE.Vector3} rayDirection - Direction vector of the ray (should be normalized)
 * @param {THREE.Vector3} planePoint - Any point on the plane
 * @param {THREE.Vector3} planeNormal - Normal vector of the plane
 * @returns {THREE.Vector3|null} Intersection point or null if no intersection
 */
export function rayPlaneIntersection(rayOrigin, rayDirection, planePoint, planeNormal) {
    const denom = planeNormal.dot(rayDirection);
    
    // Ray is parallel to plane
    if (Math.abs(denom) < 1e-6) return null;
    
    const t = planePoint.clone().sub(rayOrigin).dot(planeNormal) / denom;
    
    // Intersection is behind ray origin
    if (t < 0) return null;
    
    return rayOrigin.clone().add(rayDirection.clone().multiplyScalar(t));
}

/**
 * Check if a point is within specified surface bounds
 * @param {THREE.Vector3} point - The point to check
 * @param {Object} surface - Surface object with bounds property
 * @returns {boolean} True if point is within bounds
 */
export function isPointInSurfaceBounds(point, surface) {
    const bounds = surface.bounds;
    
    // Check bounds based on surface orientation
    if (bounds.minX !== undefined) {
        return point.x >= bounds.minX && point.x <= bounds.maxX &&
               point.z >= bounds.minZ && point.z <= bounds.maxZ;
    } else if (bounds.minY !== undefined) {
        return point.y >= bounds.minY && point.y <= bounds.maxY &&
               point.z >= bounds.minZ && point.z <= bounds.maxZ;
    } else {
        return point.x >= bounds.minX && point.x <= bounds.maxX &&
               point.y >= bounds.minY && point.y <= bounds.maxY;
    }
}

/**
 * Find the closest surface intersection for a ray among multiple surfaces
 * @param {THREE.Vector3} rayOrigin - Origin point of the ray
 * @param {THREE.Vector3} rayDirection - Direction vector of the ray
 * @param {Array} surfaces - Array of surface objects to test against
 * @returns {Object|null} Closest intersection with point, normal, and distance
 */
export function findClosestSurfaceIntersection(rayOrigin, rayDirection, surfaces) {
    let closestIntersection = null;
    let closestDistance = Infinity;
    
    // Check intersection with each room surface
    surfaces.forEach(surface => {
        const intersection = rayPlaneIntersection(rayOrigin, rayDirection, surface.point, surface.normal);
        
        if (intersection) {
            const distance = rayOrigin.distanceTo(intersection);
            
            // Check if intersection is within surface bounds and closer
            if (distance > 0.1 && distance < closestDistance && isPointInSurfaceBounds(intersection, surface)) {
                closestDistance = distance;
                closestIntersection = {
                    point: intersection,
                    normal: surface.normal.clone(),
                    distance: distance
                };
            }
        }
    });
    
    return closestIntersection;
}

/**
 * Calculate performance cost based on various configuration factors
 * @param {Object} config - Configuration object with performance-affecting properties
 * @param {Object} performanceStats - Current performance statistics
 * @returns {number} Calculated performance cost score
 */
export function calculatePerformanceCost(config, performanceStats) {
    let cost = 0;
    
    // Facet count impact (major factor)
    cost += (config.mirrorFacets - 50) * 0.3;
    
    // Max spots impact
    cost += (config.maxSpots - 25) * 0.5;
    
    // Room size impact (larger rooms = more calculations)
    cost += (config.roomSize - 10) * 2;
    
    // Ball size impact (larger = more complex reflections)
    cost += (config.ballSize - 1) * 10;
    
    // Active reflections impact (real-time cost)
    cost += performanceStats.activeReflections * 0.8;
    
    // Wobble adds slight cost
    if (config.enableWobble) cost += 5;
    
    // Performance mode adjustments
    switch (config.performanceMode) {
        case 'low': cost *= 0.6; break;
        case 'medium': cost *= 0.8; break;
        case 'high': cost *= 1.0; break;
    }
    
    return Math.max(0, cost);
}

/**
 * Generate motor wobble and speed variations for realistic motor simulation
 * @param {number} motorTime - Current motor time in seconds
 * @param {number} wobblePhase - Random phase offset for wobble
 * @param {number} baseSpeed - Base rotation speed
 * @param {number} wobbleIntensity - Intensity of wobble effect
 * @returns {Object} Object containing rotation speeds and wobble values
 */
export function calculateMotorImperfections(motorTime, wobblePhase, baseSpeed, wobbleIntensity) {
    // Add speed variation (motor isn't perfectly consistent)
    const speedWobble = Math.sin(motorTime * 0.7 + wobblePhase) * 0.1;
    const microVariations = Math.sin(motorTime * 5.3) * 0.03;
    const actualSpeed = baseSpeed * (1 + speedWobble + microVariations);
    
    // Add slight wobble/tilt (motor bearing wear)
    const wobbleX = Math.sin(motorTime * 1.2 + wobblePhase) * wobbleIntensity;
    const wobbleZ = Math.cos(motorTime * 0.8 + wobblePhase * 1.3) * wobbleIntensity * 0.7;
    
    return {
        actualSpeed,
        wobbleX,
        wobbleZ,
        speedVariation: speedWobble + microVariations
    };
}

/**
 * Smooth FPS calculation with history-based averaging
 * @param {Array} fpsHistory - Array of recent FPS measurements
 * @param {number} instantFPS - Current frame's FPS
 * @param {number} maxHistorySize - Maximum number of frames to keep in history
 * @returns {Object} Object containing smoothed FPS and updated history
 */
export function calculateSmoothedFPS(fpsHistory, instantFPS, maxHistorySize = 60) {
    // Add to history
    const newHistory = [...fpsHistory, instantFPS];
    
    // Keep only recent frames
    if (newHistory.length > maxHistorySize) {
        newHistory.shift();
    }
    
    // Calculate average FPS
    const averageFPS = newHistory.length > 0 
        ? newHistory.reduce((a, b) => a + b) / newHistory.length 
        : instantFPS;
    
    return {
        smoothedFPS: averageFPS,
        history: newHistory
    };
}

/**
 * Convert angle measurement units
 */
export const angleUtils = {
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    degToRad: (degrees) => degrees * MATH_CONSTANTS.DEG_TO_RAD,
    
    /**
     * Convert radians to degrees  
     * @param {number} radians - Angle in radians
     * @returns {number} Angle in degrees
     */
    radToDeg: (radians) => radians * MATH_CONSTANTS.RAD_TO_DEG,
    
    /**
     * Normalize angle to 0-360 degrees
     * @param {number} degrees - Angle in degrees
     * @returns {number} Normalized angle
     */
    normalizeDegrees: (degrees) => ((degrees % 360) + 360) % 360,
    
    /**
     * Normalize angle to 0-2π radians
     * @param {number} radians - Angle in radians  
     * @returns {number} Normalized angle
     */
    normalizeRadians: (radians) => ((radians % MATH_CONSTANTS.TWO_PI) + MATH_CONSTANTS.TWO_PI) % MATH_CONSTANTS.TWO_PI
};