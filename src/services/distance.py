import geopy.distance

class DistanceService:
    @staticmethod
    def calculate_distance(coord1, coord2):
        """
        Calculates the distance in kilometers between two coordinate pairs using the 
        geodesic distance provided by geopy. distance.distance uses the WGS-84 ellipsoid by default.
        
        :param coord1: Tuple of (latitude, longitude)
        :param coord2: Tuple of (latitude, longitude)
        :return: Distance in kilometers
        """
        # Ensure that inputs are valid format
        if not coord1 or not coord2:
             raise ValueError("Both coordinates must be provided.")
        
        # distance.distance expects (lat, lon) which matches our geocoding output
        dist = geopy.distance.distance(coord1, coord2).kilometers
        return dist

    def build_distance_matrix(self, locations):
        """
        Builds a 2D distance matrix between all pairs of locations.
        
        :param locations: List of dictionaries containing "latitude" and "longitude"
        :return: A 2D list matrix structure 
                 where matrix[i][j] is the distance from location[i] to location[j]
        """
        num_locations = len(locations)
        # Initialize an empty matrix filled with 0s
        matrix = [[0.0 for _ in range(num_locations)] for _ in range(num_locations)]
        
        for i in range(num_locations):
            for j in range(num_locations):
                # Diagonal is always 0
                if i == j:
                    matrix[i][j] = 0.0
                else:
                    coord_i = (locations[i]["latitude"], locations[i]["longitude"])
                    coord_j = (locations[j]["latitude"], locations[j]["longitude"])
                    
                    # By definition, geodesic distance from A to B is same as B to A
                    dist = self.calculate_distance(coord_i, coord_j)
                    matrix[i][j] = dist
                    
        return matrix

if __name__ == '__main__':
    # Simple test
    tester = DistanceService()
    # Campinas roughly: -22.9099, -47.0626
    # Sao Paulo roughly: -23.5505, -46.6333
    campinas = (-22.9099, -47.0626)
    sp = (-23.5505, -46.6333)
    
    dict_test = [
        {"original_input": "Campinas", "latitude": -22.9099, "longitude": -47.0626},
        {"original_input": "SP", "latitude": -23.5505, "longitude": -46.6333}
    ]
    
    print(f"Distancia entre Campinas e SP: {tester.calculate_distance(campinas, sp):.2f} km")
    print("Matriz:\n", tester.build_distance_matrix(dict_test))
