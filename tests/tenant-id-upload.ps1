# Run after building the web project, using Windows PowerShell.
$ErrorActionPreference = 'Stop'
$tenantBin = Join-Path $PSScriptRoot '../WebApplication1/bin'
$tenantReferences = @('System.Web', 'System.Drawing', 'System.Core',
    (Join-Path $tenantBin 'System.Web.Mvc.dll'),
    (Join-Path $tenantBin 'WebApplication1.dll'))
# The checked-in MVC dependency may retain Windows' downloaded-file marker.
[void][Reflection.Assembly]::UnsafeLoadFrom((Join-Path $tenantBin 'System.Web.Mvc.dll'))
[void][Reflection.Assembly]::LoadFrom((Join-Path $tenantBin 'WebApplication1.dll'))
Add-Type -Path (Join-Path $PSScriptRoot 'TenantIdUploadChecks.cs') -ReferencedAssemblies $tenantReferences
$tenantTestFolder = Join-Path ([IO.Path]::GetTempPath()) ('tenant-id-check-' + [Guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $tenantTestFolder)
try {
    [TenantIdUploadChecks]::Run($tenantTestFolder)
} finally {
    # Only remove the empty, uniquely created test directory.
    [IO.Directory]::Delete($tenantTestFolder, $false)
}
