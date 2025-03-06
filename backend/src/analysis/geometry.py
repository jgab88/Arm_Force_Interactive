# backend/src/analysis/geometry.py
import numpy as np
from typing import Dict, Any, List, Tuple
import math

def calculate_geometry(points: Dict[str, Any], cylinder_extension: float) -> Dict[str, Any]:
    """
    Calculate updated geometry based on cylinder extension
    """
    print(f"calculate_geometry called with extension: {cylinder_extension}")
    
    # Create a deep copy of the points to avoid modifying the original
    updated_points = {}
    for k, v in points.items():
        if isinstance(v, dict):
            updated_points[k] = {sk: sv for sk, sv in v.items()}
        else:
            updated_points[k] = v
    
    # Extract key points
    try:
        pivot_base = np.array([points["pivotBase"]["x"], points["pivotBase"]["y"]])
        pivot_arm = np.array([points["pivotArm"]["x"], points["pivotArm"]["y"]])
        cylinder_base = np.array([points["cylinderBase"]["x"], points["cylinderBase"]["y"]])
        cylinder_arm = np.array([points["cylinderArm"]["x"], points["cylinderArm"]["y"]])
    except (KeyError, TypeError) as e:
        print(f"Error extracting point coordinates: {e}")
        return updated_points
    
    # Calculate vector from cylinder base to arm
    cylinder_vector = cylinder_arm - cylinder_base
    original_length = np.linalg.norm(cylinder_vector)
    normalized_vector = cylinder_vector / original_length
    
    # Calculate new arm position based on extension
    # We'll use a simplified approach: extend along the cylinder's direction
    min_cylinder_length = points.get("cylinderMinLength", 10.0)
    target_length = min_cylinder_length + cylinder_extension
    
    # Calculate the scaling factor based on extension
    extension_factor = target_length / original_length
    
    # Apply the extension - modify cylinder arm position
    new_cylinder_arm = cylinder_base + normalized_vector * target_length
    
    # Update the cylinder arm position with new coordinates
    updated_points["cylinderArm"]["x"] = float(new_cylinder_arm[0])
    updated_points["cylinderArm"]["y"] = float(new_cylinder_arm[1])
    
    # Also update pivot arm position (if they share the same point)
    if np.allclose(pivot_arm, cylinder_arm, atol=1.0):
        updated_points["pivotArm"]["x"] = float(new_cylinder_arm[0])
        updated_points["pivotArm"]["y"] = float(new_cylinder_arm[1])
    
    # For debugging, print the changes
    print(f"Original cylinder arm: {points['cylinderArm']}")
    print(f"Updated cylinder arm: {updated_points['cylinderArm']}")
    
    return updated_points

def solve_arm_position(
    pivot_base: np.ndarray,
    cylinder_base: np.ndarray,
    arm_length: float,
    cylinder_length: float,
    initial_arm_pos: np.ndarray,
    initial_cylinder_arm: np.ndarray
) -> np.ndarray:
    """
    Solve for the new position of the arm pivot point given the constraints
    
    This uses circle-circle intersection to find where the arm and cylinder meet
    
    Args:
        pivot_base: Base point of the arm pivot
        cylinder_base: Base point of the cylinder
        arm_length: Length of the arm
        cylinder_length: Target length of the cylinder
        initial_arm_pos: Initial position of the arm pivot (used for choosing solution)
        initial_cylinder_arm: Initial position where cylinder connects to arm
        
    Returns:
        New position of the arm pivot
    """
    # Calculate circle-circle intersection
    d = np.linalg.norm(pivot_base - cylinder_base)
    
    # Check if solution exists
    if d > arm_length + cylinder_length:
        # Points too far apart - no solution
        return initial_arm_pos
    
    if d < abs(arm_length - cylinder_length):
        # One circle contains the other - no valid solution
        return initial_arm_pos
        
    if d == 0:
        # Circles are concentric - no unique solution
        return initial_arm_pos
    
    # Calculate helper values
    a = (arm_length**2 - cylinder_length**2 + d**2) / (2 * d)
    h = math.sqrt(arm_length**2 - a**2)
    
    # Find the point on the line from pivot_base to cylinder_base that's distance 'a' from pivot_base
    p2 = pivot_base + a * (cylinder_base - pivot_base) / d
    
    # Calculate the two possible intersection points
    intersection1 = np.array([
        p2[0] + h * (cylinder_base[1] - pivot_base[1]) / d,
        p2[1] - h * (cylinder_base[0] - pivot_base[0]) / d
    ])
    
    intersection2 = np.array([
        p2[0] - h * (cylinder_base[1] - pivot_base[1]) / d,
        p2[1] + h * (cylinder_base[0] - pivot_base[0]) / d
    ])
    
    # Choose the intersection closest to the initial arm position
    if np.linalg.norm(intersection1 - initial_arm_pos) <= np.linalg.norm(intersection2 - initial_arm_pos):
        return intersection1
    else:
        return intersection2

def calculate_angle(point1: np.ndarray, point2: np.ndarray, point3: np.ndarray) -> float:
    """
    Calculate the angle between three points (point1->point2->point3)
    
    Args:
        point1: First point
        point2: Middle point (vertex)
        point3: Third point
        
    Returns:
        Angle in radians
    """
    vector1 = point1 - point2
    vector2 = point3 - point2
    
    # Calculate angle using dot product
    dot_product = np.dot(vector1, vector2)
    magnitude1 = np.linalg.norm(vector1)
    magnitude2 = np.linalg.norm(vector2)
    
    # Avoid division by zero
    if magnitude1 == 0 or magnitude2 == 0:
        return 0
    
    # Calculate cosine of angle and handle numerical errors
    cos_angle = dot_product / (magnitude1 * magnitude2)
    cos_angle = max(-1, min(1, cos_angle))  # Clip to [-1, 1]
    
    return math.acos(cos_angle)

def calculate_point_at_angle_and_distance(
    start_point: np.ndarray,
    angle: float,
    distance: float
) -> np.ndarray:
    """
    Calculate a point that is at a specific angle and distance from the start point
    
    Args:
        start_point: Starting point coordinates
        angle: Angle in radians
        distance: Distance from start point
        
    Returns:
        New point coordinates
    """
    return np.array([
        start_point[0] + distance * math.cos(angle),
        start_point[1] + distance * math.sin(angle)
    ])

def calculate_distance(point1: Dict[str, float], point2: Dict[str, float]) -> float:
    """
    Calculate the Euclidean distance between two points
    
    Args:
        point1: First point with x, y coordinates
        point2: Second point with x, y coordinates
        
    Returns:
        Distance between points
    """
    return math.sqrt((point2["x"] - point1["x"])**2 + (point2["y"] - point1["y"])**2)