import math

class EMWADetector:
    # emwa = alpha * data point + (1 - alpha) * prev_emwa
    # used to find trends in time dependent data

    def __init__(self, alpha=0.1, threshold=2.0, warm_up_samples = 30):
        self.alpha = alpha # our decay factor; the higher, the more reactive it is
        self.threshold = threshold # what constitutes an anomaly
        self.warm_up_samples = warm_up_samples
        self.warm_up_buffer = [] # actual warm up; will be used to initialize a variance instead of setting it to 0
        self.emwa = None
        self.min_variance = None
        self.variance = None
        self.samples = 0
        self.ready = False

    def update(self, value):
        self.samples += 1

        if not self.ready:
            self.warm_up_buffer.append(value)
            if len(self.warm_up_buffer) >= self.warm_up_samples:
                self.emwa = sum(self.warm_up_buffer) / len(self.warm_up_buffer) # initialize w/ proper stats
                sqdiff = [(x - self.emwa) ** 2 for x in self.warm_up_buffer]
                self.variance = sum(sqdiff) / len(self.warm_up_buffer)
                self.ready = True
            return

        delta = value - self.emwa
        self.emwa = self.emwa + self.alpha * delta        
        self.variance = (1 - self.alpha) * self.variance + self.alpha * (value - self.emwa)**2

        if self.ready and self.min_variance is None:
            self.min_variance = self.variance * 0.01

    def get_z_score(self, value):
        if not self.ready or self.variance is None:
            return 0.0
        
        stdev = math.sqrt(max(self.variance, self.min_variance) if self.min_variance else self.variance)
        if stdev == 0:
            return 0.0
        
        return abs(value - self.emwa) / stdev
    
    def is_anomaly(self, value):
        if not self.ready:
            return False
        
        z_score = self.get_z_score(value)
        return z_score > self.threshold
    
    def get_state(self):
        if not self.ready:
            return {
                "emwa": None,
                "stdev": 0,
                "variance": 0,
                "warm_up_progress": len(self.warm_up_buffer) / self.warm_up_samples
            }

        return {
            "emwa": self.emwa,
            "stdev": math.sqrt(self.variance) if self.variance else 0,
            "variance": self.variance
        }