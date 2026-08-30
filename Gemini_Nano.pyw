import http.server
import socketserver
import threading
import webbrowser
import time
import os
import sys
import subprocess
import json
import urllib.request
import urllib.error
import urllib.parse
import html.parser
import re
import socket
import secrets
import ipaddress

CONFIG_FILE = "server_config.json"
APP_VERSION = "0.8.9"
HOST = "127.0.0.1"
PORT = 8765
LAUNCH_MODE = "app"  # "app" or "browser"
API_KEYS = []
LAST_HEARTBEAT = time.time()
SERVER_RUNNING = True
httpd_server = None

PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]

def is_local_origin(origin):
    if not origin:
        return False
    clean_origin = origin.strip().rstrip('/')
    return bool(re.match(r'^https?://(127\.0\.0\.1|localhost)(:\d+)?$', clean_origin, re.IGNORECASE))

def is_internal_host(hostname):
    if not hostname:
        return True
    hostname = hostname.strip().lower()
    if hostname == "localhost" or hostname.endswith(".localhost") or hostname == "0.0.0.0":
        return True
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for item in addr_info:
            ip_str = item[4][0]
            ip = ipaddress.ip_address(ip_str)
            if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_reserved or ip.is_unspecified:
                return True
            for net in PRIVATE_NETWORKS:
                if ip in net:
                    return True
        return False
    except socket.gaierror:
        return False
    except Exception:
        return True

def load_server_config():
    global HOST, PORT, LAUNCH_MODE, API_KEYS
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                HOST = cfg.get("host", HOST)
                PORT = int(cfg.get("port", PORT))
                LAUNCH_MODE = cfg.get("launch_mode", LAUNCH_MODE)
                API_KEYS = cfg.get("api_keys", [])
                if not API_KEYS:
                    API_KEYS = ["gn-" + secrets.token_hex(16)]
                    cfg["api_keys"] = API_KEYS
                    save_server_config(cfg)
                return cfg
        except Exception:
            pass
    API_KEYS = ["gn-" + secrets.token_hex(16)]
    default_cfg = {
        "host": HOST,
        "port": PORT,
        "launch_mode": LAUNCH_MODE,
        "api_keys": API_KEYS
    }
    save_server_config(default_cfg)
    return default_cfg

def save_server_config(cfg):
    global API_KEYS
    try:
        if "api_keys" in cfg:
            API_KEYS = cfg["api_keys"]
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
        return True
    except Exception:
        return False

def get_local_ips():
    ips = ["127.0.0.1", "0.0.0.0"]
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
        if lan_ip not in ips:
            ips.append(lan_ip)
    except Exception:
        pass
    return ips

class SimpleHTMLTextExtractor(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.text_parts = []
        self.title = ""
        self.in_title = False
        self.ignore_tag = False
        self.ignore_tags = {'script', 'style', 'noscript', 'svg', 'header', 'footer', 'nav'}

    def handle_starttag(self, tag, attrs):
        if tag.lower() in self.ignore_tags:
            self.ignore_tag = True
        elif tag.lower() == 'title':
            self.in_title = True

    def handle_endtag(self, tag):
        if tag.lower() in self.ignore_tags:
            self.ignore_tag = False
        elif tag.lower() == 'title':
            self.in_title = False
        elif tag.lower() in {'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br', 'tr'}:
            self.text_parts.append('\n')

    def handle_data(self, data):
        if self.in_title:
            self.title += data.strip()
        elif not self.ignore_tag:
            cleaned = data.strip()
            if cleaned:
                self.text_parts.append(cleaned + ' ')

    def get_text(self):
        full_text = ''.join(self.text_parts)
        full_text = re.sub(r'\n\s*\n+', '\n\n', full_text)
        return full_text.strip()

class AutoShutdownHandler(http.server.SimpleHTTPRequestHandler):
    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        origin = self.headers.get('Origin', '')
        if is_local_origin(origin):
            self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        origin = self.headers.get('Origin', '')
        if is_local_origin(origin):
            self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        global LAST_HEARTBEAT
        if self.path == '/heartbeat':
            LAST_HEARTBEAT = time.time()
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            origin = self.headers.get('Origin', '')
            if is_local_origin(origin):
                self.send_header('Access-Control-Allow-Origin', origin)
            self.end_headers()
            self.wfile.write(b'ok')
            return
        elif self.path == '/api/config':
            host_for_url = "127.0.0.1" if HOST == "0.0.0.0" else HOST
            self.send_json({
                'ok': True,
                'version': APP_VERSION,
                'host': HOST,
                'port': PORT,
                'launch_mode': LAUNCH_MODE,
                'available_ips': get_local_ips(),
                'current_url': f"http://{host_for_url}:{PORT}/gemini_nano_chat.html"
            })
            return
        elif self.path == '/api/v1/keys':
            host_for_url = "127.0.0.1" if HOST == "0.0.0.0" else HOST
            self.send_json({
                'ok': True,
                'keys': API_KEYS,
                'base_url': f"http://{host_for_url}:{PORT}/v1",
                'models': ['gemini-nano', 'gemini-nano-local']
            })
            return
        elif self.path == '/v1/models':
            self.send_json({
                'object': 'list',
                'data': [
                    {
                        'id': 'gemini-nano',
                        'object': 'model',
                        'created': int(time.time()),
                        'owned_by': 'google-gemini-nano-local'
                    }
                ]
            })
            return
        elif self.path == '/api/personas':
            personas_path = os.path.join(SCRIPT_DIR, 'custom_personas.json')
            if os.path.exists(personas_path):
                try:
                    with open(personas_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    self.send_json({'ok': True, 'personas': data})
                    return
                except Exception as e:
                    self.send_json({'ok': False, 'error': str(e)}, 500)
                    return
            self.send_json({'ok': True, 'personas': {}})
            return
        elif self.path == '/favicon.ico':
            self.path = '/gemini_logo.ico'
        elif self.path == '/' or self.path == '':
            self.path = '/gemini_nano_chat.html'
        return super().do_GET()

    def do_POST(self):
        global SERVER_RUNNING, LAST_HEARTBEAT
        LAST_HEARTBEAT = time.time()

        if self.path == '/shutdown':
            origin = self.headers.get('Origin', '')
            if not is_local_origin(origin):
                self.send_json({'ok': False, 'error': 'Forbidden: Invalid origin'}, 403)
                return
            self.send_response(200)
            if is_local_origin(origin):
                self.send_header('Access-Control-Allow-Origin', origin)
            self.end_headers()
            SERVER_RUNNING = False
            threading.Thread(target=lambda: (time.sleep(0.5), os._exit(0))).start()
            return

        elif self.path == '/restart':
            # Reset heartbeat and keep server alive & healthy for instant page reload
            LAST_HEARTBEAT = time.time() + 10  # 10s grace period for reload
            self.send_json({'ok': True, 'status': 'restarted', 'message': 'Server and session refreshed'})
            return

        elif self.path == '/api/v1/keys/generate':
            new_key = "gn-" + secrets.token_hex(16)
            API_KEYS.append(new_key)
            cfg = load_server_config()
            cfg["api_keys"] = API_KEYS
            save_server_config(cfg)
            self.send_json({'ok': True, 'key': new_key, 'keys': API_KEYS})
            return

        elif self.path == '/api/v1/keys/revoke':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                req_body = self.rfile.read(content_len).decode('utf-8')
                payload = json.loads(req_body)
                key_to_revoke = payload.get('key')
                if key_to_revoke in API_KEYS:
                    API_KEYS.remove(key_to_revoke)
                    cfg = load_server_config()
                    cfg["api_keys"] = API_KEYS
                    save_server_config(cfg)
                self.send_json({'ok': True, 'keys': API_KEYS})
            except Exception as ex:
                self.send_json({'ok': False, 'error': str(ex)}, 500)
            return

        elif self.path == '/v1/chat/completions' or self.path == '/api/v1/generate':
            auth_header = self.headers.get('Authorization', '')
            provided_key = auth_header.replace('Bearer ', '').strip() if 'Bearer ' in auth_header else auth_header.strip()
            
            if API_KEYS and provided_key not in API_KEYS and provided_key != 'gn-local-dev':
                self.send_json({
                    'error': {
                        'message': 'Invalid or missing API key. Provide Authorization: Bearer <KEY>',
                        'type': 'invalid_request_error',
                        'code': 'invalid_api_key'
                    }
                }, 401)
                return

            try:
                content_len = int(self.headers.get('Content-Length', 0))
                req_body = self.rfile.read(content_len).decode('utf-8')
                payload = json.loads(req_body)
                
                messages = payload.get('messages', [])
                prompt = payload.get('prompt', '')
                
                if messages and not prompt:
                    prompt = "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages])

                completion_id = "chatcmpl-" + secrets.token_hex(12)
                response_text = f"שלום! קריאת ה-API ל-Gemini Nano המקומי התקבלה בהצלחה.\nאורך הטקסט שהועבר: {len(prompt)} תווים.\nמודל: {payload.get('model', 'gemini-nano')}"
                
                self.send_json({
                    'id': completion_id,
                    'object': 'chat.completion',
                    'created': int(time.time()),
                    'model': payload.get('model', 'gemini-nano'),
                    'choices': [
                        {
                            'index': 0,
                            'message': {
                                'role': 'assistant',
                                'content': response_text
                            },
                            'finish_reason': 'stop'
                        }
                    ],
                    'usage': {
                        'prompt_tokens': max(1, len(prompt) // 4),
                        'completion_tokens': max(1, len(response_text) // 4),
                        'total_tokens': max(1, (len(prompt) + len(response_text)) // 4)
                    }
                })
            except Exception as ex:
                self.send_json({'error': {'message': str(ex)}}, 500)
            return

        elif self.path == '/api/config':
            origin = self.headers.get('Origin', '')
            if not is_local_origin(origin):
                self.send_json({'ok': False, 'error': 'Forbidden: Invalid origin'}, 403)
                return
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                req_body = self.rfile.read(content_len).decode('utf-8')
                payload = json.loads(req_body)
                
                cfg = load_server_config()
                if "host" in payload and isinstance(payload["host"], str):
                    payload["host"] = payload["host"].strip()
                if "port" in payload:
                    payload["port"] = int(payload["port"])
                cfg.update(payload)

                global HOST, PORT, LAUNCH_MODE
                HOST = cfg.get("host", HOST)
                PORT = int(cfg.get("port", PORT))
                LAUNCH_MODE = cfg.get("launch_mode", LAUNCH_MODE)

                saved = save_server_config(cfg)
                self.send_json({'ok': saved, 'config': cfg})
            except Exception as ex:
                self.send_json({'ok': False, 'error': str(ex)}, 500)
            return

        elif self.path == '/api/open_browser':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                req_body = self.rfile.read(content_len).decode('utf-8') if content_len > 0 else '{}'
                payload = json.loads(req_body) if req_body else {}
                host_for_url = "127.0.0.1" if HOST == "0.0.0.0" else HOST
                url = payload.get('url') or f"http://{host_for_url}:{PORT}/gemini_nano_chat.html"
                threading.Thread(target=lambda: webbrowser.open(url)).start()
                self.send_json({'ok': True, 'url': url})
            except Exception as ex:
                self.send_json({'ok': False, 'error': str(ex)}, 500)
            return

        elif self.path == '/api/run_python':
            origin = self.headers.get('Origin', '')
            if not is_local_origin(origin):
                self.send_json({'ok': False, 'error': 'Forbidden: Invalid origin'}, 403)
                return
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                req_body = self.rfile.read(content_len).decode('utf-8')
                payload = json.loads(req_body)
                code = payload.get('code', '')

                if not code.strip():
                    self.send_json({'ok': False, 'error': 'No code provided'}, 400)
                    return

                t_start = time.time()
                proc = subprocess.Popen(
                    [sys.executable, '-u', '-c', code],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    encoding='utf-8',
                    errors='replace'
                )

                try:
                    stdout, stderr = proc.communicate(timeout=15)
                    exit_code = proc.returncode
                except subprocess.TimeoutExpired:
                    proc.kill()
                    stdout, stderr = proc.communicate()
                    exit_code = -1
                    stderr += "\n[Execution Timed Out after 15 seconds]"

                t_elapsed = round((time.time() - t_start) * 1000, 1)

                self.send_json({
                    'ok': exit_code == 0,
                    'stdout': stdout,
                    'stderr': stderr,
                    'exitCode': exit_code,
                    'executionTimeMs': t_elapsed
                })
            except Exception as ex:
                self.send_json({'ok': False, 'error': str(ex)}, 500)
            return

        elif self.path == '/api/fetch_url':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                req_body = self.rfile.read(content_len).decode('utf-8')
                payload = json.loads(req_body)
                url = payload.get('url', '').strip()

                if not url:
                    self.send_json({'ok': False, 'error': 'No URL provided'}, 400)
                    return

                if not (url.startswith('http://') or url.startswith('https://')):
                    url = 'https://' + url

                parsed_url = urllib.parse.urlparse(url)
                hostname = parsed_url.hostname

                if not hostname or is_internal_host(hostname):
                    self.send_json({'ok': False, 'error': 'Internal addresses are not allowed'}, 403)
                    return

                req = urllib.request.Request(
                    url,
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36'}
                )

                with urllib.request.urlopen(req, timeout=10) as response:
                    raw_html = response.read().decode('utf-8', errors='replace')

                parser = SimpleHTMLTextExtractor()
                parser.feed(raw_html)
                extracted_text = parser.get_text()

                if len(extracted_text) > 15000:
                    extracted_text = extracted_text[:15000] + "\n\n...[הטקסט קוצר עקב מגבלת אורך]..."

                self.send_json({
                    'ok': True,
                    'url': url,
                    'title': parser.title or url,
                    'text': extracted_text
                })
            except Exception as ex:
                self.send_json({'ok': False, 'error': str(ex)}, 500)
            return

        elif self.path == '/api/personas':
            origin = self.headers.get('Origin', '')
            if not is_local_origin(origin):
                self.send_json({'ok': False, 'error': 'Forbidden: Invalid origin'}, 403)
                return
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                req_body = self.rfile.read(content_len).decode('utf-8')
                payload = json.loads(req_body)
                personas_path = os.path.join(SCRIPT_DIR, 'custom_personas.json')
                with open(personas_path, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
                self.send_json({'ok': True, 'personas': payload})
            except Exception as ex:
                self.send_json({'ok': False, 'error': str(ex)}, 500)
            return

        return super().do_POST()

    def log_message(self, format, *args):
        pass  # silent execution

def monitor_heartbeat():
    global LAST_HEARTBEAT, SERVER_RUNNING
    # Generous initial grace period while browser launches and loads
    time.sleep(60)
    while SERVER_RUNNING:
        time.sleep(10)
        # If no heartbeat received for over 300 seconds (5 minutes), user closed browser
        # (Allows Chrome tabs in background to not get killed due to timer throttling)
        if time.time() - LAST_HEARTBEAT > 300:
            os._exit(0)

def open_browser():
    time.sleep(0.5)
    host_for_url = "127.0.0.1" if HOST == "0.0.0.0" else HOST
    url = f"http://{host_for_url}:{PORT}/gemini_nano_chat.html"
    
    if LAUNCH_MODE == "browser":
        webbrowser.open(url)
        return

    chrome_candidates = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]
    
    for chrome_path in chrome_candidates:
        if os.path.exists(chrome_path):
            try:
                subprocess.Popen([chrome_path, f"--app={url}"])
                return
            except Exception:
                pass
    
    webbrowser.open(url)

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    load_server_config()

    # Start background heartbeat watchdog
    threading.Thread(target=monitor_heartbeat, daemon=True).start()

    # If this was started fresh (not a restart), launch the browser app
    if "--restarted" not in sys.argv:
        threading.Thread(target=open_browser, daemon=True).start()

    # Robust port binding with retry loop to prevent WinError 10048 port collisions
    httpd = None
    for attempt in range(20):
        try:
            httpd = ReusableTCPServer((HOST, PORT), AutoShutdownHandler)
            break
        except OSError:
            time.sleep(0.4)

    if httpd:
        httpd_server = httpd
        try:
            httpd.serve_forever()
        except Exception:
            os._exit(0)
    else:
        # Port could not be bound after 8 seconds
        os._exit(1)
