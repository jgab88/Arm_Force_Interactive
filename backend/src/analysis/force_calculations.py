# backend/src/analysis/force_calculations.py
import numpy as np
from typing import Dict, Any, List, Tuple
import math

def calculate_forces(points: Dict[str, Any], cylinder_extension: float, samples: int = 10) -> Dict[str, Any]:
    """
    Calculate forces in the linkage system based on geometry
    
    Args:
        points: Dictionary of points with x,y coordinates
        cylinder_extension: Current extension of the cylinder in inches
        samples: Number of samples to generate in surface data (higher for graph generation)
        
    Returns:
        Dictionary with force analysis results
    """
    # Extract key points
    try:
        # Check for required points
        required_keys = ["pivotBase", "pivotArm", "cylinderBase", "cylinderArm"]
        for key in required_keys:
            if key not in points:
                print(f"Missing required point: {key}")
                print(f"Available points: {list(points.keys())}")
                return {"error": f"Missing required point: {key}"}
                
        pivot_base = np.array([points["pivotBase"]["x"], points["pivotBase"]["y"]])
        pivot_arm = np.array([points["pivotArm"]["x"], points["pivotArm"]["y"]])
        cylinder_base = np.array([points["cylinderBase"]["x"], points["cylinderBase"]["y"]])
        cylinder_arm = np.array([points["cylinderArm"]["x"], points["cylinderArm"]["y"]])
    except (KeyError, TypeError) as e:
        print(f"Error extracting point coordinates: {e}")
        print(f"Points data: {points}")
        return {"error": f"Invalid point data: {str(e)}"}
    
    # Calculate vectors
    arm_vector = pivot_arm - pivot_base
    cylinder_vector = cylinder_arm - cylinder_base
    
    # Calculate distances
    arm_length = np.linalg.norm(arm_vector)
    cylinder_length = np.linalg.norm(cylinder_vector)
    
    # Calculate angles
    arm_angle = math.atan2(arm_vector[1], arm_vector[0])
    cylinder_angle = math.atan2(cylinder_vector[1], cylinder_vector[0])
    
    # Calculate angle between cylinder and arm
    angle_between = abs(cylinder_angle - arm_angle)
    if angle_between > math.pi:
        angle_between = 2 * math.pi - angle_between
    
    # Assume a standard cylinder pressure (adjustable in future)
    cylinder_pressure = 100.0  # PSI
    cylinder_bore = 2.0  # inches (diameter)
    
    # Calculate cylinder area
    cylinder_area = math.pi * (cylinder_bore/2)**2
    
    # Calculate cylinder force
    cylinder_force = cylinder_pressure * cylinder_area
    
    # Calculate mechanical advantage based on angles
    # (Simplified - in a real system this would be more complex)
    mechanical_advantage = abs(math.sin(angle_between))
    
    # Output force at the arm
    output_force = cylinder_force * mechanical_advantage
    
    # Calculate force components at the arm
    arm_force_x = output_force * math.cos(arm_angle + math.pi/2)
    arm_force_y = output_force * math.sin(arm_angle + math.pi/2)
    
    # Calculate torque at pivot
    torque = output_force * arm_length
    
    # Generate 3D surface data for visualization (sampled points)
    # Use higher resolution for explicit graph generation requests
    surface_data = generate_surface_data(
        points, 
        cylinder_extension,
        cylinder_bore,
        cylinder_pressure,
        samples=samples
    )
    
    # Return comprehensive analysis
    result = {
        "cylinderForce": round(cylinder_force, 2),
        "outputForce": round(output_force, 2),
        "mechanicalAdvantage": round(mechanical_advantage, 4),
        "angleRadians": round(angle_between, 4),
        "angleDegrees": round(math.degrees(angle_between), 2),
        "torque": round(torque, 2),
        "armForceComponents": {
            "x": round(arm_force_x, 2),
            "y": round(arm_force_y, 2)
        },
        "armLength": round(arm_length, 2),
        "cylinderLength": round(cylinder_length, 2),
        "surfaceData": surface_data
    }
    
    print(f"Force calculation results: {result['cylinderForce']} lbs cylinder force, "
          f"{result['outputForce']} lbs output force, "
          f"{result['mechanicalAdvantage']} mechanical advantage")
    
    return result

def generate_surface_data(
    points: Dict[str, Any], 
    current_extension: float,
    cylinder_bore: float,
    cylinder_pressure: float,
    samples: int = 10
) -> Dict[str, Any]:
    """
    Generate 3D surface data for visualization of force vs. position relationships
    
    Args:
        points: Current geometry points
        current_extension: Current cylinder extension
        cylinder_bore: Cylinder bore diameter in inches
        cylinder_pressure: Cylinder pressure in PSI
        samples: Number of samples to generate in each dimension
        
    Returns:
        Dictionary with x, y, z arrays for 3D plotting
    """
    # Import here to avoid circular imports
    try:
        from .geometry import calculate_geometry
    except ImportError:
        # Fallback for different module structures
        try:
            from src.analysis.geometry import calculate_geometry
        except ImportError:
            # Last resort fallback - use a stub function
            def calculate_geometry(pts, ext):
                print("Warning: Using stub calculate_geometry function")
                return pts
    
    # Create a copy of points for manipulation
    base_points = {}
    for k, v in points.items():
        if isinstance(v, dict):
            base_points[k] = {sk: sv for sk, sv in v.items()}
        else:
            # If it's not a dictionary (e.g., an integer), just copy it directly
            base_points[k] = v
    
    # Set up ranges for cylinder extension and pressure
    extension_range = np.linspace(0, 10, samples)  # 0 to 10 inches
    pressure_range = np.linspace(50, 150, samples)  # 50 to 150 PSI
    
    # Initialize arrays for 3D surface
    X, Y = np.meshgrid(extension_range, pressure_range)
    Z = np.zeros((samples, samples))  # Output force
    
    # Calculate force at each point in the grid
    for i, ext in enumerate(extension_range):
        # Update geometry for this extension
        try:
            updated_points = calculate_geometry(base_points, ext)
        except Exception as e:
            print(f"Error calculating geometry for surface: {e}")
            # Use a default increasing value if calculation fails
            Z[:, i] = (ext + 1) * pressure_range / 10
            continue
        
        for j, press in enumerate(pressure_range):
            try:
                # Calculate force with this pressure and extension
                cylinder_area = math.pi * (cylinder_bore/2)**2
                cylinder_force = press * cylinder_area
                
                # Extract key points
                pivot_base = np.array([updated_points["pivotBase"]["x"], updated_points["pivotBase"]["y"]])
                pivot_arm = np.array([updated_points["pivotArm"]["x"], updated_points["pivotArm"]["y"]])
                cylinder_base = np.array([updated_points["cylinderBase"]["x"], updated_points["cylinderBase"]["y"]])
                cylinder_arm = np.array([updated_points["cylinderArm"]["x"], updated_points["cylinderArm"]["y"]])
                
                # Calculate vectors
                arm_vector = pivot_arm - pivot_base
                cylinder_vector = cylinder_arm - cylinder_base
                
                # Calculate angles
                arm_angle = math.atan2(arm_vector[1], arm_vector[0])
                cylinder_angle = math.atan2(cylinder_vector[1], cylinder_vector[0])
                
                # Calculate angle between cylinder and arm
                angle_between = abs(cylinder_angle - arm_angle)
                if angle_between > math.pi:
                    angle_between = 2 * math.pi - angle_between
                
                # Calculate mechanical advantage
                mechanical_advantage = abs(math.sin(angle_between))
                
                # Calculate output force
                Z[j, i] = cylinder_force * mechanical_advantage
            except Exception as e:
                print(f"Error calculating surface point ({i},{j}): {e}")
                # Use a reasonable default value
                Z[j, i] = cylinder_force * 0.5  # Assume 0.5 mechanical advantage
    
    # Highlight current position in the surface
    current_idx = min(range(len(extension_range)), key=lambda i: abs(extension_range[i] - current_extension))
    current_pressure_idx = min(range(len(pressure_range)), key=lambda i: abs(pressure_range[i] - cylinder_pressure))
    
    current_position = {
        "x": float(extension_range[current_idx]),
        "y": float(pressure_range[current_pressure_idx]),
        "z": float(Z[current_pressure_idx, current_idx])
    }
    
    # Return data formatted for Plotly
    return {
        "x": extension_range.tolist(),
        "y": pressure_range.tolist(),
        "z": Z.tolist(),
        "currentPosition": current_position
    }