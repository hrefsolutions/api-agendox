<#
.SYNOPSIS
  Cambia la base de datos que usan las herramientas locales (drizzle-kit, seeds,
  `pnpm dev`) entre el Postgres de docker-compose y la base de Railway.

.DESCRIPTION
  Escribe DATABASE_URL / DATABASE_SSL en el entorno de ESTA sesión de PowerShell.
  Tanto drizzle-kit (`process.loadEnvFile`) como @nestjs/config respetan lo que ya
  está en el entorno y NO lo pisan con `.env`, así que la variable del shell gana.

  El valor de producción sale de DATABASE_URL_PROD en `.env` (git-ignored), que
  debe ser la DATABASE_PUBLIC_URL del servicio Postgres de Railway — la privada
  (`*.railway.internal`) no resuelve fuera de Railway.

  El cambio vive sólo en esta terminal: al cerrarla vuelve todo a `.env`.

.EXAMPLE
  .\scripts\use-db.ps1 prod      # apunta a Railway
  pnpm db:migrate
  pnpm db:constraints
  .\scripts\use-db.ps1 local     # vuelve a docker

.EXAMPLE
  .\scripts\use-db.ps1 status    # muestra a dónde apunta la sesión
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory, Position = 0)]
  [ValidateSet('local', 'prod', 'status')]
  [string]$Target
)

$ErrorActionPreference = 'Stop'

$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) '.env'

# Oculta la password para poder mostrar la URL sin filtrarla en pantalla.
function Format-Url([string]$url) {
  if (-not $url) { return '(sin definir)' }
  return [regex]::Replace($url, '://([^:/@]+):[^@]*@', '://$1:****@')
}

function Get-EnvValue([string]$key) {
  if (-not (Test-Path $envFile)) {
    throw "No encuentro $envFile. Copiá .env.example a .env primero."
  }
  foreach ($line in Get-Content $envFile) {
    $trimmed = $line.Trim()
    if ($trimmed -eq '' -or $trimmed.StartsWith('#')) { continue }
    $split = $trimmed.IndexOf('=')
    if ($split -lt 1) { continue }
    if ($trimmed.Substring(0, $split).Trim() -ne $key) { continue }
    return $trimmed.Substring($split + 1).Trim().Trim('"', "'")
  }
  return $null
}

function Show-Status {
  if ($env:DATABASE_URL) {
    Write-Host "TARGET : prod (override de sesión)" -ForegroundColor Yellow
    Write-Host "URL    : $(Format-Url $env:DATABASE_URL)"
    Write-Host "SSL    : $($env:DATABASE_SSL)"
  }
  else {
    Write-Host "TARGET : local (sin override — manda .env)" -ForegroundColor Green
    Write-Host "URL    : $(Format-Url (Get-EnvValue 'DATABASE_URL'))"
  }
}

switch ($Target) {
  'prod' {
    $url = Get-EnvValue 'DATABASE_URL_PROD'
    if (-not $url -or $url -match '^<') {
      throw "Falta DATABASE_URL_PROD en $envFile. Pegá ahí la DATABASE_PUBLIC_URL de Railway."
    }
    $env:DATABASE_URL = $url
    $env:DATABASE_SSL = 'true'
    Write-Host "→ Apuntando a PRODUCCIÓN (Railway)." -ForegroundColor Yellow
    Write-Host "  $(Format-Url $url)"
    Write-Host "  Cuidado: db:migrate, db:constraints y db:seed impactan la base real." -ForegroundColor Yellow
  }
  'local' {
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:DATABASE_SSL -ErrorAction SilentlyContinue
    Write-Host "→ Apuntando a LOCAL (docker-compose, vía .env)." -ForegroundColor Green
  }
  'status' { Show-Status }
}
