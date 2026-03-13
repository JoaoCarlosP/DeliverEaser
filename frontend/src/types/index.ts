export interface RouteLocation {
  type: "origin" | "stop";
  sequence: number;
  address: string;
  lat: number;
  lng: number;
}

export interface OptimizeResult {
  route: RouteLocation[];
  failed: string[];
}

export interface WebSocketLogEvent {
  type: "start" | "node_start" | "node_success" | "log_info" | "log_data" | "log_warning" | "log_error" | "end";
  data: any;
}

export interface RouteState {
  origin: string;
  stops: string[];
  isLoading: boolean;
  result: RouteLocation[] | null;
  failedAddresses: string[];
  logs: WebSocketLogEvent[];
  error: string | null;
}
