import math

class EMWADetector:
    # emwa = alpha * data point + (1 - alpha) * prev_emwa
    # used to find trends in time dependent data

    def __init__(self, alpha=0.1, threshold=3.0):
        self.alpha = alpha # our decay factor; the higher, the more reactive it is
        self.threshold = threshold # what constitutes an anomaly
        self.emwa = None
        self.variance = None

    def update(self, value):
        if self.emwa is None: # initialization
            self.emwa = value
            self.variance = 0
        else:
            prev_emwa = self.emwa
            prev_variance = self.variance
            self.emwa = self.alpha * value + (1 - self.alpha) * prev_emwa
            self.variance = self.alpha * (value - self.emwa) ** 2 + (1-self.alpha) * prev_variance
        
    def get_z_score(self, value):
        if self.emwa is None or self.variance == 0:
            return 0.0
        
        stdev = math.sqrt(self.variance)
        if stdev == 0:
            return 0.0
        
        return abs(value - self.emwa) / stdev
    
    def is_anomaly(self, value):
        z_score = self.get_z_score(value)
        return z_score > self.threshold
    
    def get_state(self):
        return {
            "emwa": self.emwa,
            "stdev": math.sqrt(self.variance) if self.variance else 0,
            "variance": self.variance
        }