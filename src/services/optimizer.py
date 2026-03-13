class OptimizationService:
    def __init__(self, start_index=0):
        """
        Initializes the optimization service.
        :param start_index: Which index in the locations list is considered the start point.
                            Defaults to 0 (the first input address).
        """
        self.start_index = start_index

    def optimize_route(self, distance_matrix):
        """
        Calculates the nearest neighbor path through a distance matrix.
        
        :param distance_matrix: 2D array of distances between points
        :return: A tuple (optimized_index_order, total_distance)
                 optimized_index_order: A list of indices representing the order of stops
                 total_distance: Total distance in kilometers
        """
        if not distance_matrix:
             return [], 0.0
        
        num_points = len(distance_matrix)
        
        # In this simple implementation, if only 1 or 2 points, just return them in order
        if num_points <= 2:
            return list(range(num_points)), sum(distance_matrix[i][i+1] for i in range(num_points-1)) if num_points == 2 else 0.0
            
        unvisited = set(range(num_points))
        current_node = self.start_index
        
        # Verify valid start
        if current_node not in unvisited:
            # Fallback to 0 if invalid start_node
            current_node = 0
            
        route = [current_node]
        unvisited.remove(current_node)
        total_dist = 0.0
        
        # Loop until all nodes are visited
        while unvisited:
            nearest_neighbor = None
            min_dist = float('inf')
            
            # Find the closest unvisited neighbor
            for neighbor in unvisited:
                dist = distance_matrix[current_node][neighbor]
                if dist < min_dist:
                    min_dist = dist
                    nearest_neighbor = neighbor
                    
            # Move to that neighbor
            route.append(nearest_neighbor)
            unvisited.remove(nearest_neighbor)
            total_dist += min_dist
            current_node = nearest_neighbor
            
        # Optional: Add route back to origin if this is a closed loop (TSP)
        # We will not do that here as the prompt just asked for an "order of stops"
        # Not explicitly a closed loop.
            
        return route, total_dist

if __name__ == '__main__':
    # Simple test with a dummy 3x3 matrix
    # A->B = 10, A->C = 20
    # B->A = 10, B->C = 5
    # C->A = 20, C->B = 5
    d_matrix = [
        [0.0, 10.0, 20.0],  # From 0
        [10.0, 0.0, 5.0],   # From 1
        [20.0, 5.0, 0.0]    # From 2
    ]
    
    optimizer = OptimizationService(start_index=0)
    route, dist = optimizer.optimize_route(d_matrix)
    print(f"Optimal route from node 0: {route} (Distance: {dist})")
