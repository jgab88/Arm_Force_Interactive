// frontend/src/utils/calculations.js

/**
 * Calculates the distance between two points
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Second point {x, y}
 * @returns {number} - Distance between points
 */
export const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };
  
  /**
   * Calculates the angle between two points in radians
   * @param {Object} p1 - First point {x, y}
   * @param {Object} p2 - Second point {x, y}
   * @returns {number} - Angle in radians
   */
  export const angle = (p1, p2) => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  };
  
  /**
   * Calculates a point at a specific distance and angle from a base point
   * @param {Object} basePoint - Base point {x, y}
   * @param {number} distance - Distance from base point
   * @param {number} angle - Angle in radians
   * @returns {Object} - New point {x, y}
   */
  export const pointFromDistanceAndAngle = (basePoint, distance, angle) => {
    return {
      x: basePoint.x + distance * Math.cos(angle),
      y: basePoint.y + distance * Math.sin(angle)
    };
  };
  
  /**
   * Calculates the intersection of two circles
   * @param {Object} center1 - Center of first circle {x, y}
   * @param {number} radius1 - Radius of first circle
   * @param {Object} center2 - Center of second circle {x, y}
   * @param {number} radius2 - Radius of second circle
   * @returns {Array|null} - Array of intersection points [{x, y}, {x, y}] or null if no intersection
   */
  export const circleIntersection = (center1, radius1, center2, radius2) => {
    const d = distance(center1, center2);
    
    // Circles are too far apart, no solution
    if (d > radius1 + radius2) return null;
    
    // One circle is contained within the other, no solution
    if (d < Math.abs(radius1 - radius2)) return null;
    
    // Coincident circles, infinite solutions, not handled
    if (d === 0 && radius1 === radius2) return null;
    
    // Calculate intersection points
    const a = (Math.pow(radius1, 2) - Math.pow(radius2, 2) + Math.pow(d, 2)) / (2 * d);
    const h = Math.sqrt(Math.pow(radius1, 2) - Math.pow(a, 2));
    
    const p2 = {
      x: center1.x + a * (center2.x - center1.x) / d,
      y: center1.y + a * (center2.y - center1.y) / d
    };
    
    // Calculate both intersection points
    return [
      {
        x: p2.x + h * (center2.y - center1.y) / d,
        y: p2.y - h * (center2.x - center1.x) / d
      },
      {
        x: p2.x - h * (center2.y - center1.y) / d,
        y: p2.y + h * (center2.x - center1.x) / d
      }
    ];
  };
  
  /**
   * Calculates new geometry based on cylinder stroke extension
   * @param {Object} baseGeometry - Base geometry configuration
   * @param {number} stroke - Cylinder extension length
   * @returns {Object} - New geometry with updated positions
   */
  export const calculateGeometryFromStroke = (baseGeometry, stroke) => {
    // Clone the base geometry to avoid mutating the original
    const newGeometry = JSON.parse(JSON.stringify(baseGeometry));
    
    // Get necessary points
    const cylinderBase = newGeometry.points.find(p => p.id === 'cylinderBase');
    const cylinderRod = newGeometry.points.find(p => p.id === 'cylinderRod');
    const pivotPoint = newGeometry.points.find(p => p.id === 'pivotPoint');
    const armEnd = newGeometry.points.find(p => p.id === 'armEnd');
    
    if (!cylinderBase || !cylinderRod || !pivotPoint || !armEnd) {
      console.error("Missing required points in geometry");
      return newGeometry;
    }
    
    // Calculate base cylinder angle and original length
    const cylinderAngle = angle(cylinderBase, cylinderRod);
    const baseLength = distance(cylinderBase, cylinderRod);
    
    // Calculate arm length (constant)
    const armLength = distance(pivotPoint, armEnd);
    
    // Calculate cross-link length (constant)
    const crossLinkLength = distance(cylinderRod, armEnd);
    
    // Set new cylinder rod position based on stroke
    const newCylinderLength = Math.max(0.1, baseLength + stroke); // Prevent zero length
    cylinderRod.x = cylinderBase.x + newCylinderLength * Math.cos(cylinderAngle);
    cylinderRod.y = cylinderBase.y + newCylinderLength * Math.sin(cylinderAngle);
    
    // Find the new position of the arm end using circle intersection
    const intersections = circleIntersection(
      pivotPoint, armLength,
      cylinderRod, crossLinkLength
    );
    
    if (intersections) {
      // Choose the intersection that's closest to the current arm end position
      // This prevents the arm from flipping to the other possible solution
      const [int1, int2] = intersections;
      const dist1 = distance(int1, armEnd);
      const dist2 = distance(int2, armEnd);
      
      if (dist1 <= dist2) {
        armEnd.x = int1.x;
        armEnd.y = int1.y;
      } else {
        armEnd.x = int2.x;
        armEnd.y = int2.y;
      }
    } else {
      // No valid intersection found, the mechanism is in an impossible state
      // We could handle this by constraining to the maximum possible extension
      console.warn("No valid intersection found for arm position");
    }
    
    return newGeometry;
  };
  
  /**
   * Calculates forces in the linkage system
   * @param {Object} geometry - Current geometry configuration
   * @param {number} cylinderPressure - Pressure in the cylinder (default: 100 PSI)
   * @param {number} cylinderDiameter - Cylinder diameter in mm (default: 50mm)
   * @returns {Object} - Force analysis results
   */
  export const calculateBasicForces = (geometry, cylinderPressure = 100, cylinderDiameter = 2) => {
    // Get necessary points
    const cylinderBase = geometry.points.find(p => p.id === 'cylinderBase');
    const cylinderRod = geometry.points.find(p => p.id === 'cylinderRod');
    const pivotPoint = geometry.points.find(p => p.id === 'pivotPoint');
    const armEnd = geometry.points.find(p => p.id === 'armEnd');
    
    if (!cylinderBase || !cylinderRod || !pivotPoint || !armEnd) {
      console.error("Missing required points in geometry");
      return null;
    }
    
    // Calculate cylinder extension
    const cylinderLength = distance(cylinderBase, cylinderRod);
    
    // Calculate arm length
    const armLength = distance(pivotPoint, armEnd);
    
    // Calculate cross-link length
    const crossLinkLength = distance(cylinderRod, armEnd);
    
    // Calculate relevant angles
    const cylinderAngle = angle(cylinderBase, cylinderRod);
    const armAngle = angle(pivotPoint, armEnd);
    const crossLinkAngle = angle(cylinderRod, armEnd);
    
    // Calculate the cylinder force (F = P * A)
    // Convert PSI to N/mm² and calculate force in Newtons
    const psiToNMm2 = 0.00689476; // Conversion factor
    const pressureNMm2 = cylinderPressure * psiToNMm2;
    const cylinderArea = Math.PI * Math.pow(cylinderDiameter / 2, 2);
    const cylinderForce = pressureNMm2 * cylinderArea;
    
    // Calculate the angle between cylinder and cross-link
    const cylinderCrossLinkAngle = crossLinkAngle - cylinderAngle;
    
    // Calculate the force in the cross-link using force decomposition
    // Force in cross-link = Cylinder force / cos(angle between them)
    const crossLinkForce = cylinderForce / Math.cos(cylinderCrossLinkAngle);
    
    // Calculate the angle between arm and cross-link
    const armCrossLinkAngle = Math.PI - (crossLinkAngle - armAngle);
    
    // Calculate the torque at the pivot
    // Torque = Cross-link force * sin(angle between arm and cross-link) * arm length
    const torque = crossLinkForce * Math.sin(armCrossLinkAngle) * armLength;
    
    // Calculate the output force at the end of the arm
    // This is a simplified calculation - in reality it depends on the specific output point
    const outputForce = torque / armLength;
    
    // Calculate mechanical advantage
    // Mechanical advantage = Output force / Input force
    const mechanicalAdvantage = outputForce / cylinderForce;
    
    // Calculate the efficiency (ideal vs. actual mechanical advantage)
    // This is a simplified calculation - would need friction factors for realism
    const idealMechanicalAdvantage = armLength / cylinderLength;
    const efficiency = (mechanicalAdvantage / idealMechanicalAdvantage) * 100;
    
    return {
      cylinderForce,              // Force produced by the cylinder (N)
      cylinderLength,             // Current cylinder length (mm)
      crossLinkForce,             // Force in the cross-link (N)
      armLength,                  // Length of the arm (mm)
      outputForce,                // Output force at arm end (N)
      torque,                     // Torque at the pivot (N*mm)
      mechanicalAdvantage,        // Mechanical advantage (ratio)
      cylinderAngle: cylinderAngle * (180/Math.PI),  // Cylinder angle (degrees)
      armAngle: armAngle * (180/Math.PI),            // Arm angle (degrees)
      crossLinkAngle: crossLinkAngle * (180/Math.PI), // Cross-link angle (degrees)
      efficiency                  // Efficiency percentage
    };
  };
  
  /**
   * Calculates constraints and validates geometry
   * @param {Object} geometry - Current geometry configuration
   * @returns {Object} - Validation results including any constraint violations
   */
  export const validateGeometry = (geometry) => {
    const cylinderBase = geometry.points.find(p => p.id === 'cylinderBase');
    const cylinderRod = geometry.points.find(p => p.id === 'cylinderRod');
    const pivotPoint = geometry.points.find(p => p.id === 'pivotPoint');
    const armEnd = geometry.points.find(p => p.id === 'armEnd');
    
    if (!cylinderBase || !cylinderRod || !pivotPoint || !armEnd) {
      return { 
        valid: false, 
        errors: ["Missing required points in geometry"] 
      };
    }
    
    const constraints = [];
    
    // Calculate lengths
    const cylinderLength = distance(cylinderBase, cylinderRod);
    const armLength = distance(pivotPoint, armEnd);
    const crossLinkLength = distance(cylinderRod, armEnd);
    
    // Check if the mechanism can actually work (triangle inequality)
    // In any triangle, the sum of the lengths of any two sides must be greater than the length of the remaining side
    const distPivotToCylinderRod = distance(pivotPoint, cylinderRod);
    
    if (armLength + crossLinkLength <= distPivotToCylinderRod) {
      constraints.push("Arm and cross-link are too short to connect");
    }
    
    if (distPivotToCylinderRod + armLength <= crossLinkLength) {
      constraints.push("Cross-link is too long for the mechanism");
    }
    
    if (distPivotToCylinderRod + crossLinkLength <= armLength) {
      constraints.push("Arm is too long for the mechanism");
    }
    
    // Check if the cylinder length is reasonable (not too short/long)
    if (cylinderLength < 10) {
      constraints.push("Cylinder length is too short");
    }
    
    if (cylinderLength > 1000) {
      constraints.push("Cylinder length is too long");
    }
    
    return {
      valid: constraints.length === 0,
      constraints: constraints
    };
  };
  
  /**
   * Calculates the full range of motion for the mechanism
   * @param {Object} geometry - Base geometry configuration
   * @param {number} steps - Number of steps to calculate
   * @returns {Array} - Array of geometry states through the motion range
   */
  export const calculateMotionRange = (geometry, steps = 20) => {
    // Clone the base geometry
    const baseGeometry = JSON.parse(JSON.stringify(geometry));
    
    // Calculate the current cylinder length
    const cylinderBase = baseGeometry.points.find(p => p.id === 'cylinderBase');
    const cylinderRod = baseGeometry.points.find(p => p.id === 'cylinderRod');
    const baseLength = distance(cylinderBase, cylinderRod);
    
    // Calculate minimum and maximum stroke values
    // For this implementation, we'll use -50% to +50% of the current length
    const minStroke = -baseLength * 0.5;
    const maxStroke = baseLength * 0.5;
    
    // Generate geometries at different stroke positions
    const motionStates = [];
    
    for (let i = 0; i <= steps; i++) {
      const strokePercent = i / steps;
      const stroke = minStroke + (maxStroke - minStroke) * strokePercent;
      
      try {
        const newGeometry = calculateGeometryFromStroke(baseGeometry, stroke);
        const forces = calculateBasicForces(newGeometry);
        
        motionStates.push({
          strokePercentage: strokePercent * 100,
          stroke,
          geometry: newGeometry,
          forces
        });
      } catch (error) {
        console.warn(`Failed to calculate geometry at stroke ${stroke}:`, error);
      }
    }
    
    return motionStates;
  };