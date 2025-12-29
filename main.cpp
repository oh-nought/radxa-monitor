#include "metric_reader.hpp"
#include <iostream>
#include <chrono>
#include <thread>
#include <iomanip>
using namespace std;

int main() {
    Readings readings;

    for (int i = 0; i < 5; i++) {
        auto cpu = readings.read_cpu_percentage();
        auto temp = readings.read_temperature();
        auto memory = readings.read_memory();
    
        cout << "CPU Usage: " << fixed << setprecision(2) << cpu << endl;
        cout << "Temperature in C: " << temp.temp_c << endl;
        cout << "Temperature in F: " << temp.temp_f << endl;
        cout << "Total Memory: " << fixed << setprecision(3) << memory.total_memory << endl;
        cout << "Used Memory: " << fixed << setprecision(3) << memory.used_memory << endl;
        cout << "Cached Memory: " << fixed << setprecision(3) << memory.cached_memory << endl;
        cout << "\n" << endl;
        
        this_thread::sleep_for(chrono::seconds(3));
    }

}