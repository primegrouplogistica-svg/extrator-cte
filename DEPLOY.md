# Publicar Extrator CT-e no GitHub e Vercel

## Passo 1: Criar repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. **Repository name:** `extrator-cte` (ou outro nome de sua preferência)
3. **Description:** Extrator de dados CT-e (PDF/XML) para planilha
4. Deixe **público** e **não** marque "Add a README" (o projeto já tem)
5. Clique em **Create repository**

---

## Passo 2: Conectar e enviar o código

No terminal, na pasta do projeto:

```bash
cd c:\Users\USER\Desktop\teste\extrator-cte

git branch -M main
git remote add origin https://github.com/SEU-USUARIO/extrator-cte.git
git push -u origin main
```

**Substitua `SEU-USUARIO`** pelo seu nome de usuário do GitHub.

---

## Passo 3: Publicar na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Clique em **Import Git Repository**
3. Selecione o repositório **extrator-cte**
4. Clique em **Import** (a Vercel detecta Vite automaticamente)
5. Aguarde o deploy — você receberá um link como `https://extrator-cte.vercel.app`

Pronto! O app estará no ar.
