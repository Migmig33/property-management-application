$ErrorActionPreference = 'Stop'
Add-Type -Path (Join-Path $PSScriptRoot '../WebApplication1/Helper/UnitAvailabilityHelper.cs')

function Assert-Availability($actual, $expected, $description) {
    if ($actual -ne $expected) { throw "Failed: $description" }
    Write-Output "PASS: $description"
}

Assert-Availability ([WebApplication1.Helper.UnitAvailabilityHelper]::HasOpenBedspace(3, 4, 1)) $true 'bedspace with open slots is bookable'
Assert-Availability ([WebApplication1.Helper.UnitAvailabilityHelper]::HasOpenBedspace(3, 4, 3)) $true 'partly filled bedspace remains bookable'
Assert-Availability ([WebApplication1.Helper.UnitAvailabilityHelper]::HasOpenBedspace(3, 4, 4)) $false 'full bedspace is unavailable'
Assert-Availability ([WebApplication1.Helper.UnitAvailabilityHelper]::HasOpenBedspace(1, 4, 1)) $false 'occupied single unit is unavailable'
Assert-Availability ([WebApplication1.Helper.UnitAvailabilityHelper]::HasOpenBedspace(2, 4, 2)) $false 'occupied household unit is unavailable'
