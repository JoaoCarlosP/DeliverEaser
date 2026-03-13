from src.core.pipeline import RouteOptimizationPipeline
import json

def main():
    print("Iniciando Otimizador de Rotas de Entrega - MVP\n")
    
    # Endereço de Origem (Ex: Galpão Logístico)
    origin = "Avenida Dom Aguirre 3000 Sorocaba"
    
    # Exemplo com endereços de Sorocaba, incluindo CEPs
    stops = [
        "Avenida Doutor Afonso Vergueiro 1700 Sorocaba", # Shopping Pátio Cianê
        "Rua da Penha 600 Sorocaba", # Centro
        "Avenida Itavuvu 100 Sorocaba", # Zona Norte
        "18035-060", # CEP Barão de Tatuí
        "Avenida Engenheiro Carlos Reinaldo Mendes 3200 Sorocaba", # ZL (Prefeitura)
        "18010-002" # CEP XV de Novembro Centro
    ]
    
    print("Origem:")
    print(f"  {origin}\n")
    print("Paradas:")
    print(json.dumps(stops, indent=2, ensure_ascii=False))
    
    # Inicializa o pipeline
    pipeline = RouteOptimizationPipeline()
    
    # Executa a otimização
    resultado_json = pipeline.optimize_route(origin, stops)
    
    # Mostra o resultado final
    print("\n" + "=" * 60)
    print("📦 RESULTADO FINAL OTIMIZADO (JSON)")
    print("=" * 60)
    print(resultado_json)

if __name__ == "__main__":
    main()
