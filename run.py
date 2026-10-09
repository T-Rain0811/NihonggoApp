import webbrowser
import http.server
import socketserver
import os

PORT = 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))

url = f"http://localhost:{PORT}/index.html"
print(f"=== JLPT N2 Mastery Web Server ===")
print(f"Mở ứng dụng tại: {url}")
print("Nhấn Ctrl + C để dừng server.")

webbrowser.open(url)

Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã dừng server thành công.")
