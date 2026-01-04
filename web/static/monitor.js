class Monitor {
    constructor() {
        this.ws = null;
        this.reconnects = 0;
        this.max_reconnects = 5;
        this.reconnect_delay = 1000;
        this.anomaly_log = [];
        this.max_entries = 50;
        this.init();
    }

    async init() {
        await this.load_svg();
        this.connect_websocket();
        this.update_status('connecting');
    }

    async load_svg() {
        try {
            const response = await fetch('/static/radxa.svg');
            const svg_text = await response.text();
            const frame = document.getElementById('board-frame');

            frame.setAttribute('viewBox', '0 0 1350 1870');
            frame.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            frame.innerHTML = `
                <defs>
                    ${this.build_gradients()}
                </defs>

                <g id="board" transform="translate(400, 00)">
                    ${svg_text}
                </g>

                ${this.build_legends()}
            `;
        } catch (error) {
            console.error("Failed to load SVG:", error);
            document.getElementById('svg-container').innerHTML = '<p style="color: red;">Failed to load board visual</p>';
        }
    }

    build_gradients() {
        return `
        <linearGradient id="heat-gradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#009a08ff"/>
            <stop offset="25%" stop-color="#6FAF4C"/>
            <stop offset="50%" stop-color="#FFEB3B"/>
            <stop offset="75%" stop-color="#d68e23ff"/>
            <stop offset="100%" stop-color="#ae0c00ff"/>
        </linearGradient>

        <linearGradient id="memory-gradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#E1BEE7"/>
            <stop offset="100%" stop-color="#6A1B9A"/>
        </linearGradient>
        `;
    }

    build_legends() {
        const board_height = 1870;

        return `
        <g id="legends" transform="translate(0,0)>
            <rect x="0" y="0"/>        
            <rect x="105" y="100" width="75" height="${board_height - 200}" fill="url(#heat-gradient)" stroke="black" stroke-width="4"/>        
            <text x="40" y="70" font-size="40" font-weight="bold">CPU/Temp.</text>
            
            <rect x="275" y="100" width="75" height="${board_height - 200}" fill="url(#memory-gradient)" stroke="black" stroke-width="4"/>
            <text x="265" y="70" font-size="40" font-weight="bold">RAM</text>

            <text x="0" y="140" font-size="40">High</text>
            <text x="10" y="1750" font-size="40">Low</text>
        </g>
        `
    }

    get_color(percentage, gradient_stops) {
        percentage = Math.max(0, Math.min(100, percentage));
        
        for (let i = 0; i < gradient_stops.length - 1; i++) {
            const stop1 = gradient_stops[i];
            const stop2 = gradient_stops[i + 1];

            if (percentage >= stop1.position && percentage <= stop2.position) {
                const range = stop2.position - stop1.position;
                const position_in_range = percentage - stop1.position;
                const ratio = position_in_range / range;

                return this.interpolate_color(stop1.color, stop2.color, ratio);
            }
        }

        return gradient_stops[gradient_stops.length - 1].color;
    }

    interpolate_color(color1, color2, ratio) {
        const hex = (color) => {
            const c = color.replace('#', '');
            return {
                r: parseInt(c.substr(0,2), 16),
                g: parseInt(c.substr(2,2), 16),
                b: parseInt(c.substr(4,2), 16)
            };
        };

        const c1 = hex(color1);
        const c2 = hex(color2);


        const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
        const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
        const b = Math.round(c1.b + (c2.b - c1.b) * ratio);

        return `rgb(${r}, ${g}, ${b})`;
    }

    connect_websocket() {
        if (this.ws) {
            this.ws.close();
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws_url = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(ws_url);
        this.ws.onopen = () => {
            this.reconnects = 0;
            this.update_status('connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'ping') {
                    this.ws.send(JSON.stringify({type: 'pong'}));
                    return;
                }

                if (data.metrics) {
                    this.update_metrics(data);
                }
            } catch (error) {
                console.error("Failed to parse WebSocket message:", error)
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('Websocket closed');
            this.update_status('disconnected');
            this.attempt_reconnect();
        };
    }

    attempt_reconnect() {
        if (this.reconnects >= this.max_reconnects) {
            console.error('Max reconnection attempts reached');
            this.update_status('disconnected');
            return;
        }

        this.reconnects++;
        const delay = this.reconnect_delay * Math.min(this.reconnects, 5);
        console.log(`Attempting to reconnect in ${delay/1000}s (attempt ${this.reconnects})`);

        setTimeout(() => {
            this.connect_websocket();
        }, delay);
    }

    update_status(status) {
        const indicator = document.getElementById('connection-status');
        indicator.className = `status-indicator ${status}`;
    }

    update_metrics(data) {
        if (!data.metrics) return;
        const metrics = data.metrics;

        const cpu_value = metrics.cpu_percent;
        if (cpu_value !== "Initializing..." && cpu_value != undefined) {
            document.getElementById('cpu-value').textContent = cpu_value.toFixed(1) + '%';
            this.update_heatmap('cpu', cpu_value);
        }

        const temp_c = metrics.temperature_c;
        // const temp_f = metrics.temperature_f;
        if (temp_c !== undefined) {
            document.getElementById('temp-value').textContent = temp_c + '°C';
            this.update_heatmap('temperature', temp_c);
        }

        const mem_used = metrics.memory_used_gb;
        const mem_total = metrics.memory_total_gb;
        const mem_cached = metrics.memory_cached_gb;
        if (mem_used !== undefined && mem_total !== undefined) {
            const mem_percent = (mem_used / mem_total) * 100;
            document.getElementById('ram-value').textContent = mem_percent.toFixed(1) + '%';
            document.getElementById('ram-used').textContent = mem_used.toFixed(2);
            document.getElementById('ram-total').textContent = mem_total.toFixed(2) + ' GB';
            document.getElementById('ram-cached').textContent = mem_cached.toFixed(2) + ' GB';
            this.update_heatmap('memory', mem_percent);
        }

        if (data.anomalies && Object.keys(data.anomalies).length > 0) {
            this.handle_anomalies(data.anomalies, data.timestamp);
        }

        if (!data.anomalies || Object.keys(data.anomalies).length === 0) {
            this.clear_indicators();
        }
    }

    update_heatmap(type, value) {
        const svg = document.querySelector('#svg-container svg');
        if (!svg) return;

        let percentage;
        let fill_element;
        let gradient_stops;

        switch (type) {
            case 'cpu':
                percentage = Math.max(0, Math.min(100, value));
                fill_element = svg.querySelector('#cpu_fill, [id*="cpu_fill" i]');

                gradient_stops = [
                    { position: 0, color: '#00D40B' },
                    { position: 25, color: '#6FAF4C' },
                    { position: 50, color: '#FFEB3B' },
                    { position:75, color: '#d68e23ff' },
                    { position: 100, color: '#ae0c00ff' }
                ];
                break;

            case 'temperature':
                const min_temp = 30;
                const max_temp = 90;
                percentage = ((value - min_temp) / (max_temp - min_temp)) * 100;
                percentage = Math.max(0, Math.min(100, percentage));
                fill_element = svg.querySelector('#temperature_fill, [id*="temperature_fill" i]');

                gradient_stops = [
                    { position: 0, color: '#00D40B' },
                    { position: 25, color: '#6FAF4C' },
                    { position: 50, color: '#FFEB3B' },
                    { position:75, color: '#d68e23ff' },
                    { position: 100, color: '#ae0c00ff' }
                ];
                break;

            case 'memory':
                percentage = Math.max(0, Math.min(100, value));
                fill_element = svg.querySelector('#memory_fill, [id*="memory_fill" i]');

                gradient_stops = [
                    { position: 0, color: '#E1BEE7' },
                    { position: 0, color: '#CE93D8' },
                    { position: 0, color: '#AB47BC' },
                    { position: 0, color: '#8E24AA' },
                    { position: 0, color: '#6A1B9A' }
                ]
                break;
        }

        if (fill_element) {
            const color = this.get_color(percentage, gradient_stops);
            fill_element.style.fill = color;
            fill_element.style.fillOpacity = '0.5';
            fill_element.style.transition = 'fill 0.5s ease';
        } else {
            console.error(`Couldn't find SVG group for ${type}`);
        }
    }

    handle_anomalies(anomalies, timestamp) {
        for (const [metric, data] of Object.entries(anomalies)) {
            const indicator_id = this.get_indicator_id(metric);
            const indicator = document.getElementById(indicator_id);
            if (indicator) {
                indicator.classList.add('active');
            }

            this.add_anomaly(metric, data.value, data.z_score, timestamp);
        }
    }

    clear_indicators() {
        document.querySelectorAll('.anomaly-indicator').forEach(e => {
            e.classList.remove('active');
        });
    }

    get_indicator_id(metric) {
        if (metric.includes('cpu')) {
            return 'cpu-anomaly';
        }

        if (metric.includes('temperature') || metric.includes('temp')) {
            return 'temp-anomaly';
        }

        if (metric.includes('memory')) {
            return 'memory-anomaly';
        };
    }

    add_anomaly(metric, value, z_score, timestamp) {
        const entry = {metric, value, z_score, timestamp};
        const is_duplicate = this.anomaly_log.some(log => 
            log.metric === metric && Math.abs(log.timestamp - timestamp < 10)
        );

        if (!is_duplicate) {
            this.anomaly_log.unshift(entry);

            if (this.anomaly_log.length > this.max_entries) {
                this.anomaly_log.pop();
            }

            this.render_log();
        }
    }

    render_log() {
        const log_container = document.getElementById('anomaly-list');
        if (this.anomaly_log.length === 0) {
            log_container.innerHTML = '<p style="color: #999; font-size: 13px;">No anomalies detected</p>';
            return;
        }

        log_container.innerHTML = this.anomaly_log.map(entry => {
            const date = new Date(entry.timestamp * 1000);
            const time_str = date.toLocaleDateString();

            return `
                <tr>
                    <td>${time_str}</td>
                    <td>${(entry.metric.includes('cpu_percent') ? entry.value : 0)}</td>
                    <td>${(entry.metric.includes('temperature_c') ? entry.value : 0)}</td>
                    <td>${(entry.metric.includes('memory_used_gb') ? entry.value : 0)}</td>
                    <td>${(entry.metric.includes('memory_cached_gb') ? entry.value : 0)}</td>
                </tr>
            `;
        }).join('')
    }

    format_metric_name(metric) {
        return metric
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    format_value(metric, value) {
        if (metric.includes('temperature_c')) {
            return `${value}C`
        } 
        if (metric.includes('cpu')) {
            return `${value.toFixed(1)}%`
        }
        if (metric.includes('memory')) {
            return `${value.toFixed(2)} GB`
        }
        return value;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Monitor();
})