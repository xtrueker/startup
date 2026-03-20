"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEscapeRoutes = calculateEscapeRoutes;
const turf = __importStar(require("@turf/turf"));
const Camera_1 = __importDefault(require("../../../infrastructure/database/models/Camera"));
/**
 * Routing service using public OSRM driving API.
 * This gives an approximation of how someone might escape along the road network,
 * avoiding areas with high camera coverage.
 */
const directionToAngle = {
    norte: 0,
    noreste: 45,
    este: 90,
    sureste: 135,
    sur: 180,
    suroeste: 225,
    oeste: 270,
    noroeste: 315,
};
function getDestinationPoints(startLat, startLng, direction) {
    const dir = direction.toLowerCase().trim();
    let baseAngle = directionToAngle[dir];
    if (baseAngle === undefined) {
        baseAngle = 0;
    }
    // Approx 1.6km
    const distanceDeg = 0.015;
    // Generate a spread of 5 possible destinations to give the algorithm more choice
    const angles = [baseAngle - 45, baseAngle - 20, baseAngle, baseAngle + 20, baseAngle + 45];
    return angles.map((ang) => {
        const rad = (ang * Math.PI) / 180;
        const deltaLat = Math.cos(rad) * distanceDeg;
        const deltaLng = Math.sin(rad) * distanceDeg;
        return {
            lat: startLat + deltaLat,
            lng: startLng + deltaLng,
        };
    });
}
async function fetchRoute(startLat, startLng, endLat, endLng) {
    const url = `http://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full`;
    try {
        const response = await fetch(url);
        if (!response.ok)
            return null;
        const data = await response.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0)
            return null;
        return {
            geometry: data.routes[0].geometry,
            distance: data.routes[0].distance,
            duration: data.routes[0].duration,
        };
    }
    catch (error) {
        console.error('Error fetching OSRM route:', error);
        return null;
    }
}
/**
 * Calculates probable escape routes based on starting point, direction, and camera avoidance.
 */
async function calculateEscapeRoutes(startLat, startLng, direction) {
    // 1. Get destination points
    const destinations = getDestinationPoints(startLat, startLng, direction);
    // 2. Fetch OSRM routes
    const routePromises = destinations.map(dest => fetchRoute(startLat, startLng, dest.lat, dest.lng));
    const rawRoutes = await Promise.all(routePromises);
    const validRoutes = rawRoutes.filter((r) => r !== null);
    // 3. Fetch active cameras to see which routes they intersect
    const activeCameras = await Camera_1.default.find({ status: 'online' });
    // 4. Score routes based on camera exposure
    // A suspect wants to minimize the number of cameras they pass
    const scoredRoutes = validRoutes.map((routeData, index) => {
        let camerasIntersected = 0;
        const nearbyCameras = [];
        // Create a turf lines string from the route
        // Note: GeoJSON coordinates are [longitude, latitude]
        if (routeData.geometry.type === 'LineString' && routeData.geometry.coordinates.length > 1) {
            const line = turf.lineString(routeData.geometry.coordinates);
            activeCameras.forEach(camera => {
                // Camera location is [lng, lat]
                const pt = turf.point(camera.location.coordinates);
                // Calculate shortest distance from camera to the route (in kilometers)
                const distance = turf.pointToLineDistance(pt, line, { units: 'kilometers' });
                // If the route passes within ~100 meters (0.1 km) of the camera, consider it exposed
                const coverageKm = (camera.coverageRadius || 100) / 1000;
                if (distance <= coverageKm) {
                    camerasIntersected++;
                    nearbyCameras.push(camera._id.toString());
                }
            });
        }
        // Base score is dependent on camera intersections (less is better)
        // We also penalize slightly for being an extreme angle (index 0 and 4 are +/- 45 deg)
        let penalty = camerasIntersected * 50;
        if (index === 0 || index === 4)
            penalty += 10;
        // Reverse score: lower penalty = higher probability
        return {
            geometry: routeData.geometry,
            score: penalty,
            nearbyCameras,
            metadata: { distance: routeData.distance, duration: routeData.duration }
        };
    });
    // 5. Sort routes: Lowest penalty first
    scoredRoutes.sort((a, b) => a.score - b.score);
    // Take the top 3 safest routes and assign priority levels
    const topRoutes = scoredRoutes.slice(0, 3).map((route, i) => ({
        ...route,
        priority: i === 0 ? 'high' : (i === 1 ? 'medium' : 'low')
    }));
    return topRoutes;
}
//# sourceMappingURL=escapeRouting.js.map