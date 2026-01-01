#include "include/metric_reader.hpp"
#include "include/metrics_state.hpp"
#include "include/server.hpp"
#include <iostream>
#include <chrono>
#include <thread>
using namespace std;

void collection_thread(MetricsState* state, Readings* readings) {
    using namespace chrono;

    while (true) {
        float cpu = readings->read_cpu_percentage();
        auto temp = readings->read_temperature();
        auto mem = readings->read_memory();

        state->update(cpu, temp, mem);
        this_thread::sleep_for(seconds(3));
    }
}

void server_thread(MetricsState* state) {
    SocketServer server("/tmp/radxa_metrics.sock");
    server.run(state);
}

int main() {
    MetricsState state;
    Readings readings;
    
    thread collector(collection_thread, &state, &readings);
    thread server(server_thread, &state);

    collector.join();
    server.join();
    return 0;
}