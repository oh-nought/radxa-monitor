CXX = g++
TARGET = radxa_monitor
SOURCES = main.cpp metric_reader.cpp metrics_state.cpp server.cpp

$(TARGET): $(SOURCES)
	$(CXX) -o $(TARGET) $(SOURCES)

clean:
	rm -f $(TARGET)