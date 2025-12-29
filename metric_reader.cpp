#include <iostream>
#include <fstream>
#include <string>
#include "metric_reader.hpp"
using namespace std;

float Readings::read_cpu_percentage() {
    ifstream ifile("/proc/stat");
    
    string cpu;
    int user, nice, system, idle, iowait, irq, softirq;

    ifile >> cpu >> this->current_snapshot.user_time >> this->current_snapshot.nice_time >> this->current_snapshot.sys_time >> this->current_snapshot.idle_time >> this->current_snapshot.iowait_time >> this->current_snapshot.irq_time >> current_snapshot.softirq_time;

    if (Readings::is_initialized == false) {
        this->previous_snapshot = this->current_snapshot;
        this->is_initialized = true;
        return -1;
    } else {
        // calculate total clock time
        int total_prev = this->previous_snapshot.user_time + this->previous_snapshot.nice_time + this->previous_snapshot.sys_time + this->previous_snapshot.idle_time + this->previous_snapshot.iowait_time + this->previous_snapshot.irq_time + this->previous_snapshot.softirq_time;
        int total_curr = this->current_snapshot.user_time + this->current_snapshot.nice_time + this->current_snapshot.sys_time + this->current_snapshot.idle_time + this->current_snapshot.iowait_time + this->current_snapshot.irq_time + this->current_snapshot.softirq_time;
        int idle_prev = this->previous_snapshot.idle_time;
        int idle_curr = this->current_snapshot.idle_time;

        int total_diff = total_curr - total_prev;
        int idle_diff = idle_curr - idle_prev;
        int busy_diff = total_diff - idle_diff;

        // if no time passed
        if (total_diff == 0) {
            return 0.0f;
        }

        float cpu_percent = (busy_diff / total_diff) * 100;

        this->previous_snapshot = this->current_snapshot;

        return cpu_percent;
    }
}

Temperature Readings::read_temperature() {
    Temperature temps;
    ifstream ifile("/sys/class/thermal/thermal_zone0/temp");
    int raw_temp;
    ifile >> raw_temp;
    float temp_c = raw_temp / 1000;
    float temp_f = (temp_c * 1.8) + 32;

    temps.temp_c = temp_c;
    temps.temp_f = temp_f;

    return temps;
}

Memory Readings::read_memory() {
    Memory memory;
    ifstream ifile("/proc/meminfo");

    string key, unit;
    double value_kb;

    while (ifile >> key >> value_kb >> unit) {
        if (key == "MemTotal:") {
            memory.total_memory = value_kb / 1000000;
        } else if (key == "MemAvailable:") {
            memory.used_memory = memory.total_memory - (value_kb / 1000000);
        } else if (key == "Cached:") {
            memory.cached_memory = value_kb / 1000000;
        }
    }

    return memory;
}