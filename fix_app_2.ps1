$path = "c:\Users\MS\Desktop\candy-club-system\app.js"
$appendPath = "c:\Users\MS\Desktop\candy-club-system\append.txt"

$content = Get-Content -Path $path -Encoding UTF8 -Raw
$marker = "function renderExpiryDashboard() {"
$index = $content.IndexOf($marker)

if ($index -ge 0) {
    $before = $content.Substring(0, $index)
    $appendContent = Get-Content -Path $appendPath -Encoding UTF8 -Raw
    
    $finalContent = $before + "`r`n" + $appendContent
    Set-Content -Path $path -Value $finalContent -Encoding UTF8
    Write-Host "Success"
} else {
    Write-Host "Marker not found"
}
