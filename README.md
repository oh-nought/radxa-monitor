# Radxa Monitor w/ Anomaly Detection
Monitor your Radxa (or other SBC) and discover bottlenecks.

<img width="1520" height="833" alt="Radxa Monitor Demo" src="https://github.com/user-attachments/assets/bf5bc322-b623-4cef-bd0f-05d5faccf045" />

## Quickstart
*Note: this tutorial assumes you are running a Linux distro on your SBC.*

1. Navigate to your folder and clone the repo:
```bash
git clone https://github.com/oh-nought/radxa-monitor
cd radxa-monitor
```

2. Navigate to the `cpp/` folder and run the Makefile:
```bash
cd cpp
make
```

3. Run the C++:
```bash
./radxa_monitor
```

4. Navigate to the `py/` folder and install python dependencies (preferrably using uv):
```bash
cd ../py
uv sync
```

5. Activate the newly created virtual environment:
```bash
cd ..
source ./.venv/bin/activate
```

6. Navigate to the `py/` folder and start the FastAPI server:
```bash
cd py
uvicorn main:app --host 0.0.0.0 --port 5000
```

## Accessing the web interface
1. From the Radxa itself: Navigate to `http://localhost:5000`
2. From a separate computer (on the same network):
   - Find your Radxa's IP:
     ```bash
     hostname -I
     ```
   - Navigate to `http://<radxa-ip>:5000`

## Accessing the API
### Endpoints
- `GET /` - Gets the main web interface
- `GET /api/current` - Gets current metric snapshot (JSON)
- `GET /api/history/{metric_name}?samples={number}` - Get historical data (semi-broken right now)
```bash
# get current metrics
curl http://localhost:5000/api/current

curl http://<radxa-ip>:5000/api/current
```


