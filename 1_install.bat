@echo off

where npm >nul 2>nul
if %errorlevel% equ 0 (
  if not exist logs mkdir logs
  echo Instalujem balik pm2...
  call npm i -g pm2
  echo.
  echo Instalujem baliky aplikacie...
  call npm install
  echo.
  echo Instalacia je ukoncena
  echo.
) else (
  echo Platforma NodeJS nie je nainstalovana
  echo Stiahnut ju mozete zo stranky https://nodejs.org
)
pause