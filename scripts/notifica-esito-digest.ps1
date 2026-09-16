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
# Nessuna dipendenza esterna (niente BurntToast, non installato su
# questo dispositivo): usa l'API toast nativa di Windows 10/11, gia'
# presente su qualunque installazione.
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
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

        $testoDettaglio = if ($Dettaglio) { "$timestamp - $Dettaglio" } else { $timestamp }
        $template = @"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>Market Pulse - digest fallito</text>
      <text>$testoDettaglio</text>
    </binding>
  </visual>
</toast>
"@
        $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
        $xml.LoadXml($template)
        $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Market Pulse").Show($toast)
    }
    catch {
        # Se il toast non parte (raro, ma possibile su alcune
        # configurazioni), il file di stato resta comunque la fonte di
        # verita' - non far fallire lo script batch per questo.
        Write-Output "Toast non mostrato: $_"
    }
}
