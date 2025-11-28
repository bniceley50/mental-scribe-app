# ============================================================
# NETWORK ZOMBIE HUNTER v1.0
# Diagnose and kill residual VPN/adapter interference
# Run: Right-click > "Run with PowerShell" (as Admin)
# ============================================================

$TargetDomain = "bmtzgeffbzmcwmnprxmx.supabase.co"
$Divider = "=" * 60

Write-Host "`n$Divider" -ForegroundColor Cyan
Write-Host "  PHASE 1: HOSTS FILE CHECK" -ForegroundColor Yellow
Write-Host "$Divider" -ForegroundColor Cyan

$HostsPath = "C:\Windows\System32\drivers\etc\hosts"
$HostsContent = Get-Content $HostsPath -ErrorAction SilentlyContinue
$SuspiciousEntries = $HostsContent | Where-Object { 
    $_ -match "supabase" -or $_ -match "bmtzgeffbzmcwmnprxmx" -or $_ -match "nordvpn"
}

if ($SuspiciousEntries) {
    Write-Host "[!] FOUND SUSPICIOUS HOSTS ENTRIES:" -ForegroundColor Red
    $SuspiciousEntries | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
}
else {
    Write-Host "[OK] Hosts file clean" -ForegroundColor Green
}

Write-Host "`n$Divider" -ForegroundColor Cyan
Write-Host "  PHASE 2: ZOMBIE ADAPTER DETECTION" -ForegroundColor Yellow
Write-Host "$Divider" -ForegroundColor Cyan

Get-NetAdapter | Select-Object Name, InterfaceDescription, Status | Format-Table -AutoSize

$ZombiePatterns = @("TAP-", "Nord", "VPN", "Hamachi", "Tunnel")
$ZombieAdapters = Get-NetAdapter | Where-Object {
    foreach ($p in $ZombiePatterns) { if ($_.InterfaceDescription -match $p) { return $true } }
    return $false
}
if ($ZombieAdapters) {
    Write-Host "[!] ZOMBIE ADAPTERS:" -ForegroundColor Red
    $ZombieAdapters | ForEach-Object { Write-Host "    $($_.Name) - $($_.InterfaceDescription)" -ForegroundColor Red }
}

Write-Host "`n$Divider" -ForegroundColor Cyan
Write-Host "  PHASE 3: DNS PER ADAPTER" -ForegroundColor Yellow
Write-Host "$Divider" -ForegroundColor Cyan

Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | ForEach-Object {
    $DNS = Get-DnsClientServerAddress -InterfaceAlias $_.Name -AddressFamily IPv4 -EA SilentlyContinue
    Write-Host "[$($_.Name)] DNS: $($DNS.ServerAddresses -join ', ')"
}

Write-Host "`n$Divider" -ForegroundColor Cyan
Write-Host "  PHASE 4: NORDVPN REMNANTS" -ForegroundColor Yellow
Write-Host "$Divider" -ForegroundColor Cyan

$NordSvc = Get-Service | Where-Object { $_.Name -match "Nord" }
if ($NordSvc) { 
    Write-Host "[!] NORD SERVICES RUNNING:" -ForegroundColor Red
    $NordSvc | ForEach-Object { Write-Host "    $($_.Name): $($_.Status)" }
}
else { Write-Host "[OK] No Nord services" -ForegroundColor Green }

Write-Host "`n$Divider" -ForegroundColor Cyan
Write-Host "  PHASE 5: DNS RESOLUTION TESTS" -ForegroundColor Yellow  
Write-Host "$Divider" -ForegroundColor Cyan

Write-Host "[Test 1] System resolver..." -NoNewline
try {
    $r = Resolve-DnsName $TargetDomain -EA Stop
    Write-Host " OK: $($r.IPAddress)" -ForegroundColor Green
}
catch { Write-Host " FAIL" -ForegroundColor Red }

Write-Host "[Test 2] Google 8.8.8.8..." -NoNewline
try {
    $r = Resolve-DnsName $TargetDomain -Server 8.8.8.8 -EA Stop
    Write-Host " OK: $($r.IPAddress)" -ForegroundColor Green
    $ResolvedIP = $r.IPAddress | Select-Object -First 1
}
catch { Write-Host " FAIL" -ForegroundColor Red }

Write-Host "[Test 3] Cloudflare 1.1.1.1..." -NoNewline
try {
    $r = Resolve-DnsName $TargetDomain -Server 1.1.1.1 -EA Stop
    Write-Host " OK: $($r.IPAddress)" -ForegroundColor Green
}
catch { Write-Host " FAIL" -ForegroundColor Red }

Write-Host "`n$Divider" -ForegroundColor Cyan
Write-Host "  PHASE 6: NRPT CHECK (MOST LIKELY CULPRIT!)" -ForegroundColor Yellow
Write-Host "$Divider" -ForegroundColor Cyan

$NRPT = Get-DnsClientNrptRule -EA SilentlyContinue
if ($NRPT) {
    Write-Host "[!!!] NRPT RULES FOUND - VPN DNS HIJACKING!" -ForegroundColor Red
    $NRPT | Format-Table Name, Namespace, NameServers -AutoSize
    Write-Host "`nFIX: Get-DnsClientNrptRule | Remove-DnsClientNrptRule -Force" -ForegroundColor Yellow
}
else { Write-Host "[OK] No NRPT rules" -ForegroundColor Green }

Write-Host "`n$Divider" -ForegroundColor Cyan
Write-Host "  PHASE 7: FIREWALL CHECK" -ForegroundColor Yellow
Write-Host "$Divider" -ForegroundColor Cyan

$NordFW = Get-NetFirewallRule | Where-Object { $_.DisplayName -match "Nord" }
if ($NordFW) {
    Write-Host "[!] NORD FIREWALL RULES:" -ForegroundColor Red
    $NordFW | Select-Object DisplayName, Enabled, Action | Format-Table
}
else { Write-Host "[OK] No Nord firewall rules" -ForegroundColor Green }

Write-Host "`n$Divider" -ForegroundColor Cyan
Write-Host "  RECOMMENDED FIXES" -ForegroundColor Yellow
Write-Host "$Divider" -ForegroundColor Cyan

Write-Host @"

[1] REMOVE NRPT RULES (if found above):
   Get-DnsClientNrptRule | Remove-DnsClientNrptRule -Force

[2] DISABLE ZOMBIE ADAPTERS:
   Get-NetAdapter | Where-Object {`$_.InterfaceDescription -match 'TAP|VPN'} | Disable-NetAdapter

[3] NUCLEAR DNS RESET:
   ipconfig /release && ipconfig /flushdns && ipconfig /renew
   netsh int ip reset && netsh winsock reset
   (Then REBOOT)

[4] FORCE CLOUDFLARE DNS:
   Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses ("1.1.1.1","8.8.8.8")

[5] MANUAL HOSTS BYPASS (if IP resolved above):
   Add to C:\Windows\System32\drivers\etc\hosts:
"@

if ($ResolvedIP) { Write-Host "   $ResolvedIP  $TargetDomain" -ForegroundColor Green }

Write-Host "`n$Divider"
# Removed ReadKey to allow automated execution
