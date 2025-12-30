#pragma once
#include <mutex>
#include <string>
#include "metric_reader.hpp"
using namespace std;

class MetricsState {
private:
    mutex mtx;

    float cpu_percent;
    int temperature_c;
    int temperature_f;
    double memory_total;
    double memory_used;
    double memory_cached;
    time_t timestamp;

public:
    MetricsState();
    void update(float cpu, Temperature temp, Memory mem);
    string get_json();
};