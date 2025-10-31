/**
 * Disco Ball Experience - Constants and Configuration
 * 
 * Centralized configuration constants, default values, and preset definitions
 * extracted from the main disco-ball.js for better organization and reusability.
 */

// Default configuration values
export const DEFAULT_CONFIG = {
    ballSize: 1.5,
    rotationSpeed: 1.0,
    lightDistance: 6,
    lightIntensity: 1.5,
    spotAngle: 30,
    lightColor: '#ffffff',
    lightAngleH: 45,
    lightHeight: 4,
    penumbra: 0.3,
    showLightBeam: true,
    mirrorFacets: 100,
    maxSpots: 50,
    ambientLight: 0.2,
    ballPosX: 0,
    ballPosY: 0,
    ballPosZ: 0,
    roomSize: 10,
    // Second light (for dual-light mode)
    enableSecondLight: false,
    light2Color: '#ff0000',
    light2Intensity: 1.5,
    light2SpotAngle: 30,
    light2AngleH: 225,  // Opposite side of the disco ball
    light2Height: 4,
    light2Distance: 6,
    light2Penumbra: 0.3,
    // Motor wobble settings
    enableWobble: true,
    wobbleIntensity: 0.02,
    // Performance settings
    performanceMode: 'high', // 'high', 'medium', 'low'
    showPerformanceStats: true,
    targetFPS: 60
};

// Built-in scene presets
export const SCENE_PRESETS = {
    classic: {
        name: "Classic Disco",
        ballSize: 1.5,
        rotationSpeed: 1.0,
        lightIntensity: 1.5,
        spotAngle: 30,
        lightColor: '#ffffff',
        lightAngleH: 45,
        lightHeight: 4,
        mirrorFacets: 120,
        maxSpots: 50,
        ambientLight: 0.1,
        roomSize: 10,
        enableWobble: true,
        wobbleIntensity: 0.02
    },
    intimate: {
        name: "Intimate Lounge",
        ballSize: 1.0,
        rotationSpeed: 0.5,
        lightIntensity: 1.0,
        spotAngle: 45,
        lightColor: '#ff8000',
        lightAngleH: 90,
        lightHeight: 3,
        mirrorFacets: 80,
        maxSpots: 30,
        ambientLight: 0.3,
        roomSize: 8,
        enableWobble: true,
        wobbleIntensity: 0.01
    },
    rave: {
        name: "High Energy Rave",
        ballSize: 2.5,
        rotationSpeed: 2.5,
        lightIntensity: 2.5,
        spotAngle: 60,
        lightColor: '#00ffff',
        lightAngleH: 180,
        lightHeight: 5,
        mirrorFacets: 200,
        maxSpots: 80,
        ambientLight: 0.05,
        roomSize: 15,
        enableWobble: true,
        wobbleIntensity: 0.04
    },
    minimal: {
        name: "Minimal Chic",
        ballSize: 1.2,
        rotationSpeed: 0.8,
        lightIntensity: 1.2,
        spotAngle: 20,
        lightColor: '#ffffff',
        lightAngleH: 0,
        lightHeight: 6,
        mirrorFacets: 60,
        maxSpots: 25,
        ambientLight: 0.25,
        roomSize: 12,
        enableWobble: false,
        wobbleIntensity: 0
    },
    colorful: {
        name: "Colorful Party",
        ballSize: 2.0,
        rotationSpeed: 1.8,
        lightIntensity: 2.0,
        spotAngle: 50,
        lightColor: '#ff00ff',
        lightAngleH: 270,
        lightHeight: 4,
        mirrorFacets: 150,
        maxSpots: 70,
        ambientLight: 0.15,
        roomSize: 11,
        enableWobble: true,
        wobbleIntensity: 0.03
    }
};

// Performance mode configurations (updated for higher limits)
export const PERFORMANCE_MODES = {
    low: {
        name: 'Low Quality',
        maxFacets: 150,
        maxSpots: 50,
        pixelRatio: 1,
        description: 'Optimized for lower-end devices'
    },
    medium: {
        name: 'Medium Quality', 
        maxFacets: 400,
        maxSpots: 150,
        pixelRatio: 1.5,
        description: 'Balanced performance and quality'
    },
    high: {
        name: 'High Quality',
        maxFacets: 1000,
        maxSpots: 500,
        pixelRatio: 'device', // Use device pixel ratio
        description: 'Maximum quality - may impact performance'
    }
};

// UI Control configurations
export const CONTROL_CONFIGS = [
    { id: 'rotationSpeed', property: 'rotationSpeed', display: 'rotationSpeedValue', suffix: ' RPM', decimals: 1 },
    { id: 'lightDistance', property: 'lightDistance', display: 'lightDistanceValue', suffix: ' units', decimals: 1 },
    { id: 'lightIntensity', property: 'lightIntensity', display: 'lightIntensityValue', suffix: '', decimals: 1 },
    { id: 'spotAngle', property: 'spotAngle', display: 'spotAngleValue', suffix: '°', decimals: 0 },
    { id: 'ballSize', property: 'ballSize', display: 'ballSizeValue', suffix: '', decimals: 1 },
    { id: 'mirrorFacets', property: 'mirrorFacets', display: 'mirrorFacetsValue', suffix: '', decimals: 0 },
    { id: 'maxSpots', property: 'maxSpots', display: 'maxSpotsValue', suffix: '', decimals: 0 },
    { id: 'ambientLight', property: 'ambientLight', display: 'ambientLightValue', suffix: '', decimals: 2 },
    { id: 'roomSize', property: 'roomSize', display: 'roomSizeValue', suffix: ' units', decimals: 0 },
    { id: 'wobbleIntensity', property: 'wobbleIntensity', display: 'wobbleIntensityValue', suffix: '', decimals: 3 },
    { id: 'lightAngleH', property: 'lightAngleH', display: 'lightAngleHValue', suffix: '°', decimals: 0 },
    { id: 'lightHeight', property: 'lightHeight', display: 'lightHeightValue', suffix: '', decimals: 1 },
    { id: 'penumbra', property: 'penumbra', display: 'penumbraValue', suffix: '', decimals: 2 },
    { id: 'ballPosX', property: 'ballPosX', display: 'ballPosXValue', suffix: '', decimals: 1 },
    { id: 'ballPosY', property: 'ballPosY', display: 'ballPosYValue', suffix: '', decimals: 1 },
    { id: 'ballPosZ', property: 'ballPosZ', display: 'ballPosZValue', suffix: '', decimals: 1 },
    { id: 'moveSpeed', property: 'moveSpeed', display: 'moveSpeedValue', suffix: '', decimals: 1 },
    // Second light controls
    { id: 'light2Intensity', property: 'light2Intensity', display: 'light2IntensityValue', suffix: '', decimals: 1 },
    { id: 'light2SpotAngle', property: 'light2SpotAngle', display: 'light2SpotAngleValue', suffix: '°', decimals: 0 },
    { id: 'light2AngleH', property: 'light2AngleH', display: 'light2AngleHValue', suffix: '°', decimals: 0 },
    { id: 'light2Height', property: 'light2Height', display: 'light2HeightValue', suffix: '', decimals: 1 },
    { id: 'light2Distance', property: 'light2Distance', display: 'light2DistanceValue', suffix: ' units', decimals: 1 }
];

// Mathematical constants
export const MATH_CONSTANTS = {
    DEG_TO_RAD: Math.PI / 180,
    RAD_TO_DEG: 180 / Math.PI,
    TWO_PI: Math.PI * 2,
    HALF_PI: Math.PI / 2
};

// Performance tracking constants
export const PERFORMANCE_CONSTANTS = {
    FPS_HISTORY_SIZE: 60, // Keep last 60 frames (1 second at 60fps)
    FRAME_TIME_TARGET: 16.67, // 60fps = 16.67ms per frame
    PERFORMANCE_UPDATE_INTERVAL: 100 // Update performance display every 100ms
};