#include <iostream>
#include <fstream>
#include <chrono>
#include <thread>
#include <string>
using namespace std;

int main() {
    for (int i = 0; i < 3; i++) {
        string cpu_data;
        ifstream ifile("/proc/stat");
        std::getline(ifile, cpu_data);
        cout << cpu_data << endl;
        this_thread::sleep_for(chrono::seconds(3));
    }
}