#pragma once

struct Snapshot {
    int user_time;
    int nice_time;
    int sys_time;
    int idle_time;
    int iowait_time;
    int irq_time;
    int softirq_time;
};

struct Temperature {
    int temp_c;
};

struct Memory {
    double total_memory;
    double used_memory;
    double cached_memory;
};

class Readings {
private:
    Snapshot previous_snapshot = {};
    Snapshot current_snapshot = {};
    bool is_initialized = false;

public:
    float read_cpu_percentage();
    Temperature read_temperature();
    Memory read_memory();
};