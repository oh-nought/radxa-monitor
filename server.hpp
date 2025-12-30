#pragma once
#include "metrics_state.hpp"

class SocketServer {
private:
    const char* socket_path;
    int server_fd;

    bool setup_socket();
    void cleanup_socket();

public:
    SocketServer(const char* path);
    ~SocketServer();

    void run(MetricsState* state); // server loop
};