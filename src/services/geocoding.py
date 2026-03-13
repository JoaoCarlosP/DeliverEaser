import re
import json
import time
import urllib.request
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError


class GeocodingService:
    def __init__(self, user_agent="route_optimizer_app", logger=None):
        self.geolocator = Nominatim(user_agent=user_agent, timeout=10)
        self.logger = logger

    def is_cep(self, address_string):
        clean_str = re.sub(r'\D', '', address_string)
        return len(clean_str) == 8

    def format_for_search(self, address_string):
        if self.is_cep(address_string):
            clean_str = re.sub(r'\D', '', address_string)
            formatted_cep = f"{clean_str[:5]}-{clean_str[5:]}"
            return f"{formatted_cep}, Brazil"
        return address_string

    def _normalize_address(self, address: str) -> str:
        """Normaliza formato brasileiro de endereço para o Nominatim.

        Exemplos:
          "Rua X, 175 - Sorocaba - Bairro Parque São Bento"
            → "Rua X, 175, Sorocaba, Parque São Bento"
          "Av. Y, 300 - Vila Nova, Apto 42 - Campinas"
            → "Av. Y, 300, Vila Nova, Campinas"
        """
        addr = address.strip()
        # Substituir " - " (separador comum em endereços BR) por vírgula
        addr = re.sub(r'\s+[-–—]\s+', ', ', addr)
        # Remover prefixo "Bairro " / "B. " antes do nome do bairro
        addr = re.sub(r'\b[Bb]airro\s+', '', addr)
        # Remover complementos (Apto, Bloco, Casa, Sala, Andar...)
        addr = re.sub(
            r',?\s*(?:[Aa]pto?\.?|[Aa]partamento|[Bb]l(?:oco)?\.?|[Cc]asa|[Ss]ala|[Aa]ndar)\s*[\w.-]+',
            '', addr
        )
        # Limpar vírgulas duplicadas e espaços múltiplos
        addr = re.sub(r',\s*,', ',', addr)
        addr = re.sub(r'\s{2,}', ' ', addr).strip().strip(',').strip()
        return addr

    def _build_query_variants(self, address: str) -> list:
        """Retorna variantes da query em ordem decrescente de especificidade.

        Tentativa 1: endereço normalizado completo
        Tentativa 2: sem o último campo (geralmente bairro)
        Tentativa 3: só rua + cidade (sem número e sem bairro)
        """
        normalized = self._normalize_address(address)
        parts = [p.strip() for p in normalized.split(',') if p.strip()]

        variants = [normalized]

        if len(parts) >= 3:
            # Sem o último campo (bairro)
            variants.append(', '.join(parts[:-1]))

        if len(parts) >= 4:
            # Rua + cidade (pula número e bairro)
            variants.append(f"{parts[0]}, {parts[-2]}")

        # Deduplicar mantendo ordem
        seen = []
        for v in variants:
            if v and v not in seen:
                seen.append(v)
        return seen

    def _expand_cep_via_viacep(self, cep_digits: str):
        """Consulta ViaCEP para obter endereço completo a partir de um CEP.

        Retorna string formatada para o Nominatim, ou None em caso de falha.
        """
        try:
            url = f"https://viacep.com.br/ws/{cep_digits}/json/"
            req = urllib.request.Request(url, headers={'User-Agent': 'route_optimizer_app'})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
            if data.get('erro'):
                return None
            parts = []
            if data.get('logradouro'):
                parts.append(data['logradouro'])
            if data.get('localidade'):
                parts.append(data['localidade'])
            if data.get('uf'):
                parts.append(data['uf'])
            parts.append('Brazil')
            return ', '.join(parts) if len(parts) > 1 else None
        except Exception:
            return None

    def get_coordinates(self, address, viewbox=None):
        if self.logger:
            self.logger.log_info(f"Localizando: {address}")

        # Montar lista de queries a tentar (mais específica primeiro)
        if self.is_cep(address):
            cep_digits = re.sub(r'\D', '', address)
            expanded = self._expand_cep_via_viacep(cep_digits)
            queries = [q for q in [expanded, self.format_for_search(address)] if q]
        else:
            queries = self._build_query_variants(address)

        geocode_kwargs = {'country_codes': 'br', 'language': 'pt'}
        if viewbox:
            geocode_kwargs.update({'viewbox': viewbox, 'bounded': False})

        for query in queries:
            try:
                time.sleep(1.1)
                location = self.geolocator.geocode(query, **geocode_kwargs)
                if location:
                    return (location.latitude, location.longitude)
            except (GeocoderTimedOut, GeocoderServiceError):
                time.sleep(2)
            except Exception:
                break

        msg = f"Endereço não encontrado: {address}"
        if self.logger:
            self.logger.log_warning(msg)
        else:
            print(msg)
        return None

    def process_locations(self, location_list):
        results = []
        failed = []
        viewbox = None

        for i, loc in enumerate(location_list):
            coords = self.get_coordinates(loc, viewbox=viewbox)
            if coords:
                results.append({
                    "original_input": loc,
                    "latitude": coords[0],
                    "longitude": coords[1]
                })
                # Após geocodificar a origem, definir viewbox para as paradas
                if i == 0:
                    lat, lng = coords
                    # ±0.5 graus ≈ 50 km de raio
                    viewbox = (lng - 0.5, lat - 0.5, lng + 0.5, lat + 0.5)
            else:
                failed.append(loc)

        return results, failed


if __name__ == '__main__':
    geocoder = GeocodingService()
    test_addresses = ["Rua A 123 Campinas", "13010-141", "Avenida Paulista 1578 Sao Paulo"]
    print("Testing Geocoding...")
    for addr in test_addresses:
        coords = geocoder.get_coordinates(addr)
        print(f"{addr} -> {coords}")
