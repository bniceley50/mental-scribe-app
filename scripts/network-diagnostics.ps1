# Network Diagnostic Script for Supabase Connection
# This script diagnoses DNS and network connectivity issues

$supabaseUrl = "bmtzgeffbzmcwmnprxmx.supabase.co"

Write-Host "=== Network Diagnostic Script ===" -ForegroundColor Cyan
Write-Host "Target: $supabaseUrl" -ForegroundColor Cyan
Write-Host ""

# Test 1: DNS Resolution
Write-Host "[1] Testing DNS Resolution..." -ForegroundColor Yellow
try {
    $dnsResult = Resolve-DnsName -Name $supabaseUrl -ErrorAction Stop
    Write-Host "SUCCESS: DNS Resolution working" -ForegroundColor Green
    Write-Host "  IP Addresses:" -ForegroundColor Gray
    $dnsResult | Where-Object { $_.Type -eq 'A' } | ForEach-Object {
        Write-Host "    - $($_.IPAddress)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "FAILED: DNS Resolution not working" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  This is the root cause of your login issue!" -ForegroundColor Yellow
}

Write-Host ""

# Test 2: Alternative DNS Servers
Write-Host "[2] Testing with Alternative DNS Servers..." -ForegroundColor Yellow

# Google DNS
Write-Host "  Testing Google DNS (8.8.8.8)..." -ForegroundColor Gray
try {
    $googleDns = Resolve-DnsName -Name $supabaseUrl -Server 8.8.8.8 -ErrorAction Stop
    Write-Host "  SUCCESS: Google DNS working" -ForegroundColor Green
}
catch {
    Write-Host "  FAILED: Google DNS not working" -ForegroundColor Red
}

# Cloudflare DNS
Write-Host "  Testing Cloudflare DNS (1.1.1.1)..." -ForegroundColor Gray
try {
    $cloudflareDns = Resolve-DnsName -Name $supabaseUrl -Server 1.1.1.1 -ErrorAction Stop
    Write-Host "  SUCCESS: Cloudflare DNS working" -ForegroundColor Green
}
catch {
    Write-Host "  FAILED: Cloudflare DNS not working" -ForegroundColor Red
}

Write-Host ""

# Test 3: Ping Test
Write-Host "[3] Testing Connectivity (Ping)..." -ForegroundColor Yellow
try {
    $pingResult = Test-Connection -ComputerName $supabaseUrl -Count 2 -ErrorAction Stop
    Write-Host "SUCCESS: Ping working" -ForegroundColor Green
    $avgTime = [math]::Round(($pingResult | Measure-Object -Property ResponseTime -Average).Average, 2)
    Write-Host "  Average Response Time: ${avgTime}ms" -ForegroundColor Gray
}
catch {
    Write-Host "FAILED: Ping not working" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: DNS Cache
Write-Host "[4] Checking DNS Cache..." -ForegroundColor Yellow
$cacheEntry = Get-DnsClientCache | Where-Object { $_.Name -like "*$supabaseUrl*" }
if ($cacheEntry) {
    Write-Host "  Found cached entries for $supabaseUrl" -ForegroundColor Gray
    $cacheEntry | ForEach-Object {
        Write-Host "    - $($_.Data) (TTL: $($_.TimeToLive)s)" -ForegroundColor Gray
    }
}
else {
    Write-Host "  No cached entries found" -ForegroundColor Gray
}

Write-Host ""

# Test 5: Current DNS Servers
Write-Host "[5] Current DNS Configuration..." -ForegroundColor Yellow
$dnsServers = Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object { $_.ServerAddresses.Count -gt 0 }
foreach ($adapter in $dnsServers) {
    Write-Host "  Interface: $($adapter.InterfaceAlias)" -ForegroundColor Gray
    foreach ($server in $adapter.ServerAddresses) {
        Write-Host "    - DNS Server: $server" -ForegroundColor Gray
    }
}

Write-Host ""

# Recommendations
Write-Host "=== RECOMMENDATIONS ===" -ForegroundColor Cyan
Write-Host ""

if ($dnsResult) {
    Write-Host "SUCCESS: Your DNS is working correctly." -ForegroundColor Green
    Write-Host "  The issue may be browser-specific or related to firewall/antivirus." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Try these steps:" -ForegroundColor Yellow
    Write-Host "  1. Clear browser cache and cookies" -ForegroundColor White
    Write-Host "  2. Disable browser extensions temporarily" -ForegroundColor White
    Write-Host "  3. Check if antivirus is blocking the connection" -ForegroundColor White
    Write-Host "  4. Try a different browser" -ForegroundColor White
}
else {
    Write-Host "FAILED: DNS Resolution is failing." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Try these fixes in order:" -ForegroundColor Yellow
    Write-Host "  1. Flush DNS Cache:" -ForegroundColor White
    Write-Host "     ipconfig /flushdns" -ForegroundColor Cyan
    Write-Host "  2. Reset Winsock:" -ForegroundColor White
    Write-Host "     netsh winsock reset" -ForegroundColor Cyan
    Write-Host "  3. Change DNS to Google DNS (8.8.8.8, 8.8.4.4)" -ForegroundColor White
    Write-Host "  4. Disable VPN/Proxy temporarily" -ForegroundColor White
    Write-Host "  5. Check Windows Firewall settings" -ForegroundColor White
    Write-Host "  6. Restart your computer" -ForegroundColor White
}

Write-Host ""
Write-Host "=== END OF DIAGNOSTICS ===" -ForegroundColor Cyan
