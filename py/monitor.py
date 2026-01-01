import json
import asyncio
from client import MetricsClient
from buffer import RingBuffer
from emwa_detector import EMWADetector

class Monitor:
    metrics = {
        "cpu_percent": {"alpha": 0.2, "threshold": 3.0, "track": True},
        "temperature_c": {"alpha": 0.1, "threshold": 3.0, "track": True},
        "temperature_f": {"alpha": 0.1, "threshold": 3.0, "track": True},
        "memory_total_gb": {"alpha": 0.1, "threshold": 3.0, "track": False}, # constant
        "memory_used_gb": {"alpha": 0.1, "threshold": 3.0, "track": True},
        "memory_cached_gb": {"alpha": 0.1, "threshold": 3.0, "track": True},
    }

    def __init__(self):
        self.client = MetricsClient()
        self.buffers = {}
        self.detectors = {}
        self.curent_data = {}
        self.active = []
        self._lock = asyncio.Lock()

        for metric, config in self.metrics.items():
            if config["track"]:
                self.buffers[metric] = RingBuffer(3600) # 3600 samples, 1 sample/2s,  .5 hr / 30 mins of coverage
                self.detectors[metric] = EMWADetector(
                    alpha=config["alpha"],
                    threshold=config["threshold"]
                )

    async def collect_metrics(self):
        while True:
            try:
                data = await asyncio.to_thread(self.client.get_metrics)

                if data is None:
                    print("Failed to get metrics, retrying...")
                    await asyncio.sleep(1)
                    continue

                metrics = data['metrics']
                timestamp = data['timestamp']

                async with self._lock:
                    self.current_data = {
                        "timestamp": timestamp,
                        "metrics": metrics,
                        "anomalies": {}
                    }

                    for metric_name in self.buffers.keys():
                        value = metrics.get(metric_name)
                        if value is None:
                            continue

                        self.buffers[metric_name].push(value)
                        self.detectors[metric_name].update(value)

                        if self.detectors[metric_name].is_anomaly(value):
                            z_score = self.detectors[metric_name].get_z_score(value)
                            self.current_data['anomalies'][metric_name] = {
                                "value": value,
                                "z_score": z_score
                            }
                
                await self.broadcast(self.current_data)
                await asyncio.sleep(2)
            except Exception as e:
                print(f"Failed to collect metrics: {e}")
                await asyncio.sleep(1)

    async def get_current_data(self):
        async with self._lock:
            return self.current_data.copy()
        
    async def get_history(self, metric_name, samples=100):
        async with self._lock:
            if metric_name in self.buffers:
                return self.buffers[metric_name]
            return []
        
    async def connect(self, websocket):
        await websocket.accept()
        self.active.append(websocket)
    
    def disconnect(self, websocket):
        self.active.remove(websocket)

    async def broadcast(self, data):
        if not self.active:
            return

        message = json.dumps(data)
        dead = [] 

        for connection in self.active:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Failed to send to client: {e}")
                dead.append(connection)

        for connection in dead:
            if connection in self.active:
                self.active.remove(connection)

    