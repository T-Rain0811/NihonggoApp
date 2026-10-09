@echo off
cd /d "%~dp0"
echo Dang khoi chay JLPT N2 Mastery Web...
start "" "http://localhost:8080/index.html"
python -m http.server 8080
