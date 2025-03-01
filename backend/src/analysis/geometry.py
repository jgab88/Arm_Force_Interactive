# backend/src/analysis/geometry.py
import numpy as np
from typing import Dict, Any, List, Tuple
import math

def calculate_geometry(points: Dict[str, Any], cylinder_extension: float) -> Dict[str, Any]:
    """
    Calculate updated geometry based on cylinder extension
    
    Args:
        points: Dictionary of points with x,y coordinates
        cylinder_extension: Target extension of the cylinder in inches
        
    Returns:
        Updated dictionary of points with new positions
    """
    # Create a deep copy of the points to avoid modifying the original
    updated_points = {}
    
    # Handle different types of values in the points dictionary
    for k, v in points.items():
        if isinstance(v, dict):
            updated_points[k] = {sk: sv for sk, sv in v.items()}
        else:
            # If it's not a dictionary (e.g., an integer), just copy it directly
            updated_points[k] = v
    
    # Extract key points
    try:
        pivot_base = np.array([points["pivotBase"]["x"], points["pivotBase"]["y"]])
        pivot_arm = np.array([points["pivotArm"]["x"], points["pivotArm"]["y"]])
        cylinder_base = np.array([points["cylinderBase"]["x"], points["cylinderBase"]["y"]])
        cylinder_arm = np.array([points["cylinderArm"]["x"], points["cylinderArm"]["y"]])
    except (KeyError, TypeError) as e:
        print(f"Error extracting point coordinates: {e}")
        print(f"Points data: {points}")
        return updated_points
    
    # Extract cylinderMinLength if available, or use default
    min_cylinder_length = points.get("cylinderMinLength", 10.0)  # Default min length if not provided
    
    # Calculate initial distances and vectors
    initial_arm_length = np.linalg.norm(pivot_arm - pivot_base)
    initial_cylinder_length = np.linalg.norm(cylinder_arm - cylinder_base)
    
    # Calculate target cylinder length
    target_cylinder_length = min_cylinder_length + cylinder_extension
    
    # Find the new position of the arm based on the cylinder extension
    new_arm_position = solve_arm_position(
        pivot_base, 
        cylinder_base, 
        initial_arm_length, 
        target_cylinder_length,
        pivot_arm,
        cylinder_arm
    )
    
    # Update arm pivot position
    updated_points["pivotArm"]["x"] = float(new_arm_position[0])
    updated_points["pivotArm"]["y"] = float(new_arm_position[1])
    
    # Calculate cylinder arm position based on the new arm position
    # This assumes the arm and cylinder are directly connected at cylinderArm point
    updated_points["cylinderArm"]["x"] = float(new_arm_position[0])
    updated_points["cylinderArm"]["y"] = float(new_arm_position[1])
    
    # If cross-link exists, update its position too
    if "crossLinkBase" in points and "crossLinkArm" in points:
        cross_link_base = np.array([points["crossLinkBase"]["x"], points["crossLinkBase"]["y"]])
        cross_link_arm = np.array([points["crossLinkArm"]["x"], points["crossLinkArm"]["y"]])
        
        # Calculate initial cross-link information
        initial_cross_length = np.linalg.norm(cross_link_arm - cross_link_base)
        
        # Calculate angle relative to pivot arm
        pivot_to_cross_angle = calculate_angle(pivot_base, pivot_arm, cross_link_arm)
        
        # Calculate new cross-link arm position
        new_cross_position = calculate_point_at_angle_and_distance(
            new_arm_position,
            pivot_to_cross_angle,
            initial_cross_length
        )
        
        # Update cross-link position
        updated_points["crossLinkArm"]["x"] = float(new_cross_position[0])
        updated_points["crossLinkArm"]["y"] = float(new_cross_position[1])
    
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