#include "metric_reader.hpp"
#include <iostream>
#include <chrono>
#include <thread>
using namespace std;

int main() {
    Readings readings;

    for (int i = 0; i < 5; i++) {
        auto cpu = readings.read_cpu_percentage();
        auto temp = readings.read_temperature();
        auto memory = readings.read_memory();
    
        cout << "CPU Usage: " << cpu << endl;
        cout << "Temperature in C: " << temp.temp_c << endl;
        cout << "Temperature in F: " << temp.temp_c << endl;
        cout << "Total Memory: " << memory.total_memory << endl;
        cout << "Used Memory: " << memory.used_memory << endl;
        cout << "Cached Memory: " << memory.cached_memory << endl;  
        
        this_thread::sleep_for(chrono::seconds(3));
    }

}