# Script para publicar Extrator CT-e no GitHub e Vercel
# Execute no PowerShell: .\publicar.ps1

$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { $gh = "gh" }

# PASSO OBRIGATÓRIO: Se ainda não fez login no GitHub, execute antes:
#   & "C:\Program Files\GitHub CLI\gh.exe" auth login -h github.com -p https -w
#   (Abra o link no navegador, digite o código e autorize)

Write-Host "=== Publicando Extrator CT-e ===" -ForegroundColor Cyan

# 1. Verificar autenticacao GitHub
Write-Host "`n1. Verificando GitHub..." -ForegroundColor Yellow
$auth = & $gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Faça login no GitHub primeiro:" -ForegroundColor Red
    Write-Host "   & '$gh' auth login -h github.com -p https -w" -ForegroundColor White
    Write-Host "   (Abra o link no navegador e autorize)" -ForegroundColor Gray
    exit 1
}
Write-Host "   OK - GitHub autenticado" -ForegroundColor Green

# 2. Criar repositorio e enviar
Write-Host "`n2. Criando repositório no GitHub..." -ForegroundColor Yellow
& $gh repo create extrator-cte --public --source=. --remote=origin --push 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Repositório pode já existir. Tentando push..." -ForegroundColor Yellow
    git remote remove origin 2>$null
    $user = (& $gh api user -q .login 2>$null)
    if ($user) {
        git remote add origin "https://github.com/$user/extrator-cte.git"
        git push -u origin main
    }
}
Write-Host "   OK - Código no GitHub" -ForegroundColor Green

# 3. Deploy na Vercel
Write-Host "`n3. Fazendo deploy na Vercel..." -ForegroundColor Yellow
npx vercel --yes 2>&1
$user = (& $gh api user -q .login 2>$null)
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== Concluído! ===" -ForegroundColor Green
    if ($user) { Write-Host "GitHub: https://github.com/$user/extrator-cte" -ForegroundColor Cyan }
    Write-Host "Ou importe em: https://vercel.com/new (selecione extrator-cte)" -ForegroundColor Cyan
} else {
    Write-Host "   Vercel: Importe em https://vercel.com/new" -ForegroundColor Yellow
    Write-Host "   Selecione o repositório extrator-cte" -ForegroundColor Gray
}
