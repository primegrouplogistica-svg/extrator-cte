# Publique o Extrator CT-e em 2 passos

## Passo 1: Login no GitHub (só precisa fazer uma vez)

Abra o **PowerShell** ou **Prompt de Comando** e execute:

```
"C:\Program Files\GitHub CLI\gh.exe" auth login -h github.com -p https -w
```

- Copie o **código** que aparecer (ex: 2302-9310)
- Abra o **link** que aparecer no navegador
- Cole o código e clique em **Autorizar**
- Volte ao terminal e pressione **Enter**

---

## Passo 2: Publicar

No **PowerShell**, na pasta do projeto:

```powershell
cd c:\Users\USER\Desktop\teste\extrator-cte
.\publicar.ps1
```

O script vai:
1. Criar o repositório **extrator-cte** no seu GitHub
2. Enviar o código
3. Tentar o deploy na Vercel

Se o Vercel pedir login, acesse [vercel.com/new](https://vercel.com/new), importe o repositório **extrator-cte** e clique em Deploy.

**Pronto!** Seu app estará online.
