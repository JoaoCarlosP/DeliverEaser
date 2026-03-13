import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# Import our existing pipeline and N8NLogger
from src.core.pipeline import RouteOptimizationPipeline
from src.core.logger import N8NLogger

app = FastAPI(title="Route Optimizer API")

# Allow CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global set of active websocket connections for logs
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

class WebSocketLogger(N8NLogger):
    """
    Extends our N8NLogger to broadcast messages via WebSocket in addition to printing to terminal.
    """
    def __init__(self, loop=None):
        super().__init__()
        self._loop = loop

    def _broadcast_ws(self, event_type, data):
        if not self._loop:
            return
        payload = json.dumps({"type": event_type, "data": data})
        # run_coroutine_threadsafe is thread-safe: works correctly when called from a worker thread
        asyncio.run_coroutine_threadsafe(manager.broadcast(payload), self._loop)

    def start_workflow(self, workflow_name):
        super().start_workflow(workflow_name)
        self._broadcast_ws("start", {"workflow_name": workflow_name})

    def node_start(self, node_name, icon="⚙️"):
        super().node_start(node_name, icon)
        self._broadcast_ws("node_start", {"node_name": node_name, "icon": icon, "step": self.step_counter})

    def node_success(self, message="Concluído"):
        super().node_success(message)
        self._broadcast_ws("node_success", {"message": message, "step": self.step_counter})

    def log_info(self, message):
        super().log_info(message)
        self._broadcast_ws("log_info", {"message": message, "timestamp": self._get_timestamp()})

    def log_data(self, key, value):
        super().log_data(key, value)
        self._broadcast_ws("log_data", {"key": key, "value": value})

    def log_warning(self, message):
        super().log_warning(message)
        self._broadcast_ws("log_warning", {"message": message})

    def log_error(self, message, fail_node=True):
        super().log_error(message, fail_node)
        self._broadcast_ws("log_error", {"message": message})

    def end_workflow(self):
        super().end_workflow()
        self._broadcast_ws("end", {"message": "Workflow finished"})


class OptimizeRequest(BaseModel):
    origin: str
    stops: List[str]

@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We don't expect to receive messages, but we need to keep the connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/api/optimize")
async def optimize_route_api(request: OptimizeRequest):
    loop = asyncio.get_event_loop()
    pipeline = RouteOptimizationPipeline()
    # Override the standard terminal logger with our WebSocket broadcast logger
    pipeline.logger = WebSocketLogger(loop=loop)
    # Also inject the websocket logger into the initialized geocoder
    pipeline.geocoder.logger = pipeline.logger

    # We must run it in a thread so it doesn't block the ASGI event loop and allows WebSockets to send messages
    try:
        result_json = await loop.run_in_executor(None, pipeline.optimize_route, request.origin, request.stops)
        return json.loads(result_json)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# To run:
# uvicorn src.api.app:app --reload --port 8000
