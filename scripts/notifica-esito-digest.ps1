# Notifica l'esito di un run schedulato del digest, chiamato da
# run-digest-scheduled.bat dopo aver controllato %ERRORLEVEL%.
#
# Perche' esiste: fino al 2026-09-16 un digest fallito (0 segnali per
# risposta troncata di Claude) usciva con codice 0 come un successo -
# nessun controllo automatico se ne sarebbe mai accorto, l'unico modo
# per scoprirlo era leggere scheduled-run.log a mano. Corretto anche
# ingestion/run-digest.ts (ora esce con codice 1 in quel caso): questo
# script e' il secondo pezzo, che rende visibile il fallimento senza
# dover controllare nulla attivamente.
#
# Nota tecnica su un tentativo fallito: la prima versione usava l'API
# toast moderna (Windows.UI.Notifications.ToastNotificationManager).
# Verificato dal vivo il 2026-09-16 che NON funziona chiamata da
# powershell.exe nudo: quell'API richiede un'identita' applicativa
# (AUMID) registrata, che uno script semplice non ha - il risultato e'
# un fallimento silenzioso (nessun errore, nessuna eccezione, ma la
# notifica non compare da nessuna parte, nemmeno nell'elenco app di
# Impostazioni > Notifiche). Sostituita con il balloon tip della system
# tray (System.Windows.Forms.NotifyIcon), un'API piu' vecchia che non
# richiede quella registrazione - testata dal vivo con l'utente davanti
# allo schermo, confermata visibile.
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("OK", "FALLITO")]
    [string]$Esito,

    [string]$Dettaglio = ""
)

$statusFile = Join-Path $PSScriptRoot "ultimo-esito.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$riga = "$timestamp - $Esito"
if ($Dettaglio) { $riga += " - $Dettaglio" }

# File di stato sempre aggiornato (anche sui successi): permette di
# controllare "quando ha girato l'ultima volta con successo" con
# un'occhiata, senza dover interpretare scheduled-run.log riga per riga.
$riga | Out-File -FilePath $statusFile -Encoding utf8

if ($Esito -eq "FALLITO") {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing

        $icon = New-Object System.Windows.Forms.NotifyIcon
        $icon.Icon = [System.Drawing.SystemIcons]::Warning
        $icon.Visible = $true
        $icon.BalloonTipTitle = "Market Pulse - digest fallito"
        $icon.BalloonTipText = if ($Dettaglio) { "$timestamp - $Dettaglio" } else { $timestamp }
        $icon.ShowBalloonTip(15000)

        # L'icona deve restare viva perche' il balloon si veda davvero:
        # se lo script termina subito, .NET la distrugge insieme al
        # balloon prima che compaia. 6 secondi bastano a renderlo
        # visibile senza allungare troppo il run schedulato.
        Start-Sleep -Seconds 6
        $icon.Dispose()
    }
    catch {
        # Se il balloon non parte per qualche motivo, il file di stato
        # resta comunque la fonte di verita' - non far fallire lo script
        # batch per questo.
        Write-Output "Notifica non mostrata: $_"
    }
}
