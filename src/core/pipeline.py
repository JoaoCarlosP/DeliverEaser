import json
from src.services.geocoding import GeocodingService
from src.services.distance import DistanceService
from src.services.optimizer import OptimizationService
from src.core.logger import N8NLogger

class RouteOptimizationPipeline:
    def __init__(self):
        self.logger = N8NLogger()
        self.geocoder = GeocodingService(logger=self.logger)
        self.distance_svc = DistanceService()
        self.optimizer = OptimizationService(start_index=0)

    def optimize_route(self, origin, stops):
        self.logger.start_workflow("Otimização de Rota de Entregas")

        # Etapa 1: Receber entradas
        self.logger.node_start("Validando endereços recebidos", icon="📥")
        input_addresses = [origin] + stops
        self.logger.log_info(f"Recebidos: 1 ponto de saída e {len(stops)} paradas.")
        self.logger.node_success()

        # Etapa 2: Geocoding
        self.logger.node_start("Buscando coordenadas dos endereços", icon="🗺️ ")
        locations, failed_addresses = self.geocoder.process_locations(input_addresses)

        if failed_addresses:
            self.logger.log_warning(
                f"{len(failed_addresses)} endereço(s) não encontrado(s): {', '.join(failed_addresses)}"
            )

        if len(locations) < 2:
            self.logger.log_error("Endereços insuficientes para calcular a rota.")
            return json.dumps({"route": [], "failed": failed_addresses})

        self.logger.log_info(f"{len(locations)} endereços localizados com sucesso.")
        self.logger.node_success()

        # Etapa 3: Matriz de distâncias
        self.logger.node_start("Calculando distâncias entre os pontos", icon="📏")
        distance_matrix = self.distance_svc.build_distance_matrix(locations)
        self.logger.log_info(f"Mapa de distâncias criado: {len(locations)} pontos.")
        self.logger.node_success()

        # Etapa 4: Otimização
        self.logger.node_start("Calculando a rota mais eficiente", icon="🧠")
        route_indices, total_dist = self.optimizer.optimize_route(distance_matrix)
        self.logger.log_data("Distância total estimada", f"{total_dist:.2f} km")
        self.logger.node_success()

        # Etapa 5: Formatar resultado
        self.logger.node_start("Preparando resultado final", icon="📝")
        result_payload = []
        for stop_num, idx in enumerate(route_indices):
            is_origin = (idx == 0)
            result_payload.append({
                "type": "origin" if is_origin else "stop",
                "sequence": stop_num,
                "address": locations[idx]['original_input'],
                "lat": locations[idx]['latitude'],
                "lng": locations[idx]['longitude'],
            })

        json_result = json.dumps(
            {"route": result_payload, "failed": failed_addresses},
            indent=2,
            ensure_ascii=False
        )
        self.logger.node_success("Resultado preparado com sucesso")
        self.logger.end_workflow()

        return json_result

if __name__ == "__main__":
    pipeline = RouteOptimizationPipeline()
    test_origin = "Avenida Paulista 1578 Sao Paulo"
    test_stops = ["13010-141", "Praça Ramos de Azevedo, Sao Paulo"]
    result = pipeline.optimize_route(test_origin, test_stops)
    print("\nOptimization Result:")
    print(result)
