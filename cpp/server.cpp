#include "include/server.hpp"
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cstring>
#include <iostream>
using namespace std;

SocketServer::SocketServer(const char* path)
    : socket_path(path), server_fd(-1) {}

SocketServer::~SocketServer() {
    cleanup_socket();
}

bool SocketServer::setup_socket() {
    server_fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (server_fd == -1) {
        cerr << "Failed to create socket" << endl;
        return false;
    }

    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, socket_path, sizeof(addr.sun_path) - 1);

    unlink(socket_path);
    bind(server_fd, (struct sockaddr*)&addr, sizeof(addr));

    if (listen(server_fd, 5) == -1) {
        cerr << "Failed to listen on socket" << endl;
        close(server_fd);
        return false;
    }

    cout << "Socket server listening on " << socket_path << endl;
    return true;
}

void SocketServer::run(MetricsState* state) {
    if (!setup_socket()) {
        return;
    }

    while (true) {
        int client_fd = accept(server_fd, NULL, NULL);
        if (client_fd == -1) {
            cerr << "Failed to accept client" << endl;
            continue;
        }

        string json = state->get_json();
        send(client_fd, json.c_str(), json.length(), 0);
        close(client_fd);
    }
}

void SocketServer::cleanup_socket() {
    if (server_fd != -1) {
        close(server_fd);
        unlink(socket_path);
    }
}