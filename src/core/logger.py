import time
from datetime import datetime

class N8NLogger:
    """
    A stylized logger that simulates the visual execution flow of N8N or similar workflow tools.
    Provides clear visual distinction for steps, success, warnings, and errors.
    """
    # ANSI escape sequences for terminal colors
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

    def __init__(self):
        self.step_counter = 0
        self.start_time = time.time()

    def _get_timestamp(self):
        return datetime.now().strftime("%H:%M:%S.%f")[:-3]

    def _print_node_header(self, node_name, icon="⚙️"):
        print(f"\n{self.OKBLUE}┌{'─'*60}┐{self.ENDC}")
        print(f"{self.OKBLUE}│{self.ENDC} {icon}  {self.BOLD}{node_name.ljust(54)}{self.ENDC} {self.OKBLUE}│{self.ENDC}")
        print(f"{self.OKBLUE}├{'─'*60}┤{self.ENDC}")

    def _print_node_footer(self, duration_ms):
        print(f"{self.OKBLUE}└{'─'*60}┘{self.ENDC}")
        print(f"   {self.OKCYAN}↪ Node executed in {duration_ms}ms{self.ENDC}\n")

    def start_workflow(self, workflow_name):
        print(f"\n{self.HEADER}🚀 {self.BOLD}{workflow_name}{self.ENDC}")
        print(f"{self.HEADER}============================================================{self.ENDC}")
        self.start_time = time.time()
        self.step_counter = 0

    def node_start(self, node_name, icon="⚙️"):
        self.step_counter += 1
        self._print_node_header(f"Etapa {self.step_counter}: {node_name}", icon)
        self.node_start_time = time.time()

    def node_success(self, message="Concluído"):
        duration = int((time.time() - self.node_start_time) * 1000)
        print(f"{self.OKBLUE}│{self.ENDC} {self.OKGREEN}✓ {message}{self.ENDC}")
        self._print_node_footer(duration)

    def log_info(self, message):
        timestamp = self._get_timestamp()
        print(f"{self.OKBLUE}│{self.ENDC} [{timestamp}] ℹ️  {message}")
        
    def log_data(self, key, value):
        print(f"{self.OKBLUE}│{self.ENDC} {self.OKCYAN}↳ {key}:{self.ENDC} {value}")

    def log_warning(self, message):
        print(f"{self.OKBLUE}│{self.ENDC} {self.WARNING}⚠️  WARNING: {message}{self.ENDC}")

    def log_error(self, message, fail_node=True):
        print(f"{self.OKBLUE}│{self.ENDC} {self.FAIL}❌ ERROR: {message}{self.ENDC}")
        if fail_node:
            duration = int((time.time() - getattr(self, 'node_start_time', time.time())) * 1000)
            self._print_node_footer(duration)

    def end_workflow(self):
        total_duration = round(time.time() - self.start_time, 2)
        print(f"{self.HEADER}============================================================{self.ENDC}")
        print(f"{self.HEADER}✓ Rota calculada com sucesso! ({total_duration}s){self.ENDC}\n")
