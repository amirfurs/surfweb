#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8081
os.chdir('/app')

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("Serving at port", PORT)
    httpd.serve_forever()