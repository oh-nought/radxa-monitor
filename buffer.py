class RingBuffer:
    def __init__(self, size):
        self.size = size
        self.buffer = [None] * size
        self.index = 0
        self.count = 0

    def push(self, value):
        self.buffer[self.index] = value
        self.index = (self.index + 1) % self.size
        self.count = min(self.count + 1, self.size)

    def get_latest(self, n=None):
        if n is None:
            n = self.count

        n = min(n, self.count)
        if  n == 0:
            return []
        
        if self.count < self.size:
            return self.buffer[:self.count][-n:]
        else:
            return (self.buffer[self.index:] + self.buffer[:self.index])[-n:]
        
    def is_full(self):
        return self.count >= self.size
    
    def __len__(self):
        return self.count