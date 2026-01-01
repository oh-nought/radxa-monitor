from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
from monitor import Monitor
import asyncio
import json

monitor = Monitor()

@asynccontextmanager
async def lifespan(app):
    task = asyncio.create_task(monitor.collect_metrics()) # to startup the task

    yield

    task.cancel() # to shutdown the task
    try:
        await task
    except asyncio.CancelledError:
        print("Metrics collection cancelled.")

app = FastAPI(lifespan=lifespan)
static_path = Path(__file__).parent.parent / "web" / "static"
templates_path = Path(__file__).parent.parent / "web" / "templates"

app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

@app.get("/", response_class=HTMLResponse)
async def get_index():
    html = templates_path / "index.html"
    with open(html, "r") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)

@app.get("/api/current")
async def get_current():
    data = await monitor.get_current_data()
    return data

@app.get("/api/history/{metric_name}")
async def get_history(metric_name, samples=100):
    data = await monitor.get_history(metric_name, samples)
    return {"metric": metric_name, "data": data}

@app.websocket("/ws")
async def websocket_endpoint(websocket):
    await monitor.connect(websocket)
    try:
        # sending initial data
        current_data = await monitor.get_current_data()
        if current_data:
            await websocket.send_text(json.dumps(current_data))

        while True: # to keep connection alive
            try:
                data = await asyncio.wait_for(websocket.recieve_text(), timeout=60.0)
                await websocket.send_text(json.dumps({"type": "pong"}))
            except:
                await websocket.send_text(json.dumps({"type": "ping"}))

    except Exception as e:
        print(f"Websocket error: {e}")
        monitor.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=2727,
        log_level="info"
    )
