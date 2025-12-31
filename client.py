import socket
import json

class MetricsClient:
    def __init__(self, socket_path="/tmp/radxa_metrics.sock"):
        self.socket_path = socket_path

    def get_metrics(self):
        try:
            s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            s.connect(self.socket_path)
            
            data = s.recv(4096) # 4kb
            s.close()

            metrics = json.loads(data)
            return metrics
        
        except Exception as e:
            print(f"Failed to get metrics: {e}")
            return None