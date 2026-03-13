# DeliverEase — Route Optimizer

## O que é esse projeto

Sistema de otimização de rotas de entrega. O usuário informa um endereço de origem (ex: galpão logístico) e uma lista de paradas (endereços ou CEPs brasileiros), e o sistema calcula automaticamente a ordem mais eficiente de visitas usando o algoritmo do Vizinho Mais Próximo (Nearest Neighbor).

O frontend exibe a rota em um mapa interativo (OpenStreetMap via Leaflet) com pins numerados e polyline conectando os pontos, um painel de resultados com todas as paradas, e um terminal de logs em tempo real que mostra o progresso do pipeline via WebSocket.

---

## Stack

| Camada      | Tecnologia                                          |
|-------------|-----------------------------------------------------|
| Backend     | Python + FastAPI + Uvicorn                          |
| Geocoding   | Geopy (Nominatim / OpenStreetMap) — `country_codes='br'`, `language='pt'`, `timeout=10` |
| Frontend    | React 19 + TypeScript + Vite + Tailwind CSS 4       |
| Mapa        | react-leaflet + leaflet (OpenStreetMap tiles)        |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities |
| Importação  | xlsx (SheetJS) — leitura de .xlsx/.xls              |
| HTTP        | Axios                                               |
| Ícones      | Lucide React                                        |
| CSS utils   | clsx + tailwind-merge                               |

---

## Estrutura do projeto

```
/home/joao/gps/
├── main.py                          # Entrada CLI (teste local sem API)
├── test_api.py                      # Script rápido para testar a API
├── CLAUDE.md                        # Este arquivo
├── src/
│   ├── api/
│   │   └── app.py                   # FastAPI: endpoint REST + WebSocket de logs
│   ├── core/
│   │   ├── pipeline.py              # Orquestrador do pipeline (5 etapas)
│   │   └── logger.py                # Logger estilo N8N com cores ANSI no terminal
│   └── services/
│       ├── geocoding.py             # Converte endereços/CEPs em coords via Nominatim
│       ├── distance.py              # Matriz de distâncias geodésicas (WGS-84)
│       └── optimizer.py             # Algoritmo Nearest Neighbor
└── frontend/
    └── src/
        ├── App.tsx                  # Layout principal: form+logs | mapa+resultados
        ├── services/api.ts          # Cliente Axios para POST /api/optimize
        ├── types/index.ts           # Tipos TypeScript globais
        ├── hooks/
        │   └── useRouteOptimizer.ts # Estado global + WebSocket + API + localStorage
        ├── utils/
        │   └── parseImportFile.ts   # Parser de arquivos .xlsx / .json / .txt
        └── features/route-planner/
            ├── AddressForm.tsx      # Formulário de origem e paradas + importação de arquivo
            ├── LiveLogs.tsx         # Terminal fake com logs em tempo real via WebSocket
            ├── RouteMap.tsx         # Mapa Leaflet com pins numerados e polyline da rota
            └── RouteResults.tsx     # Painel de resultados: abas Paradas/Logs, PDF, Maps/Waze
```

---

## Como rodar

```bash
# Backend (rodar do diretório /home/joao/gps)
uvicorn src.api.app:app --reload --port 8000

# Frontend
cd /home/joao/gps/frontend && npm run dev
```

Frontend: `http://localhost:5173` | Backend: `http://localhost:8000`

**Dependências npm** (se precisar reinstalar):
```bash
cd /home/joao/gps/frontend && npm install --legacy-peer-deps
```
O flag `--legacy-peer-deps` é necessário porque `@tailwindcss/vite` tem conflito de peer com Vite 8.

---

## Fluxo de dados

```
Usuário digita origem + paradas
        ↓
[Opcional] Importar arquivo .xlsx / .json / .txt → preenche paradas automaticamente
        ↓
POST /api/optimize  { origin: string, stops: string[] }
        ↓
WebSocketLogger transmite logs em tempo real → LiveLogs no frontend
        ↓
RouteOptimizationPipeline.optimize_route()  ← roda em loop.run_in_executor()
  Etapa 1: Validação de entradas
  Etapa 2: Geocoding (Nominatim, 1.1s/req, timeout=10s, restrito ao Brasil)
  Etapa 3: Matriz de distâncias geodésicas
  Etapa 4: Nearest Neighbor → sequência ótima + distância total
  Etapa 5: Formatação do resultado JSON
        ↓
Resposta: { route: RouteLocation[], failed: string[] }
  - route: endereços geocodificados na ordem otimizada
  - failed: lista de endereços que não foram encontrados
        ↓
Frontend exibe:
  - Mapa com pins numerados + polyline azul tracejada
  - Painel lateral: lista de paradas (reordenável por drag-and-drop) + abas de logs
  - Banner amarelo com endereços falhos + campo de correção + botão "Recalcular"
```

---

## Endpoints da API

| Método    | Rota          | Descrição                                       |
|-----------|---------------|-------------------------------------------------|
| POST      | /api/optimize | Recebe origem + paradas, retorna rota otimizada  |
| WebSocket | /ws/logs      | Stream de logs em tempo real durante execução    |

### Exemplo de request
```json
POST /api/optimize
{
  "origin": "Avenida Dom Aguirre 3000 Sorocaba",
  "stops": ["Rua da Penha 600 Sorocaba", "18035-200", "18040-630"]
}
```

### Exemplo de response (sucesso parcial)
```json
{
  "route": [
    { "type": "origin", "sequence": 0, "address": "Avenida Dom Aguirre 3000 Sorocaba", "lat": -23.48, "lng": -47.43 },
    { "type": "stop",   "sequence": 1, "address": "18035-200", "lat": -23.49, "lng": -47.44 },
    { "type": "stop",   "sequence": 2, "address": "Rua da Penha 600 Sorocaba", "lat": -23.50, "lng": -47.45 }
  ],
  "failed": ["18040-630"]
}
```

---

## Funcionalidades do frontend

### Tela de formulário (sem resultado)
- **Ponto de saída**: input livre (endereço ou CEP)
- **Paradas**: adicionar uma a uma ou importar arquivo
- **Importar arquivo**: botão "Importar Arquivo" aceita `.xlsx`, `.json`, `.txt`
  - `.xlsx`: lê primeira coluna da primeira aba (usa SheetJS)
  - `.json`: aceita `string[]` ou `{ address/endereco: string }[]`
  - `.txt`: uma linha por endereço, remove prefixo "1. " ou "1) "
- **Persistência**: `origin` e `stops` são salvos em `localStorage` (chave `deliverease_draft`) e restaurados no próximo acesso
- **Carregar Exemplo**: 20 endereços reais de Sorocaba/SP
- **Logs ao vivo**: painel lateral com terminal fake mostrando progresso em tempo real

### Tela de resultado (após otimização)
- **Mapa interativo** (60% da tela): pins SVG numerados, polyline tracejada azul, popup por parada
  - Pin preto = origem, pins azuis = paradas, pin verde = última parada
  - `map.fitBounds()` centraliza automaticamente em todos os pontos
- **Painel lateral** (40% da tela):
  - **Aba "Paradas"**: lista de paradas reordenável por drag-and-drop (handle `GripVertical`)
    - Origem não pode ser movida ou removida
    - Cada parada tem botões "Maps" e "Waze" para navegação individual
    - Botão 🗑 remove a parada sem sair da tela
  - **Aba "Logs"**: terminal fake com histórico completo do pipeline
  - **Botões de ação**:
    - "Abrir Rota no Google Maps" — URL multi-parada com `waypoints`
    - "Gerar PDF / Imprimir" — abre HTML dedicado em nova aba com tabela, links Maps/Waze por parada, e auto-print
  - **Banner de endereços não encontrados** (se houver): lista endereços que falharam com input de correção + botão "Recalcular com correções"

### Links de navegação
- **Google Maps (individual)**: `https://www.google.com/maps/search/?api=1&query={lat},{lng}`
- **Waze (individual)**: `https://waze.com/ul?ll={lat},{lng}&navigate=yes`
- **Google Maps (rota completa)**: `https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...`
- Waze **não suporta** rotas multi-parada via URL — por isso o botão de rota completa é apenas Maps

---

## Detalhes técnicos importantes

### Geocoding
- `GeocodingService` em `src/services/geocoding.py`
- CEPs detectados por regex (8 dígitos numéricos) → formatados como `"XXXXX-XXX, Brazil"`
- Nominatim: `country_codes='br'`, `language='pt'`, `timeout=10` (evita ReadTimeoutError)
- Delay de 1.1s entre requisições — política de uso do Nominatim (máx 1 req/s)
- Até 3 tentativas por endereço; em caso de falha, endereço vai para a lista `failed`
- `process_locations()` retorna tupla `(results, failed)` — pipeline prossegue mesmo com falhas parciais

### WebSocket de logs
- `WebSocketLogger` (em `app.py`) extende `N8NLogger` adicionando broadcast via WebSocket
- Como a pipeline roda em worker thread (`loop.run_in_executor()`), usa `asyncio.run_coroutine_threadsafe()` para enviar mensagens de forma thread-safe
- Loop de eventos capturado com `asyncio.get_event_loop()` no contexto async do endpoint antes de entrar na thread

### Python 3.8
- O projeto usa Python 3.8 — sem `asyncio.to_thread` (adicionado no 3.9)
- Substituído por `loop.run_in_executor(None, fn, arg1, arg2)`

### localStorage
- Chave: `deliverease_draft`
- Persiste: `{ origin: string, stops: string[] }`
- Não persiste: `result`, `logs`, `error` (são sempre efêmeros)
- Restaurado automaticamente no `useState` inicial via `loadDraft()`

---

## Histórico de bugs corrigidos

| Bug | Causa | Correção |
|-----|-------|----------|
| Erro 500 na primeira chamada | `asyncio.to_thread` não existe no Python 3.8 | Substituído por `loop.run_in_executor()` |
| Logs ao vivo nunca apareciam | `asyncio.get_running_loop()` falha em worker threads | `asyncio.run_coroutine_threadsafe()` com loop capturado no contexto async |
| Geocoding retornando coords dos EUA | Nominatim sem restrição geográfica | Adicionado `country_codes='br'`, `language='pt'` |
| ReadTimeoutError no geocoding | Timeout padrão do Nominatim = 1 segundo | `Nominatim(timeout=10)` |
| Resultado empurrado para fora da viewport | Layout em grid empilhava form + resultado | Redesign: tela de resultado é split horizontal map (60%) + painel (40%), form oculto |
