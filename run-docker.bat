@echo off
"C:\Program Files\Docker\Docker\resources\bin\docker.exe" run -it --rm ^
  --name truefa ^
  -v "%CD%\images:/home/truefa/app/images" ^
  -v "%CD%\.truefa:/home/truefa/.truefa" ^
  -v "%USERPROFILE%\Downloads:/home/truefa/Downloads" ^
  otp1-truefa 