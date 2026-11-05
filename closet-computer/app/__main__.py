import argparse
import socket
import threading
import webbrowser

import uvicorn


def main():
    ap = argparse.ArgumentParser(description="Closet Computer")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--lan", action="store_true", help="also allow phones on your Wi-Fi to connect")
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args()
    host = "0.0.0.0" if a.lan else "127.0.0.1"
    url = f"http://127.0.0.1:{a.port}"
    print(f"\n  Closet Computer is running at {url}")
    if a.lan:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            print(f"  On your phone (same Wi-Fi): http://{s.getsockname()[0]}:{a.port}")
        except OSError:
            pass
    print("  Press Ctrl+C to stop.\n")
    if not a.no_browser:
        threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    uvicorn.run("app.main:app", host=host, port=a.port, log_level="warning")


if __name__ == "__main__":
    main()
