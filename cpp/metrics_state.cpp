#include "metrics_state.hpp"
#include "json.hpp"
#include <ctime>
using json = nlohmann::json;

MetricsState::MetricsState()
    : cpu_percent(0), temperature_c(0), temperature_f(0), memory_total(0), memory_used(0), memory_cached(0), timestamp(0) {}

void MetricsState::update(float cpu, Temperature temp, Memory mem) {
    lock_guard<mutex> lock(mtx);

    this->cpu_percent = cpu;
    this->temperature_c = temp.temp_c;
    this->temperature_f = temp.temp_f;
    this->memory_total = mem.total_memory;
    this->memory_used = mem.used_memory;
    this->memory_cached = mem.cached_memory;
}

string MetricsState::get_json() {
    lock_guard<mutex> lock(mtx);

    json j;

    j["timestamp"] = time(nullptr);

    if (this->cpu_percent < 0) {
        j["metrics"]["cpu_percent"] = "Initializing...";
    } else {
        j["metrics"]["cpu_percent"] = this->cpu_percent;
    }
    j["metrics"]["temperature_c"] = this->temperature_c;
    j["metrics"]["temperature_f"] = this->temperature_f;
    j["metrics"]["memory_total_gb"] = this->memory_total;
    j["metrics"]["memory_used_gb"] = this->memory_used;
    j["metrics"]["memory_cached_gb"] = this->memory_cached;

    return j.dump();
}