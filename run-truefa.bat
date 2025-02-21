@echo off
set DOCKER="C:\Program Files\Docker\Docker\resources\bin\docker.exe"
echo Starting TrueFA container...
%DOCKER% compose up -d
echo.
echo Attaching to container...
echo Type 'python -m src.main' to start the application
echo Type 'exit' to leave the container
echo.
%DOCKER% compose exec truefa bash 