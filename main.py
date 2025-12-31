import time
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

        for metric, config in self.metrics.items():
            if config["track"]:
                self.buffers[metric] = RingBuffer(3600) # 3600 samples, 1 sample/2s,  .5 hr / 30 mins of coverage
                self.detectors[metric] = EMWADetector(
                    alpha=config["alpha"],
                    threshold=config["threshold"]
                )

    def run(self):
        while True:
            data = self.client.get_metrics()
            if data is None:
                print("Failed to get metrics, retrying...")
                time.sleep(1)
                continue

            metrics = data['metrics']

            for metric_name in self.buffers.keys():
                value = metrics.get(metric_name)
                if value is None:
                    continue

                self.buffers[metric_name].push(value)
                self.detectors[metric_name].update(value)

                if self.detectors[metric_name].is_anomaly(value):
                    z_score = self.detectors[metric_name].get_z_score(value)
                    print(f"anomaly: {metric_name} = {value} (z={z_score})")

                print(f"{metric_name}: {value}")
            
            time.sleep(2)