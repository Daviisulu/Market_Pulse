@echo off
rem Wrapper per Windows Task Scheduler: si sposta nella root del
rem progetto (indipendentemente dalla working directory con cui parte
rem lo scheduler) e appende l'output a un log dedicato, cosi' anche un
rem fallimento di avvio (npm/node non trovati, ecc.) resta visibile e
rem non solo gli errori gia' gestiti da ingestion/log.ts.
cd /d "%~dp0.."
echo ---- %date% %time% ---- >> scripts\scheduled-run.log
call npm run digest >> scripts\scheduled-run.log 2>&1
if %ERRORLEVEL% NEQ 0 (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0notifica-esito-digest.ps1" -Esito FALLITO -Dettaglio "vedi scripts\scheduled-run.log"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0notifica-esito-digest.ps1" -Esito OK
)
